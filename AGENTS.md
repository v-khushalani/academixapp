<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->
- Paid add-ons (e.g. material_engine) are listed in OPT_IN in src/lib/features.ts: OFF unless the institute features map is explicitly true; DB RLS re-checks via institute_has_material_engine() (also blocks Free plan). Why: paid features must never leak to free/unflagged tenants.
- Scope staff role writes to the RPC-resolved active institute and attendance-device lookups to institute, student, batch and date; this prevents cross-branch writes and ambiguous multi-batch attendance.
- Send valid student/parent OAuth invites back to the existing welcome page before claiming them; this keeps the activation confirmation in the normal sign-in flow.
- Fee collection uses a validated server function and a tenant/actor-bound idempotent transaction for collection plus carry-forward; this prevents committed-but-error duplicate retries.
- Protect the whole student's fee schedule after audited adjustments and skip automatic rebuilds of protected schedules; preserving negotiated amounts takes precedence over regeneration.
- Plan catalog edits never propagate automatically; explicit pushes fill missing feature defaults and preserve institute limits and switches.
- Study material preview and print use the same browser-measured A4 page shells and isolated document styles; keep pagination in the browser-safe material-pages module so fonts, equations, headers and footers use identical measurements.
