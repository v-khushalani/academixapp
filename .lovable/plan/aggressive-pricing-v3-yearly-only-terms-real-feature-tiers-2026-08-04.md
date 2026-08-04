# Aggressive pricing v3 — yearly-only terms, real feature tiers

## Two problems with the page today
1. Free, Growth and Campus differ only by student and classroom counts, so nothing pulls an institute up a tier.
2. ₹8,990 / ₹22,490 a year reads expensive next to Teachmint's free app, and monthly billing invites churn after one exam season.

Fix: give the entire daily operation away free, charge little for scale and automation, and sell only in yearly terms with real discounts for 3 and 5 years.

## What the market actually gates (Aug 2026 rates)

| | Free tier | Paid entry | Gated behind paid |
| --- | --- | --- | --- |
| Teachmint | App, live classes, tests, single admin | Quote-based | Attendance, fee management, parent communication, reports, branding, multi-admin |
| Classplus | None (setup fee ₹15–20k) | ₹2k+/mo + commission | Everything, plus a cut of your fees |
| MyClassCampus | None | ₹80–150/student/yr + ₹10–25k setup | Mobile app, modules sold separately |
| Fedena | None | ₹80–150/student/yr + ₹5–10k setup | Add-on modules |
| SchoolCare (budget) | None | ₹58/student/yr | — |

Everyone gates the daily work — attendance, fees, parent communication, reports. Academix gives exactly that away free.

## Yearly-only pricing with term discounts

No monthly plan anywhere on the site. Terms: 1 year, 3 years (save 20%), 5 years (save 30%). Longer term = locked customer, cash upfront, and a price they'll never beat later.

| Plan | Students / Rooms | 1 year | 3 years | 5 years |
| --- | --- | --- | --- | --- |
| Free forever | 100 / 4 | ₹0 | ₹0 | ₹0 |
| Growth | 400 / 10 | ₹4,990 | ₹11,990 (₹3,997/yr) | ₹17,490 (₹3,498/yr) |
| Campus | 1,200 / 30 | ₹12,990 | ₹30,990 (₹10,330/yr) | ₹44,990 (₹8,998/yr) |
| Chain | Unlimited | Custom | Custom | Custom |

At 400 students, Growth on a 5-year term is **₹8.75 per student per year** — against Teachmint ₹50–100 and Fedena ₹80–150, with zero setup fee and zero commission.

Term-plan sweeteners shown on the cards:
- 3-year: price locked for the full term, free data migration, one free branded-document setup.
- 5-year: everything above plus priority support at Growth price, and any new module launched during the term included free.
- Founding offer: first 100 institutes keep their rate for life, on any term.
- Headline framing: cheaper per year than one month of one staff salary.

## What each plan gets (the real differentiator)

**Free forever — the whole daily operation, permanently**
QR/link admissions with approval flow · enquiry pipeline · students & batches · batch fee auto-assign with scholarships · attendance · fee collection, receipts, UPI QR, defaulters list · tests & marks · syllabus/chapter tracker · multi-room timetable with clash detection · teacher portal · parent & student portal · WhatsApp messaging (manual send) · CSV import/export · unlimited staff logins.
Card line: *"Everything Classplus charges ₹15,000 setup for. Free, forever."*

**Growth — scale + automation + insight** (adds)
400 students / 10 rooms · automated WhatsApp fee reminders and absentee alerts on a schedule · defaulter follow-up sequences · full reports suite (revenue, collection, attendance %, batch performance, teacher load) · student progress report cards as PDF · timetable share as WhatsApp image · bulk messaging to a batch or filter · branded receipts and documents with your logo · custom fee heads and instalment plans · email support within 24h.

**Campus — many staff, accountability** (adds)
1,200 students / 30 rooms · granular role-based permissions per staff member · audit log of who changed what · teacher performance and syllabus-coverage dashboard · attendance and fee analytics with trends and forecasting · custom fields on students and admissions · API/webhook access · priority support on WhatsApp · assisted onboarding and data migration.

**Chain** (adds) unlimited students and rooms · branch-wise rollup · cross-branch student transfer · consolidated finance · dedicated manager · custom branding and domain.

Anything in Growth/Campus not built yet appears as a dated roadmap row on the same page instead of a silent gap: automated WhatsApp scheduling, report cards, audit log, custom fields, API, forecasting.

## Work in the repo

- `src/lib/plans.ts`: drop `priceMonthly` entirely; add `terms: { years: 1|3|5; price: number; save?: number }[]`, new student/room limits, a `features` list for Free and an `adds` list for each paid plan, plus term perks. Keep `planFor()` legacy-key mapping.
- `src/routes/pricing.tsx`: replace the monthly/yearly toggle with a 1 / 3 / 5-year term selector; cards show term price, per-year equivalent, per-student maths and the savings badge; "Everything in Free, plus…" stacking; a Free-vs-Growth-vs-Campus-vs-Chain feature table above the competitor table; term-perk strip; roadmap block with dates.
- Competitor table: keep, and add a "gated behind paid" row group (attendance, fees, parent comms, reports) so the free tier's value is obvious at a glance.
- `src/routes/app.settings.tsx`: plan picker shows new names, yearly prices and limits — no monthly anywhere.
- Any other surface mentioning monthly pricing (landing, for-institutes) gets the yearly language.
- No enforcement changes — limits stay advisory until billing exists.

## Technical notes
Presentation plus the plan constants file. No migration and no API change. Term choice is display-only for now; when billing lands, the selected term becomes the subscription interval.
