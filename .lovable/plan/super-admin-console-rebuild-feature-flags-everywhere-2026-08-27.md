# Super admin console rebuild + feature flags everywhere

Two problems today:

1. Feature switches live inside one tab of the single platform page, and they are only honoured in the admin console. Turning off Syllabus tracking still leaves Syllabus visible in the teacher portal, and the family portal ignores flags entirely.
2. The platform console is one page with three tabs, and per-institute plan/feature editing is buried behind opening a row.

## 1. Feature flags that actually reach every portal

Single source of truth stays `src/lib/features.ts` + `useFeatures()`.

- Fix the gap: `useFeatures()` is currently only consumed by the admin sidebar and route gate. Wire it into:
  - **Teacher portal** (`/teach`): hide Syllabus and Marks nav items when `syllabus` / `tests` are off, and show a "not on your plan" screen if the route is opened directly.
  - **Family portal** (`/portal`): hide Homework, Progress, Fees, Timetable items when the matching feature is off; whole portal is gated by the `portal` feature (family logins bounce to a friendly message when off).
  - Keep the existing admin-console gate as is.
- Extract one shared helper so all three shells filter their nav through the same function — no per-shell copies of the rules.

### Wider flag coverage

Extend the feature list so you can inspect and toggle every sellable surface, grouped by area:

- Academics: admissions, tests, syllabus, timetable, homework
- Money: fees, expenses, salaries, receipts, reports
- People: teacher portal, student portal, parent portal (split from today's single `portal`), invites
- Extras: WhatsApp messaging, attendance machines, bulk import, branding, multi-branch

Truly non-removable core (Dashboard, Students, Batches, Attendance, Settings) stays uncontrolled and is shown in the console as a locked "always on" row so you can see the full picture in one place.

Resolution order stays: network switch off wins → institute map → missing key means on.

## 2. Where the switches live

- **Super admin**: feature control moves out of the plan card into its own top-level tab, "Features". It has two panes:
  - *Network-wide* — the kill switches (staged rollout / emergency stop).
  - *Per institute* — pick an institute, see every feature grouped by area with on/off and which plan default it came from, plus a "reset to plan defaults" action.
- **Institute admin**: a read-only "Your modules" section inside Settings → Institute, listing what is on/off with "Talk to us" for anything off. Institutes never switch their own paid modules on.

## 3. Platform console redesign

Replace the single page with a proper console shell (left sub-nav inside `/app/platform`, separate routes):

- **Overview** — network totals, plan mix, recent signups, institutes near their limits, recent plan changes.
- **Institutes** — searchable table, row opens a detail page with tabs: Summary (usage vs limits), Plan & limits, Features, People (teachers/batches/students), History.
- **Plans & pricing** — existing pricing admin, unchanged.
- **Features** — as described above.

Each becomes its own file so the pages stay small; the current 600-line `app.platform.tsx` is split accordingly.

## Technical notes

- `src/lib/features.ts`: extend `FeatureKey`, add a `group` field and an `ALWAYS_ON` list; extend `MODULE_FEATURE`; add `NAV_FEATURE` maps for teach/portal shells.
- `src/hooks/use-features.ts`: unchanged resolution logic; feature map already comes from `institutes.features` + `platform_feature_flags`.
- New route files under `src/routes/app.platform.*` with shared components in `src/components/app/platform/`.
- No schema change needed — new keys are just JSON keys in the existing `features` maps, and missing keys default to on so existing institutes are unaffected. Plan defaults in `plan_catalog.features` get a data update so the new keys match each plan.
- Gate the teacher and family shells at the layout level so a direct URL cannot bypass the flag; server data access is still governed by RLS.
