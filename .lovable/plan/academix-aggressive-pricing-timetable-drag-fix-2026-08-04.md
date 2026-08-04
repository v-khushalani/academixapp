# Academix — aggressive pricing + timetable drag fix

## 1. Pricing: undercut everyone, match every feature

Market as of 2026 (publicly listed pricing):

| Player | Setup fee | Real cost | Catch |
| --- | --- | --- | --- |
| Classplus | ₹15k–20k | ₹2k+/mo + commission on your sales | sales-led, opaque quotes |
| Teachmint | variable | ₹50–100 / student / yr | freemium, key modules are paid add-ons |
| MyClassCampus | ₹10k–25k | ₹80–150 / student / yr | cluttered, school-shaped |
| Fedena | ₹5k–10k | ₹80–150 / student / yr | legacy UI |
| Entab CampusCare | ₹50k+ | ₹150–200 / student / yr | enterprise only |
| SchoolCare | ₹0 | ₹58 / student / yr | schools, not coaching |

Aggressive entry position: **zero setup fee, zero commission, zero per-student billing, and a free tier big enough to actually run a small centre.** Anyone comparing on price should find nothing cheaper that does as much.

| Plan | Price | Limits |
| --- | --- | --- |
| Free forever | ₹0 | 75 students, 3 classrooms, unlimited staff, all core modules |
| Growth | ₹999/mo · ₹8,990/yr | 300 students, 8 classrooms, all modules |
| Campus | ₹2,499/mo · ₹22,490/yr | 1,000 students, 25 classrooms, priority support |
| Chain | Custom | unlimited + multi-branch rollup, dedicated onboarding |

At 300 students Growth is ~₹30/student/yr — below every listed competitor, with no setup fee and no commission. Launch offer: first 50 institutes lock their price for life.

### Feature parity — nobody can say "yeh nahi hai"

Pricing page gets a full comparison matrix, Academix vs Classplus / Teachmint / MyClassCampus / Fedena / CampusCare, across: admissions & QR enquiry forms, batches, attendance, fees + receipts, tests & marks, syllabus tracking, multi-room daily timetable, teacher portal, parent/student portal, WhatsApp messaging, reports & exports, multi-branch, roles/RBAC, data export, no commission.

Honest gaps (shown as dated roadmap, not hidden): branded parent app, online fee gateway, live classes, report-card generator, transport/hostel, biometric attendance. Each gets a target quarter so a prospect sees a plan instead of a blank.

Work in the repo:
- Rewrite `src/routes/pricing.tsx`: four tiers with monthly/yearly toggle, a "never charged" strip (no setup fee, no commission, no per-student billing), the comparison matrix, a roadmap strip, and an FAQ.
- Align `src/lib/plans.ts` with `free`/`growth`/`campus`/`chain`; extend `Plan` with `students`, `rooms`, `priceMonthly`, `priceYearly`; keep `planFor()` backward-safe for existing `starter`/`unlimited` rows.
- Advisory-only enforcement (billing isn't wired): a soft "plan limit reached" banner on Students and Settings → Classrooms.

## 2. Timetable drag — tiles size to content, drag responds instantly

- **Tile sizing**: planning-rail batch / teacher / subject tiles become inline chips in a flex-wrap row — each takes only the width it needs and wraps naturally, instead of one full-width row per item (`PlanRail` in `src/routes/app.timetable.tsx`).
- **No long press on iPad**: HTML5 drag-and-drop requires a long press on touch. Replace rail + grid dragging with Pointer Events — drag starts after ~6px of finger movement, a ghost chip follows the pointer, the drop resolves from `elementFromPoint`. `touch-action: none` on draggable chips so the page doesn't scroll mid-drag; mouse uses the same code path.
- **Bigger, clearer targets**: drop cells highlight while a drag is over them, minimum cell height raised slightly, and the ghost shows the batch/subject name so it's obvious what's being placed.

## Technical notes

- Pricing page is presentation-only; plan limits stay advisory until billing exists.
- Drag rewrite is contained in `PlanRail` (`src/routes/app.timetable.tsx`) and `PeriodGrid` (`src/components/app/timetable/period-grid.tsx`) — no API or schema changes.
- Syllabus textbook alignment and the pre-launch audit stay on the list for a following round; say the word and I'll fold them back in.
