import { describe, expect, it } from 'vitest'
import {
  calculateExpenseMonth,
  getCompletedMonthKeys,
  getExportMonthKeys,
  type ExpenseRecord,
  type PayrollExpenseRecord,
} from '@/lib/expenses'

const baseExpense = {
  vendor: null,
  paymentMethod: 'bankTransfer',
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} satisfies Partial<ExpenseRecord>

describe('expense calculations', () => {
  it('counts one-time expenses only in their payment month', () => {
    const expenses: ExpenseRecord[] = [
      {
        ...baseExpense,
        id: 'one-time-1',
        type: 'oneTime',
        name: 'Laptop',
        amount: '1000',
        category: 'laptop',
        paymentDate: '2026-06-15',
        isActive: true,
      },
    ]

    expect(calculateExpenseMonth('2026-06', expenses, []).totals.oneTime).toBe(1000)
    expect(calculateExpenseMonth('2026-07', expenses, []).totals.oneTime).toBe(0)
  })

  it('counts monthly recurring expenses in eligible active months', () => {
    const expenses: ExpenseRecord[] = [
      {
        ...baseExpense,
        id: 'recurring-1',
        type: 'recurring',
        name: 'Software',
        amount: '75',
        category: 'software',
        billingCycle: 'monthly',
        recurringDay: 5,
        startDate: '2026-05-01',
        endDate: null,
        isActive: true,
      },
    ]

    expect(calculateExpenseMonth('2026-06', expenses, []).totals.recurring).toBe(75)
    expect(calculateExpenseMonth('2026-04', expenses, []).totals.recurring).toBe(0)
  })

  it('counts yearly recurring expenses only in their recurring month', () => {
    const expenses: ExpenseRecord[] = [
      {
        ...baseExpense,
        id: 'yearly-1',
        type: 'recurring',
        name: 'Annual License',
        amount: '1200',
        category: 'software',
        billingCycle: 'yearly',
        recurringDay: 10,
        recurringMonth: 6,
        startDate: '2026-01-01',
        endDate: null,
        isActive: true,
      },
    ]

    expect(calculateExpenseMonth('2026-06', expenses, []).totals.recurring).toBe(1200)
    expect(calculateExpenseMonth('2026-07', expenses, []).totals.recurring).toBe(0)
  })

  it('excludes inactive, ended, and impossible recurring dates', () => {
    const expenses: ExpenseRecord[] = [
      {
        ...baseExpense,
        id: 'inactive',
        type: 'recurring',
        name: 'Inactive',
        amount: '50',
        category: 'software',
        billingCycle: 'monthly',
        recurringDay: 1,
        startDate: '2026-01-01',
        isActive: false,
      },
      {
        ...baseExpense,
        id: 'ended',
        type: 'recurring',
        name: 'Ended',
        amount: '50',
        category: 'software',
        billingCycle: 'monthly',
        recurringDay: 1,
        startDate: '2026-01-01',
        endDate: '2026-05-31',
        isActive: true,
      },
      {
        ...baseExpense,
        id: 'impossible',
        type: 'recurring',
        name: '31st',
        amount: '50',
        category: 'software',
        billingCycle: 'monthly',
        recurringDay: 31,
        startDate: '2026-01-01',
        isActive: true,
      },
    ]

    expect(calculateExpenseMonth('2026-06', expenses, []).totals.recurring).toBe(0)
    expect(calculateExpenseMonth('2026-02', [expenses[2]], []).totals.recurring).toBe(0)
  })

  it('counts paid payroll by payroll period and excludes unpaid statuses', () => {
    const payroll: PayrollExpenseRecord[] = [
      {
        id: 'payroll-1',
        month: '06',
        year: 2026,
        totalAmount: '5000',
        status: 'paid',
        paymentDate: '2026-07-05',
      } as PayrollExpenseRecord,
      {
        id: 'payroll-2',
        month: '06',
        year: 2026,
        totalAmount: '3000',
        status: 'approved',
      },
    ]

    const june = calculateExpenseMonth('2026-06', [], payroll)
    const july = calculateExpenseMonth('2026-07', [], payroll)

    expect(june.totals.payroll).toBe(5000)
    expect(july.totals.payroll).toBe(0)
  })

  it('uses completed months for export presets and dashboard series', () => {
    const now = new Date('2026-06-09T12:00:00.000Z')

    expect(getExportMonthKeys('lastMonth', undefined, undefined, now)).toEqual(['2026-05'])
    expect(getExportMonthKeys('lastThreeMonths', undefined, undefined, now)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
    ])
    expect(getCompletedMonthKeys(3, now)).toEqual(['2026-03', '2026-04', '2026-05'])
  })
})
