import { boolean, integer, numeric, pgEnum, pgTable, text, varchar } from 'drizzle-orm/pg-core'

export const expenseTypeEnum = pgEnum('expense_type', ['oneTime', 'recurring'])

export const expenseBillingCycleEnum = pgEnum('expense_billing_cycle', ['monthly', 'yearly'])

export const expensePaymentMethodEnum = pgEnum('expense_payment_method', [
  'bankTransfer',
  'cash',
  'cheque',
  'creditCard',
  'other',
])

export const expensesTable = pgTable('expenses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  type: expenseTypeEnum('type').default('oneTime').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  vendor: varchar('vendor', { length: 255 }),
  paymentMethod: expensePaymentMethodEnum('payment_method').default('bankTransfer').notNull(),
  notes: text('notes'),

  paymentDate: text('payment_date'),
  billingCycle: expenseBillingCycleEnum('billing_cycle'),
  recurringDay: integer('recurring_day'),
  recurringMonth: integer('recurring_month'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  isActive: boolean('is_active').default(true).notNull(),

  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})
