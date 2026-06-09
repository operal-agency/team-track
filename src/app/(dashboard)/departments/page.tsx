import type { Metadata } from 'next'
import { db } from '@/db'
import {
  departmentManagersTable,
  departmentsTable,
  userDepartmentsTable,
} from '@/db/schema/departments'
import { rolesTable } from '@/db/schema/roles'
import { usersTable } from '@/db/schema/users'
import { requireAuth } from '@/lib/auth-guards'
import { count, desc, eq } from 'drizzle-orm'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { DepartmentList } from '@/components/departments/department-list'

export const metadata: Metadata = {
  title: 'Departments',
  description: 'Manage organizational departments',
}

export default async function DepartmentsPage() {
  await requireAuth()

  const departments = await db
    .select({
      id: departmentsTable.id,
      name: departmentsTable.name,
      description: departmentsTable.description,
      isActive: departmentsTable.isActive,
      createdAt: departmentsTable.createdAt,
      updatedAt: departmentsTable.updatedAt,
      userCount: count(userDepartmentsTable.userId),
    })
    .from(departmentsTable)
    .leftJoin(userDepartmentsTable, eq(departmentsTable.id, userDepartmentsTable.departmentId))
    .groupBy(
      departmentsTable.id,
      departmentsTable.name,
      departmentsTable.description,
      departmentsTable.isActive,
      departmentsTable.createdAt,
      departmentsTable.updatedAt,
    )
    .orderBy(desc(departmentsTable.createdAt))

  const departmentManagers = await db
    .select({
      departmentId: departmentManagersTable.departmentId,
      userId: usersTable.id,
      fullName: usersTable.fullName,
    })
    .from(departmentManagersTable)
    .innerJoin(usersTable, eq(departmentManagersTable.userId, usersTable.id))

  const managerOptions = await db
    .select({
      value: usersTable.id,
      label: usersTable.fullName,
    })
    .from(usersTable)
    .innerJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
    .where(eq(rolesTable.name, 'manager'))
    .orderBy(usersTable.fullName)

  const departmentsWithManagers = departments.map((department) => {
    const managers = departmentManagers
      .filter((manager) => manager.departmentId === department.id)
      .map((manager) => ({
        id: manager.userId,
        fullName: manager.fullName,
      }))

    return {
      ...department,
      managers,
      managerIds: managers.map((manager) => manager.id),
    }
  })

  return (
    <Tabs defaultValue="outline">
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="space-y-4 p-4 lg:p-6">
          <DepartmentList data={departmentsWithManagers} managerOptions={managerOptions} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
