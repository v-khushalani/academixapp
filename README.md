# Academix

Multi-tenant ERP for coaching institutes, school-tuition centres and local academies. One platform, many institutes, strict data isolation.

## Features

- **Dashboard** — students, attendance, collections, pending fees, today's lectures at a glance.
- **Admissions** — QR enquiry form, multi-step admission, admin approval, invite links.
- **Students & Batches** — multi-batch enrolment, class-matched batches, filters, bulk import.
- **Attendance** — per-batch marking, pending-batch tracking, consolidated parent WhatsApp alerts, RFID/biometric punch endpoint.
- **Fees** — batch-wise fee structures, automated installments, scholarships, partial-payment carry-forward, reversals with audit trail, A5 receipts, UPI QR sharing, batch-wise ledger.
- **Timetable** — room × time grid, drag-and-drop allocation, conflict checks, date-specific changes, publish workflow.
- **Syllabus & Tests** — section-wise chapters, subject-scoped teacher access, batch tests, marks.
- **Study Material Engine** (paid add-on) — AI-drafted notes, question banks and formula sheets with proper math rendering and institute-branded print layouts.
- **Portals** — separate experiences for admins, teachers, and students/parents.
- **Super Admin** — institutes, users, plans, pricing and feature flags.
- **PWA** — installable on Android and iOS.

## Tech Stack

- TanStack Start v1 (React 19, server functions, SSR)
- Vite 7
- Tailwind CSS v4
- Supabase — PostgreSQL, Row Level Security, Auth, Storage
- Google Gemini API — Study Material Engine
- KaTeX — math rendering

## Getting Started

```bash
bun install
bun run dev
```

App runs at `http://localhost:8080`.

## Environment Variables

Client:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Server secrets:

```
EXTERNAL_SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

Never commit secrets.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bunx playwright test` | End-to-end tests |

## Project Structure

```
src/
  routes/        File-based routes (app, portal, teach, marketing, api)
  components/    UI and feature components
  lib/           Business logic, server functions, helpers
  hooks/         React hooks
  integrations/  Supabase clients and types
tests/e2e/       Playwright tests
```

## Security

- Every tenant table is scoped by `institute_id` and enforced with RLS.
- Privileged operations run through hardened `SECURITY DEFINER` functions.
- Paid add-ons are off by default and re-checked in the database.

## Deployment

Builds to a Cloudflare Worker-compatible bundle. Set the server secrets in the hosting environment before deploying.

## License

Proprietary. All rights reserved.
