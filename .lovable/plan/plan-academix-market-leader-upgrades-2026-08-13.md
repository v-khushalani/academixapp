# Plan - Academix Market Leader Upgrades

Implement an institute onboarding wizard, multi-tenant isolation tests, super admin user management, and a unified landing page theme.

## User Review Required

> [!IMPORTANT]
> The "delete random user" feature for Super Admins will allow deleting users from `auth.users` via a server function. This is intended for cleaning up trial signups that never created an institute.

- **Onboarding Wizard**: Will replace the simple signup form with a multi-step flow (Institute Info -> Branding -> First Batch).
- **Tenant Isolation Tests**: New E2E tests verifying that a user from Institute A cannot access data from Institute B via URL manipulation or API calls.
- **Super Admin Upgrade**: A "Users" tab in `/app/platform` to view and delete orphaned trial users.
- **Landing Page**: Consolidate the homepage into a single screen that reflects the "Academix" brand identity (Saira font, consistent colors).

## Proposed Changes

### 1. Institute Onboarding Wizard
- **Files**:
  - `src/routes/signup.tsx`: Rewrite to a multi-step component.
  - `src/lib/signup.functions.ts`: Add `updateInstituteBrandingFn` and `setupFirstBatchFn`.
- **Steps**:
  1. **Institute Details**: Name, Tagline, Address.
  2. **Branding**: Upload logo, primary color (autosaved).
  3. **Quick Start**: Create the first Batch and Faculty.

### 2. Multi-tenant Isolation Verification
- **Files**:
  - `tests/e2e/tenant-isolation.spec.ts`: New test suite.
- **Logic**:
  - Login as User A (Institute A).
  - Attempt to access `/app/students/$ID_OF_STUDENT_B`.
  - Verify redirect or "Not Found" error.
  - Verify API calls with Institute B's ID fail.

### 3. Super Admin User Management
- **Files**:
  - `src/routes/app.platform.tsx`: Add "Users" tab.
  - `src/lib/platform.functions.ts`: New file with `listOrphanedUsersFn` and `deleteUserFn`.
- **Feature**:
  - Identify users who have logged in with Google but haven't created an institute or been invited to one.
  - Provide a "Delete User" button.

### 4. Branded Landing Page
- **Files**:
  - `src/routes/index.tsx`: Simplify to a single-screen layout with a strong hero, "Academix" brand colors, and clear CTA.
  - `src/components/marketing/marketing-shell.tsx`: Ensure consistent brand identity (Saira font, Ax wordmark).

## Technical Details

- **Onboarding Autosave**: Use `useMutation` with `onBlur` for field validation and progress persistence.
- **User Deletion**: Use `supabaseAdmin.auth.admin.deleteUser` in the server function.
- **Brand Theming**: Leverage Tailwind v4 `@theme` variables to ensure the "Ax" primary color is consistent across all new pages.

## Verification Plan

### Automated Tests
- Run `bunx vitest run tests/e2e/tenant-isolation.spec.ts`.
- Run existing smoke tests to ensure no regressions in signup flow.

### Manual Verification
1. Sign up with a fresh Google account.
2. Complete the multi-step wizard.
3. Verify that the institute dashboard is populated with the first batch.
4. Login to `/login/platform` as Super Admin and verify the orphaned user list.
5. Check the landing page on mobile and desktop for visual consistency.
