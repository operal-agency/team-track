import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { requireAuth } from '@/lib/auth-guards'
import { payrollSettingsTable } from '@/db/schema'
import { SettingsForm } from '@/components/payroll/forms/settings-form'

export const metadata: Metadata = {
  title: 'New Payroll Setting',
  description: 'Create a new payroll setting',
}

function normalizeDateInput(value: string) {
  return value.split('T')[0]
}

export default async function NewPayrollSettingPage() {
  await requireAuth()

  // Fetch user options for employee select
  const users = await db.query.usersTable.findMany({
    orderBy: (users, { asc }) => [asc(users.fullName)],
    limit: 100,
  })

  const handleCreateSetting = async (formData: FormData) => {
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

    await db.insert(payrollSettingsTable).values({
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
    })

    redirect('/payroll/settings')
  }

  return (
    <>
      <SettingsForm
        mode="create"
        formAction={handleCreateSetting}
        employees={users.map((u) => ({ value: String(u.id), label: u.fullName }))}
      />
    </>
  )
}
