import type { Metadata } from 'next'
import { db } from '@/db'
import { requireAuth } from '@/lib/auth-guards'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import { UserList } from '@/components/user/user-list'

export const metadata: Metadata = {
  title: 'Users',
  description: 'Manage users and team members',
}

export default async function Page() {
  await requireAuth()

  // Fetch Users with role and departments
  const users = await db.query.usersTable.findMany({
    orderBy: (users, { desc }) => [desc(users.joinedAt)],
    limit: 50,
    with: {
      role: true,
      departments: {
        with: {
          department: true,
        },
      },
    },
  })

  return (
    <Tabs defaultValue="outline">
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="space-y-4 p-4 lg:p-6">
          <UserList data={users} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
