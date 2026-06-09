import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { payrollTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guards'
import { ExpensesList } from '@/components/expenses/expenses-list'

export const metadata: Metadata = {
  title: 'Expenses',
  description: 'Track one-time and recurring company expenses',
}

export default async function ExpensesPage() {
  await requireAuth()

  const [expenses, payroll] = await Promise.all([
    db.query.expensesTable.findMany({
      orderBy: (expenses, { desc }) => [desc(expenses.updatedAt)],
    }),
    db.query.payrollTable.findMany({
      where: eq(payrollTable.status, 'paid'),
      orderBy: (payroll, { desc }) => [desc(payroll.updatedAt)],
      with: {
        employee: true,
      },
    }),
  ])

  return (
    <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
      <div className="space-y-4 p-4 lg:p-6">
        <ExpensesList expenses={expenses as any} payroll={payroll as any} />
      </div>
    </div>
  )
}
