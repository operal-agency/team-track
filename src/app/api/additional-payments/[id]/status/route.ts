import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { additionalPaymentsTable } from '@/db/schema'
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
      return errorResponse('Invalid payment status')
    }

    const [updated] = await db
      .update(additionalPaymentsTable)
      .set({
        status: status as 'generated' | 'approved' | 'paid' | 'cancelled',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(additionalPaymentsTable.id, id))
      .returning({ id: additionalPaymentsTable.id })

    if (!updated) {
      return errorResponse('Additional payment not found', 404)
    }

    return successResponse({ message: 'Additional payment status updated successfully' })
  } catch (error) {
    console.error('Error updating additional payment status:', error)
    return errorResponse('Failed to update additional payment status', 500)
  }
}
