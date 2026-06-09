import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { additionalPaymentsTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guards'
import { AdditionalPaymentForm } from '@/components/payroll/forms/additional-payment-form'
import { SetBreadcrumbLabel } from '@/components/set-breadcrumb-label'

interface EditAdditionalPaymentPageProps {
  params: Promise<{ id: string }>
}

function normalizeDateInput(value: string) {
  return value.split('T')[0]
}

export default async function EditAdditionalPaymentPage({
  params,
}: EditAdditionalPaymentPageProps) {
  const { id } = await params
  await requireAuth()

  const payment = await db.query.additionalPaymentsTable.findFirst({
    where: eq(additionalPaymentsTable.id, id),
    with: {
      employee: true,
    },
  })

  if (!payment) {
    notFound()
  }

  const users = await db.query.usersTable.findMany({
    orderBy: (users, { asc }) => [asc(users.fullName)],
    limit: 100,
  })

  const handleUpdate = async (formData: FormData) => {
    'use server'

    await requireAuth()

    const employeeId = String(formData.get('employee') || '')
    const category = String(formData.get('category') || 'bonus')
    const description = String(formData.get('description') || '')
    const amount = Number(formData.get('amount') || 0)
    const paymentType = String(formData.get('paymentType') || 'bankTransfer')
    const month = String(formData.get('month') || '').padStart(2, '0')
    const year = Number(formData.get('year') || 0)
    const status = String(formData.get('status') || 'generated')
    const notes = String(formData.get('notes') || '')
    const paymentDate = String(formData.get('paymentDate') || '')

    await db
      .update(additionalPaymentsTable)
      .set({
        employeeId,
        category: category as
          | 'bonus'
          | 'deduction'
          | 'advance'
          | 'commission'
          | 'allowance'
          | 'other',
        description,
        amount: String(amount),
        paymentType: paymentType as 'bankTransfer' | 'cash' | 'cheque',
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
        year,
        status: status as 'generated' | 'approved' | 'paid' | 'cancelled',
        notes: notes || null,
        paymentDate: paymentDate ? normalizeDateInput(paymentDate) : null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(additionalPaymentsTable.id, id))

    redirect('/payroll')
  }

  return (
    <>
      <SetBreadcrumbLabel label={payment.description} />
      <AdditionalPaymentForm
        isEdit
        formAction={handleUpdate}
        employees={users.map((user) => ({ value: user.id, label: user.fullName }))}
        defaultValues={{
          employee: payment.employeeId,
          category: payment.category,
          description: payment.description,
          amount: Number(payment.amount),
          paymentType: payment.paymentType,
          month: payment.month as any,
          year: payment.year,
          status: payment.status,
          notes: payment.notes || '',
          paymentDate: payment.paymentDate || '',
        }}
      />
    </>
  )
}
