# Feature flags, plan strategy, portal split and a connected-system pass

## 1. Super admin feature flags (the big one)

Today every institute already carries a `features` field in the database, but **nothing in the app reads it**. Plans only control numeric limits (students, rooms, batches, logins) plus two switches (custom branding, attendance machines). So there is no way to take a module away during a bargain.

What gets built:

- **A feature registry** — one list of sellable modules, each with a key, a label and a default per plan: Admissions CRM, Tests & marks, Syllabus tracking, Timetable, Expenses & salaries, Reports, WhatsApp messaging, Student/Parent portal, Attendance devices, Custom branding, Multi-branch, Bulk import, Receipts/print kit.
- **Per-institute flags** — in the platform console, inside an institute's "Plan & limits" card, a grid of on/off chips for every module. Picking a plan pre-fills the defaults; you can then switch any single module off (bargain) or on (one-off sweetener). Saved through the existing super-admin-only plan function, logged in the plan change log with the note field.
- **Global kill switches** — a small platform-wide flags table (key, enabled, note). If a module is globally off, it is off everywhere regardless of institute flags. Used for staged rollout of a new feature or emergency disable.
- **Enforcement in one place** — resolved flags = global switch AND institute switch. A single hook feeds: the sidebar (hidden entries), route guards (blocked routes show a clean "Not on your plan — talk to Academix" screen instead of 404), and dashboard cards. Server side, the sensitive write paths (admissions RPC, messaging, device punch endpoint) also check the flag so a hidden module can't be reached by URL or API.
- **Read-only view for institute owners** in Settings → Plan: what is on, what is off, and an upgrade CTA.

## 2. Student portal vs parent portal

Right now they are the same screens with a different label in the header — that is the concern you felt. The intended split:

| | Student | Parent |
|---|---|---|
| Home | today's classes, homework due, my attendance % | child summary card, alerts first (absent, fee due, low marks) |
| Attendance | own record | child record + absence explanation request |
| Fees | see dues only | see dues, pay/UPI QR, receipts download |
| Marks | own marks with rank band | marks with class average comparison and teacher remark |
| Timetable / homework | full | read-only |
| Child switcher | not shown | shown when multiple children |

Changes: child switcher only for parents; fee actions and receipts only for parents; a parent-only "Alerts" strip; a student-only "My homework / my progress" focus. Same routes, role-aware content, so no duplication.

## 3. Pricing strategy — cut the fat, penetrate aggressively

Four tiers (Free / Growth / Campus / Chain) is one too many: Growth and Campus differ only by numbers, and Chain is a sales call anyway. Recommendation:

- **Free forever — 50 students, everything core.** Dashboard, students, batches, attendance, fees, receipts, WhatsApp. No time limit, no card. This is the wedge: a small coaching class runs its whole day on it and imports data you later own.
- **Pro — one price, unlimited students at a centre.** Everything: admissions CRM, tests, syllabus, timetable, reports, expenses/salaries, portal, branding. No feature-based upselling inside a single centre — Indian coaching owners hate discovering a feature is locked mid-term. Price per centre per year, aggressive (undercut the market clearly), with a monthly option to lower the entry barrier.
- **Chain — per additional branch.** Multi-branch dashboard, cross-branch reports, attendance devices, priority support. Priced as Pro + per-branch add-on.

Why this wins: one obvious paid product, no comparison paralysis, and your discounting happens through the feature flags and limits you now control per institute — not through publishing more plans. The old plan keys stay valid (institutes on them keep working); the public pricing page shows three columns.

Migration: keep `plan_catalog` as the source of truth, mark Campus hidden, map its institutes to Pro-equivalent limits, no disruption.

## 4. Connected-system pass (does everything reflect everywhere?)

There is already a shared refresh list that reloads students, batches, rosters, fees, dashboard, timetable, attendance, tests, portal fees and rooms after a change. Gaps to close:

- Missing from that list: syllabus, leads/admissions, faculty, expenses, salaries, messages, plan usage. So e.g. approving an admission doesn't refresh the leads screen, and adding a teacher doesn't refresh plan usage.
- Realtime: no live sync between two open devices (office + teacher iPad). Add realtime on attendance, fees and students so the front desk sees a teacher's attendance instantly.
- Verify end-to-end chains with a scripted pass across roles: admission approved → student appears → fee installments generated → batch roster count → dashboard KPI → portal fees; attendance marked by teacher → admin alert → parent portal; batch fee changed → every student's pending recalculated; teacher removed → timetable and syllabus ownership handled.

## 5. Other things worth fixing (found while reviewing)

- Plan usage counts every classroom/batch row without filtering by institute in one place — worth re-checking against branch setups.
- Limits are advisory only ("nothing stops working"). With paid plans live, at least the hard ones (students, logins) should block with an upgrade prompt instead of silently exceeding.
- No impersonation ("view as this institute") for support — the fastest way for you to debug an owner's complaint.
- No audit trail visible in-app for fee edits/cancellations, though the data exists.
- Pending/failed WhatsApp messages have no retry queue view.
- Mobile: the admin console is usable but a few tables still overflow on phones.

## Build order

1. Feature registry + per-institute flags + global switches + enforcement (sidebar, routes, server checks).
2. Pricing restructure to Free / Pro / Chain, public page and catalog update.
3. Portal split (parent vs student).
4. Interconnection: extend the shared refresh list, add realtime on attendance/fees/students, then a full role-by-role verification pass.
5. Smaller items from section 5, prioritised after the above.

## Technical notes

- New: `platform_feature_flags` table (global), feature keys stored in `institutes.features` jsonb, a `useFeatures()` hook resolving global AND institute, `src/lib/features.ts` registry.
- Extend `platform_set_plan` to accept a features payload; keep super-admin-only guard and plan change log.
- Route guards live in the existing app layout; server-side checks added to the admissions RPC, messaging paths and the public punch endpoint.
- Extend `LINKED_KEYS` in `src/lib/api/index.ts`; realtime subscriptions inside `useEffect` with channel cleanup.
