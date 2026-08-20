# Academix Full Audit — Findings and Fix Plan

I audited the live codebase and the live database. Types compile clean (0 errors), no `any` casts, no leftover debug logging, 171 source files. The React side is in good shape. **Every real problem is in the database layer and in half-finished modules.** Ordered by how much each can hurt you.

## What I verified (not guessed)

- TypeScript typecheck: passes, zero errors.
- Security scan: 3 errors, 3 warnings (below).
- Database: 0 tables without row-level security — tenant isolation is genuinely on everywhere.
- Queried the live schema directly for duplicate functions, missing indexes, and policy patterns.

---

## P0 — Must fix before another institute signs up

**1. Money records are readable by students and parents.**
The `expenses` table (institute costs + teacher salaries) is protected only by "same institute". Any logged-in student or parent of that institute can read — and delete — salary and expense rows. Fix: restrict to owner/admin/accountant.

**2. Staff of any institute can view any other institute's student photos.**
Storage rules check "is this person staff?" but never "staff of which institute?". A rival institute's admin could pull VK Academy student photos. This is the one finding that becomes a real privacy incident if it ever happens. Fix: scope photo access to the owning institute.

**3. An institute owner can upgrade their own plan for free.**
Owners/admins can edit their own institute row with no column restrictions, so they can raise `plan`, `student_limit`, `staff_login_limit` themselves and bypass your pricing entirely. Fix: lock billing/limit columns to the superadmin path only.

**4. Two versions of `platform_update_institute` are live.**
Two overloads of the same superadmin function exist — leftover from an earlier edit round. This is exactly the "multiple people edited it" damage you were worried about: the API can pick the wrong one and silently drop fields such as the receipt template. Fix: delete the stale version.

## P1 — Correctness and speed

**5. 50 foreign keys have no index.**
Including hot paths: `fees.batch_id`, `tests.batch_id`, `timetable_slots.batch_id`, `attendance.marked_by`, `test_results.student_id`. With today's small data it feels fine; at a few thousand students the fees and timetable screens will visibly crawl. Fix: add indexes where it matters.

**6. Permission checks re-run "who am I?" on every single row.**
Across 28 tables the rules call `auth.uid()` per row instead of once per query. On a 2,000-row student list that is 2,000 redundant calls. Standard fix, big win, zero behaviour change.

**7. Leaked-password protection is off.**
Supabase can reject passwords known from public data breaches. Currently disabled. One toggle.

## P2 — Half-built modules (the "many hands" mess)

Six tables exist in the database with **zero** screens using them:

| Table | What it was meant to be | Status |
|---|---|---|
| `expenses` | Teacher salary + expense tracking | Schema only, no UI |
| `audit_logs` | Who changed what | Schema only, never written to |
| `notification_logs` | WhatsApp/SMS history | Schema only |
| `automation_rules` | Automatic reminders | Schema only |
| `student_activities` | Student timeline | Schema only |
| `student_documents` | Document uploads | Schema only |

Two of these — **salary tracking** and **communication history** — are modules you list as core. Right now you pay storage for dead tables and risk telling prospects about features that don't exist. My call: build salary + message history, delete the other four. Half-built schema is worse than none, because the next person to edit assumes it works.

Also dead: the `courses` and `subjects` tables, left over after subjects moved into syllabus. Remove them.

---

## Execution order

**Phase 1 (one session): security lockdown.** Items 1, 2, 3, 4, 7. Re-run the security scan and confirm zero errors. Nothing else ships before this is green.

**Phase 2: performance.** Items 5 and 6, then re-measure.

**Phase 3: decide the six orphan tables.** Recommendation: build Salary Tracking (Staff module) and Message History (Communication module); drop the rest plus `courses`/`subjects`. I'll bring you the screen design before building.

**Phase 4: UX audit pass.** A separate deep pass — navigation, mobile, first-run experience for a non-technical institute owner. Worth doing on its own rather than mixed into security work.

## Technical notes

- Phase 1 and 2 are SQL migrations against the existing Supabase project: no frontend rewrite, no downtime.
- Column lock on `institutes` via a `BEFORE UPDATE` trigger rejecting plan/limit changes unless `is_superadmin()`.
- Storage isolation via an `institute_id/...` path-prefix convention matched against `my_institute_ids()`.
- Policy performance fix = wrapping `auth.uid()` as `(select auth.uid())` so Postgres evaluates it once per statement.
- Index additions are additive only and safe to apply live.