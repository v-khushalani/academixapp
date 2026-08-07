# Logins for students & parents, real plan limits, filters, and biometric attendance

## 1. How does a student or teacher actually log in?

Today: a teacher gets a WhatsApp invite link, signs in with Google, and the invite claims their faculty row. A student who filled the admission QR form has **no account at all** — nothing links their `students` row to a login. That is the gap.

Fix: give students and parents the same invite mechanism teachers already have.

- When an admission is approved, Academix generates a **portal invite link** for that student (and optionally a separate parent link).
- The office sends it on WhatsApp with one tap from the student row and from the approval screen ("Send portal link").
- The family opens the link, sees "Continue with Google", and on return the token is claimed: the account is attached to that student (`students.user_id` for the student, a `parent_students` row for the parent) and the `student` / `parent` role is granted.
- Links expire (30 days), can be re-sent, and show status in the student list: Not invited / Invited / Active.
- Still no public sign-up for students or teachers — the institute's link stays the only door in.

A short "How logins work" card in Settings explains the three doors: staff sign in at the admin login, teachers via invite link, families via portal link.

## 2 & 3. Plan limits — students, classrooms, staff logins

What the market charges today (verified Aug 2026):

| Vendor | Model | Real cost |
| --- | --- | --- |
| Classplus | ₹2,000+/mo + setup ₹15–20k + revenue commission | ~₹40k+/yr for a small institute |
| Teachmint | Free app, everything operational gated behind quote | quote-only |
| MyClassCampus | ₹80–150/student/yr + ₹10–25k setup, biometric/RFID as paid add-on | ~₹45k/yr @300 students |
| Fedena | ₹80–150/student/yr + ₹5–10k setup | ~₹40k/yr @300 |
| Inforida | ₹78–182 per head per **month** | ₹936+/student/yr |
| Fuzen | ₹35,000 one-time launch offer | one-time |
| SchoolCare (budget) | ₹58/student/yr | cheapest incumbent |

The market floor is roughly ₹58–150 per student per year plus setup. Academix undercuts that decisively while capping only what creates genuine upgrade pressure: scale and automation.

| | Free forever | Growth | Campus | Chain |
| --- | --- | --- | --- | --- |
| Students | 100 | 500 | 1,500 | Unlimited |
| Classrooms | 3 | 10 | 30 | Unlimited |
| Staff logins (admin/reception/accounts) | 2 | 6 | 20 | Unlimited |
| Teacher logins | 5 | 25 | Unlimited | Unlimited |
| Parent/student portals | Unlimited | Unlimited | Unlimited | Unlimited |
| Batches | 5 | Unlimited | Unlimited | Unlimited |
| Price / year | ₹0 | ₹4,990 | ₹12,990 | Talk to us |

At 500 students, Growth is **₹10 per student per year** against ₹58–150 elsewhere, with no setup fee and no commission. Prices stay hidden on the public site ("Talk to us") as they are today; the super-admin console keeps the numbers.

Why anyone upgrades: Free gives the entire daily operation — admissions, attendance, fees, receipts, tests, syllabus, timetable, all three portals, manual WhatsApp. Growth adds scheduled automation, the reports suite, branded documents, bulk messaging, and hardware attendance. Campus adds per-staff permissions, audit log, analytics, API.

Limits are **soft and visible first**: a usage strip in Settings ("84 of 100 students · 2 of 2 staff logins") and a blocking dialog with "Talk to us" only when a limit is crossed on create. Nothing existing is ever locked out.

## 4. Filters on the students list

The list already filters by status and class. Adding: batch, approval status (enquiry / pending / approved / rejected), fee status (dues / clear), portal access (none / invited / active), and admission date range. Filters sit in a compact bar with active-filter chips and a Clear all; the search box and count line stay. Selected filters carry into CSV export.

## 5. RFID cards / biometric machines

Yes — and device-agnostic rather than tied to one brand.

- **Standard path (works with most Indian devices):** ESSL, Mantra, Realtime and similar machines can push punches to a URL. Academix exposes an ingest endpoint with a per-device secret token; each punch (card UID or fingerprint ID + timestamp) is matched to a student and written as attendance for that day, marked machine-sourced.
- **Card mapping:** each student holds an RFID/biometric ID. Bulk assign via CSV, or a "tap to enrol" screen where the office taps a card and it binds to the selected student.
- **Rules:** first punch of the day = present; punch after batch start time = late; no punch by cut-off = absent, which flows straight into the existing absentee WhatsApp nudge.
- **Fallback:** upload the machine's daily log file (CSV/DAT) on an Import screen; same matching logic.
- **Device registry** in Settings: name, location, token, last-seen heartbeat, punches today.
- Commercially this sits in **Growth and above** — MyClassCampus and Fedena both charge extra for it.

Hardware stays the institute's purchase; a recommended list (ESSL, Mantra ~₹6–12k) goes in the docs.

## Technical notes

- New `student_invites` table + `accept_student_invite(token)` security-definer RPC mirroring `faculty_invites` / `accept_faculty_invite`; creation restricted to office roles; claim links `students.user_id` or inserts `parent_students` and grants the role.
- `plan_catalog` gains `staff_login_limit`, `teacher_login_limit`, `batch_limit`; Free/Growth/Campus rows updated with the numbers above. A usage helper counts students, rooms, batches and role rows per institute for the Settings strip and create-time guards. Enforcement is advisory-plus-dialog, not hard RLS.
- `src/lib/plans.ts` limits realigned to the catalog so marketing and console never disagree.
- Students list filter state stays local, options derived from loaded rows; export uses the filtered set.
- Attendance devices: `attendance_devices` (hashed token, institute) and `student_device_ids` (uid → student); ingest at `src/routes/api/public/attendance/punch.ts`, verifying the device token inside the handler and writing via the admin client; idempotent on (device, uid, timestamp).