# Production prep: clean database, test accounts, single login, new landing page

## 1. Full database wipe

Everything goes — all app data and all auth users, including your own Google account. After this the project is empty except the seed below.

- Delete all rows from every tenant table (students, batches, fees, attendance, tests, results, timetable, rooms, syllabus, homework, leads, faculty, invites, expenses, notification logs, parent links, device IDs, user_roles, profiles, institutes).
- Delete every user in Supabase Auth.
- `plan_catalog` and `plan_features` (your pricing definitions) are kept — they are platform config, not customer data.

You will sign back in with `superadmin@academix.website` afterwards; your Google account can be re-added as superadmin any time.

## 2. Test accounts

Password for all five: `test@123`. Emails pre-confirmed so no email link is needed.

| Email | Role | Lands on |
| --- | --- | --- |
| superadmin@academix.website | Academix superadmin | Platform console |
| admin@academix.website | Institute owner/admin | Admin dashboard |
| teacher@academix.website | Faculty | Teacher portal |
| student@academix.website | Student | Family portal |
| parent@academix.website | Parent | Family portal |

One demo institute ("Demo Academy", Free plan) is created with a minimal working spine so no screen is empty: 1 room, 1 batch with a fee, the teacher linked to that batch, 1 timetable slot, the student enrolled in the batch, the parent linked to that student.

## 3. Login: single page (recommended) — what changes

**My recommendation: one login page.** Reasons:

- Users forget which portal they belong to. Today a teacher on the admin page gets signed out and shown an error — pure friction, zero security value (roles are enforced by RLS in the database, not by which page you used).
- Google sign-in makes multi-page login worse: one button, one account, the page you started on is irrelevant.
- One page = one URL to print on invites, WhatsApp messages and the fee receipt footer.
- Support: "go to academix.website and sign in" instead of explaining three doors.

Implementation:

- `/login` becomes the single sign-in page: email + password, Google button, forgot password. After sign-in it reads your roles and redirects — superadmin → `/app/platform`, staff → `/app`, faculty → `/teach`, student/parent → `/portal`. No account with a role is ever rejected.
- Accounts with no role yet see a friendly "your institute hasn't activated your access" screen instead of being signed out.
- `/login/admin`, `/login/teacher`, `/login/student`, `/login/platform` stay alive as permanent redirects to `/login`, so old invite links and printed links keep working.
- The portal picker moves out of the sign-in path; it stays as an explanatory block on the landing page only.

## 4. Landing page: minimal and high-impact

Current problem: the top bar (Features · Pricing · Guide · Sign in · Start free) gives five competing choices before the visitor knows what Academix is. "Guide" especially is internal documentation, not a sales asset.

**New header:** wordmark on the left, `Sign in` (text link) and `Start free` (solid button) on the right. Nothing else. Pricing and Features become sections/pages linked from the body and the footer; Guide moves to the footer only.

**New page structure** — one clear message per scroll, one repeated action:

1. **Hero** — a concrete promise, not a feature list: headline about running the whole institute (admissions → attendance → fees → parents) in one place, one sub-line, one primary button `Start free`, one quiet secondary `See how it works`. Plus a real product screenshot of the dashboard instead of abstract copy.
2. **Trust strip** — plain line: built with a running coaching institute, works on phone/tablet, data isolated per institute.
3. **Three outcome blocks** (not 12 features): *Fees collected on time* (auto fee per batch, UPI QR, WhatsApp reminders), *Attendance parents can see* (one-minute marking, absent alert to parent's WhatsApp), *Teachers and parents on the same page* (teacher portal, family portal, timetable, marks). Each with a small visual.
4. **Portals** — the existing 3-portal picker, reframed as "who logs in", not as a login gate.
5. **Pricing teaser** — plan names and limits with "Talk to us" (prices stay hidden as decided) and a link to `/pricing`.
6. **Objection FAQ** — 5 short answers: data migration, do teachers need training, does it work on phone, is our data private, what if we stop.
7. **Closing CTA** — repeat `Start free` with the setup-time promise.

**Removed:** duplicate CTAs mid-scroll, generic feature grids, anything that sends the visitor away before the sign-up button.

Mobile: hero at ~one screen height, full-width buttons, no horizontal scroll; checked at 390 / 820 / 1440 px.

## 5. Verification pass

Log in as each of the five accounts in a real browser and confirm the redirect lands on the right dashboard and the first screen renders with data (not blank). Anything broken in that pass gets fixed in the same step, with a short report.

## Technical notes

- Wipe via a migration (`TRUNCATE ... CASCADE` on tenant tables) plus Auth Admin API deletion of all users; seed accounts created with `email_confirm: true`, then `user_roles`, `faculty`, `students`, `parent_students` rows inserted for the demo institute.
- `homeForRoles()` in `src/lib/post-auth.ts` already resolves the destination — the single `/login` reuses it, so password and Google flows share one redirect path.
- `LoginCard` loses its `kind` gating; the old portal routes become thin redirect routes.
- Landing work is presentation-only: `src/routes/index.tsx` and `src/components/marketing/marketing-shell.tsx`; no change to pricing data or RLS.
