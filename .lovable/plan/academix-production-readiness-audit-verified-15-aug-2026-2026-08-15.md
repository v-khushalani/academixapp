# Academix — production readiness audit (verified 15 Aug 2026)

Everything below was checked against the live database and the current code this turn. Where earlier audit files were wrong, I corrected them.

## Health check

- TypeScript: 0 errors. Of ~2,940 lint problems, only 48 `any` uses and 3 ts-comments are real; the rest is pure formatting.
- Every public table has RLS on and at least one policy. The earlier claim that `faculty`, `student_documents`, `notification_logs`, `automation_rules`, `student_activities` had zero policies is wrong — each has 5-6.
- `current_institute_id()` no longer falls back to "the oldest institute". That leak is closed.
- Every portal screen is genuinely wired to Supabase — dashboard, students, batches, attendance, fees, admissions, expenses, faculty, reports, syllabus, timetable, tests, teacher marks/homework/attendance, family fees/progress/timetable. No mock data, no dead buttons.

## Blockers before go-live

1. **The only account in the database cannot use the app.** Both `user_roles` rows for the single user have `institute_id = NULL`, and `institutes` has 0 rows. With the fallback removed, every tenant policy evaluates false — this account sees nothing, everywhere. Either run onboarding cleanly so the institute is created and the role rows backfilled, or delete the two orphan rows so signup starts fresh.
2. **Cross-tenant profile writes.** `profiles` has no restrictive tenant policy, and `Profiles: admin update any` lets any owner/admin — of any institute — update any profile row on the platform. Real isolation hole. Scope it to the caller's institute.
3. **A tautological policy on `user_roles`.** `Users can view roles in their institute` compares `institute_id` against a subselect that resolves back to the same row, so it is always true. A restrictive policy currently contains the damage, but the policy is meaningless and one change away from exposing every role on the platform. Drop it.
4. **Policy sprawl.** Tenant tables carry 5-6 overlapping permissive policies each. Permissive policies OR together, so isolation rests entirely on the single restrictive policy per table. Consolidate to one restrictive tenant policy plus minimal per-role permissive ones so the intent is auditable.
5. **Service-role key naming.** Only `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` is set; `SUPABASE_SERVICE_ROLE_KEY` is empty. Any path reading the standard name fails at runtime. Standardise on one accessor.
6. **Leaked-password protection** in Supabase Auth — verify it is on. One toggle.

## Fix before real customers

7. **Expense institute is guessed.** `src/routes/app.expenses.tsx:172` takes `institute_id` from `facultyApi.list()[0]` with a `// hack` comment. With no faculty yet, expense creation fails; on a multi-branch account it can pick the wrong branch. Use the session's institute.
8. **WhatsApp templates are per-browser.** `src/lib/academy-settings.ts` stores them in `localStorage` (`vk_wa_templates`) — each staff member gets their own copy and they vanish on a new device. Move to the institute record.
9. **Generated Supabase types are stale.** `current_institute_id`, `get_dashboard_overview`, `get_institute_usage`, `is_superadmin`, `accept_student_invite` and others are called from code but absent from `types.ts`, forcing `as any` casts that hide signature drift. Regenerate.
10. **The wipe tool fails silently.** `src/lib/database-management.functions.ts` console-logs per-table delete errors and still reports success, and its hardcoded table list omits `student_documents`, `student_activities`, `notification_logs`, `automation_rules`. A "clean" wipe can leave rows behind.
11. **No pagination anywhere.** Students, fees, reports and leads do unfiltered full-table reads; Supabase caps at 1000 rows, so data is silently truncated at scale.
12. **Formatting pass.** One Prettier run clears ~2,890 problems and makes future diffs reviewable.

## Schema with no product behind it

Five tables exist with policies but are never read or written by any screen: `audit_logs`, `automation_rules`, `notification_logs`, `student_activities`, `student_documents`. `subjects` is unused too — every subject in syllabus and timetable is free text. Per table, either ship the feature (activity log and document upload are both sellable) or drop it.

## Portal-by-portal status

- **Admin (`/app`)** — all screens live. Gaps: expense institute hack, no pagination, no document upload on the student page, no activity feed.
- **Teacher (`/teach`)** — Today, attendance, marks, syllabus, homework all read and write real tables. No gaps found.
- **Family (`/portal`)** — fees, attendance, homework, progress, timetable all live. Homework now has a teacher-side writer, so that tab is no longer a dead end.
- **Public / onboarding** — landing, pricing, apply, join/onboard/welcome token flows and the Google auth callback are all wired. The unverified part is an end-to-end signup run, which is blocker 1.

## Suggested order

1. Clear the orphan role rows and run one clean Google signup end to end, confirming the owner lands on a working dashboard.
2. Profile-write scoping, drop the tautological policy, policy consolidation, leaked-password toggle.
3. Service-role key accessor, expense institute fix, templates to database, regenerate types.
4. Pagination, wipe-tool error surfacing, formatting pass.
5. Decide on the five orphan tables.

## Technical notes

- Items 2-4 are one migration: a restrictive tenant policy on `profiles`, `DROP POLICY` on the two bad ones, and a consolidation pass per tenant table.
- Item 7 should read the institute from the auth hook, the same source the branch switcher uses.
- Item 11: `.range()` plus a page-size control on students, fees and reports.