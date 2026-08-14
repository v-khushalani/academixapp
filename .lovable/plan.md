# Plan: Fix Onboarding and API Connectivity

The onboarding flow is currently failing because the administrative backend (`supabaseAdmin`) is missing its required security key. This plan aims to make the setup process more resilient by using user-scoped permissions where possible and providing clear feedback when system-level keys are missing.

## User Review Required

> [!IMPORTANT]
> To fully enable administrative features (like creating new users or deleting data), please ensure the **SUPABASE_SERVICE_ROLE_KEY** is added to your project's secrets in the Lovable dashboard.

## Proposed Changes

### Backend Logic (`src/lib/signup.functions.ts`)
- Refactor `updateInstituteBrandingFn` to use the **authenticated user's session** instead of the admin client. Since the user was just assigned as 'owner' in the previous step, they have RLS permission to update their own institute.
- Update `setupFirstBatchFn` to also attempt using the user's session first.

### Security and Grants
- I will attempt to apply the necessary `GRANT EXECUTE` permissions to the security functions (`has_role`, `my_institute_ids`, etc.) so the app can function without constant admin bypass.

### Technical Details
- **Resilient Clients**: I've already updated the Supabase client to throw specific "Missing Key" errors instead of misleading "Invalid API Key" messages.
- **Onboarding Wizard**: The UI will now handle errors more gracefully, showing actionable advice if a step fails due to permission issues.

## Verification Plan

### Automated Tests
- Run a Playwright script to simulate a fresh Google login and walk through the onboarding steps:
  1. Authenticate (Mocked)
  2. Create Institute
  3. Update Branding
  4. Create First Batch
  5. Verify redirect to `/app`

### Manual Verification
- I will verify that the "Branding" step no longer crashes with "Invalid API key" by ensuring it uses the user's own token.
