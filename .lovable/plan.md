## 1. Public QR admissions — confirmed root cause

Verified in the database: there are two institutes — **"Your Institute"** (slug `default`, created first, 2 users) and **"VK ACADEMY"** (5 users, the one you log in to). The public form's database routine sets the institute using a helper that returns *the oldest institute in the table*, so every QR/`/apply` submission lands in "Your Institute", while the Admissions screen only reads rows for VK ACADEMY. The rows are being saved correctly — they're just filed under the wrong institute (3 pending applications are sitting there right now).

Fix:
- Make the public form institute-aware: `/apply?i=<slug>` (the QR in Admissions embeds your institute's slug), and the submit routine resolves the institute from that slug, falling back to the single institute when only one exists.
- Backfill the 3 stranded pending applications to VK ACADEMY, and retire the placeholder "Your Institute" tenant so the fallback can't misfire again.
- Show a confirmation state with the application number on submit, and make Admissions poll/refresh so a new entry appears without a manual reload.

## 2. Admissions — simplified

Current: 5 tabs (Leads pipeline, Applications, Enquiry records, Public QR, How it works). New structure — 3 tabs, no explainer:

```text
Admissions
├── Applications   ← everything that came in (default tab)
│     filter chips: New · Enquiry · Admitted · Rejected
│     row → View / Admit (assign batch) / Reject
├── Walk-ins       ← manually added enquiries (the old "lead", renamed, simple list not a kanban)
└── QR & link      ← poster-ready QR + copy link + WhatsApp share
```

- "Leads pipeline" kanban with 7 stages is removed; a walk-in is just a name + phone + interest + a 3-state status (Open / Admitted / Not interested).
- "Enquiry records" folds into the Applications tab as a filter chip.
- "How it works" tab deleted; a one-line hint sits under the page title instead.
- Existing lead rows are preserved and mapped onto the 3 states.

## 3. Timetable — rebuilt, no scrolling

One board, no vertical or horizontal scroll: the grid fits the viewport by sizing rows to the active shift's periods and columns to the room count (`grid-template` with `1fr` tracks instead of fixed pixel heights). Long room lists collapse into a compact column with a room filter rather than a horizontal scrollbar.

Left rail is redesigned so it no longer scrolls:
- **Step 1 — Batches**: compact chips (name + strength), collapsible by class, drag onto any empty cell.
- **Step 2 — Subjects**: once a batch is placed, the rail switches to that batch's subject chips (from the course's subject list) plus teacher chips; drag a subject chip straight onto a placed class to assign it. Drop a teacher chip the same way.
- Rail is fixed-height, two stacked sections, no inner scroll — overflow becomes a "+N more" popover.

Kept: clash blocking (room/teacher/batch), capacity warnings, the three modes (Today / Weekly / Class), WhatsApp share.
Also applies to the daily and class views so all three read as one consistent board.

## 4. Performance

Findings: the query client is created with no caching defaults, so every page refetches every list on mount; pages also request full tables with `select("*")` and pull lists they only need for labels.

- Set `staleTime: 60s` / `gcTime: 5m` defaults and enable route preloading on link hover.
- Narrow the column selects on the heavy lists (students, fees, attendance, timetable) to the fields actually rendered.
- Share single cached queries for batches / faculty / rooms / subjects across pages instead of per-component copies.
- Lazy-load the heavy bits (QR generator, PDF receipt, charts) so they don't sit in the first page bundle.
- Measure before/after page-load in the preview and report the numbers.

### Technical notes
- Files: `src/routes/app.timetable.tsx`, `src/components/app/timetable/*`, `src/components/app/daily-schedule.tsx`, `src/routes/app.admissions.tsx`, `src/components/app/enquiry-records.tsx`, `src/routes/apply.tsx`, `src/router.tsx`, `src/lib/api/index.ts`.
- One migration: institute-slug parameter on `submit_admission_application`, backfill of the 3 stranded students, removal of the placeholder institute.
