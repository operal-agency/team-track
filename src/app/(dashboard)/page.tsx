import type { Metadata } from 'next'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { UserOverviewCard } from '@/components/dashboard/user-overview-card'
import { InventoryOverviewCard } from '@/components/dashboard/inventory-overview-card'
import { getInventoryStats, getUserStats } from '@/lib/actions/dashboard'
import { getExpenseDashboardSeries } from '@/lib/actions/expenses'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function Page() {
  // Fetch current user and dashboard stats
  const [user, userStats, inventoryStats, expenseSeries] = await Promise.all([
    getCurrentUser(),
    getUserStats(),
    getInventoryStats(),
    getExpenseDashboardSeries(),
  ])

  const firstName = user?.name?.split(' ')[0] || 'User'

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Welcome Section */}
          <div className="px-4 lg:px-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight">Welcome back, {firstName}!</h1>
              <p className="text-muted-foreground">
                Here&apos;s an overview of your team and inventory
              </p>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 md:grid-cols-4 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6">
            <UserOverviewCard stats={userStats} className="md:col-span-2 lg:col-span-1" />
            <InventoryOverviewCard stats={inventoryStats} className="md:col-span-2 lg:col-span-3" />
          </div>

          <div className="px-4 lg:px-6">
            <ChartAreaInteractive data={expenseSeries} />
          </div>
        </div>
      </div>
    </div>
  )
}
