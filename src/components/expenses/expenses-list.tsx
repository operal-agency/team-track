'use client'

import * as React from 'react'
import { Download, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/data-table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/date-picker'
import {
  calculateExpenseMonth,
  formatMonthKey,
  getAvailableExpenseMonths,
  getCurrentMonthKey,
  getExportMonthKeys,
  getLastMonthKey,
  getMonthBounds,
  parseMonthKey,
  toAmount,
  type ExpenseRecord,
  type PayrollExpenseRecord,
} from '@/lib/expenses'
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from '@/lib/actions/expenses'

interface ExpensesListProps {
  expenses: ExpenseRecord[]
  payroll: PayrollExpenseRecord[]
}

type ExpenseSourceFilter = 'all' | 'recurring' | 'oneTime' | 'payroll'

type UnifiedExpenseRow = {
  id: string
  source: 'oneTime' | 'recurring' | 'payroll'
  name: string
  category: string
  vendor: string
  amount: number
  dateOrPeriod: string
  details: string
  originalExpense?: ExpenseRecord
}

const paymentMethodOptions = [
  { value: 'bankTransfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'creditCard', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
]

const categoryOptions = [
  'groceries',
  'laptop',
  'office supplies',
  'travel',
  'software',
  'utilities',
  'rent',
  'other',
]

const recurringMonthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPaymentMethod(value?: string | null) {
  return paymentMethodOptions.find((option) => option.value === value)?.label || value || '-'
}

function getRecurringDueLabel(expense: ExpenseRecord) {
  if (expense.billingCycle === 'yearly') {
    return `${recurringMonthOptions.find((month) => month.value === String(expense.recurringMonth))?.label || '-'} ${expense.recurringDay}`
  }

  return `Day ${expense.recurringDay}`
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue?: string | null
}) {
  const [value, setValue] = React.useState(defaultValue || '')

  return <DatePicker label={label} name={name} value={value} onValueChange={setValue} />
}

function ExpenseForm({
  action,
  expense,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>
  expense?: ExpenseRecord | null
  onClose?: () => void
}) {
  const [type, setType] = React.useState<'oneTime' | 'recurring'>(expense?.type || 'oneTime')
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>(
    expense?.billingCycle || 'monthly',
  )
  const [isActive, setIsActive] = React.useState(expense?.isActive ?? true)

  return (
    <form
      action={async (formData) => {
        await action(formData)
        onClose?.()
      }}
      className="space-y-4"
    >
      {expense && <input type="hidden" name="id" value={expense.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="billingCycle" value={billingCycle} />
      <input type="hidden" name="isActive" value={String(isActive)} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Expense Type</Label>
          <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oneTime">One-time</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={expense?.amount || ''}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required defaultValue={expense?.name || ''} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            list="expense-categories"
            required
            defaultValue={expense?.category || 'other'}
          />
          <datalist id="expense-categories">
            {categoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" name="vendor" defaultValue={expense?.vendor || ''} />
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select name="paymentMethod" defaultValue={expense?.paymentMethod || 'bankTransfer'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {type === 'oneTime' ? (
        <DateField label="Payment Date" name="paymentDate" defaultValue={expense?.paymentDate} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Billing Cycle</Label>
              <Select
                value={billingCycle}
                onValueChange={(value) => setBillingCycle(value as typeof billingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recurringDay">Recurring Day</Label>
              <Input
                id="recurringDay"
                name="recurringDay"
                type="number"
                min="1"
                max="31"
                required
                defaultValue={expense?.recurringDay || 1}
              />
            </div>

            {billingCycle === 'yearly' && (
              <div className="space-y-2">
                <Label>Recurring Month</Label>
                <Select name="recurringMonth" defaultValue={String(expense?.recurringMonth || 1)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringMonthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField label="Start Date" name="startDate" defaultValue={expense?.startDate} />
            <DateField label="End Date" name="endDate" defaultValue={expense?.endDate} />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active recurring expense</Label>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={expense?.notes || ''} />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">{expense ? 'Update' : 'Create'} Expense</Button>
      </DialogFooter>
    </form>
  )
}

export function ExpensesList({ expenses, payroll }: ExpensesListProps) {
  const currentMonthKey = getCurrentMonthKey()
  const lastMonthKey = getLastMonthKey()
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonthKey)
  const [sourceFilter, setSourceFilter] = React.useState<ExpenseSourceFilter>('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingExpense, setEditingExpense] = React.useState<ExpenseRecord | null>(null)
  const [deletingExpense, setDeletingExpense] = React.useState<ExpenseRecord | null>(null)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [exportRange, setExportRange] = React.useState<'lastMonth' | 'lastThreeMonths' | 'custom'>(
    'lastMonth',
  )
  const lastCompletedMonthEnd = getMonthBounds(lastMonthKey).end

  const availableMonths = React.useMemo(
    () => getAvailableExpenseMonths(expenses, payroll),
    [expenses, payroll],
  )
  const selectedView = React.useMemo(
    () => calculateExpenseMonth(selectedMonth, expenses, payroll),
    [expenses, payroll, selectedMonth],
  )

  const extraMonths = availableMonths.filter(
    (month) => month.key !== currentMonthKey && month.key !== lastMonthKey,
  )

  const tableRows = React.useMemo<UnifiedExpenseRow[]>(() => {
    const oneTimeRows = selectedView.oneTimeExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      source: 'oneTime' as const,
      name: expense.name,
      category: expense.category,
      vendor: expense.vendor || '-',
      amount: toAmount(expense.amount),
      dateOrPeriod: formatDate(expense.paymentDate),
      details: formatPaymentMethod(expense.paymentMethod),
      originalExpense: expense,
    }))

    const recurringRows = selectedView.recurringExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      source: 'recurring' as const,
      name: expense.name,
      category: expense.category,
      vendor: expense.vendor || '-',
      amount: toAmount(expense.amount),
      dateOrPeriod: getRecurringDueLabel(expense),
      details: `${expense.billingCycle || '-'} • ${formatPaymentMethod(expense.paymentMethod)}`,
      originalExpense: expense,
    }))

    const payrollRows = selectedView.payrollExpenses.map((payment) => ({
      id: `payroll-${payment.id}`,
      source: 'payroll' as const,
      name: payment.employee?.fullName || 'Payroll',
      category: 'payroll',
      vendor: '-',
      amount: toAmount(payment.totalAmount),
      dateOrPeriod: parseMonthKey(formatMonthKey(payment.year, Number(payment.month))).label,
      details: 'Paid payroll',
    }))

    return [...oneTimeRows, ...recurringRows, ...payrollRows]
  }, [selectedView])

  const filteredRows = React.useMemo(() => {
    if (sourceFilter === 'all') return tableRows
    return tableRows.filter((row) => row.source === sourceFilter)
  }, [sourceFilter, tableRows])

  const unifiedColumns = [
    {
      key: 'source' as keyof UnifiedExpenseRow,
      header: 'Type',
      render: (value: unknown) => {
        const source = String(value)
        const label =
          source === 'oneTime' ? 'One-time' : source === 'recurring' ? 'Recurring' : 'Payroll'
        return <Badge variant={source === 'payroll' ? 'secondary' : 'outline'}>{label}</Badge>
      },
    },
    { key: 'name' as keyof UnifiedExpenseRow, header: 'Name' },
    { key: 'category' as keyof UnifiedExpenseRow, header: 'Category' },
    { key: 'vendor' as keyof UnifiedExpenseRow, header: 'Vendor' },
    {
      key: 'amount' as keyof UnifiedExpenseRow,
      header: 'Amount',
      render: (value: unknown) => formatCurrency(Number(value || 0)),
    },
    { key: 'dateOrPeriod' as keyof UnifiedExpenseRow, header: 'Date / Period' },
    { key: 'details' as keyof UnifiedExpenseRow, header: 'Details' },
  ]

  async function handleExport(formData: FormData) {
    const range = String(formData.get('range') || 'lastMonth') as typeof exportRange
    const keys = getExportMonthKeys(
      range,
      String(formData.get('startDate') || ''),
      String(formData.get('endDate') || ''),
    )

    const views = keys.map((key) => calculateExpenseMonth(key, expenses, payroll))
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        views.map((view) => ({
          Month: view.month.label,
          Total: view.totals.total,
          Payroll: view.totals.payroll,
          Recurring: view.totals.recurring,
          'One-time': view.totals.oneTime,
        })),
      ),
      'Summary',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        views.flatMap((view) =>
          view.oneTimeExpenses.map((expense) => ({
            Month: view.month.label,
            Name: expense.name,
            Category: expense.category,
            Vendor: expense.vendor || '',
            Amount: toAmount(expense.amount),
            'Payment Date': expense.paymentDate || '',
          })),
        ),
      ),
      'One-time Expenses',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        views.flatMap((view) =>
          view.recurringExpenses.map((expense) => ({
            Month: view.month.label,
            Name: expense.name,
            Category: expense.category,
            Vendor: expense.vendor || '',
            Amount: toAmount(expense.amount),
            Cycle: expense.billingCycle || '',
            'Recurring Day': expense.recurringDay || '',
            'Recurring Month': expense.recurringMonth || '',
          })),
        ),
      ),
      'Recurring Expenses',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        views.flatMap((view) =>
          view.payrollExpenses.map((payment) => ({
            Month: view.month.label,
            Employee: payment.employee?.fullName || '',
            Amount: toAmount(payment.totalAmount),
          })),
        ),
      ),
      'Paid Payroll',
    )

    XLSX.writeFile(workbook, `expenses-${keys[0]}-${keys[keys.length - 1]}.xlsx`)
    setExportOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Expenses</h1>
          <p className="text-sm text-muted-foreground">{selectedView.month.label}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Expenses</DialogTitle>
                <DialogDescription>Export completed periods only.</DialogDescription>
              </DialogHeader>
              <form action={handleExport} className="space-y-4">
                <input type="hidden" name="range" value={exportRange} />
                <div className="space-y-2">
                  <Label>Range</Label>
                  <Select
                    value={exportRange}
                    onValueChange={(value) => setExportRange(value as typeof exportRange)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                      <SelectItem value="lastThreeMonths">Last 3 Months</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {exportRange === 'custom' && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="export-start">Start Date</Label>
                      <Input
                        id="export-start"
                        name="startDate"
                        type="date"
                        max={lastCompletedMonthEnd}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="export-end">End Date</Label>
                      <Input
                        id="export-end"
                        name="endDate"
                        type="date"
                        max={lastCompletedMonthEnd}
                        required
                      />
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Export XLSX</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm action={createExpenseAction} onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ButtonGroup className="overflow-x-auto sm:w-auto">
          {(
            [
              { value: 'all', label: 'All' },
              { value: 'recurring', label: 'Recurring' },
              { value: 'oneTime', label: 'One-time' },
              { value: 'payroll', label: 'Payroll' },
            ] as const
          ).map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={sourceFilter === item.value ? 'default' : 'outline'}
              onClick={() => setSourceFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </ButtonGroup>

        <ButtonGroup className="overflow-x-auto">
          <Button
            type="button"
            size="sm"
            variant={selectedMonth === currentMonthKey ? 'default' : 'outline'}
            onClick={() => setSelectedMonth(currentMonthKey)}
          >
            This Month
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedMonth === lastMonthKey ? 'default' : 'outline'}
            onClick={() => setSelectedMonth(lastMonthKey)}
          >
            Last Month
          </Button>
          {extraMonths.map((month) => (
            <Button
              key={month.key}
              type="button"
              size="sm"
              variant={selectedMonth === month.key ? 'default' : 'outline'}
              onClick={() => setSelectedMonth(month.key)}
            >
              {month.label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(selectedView.totals.total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Payroll</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(selectedView.totals.payroll)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Recurring</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(selectedView.totals.recurring)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">One-time</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {formatCurrency(selectedView.totals.oneTime)}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedView.oneTimeByCategory.map((item) => (
                <Badge key={item.category} variant="outline">
                  {item.category}: {formatCurrency(item.total)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRows}
            columns={unifiedColumns}
            actionColumn={(row) => {
              if (!row.originalExpense) return null

              return (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingExpense(row.originalExpense || null)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingExpense(row.originalExpense || null)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              )
            }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingExpense)}
        onOpenChange={(open) => !open && setEditingExpense(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              expense={editingExpense}
              action={updateExpenseAction}
              onClose={() => setEditingExpense(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingExpense)}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingExpense?.name || 'this expense'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteExpenseAction}>
              <input type="hidden" name="id" value={deletingExpense?.id || ''} />
              <AlertDialogAction
                type="submit"
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
