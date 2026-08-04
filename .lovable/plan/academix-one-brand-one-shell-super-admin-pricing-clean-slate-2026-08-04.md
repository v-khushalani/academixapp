# Academix — one brand, one shell, super-admin pricing, clean slate

## 1. Shared marketing shell (brand consistency)

One `MarketingShell` used by landing, Features, Pricing, Sign in chooser and Start free:

- Same sticky header everywhere: Ax logo → Features · Pricing · Sign in · Start free.
- Active page gets highlighted instead of the other links disappearing — nav stays complete on Features and Pricing.
- Mobile/tab: hamburger sheet with the same four links, nothing drops off.
- Same footer, type scale, spacing rhythm and card/border tokens on every public page.

Result: landing → features → pricing → sign in → start free feels like one product, no orphan pages.

## 2. Pricing page — short, comparison-first

Replace the long page with:

- One headline, one line of sub-copy.
- Three plan cards (Free / Growth / Campus), yearly price only. No 1/3/5-year switch — the 3 and 5-year deals move to the sales call. Chain becomes a single "Multi-branch? Talk to us" line.
- One comparison table, tick / cross style: rows = features, columns = Free, Growth, Campus. Tick = included, cross = not included, short text where a number matters (students, classrooms).
- Short FAQ, 4 items max. The long roadmap, competitor matrix and marketing essays are removed.
- Table scrolls horizontally on mobile with the feature column pinned.

## 3. Super admin controls pricing

New `plan_catalog` table (one row per plan: name, yearly price, student limit, room limit, tagline, order, visible) plus `plan_features` (feature label, group, and per-plan included / not-included / text value).

- The public pricing page reads this from the database, so whatever the super admin sets shows live.
- Platform console (`/app/platform`, super admin only) gets a Pricing tab: edit prices and limits inline, toggle each feature tick/cross per plan, add/remove/reorder feature rows.
- `src/lib/plans.ts` stays only as the seed/fallback shape; in-app limit checks read the catalog.

## 4. Accounts: no public self-signup for students & teachers

- Sign-in chooser and all three login pages: no "create account" link for teacher / student / parent. Instead: "Your institute will send you a login link."
- Start free / create account stays for institutes (owner) only.
- Teacher and student accounts keep coming from the institute's invite and onboarding links.

## 5. Everything connected

A pass over the public and in-app link graph: every header, footer, empty state and CTA points at a real route; login/signup have a working way back to landing; pricing CTAs go to institute signup; features cross-links to pricing. Any dead or mismatched link gets fixed.

## 6. Mobile & tablet pass

Public pages plus the heavy app screens (timetable, tables, dialogs) checked at phone and iPad widths — scroll containers, stacked cards, tap targets.

## 7. Wipe all dummy data

Delete every institute and all its data — students, batches, fees, attendance, tests, timetable, syllabus, rooms, faculty, invites, profiles, role rows — keeping only your super-admin login. You then create your real institute fresh from signup.

## Technical notes

- Migration A: `plan_catalog` + `plan_features` with GRANTs (anon read for the public pricing page, writes restricted to super admin), seeded from current plan values.
- Migration B: cleanup — truncate all tenant tables and remove non-super-admin auth users.
- Pricing page loads the catalog through a public server function (publishable key + anon SELECT policy) so it stays SSR-friendly and shareable.
- Marketing shell at `src/components/marketing/marketing-shell.tsx`; adopted by `index.tsx`, `for-institutes.tsx`, `pricing.tsx`, `login/*`, `signup.tsx`.