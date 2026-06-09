'use client'

import * as React from 'react'
import { Pencil, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
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
import type { Department } from '@/components/departments/department-list'

interface DepartmentTableProps {
  data: Department[]
  onEdit: (department: Department) => void
  onDeleted: () => void
}

export function DepartmentTable({ data, onEdit, onDeleted }: DepartmentTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!departmentToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/departments/${departmentToDelete.id}`, {
        method: 'DELETE',
      })

      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error || 'Failed to delete department')
      }

      toast.success('Department deleted successfully')
      setDeleteDialogOpen(false)
      setDepartmentToDelete(null)
      onDeleted()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete department')
    } finally {
      setIsDeleting(false)
    }
  }

  const columns = [
    {
      key: 'name' as keyof Department,
      header: 'Name',
      render: (value: unknown) => <span className="font-medium">{String(value || '-')}</span>,
    },
    {
      key: 'description' as keyof Department,
      header: 'Description',
      render: (value: unknown) =>
        value ? (
          <span className="text-muted-foreground">{String(value)}</span>
        ) : (
          <span className="italic text-muted-foreground">No description</span>
        ),
    },
    {
      key: 'isActive' as keyof Department,
      header: 'Status',
      render: (value: unknown) => (
        <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'userCount' as keyof Department,
      header: 'Users',
      render: (value: unknown) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{Number(value || 0)}</span>
        </div>
      ),
    },
    {
      key: 'managers' as keyof Department,
      header: 'Managers',
      render: (_value: unknown, department: Department) => {
        if (department.managers.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }

        return (
          <div className="flex flex-wrap gap-1">
            {department.managers.map((manager) => (
              <Badge key={manager.id} variant="outline">
                {manager.fullName}
              </Badge>
            ))}
          </div>
        )
      },
    },
  ]

  const actionColumn = (department: Department) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => onEdit(department)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDeleteClick(department)}
        disabled={department.userCount > 0}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  )

  return (
    <>
      <DataTable data={data} columns={columns} actionColumn={actionColumn} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{departmentToDelete?.name}</strong>? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
