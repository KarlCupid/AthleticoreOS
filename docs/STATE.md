# Project State

**Last Updated:** 2026-05-04

## Account Deletion Posture

- Account deletion is privacy-critical launch hardening, not a best-effort cleanup.
- `supabase/migrations/044_account_deletion_full_user_owned_coverage.sql` is the current forward-only deletion posture.
- `delete_my_account()` explicitly removes user-owned public rows before deleting `public.users` and then `auth.users`.
- Coverage includes legacy S&C logs, nutrition logs, body-mass/weight-class records, journey walkthrough state, workout-programming generated workouts, lifecycle rows, completions, programs, recommendation telemetry, feedback, preferences, equipment, constraints, pain/readiness logs, and indirect child rows.
- Static public catalog and workout-programming intelligence tables are intentionally preserved.
- `npm run test:account-deletion` statically derives user-owned tables from the migration set and fails if a user-owned table is not covered by explicit deletion or an `ON DELETE CASCADE` path.
- `npm run quality` now includes the account-deletion coverage guard.
- `npm run test:account-deletion-live` is the guarded live smoke. It should only run against local Supabase or a dedicated non-production project with `ACCOUNT_DELETION_DB_TESTS=1` and service-role credentials. It seeds every current user-owned surface, calls `delete_my_account()` as that user, verifies no user-owned public rows remain, and verifies the auth user is removed.
