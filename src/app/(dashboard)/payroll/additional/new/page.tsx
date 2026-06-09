import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { additionalPaymentsTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guards'
import { AdditionalPaymentForm } from '@/components/payroll/forms/additional-payment-form'

export const metadata: Metadata = {
  title: 'New Additional Payment',
  description: 'Create a one-off payroll payment',
}

function normalizeDateInput(value: string) {
  return value.split('T')[0]
}

export default async function NewAdditionalPaymentPage() {
  await requireAuth()

  const users = await db.query.usersTable.findMany({
    orderBy: (users, { asc }) => [asc(users.fullName)],
    limit: 100,
  })

  const handleCreate = async (formData: FormData) => {
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

    await db.insert(additionalPaymentsTable).values({
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
    })

    redirect('/payroll')
  }

  return (
    <AdditionalPaymentForm
      formAction={handleCreate}
      employees={users.map((user) => ({ value: user.id, label: user.fullName }))}
    />
  )
}
