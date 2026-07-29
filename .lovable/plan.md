## Problem

Aaj timetable 8 AM–8 PM ka 30-minute grid banata hai — 24 rows, 24-hour times, aur lamba scroll. Real life mein sirf do shifts chalti hain aur period 1 hour (ya 12th ke liye 1.5 hour) ka hota hai.

## 1. Shifts (tabs)

Grid ke upar do tabs: **Morning** and **Evening**. Ek time pe sirf ek shift ka grid render hoga, isliye page scroll nahi karega.

Har shift ke teen settings (edit karke Settings → Institute mein save honge, taaki har baar set na karna pade):


| Shift   | Start   | End      | Period length |
| ------- | ------- | -------- | ------------- |
| Morning | 7:00 AM | 11:00 AM | 60 min        |
| Evening | 3:00 PM | 7:00 PM  | 60 min        |


Rows exactly period length ke hisaab se bante hain — evening 3–7 PM @ 60 min 

## 2. Clean rows, no half-slots

- Grid step = shift ka period length. Ek class = exactly ek cell.
- Class builder aur batch palette ka "duration" dropdown hat jayega — duration shift se aayega (Morning = 90 min ke kuch session and 60 min ke kuch sessions hai (11th ka 60 min session and 12th ka 90 min), Evening = 60). Ek chhota override abhi bhi rahega agar kabhi alag chahiye.
- 12th wali batches evening shift mein drop hongi, isliye automatically 1.5 hour ki ho jayengi.

## 3. 12-hour time everywhere

Grid row labels, slot cards, WhatsApp share text, teacher "Today" screen aur student portal timetable — sab jagah `3:00 PM` format. DB mein 24-hour hi store rahega (koi migration nahi); sirf display badlega ek shared `formatTime12()` helper se.

## 4. Baaki behaviour same

Drag-and-drop, room/teacher/batch conflict blocking, edit/delete, WhatsApp share — jaise hain waise hi chalenge. Jo slots shift window ke bahar hain unke liye tab par ek chhota "2 slots outside shift hours" badge dikhega taaki data chhupe nahi.

## Technical notes

- `src/routes/app.timetable.tsx`: `buildBands` ko shift-driven banana, `startHour/endHour/slotMinutes` inputs ko shift tabs + per-shift settings se replace karna, `covered` logic hataana (ab zaroorat nahi).
- New `src/lib/time.ts` with `formatTime12()`, consumed by timetable, `timetable-slot-dialog.tsx`, `teach.index.tsx`, `portal.timetable.tsx`.
- Shift config `academy-settings.ts` mein (localStorage cache + `institutes` row) — ek nayi `shifts` JSON column ki migration lagegi.
- Playwright timetable test ka slot-count assertion shift tabs ke hisaab se update hoga.