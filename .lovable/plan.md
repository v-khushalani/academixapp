# VK Academy ERP — V1 Build Plan

## Approach

Build a polished, production-grade **UI shell** first using in-memory mock data (TypeScript fixtures + TanStack Query). All 14 modules will be navigable; **7 modules get fully interactive UI** (Dashboard, Students, Admissions, Batches, Attendance, Fees, Tests). The remaining 7 (Homework, Study Material, Timetable, Faculty, Reports, Notifications, Settings) get clean placeholder screens with correct layouts so backend wiring later is a drop-in.

Backend (your own Supabase project, connected manually later) is **not** wired in this pass. Data layer will be abstracted behind a `src/lib/api/*` module so swapping mock → Supabase is a single-file change per resource.

## Brand & Design System

- **Font**: Inter (via `@fontsource-variable/inter`)
- **Colors** (tokenized in `src/styles.css` as CSS vars, mapped through `@theme inline`):
  - primary `#013062`, primary-hover `#02418A`
  - background `#F8FAFC`, card `#FFFFFF`, border `#E5E7EB`
  - text `#111827`, muted `#6B7280`
  - success `#16A34A`, warning `#F59E0B`, danger `#DC2626`
- Subtle radii (8–10px), thin borders, generous whitespace, no gradients, no colorful chart palettes (monochrome primary + neutral grays for charts).
- Motion: framer-motion micro-transitions only (fade/slide 150–200ms). No page-level animation theatrics.
- Reference feel: Linear sidebar density, Stripe dashboard restraint, Notion typographic calm.

## Public Surface (unauthenticated)

- `/` — VK Academy landing: hero, product pillars (Speed / Simplicity / Clarity), module overview, CTA to login. Minimal, single-column, editorial.
- `/login` — email + password form (UI only; "Sign in" navigates to `/app`).
- `/signup`, `/forgot-password` — placeholders.

## App Shell (`/app/*`)

- Collapsible sidebar (shadcn `Sidebar`, `collapsible="icon"`), sticky top bar with global search, notifications bell, today's date, quick-add menu, profile avatar.
- Sidebar sections: Dashboard, Students, Admissions, Batches, Attendance, Fees, Tests, Homework, Study Material, Timetable, Faculty, Reports, Notifications, Settings. Bottom: Profile, Logout.
- Active-route highlight via TanStack Router `useRouterState`.
- Mobile: sidebar becomes off-canvas drawer; top bar collapses search into icon.

## Functional Modules (interactive with mock data)

1. **Dashboard** — 8 KPI cards (Total Students, Today's Attendance, Today's Revenue, Pending Fees, Today's Lectures, Active Batches, Upcoming Tests, Recent Admissions), 3 charts (Monthly Revenue line, Attendance Trend area, Admissions Trend bar) via Recharts in monochrome, Latest Activities feed, Upcoming Tasks list.
2. **Students** — table (search / filter by class-batch-status / sort / pagination / export CSV / bulk actions), student detail drawer with tabs: Overview, Attendance, Fees, Performance, Documents. Action buttons: Call, WhatsApp, Fee Reminder, Shift Batch, Promote, Deactivate.
3. **Admissions CRM** — kanban board with 6 columns (New Lead → Counselling → Demo → Follow-Up → Admission → Lost), drag-to-move, lead detail sheet with follow-up timeline and reminder scheduler.
4. **Batches** — grid of batch cards + list view toggle; batch detail: roster, timetable slot, attendance %, actions (Shift Students, Merge, Archive).
5. **Attendance** — batch → date picker → fast-marking grid (P / A / L keys, arrow-key nav, bulk Present), monthly calendar heatmap, late-arrivals list, stats.
6. **Fees** — outstanding dashboard, receipts table, collection report chart, payment dialog (Cash / UPI / Card / Bank), fee reminder action, fee-structure editor.
7. **Tests** — create test wizard (Chapter / Unit / Mock / Full-Syllabus), results table with ranks & percentile, per-test analytics (score distribution, weak-topic bar), student comparison view.

## Shell Modules (navigable placeholders)

Homework, Study Material, Timetable, Faculty, Reports, Notifications, Settings — each rendered as a proper page with header, empty-state illustration/text, and the eventual layout skeleton so future work slots in without redesign.

## Reusable Component Library (`src/components/app/`)

- `PageHeader`, `DataTable` (generic, with search/filter/sort/pagination/export/bulk-actions), `KpiCard`, `StatChart`, `EmptyState`, `SectionCard`, `FormDialog`, `ConfirmDialog`, `DetailDrawer`, `Kanban`, `FilterBar`, `SkeletonRow`.
- Built on shadcn primitives; no ad-hoc styling in feature pages.

## Route Architecture

```text
src/routes/
  __root.tsx                (brand meta, providers)
  index.tsx                 (landing)
  login.tsx, signup.tsx, forgot-password.tsx
  app.tsx                   (app shell layout with sidebar + topbar, <Outlet/>)
  app.index.tsx             (dashboard)
  app.students.tsx / .$id.tsx
  app.admissions.tsx
  app.batches.tsx / .$id.tsx
  app.attendance.tsx
  app.fees.tsx
  app.tests.tsx / .$id.tsx
  app.homework.tsx, app.study-material.tsx, app.timetable.tsx,
  app.faculty.tsx, app.reports.tsx, app.notifications.tsx, app.settings.tsx
```

No auth gate yet — `/app/*` is publicly reachable in V1. When Supabase is added later, `app.tsx` moves under `_authenticated/` and gains the managed gate.

## Data Layer

- `src/lib/mock/*` — deterministic fixtures (students, batches, leads, fees, tests, attendance).
- `src/lib/api/*` — one file per resource, exporting `list/get/create/update/remove` returning Promises. Backed by mock now, Supabase later.
- TanStack Query for caching; every list uses `queryOptions` + `useSuspenseQuery`.

## Technical Notes

- Fonts: `bun add @fontsource-variable/inter`; import in `src/styles.css` at the top `@import` block.
- Charts: `recharts` (already usable), styled monochrome via CSS vars.
- Kanban drag: `@dnd-kit/core` + `@dnd-kit/sortable`.
- CSV export: small in-house util (no dep).
- Icons: `lucide-react` (already present), single stroke weight throughout.
- Update `__root.tsx` head with real title/description ("VK Academy — Institute Operating System").
- All colors go through semantic tokens — zero hardcoded hex in components.
- Every table page: search + filter + sort + pagination + export + quick actions, per your UX rules.
- Skeleton loaders on every data-backed surface.

## Out of Scope (V1)

Supabase wiring, real auth, RLS, WhatsApp/SMS/Email sending, AI features, multi-tenant switching UI (architecture supports it; UI stays VK-only), online learning, JEEnie integration.

## Deliverable

A navigable, visually premium ERP that feels like Linear/Stripe, with 7 modules fully interactive on mock data and 7 as clean placeholders — ready for you to connect your Supabase project in a follow-up pass.
