# Academix — Pricing, Syllabus, Timetable polish + pre-launch audit

## 1. Pricing (research-backed)

Market benchmarks for Indian institute/school software (2026):

| Player | Model | Real cost |
| --- | --- | --- |
| Classplus | Sales-led: setup fee + subscription + commission | ~₹15–20k setup, ₹2k+/mo, quote-based ₹8k–50k+/yr |
| Teachmint | Freemium, paid add-ons | ≈₹50–100 / student / yr |
| MyClassCampus | Per student per year + setup | ₹100–200/student/yr, ₹10–25k setup |
| Fedena | Per student per year | ₹150–300/student/yr |
| Entab CampusCare | Enterprise | ₹200–500/student/yr, ₹50k+ setup |
| Budget ERPs (mPencil, SchoolCare) | Ultra-cheap | ₹21–58/student/yr |

Reading: the top end is sales-heavy and opaque; the bottom end is cheap but school-shaped, not coaching-shaped. Academix ka wedge = coaching-first (batches, shifts, multi-room daily scheduling, syllabus coverage, WhatsApp-native) with transparent self-serve pricing and zero commission.

**Recommended: flat institute slabs, monthly or yearly (2 months free yearly), no setup fee, no commission, no per-head billing.**

| Plan | Price | Limits | For |
| --- | --- | --- | --- |
| Starter | ₹0 | 40 students, 2 classrooms, 3 staff | Trial / small tuition |
| Growth | ₹1,499/mo (₹14,990/yr) | 250 students, 6 classrooms, unlimited staff | Single-centre coaching |
| Campus | ₹3,999/mo (₹39,990/yr) | 800 students, 20 classrooms, priority support | Established institute |
| Multi-centre | Custom | Unlimited + branch rollup, dedicated onboarding | Chains |

At 250 students, Growth is ~₹60/student/yr — under MyClassCampus/Fedena, above throwaway ERPs, and predictable for the owner.

Work in the repo:
- Rewrite `src/routes/pricing.tsx`: four tiers, monthly/yearly toggle, a "what we never charge for" strip (no setup fee, no commission, no per-student billing), and a short competitor comparison table.
- Align `src/lib/plans.ts` with the new slabs (`starter`/`growth`/`campus`/`multi`); extend `Plan` with `students`, `staff`, `priceMonthly`, `priceYearly`; keep `planFor()` safe for existing `unlimited` rows.
- Soft enforcement only (billing isn't wired): a "plan limit reached" banner on Students and Settings → Classrooms when over limit.
- Feature gaps listed as roadmap on the pricing page, not built now: branded parent app, online fee gateway, live classes, report-card generator.

## 2. Syllabus — textbook alignment

Goal: chapter list = exact textbook list, exact sequence, per subject.

- **Preset library** (`src/lib/syllabus/presets.ts`): NCERT chapter lists in book order for Class 9–12 Physics, Chemistry, Biology, Maths, plus Class 6–8 Science/Maths. Admin picks Board → Class → Subject; chapters insert in correct order in one click.
- **Paste/import**: keeps the multi-line paste, adds numbered-list cleanup (strips "1.", "Chapter 2 –") so a copied index pastes clean.
- **Reorder**: drag handles on chapter rows; a position-renumbering helper in `src/lib/api/syllabus.ts`.
- **Book metadata**: optional `book` (e.g. "NCERT Physics Part 1") and `chapter_no` columns on `syllabus_chapters`, so the tracker reads like the textbook index.
- **Batch defaults**: when a batch has `class_level`, the preset picker pre-selects that class.
- `app/syllabus` gains a "Load from textbook" dialog; the teacher page shows chapter numbers.

## 3. Timetable drag polish

- **Tile sizing**: planning-rail batch/teacher/subject tiles become inline chips that take only the width they need and wrap, instead of full-width stacked rows (`PlanRail` in `src/routes/app.timetable.tsx`).
- **Touch drag on iPad**: HTML5 drag events need a long press on touch. Replace rail + grid dragging with Pointer Events — drag starts after ~6px of movement (no long press), a ghost follows the finger, drop resolves from the element under the pointer. `touch-action: none` on tiles so the page doesn't scroll mid-drag; the mouse path uses the same handler.
- Bigger drop targets and a highlighted target cell while dragging.

## 4. Pre-launch audit (written report in chat)

Route by route as admin, teacher and family:
- what's solid and sellable
- broken or half-wired flows and data mismatches
- security posture: RLS coverage, superadmin access, storage bucket rules
- performance hot spots
- must-fix before the first paying institute vs can-wait

## Technical notes

- One migration: add `book text` and `chapter_no int` to `syllabus_chapters` (existing RLS covers them).
- Drag rewrite is contained in `PlanRail` + `PeriodGrid`; no API changes.
- Pricing page is presentation-only; plan limits stay advisory until billing exists.