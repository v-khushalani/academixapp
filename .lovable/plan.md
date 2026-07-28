# Connect everything: fees, admissions, timetable

## 1. Batch fee = single source of truth

The database already has `batches.default_fee`, `students.scholarship_percent`, `students.discount` and triggers that auto-create/recalculate a student's batch fee. Two problems found: the same trigger is registered twice on `students` (`trg_students_auto_batch_fee` and `students_auto_fee`), and there is no recalculation when a student *leaves* a batch or their batch changes.

- Drop the duplicate trigger so a batch change fires once.
- Extend recalculation so: batch change moves/re-creates the fee row for the new batch, removing a batch marks the old fee row appropriately, and scholarship/discount edits always re-net the amount (`fee = batch_fee − batch_fee×scholarship% − discount`).
- Recompute status (`pending / partial / paid`) after every recalculation so Fees KPIs, dashboard totals, student detail and the parent portal all agree.

## 2. Record fee = collect money, not invent invoices

Amount and due date are junk in this flow because the batch decides the amount.

- Replace the "Record payment" dialog with: pick student → it shows the auto-computed batch fee, already paid, and outstanding (read-only) → enter **amount received**, method, optional note → Save.
- Optional "Other charge" toggle for genuine one-offs (books, exam fee) where a manual amount is legitimate.
- After save: receipt number, paid date and status are set automatically, and Fees / Dashboard / Student detail / Portal fees refresh together.

## 3. Admission process (single form, two outcomes)

One public QR form replaces the paper enrollment form; the walk-in decides the outcome.

```text
QR / link  →  full details form  →  submitted
                                      │
              ┌───────────────────────┴────────────────────┐
        "Joining now" (token/part payment)          "Just enquiring"
                    │                                      │
        Admissions → approve → Student            Enquiries → follow-up
                    │                                (WhatsApp, reconsider)
             assign batch → fee auto-created,
             portal account, roster updated
```

- Form gains an intent step: **Enrolling now** vs **Just enquiring**, plus token/advance amount when enrolling.
- Approving an applicant asks for the batch. Assigning the batch auto-creates the fee at the batch rate, records the token amount already paid (so status becomes `partial`), and adds the student to the roster.
- Enquiries stay in the Enquiries tab with follow-up + "Convert to admission" that runs the same approve+batch flow.

## 4. Timetable: drag batches straight in

- Left panel gets a **Batches** list (draggable chips) above the existing class builder.
- Dropping a batch on a cell creates the slot with that batch pre-filled and immediately opens a compact inline editor to pick **subject + teacher + room** (room defaults to the batch's room).
- Existing conflict blocking (same room / teacher / batch overlap) stays.

## 5. "Internally connected" pass

Audit every mutation so the related screens update: student ↔ batch roster ↔ fees ↔ dashboard KPIs ↔ reports ↔ parent portal, attendance/tests ↔ portal progress, timetable ↔ teacher "Today" screen. Concretely: shared query-key invalidation for `students`, `batches`, `fees`, `dashboard-summary`, `batch-roster`, `timetable`, plus fixing any screen that reads a value the triggers now own.

## Technical notes

- New SQL migration: drop the duplicate `students_auto_fee` trigger, rewrite `auto_assign_batch_fee` / `recalc_batch_fee_on_student_change` to cover batch moves and removals, and add applicant intent + token-amount columns on `students` (used by the approval flow).
- Frontend: `fee-form-dialog.tsx` rewritten as a collection dialog; `admission-form.tsx` + `app.admissions.tsx` gain the intent/token step and batch-on-approve; `app.timetable.tsx` gains the batch palette; centralised invalidation helper in `src/lib/api`.
- No new backend service — everything runs through the existing Supabase client and triggers.
