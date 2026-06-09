'use client'

import * as React from 'react'
import {
  IconDashboard,
  IconBuildingWarehouse,
  IconSearch,
  IconSettings,
  IconUsers,
  IconCreditCard,
  IconCalendar,
  IconFileText,
  IconReceipt,
} from '@tabler/icons-react'

import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import Link from 'next/link'
import Image from 'next/image'

const data = {
  navMain: [
    {
      title: 'Dashboard',
      url: '/',
      icon: IconDashboard,
    },
    {
      title: 'Team Members',
      url: '/users',
      icon: IconUsers,
      items: [
        {
          title: 'Users',
          url: '/users',
        },
        {
          title: 'Departments',
          url: '/departments',
        },
      ],
    },
    {
      title: 'Applicants',
      url: '/applicants',
      icon: IconFileText,
    },
    {
      title: 'Calendar',
      url: '/calendar',
      icon: IconCalendar,
    },
    {
      title: 'Inventory',
      url: '/inventory',
      icon: IconBuildingWarehouse,
    },
    {
      title: 'Leaves',
      url: '/leaves',
      icon: IconUsers,
    },
    {
      title: 'Payroll',
      url: '/payroll',
      icon: IconCreditCard,
      items: [
        {
          title: 'Records',
          url: '/payroll',
        },
        {
          title: 'Settings',
          url: '/payroll/settings',
        },
      ],
    },
    {
      title: 'Expenses',
      url: '/expenses',
      icon: IconReceipt,
    },
  ],

  navSecondary: [
    // {
    //   title: 'Settings',
    //   url: '#',
    //   icon: IconSettings,
    // },
    // {
    //   title: 'Search',
    // //   url: '/search',
    // //   icon: IconSearch,
    // // },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="lg:pt-8 lg:pl-4" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/">
                <Image src="/brand/Team-Track-Logo.png" alt="Team Track" width={32} height={32} />
                <span className="text-base font-semibold">Team Track</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavSecondary items={data.navSecondary} />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
