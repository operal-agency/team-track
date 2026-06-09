# PayloadCMS to Drizzle + NextAuth Migration Plan

## Overview

This document outlines the complete migration process from PayloadCMS to a custom setup using Drizzle ORM and NextAuth.js for the Team Track application.

---

## Current Architecture Analysis

### PayloadCMS Components

- **Database**: PostgreSQL via `@payloadcms/db-postgres`
- **Collections**: Users, Applicants, Inventory, LeaveDays, Payroll, PayrollSettings, Roles, Departments, Media
- **Authentication**: Built-in PayloadCMS auth with JWT tokens
- **File Uploads**: PayloadCMS media handling
- **Admin Panel**: PayloadCMS auto-generated admin UI
- **API**: Auto-generated REST and GraphQL APIs

### Dependencies to Remove

```json
"@payloadcms/db-postgres": "3.68.1",
"@payloadcms/next": "3.68.1",
"@payloadcms/richtext-lexical": "3.68.1",
"@payloadcms/ui": "3.68.1",
"payload": "3.68.1"
```

---

## Migration Steps

### Phase 1: Setup New Infrastructure

#### Step 1.1: Install Drizzle ORM

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

#### Step 1.2: Setup Drizzle Configuration

Create `drizzle.config.ts` and `src/db/schema/` directory structure

#### Step 1.3: Install NextAuth

```bash
pnpm add next-auth@beta @auth/drizzle-adapter
```

#### Step 1.4: File Upload Setup

**Local Filesystem Storage (Current PayloadCMS Method)**

No additional dependencies needed - continue using the same approach as PayloadCMS:

- Files stored in `public/media/` directory (or Docker volume)
- Metadata stored in Drizzle database
- Files served as static assets by Next.js
- Use native Next.js FormData handling in API routes

---

### Phase 2: Create Drizzle Schema

#### Step 2.1: Define Core Schemas

Create schema files in `src/db/schema/` directory:

1. **users.ts** - User table with auth fields, personal info, employment data
   - Relations: Role, Department, Payroll, Leaves

2. **auth.ts** - NextAuth tables (accounts, sessions, verification tokens)

3. **roles.ts** - Role table with JSON permissions

4. **departments.ts** - Department table + user-department junction table

5. **applicants.ts** - Job application data with enums

6. **inventory.ts** - Inventory management

7. **leaves.ts** - Leave management with status tracking

8. **payroll-settings.ts** - Recurring payment templates

9. **payroll.ts** - Monthly payroll records

10. **media.ts** - File metadata and storage paths

#### Step 2.2: Push Schema to Database

```bash
npx drizzle-kit push
```

---

### Phase 3: Setup NextAuth

#### Step 3.1: Create NextAuth Configuration

File: `src/auth.ts`

- Configure Credentials provider
- Setup Drizzle adapter
- Configure session strategy
- Add callbacks for JWT and session

#### Step 3.2: Create Auth API Route

File: `src/app/api/auth/[...nextauth]/route.ts`

- Export GET and POST handlers

#### Step 3.3: Update Middleware

File: `middleware.ts`

- Protect routes with NextAuth middleware
- Handle public/private route logic

#### Step 3.4: Create Auth Helper Functions

- `getServerSession()` for server components
- `useSession()` for client components
- Login/logout actions

---

### Phase 4: Create API Routes

Replace PayloadCMS auto-generated APIs with custom routes:

#### Step 4.1: User API Routes

- `POST /api/users` - Create user
- `GET /api/users` - List users
- `GET /api/users/[id]` - Get user
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

#### Step 4.2: Applicant API Routes

- CRUD operations for applicants
- File upload for CVs

#### Step 4.3: Inventory API Routes

- CRUD operations for inventory

#### Step 4.4: Leave API Routes

- CRUD operations for leaves
- Leave approval workflow

#### Step 4.5: Payroll API Routes

- Payroll generation
- Payroll history
- Settings management

#### Step 4.6: Roles & Departments API Routes

- CRUD operations for roles and departments

#### Step 4.7: Media/Upload API Routes

- File upload handling
- File retrieval
- File deletion

---

### Phase 5: Implement Access Control

#### Step 5.1: Create Middleware Utils

File: `src/lib/access-control.ts`

- Port RBAC logic from `src/access/rbac.ts`
- Create permission checking functions
- Create role-based middleware

#### Step 5.2: Create Server Actions

- Protected server actions with permission checks
- Use NextAuth session for user context

#### Step 5.3: Update API Route Protection

- Add permission checks to all API routes
- Return 401/403 appropriately

---

### Phase 6: Migrate File Uploads

#### Step 6.1: Setup File Storage

- Keep existing `public/media/` directory (already in use)
- For Docker: ensure media directory is volume-mounted
- Create upload API route using Next.js FormData
- Implement file validation (size, type, etc.)

#### Step 6.2: Update Media Model

- Drizzle Media table already created with fields: filename, url, mimeType, filesize, width, height, alt, createdAt, updatedAt
- Store file paths relative to `public/media/`
- Implement file deletion (remove from filesystem + database)

#### Step 6.3: Update Components

- Replace PayloadCMS upload components with custom file input
- Create reusable upload component with drag-and-drop
- Handle upload progress and errors

---

### Phase 7: Update Application Code

#### Step 7.1: Update Authentication Logic

Files to update:

- `src/lib/auth.ts` - Replace with NextAuth helpers
- `src/components/login-form.tsx` - Use NextAuth signIn
- `src/app/login/page.tsx` - Update login flow

#### Step 7.2: Update Server Components

Replace all:

```typescript
import { getPayload } from 'payload'
const payload = await getPayload({ config })
```

With:

```typescript
import { db } from '@/db'
```

#### Step 7.3: Update API Calls

Replace all fetch calls to PayloadCMS API routes with new custom API routes

#### Step 7.4: Update Server Actions

Files in `src/lib/actions/` - Update to use Drizzle ORM

#### Step 7.5: Update Components

All components that fetch data or interact with auth:

- Dashboard components
- User components
- Applicant components
- Inventory components
- Leave components
- Payroll components
- Calendar components

---

### Phase 8: Data Migration

#### Step 8.1: Create Migration Script

File: `scripts/migrate-payload-to-drizzle.ts`

Steps:

1. Connect to existing PayloadCMS database
2. Read all data from PayloadCMS tables
3. Transform data to match new Drizzle schema
4. Insert into new Drizzle database
5. Handle file migrations
6. Verify data integrity

#### Step 8.2: Run Migration

```bash
pnpm tsx scripts/migrate-payload-to-drizzle.ts
```

---

### Phase 9: Remove PayloadCMS

#### Step 9.1: Remove Dependencies

```bash
pnpm remove @payloadcms/db-postgres @payloadcms/next @payloadcms/richtext-lexical @payloadcms/ui payload graphql
```

#### Step 9.2: Delete Files/Folders

- `src/payload.config.ts`
- `src/payload-types.ts`
- `src/collections/` (entire directory)
- `src/migrations/` (PayloadCMS migrations)
- `src/app/(payload)/` (admin panel)
- `src/seed/` (if using PayloadCMS seed structure)

#### Step 9.3: Update Scripts

Remove from `package.json`:

- `generate:importmap`
- `generate:types`
- `payload`
- Update `db:reset` script

#### Step 9.4: Clean Configuration

- Remove PayloadCMS from `next.config.mjs`
- Update `tsconfig.json` if needed

---

### Phase 10: Testing & Validation

#### Step 10.1: Update Tests

- Update integration tests in `tests/int/`
- Update e2e tests in `tests/e2e/`
- Test all authentication flows
- Test all CRUD operations
- Test file uploads

#### Step 10.2: Manual Testing

- [ ] User registration/login
- [ ] User management (CRUD)
- [ ] Applicant management
- [ ] Inventory management
- [ ] Leave management
- [ ] Payroll generation
- [ ] File uploads
- [ ] Role-based access control
- [ ] All dashboard features
- [ ] Calendar functionality

#### Step 10.3: Database Verification

- Verify all data migrated correctly
- Check foreign key relationships
- Validate data integrity

---

## Implementation Order

### Quick Reference Checklist

#### Infrastructure (Days 1-2)

- [x] Install Drizzle ORM
- [x] Create Drizzle schema files
- [x] Install NextAuth
- [ ] Configure authentication

#### Backend (Days 3-5)

- [x] Create all Drizzle schemas (users, auth, roles, departments, applicants, inventory, leaves, payroll-settings, payroll, media)
- [x] Push schema to database
- [ ] Setup database connection
- [ ] Create API routes for all collections
- [ ] Implement access control

#### File Handling (Day 6)

- [x] Using local filesystem storage (same as PayloadCMS)
- [ ] Create upload API route
- [ ] Update media handling

#### Frontend (Days 7-9)

- [ ] Update authentication UI
- [ ] Update all data-fetching components
- [ ] Update forms and mutations
- [ ] Update server actions

#### Migration & Cleanup (Days 10-11)

- [ ] Create data migration script
- [ ] Run data migration
- [ ] Verify data integrity
- [ ] Remove PayloadCMS files and dependencies

#### Testing (Days 12-13)

- [ ] Update tests
- [ ] Manual QA testing
- [ ] Fix bugs

---

## Critical Files to Create

### New Files Needed

```
drizzle.config.ts

src/
  db/
    index.ts (Drizzle db instance)
    schema.ts (Main export file)
    schema/
      users.ts ✅
      auth.ts ✅
      roles.ts ✅
      departments.ts ✅
      applicants.ts ✅
      inventory.ts ✅
      leaves.ts ✅
      payroll-settings.ts ✅
      payroll.ts ✅
      media.ts ✅
  auth.ts (NextAuth config)
  lib/
    access-control.ts (RBAC helpers)
  app/
    api/
      auth/[...nextauth]/route.ts
      users/route.ts
      users/[id]/route.ts
      applicants/route.ts
      applicants/[id]/route.ts
      inventory/route.ts
      inventory/[id]/route.ts
      leaves/route.ts
      leaves/[id]/route.ts
      payroll/route.ts
      payroll/[id]/route.ts
      payroll-settings/route.ts
      roles/route.ts
      roles/[id]/route.ts
      departments/route.ts
      departments/[id]/route.ts
      upload/route.ts
```

---

## Environment Variables

### Add to `.env`

```env
# Database (Drizzle)
DATABASE_URL="postgresql://user:password@localhost:5432/teamtrack"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-min-32-chars"

# File Upload
MAX_FILE_SIZE="10485760" # 10MB in bytes
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,application/pdf"
```

---

## Database Schema Notes

### Key Considerations

1. **User Authentication**: Store hashed passwords using bcrypt
2. **File Storage**: Store file URLs/paths, not binary data
3. **Timestamps**: All tables have `createdAt` and `updatedAt`
4. **Relations**: Drizzle relations defined for foreign keys
5. **Indexes**: Can be added with Drizzle using `.index()` on fields
6. **JSON Fields**: Used for complex data (permissions, bank accounts, payroll items)
7. **Enums**: pgEnum used for fixed value sets (employment type, status fields, etc.)

---

## Rollback Plan

If migration fails:

1. Keep old database backup
2. Revert git commits
3. Reinstall PayloadCMS dependencies
4. Restore database from backup
5. Remove Drizzle-specific code

---

## Post-Migration Tasks

1. **Performance Optimization**
   - Add database indexes
   - Implement caching strategy
   - Optimize API queries

2. **Security Audit**
   - Review all API routes for security
   - Test authentication flows
   - Verify RBAC implementation

3. **Documentation**
   - Update README.md
   - Document new API endpoints
   - Create developer guide

4. **Monitoring**
   - Setup error tracking
   - Monitor database performance
   - Log authentication events

---

## Notes

- Keep PayloadCMS database backup before migration
- Test thoroughly in development before production
- Consider running both systems in parallel during transition
- Document any custom PayloadCMS hooks or logic to port over
- Review all `src/access/` logic for RBAC migration

---

## Questions to Answer

1. **File Storage**: ✅ Using local filesystem storage (same as current PayloadCMS setup)
2. **Admin Panel**: Build custom admin or use existing dashboard?
3. **Rich Text**: Need rich text editor? (if yes, consider TipTap or Lexical standalone)
4. **Email**: Does app send emails? Need to setup email service?
5. **Database**: Keep same PostgreSQL database or start fresh?

---

_Last Updated: January 2, 2026_
_Status: Planning Phase_
