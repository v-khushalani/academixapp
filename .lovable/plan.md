## Goal

Ek slot = ek batch + ek teacher + ek classroom. 3–4 PM mein 4 alag rooms mein 4 batches parallel chalein, bina teacher/batch/room clash ke. Weekly grid fix rahega (subject optional/blank), aur usi se har teacher ka daily schedule banega jo WhatsApp par bheja ja sake.

## 1. Classrooms master (Settings)

Naya `rooms` table: name, capacity, active flag (institute ke andar unique name).

- Settings mein "Classrooms" tab — add / rename / capacity / deactivate.
- Timetable ka room field free-text se dropdown ban jayega (existing free-text names ek-baar rooms ke roop mein import ho jayenge, taaki purana data na tootey).

## 2. Timetable grid — Room view / Teacher view toggle

Ek day tabs row (Mon–Sun) + shift tabs (Morning/Evening) jaise abhi hai. Uske neeche ek view toggle:

```text
ROOM VIEW  ·  Wednesday  ·  Evening shift (3–7 PM)

          Room 101      Room 102      Lab 1        Room 201
3:00 PM   12-PCM        11-PCB        10-Found.    9-School
          Sharma        Verma         Iyer         Khan
4:00 PM   12-PCM        11-PCB        (empty)      10-Found.
          Sharma        Verma                      Khan
```

- **Room view**: columns = active classrooms, rows = time bands. Ek nazar mein pata chalta hai kaunsa room khaali hai.
- **Teacher view**: columns = teachers, rows = time bands. Yehi view teacher ko daily schedule dene ke liye use hoga; khaali cell = free period.
- Dono views ek hi data par chalte hain; drag-drop dono mein kaam karega (Room view mein batch drop karo → room fix, teacher chuno; Teacher view mein batch drop karo → teacher fix, room chuno).
- Grid scroll-free rehta hai: rows sirf shift window ke andar, period length ke hisaab se (1 hr / 1.5 hr), 12-hour labels.

## 3. Reconciliation checks

Har drop/save par server-side validation + UI par live warnings:

- **Teacher double-booked** — same teacher, overlapping time, alag slot.
- **Room double-booked** — same room, overlapping time.
- **Batch double-booked** — same batch do jagah ek hi waqt.
- **Room capacity** — batch ki active student count > room capacity → soft warning.
- **Shift ke bahar** — badge, jaise abhi hai.

Grid ke upar ek "Reconciliation" panel: har clash ki line ("Wed 4 PM — Sharma: 12-PCM aur 11-PCB"), click karo to seedha us cell par jump. Clash wale cells red border. Save block nahi hoga hard clash par — warning ke saath confirm maangega, taaki emergency adjustments possible rahein.

Ek "Coverage" summary bhi: aaj ke din kitne slots bhare, kitne rooms idle, kaunsa teacher kitne periods (workload balance dekhne ke liye).

## 4. Teacher daily schedule + WhatsApp

- `/teach` par teacher ko aaj ka din: time, batch, room (subject agar bhara ho).
- Admin timetable par har teacher ke saamne "Send schedule" — WhatsApp app khulega pre-filled text ke saath:
`Wed 12 Aug — Sharma: 3–4 PM 12-PCM (Room 101), 4–5 PM 11-PCB (Room 102)`
- "Send to all teachers" list bhi, ek-ek karke tap karke bhejne ke liye (koi API nahi, seedha wa.me link).
- Room-wise poore din ka schedule share karne wala existing WhatsApp button bana rahega.

## 5. Subject

Subject optional rehta hai (aapne kaha weekly timing same, subject daily badalta hai) — slot par blank chhoda ja sakta hai; agar bhara ho to grid aur WhatsApp text dono mein dikhega. Koi daily-override table nahi banega.  
  
6. left side pe batches honi chahiye, unko direct drag and drop to slots...rooms ke sath sath teachers assign kar denge

&nbsp;

---

### Technical notes

- Migration: `public.rooms` (id, institute_id, name, capacity, is_active, timestamps) with GRANTs + institute-scoped RLS; `timetable_slots.room_id uuid references rooms(id)`, purana `room` text backfill se map hoga aur read-only fallback ke roop mein rahega.
- `src/lib/api/index.ts`: `roomsApi` (list/create/update/deactivate); `timetableApi.list` mein `room:rooms(id,name,capacity)` join.
- `src/routes/app.timetable.tsx`: grid ko `<TimetableGrid axis="room" | "faculty">` mein refactor; conflict logic ek shared `src/lib/timetable/conflicts.ts` mein nikal jayega (`findConflicts`, `capacityWarnings`, `summarise`).
- `src/lib/whatsapp.ts`: `teacherDayMessage(faculty, slots, date)` helper.
- `src/components/app/timetable-slot-dialog.tsx`: room dropdown + 12-hour time labels.
- `src/routes/app.settings.tsx`: naya Classrooms tab.
- Playwright: room clash, teacher clash, aur teacher-view rendering ke liye test add.