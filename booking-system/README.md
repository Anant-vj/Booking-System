# College Hall Booking System

Production-ready hall booking system where faculty submit hall requests and admins approve/reject with strict conflict checks.

## Project Overview

- **Framework**: Next.js (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: NextAuth (credentials)
- **Styling**: Tailwind CSS
- **Roles**: `ADMIN`, `FACULTY`

## Core Workflow

1. Faculty submits booking request (`PENDING`)
2. Conflict against approved bookings is detected but does not block request creation
3. Admin reviews pending requests with conflict indicators
4. Admin approves or rejects request
5. Only `APPROVED` bookings block slots

## Conflict Logic

Booking overlap condition implemented in backend Prisma queries:

`(startA < endB) AND (endA > startB)`

## API Endpoints

- `POST /api/bookings` - create request
- `GET /api/bookings` - get own bookings
- `PATCH /api/bookings/:id` - cancel booking
- `GET /api/admin/bookings` - admin gets all bookings (`?status=PENDING` etc.)
- `PATCH /api/admin/bookings/:id` - approve/reject booking
- `GET /api/halls` - list halls
- `POST /api/halls` - create hall (admin)
- `PATCH /api/halls/:id` - update hall (admin)
- `DELETE /api/halls/:id` - delete hall (admin)
- `GET /api/halls/availability` - approved bookings per hall (calendar feed)
- `GET /api/admin/security/login-throttle` - blocked login keys (admin)
- `DELETE /api/admin/security/login-throttle/:key` - unblock login key (admin)
- `GET /api/admin/security/login-throttle/audit` - unblock audit history (admin)

## Setup (Local)

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` and set:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DEFAULT_ADMIN_EMAIL` (optional for seed)
- `DEFAULT_ADMIN_PASSWORD` (optional for seed)
- `SMTP_HOST` (optional, for email notifications)
- `SMTP_PORT` (optional, default `587`)
- `SMTP_USER` (optional)
- `SMTP_PASS` (optional)
- `SMTP_FROM` (optional sender address)
- `LOGIN_MAX_ATTEMPTS` (optional, default `5`)
- `LOGIN_WINDOW_MINUTES` (optional, default `10`)
- `LOGIN_BLOCK_MINUTES` (optional, default `15`)

If SMTP vars are not provided, email notifications are skipped safely.
Credentials login rate limiting is enabled by default and can be tuned with `LOGIN_*` variables.

## Bonus Features Included

- Conflict highlighting in admin booking list
- Search in admin booking table (faculty/hall/purpose)
- Hall edit UI (in addition to create/delete)
- Calendar-based hall availability view (FullCalendar)
- Optional email notifications on booking approve/reject/cancel

## Prisma Notes

- Schema: `prisma/schema.prisma`
- Migration included in `prisma/migrations`
- Booking uses status lifecycle; bookings are not physically deleted by workflow
- Index for conflict efficiency: `@@index([hallId, startTime, endTime])`

## Default Seed Credentials

- Admin
  - Email: `admin@college.edu`
  - Password: `Admin@123`
- Demo Faculty
  - Email: `faculty@college.edu`
  - Password: `Faculty@123`

Change these credentials in production.

## Deploy to Vercel

1. Push repository to GitHub
2. Import project into Vercel
3. Add environment variables:
   - `DATABASE_URL` (hosted PostgreSQL, e.g. Neon/Supabase)
   - `NEXTAUTH_URL` (`https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`
4. Deploy
5. Run production migration/seed:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Scripts

- `npm run dev` - start development server
- `npm run build` - build for production
- `npm run start` - run production build
- `npm run lint` - run eslint
- `npm run db:generate` - generate Prisma client
- `npm run db:migrate` - run dev migration
- `npm run db:seed` - seed initial data (6 halls + admin user)
