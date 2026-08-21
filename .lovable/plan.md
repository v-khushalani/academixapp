# Branding, Super Admin console, portal privacy, receipts

## 1. Privacy bug: students see other students (fix first — highest priority)

Confirmed by inspecting the live database policies. Every tenant table carries two
leftover blanket rules from an early version:

- `Tenant isolation` (permissive, ALL): "anyone signed in whose active institute matches
  can read the row". This is why a logged-in student sees **all** students of the institute —
  and the same leak exists on `fees`, `attendance`, `homework`, `leads`,
  `notification_logs`, `parent_students`, `fee_adjustments` and more.
- `Tenant restrictive` (restrictive, ALL): the same match, but with **no super-admin
  exception** — this is why the Super Admin console shows Institutes correctly but
  **0 students / 0 fees** (Super Admin has no active institute, so every row is blocked).

Newer, correct policies already exist next to them (`students_tenant_isolation`,
`Students staff read`, `Students: own record read`, `Students: faculty batch read`, etc.).

Fix: one migration that drops the two legacy `Tenant isolation` / `Tenant restrictive`
policies on every table that has them, leaving the role-aware set in place. Then verify
per role (student, parent, teacher, admin, super admin) that each sees exactly its own scope.

## 2. Branding — institute + Academix everywhere

Institute logo/name/colour is already stored; extend it consistently to:

- App shell: sidebar header, topbar, browser tab title and favicon per institute.
- Login / invite / onboarding / welcome pages: institute logo on top when the link
  belongs to an institute, "Powered by Academix" line at the bottom.
- Student & parent portal: institute header, Academix footer mark.
- PDFs and shares: receipts, timetable share image, payment QR, exports — institute
  logo + name in header, small "Powered by Academix" in the footer.
- Public pages keep pure Academix branding.

## 3. Pricing comparison table — shorter, sharper

Replace the long grid with a compact "what you get" table: ~10 rows maximum, grouped as
Students & batches / Fees & money / Communication / Control, with a single
"See full feature list" expander for the rest. Row count and grouping stay editable
from the Super Admin pricing console, so nothing becomes hard-coded.

## 4. Super Admin console — rebuild around institutes, not fees

- Remove the fee/revenue columns and the platform-wide "Fees collected" stat. Money is
  the institute's business, not the platform's.
- Remove the "Support lookup" tab.
- Institutes tab: click an institute → detail drawer showing that institute's
  **faculty, batches and students** (counts + lists), plan, limits and usage.
  No fees anywhere.
- Keep Plans & pricing as is.
- Health signals worth adding (my suggestion): last activity date, students added in the
  last 30 days, invites pending, and a plan-limit usage bar so you can spot who to call.

### Future banner/ads in the student portal — what's needed

To do this properly later, the plan is to add a small `portal_banners` table
(institute or platform-wide scope, title, image, link, audience = student/parent,
start/end date, active flag) plus an impression/click counter. Super Admin manages
platform banners; institute admin can add its own notices. This item is documented now
and built when you say go — not part of this change.

## 5. Receipt templates with preview

- Add three templates: **Classic** (current A5), **Compact** (half-page, minimal) and
  **Detailed** (with fee-plan summary and payment history line).
- Settings → Receipts: template picker with a live preview rendered from sample data,
  so you see the layout before saving. Selection is stored on the institute
  (`receipt_template` column already exists) and used by every receipt download/share.

## Other suggestions (say yes/no)

- Attendance and fee reminders currently go out only when someone clicks; a scheduled
  daily digest would make them reliable.
- Parent portal notification bell for absences, fee dues and homework.
- Super Admin "impersonate institute (read-only)" for support — much faster than asking
  owners for screenshots.

## Technical notes

- Item 1 is a Supabase migration (policy drops only, no schema change), followed by
  role-by-role verification in the browser.
- Items 2–5 are frontend work in `src/components/app/*`, `src/routes/app.platform.tsx`,
  `src/routes/app.settings.tsx`, `src/routes/pricing.tsx` and `src/lib/receipt.ts`
  (split into per-template builders).
