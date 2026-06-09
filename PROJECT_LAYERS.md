# Project Layers

This document explains the current layers of the Team Track project as implemented in the codebase. It is meant as a re-entry guide when returning to the project after time away.

## 1. Product Layer

Team Track is an employee management system. The implemented product areas are:

- User and employee profile management
- Department and role assignment
- Applicant intake through a public application form
- Inventory assignment and status tracking
- Leave request tracking
- Payroll settings and monthly payroll records
- Admin/manager dashboard views
- Employee self-service profile view

The application has three main audiences:

- Public applicants using `/apply`
- Employees using `/profile`
- Admins and managers using the dashboard routes such as `/`, `/users`, `/leaves`, `/inventory`, `/payroll`, `/applicants`, `/calendar`, and `/departments`

## 2. Runtime And Framework Layer

The app is a Next.js App Router application.

Important files:

- `package.json` defines the runtime, scripts, and dependencies.
- `next.config.mjs` configures Next.js.
- `src/app/**` contains pages, layouts, route groups, and API routes.
- `middleware.ts` protects routes before requests reach pages.

The current stack in code is:

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/Radix-style UI components
- NextAuth v5 credentials authentication
- Drizzle ORM
- PostgreSQL

The app code is centered around NextAuth and Drizzle.

## 3. Route Layer

Routes are organized with App Router route groups:

- `src/app/(dashboard)` contains the admin/manager dashboard area.
- `src/app/(employee)` contains the employee portal.
- `src/app/(public)` contains public pages such as the application form.
- `src/app/login` contains login UI.
- `src/app/api` contains API route handlers.

Route groups keep URL paths clean while allowing different layouts. For example:

- `src/app/(dashboard)/users/page.tsx` renders `/users`
- `src/app/(employee)/profile/page.tsx` renders `/profile`
- `src/app/(public)/apply/page.tsx` renders `/apply`

The dashboard layout in `src/app/(dashboard)/layout.tsx` wraps pages with the sidebar, header, session provider, and dashboard access checks.

The public and employee layouts are lighter and mostly provide metadata, global styles, and page shell structure.

## 4. Access Control Layer

Access control is split across middleware, layouts, and helper functions.

`middleware.ts` handles request-level routing rules:

- Allows public routes such as `/login` and `/apply`
- Allows static/media assets to bypass auth checks
- Redirects unauthenticated users to `/login`
- Redirects employees away from dashboard routes to `/profile`
- Redirects admins/managers away from employee-only routes back to `/`

`src/auth.ts` configures NextAuth:

- Uses credentials login
- Allows login by email or username
- Validates passwords with `bcryptjs`
- Stores the session as a JWT
- Adds role and department data to the JWT/session

`src/lib/auth.ts` provides small session helpers:

- `getServerSession`
- `getCurrentUser`
- `isAuthenticated`
- `requireAuth`

`src/lib/auth-guards.ts` provides stricter guards for pages and API routes:

- `requireAuth`
- `requireAuthAPI`
- `requireFullAccess`
- `requireFullAccessAPI`
- `requireAdmin`
- `requireManager`
- standard JSON response helpers

`src/lib/rbac.ts` defines the simple role model:

- `admin`
- `manager`
- `employee`

Admins and managers are considered full-access users. Employees are limited to their employee portal/profile flow.

## 5. Data Access Layer

Database access goes through Drizzle.

Important files:

- `src/db/index.ts` creates the PostgreSQL client and Drizzle database instance.
- `src/db/schema.ts` re-exports schema modules.
- `src/db/schema/*.ts` defines tables, enums, and relations.
- `drizzle.config.ts` points Drizzle Kit at the schema and database URL.
- `drizzle/` contains generated migrations and migration metadata.

The database connection uses:

```ts
const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle(client, { schema })
```

The project expects `DATABASE_URL` in the environment.

## 6. Database Schema Layer

Schema files are split by domain:

- `src/db/schema/users.ts`: users, personal data, employment data, role relation, departments relation, auth relations
- `src/db/schema/auth.ts`: NextAuth accounts, sessions, verification tokens
- `src/db/schema/roles.ts`: role records for `admin`, `manager`, and `employee`
- `src/db/schema/departments.ts`: departments and user-department join records
- `src/db/schema/applicants.ts`: public applicant records and application status
- `src/db/schema/inventory.ts`: company assets, holder assignment, status, images, notes
- `src/db/schema/leaves.ts`: leave requests, dates, status, reason, notes
- `src/db/schema/media.ts`: uploaded file metadata
- `src/db/schema/payroll-settings.ts`: recurring payroll templates
- `src/db/schema/payroll.ts`: generated monthly payroll records

Most IDs are text columns generated with `crypto.randomUUID()`. Dates are commonly stored as text ISO strings rather than native timestamp/date columns.

## 7. Business Logic Layer

Business logic is mostly in server actions and route handlers.

Server actions live in `src/lib/actions`:

- `auth.ts`: login and logout actions
- `dashboard.ts`: dashboard counts and summary data
- `inventory.ts`: inline inventory updates
- `leaves.ts`: inline leave updates
- `user.ts`: user status updates

These actions usually:

1. Check authentication with an auth guard.
2. Read or mutate Drizzle tables.
3. Revalidate affected pages with `revalidatePath` when needed.

Some business logic is embedded directly in page server components. For example, list pages often query Drizzle directly and pass results into client components.

## 8. API Layer

API routes live under `src/app/api`.

Current routes include:

- `src/app/api/auth/[...nextauth]/route.ts`: exposes NextAuth handlers
- `src/app/api/apply/route.ts`: public applicant form submission with CV upload
- `src/app/api/upload/route.ts`: authenticated upload and delete endpoint for media
- `src/app/api/departments/route.ts`: list and create departments
- `src/app/api/departments/[id]/route.ts`: department-specific operations

The API layer is used when the browser needs a fetch endpoint, especially for public forms and uploads. Server actions are used for many authenticated app mutations.

## 9. UI Component Layer

UI is split into domain components and reusable primitives.

Reusable primitives live in `src/components/ui`, including buttons, forms, dialogs, tables, cards, inputs, sidebars, popovers, badges, and similar base components.

Domain components live in folders such as:

- `src/components/user`
- `src/components/employee`
- `src/components/applicants`
- `src/components/inventory`
- `src/components/leaves`
- `src/components/payroll`
- `src/components/admin`
- `src/components/dashboard`
- `src/components/calendar`

The common pattern is:

1. A server page fetches data from Drizzle.
2. The page passes data to a client component.
3. The client component handles filtering, table interactions, forms, and UI state.
4. Mutations call either server actions or API routes.

## 10. Styling Layer

Global styles are in:

- `src/app/(dashboard)/globals.css`

The public and employee layouts import this same global stylesheet.

Component styling is mostly Tailwind utility classes. The project also uses Radix primitives and shadcn-style components configured by:

- `components.json`
- `src/components/ui/**`

## 11. File And Media Layer

Uploaded files are stored under:

- `public/media`

Metadata for uploaded files is stored in the `media` table.

There are two main upload flows:

- Public applicant CV upload through `POST /api/apply`
- Authenticated media upload/delete through `POST` and `DELETE /api/upload`

The upload route validates file type and size. For image uploads, it attempts to read dimensions with `sharp`.

In production Docker Compose, media is mounted as a named volume at `/app/public/media`.

## 12. Seed And Migration Layer

Relevant files:

- `scripts/seed.ts`
- `src/seed/index.ts`
- `drizzle.config.ts`
- `drizzle/0000_eager_krista_starr.sql`
- `drizzle/meta/**`

Common commands:

- `pnpm db:push`: push schema changes with Drizzle Kit
- `pnpm db:migrate`: run generated Drizzle migrations
- `pnpm db:studio`: open Drizzle Studio
- `pnpm seed`: run the seed script

Before changing schema, inspect the existing migration state and decide whether to generate a new migration or use `db:push` for local development only.

## 13. Testing Layer

The test suite has current smoke coverage for public application behavior.

Files:

- `vitest.config.mts`
- `vitest.setup.ts`
- `playwright.config.ts`
- `tests/int/api.int.spec.ts`
- `tests/e2e/frontend.e2e.spec.ts`

The package scripts are:

- `pnpm test:int`
- `pnpm test:e2e`
- `pnpm test`

`tests/int/api.int.spec.ts` exercises `POST /api/apply` validation branches without requiring a live database connection. `tests/e2e/frontend.e2e.spec.ts` checks the current login and public application pages through Playwright.

## 14. Deployment Layer

Deployment assets include:

- `Dockerfile`
- `docker-compose.yml`
- `nginx.conf`
- `.github/workflows/CI-CD.yml_backup`

Local development normally runs with `pnpm dev`, not Docker. The single Compose file is for both remote dev and production deployments. It runs:

- PostgreSQL
- Next.js app container
- migration container
- nginx reverse proxy
- persistent media volume

The deployment environment is selected by `.env` values such as `IMAGE_TAG`, `COMPOSE_PROJECT_NAME`, `NGINX_SERVER_NAME`, and `NGINX_CERT_NAME`. The `migrate` service runs `pnpm db:migrate`, which maps to `drizzle-kit migrate`.

## 15. Typical Request Flow

Authenticated dashboard page flow:

1. Browser requests a dashboard URL such as `/users`.
2. `middleware.ts` checks the session and role.
3. The dashboard layout calls `requireAuth` and checks full-access role rules.
4. The page server component queries Drizzle.
5. The page renders domain client components.
6. Client interactions call server actions or API routes.
7. Mutations update PostgreSQL through Drizzle.
8. `revalidatePath` refreshes affected pages when needed.

Public application flow:

1. Visitor opens `/apply`.
2. `ApplyForm` collects applicant data and CV file.
3. The form posts `FormData` to `/api/apply`.
4. The route validates required fields, email, consent, file type, and file size.
5. The CV is written to `public/media`.
6. Media metadata is inserted into the `media` table.
7. Applicant data is inserted into the `applicants` table.
8. The user is redirected to `/apply/success`.

Login flow:

1. User submits credentials through the login form/action.
2. NextAuth checks email or username in `usersTable`.
3. Password is verified with `bcryptjs`.
4. Role and department relations are added to the JWT/session.
5. Middleware/layouts route users based on role.

## 16. Known Drift And Cleanup Targets

The most important cleanup targets before major new work are:

- Audit imports for duplicate auth helper usage between `src/lib/auth.ts` and `src/lib/auth-guards.ts`.
- Decide whether date fields should remain ISO text strings or move to native PostgreSQL date/timestamp columns.
- Confirm the intended production strategy for uploaded files, especially backups and shared storage.
