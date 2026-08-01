# Four fixes: form, timetable, landing, teacher invites

## 1. Public form: enquiry-first, step by step

Today `/apply` asks "admission or enquiry?" plus a token-amount field, and dumps every field on one screen.

New flow:

- Remove the intent choice and the token/advance amount completely. **Every public submission is an enquiry.**
- Split the form into 4 short frames with a progress bar ("Step 2 of 4"), one card at a time, Back/Next, validation per step:
  1. **Student** — name, phone (WhatsApp), class applying for, stream/program (only when relevant)
  2. **Parents** — father name+phone, mother name+phone, who monitors studies
  3. **More about you** — DOB, current school, email, address (all optional, clearly marked "optional — skip if in a hurry")
  4. **Photo + submit** — optional photo, then thank-you screen
- Answers persist while moving between steps; mobile-first, big tap targets, one question group per screen.

Admin side becomes a single pipeline:

```text
Enquiry  →  Admission confirmed  →  Batch assigned (student created)
   └── not converted → stays in Leads list for follow-up / marketing WhatsApp
```

- Admissions page tabs reduce to **Enquiries** (new, needs action) and **Leads** (not converted / future follow-up), plus the QR & link tab.
- Confirming an enquiry opens one dialog: pick batch → student record, fee plan and portal login are created. Fees/token are handled inside the app afterwards, never in the public form.

## 2. Timetable: ditch it, rebuild simple

The drag-and-drop board (batches rail → subjects → teachers, room columns, day-plan overrides) goes away entirely.

Replacement is form-based, not drag-based, and rests on one idea the institute already lives by: **the weekly time grid is fixed; only the content changes.**

- **Setup (once)**: in Settings you already define shifts and period length. Timetable derives fixed period slots from that — no free-form times.
- **Build (per batch)**: choose a batch, get a simple week grid of that batch's periods. Conflicts (teacher or room already booked at that time) are checked on save and shown in plain language. Left side mein batches hogi pehle...woh sab assign karne ke baad, teachers and then subjects...just drag and drop hona chahiye
- **Copy row / copy day** buttons so a repeated subject is filled in one tap.

Three read-only views generated from that one source:

- **Today (teacher sheet)** — a list: time, room, batch, subject, per teacher. Shareable to WhatsApp. Optional one-off change for today (substitute teacher / cancelled) that does not touch the weekly plan. (Sharing via whatsapp should be like screenshot of that table, aisa image hi jaana chahiye...not text)
- **Week by batch (student/school style)** — days down, periods across.
- **Week by teacher** — what each teacher's week looks like.  
  
SAB PROPER SYNC KARO

Everything fits the screen without horizontal scrolling; on mobile the grid becomes a day-by-day list.

## 3. Landing page: cut it down

Trim `/` to four blocks: header, hero (keeping "Built for coaching institutes. By people who run one."), the three-portal sign-in picker, short footer. The 6 module cards and the 4-step flow section move to `/for-institutes`, which is where someone who actually wants detail goes. One CTA in the hero, one in the footer.

## 4. Teacher signup by invite

Replace the current "tell teachers to sign up, then grant a role in Settings" note with an invite link, same mechanism as the student onboarding link that already works.

- On the Faculty page, **Invite teacher** → enter name, phone, subject → generates a one-time link and opens WhatsApp with the message pre-filled (no paid API, as always).
- The teacher opens the link, sets email + password, and is created already carrying the `faculty` role for that institute — no manual role granting.
- Faculty list shows invite state: Invited / Joined, with resend and revoke.

## Technical notes

- Public form: rewrite `admission-form.tsx` as a step machine; drop `intent` and `token_amount` from `AdmissionFormValues` and from the `submit_admission_application` RPC signature (migration).
- Leads/enquiry status handled by an existing status column on applications; conversion writes student + fee rows as it does now.
- Timetable: delete the drag layer (`schedule-grid.tsx`, batch/subject/teacher palettes, `react-dnd` usage in `app.timetable.tsx`); keep `src/lib/timetable/conflicts.ts` for the save-time check and `src/lib/time.ts` for 12-hour formatting. Existing `timetable_slots` and `timetable_day_plan` tables are reused unchanged.
- Teacher invites: new `faculty_invites` table (token, institute, expiry, used_at) with RLS + grants, plus a public route `/join/$token` and an RPC that creates the account with the faculty role.