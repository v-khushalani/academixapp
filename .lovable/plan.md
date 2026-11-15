# Resolve remaining payment, fee and plan findings

## Review result
All 17 reports were checked against current source and the connected database.

- **Fixed:** manual admission after Aadhaar is disabled (2), staff-role institute scoping (6), owner/admin group access (7), next walk-in reset (10), batch-specific device attendance lookup (11), and Google invite return to the welcome screen (12).
- **Outdated:** sign-in role access (1), mounted day changes/bell (5), limit triggers (9), fee-generation privilege (14), empty plan feature maps (15), contradictory plan limits (16), and missing branding/install controls (17).
- **Confirmed, pending this plan:** partial-payment failure (3), overwritten fee revisions (4), automatic plan overrides (8), and zero-value pending fees (13).

Five isolated browser regression tests pass. Current preview compilation is clean. Authenticated production workflows could not be tested with this project's external Supabase session tooling; fixtures are not a substitute for live-account verification.

## Changes requiring approval

### 1. Make payment collection and balance carry-forward atomic — finding 3
- Replace the dialog's two separate writes with one authenticated database operation that records the payment and moves the balance in one transaction.
- Match accountant access to the existing fee-collection permissions without widening family or unrelated staff access.
- Lock the fee row, validate the outstanding amount, and add retry protection so a repeated request cannot record the same payment twice.
- Return the saved receipt values and show success only after the complete operation commits.
- Keep ordinary collection callers working. Do not enable the new dialog call until its migration is applied.

### 2. Protect revised installments and suppress zero-value bills — findings 4 and 13
- Add explicit protection for manually revised rows and any destination rows affected by carry-forward; preserve their agreed amounts and dates during regeneration.
- Inspect existing revision/carry-forward audit records and protect identifiable affected rows before changing regeneration. Do not run a blanket rebuild or guess historical amounts.
- Keep generation tenant-scoped and safely privileged for permitted enrollment changes.
- Skip new installments whose amount is zero. Review existing unpaid zero-value rows before any cleanup; retain paid, waived, cancelled and audit-linked records.
- Back up affected fee rows before applying changes. If past migrations already erased a revision, restore only from a trustworthy backup or confirmed office record; do not invent replacements.

### 3. Stop plan edits overwriting institute agreements — finding 8
- Remove automatic propagation from **both** current plan-update triggers; ordinary matrix edits change the catalog only.
- Retain an explicit, confirmed “Push to institutes” action with a preview of affected institutes and values.
- Preserve per-institute limits and feature choices by default. An intentional reset must be separate and clearly disclose what will be replaced.
- Do not bulk restore historical overrides without a trustworthy record of the original values.

## Technical details
- Apply forward-only SQL through the migration tool; do not rewrite historical migrations.
- Keep authenticated RPC authorization and explicit EXECUTE grants; revoke PUBLIC/anon access to privileged operations and keep internal helpers inaccessible to ordinary callers.
- Use a tenant-bound idempotency record and transaction-level row locks for payment retries; include explicit table grants and RLS in the same migration.
- Restrict payment/revision operations to authorized fee staff or verified platform administrators.
- Record the migration-level payment, revision-protection and plan-propagation rules in AGENTS.md.

## Verification
- Accountant records ₹6,000 against ₹9,000: receipt shows ₹6,000 and ₹3,000 moves once; retry does not duplicate collection; forced carry-forward failure rolls back the whole operation.
- Unauthorized and cross-tenant payment/revision requests fail without writes.
- Revised amount/date and carry-forward destination survive a triggered rebuild.
- A zero-fee batch and a 100% scholarship create no ₹0 pending bills.
- Catalog edits do not change institute-specific feature switches or extra capacity; explicit push preserves overrides unless a reset is approved.
- Run focused regression tests, inspect the fresh preview result, then verify the corresponding staff flows against a permitted live account before closing these four findings.