'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { expensesTable, payrollTable, usersTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guards'
import { calculateExpenseMonth, getCompletedMonthKeys } from '@/lib/expenses'

type ExpenseType = 'oneTime' | 'recurring'
type BillingCycle = 'monthly' | 'yearly'
type PaymentMethod = 'bankTransfer' | 'cash' | 'cheque' | 'creditCard' | 'other'

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim()
}

function normalizeDate(value: string) {
  return value ? value.split('T')[0] : null
}

function normalizeInteger(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function getExpenseValues(formData: FormData) {
  const type = clean(formData.get('type')) as ExpenseType
  const billingCycle = clean(formData.get('billingCycle')) as BillingCycle
  const amount = Number(clean(formData.get('amount')) || 0)

  return {
    type,
    name: clean(formData.get('name')),
    amount: String(amount),
    category: clean(formData.get('category')) || 'other',
    vendor: clean(formData.get('vendor')) || null,
    paymentMethod: (clean(formData.get('paymentMethod')) || 'bankTransfer') as PaymentMethod,
    notes: clean(formData.get('notes')) || null,
    paymentDate: type === 'oneTime' ? normalizeDate(clean(formData.get('paymentDate'))) : null,
    billingCycle: type === 'recurring' ? billingCycle || 'monthly' : null,
    recurringDay:
      type === 'recurring' ? normalizeInteger(clean(formData.get('recurringDay'))) : null,
    recurringMonth:
      type === 'recurring' && billingCycle === 'yearly'
        ? normalizeInteger(clean(formData.get('recurringMonth')))
        : null,
    startDate: type === 'recurring' ? normalizeDate(clean(formData.get('startDate'))) : null,
    endDate: type === 'recurring' ? normalizeDate(clean(formData.get('endDate'))) : null,
    isActive: formData.get('isActive') === 'on' || formData.get('isActive') === 'true',
  }
}

export async function createExpenseAction(formData: FormData) {
  await requireAuth()

  await db.insert(expensesTable).values(getExpenseValues(formData))

  revalidatePath('/expenses')
  revalidatePath('/')
}

export async function updateExpenseAction(formData: FormData) {
  await requireAuth()

  const id = clean(formData.get('id'))
  if (!id) throw new Error('Expense ID is required')

  await db
    .update(expensesTable)
    .set({
      ...getExpenseValues(formData),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(expensesTable.id, id))

  revalidatePath('/expenses')
  revalidatePath('/')
}

export async function deleteExpenseAction(formData: FormData) {
  await requireAuth()

  const id = clean(formData.get('id'))
  if (!id) throw new Error('Expense ID is required')

  await db.delete(expensesTable).where(eq(expensesTable.id, id))

  revalidatePath('/expenses')
  revalidatePath('/')
}

export async function getExpenseDashboardSeries() {
  await requireAuth()

  const [expenses, payroll, users] = await Promise.all([
    db.query.expensesTable.findMany(),
    db.query.payrollTable.findMany({
      where: eq(payrollTable.status, 'paid'),
      with: {
        employee: true,
      },
    }),
    db.select().from(usersTable),
  ])

  return getCompletedMonthKeys(6).map((key) => {
    const view = calculateExpenseMonth(key, expenses, payroll)
    const activeEmployees = users.filter((user) => {
      const joinedAt = user.joinedAt || user.createdAt
      return user.isActive && (!joinedAt || joinedAt.slice(0, 7) <= key)
    }).length

    return {
      month: view.month.shortLabel,
      totalExpenses: view.totals.total,
      payrollExpenses: view.totals.payroll,
      nonPayrollExpenses: view.totals.oneTime + view.totals.recurring,
      activeEmployees,
      expensePerEmployee: activeEmployees > 0 ? Math.round(view.totals.total / activeEmployees) : 0,
    }
  })
}
