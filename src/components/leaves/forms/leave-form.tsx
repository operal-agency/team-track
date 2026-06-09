'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SelectField } from '@/components/form/select-field'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, X } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { DatePicker } from '@/components/date-picker'
import type { InferSelectModel } from 'drizzle-orm'
import { leavesTable } from '@/db/schema'

type LeaveDay = InferSelectModel<typeof leavesTable>

const LeaveDaySchemaBase = z.object({
  user: z.string().min(1, 'User is required'),
  type: z.enum(['annual', 'sick', 'unpaid', 'other'] as const, {
    error: 'Leave type is required',
  }),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalDays: z.number().optional(),
  status: z.enum(['requested', 'approved', 'rejected', 'cancelled'] as const, {
    error: 'Status is required',
  }),
  reason: z.string().min(1, 'Reason is required'),
  note: z.string().optional(),
})

const LeaveDaySchema = LeaveDaySchemaBase.superRefine((val, ctx) => {
  // Validate date range
  if (val.startDate && val.endDate) {
    const start = new Date(val.startDate)
    const end = new Date(val.endDate)
    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      })
    }
  }
})

export type LeaveDayFormValues = z.infer<typeof LeaveDaySchema>

interface Option {
  value: string
  label: string
}

interface LeaveDayFormProps {
  mode: 'create' | 'edit'
  onSubmit?: (data: LeaveDayFormValues) => Promise<any>
  formAction?: (formData: FormData) => Promise<void>
  users: Option[]
  initialData?: Partial<LeaveDay>
  showStatusField?: boolean // For admin users only
  lockedUserOption?: Option
  returnHref?: string
}

export function LeaveDayForm({
  mode,
  onSubmit,
  formAction,
  users,
  initialData,
  showStatusField = false,
  lockedUserOption,
  returnHref = '/leaves',
}: LeaveDayFormProps) {
  const defaultUserValue = React.useMemo(() => {
    if (initialData) {
      // initialData has userId field from Drizzle schema
      if (initialData.userId) {
        return String(initialData.userId)
      }
    }
    return lockedUserOption?.value ?? ''
  }, [initialData, lockedUserOption])

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeaveDayFormValues>({
    resolver: zodResolver(LeaveDaySchema) as any,
    defaultValues: {
      user: defaultUserValue,
      type: (initialData?.type as any) || 'annual',
      startDate: initialData?.startDate
        ? new Date(initialData.startDate).toISOString().split('T')[0]
        : '',
      endDate: initialData?.endDate
        ? new Date(initialData.endDate).toISOString().split('T')[0]
        : '',
      totalDays: initialData?.totalDays || undefined,
      status: (initialData?.status as any) || 'requested',
      reason: initialData?.reason || '',
      note: initialData?.note || '',
    },
  })

  const formRef = React.useRef<HTMLFormElement>(null)
  const [nativeSubmitting, setNativeSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (lockedUserOption) {
      setValue('user', lockedUserOption.value, { shouldValidate: true })
    }
  }, [lockedUserOption, setValue])

  const statusOptions: Option[] = [
    { label: 'Requested', value: 'requested' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  const leaveTypeOptions: Option[] = [
    { label: 'Annual Leave', value: 'annual' },
    { label: 'Sick Leave', value: 'sick' },
    { label: 'Unpaid Leave', value: 'unpaid' },
    { label: 'Other', value: 'other' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href={returnHref}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Add Leave Request' : 'Edit Leave Request'}
            </h1>
          </div>
        </div>

        <form
          ref={formRef}
          action={formAction as any}
          onSubmit={!formAction ? handleSubmit(async (values) => onSubmit?.(values)) : undefined}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Leave Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  control={control}
                  name={'user'}
                  label="User *"
                  placeholder="Select user"
                  options={users}
                  error={errors.user?.message as string | undefined}
                  searchable={!lockedUserOption}
                  disabled={Boolean(lockedUserOption)}
                />

                <SelectField
                  control={control}
                  name={'type'}
                  label="Leave Type *"
                  placeholder="Select leave type"
                  options={leaveTypeOptions}
                  error={errors.type?.message as string | undefined}
                />

                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DatePicker
                      label="Start Date *"
                      value={field.value}
                      onValueChange={field.onChange}
                      name="startDate"
                      error={errors.startDate?.message as string | undefined}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <DatePicker
                      label="End Date *"
                      value={field.value}
                      onValueChange={field.onChange}
                      name="endDate"
                      error={errors.endDate?.message as string | undefined}
                    />
                  )}
                />

                {showStatusField && (
                  <SelectField
                    control={control}
                    name={'status'}
                    label="Status *"
                    placeholder="Select status"
                    options={statusOptions}
                    error={errors.status?.message as string | undefined}
                  />
                )}

                {!showStatusField && (
                  <input type="hidden" {...register('status')} value="requested" />
                )}

                <div className="md:col-span-2">
                  <label htmlFor="reason" className="px-1 text-sm font-medium text-foreground">
                    Reason *
                  </label>
                  <textarea
                    id="reason"
                    className="mt-2 w-full rounded-md border bg-background p-2"
                    rows={3}
                    {...register('reason')}
                  />
                  {errors.reason && (
                    <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="note" className="px-1 text-sm font-medium text-foreground">
                    Additional Notes
                  </label>
                  <textarea
                    id="note"
                    className="mt-2 w-full rounded-md border bg-background p-2"
                    rows={2}
                    {...register('note')}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href={returnHref}>
                  <Button type="button" variant="outline" className="cursor-pointer">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </Link>
                <Button
                  type={formAction ? 'button' : 'submit'}
                  className="cursor-pointer disabled:cursor-not-allowed"
                  disabled={isSubmitting || nativeSubmitting}
                  onClick={async () => {
                    if (!formAction) return
                    const isValid = await trigger()
                    if (isValid) {
                      setNativeSubmitting(true)
                      formRef.current?.requestSubmit()
                    }
                  }}
                >
                  {isSubmitting || nativeSubmitting ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSubmitting || nativeSubmitting
                    ? 'Saving...'
                    : mode === 'create'
                      ? 'Create Leave Request'
                      : 'Update Leave Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
