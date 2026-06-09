# Team Track

Team Track is an employee management system built with Next.js, NextAuth, Drizzle ORM, and PostgreSQL.

## Features

- User and employee profile management
- Department and role assignment
- Public applicant intake form with CV upload
- Inventory assignment and status tracking
- Leave request tracking
- Payroll settings and generated payroll records
- Role-based access control for admins, managers, and employees
- Responsive dashboard UI built with Tailwind CSS and shadcn/Radix-style components

## Tech Stack

- Framework: Next.js 15 with App Router
- UI: React 19, Tailwind CSS 4, Radix UI primitives, shadcn-style components
- Authentication: NextAuth v5 credentials provider
- Authorization: simple RBAC with `admin`, `manager`, and `employee` roles
- Database: PostgreSQL
- ORM and migrations: Drizzle ORM and Drizzle Kit
- Forms and validation: React Hook Form and Zod where used
- Testing: Vitest for integration tests and Playwright for browser tests
- Deployment: Docker Compose, nginx, PostgreSQL, and GHCR images

## Project Structure

- `src/app`: App Router pages, layouts, route groups, and API routes
- `src/app/(dashboard)`: admin and manager dashboard routes
- `src/app/(employee)`: employee portal routes
- `src/app/(public)`: public routes such as `/apply`
- `src/app/api`: API route handlers
- `src/auth.ts`: NextAuth configuration
- `middleware.ts`: route protection and role-based redirects
- `src/db`: Drizzle database client and schema exports
- `src/db/schema`: domain schema files for users, roles, departments, applicants, inventory, leaves, media, and payroll
- `src/lib/actions`: server actions for authenticated mutations and dashboard data
- `src/lib/auth.ts`: session helper functions
- `src/lib/auth-guards.ts`: page/API auth guards and response helpers
- `src/lib/rbac.ts`: role helper functions
- `src/components`: reusable UI primitives and domain components
- `drizzle`: generated Drizzle migrations and metadata
- `tests`: Vitest integration tests and Playwright E2E tests

For a fuller architecture walkthrough, see `PROJECT_LAYERS.md`.

## Local Development

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the example environment file and set your secrets:

   ```bash
   cp .env.example .env
   ```

3. Make sure `.env` contains a PostgreSQL connection string:

   ```bash
   DATABASE_URL=postgresql://team_track_user:team_track_pass@127.0.0.1:5432/team_track_db
   NEXTAUTH_SECRET=your-secret-key-here-min-32-chars
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Start PostgreSQL. You can use the included Compose file:

   ```bash
   docker compose up -d db
   ```

5. Apply the database schema:

   ```bash
   pnpm db:push
   ```

6. Seed local data if needed:

   ```bash
   pnpm seed
   ```

7. Start the app:

   ```bash
   pnpm dev
   ```

8. Open `http://localhost:3000`.

## Database Commands

- `pnpm db:push`: push the current Drizzle schema to the database
- `pnpm db:migrate`: run generated Drizzle migrations
- `pnpm db:studio`: open Drizzle Studio
- `pnpm seed`: seed application data

Use `db:push` for local iteration. Use generated migrations and `db:migrate` for deployment environments.

## Authentication And Roles

Authentication uses NextAuth credentials login. Users can sign in with email or username. Passwords are verified with `bcryptjs`.

The role model is intentionally simple:

- `admin`: full dashboard access
- `manager`: full dashboard access
- `employee`: employee portal/profile access

`middleware.ts` performs request-level protection and redirects users to the correct area based on their role.

## Public Application Flow

Applicants use `/apply` to submit personal details and a CV. The API route at `POST /api/apply` validates the request, stores the CV in `public/media`, stores media metadata in PostgreSQL, and creates an applicant record.

Authenticated uploads use `POST /api/upload` and `DELETE /api/upload`.

## Docker

Local development is normally run without Docker:

```bash
pnpm dev
```

The single `docker-compose.yml` file is for remote deployment environments such as the dev server and production server. The environment-specific values live in each server's `.env` file.

Run Drizzle migrations in a deployed environment:

```bash
docker compose run --rm migrate
```

Start or update the deployed stack:

```bash
docker compose up -d --remove-orphans
```

## Deployment

The repository includes:

- `Dockerfile` for the production app image
- `docker-compose.yml` for both remote dev and production deployment
- `nginx.conf` as a Docker nginx template driven by environment variables
- `.github/workflows/CI-CD.yml_backup` as a saved CI/CD workflow template

The intended deployment flow is:

1. Build the Next.js app image.
2. Push the image to GitHub Container Registry.
3. Copy Compose and nginx files to the server.
4. Create the server `.env`.
5. Start PostgreSQL.
6. Run Drizzle migrations with the `migrate` service.
7. Start the app and nginx.

Required production environment values include:

- `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `IMAGE_TAG`
- `GITHUB_OWNER`
- `APP_NAME`
- `COMPOSE_PROJECT_NAME`
- `NGINX_SERVER_NAME`
- `NGINX_CERT_NAME`
- upload settings such as `MAX_FILE_SIZE` and `ALLOWED_FILE_TYPES`

The CI/CD workflow writes these deployment-specific values automatically. For reference, the remote dev server uses:

```env
COMPOSE_PROJECT_NAME=teamtrack_dev
NGINX_SERVER_NAME=dev-team.elaramedical.com
NGINX_CERT_NAME=dev-team.elaramedical.com
```

Production uses:

```env
COMPOSE_PROJECT_NAME=teamtrack_prod
NGINX_SERVER_NAME=team.elaramedical.com www.team.elaramedical.com
NGINX_CERT_NAME=team.elaramedical.com
```

Use different `COMPOSE_PROJECT_NAME` values for dev and production if they ever run on the same Docker host. Uploaded media is mounted as a persistent Docker volume at `/app/public/media`.

## Testing

Run integration tests:

```bash
pnpm test:int
```

Run Playwright tests:

```bash
pnpm test:e2e
```

Run the full test suite:

```bash
pnpm test
```

The Playwright config starts `pnpm dev` automatically and reuses an existing server on `http://localhost:3000` when available.
