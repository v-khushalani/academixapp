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
