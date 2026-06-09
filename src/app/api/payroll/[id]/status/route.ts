import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { payrollTable } from '@/db/schema'
import {
  errorResponse,
  requireAuthAPI,
  successResponse,
  unauthorizedResponse,
} from '@/lib/auth-guards'

const VALID_STATUSES = new Set(['generated', 'approved', 'paid', 'cancelled'])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthAPI()
  if (!user) {
    return unauthorizedResponse()
  }

  try {
    const { id } = await params
    const body = await request.json()
    const status = typeof body.status === 'string' ? body.status : ''

    if (!VALID_STATUSES.has(status)) {
      return errorResponse('Invalid payroll status')
    }

    const [updated] = await db
      .update(payrollTable)
      .set({
        status: status as 'generated' | 'approved' | 'paid' | 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payrollTable.id, id))
      .returning({ id: payrollTable.id })

    if (!updated) {
      return errorResponse('Payroll record not found', 404)
    }

    return successResponse({ message: 'Payroll status updated successfully' })
  } catch (error) {
    console.error('Error updating payroll status:', error)
    return errorResponse('Failed to update payroll status', 500)
  }
}
