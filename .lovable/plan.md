## 1. Quick Admit vs Add Student — remove the duplicate

Today there are two ways to create a student: **Quick Admit** (name + phone, then a self-fill link) and **Add Student** (full form). They overlap, and enquiries already come through the QR form.

- Keep **one** entry point on Students: "Add student", with two tabs inside the same dialog — *Send self-fill link* (name + phone + WhatsApp) and *Fill now* (full form).
- Delete `quick-admit-dialog.tsx` and its trigger; keep the onboarding-link logic inside the merged dialog so nothing breaks.

## 2. Batch disappears from the rail once placed (with an "extend" option)

- The Batches step in the planning rail shows only batches **not yet scheduled** for the selected day+shift; placed batches move into a dimmed "Scheduled" section below.
- Each scheduled batch gets a small **+ Add another session** action, which makes it draggable again for one more slot. The second session is a separate row, so subject, room and teacher can differ. Clash checks still block the same batch in two rooms at the same time.

## 3. Timings instead of P1/P2 + editable rooms in place

- Row headers show only the time range (e.g. `3:00 PM – 4:00 PM`). The "Period" label and `P1, P2…` are removed.
- Column headers become editable: click the room name or the capacity to rename / change seats inline (writes to the `rooms` table, same permissions as Settings). An "+ Add room" column appears when the plan limit allows.

## 4. Carry today's plan to the next day

- Add a **Copy to next day** action next to the day tabs: duplicates every class of the selected day into the following day, skipping anything that would clash.
- Optional "keep in sync going forward" is out of scope; a one-click copy plus drag-and-drop edits covers the workflow you described.

## 5. Share only via WhatsApp

- `share-image.ts` currently falls back to a file download. Change it so the button always renders the PNG and hands it to WhatsApp: native share sheet on phones, and on desktop it copies the image to the clipboard and opens WhatsApp Web with the caption pre-filled, so it can be pasted straight into the group. No silent downloads, no other targets.

## 6. Link class to batch

- Add a `class_level` column to `batches` (values: 6–12, matching what the admission form collects).
- Batch form gets a "Class" selector.
- Anywhere a batch is chosen for a student (approve applicant, edit student, assign batch), only batches whose class matches the student's class are listed, with a "show all" escape hatch.

## 7. Route-by-route pass + the signup failure

- Reproduce the new-user registration error in the browser (signup → institute creation) and read the exact Postgres error. Most likely a constraint or RLS violation in the profile/institute bootstrap trigger; the fix goes in a migration once the real message is captured.
- Then walk every route logged in as admin, teacher and student, listing anything broken before fixing.

## 8. Supabase + Git only

Nothing to migrate here — the app already talks directly to your own Supabase project (`vk-academy-os`); no Lovable Cloud database or edge functions are in use. The only Lovable piece is the build config, which is required for the project to compile. Code lives in Git via the GitHub connection in project settings.

## Technical notes

- Migration: `ALTER TABLE public.batches ADD COLUMN class_level text` (+ index); no RLS change needed.
- Timetable rail filtering derives from the existing `slots` query — no new endpoint.
- Room inline editing reuses `roomsApi.update` and respects the plan's room limit.
