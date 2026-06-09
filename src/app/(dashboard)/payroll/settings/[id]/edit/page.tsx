import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { requireAuth } from '@/lib/auth-guards'
import { payrollSettingsTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { SettingsForm } from '@/components/payroll/forms/settings-form'
import { SetBreadcrumbLabel } from '@/components/set-breadcrumb-label'

interface EditPayrollSettingPageProps {
  params: Promise<{ id: string }>
}

function normalizeDateInput(value: string) {
  return value.split('T')[0]
}

export default async function EditPayrollSettingPage({ params }: EditPayrollSettingPageProps) {
  const { id } = await params
  await requireAuth()

  try {
    const settingItem = await db.query.payrollSettingsTable.findFirst({
      where: eq(payrollSettingsTable.id, id),
      with: {
        employee: true,
      },
    })

    if (!settingItem) {
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
      const payrollType = String(formData.get('payrollType') || 'primary')
      const description = String(formData.get('description') || '')
      const amount = Number(formData.get('amount') || 0)
      const paymentType = String(formData.get('paymentType') || 'bankTransfer')
      const paymentFrequency = String(formData.get('paymentFrequency') || 'monthly')
      const accountNumber = String(formData.get('accountNumber') || '')
      const bankName = String(formData.get('bankName') || '')
      const accountHolderName = String(formData.get('accountHolderName') || '')
      const swiftCode = String(formData.get('swiftCode') || '')
      const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true'
      const startDate = String(formData.get('startDate') || '')
      const endDate = String(formData.get('endDate') || '')
      const notes = String(formData.get('notes') || '')

      await db
        .update(payrollSettingsTable)
        .set({
          employeeId,
          payrollType: payrollType as
            | 'primary'
            | 'bonus'
            | 'overtime'
            | 'commission'
            | 'allowance'
            | 'other',
          description: description || null,
          amount: String(amount),
          paymentType: paymentType as 'bankTransfer' | 'cash' | 'cheque',
          paymentFrequency: paymentFrequency as 'monthly' | 'quarterly' | 'annual' | 'oneTime',
          bankAccount: {
            accountNumber: accountNumber || undefined,
            bankName: bankName || undefined,
            accountHolderName: accountHolderName || undefined,
            swiftCode: swiftCode || undefined,
          },
          isActive,
          startDate: normalizeDateInput(startDate),
          endDate: endDate ? normalizeDateInput(endDate) : null,
          notes: notes || null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(payrollSettingsTable.id, id))

      redirect('/payroll/settings')
    }

    const employeeName = settingItem.employee?.fullName || 'Setting'

    const label = settingItem.description || `${employeeName} - ${settingItem.payrollType}`

    return (
      <>
        <SetBreadcrumbLabel label={label} />
        <SettingsForm
          mode="edit"
          initialData={settingItem}
          formAction={handleUpdate}
          employees={users.map((u) => ({ value: String(u.id), label: u.fullName }))}
        />
      </>
    )
  } catch (e) {
    notFound()
  }
}
