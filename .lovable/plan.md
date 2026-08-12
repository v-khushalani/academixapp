# Multi-tenant Security Hardening Plan

The objective is to fix cross-institute data leakage by reinforcing RLS policies and ensuring that `user_roles` and `profiles` are strictly scoped to the current institute, except for Super Admins.

## User Review Required

> [!IMPORTANT]
> The current multi-tenant implementation relies on `public.current_institute_id()` which selects the first `institute_id` from `user_roles`. For users with multiple branches, we must ensure they are properly scoped to the branch they are currently viewing.

- **Isolation Strategy**: We will use a `RESTRICTIVE` policy pattern for all tenant tables.
- **Role Management**: The "Users & Roles" panel will be updated to show only members associated with the current institute's ID.

## Proposed Changes

### Database Security
- Create a migration to harden `public.current_institute_id()` and ensure it handles multi-branch users correctly by defaulting to the "active" branch if available.
- Enforce `RESTRICTIVE` RLS policies across all tables where `institute_id` is present.
- Fix `public.user_roles` and `public.profiles` policies to prevent viewing users from other institutes.
- Add a trigger to automatically set `institute_id` on `user_roles` based on the institute of the staff member creating the role.

### API & Logic
- Update `userRolesApi.listAll` in `src/lib/api/index.ts` to explicitly filter by the current institute ID to ensure the frontend doesn't even request data it shouldn't see.
- Hardened `provisionPortalAccounts` server function to verify that the student belongs to an institute the caller has admin rights over.

### Frontend Enhancements
- Update `UsersPanel` in `src/routes/app.settings.tsx` to filter the user list strictly to those with a role in the current institute.
- Ensure the "Add Role" dropdown only shows roles applicable to the institute context.

## Technical Details
- **RLS**: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;` + `CREATE POLICY "Tenant isolation" ON x AS RESTRICTIVE ...`
- **Functions**: Update `current_institute_id()` to better handle session-based or context-based institute switching.
- **Grants**: Ensure `GRANT SELECT ON public.user_roles TO authenticated;` is scoped by RLS.
