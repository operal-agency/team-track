import { NextRequest } from 'next/server'
import { db } from '@/db'
import {
  departmentManagersTable,
  departmentsTable,
  userDepartmentsTable,
} from '@/db/schema/departments'
import { eq, count } from 'drizzle-orm'
import {
  requireFullAccessAPI,
  successResponse,
  errorResponse,
  forbiddenResponse,
} from '@/lib/auth-guards'

function normalizeManagerIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((managerId) => (typeof managerId === 'string' ? managerId.trim() : ''))
        .filter((managerId) => managerId.length > 0),
    ),
  )
}

/**
 * GET /api/admin/departmentsTable/[id]
 * Get a single department by ID
 * Requires: admin or manager role
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication and permissions
  const user = await requireFullAccessAPI()
  if (!user) {
    return forbiddenResponse('Admin or Manager access required')
  }

  try {
    const { id } = await params

    // Get department with user count
    const [department] = await db
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
      .where(eq(departmentsTable.id, id))
      .groupBy(
        departmentsTable.id,
        departmentsTable.name,
        departmentsTable.description,
        departmentsTable.isActive,
        departmentsTable.createdAt,
        departmentsTable.updatedAt,
      )
      .limit(1)

    if (!department) {
      return errorResponse('Department not found', 404)
    }

    return successResponse({ department })
  } catch (error) {
    console.error('Error fetching department:', error)
    return errorResponse('Failed to fetch department', 500)
  }
}

/**
 * PUT /api/admin/departmentsTable/[id]
 * Update a department
 * Requires: admin or manager role
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Check authentication and permissions
  const user = await requireFullAccessAPI()
  if (!user) {
    return forbiddenResponse('Admin or Manager access required')
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, isActive } = body
    const managerIds = normalizeManagerIds(body.managerIds)

    // Check if department exists
    const [existing] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .limit(1)

    if (!existing) {
      return errorResponse('Department not found', 404)
    }

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return errorResponse('Department name cannot be empty')
      }

      if (name.length > 100) {
        return errorResponse('Department name must be 100 characters or less')
      }

      // Check if another department has this name
      const duplicate = await db
        .select()
        .from(departmentsTable)
        .where(eq(departmentsTable.name, name.trim()))
        .limit(1)

      if (duplicate.length > 0 && duplicate[0].id !== id) {
        return errorResponse('A department with this name already exists')
      }
    }

    const [updated] = await db.transaction(async (tx) => {
      const [department] = await tx
        .update(departmentsTable)
        .set({
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(departmentsTable.id, id))
        .returning()

      if (Array.isArray(body.managerIds)) {
        await tx.delete(departmentManagersTable).where(eq(departmentManagersTable.departmentId, id))

        if (managerIds.length > 0) {
          await tx.insert(departmentManagersTable).values(
            managerIds.map((userId) => ({
              departmentId: id,
              userId,
            })),
          )
        }
      }

      return [department]
    })

    return successResponse({
      department: updated,
      message: 'Department updated successfully',
    })
  } catch (error) {
    console.error('Error updating department:', error)
    return errorResponse('Failed to update department', 500)
  }
}

/**
 * DELETE /api/admin/departmentsTable/[id]
 * Delete a department
 * Requires: admin or manager role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Check authentication and permissions
  const user = await requireFullAccessAPI()
  if (!user) {
    return forbiddenResponse('Admin or Manager access required')
  }

  try {
    const { id } = await params

    // Check if department exists
    const [existing] = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.id, id))
      .limit(1)

    if (!existing) {
      return errorResponse('Department not found', 404)
    }

    // Check if department has users
    const [userCountResult] = await db
      .select({ count: count() })
      .from(userDepartmentsTable)
      .where(eq(userDepartmentsTable.departmentId, id))

    if (userCountResult.count > 0) {
      return errorResponse(
        `Cannot delete department with ${userCountResult.count} assigned user(s). Please reassign users first.`,
        400,
      )
    }

    await db.delete(departmentManagersTable).where(eq(departmentManagersTable.departmentId, id))

    // Delete department
    await db.delete(departmentsTable).where(eq(departmentsTable.id, id))

    return successResponse({
      message: 'Department deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting department:', error)
    return errorResponse('Failed to delete department', 500)
  }
}
