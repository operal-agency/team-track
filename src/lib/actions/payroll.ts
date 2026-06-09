'use server'

import { redirect } from 'next/navigation'
import { eq, and, or, isNull, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { payrollSettingsTable, payrollTable, usersTable } from '@/db/schema'
import { requireAuth } from '@/lib/auth-guards'

function formatDateForDb(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function generatePayrollsAction(formData: FormData) {
  await requireAuth()

  const month = String(formData.get('month') || new Date().getMonth() + 1).padStart(2, '0')
  const year = Number(formData.get('year') || new Date().getFullYear())
  const periodStart = formatDateForDb(new Date(year, Number(month) - 1, 1))
  const periodEnd = formatDateForDb(new Date(year, Number(month), 0))

  const employees = await db.query.usersTable.findMany({
    where: eq(usersTable.isActive, true),
    limit: 100,
  })

  for (const employee of employees) {
    const payrollSettings = await db.query.payrollSettingsTable.findMany({
      where: and(
        eq(payrollSettingsTable.employeeId, employee.id),
        eq(payrollSettingsTable.isActive, true),
        lte(payrollSettingsTable.startDate, periodEnd),
        or(isNull(payrollSettingsTable.endDate), gte(payrollSettingsTable.endDate, periodStart)),
      ),
    })

    for (const setting of payrollSettings) {
      const existing = await db.query.payrollTable.findFirst({
        where: and(
          eq(payrollTable.employeeId, employee.id),
          eq(payrollTable.month, month),
          eq(payrollTable.year, year),
        ),
      })

      if (existing) {
        continue
      }

      const amount =
        typeof setting.amount === 'string' ? parseFloat(setting.amount) : setting.amount

      await db.insert(payrollTable).values({
        employeeId: employee.id,
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
        payrollItems: [
          {
            payrollSettingId: setting.id,
            description: setting.description || `${setting.payrollType} payment`,
            payrollType: setting.payrollType,
            amount: amount || 0,
            paymentType: setting.paymentType,
          },
        ],
        bonusAmount: '0',
        deductionAmount: '0',
        adjustmentNote: null,
        totalAmount: String(amount || 0),
        status: 'generated',
      })
    }
  }

  redirect('/payroll')
}
