'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { DepartmentForm } from '@/components/departments/department-form'
import { DepartmentTable } from '@/components/departments/department-table'

export interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  userCount: number
  managers: Array<{
    id: string
    fullName: string
  }>
  managerIds: string[]
}

interface DepartmentListProps {
  data: Department[]
  managerOptions: Array<{ value: string; label: string }>
}

export function DepartmentList({ data, managerOptions }: DepartmentListProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingDepartment, setEditingDepartment] = React.useState<Department | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()

    return data.filter((department) => {
      if (statusFilter === 'active' && !department.isActive) return false
      if (statusFilter === 'inactive' && department.isActive) return false

      if (!q) return true

      const name = department.name.toLowerCase()
      const description = (department.description || '').toLowerCase()
      const status = department.isActive ? 'active' : 'inactive'
      const managers = department.managers
        .map((manager) => manager.fullName)
        .join(' ')
        .toLowerCase()

      return (
        name.includes(q) || description.includes(q) || status.includes(q) || managers.includes(q)
      )
    })
  }, [data, query, statusFilter])

  const handleCreateClick = () => {
    setEditingDepartment(null)
    setFormOpen(true)
  }

  const handleEditClick = (department: Department) => {
    setEditingDepartment(department)
    setFormOpen(true)
  }

  const handleRefresh = () => {
    router.refresh()
  }

  const handleFormSuccess = () => {
    setEditingDepartment(null)
    handleRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold">Departments</h1>
            <div className="text-sm text-muted-foreground">
              {data.length} total · {filtered.length} shown
            </div>
          </div>

          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Department
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <ButtonGroup className="w-full sm:w-auto">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="flex-1 sm:flex-none"
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
              className="flex-1 sm:flex-none"
            >
              Active
            </Button>
            <Button
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('inactive')}
              className="flex-1 sm:flex-none"
            >
              Inactive
            </Button>
          </ButtonGroup>

          <Input
            placeholder="Search departments..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full sm:w-80"
          />
        </div>
      </div>

      <DepartmentTable data={filtered} onEdit={handleEditClick} onDeleted={handleRefresh} />

      <DepartmentForm
        department={editingDepartment}
        managerOptions={managerOptions}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
