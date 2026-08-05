# Academix: fee corrections, super-admin access, receipts, funnel + dashboard rebuild

## 1. Deleting a fee entry (the illogical part)

Today "Remove" hard-deletes the row, so any money already recorded against it vanishes from both Collected and Pending. That is wrong: a receipt that was issued is a real event.

New behaviour:
- If nothing was collected on the entry (amount_paid = 0): allow a real delete — it was a genuine mistake.
- If money was collected: no delete. Two actions instead.
  - **Cancel / void entry** — the bill is written off. Pending drops to zero, Collected keeps the money already received (with the entry shown as `cancelled`).
  - **Reverse payment (refund)** — removes the received amount from Collected and puts the bill back to pending, with a reason stored.
- Every void/reversal is logged (who, when, why) and appears in the student's activity timeline, so numbers can always be explained to a parent.
- Fees KPIs (Fees page + dashboard) exclude cancelled bills from Billed/Pending but keep real cash in Collected.

## 2. Super admin login

There is no separate super-admin door today — the role exists in the database but you sign in through the normal admin login and the extra "Platform" console appears only if your account carries the `superadmin` role.

Plan:
- Add a dedicated route `/login/platform` (unlinked from the marketing site, reachable only if you know it) with Google + email sign-in.
- After sign-in, non-superadmins get bounced to their normal dashboard; superadmins land directly on the Platform console.
- Add a short "Platform" entry in the sidebar for superadmins only (already partly present, will be made obvious).
- Document exactly which account is the super admin and how to promote another one.

## 3. Fee receipt template

Current receipt is a plain key/value table. Rebuild as a proper A5 receipt:
- Institute logo + name, address, phone/email in a header band; academic year.
- Receipt no., date, mode (cash/UPI/bank), and a clear "Received with thanks from …".
- Student block: name, admission no., class/batch, father/mother name.
- Line-item table: particulars, amount billed, discount/scholarship, paid now, balance.
- Amount in words, running balance, next due date.
- Footer: UPI QR (if UPI id set), "computer generated receipt", signatory line.
- Same layout reused for the WhatsApp-shared image/PDF so parents get a clean document.

## 4. Admissions funnel — simplified, and explained

**How it works today (why it feels complex):** one QR points to one long form (`/apply`), which asks admission-grade detail — parents/photo/program/address. Everything submitted becomes a `students` row awaiting approval, and there is also a separate manual leads board. So enquiries and admissions use the same heavy form, and follow-ups live in two places.

**Proposed funnel (three clean stages, one board):**

```text
ENQUIRY            ->   APPLICATION            ->   ADMITTED
short form (30s)        full form (parents,         approve + assign batch
name, phone, class      DOB, address, photo)        fee auto-created
```

- **Two QRs / two links.** "Enquiry QR" opens a 4-field form (name, phone, class, interested in). "Admission QR" opens the existing full form. Same page, mode chosen by the link.
- Enquiries land in a single **Follow-ups** board with call/WhatsApp buttons and next-follow-up date. One button "Convert to admission" sends the parent the full form link on WhatsApp, pre-filled with what we already know.
- Applications tab keeps only forms that are actually complete and awaiting approval.
- Approve = pick batch. Fee is created automatically; no amounts asked in that dialog (already done).
- Remove the parallel manual "leads" kanban and fold walk-in/phone enquiries into the same Follow-ups board, so there is exactly one place to chase people.

## 5. Dashboard rebuilt

Current dashboard is 5 flat KPI tiles plus link buttons — no insight. Rebuild around "what needs my attention today":

- **Today strip:** classes running today, attendance marked vs pending (by batch), absentees needing a parent message, teachers absent.
- **Money card:** collected this month vs last month, outstanding split by ageing (0-30 / 30-60 / 60+), top 5 defaulters with one-tap WhatsApp reminder.
- **Admissions funnel card:** enquiries → applications → admitted this month, with conversion %.
- **Academics card:** syllabus coverage per batch (bar list, red where behind schedule), upcoming tests, last test average.
- **Action queue:** pending approvals, unmarked attendance, unassigned batches, fees overdue — each row jumps straight to the fix.
- Role-aware: owner/admin see money; receptionist sees admissions + attendance; faculty see their own batches.
- Visual work stays inside the existing token system (no new colours invented), denser cards, sparkline/mini-bars instead of bare numbers.

## 6. Competitive read (Classplus, Teachmint, Eduflex/MyClassCampus, Entab)

Where we already match or beat them: WhatsApp-first communication without paid API, room-wise drag timetable, syllabus tracking visible to management and parents, zero-cost UPI collection, aggressive pricing.

Gaps worth closing, in priority order:
1. **Fee instalment plans** — define 3/4-instalment schedules per batch with due dates and auto-overdue. Every competitor has this; we only have a single bill.
2. **Automated reminder scheduling** — queue fee/absent reminders instead of only manual taps.
3. **Report cards / result PDFs** — per-test and consolidated, parent-shareable.
4. **Enquiry source analytics** — where admissions come from (reference, walk-in, Instagram) to justify marketing spend.
5. **Study material / homework attachments** in the parent portal.
6. **Expense + payroll basics** — so the owner sees profit, not just fee collection.
7. **Bulk import** improvements and an audit log for money edits (ties into item 1 above).

These are listed for sequencing; this plan implements items 1-5 of the sections above, and I will pick up the competitive gaps in the next round unless you want any of them pulled in now.

## Technical notes

- Migration: add `cancelled` to fee status handling, plus `fee_adjustments` table (fee_id, kind void/refund, amount, reason, created_by) with grants + RLS scoped to institute staff; keep cash figures derived from `fees.amount_paid` minus reversals.
- `feesApi.remove` split into `remove` (only when unpaid), `voidFee`, `reversePayment`; all KPI helpers (`outstandingOf`, dashboard summary) updated to skip cancelled bills.
- Receipt rebuilt in `src/lib/receipt.ts` with jsPDF + autotable, UPI QR rendered via a canvas data URL.
- Enquiry mode added to `src/routes/apply.tsx` via a `?mode=enquiry` param; `submit_admission_application` already supports `_intent`.
- Admissions page: drop the leads kanban, single Follow-ups board sourced from enquiry-intent students plus manually added walk-ins.
- Dashboard split into small components under `src/components/app/dashboard/` fed by one aggregated query.
