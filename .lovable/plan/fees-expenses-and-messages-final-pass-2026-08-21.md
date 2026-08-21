# Fees, Expenses and Messages — final pass

Three areas get finished in this pass: fee follow-ups and overdue, money-out tracking (salary inside Expenses), and a daily pending-messages queue.

## 1. Fees

**Overdue is genuinely broken.** Verified: no database job or trigger ever sets a fee to `overdue`, and today every fee row in the database sits at status `pending` — including ones whose due date has passed. So the Overdue KPI and the "Overdue" filter can never match anything.

Fix: stop depending on a stored status. Overdue becomes derived — any live bill with a due date in the past and money still outstanding. Applied everywhere consistently: the Overdue KPI, the status filter, the row badge, the dashboard, and reports.

**Gentle follow-ups before the due date.** A fee gets a follow-up state based on days to due date:
- 7 days out: "Reminder due" (soft)
- 2 days out: "Due soon" (firmer)
- past due: "Overdue"

Two new WhatsApp templates (`fee_due_soon`, `fee_overdue`) join the existing pending/received ones, editable from Settings like the others. The Fees table gets a "Follow-up" filter (Due in 7 days / Due in 2 days / Overdue / All) so the front desk can work one list at a time. Each of these reminders also appears in the Messages pending queue (section 3).

**Student not paying a full installment.** A new "Revise installment" action on any unpaid or partly paid bill lets the institute:
- change this installment's amount,
- optionally push the difference onto the next installment of the same student (so the yearly total stays intact),
- change the due date,
- record a reason.

Every revision is written to the existing `fee_adjustments` audit table, so nothing is silently edited. The existing partial-payment behaviour (collect any amount, bill goes `partial`) stays as-is.

**Payment QR branding.** The QR shared on WhatsApp becomes a properly branded image instead of a bare code:
- institute logo and institute name at the top,
- student name, what the payment is for, and the amount,
- the QR itself with the UPI ID under it,
- "Powered by Academix" footer strip.

It is drawn on a fixed 1080x1350 canvas with safe margins, so nothing crops on any phone, and the same image is what gets shared or downloaded. The collect dialog itself gets a scrollable body so the QR, amount and buttons are never cut off on small screens or iPad split view.

## 2. Faculty and Expenses

**Salary moves into Faculty and Expenses; the separate Salaries tab goes away.**

- Faculty form gets a **Monthly salary** field (the `base_salary` column already exists but is not editable from the form today), plus a salary column in the faculty table.
- Opening a faculty member shows a small salary panel: monthly salary decided, paid this month, paid this academic year, and the payment history — with a "Pay salary" action.
- The **Salaries** nav item is replaced by **Expenses**. The old `/app/salaries` URL redirects there so nothing breaks for anyone who bookmarked it.

**Expenses tab** covers all money going out, with fixed default categories so year-end reporting works:

```text
Salary        Rent        Electricity      Water
Internet      Maintenance Housekeeping     Marketing
Stationery    Transport   Rates & taxes    Miscellaneous
```

The page shows:
- month / academic-year switch,
- total spend for the period and a per-category breakdown (amount and share),
- a category filter and a full list of entries,
- "Add expense" for any category, and salary entries stay linked to the faculty member they belong to,
- CSV export for the accountant.

Salary payments recorded from the Faculty screen appear in Expenses under Salary automatically — one ledger, two ways in.

## 3. Messages — pending queue

Messages currently only shows a history of what was already sent. It gets a **Pending** view as the default tab, built from live data:

- **Absentees today** that have not been notified yet
- **Fees due in 7 days / 2 days** and **overdue** fees
- **Payments received** with no receipt sent yet
- **Test results published** with no result message sent

Each pending row shows student, parent phone, the exact message text (from the templates), and two actions: **Send** (opens WhatsApp with that parent and message, then logs it) and **Ignore** (dismisses it permanently so it never re-appears).

**Send all** works through the queue one parent at a time — WhatsApp requires one chat per message, so Academix walks the list, opening each chat in turn and marking each one done as you go, with a clear "3 of 12 sent" progress line. There is no way around this without a paid WhatsApp Business API; that stays a later upgrade.

Filters on the pending view: **Today / Last 7 days / All**, by type (attendance, fee reminder, receipt, result) and by batch. The existing sent history moves to a second tab with the filters it already has.

## Technical notes

- Migration: add `ignored` to the `notification_status` enum; add a `dismissed_at` column on `notification_logs` for ignored items; no new table needed for the queue — it is derived from `attendance`, `fees` and `test_results`, and dismissals are stored as `notification_logs` rows.
- Overdue stays derived in one shared helper (`isOverdue` / `feeFollowUpState`) used by fees, dashboard and reports — no status column writes, so nothing depends on a cron job.
- Installment revision writes to `fee_adjustments` (`kind = 'revision'`) and updates `fees.amount` / `due_date` through a `SECURITY DEFINER` RPC scoped to the caller's institute.
- Expense categories live in `src/lib/constants` as a fixed list; the `expenses.category` column stays text so custom values entered earlier keep working.
- `/app/salaries` becomes a redirect to `/app/expenses`; the `salaries` RBAC module key is renamed to `expenses` with the same roles (owner, admin, accountant).
- Branded QR is composited on an offscreen canvas (logo, text, QR, footer) and exported as PNG for `navigator.share` / download.
