# Cleanup: super admin duplication, pricing CTA, Supabase keys

## 1. Super admin — remove the repeats

Today the same controls appear in more than one place:

- **Per-institute feature editing** exists twice: in Features tab ("One institute at a time" picker) and in Institutes → Open → Plan & features. Keep it **only inside the institute detail**; the Features tab keeps just the network-wide kill switches and a line pointing to Institutes for per-institute exceptions.
- **Overview panels** repeat the Institutes table: "Plan mix", "Close to their limit", "Needs attention" and "Biggest institutes" all list institutes. Merge into one "Institutes needing action" list (near limit + suspended, badged) and keep "Plan mix" as a compact strip inside the KPI row. Drop the "Biggest institutes" table — the Institutes tab already sorts and shows the same columns.
- **Branch/parent dropdown** is rendered in both mobile card and desktop row and again in institute detail. Keep it in institute detail only; the list shows "Branch of X" as plain text.
- **Plan name / status badges** are printed twice per row (Plan column plus the sub-line). Collapse to one.

Net effect: Overview = numbers + what needs action; Institutes = the list and every per-institute control; Plans & pricing = the matrix; Features = network switches only.

## 2. Pricing — kill the "Talk to us" repetition

"Talk to us" currently appears five times on /pricing (price line, button, footnote, FAQ answer, and the pricing-admin label). Replace with one clear ladder:

- Paid plan cards show **"Custom pricing"** as the price line and a single primary button **"Book a 10-min walkthrough"** (mailto stays behind it). Free plan keeps "Free forever" + "Create your institute".
- Delete the footnote link and the multi-year FAQ answer's repeated phrase — rewrite as "Longer terms get a better rate, locked for the term."
- Add one **contact strip** at the bottom of the page (single place to reach us): phone + email + "Book a walkthrough". The final CTA block becomes that strip instead of a second sign-up card.
- Give the paid cards something concrete instead of a price: student/classroom limits (already available) plus a one-line "Best for…" from the plan tagline.

## 3. Supabase keys — the complete list

Nothing is missing in the editor/preview environment; all five values resolve here. The "Missing Supabase environment variable(s)" message appears when the **published** site is built without them. What the app uses:


| Where                                                                        | Variable                                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Browser (build-time)                                                         | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` |
| Server rendering / server functions                                          | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                                       |
| Privileged server work (admissions photo/provisioning, attendance punch API) | `SUPABASE_SERVICE_ROLE_KEY`                                                      |


Plan of action: re-bind the Supabase runtime secrets, republish, then load the published URL and confirm no missing-variable error. If it still appears there, the fix is on the Supabase side (project keys rotated) and I'll say so rather than patching around it.

## Technical notes

- Files touched: `src/routes/app.platform.index.tsx`, `app.platform.institutes.tsx`, `app.platform.features.tsx`, `src/components/app/platform/institute-detail.tsx`, `src/routes/pricing.tsx`, `src/components/app/pricing-admin.tsx` (label only).
- No schema change, no RPC change; `platform_set_parent` keeps its single call site in institute detail.
- Key binding uses the Supabase rebind tool; no key is ever written into code or `.env` by hand.

Also check if custom branding works perfectly fine