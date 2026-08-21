# Fix pack: sign-up, invites, dashboard, admissions

## 1. New institute sign-up is dead-ending

Today `/signup` creates the account with email + password and Supabase then waits for a confirmation email that never arrives (default email sending is rate-limited), so the owner can never sign in.

Fix: make sign-up Google-first, matching the rest of the platform.

- `/signup` asks only for **Institute name**, then "Continue with Google".
- The institute name is kept locally and, right after the Google redirect, the app calls the existing `create_institute_with_owner` function, which creates the institute and makes that Google account its owner. Then straight to `/app`.
- If the person already owns an institute, they simply land in their dashboard instead of getting an error.
- The email + password form stays as a hidden fallback link only; no confirmation-email dependency on the main path.

## 2. Invite links show "expired" (students, parents, teachers)

Confirmed cause: the four database functions behind invites (`get_student_invite`, `get_faculty_invite`, `accept_student_invite`, `accept_faculty_invite`) run with the visitor's own permissions. An invited person has no institute yet, so the security rules hide the invite row from them — the page concludes the link is used or expired, and even after Google sign-in the claim fails.

Fix (one migration):

- Convert all four functions to `SECURITY DEFINER` with a locked `search_path`, keeping the same checks (`used_at IS NULL AND expires_at > now()`) so a genuinely used or old link still reports as invalid.
- Grant execute on the two "read invite" functions to signed-out visitors and on the two "accept" functions to signed-in users only.
- Return only the minimum fields already returned (name, institute name, validity) — no extra data exposure.

After this, the WhatsApp links from both the Students tab and Admissions work end to end.

## 3. Dashboard redesigned to match the rest of the app

Rebuild `/app` (the admin dashboard) from scratch using the same visual language as Students / Fees / Batches: same page header, same card, border, radius and spacing tokens, same table/row treatment, Saira type scale, no bespoke stat styling.

Layout:
- Page header (greeting, institute, date) — identical to other pages.
- One row of four plain stat cards: Students, Attendance today, Absent today, Collected this month.
- One "Needs you" list styled exactly like existing list rows: pending applications, parents with dues, unmarked batches — each tappable.
- Absent alerts and the setup checklist stay, restyled to the standard card.
- The oversized bespoke "BigAction" tiles and the special stat section are removed.

## 4. Side navigation touch behaviour

Audit the sidebar on touch (iPad/phone): tap targets under 44px, hover-only affordances, the collapse rail reacting to hover instead of tap, and the mobile drawer not closing on selection. Fix by giving every nav row and the footer a full-height touch target, making the rail/trigger respond to a plain tap, and closing the mobile drawer on navigation.

## 5. Admissions clean-up

- **QR tab**: remove the URL text, Copy / Open / Print buttons under each QR, and remove the "How the admissions funnel works" explainer block. Only the two QR cards with their one-line labels remain.
- **Faculty tab**: remove the blue "Giving teachers portal access" instruction box.
- **Applications vs Follow-ups**: keep both tabs (Applications = forms waiting for your approval; Follow-ups = enquiries and walk-ins still being chased), but rename the sub-heading copy so the difference is obvious at a glance and drop the long description under the page title.
- **"Fill the form myself"**: keep it — desk walk-ins need it — but fix the batch dropdown. It currently only lists batches whose class exactly matches the typed class text, so a student in "5" sees nothing while the only batch is "Class 10". The dropdown will list all active batches, with matching-class ones shown first, and the class field becomes the same standardised grade picker used elsewhere so text never mismatches.

## Technical notes

- One migration: `SECURITY DEFINER` + `search_path` + grants on the four invite functions.
- `src/routes/signup.tsx`, `src/lib/post-auth.ts` (claim pending institute name after Google), `src/components/auth/google-button.tsx` if it needs a payload.
- `src/routes/app.index.tsx` rewritten; `src/components/app/dashboard/dashboard-cards.tsx` reduced to shared primitives.
- `src/components/ui/sidebar.tsx` + `src/components/app/sidebar.tsx` for touch.
- `src/routes/app.admissions.tsx` (QR panel, tab copy), `src/routes/app.faculty.tsx` (instruction box), `src/components/app/student-form-dialog.tsx` (batch options + grade picker).
