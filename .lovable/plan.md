# Production audit — Academix

Short answer: the product is feature-complete and typechecks clean, but it is **not yet safe to sell to multiple institutes**. One real data-isolation hole and a few missing commercial guardrails must be closed first. Everything below is verified against the live database and code.

## Blockers (fix before onboarding a paying institute)

**1. Cross-institute data leak — highest priority**
`current_institute_id()` falls back to "the oldest institute in the table" when a signed-in user has no institute assigned. Every RLS policy (students, fees, batches, attendance, everything) is built on this function. Verified: 1 user role row currently has no institute, and the DB has 2 institutes. Result: a freshly signed-up user, or any user mid-provisioning, is treated as a member of someone else's institute and can read their data.
Fix: return NULL instead of the fallback, then check the paths that quietly relied on it (signup, super admin, invite claims) and make each one explicit.

**2. Plan limits are decorative**
Students / rooms / batches / staff logins are counted and shown in Settings, but nothing stops an institute from exceeding them — there is no server-side check. On a paid plan model, everyone stays on Free forever.
Fix: enforce limits in the database (triggers) for students, batches, rooms and role grants, with a clear "upgrade your plan" message in the UI.

**3. Public photo bucket is abusable**
The `applicants can upload their photo` policy lets anyone (not signed in) write any filename under `applicants/` in `student-photos`, with no size cap and no ownership binding. Anyone can overwrite another applicant's photo or dump files into your storage bill.
Fix: bind uploads to a server-issued token path, add a bucket file-size limit, keep the extension whitelist.

**4. Leaked-password protection is off**
Supabase auth setting; one toggle. Turn it on so known-compromised passwords are rejected.

## Should fix before scale

- **Portal account provisioning breaks past 1000 users.** `provisionPortalAccounts` lists auth users with `perPage: 1000` and scans the array to find an existing email. Replace with a direct lookup.
- **Leftover test data.** The live DB currently holds 2 institutes, 11 users, 15 students, 20 fee rows. Decide what is demo vs real and wipe the demo tenant before the first customer lands.
- **Code formatting drift.** 2358 lint errors, all Prettier formatting (zero type errors — the app is type-safe). One format pass clears them and keeps future diffs readable.
- **No error monitoring.** When a customer says "it broke", there is no trace today. Add lightweight client + server error reporting.

## Commercial readiness (non-code, but blocks selling)

- Terms of service, privacy policy and a refund/cancellation page — institutes will ask, and payment processors require them.
- A documented backup/restore answer: what happens if an institute deletes a batch by mistake.
- A support channel surfaced in-app (WhatsApp/email), alongside the super-admin support lookup you already have.
- Onboarding: a new institute lands in an empty workspace today. A short guided setup (institute details → rooms → batches → fee plan → invite staff) materially cuts churn.

## Suggested order

1. Tenant isolation fix, then re-run the existing Playwright suites for every role.
2. Storage policy tightening + leaked-password toggle.
3. Server-side plan enforcement.
4. Provisioning lookup fix, demo-data wipe, formatting pass, error monitoring.
5. Legal pages + guided onboarding.

## Technical notes

- Isolation fix is a migration replacing the `public.current_institute_id()` body with the `user_roles` lookup only; no policy rewrites needed since all policies call the function.
- Plan enforcement belongs in `BEFORE INSERT` triggers reading `institutes.plan` against `plan_catalog` limits, so the browser cannot bypass it.
- `src/lib/usage.ts` stays the display layer, reading the same numbers the triggers enforce.