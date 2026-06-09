import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { requireAuth } from '@/lib/auth-guards'
import { usersTable, payrollTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PayrollForm } from '@/components/payroll/forms/payroll-form'
import { SetBreadcrumbLabel } from '@/components/set-breadcrumb-label'

interface EditPayrollPageProps {
  params: Promise<{ id: string }>
}

function normalizeDateInput(value: string) {
  return value.split('T')[0]
}

export default async function EditPayrollPage({ params }: EditPayrollPageProps) {
  const { id } = await params
  await requireAuth()

  try {
    const payrollItem = await db.query.payrollTable.findFirst({
      where: eq(payrollTable.id, id),
      with: {
        employee: true,
      },
    })

    if (!payrollItem) {
      notFound()
    }

    const users = await db.query.usersTable.findMany({
      orderBy: (users, { asc }) => [asc(users.fullName)],
      limit: 100,
    })

    // Prepare employees list before passing to client component
    const employeeOptions = users.map((u) => ({
      value: String(u.id),
      label: u.fullName,
    }))

    const employeeName = payrollItem.employee?.fullName || 'Payroll'

    return (
      <>
        <SetBreadcrumbLabel label={`${employeeName} - ${payrollItem.month}/${payrollItem.year}`} />
        <PayrollForm
          mode="edit"
          initialData={payrollItem}
          formAction={handleUpdate.bind(null, id)}
          employees={employeeOptions}
        />
      </>
    )
  } catch (e) {
    notFound()
  }
}

async function handleUpdate(payrollId: string, formData: FormData) {
  'use server'

  await requireAuth()

  const employeeId = String(formData.get('employee') || '')
  const month = String(formData.get('month') || '')
  const year = Number(formData.get('year') || 0)
  const paymentType = String(formData.get('paymentType') || 'bankTransfer')
  const bonusAmount = Number(formData.get('bonusAmount') || 0)
  const deductionAmount = Number(formData.get('deductionAmount') || 0)
  const adjustmentNote = String(formData.get('adjustmentNote') || '')
  const status = String(formData.get('status') || 'generated')
  const paymentDate = String(formData.get('paymentDate') || '')
  const paymentReference = String(formData.get('paymentReference') || '')
  const paymentNotes = String(formData.get('paymentNotes') || '')

  // Fetch the current payroll item to get existing payroll items
  const currentPayroll = await db.query.payrollTable.findFirst({
    where: eq(payrollTable.id, payrollId),
  })

  if (!currentPayroll) {
    throw new Error('Payroll not found')
  }

  // Parse existing payroll items
  const existingItems = currentPayroll.payrollItems || []

  // Update payment type in all items
  const updatedItems = existingItems.map((item: any) => ({
    ...item,
    paymentType: paymentType as 'bankTransfer' | 'cash',
  }))

  // Calculate total amount
  const itemsTotal = updatedItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
  const totalAmount = itemsTotal + bonusAmount - deductionAmount

  await db
    .update(payrollTable)
    .set({
      employeeId,
      month: month as
        | '01'
        | '02'
        | '03'
        | '04'
        | '05'
        | '06'
        | '07'
        | '08'
        | '09'
        | '10'
        | '11'
        | '12',
      year: year,
      payrollItems: updatedItems,
      bonusAmount: String(bonusAmount),
      deductionAmount: String(deductionAmount),
      adjustmentNote: adjustmentNote || null,
      totalAmount: String(totalAmount),
      paymentDate: paymentDate ? normalizeDateInput(paymentDate) : null,
      paymentReference: paymentReference || null,
      paymentNotes: paymentNotes || null,
      status: (status === 'rejected' ? 'cancelled' : status) as
        | 'generated'
        | 'approved'
        | 'paid'
        | 'cancelled',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(payrollTable.id, payrollId))

  redirect('/payroll')
}
