# Academix — production audit and next-build plan

Verified against the live database and the current code this turn. Where the first-pass audit was wrong, I re-checked and corrected it below.

## What is actually healthy

- TypeScript is clean (0 errors). No cross-tenant damage in live data: 0 fee rows, attendance rows or student-batch links pointing at the wrong institute.
- Tenant isolation holds. Every tenant table carries an institute-scoped policy — including `rooms`, `expenses`, `syllabus_chapters`, `timetable_day_plan`, `fee_adjustments`, which an earlier read flagged as missing. They are covered.
- The installment engine is **not** dead. `sync_student_batch_fee` in the database splits batch fees into installments (batch plan, then institute plan, then a single "Full fees" fallback), applies scholarship/discount, and preserves paid rows. The unused piece is only the client-side helper `amountsFor` in `src/lib/installments.ts`, which duplicates that logic and should be removed so nobody wires it in later and creates two sources of truth.

## Fix now (correctness and money)

1. **Currency is inconsistent.** Screens show `₹`, receipts and payment links show `Rs. `. Same amount, two symbols — reads as a bug to an institute owner. One `formatCurrency()` used in all nine places.
2. **Attendance punch ingestion can double-write.** The device endpoint does select-then-insert per punch with no unique key, so two near-simultaneous punches can create two rows for one student-day. Add a unique index on `(student_id, date)` and switch to upsert.
3. **Homework is a dead end for families.** The portal reads `homework`, but nothing anywhere writes it, so every student sees an empty tab forever. Add a create/edit surface in the teacher area (batch, title, due date, optional attachment).
4. **Hook-rule violation in receipt generation** (`src/lib/receipt.ts`) — a `use…` function called outside a component. Rename it; it is a latent crash under stricter React.
5. **One user-role row has no institute.** That account currently sees nothing. Assign it or remove it before it becomes a support ticket.
6. **Leaked-password protection is still off** in Supabase Auth. One toggle.

## Fix before real scale

7. **No pagination anywhere.** Students, fees, reports and leads all do unfiltered full-table reads. Fine at today's 14 students, painful at 2,000. Add range-based paging to students, fees and reports.
8. **Schema debt with no product behind it:** `audit_logs`, `automation_rules`, `notification_logs`, `student_documents` exist with policies but no UI reads or writes them. Either ship the activity log and document upload (both sellable on paid plans) or drop them.
9. **Two parallel invite systems** (faculty vs student) with near-duplicate dialogs — consolidate to one.
10. **Formatting drift**: ~2,560 of 2,597 lint problems are pure formatting. One fix pass clears them and makes future diffs readable.

## Build next — ranked by what wins deals in India

Based on competitor research across Teachmint, Classplus, Entab, MyClassboard, Fedena, Skolaro, Vidyalaya, LEAD and Extramarks. Academix is already ahead of most of them on back-office depth; the gaps are parent-facing polish and finance plumbing.

**Tier 1 — table stakes, silently losing deals today**

- **Bulk import (Excel/CSV) of students, fees, marks.** Migration friction is the top reason an institute does not switch.
- **ID card generator** with bulk print. Cheap to build, on every RFP checklist.
- **Branded progress cards / marksheets** as PDF, same engine as receipts. Parents are handed this.
- **Native mobile app for parents and students.** Every competitor leads with "we have an app" — a credibility signal before it is a feature.

**Tier 2 — retention and finance sign-off**

- **Online test engine**: MCQ auto-grading and rank list. Core hook for JEE/NEET-style coaching, which is your ICP.
- **Study material / DPP library** tied to batch and syllabus. Near-zero extra infrastructure, drives daily app opens.
- **GST-compliant invoices** and a **Tally export** of fees and expenses. The finance person has veto power in these deals.
- **WhatsApp lifecycle messaging** beyond fee reminders — absence alerts, result push, lead follow-up. Institutes pay ₹3–6k/month to AiSensy/Wati for exactly this; native support is a concrete "cancel that subscription" pitch.

**Tier 3 — later, segment-dependent**

- Live class links attached to timetable slots (hybrid batches).
- Broader biometric device support (eSSL, Matrix, ZKTeco) so institutes keep existing hardware.
- Self-serve "download all my data" export — answers the lock-in objection and doubles as DPDP readiness.
- Transport and hostel only matter if you move from coaching institutes into full K-12 schools. Skip for now.

## Technical notes

- Currency: new `src/lib/format.ts`; replace inline `toLocaleString("en-IN")` in reports, portal fees/index, fee dialog, dashboard cards, receipt, receipt templates, payments.
- Attendance: migration adding a unique index on `attendance (student_id, date)`, then `.upsert(..., { onConflict: "student_id,date" })` in `src/routes/api/public/attendance.punch.ts`.
- Homework: new dialog in the teacher area writing to `homework`; policies already allow faculty writes.
- Pagination: `.range()` on students, fees and reports queries with a page-size control.
- Remove `amountsFor` / `describeInstallment` from `src/lib/installments.ts`; keep the plan editor, which feeds the database function.

## Suggested order

1. Currency, receipt hook fix, orphan role row, leaked-password toggle.
2. Attendance upsert migration, homework authoring.
3. Pagination on students/fees/reports, formatting pass.
4. Bulk import, ID cards, progress cards.
5. Online tests + study material, GST/Tally, WhatsApp lifecycle.