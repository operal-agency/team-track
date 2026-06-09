import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { getCurrentUser } from '@/lib/auth'
import { EmployeeProfileView } from '@/components/employee/employee-profile-view'
import { eq } from 'drizzle-orm'
import {
  usersTable,
  inventoryTable,
  leavesTable,
  payrollTable,
  payrollSettingsTable,
} from '@/db/schema'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View and manage your profile',
}

export default async function EmployeeProfilePage() {
  const user = await getCurrentUser()

  if (!user || !user.id) {
    redirect('/login')
  }

  const userId = user.id // Ensure we have a string for TypeScript

  // Fetch full user data with relations
  const userData = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
    with: {
      role: true,
      departments: {
        with: {
          department: true,
        },
      },
    },
  })

  if (!userData) {
    redirect('/login')
  }

  // Fetch user's inventory
  const inventory = await db.query.inventoryTable.findMany({
    where: eq(inventoryTable.holderId, userId),
    with: {
      holder: true,
    },
  })

  // Fetch user's leaves
  const leaves = await db.query.leavesTable.findMany({
    where: eq(leavesTable.userId, userId),
    orderBy: (leaves, { desc }) => [desc(leaves.startDate)],
    with: {
      user: true,
    },
  })

  // Fetch user's payroll history
  const payrollHistory = await db.query.payrollTable.findMany({
    where: eq(payrollTable.employeeId, userId),
    orderBy: (payroll, { desc }) => [desc(payroll.createdAt)],
    with: {
      employee: true,
      processedBy: true,
    },
  })

  // Fetch user's payroll settings only
  const payrollSettings = await db.query.payrollSettingsTable.findMany({
    where: eq(payrollSettingsTable.employeeId, userId),
    with: {
      employee: true,
    },
  })

  return (
    <EmployeeProfileView
      user={userData}
      inventory={inventory}
      leaves={leaves}
      payrollHistory={payrollHistory}
      payrollSettings={payrollSettings}
    />
  )
}
