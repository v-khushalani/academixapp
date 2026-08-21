# Academix — access control, verified onboarding, and pricing control

Five workstreams. Test accounts (admin@ / teacher@ / student@ / parent@ / superadmin@academix.website, `test@123`) stay live for your audit and get removed in a later pass, so password sign-in stays available for now.

## 1. Retire the old portal URLs properly

Today `/login/admin`, `/login/teacher`, `/login/student`, `/login/platform` exist only as redirect stubs.

- Delete all four route files.
- Add one catch-all `/login/$` route that forwards any stray old link to `/login`, so printed QR codes and WhatsApp links never dead-end.
- Sweep the codebase for every remaining reference to those paths (marketing shell, portal picker, guide content, invite emails/links, tests) and point them at the current URLs: `/login`, `/join/$token` for faculty invites, `/welcome/$token` for student and parent invites, `/apply` and `/onboard/$token` for admissions.

## 2. Invite-only accounts, approval before access

Rules to enforce end to end:

- Only an institute owner/admin can bring people in. Faculty come from a faculty invite link or QR; students and parents from a student invite link or QR, or by submitting the public admission form.
- A newly signed-in invited person is **pending** until an admin approves. Until then they see a "waiting for approval" screen, not a dashboard — no role row is granted, so they can read nothing.
- Approving a student or faculty member in the admin screens is what grants the role and unlocks the portal. Rejecting revokes it.
- Signup at `/signup` is restricted to institute owners creating a new institute. No other path can create an account with access.
- The single `/login` page keeps the Google button first; the password form stays for now and is behind a small "Use password instead" toggle so the intended path is obvious. Removing it later is a one-line change.

## 3. Aadhaar-based auto-fill — the free path

There is no free real-time Aadhaar API for a private company: UIDAI's Authentication/eKYC APIs are for licensed AUAs/KUAs, and resellers (Cashfree, Signzy, Karza) charge per verification. Two genuinely free routes exist, and I recommend using both in one flow:

**A. Aadhaar Secure QR scan (primary, zero cost, zero onboarding).** Every Aadhaar card and e-Aadhaar PDF carries a UIDAI-signed QR. The student scans it with their phone camera inside the admission form. We decode it in the browser and auto-fill name, date of birth, gender, address, photo, and the last 4 digits of the Aadhaar number. It is offline, signed by UIDAI, and free forever.

**B. DigiLocker (optional upgrade).** Free for registered entities but needs partner onboarding with NeGD, which takes weeks. Planned as a pluggable second source, not built now.

Flow in the admission form:

```text
Scan Aadhaar QR  ->  fields auto-fill (name, DOB, gender, address, photo)
                 ->  student can edit ANY field (govt records have errors)
                 ->  we store: last 4 digits + "verified via Aadhaar QR" flag
                     + which fields the student changed after auto-fill
                 ->  admin sees a "Aadhaar verified" badge and a list of
                     edited fields, so tampering is visible before approval
```

Privacy and compliance, non-negotiable: we never store the full Aadhaar number, never store the raw QR payload, and we take an explicit on-screen consent tick before scanning. Duplicate detection uses a one-way hash of the Aadhaar number, so the same person cannot create two accounts in one institute — without us holding the number itself.

Dummy mode for your audit: a "Simulate scan" button fills sample data so the whole flow is testable without a real card.

## 4. Pricing and limits controlled from the super admin panel

Market research on Indian coaching ERPs (Classplus, Teachmint, MyClassboard, Entab, Vidyalaya) to set defensible tiers, then rebuild the compare table around the numbers you actually enforce: students, classrooms, batches, office logins, teacher logins, plus feature ticks.

The key fix: today the super admin edits `plan_catalog` / `plan_features`, but plan limits also live hardcoded in the app. After this change the database is the single source of truth — the public pricing page, the in-app usage meters, and the server-side limit checks that block adding the 101st student all read the same rows. Editing a number in the console changes what customers see *and* what the system enforces, immediately.

## 5. Fix the leaking institute (your VK International bug)

Confirmed cause: institute settings — name, logo, colours — are cached in the browser's local storage under one shared key with no account attached, and the loader that refreshes them asks for "the institute" without saying which one. So the demo academy's branding stayed on screen after you signed in as super admin, and for a super admin (who can see every institute) the loader picks an arbitrary row.

Fixes:

- Key the cache per signed-in user and clear it on sign-out and on account switch.
- Load the institute explicitly by the signed-in user's own `institute_id` instead of "whichever row comes back".
- Super admin never loads institute branding at all — signing in as super admin lands on the platform console, with the neutral Academix theme. No institute dashboard, no institute logo.
- Saving settings writes to the caller's institute by id, never to "the first row".

## Technical notes

- Routes: delete `src/routes/login.{admin,teacher,student,platform}.tsx`, add `src/routes/login.$.tsx` catch-all.
- Approval gate: a shared `pending-approval` screen used by `app.tsx`, `teach.tsx`, `portal.tsx` when a session exists but no role row does; invite acceptance RPCs create a pending record rather than granting the role directly, and `approve_admission` / faculty approval grant it.
- Aadhaar: client-side secure-QR decode (no server round trip, no raw payload persisted); new columns for `aadhaar_last4`, `aadhaar_verified_at`, `aadhaar_hash` (unique per institute), `aadhaar_edited_fields`; consent captured before scan.
- Pricing: `src/lib/plans.ts` becomes a fallback only; `plan_catalog` limit columns drive `check_plan_limits()` and the usage UI. Super admin edits already write to those tables.
- Institute cache: namespace the local-storage key by user id, filter `hydrateInstitute` / `saveInstitute` by `current_institute_id()`, and skip hydration entirely for super admins.
