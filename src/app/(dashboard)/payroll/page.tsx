import type { Metadata } from 'next'
import { db } from '@/db'
import { requireAuth } from '@/lib/auth-guards'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { PayrollList } from '@/components/payroll/payroll-list'

export const metadata: Metadata = {
  title: 'Payroll Records',
  description: 'Manage payroll records and payments',
}

type AdditionalPayment = Awaited<
  ReturnType<typeof db.query.additionalPaymentsTable.findMany>
>[number] & {
  employee?: Awaited<ReturnType<typeof db.query.usersTable.findFirst>>
}

function categoryToPayrollType(category: AdditionalPayment['category']) {
  if (category === 'bonus' || category === 'commission' || category === 'allowance') {
    return category
  }

  return 'other'
}

function toPayrollRow(payment: AdditionalPayment) {
  const amount = Number(payment.amount || 0)
  const isDeduction = payment.category === 'deduction'

  return {
    id: `additional-${payment.id}`,
    employeeId: payment.employeeId,
    month: payment.month,
    year: payment.year,
    payrollItems: [
      {
        payrollSettingId: payment.id,
        description: payment.description,
        payrollType: categoryToPayrollType(payment.category),
        amount: isDeduction ? 0 : amount,
        paymentType: payment.paymentType,
      },
    ],
    bonusAmount: '0',
    deductionAmount: isDeduction ? String(amount) : '0',
    adjustmentNote: payment.notes,
    totalAmount: String(isDeduction ? -amount : amount),
    paymentDate: payment.paymentDate,
    paymentReference: null,
    paymentNotes: payment.notes,
    status: payment.status,
    processedById: null,
    processedAt: null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    employee: payment.employee,
    processedBy: null,
    isAdditionalPayment: true,
    additionalCategory: payment.category,
  }
}

export default async function Page() {
  await requireAuth()

  const [payrollDocs, additionalPayments] = await Promise.all([
    db.query.payrollTable.findMany({
      orderBy: (payroll, { desc }) => [desc(payroll.updatedAt)],
      limit: 100,
      with: {
        employee: true,
        processedBy: true,
      },
    }),
    db.query.additionalPaymentsTable.findMany({
      orderBy: (payments, { desc }) => [desc(payments.updatedAt)],
      limit: 100,
      with: {
        employee: true,
      },
    }),
  ])

  const payrollRows = [...payrollDocs, ...additionalPayments.map(toPayrollRow)].sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  )

  return (
    <Tabs defaultValue="outline">
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="space-y-4 p-4 lg:p-6">
          <PayrollList data={payrollRows as any} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
