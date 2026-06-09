export type ExpenseRecord = {
  id: string
  type: 'oneTime' | 'recurring'
  name: string
  amount: string | number
  category: string
  vendor?: string | null
  paymentMethod: string
  notes?: string | null
  paymentDate?: string | null
  billingCycle?: 'monthly' | 'yearly' | null
  recurringDay?: number | null
  recurringMonth?: number | null
  startDate?: string | null
  endDate?: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export type PayrollExpenseRecord = {
  id: string
  month: string
  year: number
  totalAmount: string | number
  status: string
  employee?: { fullName?: string | null } | null
}

export type ExpenseMonth = {
  key: string
  year: number
  month: number
  label: string
  shortLabel: string
}

export type ExpenseView = {
  month: ExpenseMonth
  oneTimeExpenses: ExpenseRecord[]
  recurringExpenses: ExpenseRecord[]
  payrollExpenses: PayrollExpenseRecord[]
  totals: {
    oneTime: number
    recurring: number
    payroll: number
    total: number
  }
  oneTimeByCategory: Array<{ category: string; total: number }>
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const SHORT_MONTH_NAMES = MONTH_NAMES.map((month) => month.slice(0, 3))

export function toAmount(value: string | number | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

export function formatMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function parseMonthKey(key: string): ExpenseMonth {
  const [yearValue, monthValue] = key.split('-')
  const year = Number(yearValue)
  const month = Number(monthValue)

  return {
    key,
    year,
    month,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    shortLabel: `${SHORT_MONTH_NAMES[month - 1]} ${year}`,
  }
}

export function getCurrentMonthKey(now = new Date()) {
  return formatMonthKey(now.getFullYear(), now.getMonth() + 1)
}

export function getLastMonthKey(now = new Date()) {
  return shiftMonthKey(getCurrentMonthKey(now), -1)
}

export function shiftMonthKey(key: string, offset: number) {
  const month = parseMonthKey(key)
  const date = new Date(month.year, month.month - 1 + offset, 1)
  return formatMonthKey(date.getFullYear(), date.getMonth() + 1)
}

export function getMonthBounds(key: string) {
  const month = parseMonthKey(key)
  const start = `${month.key}-01`
  const endDate = new Date(month.year, month.month, 0)
  const end = `${month.key}-${String(endDate.getDate()).padStart(2, '0')}`

  return { start, end, lastDay: endDate.getDate() }
}

export function dateToMonthKey(value?: string | null) {
  if (!value) return null
  return value.slice(0, 7)
}

export function isRecurringExpenseDue(expense: ExpenseRecord, key: string) {
  if (expense.type !== 'recurring' || !expense.isActive) return false
  if (!expense.billingCycle || !expense.recurringDay || !expense.startDate) return false

  const month = parseMonthKey(key)
  const { start, end, lastDay } = getMonthBounds(key)

  if (expense.recurringDay > lastDay) return false
  if (expense.startDate > end) return false
  if (expense.endDate && expense.endDate < start) return false

  if (expense.billingCycle === 'yearly') {
    return expense.recurringMonth === month.month
  }

  return true
}

export function getAvailableExpenseMonths(
  expenses: ExpenseRecord[],
  payroll: PayrollExpenseRecord[],
  now = new Date(),
) {
  const keys = new Set<string>([getCurrentMonthKey(now), getLastMonthKey(now)])
  const currentMonthKey = getCurrentMonthKey(now)

  for (const expense of expenses) {
    if (expense.type === 'oneTime') {
      const key = dateToMonthKey(expense.paymentDate)
      if (key) keys.add(key)
      continue
    }

    const startKey = dateToMonthKey(expense.startDate)
    const endKey = expense.endDate ? dateToMonthKey(expense.endDate) : currentMonthKey

    if (startKey) {
      keys.add(startKey)
    }

    if (startKey && endKey) {
      let cursor = startKey
      while (cursor <= endKey && cursor <= currentMonthKey) {
        if (isRecurringExpenseDue(expense, cursor)) keys.add(cursor)
        cursor = shiftMonthKey(cursor, 1)
      }
    }
  }

  for (const payment of payroll) {
    if (payment.status === 'paid') {
      keys.add(formatMonthKey(payment.year, Number(payment.month)))
    }
  }

  keys.delete('')

  return Array.from(keys).sort().reverse().map(parseMonthKey)
}

export function calculateExpenseMonth(
  key: string,
  expenses: ExpenseRecord[],
  payroll: PayrollExpenseRecord[],
): ExpenseView {
  const month = parseMonthKey(key)

  const oneTimeExpenses = expenses.filter(
    (expense) => expense.type === 'oneTime' && dateToMonthKey(expense.paymentDate) === key,
  )
  const recurringExpenses = expenses.filter((expense) => isRecurringExpenseDue(expense, key))
  const payrollExpenses = payroll.filter(
    (payment) =>
      payment.status === 'paid' &&
      payment.year === month.year &&
      String(payment.month).padStart(2, '0') === String(month.month).padStart(2, '0'),
  )

  const oneTime = oneTimeExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0)
  const recurring = recurringExpenses.reduce((sum, expense) => sum + toAmount(expense.amount), 0)
  const payrollTotal = payrollExpenses.reduce(
    (sum, payment) => sum + toAmount(payment.totalAmount),
    0,
  )
  const categoryTotals = new Map<string, number>()

  for (const expense of oneTimeExpenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) || 0) + toAmount(expense.amount),
    )
  }

  return {
    month,
    oneTimeExpenses,
    recurringExpenses,
    payrollExpenses,
    totals: {
      oneTime,
      recurring,
      payroll: payrollTotal,
      total: oneTime + recurring + payrollTotal,
    },
    oneTimeByCategory: Array.from(categoryTotals.entries()).map(([category, total]) => ({
      category,
      total,
    })),
  }
}

export function getCompletedMonthKeys(count: number, now = new Date()) {
  const keys: string[] = []
  let key = getLastMonthKey(now)

  for (let index = 0; index < count; index++) {
    keys.push(key)
    key = shiftMonthKey(key, -1)
  }

  return keys.reverse()
}

export function getExportMonthKeys(
  range: 'lastMonth' | 'lastThreeMonths' | 'custom',
  customStart?: string,
  customEnd?: string,
  now = new Date(),
) {
  if (range === 'lastMonth') return [getLastMonthKey(now)]
  if (range === 'lastThreeMonths') return getCompletedMonthKeys(3, now)

  if (!customStart || !customEnd) return []

  const start = dateToMonthKey(customStart)
  const end = dateToMonthKey(customEnd)
  if (!start || !end) return []

  const keys: string[] = []
  let cursor = start
  while (cursor <= end) {
    keys.push(cursor)
    cursor = shiftMonthKey(cursor, 1)
  }

  return keys
}
