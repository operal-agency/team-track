import { NextRequest } from 'next/server'
import { db } from '@/db'
import {
  departmentManagersTable,
  departmentsTable,
  userDepartmentsTable,
} from '@/db/schema/departments'
import { eq, count, desc } from 'drizzle-orm'
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
      value.map((id) => (typeof id === 'string' ? id.trim() : '')).filter((id) => id.length > 0),
    ),
  )
}

/**
 * GET /api/admin/departments
 * List all departments with user counts
 * Requires: admin or manager role
 */
export async function GET() {
  // Check authentication and permissions
  const user = await requireFullAccessAPI()
  if (!user) {
    return forbiddenResponse('Admin or Manager access required')
  }

  try {
    // Get all departments with user counts
    const allDepartments = await db
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
      .groupBy(
        departmentsTable.id,
        departmentsTable.name,
        departmentsTable.description,
        departmentsTable.isActive,
        departmentsTable.createdAt,
        departmentsTable.updatedAt,
      )
      .orderBy(desc(departmentsTable.createdAt))

    return successResponse({
      departments: allDepartments,
      total: allDepartments.length,
    })
  } catch (error) {
    console.error('Error fetching departments:', error)
    return errorResponse('Failed to fetch departments', 500)
  }
}

/**
 * POST /api/admin/departments
 * Create a new department
 * Requires: admin or manager role
 */
export async function POST(request: NextRequest) {
  // Check authentication and permissions
  const user = await requireFullAccessAPI()
  if (!user) {
    return forbiddenResponse('Admin or Manager access required')
  }

  try {
    const body = await request.json()
    const { name, description, isActive } = body
    const managerIds = normalizeManagerIds(body.managerIds)

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return errorResponse('Department name is required')
    }

    if (name.length > 100) {
      return errorResponse('Department name must be 100 characters or less')
    }

    // Check if department with same name already exists
    const existing = await db
      .select()
      .from(departmentsTable)
      .where(eq(departmentsTable.name, name.trim()))
      .limit(1)

    if (existing.length > 0) {
      return errorResponse('A department with this name already exists')
    }

    const [newDepartment] = await db.transaction(async (tx) => {
      const [department] = await tx
        .insert(departmentsTable)
        .values({
          name: name.trim(),
          description: description?.trim() || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        })
        .returning()

      if (managerIds.length > 0) {
        await tx.insert(departmentManagersTable).values(
          managerIds.map((userId) => ({
            departmentId: department.id,
            userId,
          })),
        )
      }

      return [department]
    })

    return successResponse(
      {
        department: newDepartment,
        message: 'Department created successfully',
      },
      201,
    )
  } catch (error) {
    console.error('Error creating department:', error)
    return errorResponse('Failed to create department', 500)
  }
}
