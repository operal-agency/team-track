import { db } from '@/db'
import { usersTable, payrollSettingsTable, payrollTable, leavesTable } from '@/db/schema'
import { eq, and, lte, gte } from 'drizzle-orm'

export async function generateMonthlyPayrolls(month: string, year: number) {
  try {
    // Get all active employees with employment data
    const employees = await db.query.usersTable.findMany({
      where: eq(usersTable.isActive, true),
      limit: 100,
    })

    const payrollPromises = employees.map(async (user) => {
      // Check if payroll already exists for this period
      const existingPayroll = await db.query.payrollTable.findFirst({
        where: and(
          eq(payrollTable.employeeId, user.id),
          eq(payrollTable.month, month),
          eq(payrollTable.year, year),
        ),
      })

      if (existingPayroll) {
        return null // Skip if already exists
      }

      // Get payroll settings for this employee
      const settings = await db.query.payrollSettingsTable.findFirst({
        where: eq(payrollSettingsTable.employeeId, user.id),
      })

      // Skip if no payroll settings found
      if (!settings) {
        return null
      }

      // Calculate leave days for the period
      const leaveDays = await calculateLeaveDays(String(user.id), month, year)

      // Calculate working days
      const totalWorkingDays = getWorkingDaysInMonth(month, year)
      const daysWorked = totalWorkingDays - leaveDays.unpaidDays

      // Calculate prorated amount if employee didn't work full month
      const prorationFactor = daysWorked / totalWorkingDays
      const proratedAmount = Number(settings.amount) * prorationFactor

      // Create payroll record
      const [newPayroll] = await db
        .insert(payrollTable)
        .values({
          employeeId: user.id,
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
              payrollSettingId: settings.id,
              description: settings.description || 'Monthly Salary',
              payrollType: settings.payrollType,
              amount: proratedAmount,
              paymentType: settings.paymentType,
            },
          ],
          bonusAmount: '0',
          deductionAmount: '0',
          adjustmentNote:
            leaveDays.unpaidDays > 0
              ? `Prorated for ${daysWorked}/${totalWorkingDays} working days (${leaveDays.unpaidDays} unpaid leave days)`
              : '',
          totalAmount: String(proratedAmount),
          status: 'generated',
        })
        .returning()

      return newPayroll
    })

    const results = await Promise.all(payrollPromises)
    return results.filter(Boolean) // Remove nulls
  } catch (error) {
    console.error('Error generating payrolls:', error)
    throw error
  }
}

async function calculateLeaveDays(employeeId: string, month: string, year: number) {
  const startDate = formatDateForDb(new Date(year, parseInt(month) - 1, 1))
  const endDate = formatDateForDb(new Date(year, parseInt(month), 0))

  const leaves = await db.query.leavesTable.findMany({
    where: and(
      eq(leavesTable.userId, employeeId),
      eq(leavesTable.status, 'approved'),
      lte(leavesTable.startDate, endDate),
      gte(leavesTable.endDate, startDate),
    ),
  })

  let totalDays = 0
  let unpaidDays = 0

  leaves.forEach((leave) => {
    totalDays += leave.totalDays || 0
    if (leave.type === 'unpaid') {
      unpaidDays += leave.totalDays || 0
    }
  })

  return { total: totalDays, unpaidDays }
}

function formatDateForDb(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getWorkingDaysInMonth(month: string, year: number): number {
  // Simple calculation - you can make this more sophisticated
  const daysInMonth = new Date(year, parseInt(month), 0).getDate()
  const weekends = Math.floor(daysInMonth / 7) * 2 // Rough weekend calculation
  return daysInMonth - weekends
}
