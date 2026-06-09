'use client'

import * as React from 'react'
import type { InferSelectModel } from 'drizzle-orm'
import { payrollTable, usersTable } from '@/db/schema'

type Payroll = InferSelectModel<typeof payrollTable>
type User = InferSelectModel<typeof usersTable>

type PayrollWithEmployee = Payroll & {
  employee?: User | null
  processedBy?: User | null
}

import { Badge } from '../ui/badge'
import { DataTable } from '../data-table'
import { Button } from '../ui/button'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ChevronDown, Trash2 } from 'lucide-react'
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

interface PayrollTableProps {
  data: PayrollWithEmployee[]
  enablePagination?: boolean
}

type ExpandedPayroll = PayrollWithEmployee & {
  currentItemIndex?: number
  originalId?: string | number
}

type PayrollStatus = 'generated' | 'approved' | 'paid' | 'cancelled'

const statusOptions: { value: PayrollStatus; label: string }[] = [
  { value: 'generated', label: 'Generated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function PayrollTable({ data, enablePagination = true }: PayrollTableProps) {
  const [updatingStatus, setUpdatingStatus] = React.useState<string | null>(null)
  const [deletingPayroll, setDeletingPayroll] = React.useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [payrollToDelete, setPayrollToDelete] = React.useState<Payroll | null>(null)

  const updatePayrollStatus = async (payrollId: string, newStatus: PayrollStatus) => {
    setUpdatingStatus(payrollId)
    try {
      // Check if this is an additional payment
      const item = data.find(
        (p) => String(p.id) === payrollId || String(p.id) === `additional-${payrollId}`,
      )
      const isAdditional = item && (item as any).isAdditionalPayment

      // Extract actual ID for additional payments
      const idString = String(item?.id || payrollId)
      const actualId =
        isAdditional && idString.startsWith('additional-')
          ? idString.replace('additional-', '')
          : payrollId

      const endpoint = isAdditional
        ? `/api/additional-payments/${actualId}/status`
        : `/api/payroll/${actualId}/status`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDeleteClick = (payroll: Payroll) => {
    setPayrollToDelete(payroll)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    if (!payrollToDelete) return

    const idToDelete = payrollToDelete.id
    const isAdditional = (payrollToDelete as any).isAdditionalPayment

    // Extract the actual ID for additional payments (remove 'additional-' prefix)
    const idString = String(idToDelete)
    const actualId =
      isAdditional && idString.startsWith('additional-')
        ? idString.replace('additional-', '')
        : idToDelete

    const endpoint = isAdditional
      ? `/api/additional-payments/${actualId}`
      : `/api/payroll/${actualId}`

    setDeletingPayroll(String(actualId))
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete payment')
      }

      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error deleting payroll:', error)
      alert('Failed to delete payroll. Please try again.')
    } finally {
      setDeletingPayroll(null)
      setShowDeleteDialog(false)
      setPayrollToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
    setPayrollToDelete(null)
  }

  const getStatusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    switch (status) {
      case 'approved':
        return 'default'
      case 'paid':
        return 'success'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '₺0.00'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount)
  }

  const formatPeriod = (period: { month?: string; year?: number }) => {
    if (!period?.month || !period?.year) return '-'
    const monthNames = {
      '01': 'Jan',
      '02': 'Feb',
      '03': 'Mar',
      '04': 'Apr',
      '05': 'May',
      '06': 'Jun',
      '07': 'Jul',
      '08': 'Aug',
      '09': 'Sep',
      '10': 'Oct',
      '11': 'Nov',
      '12': 'Dec',
    }
    return `${monthNames[period.month as keyof typeof monthNames]} ${period.year}`
  }

  const columns = [
    {
      key: 'employee' as keyof ExpandedPayroll,
      header: 'Employee',
      render: (value: unknown, item: ExpandedPayroll) => {
        const employee = item.employee
        return typeof employee === 'object' && employee !== null && 'fullName' in employee
          ? (employee as User).fullName
          : employee || '-'
      },
    },
    {
      key: 'month' as keyof ExpandedPayroll,
      header: 'Period',
      render: (value: unknown, item: ExpandedPayroll) =>
        formatPeriod({ month: item.month, year: item.year }),
    },
    {
      key: 'payrollItems' as keyof ExpandedPayroll,
      header: 'Payment Method',
      render: (value: unknown, item: ExpandedPayroll) => {
        const items = item.payrollItems
        if (!items || !Array.isArray(items) || items.length === 0) return '-'

        // Now we only have one item per payroll record
        const payrollItem = items[0]

        if (!payrollItem) return '-'

        const type = (payrollItem as any).paymentType || 'bankTransfer'
        const isAdditional = (item as any).isAdditionalPayment
        const paymentTypeLabel =
          type === 'bankTransfer' ? 'Bank Transfer' : type === 'cash' ? 'Cash' : 'Cheque'

        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{paymentTypeLabel}</Badge>
            {isAdditional && (
              <Badge variant="secondary" className="text-xs">
                Additional
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'totalAmount' as keyof ExpandedPayroll,
      header: 'Amount',
      render: (value: unknown, item: ExpandedPayroll) => {
        const items = item.payrollItems
        if (!items || !Array.isArray(items) || items.length === 0) return formatCurrency(0)

        const payrollItem = items[0]
        if (!payrollItem) return formatCurrency(0)

        const baseAmount = (payrollItem as any).amount || 0
        const bonus = parseFloat(item.bonusAmount || '0')
        const deduction = parseFloat(item.deductionAmount || '0')

        // If no adjustments, just show the amount
        if (bonus === 0 && deduction === 0) {
          return formatCurrency(baseAmount)
        }

        // Show amount with adjustments breakdown
        const parts = [formatCurrency(baseAmount)]
        if (bonus > 0) parts.push(`+ ${formatCurrency(bonus)}`)
        if (deduction > 0) parts.push(`- ${formatCurrency(deduction)}`)

        return (
          <div className="flex flex-col">
            <span className="text-sm">{parts.join(' ')}</span>
          </div>
        )
      },
    },
    {
      key: 'bonusAmount' as keyof ExpandedPayroll,
      header: 'Net Total',
      render: (value: unknown, item: ExpandedPayroll) => {
        const items = item.payrollItems
        if (!items || !Array.isArray(items) || items.length === 0) return formatCurrency(0)

        const payrollItem = items[0]
        if (!payrollItem) return formatCurrency(0)

        const baseAmount = (payrollItem as any).amount || 0
        const bonus = parseFloat(item.bonusAmount || '0')
        const deduction = parseFloat(item.deductionAmount || '0')

        const netTotal = baseAmount + bonus - deduction

        return <span className="text-sm">{formatCurrency(netTotal)}</span>
      },
    },
    {
      key: 'status' as keyof ExpandedPayroll,
      header: 'Status',
      render: (value: unknown, item: ExpandedPayroll) => {
        const currentStatus = String(value) as PayrollStatus

        // Extract the actual numeric ID for comparison
        const idString = String(item.id)
        const actualId = idString.startsWith('additional-')
          ? idString.replace('additional-', '')
          : String(item.id)

        const isUpdating = updatingStatus === actualId
        const isLocked = currentStatus === 'paid' || currentStatus === 'cancelled'

        // If status is locked (paid or cancelled), show badge without dropdown
        if (isLocked) {
          return (
            <Badge variant={getStatusVariant(currentStatus)} className="capitalize">
              {currentStatus}
            </Badge>
          )
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                disabled={isUpdating}
              >
                <Badge
                  variant={getStatusVariant(currentStatus)}
                  className="capitalize cursor-pointer hover:opacity-80 flex items-center gap-1"
                >
                  {currentStatus}
                  <ChevronDown className="h-3 w-3" />
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updatePayrollStatus(actualId, option.value)}
                  className={`cursor-pointer capitalize ${option.value === currentStatus ? 'bg-accent' : ''}`}
                  disabled={option.value === currentStatus || isUpdating}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const actionColumn = (item: Payroll) => {
    // Extract the actual numeric ID
    const idString = String(item.id)
    const actualId = idString.startsWith('additional-')
      ? idString.replace('additional-', '')
      : String(item.id)

    const isDeleting = deletingPayroll === actualId
    const currentStatus = String(item.status) as PayrollStatus
    const isLocked = currentStatus === 'paid' || currentStatus === 'cancelled'
    const isAdditional = (item as any).isAdditionalPayment

    // For additional payments, show edit button linking to additional payment edit page
    if (isAdditional) {
      return (
        <div className="flex gap-2">
          {isLocked ? (
            <Button
              variant="outline"
              className="w-full flex-1 cursor-not-allowed"
              disabled
              title={`Cannot edit ${currentStatus} payment`}
            >
              Edit Payment
            </Button>
          ) : (
            <Link href={`/payroll/additional/${actualId}/edit`} className="flex-1">
              <Button
                variant="outline"
                className="w-full"
                disabled={isDeleting}
                title="Edit additional payment"
              >
                Edit Payment
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteClick(item)}
            disabled={isDeleting || isLocked}
            className={isLocked ? 'cursor-not-allowed' : ''}
            title={isLocked ? `Cannot delete ${currentStatus} payment` : 'Delete payment'}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )
    }

    return (
      <div className="flex gap-2">
        {isLocked ? (
          <Button
            variant="outline"
            className="w-full flex-1 cursor-not-allowed"
            disabled
            title={`Cannot edit ${currentStatus} payroll`}
          >
            Edit Payroll
          </Button>
        ) : (
          <Link href={`/payroll/${item.id}/edit`} className="flex-1">
            <Button variant="outline" className="w-full" disabled={isDeleting} title="Edit payroll">
              Edit Payroll
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteClick(item)}
          disabled={isDeleting || isLocked}
          className={isLocked ? 'cursor-not-allowed' : ''}
          title={isLocked ? `Cannot delete ${currentStatus} payroll` : 'Delete payroll'}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DataTable<ExpandedPayroll>
        data={data}
        columns={columns}
        actionColumn={actionColumn}
        enablePagination={enablePagination}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payroll Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payroll record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
