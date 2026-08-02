## Idea in short

Syllabus = a list of chapters for each subject of each batch. Teacher taps "what I taught today" from his class card; management sees a live percentage bar per batch/subject and how many chapters are left before the exam date.

## How it works for each person

**Admin / management (Settings → Syllabus, plus a new Syllabus page)**
- Create a chapter list per subject per class/batch (e.g. Class 11 Physics: 14 chapters, each with a name, order, and optional "planned sessions").
- Copy a list from one batch to another in one click, so it's set up once per year.
- Syllabus page shows a card per batch: overall %, per-subject bars, chapters in progress, chapters not started, and "X chapters left, Y teaching days to exam" — the number to quote to a parent standing at the desk.

**Teacher (/teach)**
- Today's class card gets a "Chapter" line. Tap it → sheet with that batch+subject's chapters.
- Three taps only: pick chapter → mark *In progress* (becomes "currently teaching") or *Done*. Optional one-line topic note ("Ray optics — mirrors").
- Next day the same chapter is pre-selected, so it's one tap to continue and one tap to finish.
- A "My syllabus" tab lists his batches with progress bars — he sees his own pending chapters.

**Parents / students (portal)**
- Read-only progress bar per subject: "Physics 62% covered". No chapter-level noise.

## Data model

- `syllabus_chapters` — institute_id, batch_id, subject, title, position, planned_sessions, status (`pending` / `in_progress` / `done`), started_on, completed_on, completed_by.
- `syllabus_logs` — institute_id, chapter_id, batch_id, faculty_id, date, note, slot_id (optional link to the timetable slot). One row per class taught, so "kis din kya padha" is auditable.
- Progress % = done chapters ÷ total chapters (weighted by planned_sessions when set).
- RLS: same institute isolation as the rest; teachers can insert logs and update status only for batches they teach; admin/owner full control; students/parents read-only progress.

## Timetable link

- The daily plan row already knows batch + subject + teacher, so the chapter sheet opens pre-filtered — no extra selection.
- Syllabus page shows "at current pace, Physics finishes on <date>" against the next test date, so scheduling extra sessions is a judgement call with a number behind it.

## Screens to build

1. `app/syllabus` — batch cards, per-subject bars, chapter editor dialog, copy-to-batch.
2. `teach/syllabus` — teacher's batches + chapter sheet with In progress / Done.
3. Chapter chip on today's class card in `/teach`.
4. Progress strip on the batch detail page and on the family portal progress page.
5. Dashboard KPI: "Syllabus coverage" average across active batches.

## Technical notes

- One migration creates both tables with GRANTs, RLS, updated_at triggers, and an index on (batch_id, subject, position).
- New `src/lib/api/syllabus.ts` with list/create/reorder/setStatus/log; reuse `useRefreshLinked` keys so bars refresh everywhere.
- Chapter status changes write a `syllabus_logs` row and a `student_activities` entry, keeping the existing activity feed consistent.
