'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Inputs via InputField wrapper
// Select handled via SelectField wrapper
import { ProfilePhotoUpload } from '@/components/ui/profile-photo-upload'
import { ArrowLeft, Save, X } from 'lucide-react'
import type { InferSelectModel } from 'drizzle-orm'
import { usersTable } from '@/db/schema'

type User = InferSelectModel<typeof usersTable> & {
  role?: { id: string; name: string } | null
  departments?: Array<{
    id: string
    userId: string
    departmentId: string
    createdAt: string | null
    department: {
      id: string
      name: string
      isActive: boolean
      createdAt: string | null
      updatedAt: string | null
      description: string | null
    }
  }>
}

import { useForm, Controller, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserFormSchema, type UserFormValues } from './user-form.schema'
import { SelectField } from '@/components/form/select-field'
import { ComboboxMultiSelect } from '@/components/form/combobox-multi-select'
import { InputField } from '@/components/form/input-field'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { BirthdatePicker } from '@/components/date-pickers/birthdate-picker'
import { JoinedDatePicker } from '@/components/date-pickers/joined-date-picker'
import { WorkPermitExpiryPicker } from '@/components/date-pickers/work-permit-expiry-picker'
import { MultiFileUpload } from '@/components/ui/multi-file-upload'
import { COUNTRIES } from '@/lib/countries'

interface UserFormProps {
  initialData?: Partial<User>
  onSubmit?: (data: UserFormValues) => Promise<any>
  formAction?: (formData: FormData) => Promise<void>
  headerAction?: React.ReactNode
  mode: 'create' | 'edit'
  isSubmitting?: boolean
  departments?: Array<{ value: string; label: string }>
  roles?: Array<{ value: string; label: string }>
}

export function UserForm({
  initialData,
  onSubmit,
  formAction,
  headerAction,
  mode,
  isSubmitting = false,
  departments = [],
  roles = [],
}: UserFormProps) {
  const defaultValues: UserFormValues = {
    fullName: initialData?.fullName || '',
    username: initialData?.username || '',
    email: initialData?.email || '',
    password: '',
    confirmPassword: '',
    photo: initialData?.photo || null,
    departments:
      Array.isArray(initialData?.departments) && initialData.departments.length > 0
        ? initialData.departments.map((dept: any) =>
            String(typeof dept === 'object' && dept.departmentId ? dept.departmentId : dept),
          )
        : [],
    role: initialData?.roleId || initialData?.role?.id || undefined,
    jobTitle: initialData?.jobTitle || '',
    birthDate: initialData?.birthDate?.split('T')[0] || '', // Extract YYYY-MM-DD from ISO
    primaryPhone: initialData?.primaryPhone || '',
    secondaryPhone: initialData?.secondaryPhone || '',
    secondaryEmail: initialData?.secondaryEmail || '',
    employmentType: initialData?.employmentType || 'other',
    nationality: initialData?.nationality || '',
    identityNumber: initialData?.identityNumber || '',
    workPermitExpiry: initialData?.workPermitExpiry?.split('T')[0] || undefined, // Extract YYYY-MM-DD
    address: initialData?.address || '',
    documents: Array.isArray(initialData?.documents)
      ? initialData.documents.map((doc) => {
          // Keep the full document object if available, otherwise just the ID
          if (typeof doc === 'object' && doc && 'id' in doc) {
            return doc // Return the full media object
          }
          return String(doc) // Fallback to string ID
        })
      : [],
    isActive: initialData?.isActive ?? true,
    joinedAt:
      initialData?.joinedAt?.split('T')[0] || // Extract YYYY-MM-DD
      (mode === 'create' ? new Date().toISOString().split('T')[0] : undefined),
  }

  const {
    register,
    control,
    // handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(UserFormSchema) as any,
    defaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  // Watch employment type to conditionally show work permit expiry
  const employmentType = watch('employmentType')

  // const onValidSubmit: SubmitHandler<UserFormValues> = React.useCallback(
  //   async (values) => {
  //     if (!onSubmit) return
  //     try {
  //       await onSubmit(values)
  //     } catch (error) {
  //       console.error('Form submission error:', error)
  //       alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
  //     }
  //   },
  //   [onSubmit],
  // )

  const formRef = React.useRef<HTMLFormElement>(null)
  const [nativeSubmitting, setNativeSubmitting] = React.useState(false)
  const [validationPassed, setValidationPassed] = React.useState(false)

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href={mode === 'edit' ? `/users/${initialData?.id}` : '/users'}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Add New User' : 'Edit User Profile'}
            </h1>
          </div>
          {headerAction}
        </div>

        <form
          ref={formRef}
          action={formAction as any}
          onSubmit={async (e) => {
            if (!formAction) return

            // For server-action mode, do client-side validation first
            if (mode === 'create' && !validationPassed) {
              e.preventDefault()
              console.log('Running validation...')

              const ok = await trigger()
              if (!ok) {
                console.log('Validation failed:', errors)
                return
              }

              // Enforce password presence and match on create
              const pwd = (watch('password') as string) || ''
              const cpwd = (watch('confirmPassword') as string) || ''
              if (!pwd) {
                alert('Password is required')
                return
              }
              if (!cpwd) {
                alert('Confirm password is required')
                return
              }
              if (pwd !== cpwd) {
                alert('Passwords do not match')
                return
              }

              console.log('Validation passed, submitting...')
              setValidationPassed(true)
              setNativeSubmitting(true)

              // Now trigger the actual submission
              setTimeout(() => {
                formRef.current?.requestSubmit()
              }, 0)
              return
            }

            // If validation already passed or in edit mode, let it submit
            if (mode === 'create') {
              setNativeSubmitting(true)
            }
          }}
          className="space-y-6"
        >
          {/* Basic Information Section */}
          <Card>
            <CardHeader>
              <CardTitle>User Profile Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Photo Upload */}
              <div className="flex justify-center">
                <Controller
                  control={control}
                  name="photo"
                  render={({ field: { value, onChange } }) => (
                    <ProfilePhotoUpload
                      value={value ?? null}
                      onChange={(file) => onChange(file)}
                      name="photo"
                      placeholder="Profile Photo"
                      size="xl"
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Email *"
                  name={'email'}
                  register={register}
                  error={errors.email?.message as string | undefined}
                />
                <InputField
                  label="Username *"
                  name={'username'}
                  register={register}
                  error={errors.username?.message as string | undefined}
                />
                {mode === 'create' && (
                  <>
                    <InputField
                      label="Password *"
                      name={'password'}
                      register={register}
                      type="password"
                      error={errors.password?.message as string | undefined}
                    />
                    <InputField
                      label="Confirm Password *"
                      name={'confirmPassword'}
                      register={register}
                      type="password"
                      error={errors.confirmPassword?.message as string | undefined}
                    />
                  </>
                )}

                <InputField
                  label="Full Name *"
                  name={'fullName'}
                  register={register}
                  error={errors.fullName?.message as string | undefined}
                />

                <InputField label="Job Title" name={'jobTitle'} register={register} />

                <ComboboxMultiSelect
                  control={control}
                  name={'departments'}
                  label="Departments"
                  placeholder="Select departments..."
                  searchPlaceholder="Search departments..."
                  emptyMessage="No departments found."
                  options={departments}
                  error={errors.departments?.message as string | undefined}
                />

                <SelectField
                  control={control}
                  name={'role'}
                  label="Role"
                  placeholder="Select role"
                  options={roles}
                  error={errors.role?.message as string | undefined}
                />

                <Controller
                  control={control}
                  name="birthDate"
                  render={({ field }) => (
                    <BirthdatePicker
                      value={field.value}
                      onValueChange={field.onChange}
                      name="birthDate"
                      error={errors.birthDate?.message as string | undefined}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="joinedAt"
                  render={({ field }) => (
                    <JoinedDatePicker
                      label="Joined At Date"
                      value={field.value}
                      onValueChange={field.onChange}
                      name="joinedAt"
                    />
                  )}
                />
              </div>

              <Separator />

              {/* Employment Status */}
              <CardTitle className="text-lg font-semibold">Employment Status</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  control={control}
                  name={'nationality'}
                  label="Nationality"
                  placeholder="Select nationality"
                  options={COUNTRIES}
                  searchable={true}
                />
                <InputField label="Identity Number" name={'identityNumber'} register={register} />

                <SelectField
                  control={control}
                  name={'employmentType'}
                  label="Employment Type *"
                  placeholder="Select employment type"
                  options={[
                    { label: 'Citizen', value: 'citizen' },
                    { label: 'Work Permit', value: 'workPermit' },
                    { label: 'Residence Permit', value: 'residencePermit' },
                    { label: 'Other', value: 'other' },
                  ]}
                />

                {/* Conditionally show Work Permit Expiry only when Work Permit is selected */}
                {employmentType === 'workPermit' && (
                  <Controller
                    control={control}
                    name="workPermitExpiry"
                    render={({ field }) => (
                      <WorkPermitExpiryPicker
                        value={field.value}
                        onValueChange={field.onChange}
                        name="workPermitExpiry"
                        error={errors.workPermitExpiry?.message as string | undefined}
                      />
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Contact Information Section */}
              <CardTitle className="text-lg font-bold">Contact Information</CardTitle>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField
                    label="Primary Phone *"
                    name={'primaryPhone'}
                    register={register}
                    type="tel"
                    error={errors.primaryPhone?.message as string | undefined}
                  />
                  <InputField
                    label="Secondary Phone"
                    name={'secondaryPhone'}
                    register={register}
                    type="tel"
                  />
                  <InputField
                    label="Secondary Email"
                    name={'secondaryEmail'}
                    register={register}
                    type="email"
                    error={errors.secondaryEmail?.message as string | undefined}
                  />

                  <div className="md:col-span-2">
                    <label className="px-1 text-sm font-medium" htmlFor="address">
                      Address
                    </label>
                    <textarea
                      id="address"
                      className="mt-2 w-full rounded-md border bg-background p-2"
                      rows={4}
                      {...register('address')}
                    />
                  </div>
                </div>

                <Separator />

                {/* Documents Section */}
                <CardTitle className="text-lg font-bold">Documents</CardTitle>
                <Controller
                  control={control}
                  name="documents"
                  render={({ field }) => (
                    <MultiFileUpload
                      value={field.value as (File | string)[]}
                      onChange={field.onChange}
                      name="documents"
                      label="Upload Documents"
                      placeholder="Click or drag files to upload"
                      maxFiles={10}
                    />
                  )}
                />

                <Separator />

                <div className="space-y-4 mt-10">
                  {/* Form Actions */}
                  <div className="flex justify-end space-x-4">
                    <Link href={mode === 'edit' ? `/users/${initialData?.id}` : '/users'}>
                      <Button type="button" variant="outline" className="cursor-pointer">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type={formAction ? 'submit' : 'submit'}
                      disabled={isSubmitting || isFormSubmitting || nativeSubmitting}
                      className="cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting || isFormSubmitting || nativeSubmitting ? (
                        <Spinner className="h-4 w-4 mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {isSubmitting || isFormSubmitting || nativeSubmitting
                        ? mode === 'create'
                          ? 'Creating...'
                          : 'Saving...'
                        : mode === 'create'
                          ? 'Create User'
                          : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
