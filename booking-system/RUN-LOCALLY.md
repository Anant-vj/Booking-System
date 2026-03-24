# Run Locally Guide

This guide explains how to run the College Hall Booking System on your machine.

## 1) Prerequisites

- Node.js 20+ and npm
- PostgreSQL running locally (or a remote PostgreSQL URL)

Check versions:

```bash
node -v
npm -v
```

## 2) Install Dependencies

From the `booking-system` folder:

```bash
npm install
```

## 3) Configure Environment Variables

Create `.env` from `.env.example`.

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS/Linux

```bash
cp .env.example .env
```

Now open `.env` and set at least:

- `DATABASE_URL`
- `NEXTAUTH_URL` (use `http://localhost:3000` for local)
- `NEXTAUTH_SECRET` (any long random value)

Optional:

- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- SMTP vars if you want email notifications
- `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`, `LOGIN_BLOCK_MINUTES` for auth throttling

## 4) Run Database Migration

```bash
npm run db:migrate
```

## 5) Seed Initial Data

```bash
npm run db:seed
```

This creates:

- 6 halls
- 1 admin user
- 1 demo faculty user

## 6) Start the App

```bash
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

## 7) Default Login Credentials

- Admin
  - Email: `admin@college.edu`
  - Password: `Admin@123`
- Faculty
  - Email: `faculty@college.edu`
  - Password: `Faculty@123`

## 8) Helpful Commands

- Lint:

```bash
npm run lint
```

- Production build test:

```bash
npm run build
```

## 9) Common Issues

- **Prisma connection error**: verify `DATABASE_URL` and PostgreSQL is running.
- **Login fails**: run `npm run db:seed` again and ensure credentials match.
- **Session/auth issues**: make sure `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are set.
