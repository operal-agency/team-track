'use server'

import { db } from '@/db'
import { usersTable } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-guards'

export async function updateUserStatus(userId: string, isActive: boolean) {
  try {
    // Check authentication
    await requireAuth()

    await db
      .update(usersTable)
      .set({ isActive, updatedAt: new Date().toISOString() })
      .where(eq(usersTable.id, userId))

    // Revalidate the user pages to show updated status
    revalidatePath('/users')
    revalidatePath(`/users/${userId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating user status:', error)
    throw new Error('Failed to update user status')
  }
}
