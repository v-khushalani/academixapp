# Dashboard, installments, absent alerts, receipts

## 1. Dashboard rebuilt from scratch (priority)

Minimal, bold, one screen. The five-panel wall goes away.

```text
Good morning, Vikas                          Thu, 6 Aug
------------------------------------------------------
   Rs 1,11,000        42            3/5            7
   OUTSTANDING     STUDENTS     ATTENDANCE      ABSENT
   (oversized numerals, one row, no card chrome)
------------------------------------------------------
NEEDS YOU NOW                     |  MONEY
 3 applications waiting        >  |  collected this month
 2 batches unmarked today      >  |  Rs 24,000   +18%
 5 parents with dues 60+       >  |  ageing 0-30 / 31-60 / 60+
------------------------------------------------------
Behind on syllabus: 9th SSC 32%  ·  10th CBSE 48%
```

Rules for the rebuild:

- One hero row of four numbers in oversized type; whitespace does the work, no boxes inside boxes.
- Exactly two panels below: "Needs you now" (max four clickable action rows) and "Money".
- One slim strip for syllabus showing only batches that are behind; upcoming tests becomes a single-line footnote.
- Everything else on the dashboard today (funnel metrics, all-time billed/collected, top-pending list) is removed — those belong on their own pages.
- Roles without fee access simply don't see the Money panel.

## 2. Batch-wise installment schedule

An institute-level default plan, overridable per batch:

- The default plan lives on the institute: how many installments, and each one's share and due rule.
- Each installment is due either "N days after admission" or "N days after batch start".
- Example default: 2 installments — 1st 50% due 7 days after admission, 2nd 50% due 90 days after batch start.
- Settings -> Fees gets an "Installment plan" editor (add/remove installments, share %, offset type, days).
- The batch edit dialog gets "Use institute default / Customise" with the same editor.
- When a student is admitted into a batch, the system creates one fee row per installment with the right amount and due date instead of a single lump bill. Existing single-bill students are left as they are.

## 3. Absent -> WhatsApp alerts for the admin

- When a teacher saves attendance that contains absentees, those absences are flagged for the institute.
- The admin dashboard shows a dismissable dialog: "7 students marked absent today" with the list.
- Each row has one tap that opens WhatsApp with the parent's number and the absence template pre-filled; the row then marks itself notified so nobody gets messaged twice.
- "Send all" walks the list one parent at a time — WhatsApp deep links can only open one chat at a time, silent bulk sending needs the paid WhatsApp Business API.

## 4. Receipt only after payment

- Remove "Download receipt" from the Collect payment dialog. Before money is marked received there is no receipt.
- After "Mark received" succeeds, a confirmation step appears: receipt number, amount received, and three buttons — Download PDF, Send on WhatsApp, Done.
- Receipt content changes: only the amount received is shown (large), with date, mode, receipt no., student, batch and particulars. Total billed and pending balance are removed.
- Fix the distorted amount numerals: the PDF embeds a proper Unicode font so digits and the rupee symbol render correctly, right-aligned.
- WhatsApp send: the PDF goes to the phone's native share sheet so it attaches directly to the chat; on desktop the file downloads and WhatsApp opens with a short confirmation message.
- Past payments stay re-printable from the Fees table row.

## Technical notes

- Migration: `institutes.installment_plan` (jsonb) and `batches.installment_plan` (jsonb, null = inherit); `fees.installment_no` / `installment_of`; a `notified_at` column on attendance for absent-alert dedupe.
- The fee-generation trigger on batch assignment is updated to expand the plan into multiple rows.
- `src/routes/app.index.tsx` and `src/components/app/dashboard/dashboard-cards.tsx` are rewritten using semantic tokens only.
- `src/lib/receipt.ts`: register a Unicode TTF in jsPDF for numerals and the rupee glyph; drop the billed/balance columns.
- `src/components/app/payment-dialog.tsx`: two-phase state (collect -> receipt).  
  
ALSO, JAB FEES MEIN QR DE RAHE HAI TOH PURA AMOUNT DELETE NAHI HO RAHA HAI...HAMESHA AISA THODI HOGA KI PARENT PURA AMOUNT ONE TIME MEIN HI KARE...HUM AMOUNT APNE ACCORDING MODIFY KAREIN AND JAB SEND WHATSAPP KAR RAHE HAI...TOH QR BHI JAANA CHAHIYE, NOT JUST LINK