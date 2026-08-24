# Full launch audit: reset, demo environment, role-by-role testing

Everything currently in the database (2 institutes, 5 students, 7 login accounts, 6 fee rows, 6 message logs) is deleted. A throwaway demo environment is built in its place, every role is driven like a real user, and you get a brutally honest report. The demo data is wiped again at the end so you launch empty.

## 1. Reset

- Delete all tenant data and all login accounts, in dependency order, so no orphan rows survive.
- Keep the plan catalog and comparison-table rows (that is your pricing configuration, not data).
- Confirm afterwards that every table is empty and every foreign key and access rule is still in place.

## 2. Demo logins (email + password)

Sign-in is Google-only today, which is why the requested demo emails cannot log in. Change:

- Turn on email + password sign-in alongside Google, and add an email/password form on `/login` under the Google button.
- Google stays the default and the recommended path for real institutes; the password form is what makes demo and test accounts usable.

Accounts created (password `test@123` for all):

| Role | Email |
| --- | --- |
| Super admin | demo_superadmin@academix.com |
| Owner, Alpha Coaching | admin.alpha@academix.com |
| Owner, Beta Academy | admin.beta@academix.com |
| Teachers | teacher1..3.alpha@ / teacher1..5.beta@academix.com |
| Student | student1.alpha@ / student1.beta@academix.com |
| Parent | parent1.alpha@ / parent1.beta@academix.com |

## 3. Demo environment

- **Alpha Coaching** (small, Free plan): 3 teachers, 20 students, 3 batches, 3 classrooms, timetable, syllabus chapters.
- **Beta Academy** (medium, Growth plan): 5 teachers, 30 students, 5 batches, 6 classrooms, timetable, syllabus chapters.
- Students spread across batches; parents linked to students; a few pending admission applications and enquiries in each.

Mock data per institute:
- **Fees** — batch fee with instalments; a mix of fully paid, part paid, pending and overdue, with receipts.
- **Attendance** — 30 days of past records with realistic present/absent/late mix.
- **Tests** — 2-3 tests per batch with marks entered and results visible.
- **Messages** — sent, queued and failed WhatsApp log entries.
- **Salaries and expenses** — teacher salary entries (paid and unpaid) plus rent/utility expenses.

## 4. Testing (real-user simulation, not assumptions)

Each role is signed in for real in a headless browser and clicked through:

- **Super admin** — institute list and counts, plan upgrade and limit changes, drilldown into an institute, pricing console, and a hard check that it never leaks one institute's data into another.
- **Admin** — dashboard numbers vs the real rows, students (add, edit, filter, import, export), admissions and approval, batches, attendance, fees (collect, revise, cancel, receipt print, payment QR), tests and marks, teachers and invites, salaries, expenses, messages queue, settings and branding.
- **Teacher** — login, own batches only, mark attendance, enter marks, update syllabus.
- **Student / parent** — login, own attendance, own fees, own results, notifications, and confirmation that no other student is visible.

Every screen is also checked on a phone-sized viewport, since almost all your users are on mobile.

## 5. Edge cases, security, performance

- Empty states on every screen; long lists; invalid and abusive input.
- Cross-institute access attempted directly against the database as each role — any row that comes back that shouldn't is a critical finding.
- Plan limits enforced (adding past the student/batch/teacher cap must be blocked with a clear message).
- Slow-query report reviewed; obvious missing indexes and slow screens noted with timings.
- Security scan and database linter run; findings triaged.

## 6. Report and fixes

You get one structured report: issues grouped as bug / UX / security / performance, each with severity (Critical, Medium, Low), the exact cause and where the fix goes, plus a list of what is confirmed stable and a short list of high-impact polish suggestions.

Critical and Medium issues that are safely fixable are fixed in the same pass and retested. Anything that needs a product decision from you is flagged rather than guessed.

## 7. Cleanup

After the report, all demo institutes, demo data and demo accounts are deleted so you launch with a clean database. The email/password login option stays (it is a real capability, and useful for support).

## Technical notes

- Reset via SQL delete in FK order across all tenant tables plus `auth.users`; `plan_catalog` and `plan_features` preserved.
- Demo accounts created through the Supabase Auth admin API with confirmed emails; roles inserted into `user_roles` scoped to each institute.
- Data seeded with SQL so the fee/instalment triggers and `sync_student_batch_fee` run exactly as they do in production.
- Role testing uses Playwright with a real session per role; isolation checks additionally run direct queries under each role's token.
- Email/password sign-in requires enabling the provider in Supabase Auth and a small form addition in `src/components/auth/login-card.tsx`.
