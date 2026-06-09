import { pgTable, text, varchar, boolean } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { usersTable } from './users'

// ============================================
// Department Table (Stage 1: Simple Categories)
// ============================================

export const departmentsTable = pgTable('departments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
  updatedAt: text('updated_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})

// ============================================
// User-Department Junction Table
// ============================================

export const userDepartmentsTable = pgTable('user_departments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  departmentId: text('department_id').notNull(),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})

// ============================================
// Department Manager Junction Table
// ============================================

export const departmentManagersTable = pgTable('department_managers', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  departmentId: text('department_id').notNull(),
  userId: text('user_id').notNull(),
  createdAt: text('created_at')
    .$defaultFn(() => new Date().toISOString())
    .notNull(),
})

// ============================================
// Relations
// ============================================

export const departmentsRelations = relations(departmentsTable, ({ many }) => ({
  users: many(userDepartmentsTable),
  managers: many(departmentManagersTable),
}))

export const userDepartmentsRelations = relations(userDepartmentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userDepartmentsTable.userId],
    references: [usersTable.id],
  }),
  department: one(departmentsTable, {
    fields: [userDepartmentsTable.departmentId],
    references: [departmentsTable.id],
  }),
}))

export const departmentManagersRelations = relations(departmentManagersTable, ({ one }) => ({
  department: one(departmentsTable, {
    fields: [departmentManagersTable.departmentId],
    references: [departmentsTable.id],
  }),
  user: one(usersTable, {
    fields: [departmentManagersTable.userId],
    references: [usersTable.id],
  }),
}))
