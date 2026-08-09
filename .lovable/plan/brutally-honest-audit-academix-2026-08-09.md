# Brutally honest audit — Academix

No sugar-coating. Everything below was checked against the live database and the actual code this turn. Types compile clean and the app works. But there is shipped-looking work that does nothing, four database tables nobody reads, and a demo tenant still sitting in production.

## 1. Things that look built but are not

**The branch switcher is decoration.** `useBranches` is imported by exactly three files: the switcher itself, the sidebar and the plan-usage card. Zero data pages — Students, Fees, Attendance, Batches, Timetable, Reports — use its filter. A head-office admin picks "Branch 2" and the tables do not change. Right now it is a lie in the UI.
Pick one: wire the filter into every list page and the dashboard, or hide the switcher until branches are real.

**Plan usage counts the wrong thing for multi-branch.** `fetchUsage()` counts students/rooms/batches with no institute filter, so a parent-institute admin sees parent + all branches counted against the parent's limit. Single-institute accounts are fine; branch accounts show wrong numbers.

**Four tables with zero code references:** `automation_rules`, `notification_logs`, `student_activities`, `student_documents`. All empty, none read by the app. Schema debt that widens the access-control surface for no benefit. Drop them, or actually build the activity timeline / document vault they were meant for.

## 2. Production hygiene that is genuinely missing

- **Demo tenant is still live.** 2 institutes, 14 students, 18 fee rows, 11 batches, 4 faculty, 4 rooms, 13 role rows. Wipe it before the first paying customer, or you will be explaining someone else's data to them.
- **One orphan account.** 1 role row has no institute assigned. After the isolation fix that user now sees a completely empty app with no explanation. Assign or delete it, and add a "your account is not linked to an institute yet — call us" screen so this fails loudly instead of silently.
- **No legal pages.** No privacy policy, no terms, no refund/cancellation. Institutes will ask, and any payment processor will require them.
- **No error monitoring.** `error-capture.ts` only recovers a stack for the 500 page. When a customer says "it broke at 3pm", you have nothing.
- **Leaked-password protection is off** (Supabase auth check). One toggle.
- **36 elevated-privilege function warnings** from the database linter. Most are intentional (public admission/invite calls), but the list has never been triaged one by one; each should be justified or locked down.

## 3. Quality and polish

- **Zero per-page metadata.** All 45 routes inherit one title from the root. Pricing, apply, for-institutes and every login page share the same title and description. Bad for search, and bad for WhatsApp link previews — which matters because WhatsApp links are your entire distribution.
- **2,322 lint errors**, all formatting, all auto-fixable. Zero type errors. One format pass and the codebase stops fighting you on every change.
- **Four files are too big to maintain:** settings 845 lines, timetable 758, admissions 662, reports 612. Not urgent, but this is where the next bug will hide.

## 4. What to remove outright

- The pricing page and the pricing catalog tables, if the decision really is "prices only over a call". Today you maintain a price system nobody is allowed to see.
- The four dead tables above.
- The branch switcher, unless it gets wired properly.

## 5. What is actually good (so you know what not to touch)

Tenant isolation, server-side plan limit enforcement, the super-admin console with per-institute limits/modules/installments, the fee installment engine, the QR admission funnel, and the three-portal split. That core is sound.

## Recommended order

1. Wipe demo data, fix the orphan account, add the "not linked yet" screen.
2. Decide the branch switcher: wire it or hide it.
3. Legal pages, leaked-password toggle, privileged-function triage.
4. Per-route metadata for all public pages.
5. Drop dead tables, fix multi-branch usage counting.
6. Formatting pass, then error monitoring.

## Technical notes

- Branch wiring means passing an `institute_id` filter into the queries in `src/lib/api/index.ts` rather than filtering arrays after the fact, so counts and totals stay correct.
- Usage fix: `fetchUsage()` takes the active institute id and scopes each count to it.
- Dead-table removal is a single migration; nothing in `src/` imports them.
- Metadata uses the route `head()` option per file — no library needed.