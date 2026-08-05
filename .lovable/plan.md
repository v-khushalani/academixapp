# Hide plan prices, fresh database, test accounts

## 1. Hide Academix plan prices everywhere

Student fee amounts, receipts and collections stay untouched — only Academix's own subscription pricing is hidden, so plans get discussed in person or over a call.

- **/pricing page**: keeps its layout and the tick/cross comparison table. Each plan card shows the name, tagline and limits (students · classrooms) with "Talk to us" in place of the ₹ amount, and the button becomes a contact CTA. FAQ line about pricing rewritten to "we'll walk you through plans on a call".
- **Landing + features pages**: any ₹ / "start from" copy replaced with "Talk to us for pricing".
- **Institute Settings → plan section**: shows the plan name and limits only; the plan dropdown no longer prints yearly prices.
- **Super-admin Platform console → Pricing control**: the ₹/year column stays (internal-only, needed for sales), but is labelled "internal — not shown publicly". Everything else (limits, tick/cross rows, visibility) unchanged.

The `price_yearly` values remain in the database so nothing is lost when prices go public later.

## 2. Fresh database

Verified: the tenant tables are already empty (0 institutes, students, batches, fees, faculty, rooms, tests, attendance, leads, syllabus, timetable) and only the super-admin account exists. Remaining work is code-side leftovers:

- Remove hard-coded sample/demo rows and placeholder arrays still living in the admissions, enquiry and tests screens so empty states show real "no data yet" messaging.
- Confirm every list screen renders a proper empty state instead of a blank table.

## 3. Test accounts (Free plan)

One test institute on the Free plan plus five accounts, all `@academix.website` with a shared password shared with you after creation:

| Account | Role |
| --- | --- |
| `super@academix.website` | Academix owner (superadmin, platform console) |
| `owner@academix.website` | Institute owner / admin |
| `faculty@academix.website` | Faculty (teacher portal) |
| `student@academix.website` | Student (family portal) |
| `parent@academix.website` | Parent (family portal) |

The institute gets a minimal working spine so the portals aren't empty: one course, one batch with a fee, one classroom, one timetable slot, the faculty linked to the batch, and the student enrolled with the parent linked. Existing super-admin account `vk0001@gmail.com` is kept.

## 4. Log in as each account and fix what's broken

Walk each role end to end in the browser and fix any breakage found:

- Super admin: platform console, pricing control edits.
- Owner/admin: dashboard, students, admissions, batches, attendance, fees + collect payment, tests, syllabus, timetable, reports, settings.
- Faculty: attendance marking, marks entry, syllabus progress.
- Student/parent: dashboard, attendance, fees, homework, progress, timetable.
- Public: landing → features → pricing → sign in → signup flow, on mobile, tablet and desktop widths.

Anything that errors, shows blank, or breaks on small screens gets fixed in the same pass, with a short report of what was found.

## Technical notes

- Accounts created through the Supabase Auth admin API with email confirmation on, then roles inserted into `user_roles` and the matching `faculty` / `students` / `parent_students` rows for the test institute.
- Price hiding is presentation-only: `pricing.tsx`, `app.settings.tsx`, landing/features copy. `plan_catalog.price_yearly` and `src/lib/plans.ts` values stay intact.
- Role checks continue to go through `has_role` / `user_roles`; no auth or RLS changes.
