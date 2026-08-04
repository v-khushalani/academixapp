# Aggressive pricing v2 — real feature tiers, lower prices

## The problem with the current page
Free, Growth and Campus differ only by student and classroom counts. Nothing pulls an institute up a tier, and ₹8,990 / ₹22,490 a year reads expensive next to Teachmint's free app.

## What the market actually gates (Aug 2026 rates)

| | Free tier | Paid entry | Gated behind paid |
| --- | --- | --- | --- |
| Teachmint | App, live classes, tests, single admin | Quote-based | Attendance, fee management, parent communication, reports, branding, multi-admin |
| Classplus | None (setup fee ₹15–20k) | ₹2k+/mo + commission | Everything, plus a cut of your fees |
| MyClassCampus | None | ₹80–150/student/yr + ₹10–25k setup | Mobile app, modules sold separately |
| Fedena | None | ₹80–150/student/yr + ₹5–10k setup | Add-on modules |
| SchoolCare (budget) | None | ₹58/student/yr | — |

Reading: everyone gates **attendance, fees, parent communication and reports** — the daily work. Academix does the opposite: give the entire daily operation away free, charge for scale, automation and intelligence.

## New prices (roughly a third of the old ones)

| Plan | Monthly | Yearly (2 months free) | Students | Classrooms | Effective /student/yr |
| --- | --- | --- | --- | --- | --- |
| Free forever | ₹0 | ₹0 | 100 | 4 | ₹0 |
| Growth | ₹499 | ₹4,990 | 400 | 10 | ~₹12 |
| Campus | ₹1,299 | ₹12,990 | 1,200 | 30 | ~₹11 |
| Chain | Custom | Custom | Unlimited | Unlimited | — |

₹12/student/year against Teachmint's ₹50–100 and Fedena's ₹80–150. First 100 institutes get the price locked for life; a headline line says "cheaper than one month of chai for the staff room".

## What each plan gets (the real differentiator)

**Free forever — the whole daily operation, permanently**
Admissions via QR/link with approval flow · enquiry pipeline · students & batches · batch fee auto-assign with scholarships · attendance · fee collection, receipts, UPI QR, defaulters list · tests & marks · syllabus/chapter tracker · multi-room timetable with clash detection · teacher portal · parent & student portal · WhatsApp messaging (manual send) · CSV import/export · unlimited staff logins.
Line on the card: *"Everything Classplus charges ₹15,000 setup for. Free, forever."*

**Growth — scale + automation + insight** (adds)
400 students / 10 rooms · automated WhatsApp fee reminders and absentee alerts (scheduled, not one-by-one) · defaulter follow-up sequences · full reports suite: revenue, collection, attendance %, batch performance, teacher load · student progress report cards (PDF) · timetable share as WhatsApp image · bulk messaging to a batch or filter · branded receipts & documents with your logo · custom fee heads and instalment plans · data export scheduler · email support in 24h.

**Campus — many staff, many batches, accountability** (adds)
1,200 students / 30 rooms · granular role-based permissions per staff member · audit log of who changed what · teacher performance & syllabus-coverage dashboard · attendance and fee analytics with trends and forecasting · custom fields on students and admissions · API/webhook access · priority support with WhatsApp line · assisted onboarding and data migration.

**Chain** (adds) unlimited, branch-wise rollup, cross-branch student transfer, consolidated finance, dedicated manager, custom branding/domain.

Anything in Growth/Campus not built yet ships as a dated roadmap row on the same page rather than a silent gap — the "coming" items are automated WhatsApp scheduling, report cards, audit log, custom fields, API, forecasting.

## Work in the repo

- `src/lib/plans.ts`: new limits and prices; add a `features: string[]` list and an `adds: string[]` list per plan, plus a `PLAN_FEATURE_MATRIX` used by both the pricing page and Settings.
- `src/routes/pricing.tsx`: rebuild the tier cards to show "Everything in Free, plus…" stacking; add a plan-vs-plan feature table (Free / Growth / Campus / Chain) above the competitor table; refresh headline, per-student maths and the price-lock line; move unbuilt items into the roadmap block with dates.
- Competitor table: keep, add a "what they gate behind paid" row set (attendance, fees, parent comms, reports) so the free tier's value is obvious.
- `src/routes/app.settings.tsx`: plan picker shows the new names, prices and limits.
- No enforcement changes — limits stay advisory until billing exists.

## Technical notes
Presentation-only change plus the plan constants file. No migration, no API change. Existing institutes on legacy plan keys keep mapping through `planFor()`.
