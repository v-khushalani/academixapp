# Academix — Multi-Institute ERP Platform Plan

Two distinct products, one codebase:

- **Academix** — the SaaS platform (marketing site, signup, billing, super-admin).
- **VK Academy** — the first tenant/institute using Academix (our own institute, our own dogfooding client).

---

## 1. Mental Model

```text
                 ┌──────────────────────────────┐
                 │  academix.app (marketing)    │
                 │  - Landing, pricing, login   │
                 │  - Institute signup          │
                 │  - Super-admin console       │
                 └──────────────┬───────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
       ┌────────▼──────┐ ┌──────▼───────┐ ┌────▼─────────┐
       │ VK Academy    │ │ Institute B  │ │ Institute C  │
       │ (tenant #1)   │ │ (subscriber) │ │ (subscriber) │
       └───────────────┘ └──────────────┘ └──────────────┘
```

Every institute lives in the same database, isolated by an `institute_id` column + RLS. VK Academy is just the first row in the `institutes` table.

---

## 2. Rebrand (Phase 1 — visible immediately)

- Rename product everywhere from "VK Academy" to **Academix** on the marketing/landing surface, auth pages, sidebar header, meta tags, favicon, `<title>`, README, etc.
- Inside a signed-in tenant, header/sidebar show **that tenant's** name (e.g. "VK Academy") — Academix branding stays on the public/platform chrome.
- New public routes:
  - `/` — Academix landing (product marketing, aimed at other institutes)
  - `/pricing` — subscription tiers
  - `/for-institutes` — features / pitch
  - `/signup` — institute signup (creates an institute + owner user)
  - `/login` — unchanged
- Tenant app stays under `/app/*`.

## 3. Multi-Tenant Data Model (Phase 2)

New table `institutes` with fields like: name, slug, contact email/phone, address, plan, subscription status, trial ends at, primary color, logo path.

Add `institute_id uuid not null references institutes(id)` to every tenant table:
`students, batches, faculty, fees, tests, test_results, attendance, timetable_slots, courses, subjects, leads, user_roles`.

Add `institute_members(institute_id, user_id, role)` — replaces global `user_roles` for tenant roles. A user can belong to multiple institutes with different roles. `owner/admin/faculty/receptionist/accountant` become **per-institute** roles.

Add a new **platform-level** role `platform_admin` (us) that can see all institutes for support.

Backfill: create a "VK Academy" institute row and stamp every existing record with that `institute_id`.

## 4. Tenant Isolation (RLS rewrite — Phase 2)

- Helper `current_institute_id()` reads it from JWT app_metadata or a `set_config` per request.
- Every tenant table's policies become: `institute_id = current_institute_id() AND has_role_in_institute(auth.uid(), institute_id, ...)`.
- Storage (`student-photos`) namespaced by `institute_id/<student>/…`; policies check membership.
- Signup RPC `create_institute(name, slug)` — creates the institute, adds caller as `owner`, starts trial.

## 5. Tenant Context in the App (Phase 3)

- On login, load institutes the user belongs to. If more than one → institute switcher; if one → auto-select.
- Store active `institute_id` in a React context + localStorage; attach to every query via a Supabase client wrapper.
- `useAuth()` becomes `useAuth()` + `useInstitute()` (id, name, plan, branding).
- Sidebar/topbar shows the active institute's name and logo; Settings → Institute Details edits it (already 80% built via `academy-settings.ts` — moves from localStorage into the `institutes` row).
- Branding (`--primary`, logo) sourced per-tenant from DB, not localStorage.

## 6. Subscriptions & Billing (Phase 4)

- Plans: **Starter / Growth / Pro** (define caps on students, faculty, storage).
- Payments via built-in Stripe payments (recommend enabling later, when we're ready to charge).
- Subscription status on `institutes` row → gate `/app` access when `past_due` or `expired` with a friendly upgrade screen.
- Trial: 14 days on signup.

## 7. Super-Admin Console (Phase 5)

Route `/platform/*`, gated by `platform_admin` role:
- List institutes, plan, MRR, active users, last activity.
- Impersonate / view-as (read-only) for support.
- Toggle plan, extend trial, suspend.

## 8. Sales & Go-To-Market Surface (Phase 6)

- `/for-institutes` with real screenshots of VK Academy running on Academix (proof).
- "Book a demo" form → leads table on our platform-admin side.
- Referral field on signup so VK Academy staff can bring other coaching institutes.

---

## 9. Suggested Rollout Order

1. **Rebrand** (Phase 1) — safe, cosmetic, ships today. VK Academy keeps working.
2. **Multi-tenant schema + backfill** (Phase 2) — biggest change; do this as one migration with VK Academy as the seed institute.
3. **Tenant context wiring** (Phase 3) — app becomes truly multi-tenant; still only one tenant live.
4. **Public signup + landing** (part of 1/2) — other institutes can self-serve create a workspace (free trial).
5. **Billing** (Phase 4) — turn on when we're ready to charge.
6. **Super-admin console** (Phase 5).
7. **Marketing polish + outreach** (Phase 6).

---

## 10. Technical Details (for reference)

- Stack unchanged: TanStack Start + Supabase + Tailwind.
- Tenant id resolution: prefer JWT claim (`app_metadata.institute_id` per-session, set on switch via an edge/server fn) → passed to Postgres via RLS helper. Fallback: header set by a TanStack server middleware.
- Migration strategy: additive columns first (nullable) → backfill VK Academy id → set NOT NULL → replace RLS policies in one transaction.
- Keep `user_roles` table for `platform_admin` only; move tenant roles to `institute_members`.
- Storage key format changes → write a one-shot migration script to move existing `student-photos/*` under `vk-academy/*`.
- Domain plan: `academix.app` for platform; optional per-tenant subdomain like `vk.academix.app` later (Phase 6+).

---

## What I need from you before starting Phase 1

1. Confirm the name **Academix** is final (no trademark check done yet — worth a quick search).
2. Any tagline preference for the Academix landing? (e.g. "The operating system for modern coaching institutes.")
3. OK to start with Phase 1 (rebrand only, zero DB changes) so you see it live today, then tackle Phase 2 (multi-tenant DB) in the next round?
