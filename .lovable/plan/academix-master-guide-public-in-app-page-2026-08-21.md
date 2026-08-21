# Academix Master Guide — public in-app page

Build a public, printable training guide at `/guide` that any super admin, institute owner, teacher or parent can open and follow end to end.

## What the user gets

- A new public page `/guide` — "Academix Operating Guide".
- Sticky table of contents (14 sections) with in-page anchor scrolling on desktop; collapsible on mobile.
- Every section written as short checklist bullets (1–2 lines each), no long paragraphs.
- "Print / Save as PDF" button so it can be handed to an institute owner.
- Linked from the public site footer ("Guide") and from the marketing nav.

## Sections (exact order)

1. Super Admin overview — what they control, what they own
2. Platform setup — platform login (`/login/platform`), plans & pricing tab, institutes list, limits (rooms/students/staff)
3. Institute onboarding — create/approve institute, share access, first login walkthrough
4. Owner checklist — batches, subjects via syllabus, teachers, teacher-to-batch, students, batch assignment, parent details
5. Faculty setup — add teacher, invite link, assign batches/subjects, what a teacher can do (attendance, marks, syllabus progress)
6. Students & parents — add student or admission QR, approve, assign batch, family invite link, what parents see (attendance, fees, results, messages)
7. Fees & finance — batch fee, installment plan, scholarship/discount, collect payment, receipt, pending dues, cancel/reverse
8. Attendance — who marks it, daily flow, absent alerts, reports
9. Exams & results — create test, enter marks, publish/share result
10. WhatsApp & communication — message history, manual send, when to send each type
11. Dashboard usage — what to check daily, key numbers, "Needs you" actions
12. Daily / weekly routine — a simple table
13. Common mistakes to avoid
14. Best practices

Content will be written from the app as it actually works today (routes, roles and flows already in the codebase), so every instruction names the real screen the user must open.

## Technical notes

- New route `src/routes/guide.tsx` wrapped in the existing `MarketingShell` so header/footer match the public site.
- Content lives in a typed data structure in `src/lib/guide-content.ts` (sections → steps), rendered by the route — keeps the page file small and the copy easy to edit later.
- Route `head()` gets its own title, description, og:title, og:description, og:type, twitter:card.
- Add a `Guide` link to the footer in `src/components/marketing/marketing-shell.tsx`.
- Print styling via a small `print:` utility pass on the page (hide nav/TOC, keep content).
- No database, RLS or business-logic changes.
