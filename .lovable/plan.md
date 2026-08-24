# Super admin plan control: upgrade an institute in one click

## What is actually broken today

The plan machinery exists in the database but the console never uses it:

- The platform console (`Institutes` tab) only shows usage and lets you link a branch. There is no way to change an institute's plan or its limits — the `platform_update_institute` function that does exactly that is not called anywhere in the app.
- Two different limit-enforcement triggers exist side by side and disagree. One reads limits from the plan catalog (`check_plan_limits`), the other reads limits stored on the institute row (`enforce_institute_limits`), and they count differently — one counts active students, the other counts approved students. So a "custom" limit given to one institute can still be blocked by the catalog limit of its plan.
- `plan_catalog` has no teacher/faculty-count limit, so faculty limits can never be set from a plan — only per institute.
- Changing the plan silently overwrites every limit with the catalog defaults (a plan-change trigger), which will wipe any custom numbers set in the same save.
- Institute owners are already correctly locked out of changing their own plan or limits (a guard trigger restricts that to Academix).

## What you get after this

In the platform console, each institute gets an **Open → Plan & limits** panel:

- Plan dropdown (Free / Growth / Campus / Chain). Picking a plan pre-fills the limits from the catalog.
- Editable numbers: students, classrooms, batches, teachers (faculty), office logins, teacher logins. 0 = unlimited. Any number can be pushed above the plan default for a one-off deal.
- Toggles: custom branding, attendance machines, account active/suspended.
- Live "used / limit" next to each number so you can see if the institute already crosses the new limit.
- Save writes through one super-admin-only function; a short note records what changed.

So when an institute calls asking to move from Free to Growth, you open them, pick Growth, optionally bump a number, save — the app enforces it immediately, and their in-app "Plan & usage" screen updates.

## Technical changes

**Database (one migration)**
1. Add `faculty_limit` to `plan_catalog` (default matching each plan) and include it in the catalog→institute sync trigger.
2. Drop the duplicate `check_plan_limits` triggers; keep `enforce_institute_limits` as the single source of truth, reading limits from the `institutes` row. Make its counting consistent (approved + active students).
3. Rewrite `platform_update_institute` to: verify `is_superadmin()`, accept an optional `_apply_catalog_defaults` flag, and set limits explicitly — with the plan-change trigger skipped when explicit limits are supplied (set limits after the plan in a second update, or add a guard flag) so custom numbers survive.
4. Add `plan_status` handling: allow super admin to set `status` (active / suspended) through the same function.
5. Add a `plan_change_log` table (institute, from plan, to plan, limits snapshot, note, changed_by) with super-admin-only read/write, so upgrades are auditable.

**Frontend**
- `src/routes/app.platform.tsx`: add a "Plan & limits" card inside `InstituteDetail`, wired to `platform_update_institute`, plus a quick "Change plan" action in the institutes table row.
- Add plan/limit fields to the `PlatformInstitute` type (`room_limit`, `custom_branding`, `attendance_devices`, `status` already partly returned — extend `platform_institutes` where a field is missing).
- `src/components/app/pricing-admin.tsx`: add the new faculty limit field so catalog defaults stay complete.
- Institute-side `Plan & usage` (settings) shows the current plan, limits, and a "Call Academix to upgrade" CTA — read-only, as it is today.

**Not in scope**: online payment/subscription billing. Upgrades stay sales-led (call → super admin flips the plan). Payment gateway automation can come later on top of the same function.
