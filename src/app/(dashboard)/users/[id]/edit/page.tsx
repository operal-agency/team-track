import { redirect, notFound } from 'next/navigation'
import { db } from '@/db'
import { requireAdmin, requireAuth } from '@/lib/auth-guards'
import { isAdmin } from '@/lib/rbac'
import { UserForm } from '@/components/user/forms/user-form'
import {
  AdminPasswordResetForm,
  type PasswordResetState,
} from '@/components/user/forms/admin-password-reset-form'
import { SetBreadcrumbLabel } from '@/components/set-breadcrumb-label'
import { eq, asc } from 'drizzle-orm'
import { usersTable, departmentsTable, rolesTable, userDepartmentsTable } from '@/db/schema'

interface EditUserPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params
  const currentUser = await requireAuth()

  try {
    // Fetch the user to edit
    const userToEdit = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
      with: {
        role: true,
        departments: {
          with: {
            department: true,
          },
        },
      },
    })

    if (!userToEdit) {
      notFound()
    }

    // Fetch departments and roles for dropdowns
    const [departments, roles] = await Promise.all([
      db.select().from(departmentsTable).orderBy(asc(departmentsTable.name)),
      db.select().from(rolesTable).orderBy(asc(rolesTable.name)),
    ])

    const handleUpdateUser = async (formData: FormData) => {
      'use server'

      await requireAuth()

      // Handle photo upload via API if file is provided
      let photoPath: string | null = null
      const photo = formData.get('photo') as File | null
      const fullName = String(formData.get('fullName') || '')

      if (photo && typeof photo === 'object' && 'arrayBuffer' in photo && photo.size > 0) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', photo)

        const uploadRes = await fetch(
          `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/upload`,
          {
            method: 'POST',
            body: uploadFormData,
          },
        )

        if (uploadRes.ok) {
          const { url } = await uploadRes.json()
          photoPath = url
        }
      } else {
        // Keep existing photo if present
        photoPath = null
      }

      // Normalize optionals; email field must not receive empty string
      const jobTitle = String(formData.get('jobTitle') || '')
      const secondaryPhone = String(formData.get('secondaryPhone') || '')
      const secondaryEmail = String(formData.get('secondaryEmail') || '')
      const email = String(formData.get('email') || '')
      const username = String(formData.get('username') || '')

      // Update the user
      const userData: any = {
        fullName,
        ...(photoPath && { photo: photoPath }),
        birthDate: String(formData.get('birthDate') || ''),
        primaryPhone: String(formData.get('primaryPhone') || ''),
        ...(email ? { email } : {}),
        ...(username ? { username } : {}),
        joinedAt: String(formData.get('joinedAt') || ''),
        employmentType: String(formData.get('employmentType') || 'other'),
        nationality: String(formData.get('nationality') || ''),
        identityNumber: String(formData.get('identityNumber') || ''),
        address: String(formData.get('address') || ''),
      }

      // Optional date fields: set to value if provided, otherwise null to clear
      const workPermitExpiry = String(formData.get('workPermitExpiry') || '')
      userData.workPermitExpiry = workPermitExpiry || null
      // remove unrelated insurance/contact expiry fields

      // Optional fields
      userData.jobTitle = jobTitle || null
      userData.secondaryPhone = secondaryPhone || null
      userData.secondaryEmail = secondaryEmail || null

      // Handle departments array (multi-select) - will update junction table
      const departmentIds: string[] = []
      let index = 0
      while (formData.has(`departments[${index}]`)) {
        const deptId = String(formData.get(`departments[${index}]`))
        if (deptId) departmentIds.push(deptId)
        index++
      }

      // Convert role string ID if value provided
      const roleId = String(formData.get('role') || '')
      if (roleId) userData.roleId = roleId

      // Handle documents upload (multi-file) via API
      // Get existing document paths from the current user
      const existingDocPaths = userToEdit.documents
        ? typeof userToEdit.documents === 'string'
          ? JSON.parse(userToEdit.documents)
          : userToEdit.documents
        : []

      const documentPaths: string[] = Array.isArray(existingDocPaths) ? [...existingDocPaths] : []
      let docIndex = 0
      while (formData.has(`documents[${docIndex}]`)) {
        const doc = formData.get(`documents[${docIndex}]`) as File | string
        if (doc && typeof doc === 'object' && 'arrayBuffer' in doc && doc.size > 0) {
          // New file upload
          const uploadFormData = new FormData()
          uploadFormData.append('file', doc)

          const uploadRes = await fetch(
            `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/upload`,
            {
              method: 'POST',
              body: uploadFormData,
            },
          )

          if (uploadRes.ok) {
            const { url } = await uploadRes.json()
            documentPaths.push(url)
          }
        } else if (typeof doc === 'string' && doc) {
          // Existing document path - keep it if not already in array
          if (!documentPaths.includes(doc)) {
            documentPaths.push(doc)
          }
        }
        docIndex++
      }
      userData.documents = JSON.stringify(documentPaths)

      // Employment fields
      const baseSalary = formData.get('baseSalary')
      const paymentType = String(formData.get('paymentType') || 'bankTransfer')

      // Add employment data - always include the structure to allow clearing fields
      userData.employment = {
        ...(baseSalary && { baseSalary: parseFloat(String(baseSalary)) }),
        paymentType,
      }

      // Update user in database
      await db
        .update(usersTable)
        .set({
          ...userData,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(usersTable.id, id))

      // Update department assignments in junction table
      // Delete existing assignments
      await db.delete(userDepartmentsTable).where(eq(userDepartmentsTable.userId, id))

      // Insert new assignments
      if (departmentIds.length > 0) {
        await db.insert(userDepartmentsTable).values(
          departmentIds.map((deptId) => ({
            userId: id,
            departmentId: deptId,
          })),
        )
      }

      // Redirect back to the user profile
      redirect(`/users/${id}`)
    }

    const handleUpdatePassword = async (
      _state: PasswordResetState,
      formData: FormData,
    ): Promise<PasswordResetState> => {
      'use server'

      await requireAdmin()

      const newPassword = String(formData.get('newPassword') || '')
      const confirmNewPassword = String(formData.get('confirmNewPassword') || '')

      if (newPassword.length < 6) {
        return { error: 'Password must be at least 6 characters long.' }
      }

      if (newPassword !== confirmNewPassword) {
        return { error: 'Passwords do not match.' }
      }

      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      await db
        .update(usersTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(usersTable.id, id))

      return { success: 'Password updated successfully.' }
    }

    return (
      <>
        <SetBreadcrumbLabel label={userToEdit.fullName} />
        <UserForm
          mode="edit"
          initialData={userToEdit}
          headerAction={
            isAdmin(currentUser) ? <AdminPasswordResetForm action={handleUpdatePassword} /> : null
          }
          formAction={handleUpdateUser}
          departments={departments.map((dept) => ({
            value: String(dept.id),
            label: dept.name,
          }))}
          roles={roles.map((role) => ({ value: String(role.id), label: role.displayName }))}
        />
      </>
    )
  } catch (error) {
    console.error('Error fetching staff:', error)
    notFound()
  }
}
