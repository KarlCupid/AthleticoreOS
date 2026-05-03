# Live DB and RLS Smoke Tests

`npm run test:workout-db` verifies that the workout-programming schema, RLS policies, and persistence service work together against a real Supabase instance.

`npm run test:rls` is the narrower two-user RLS isolation harness. Run it when you only need to verify user-data privacy policies and static catalog readability.

These tests are intentionally guarded. They create two temporary auth users, insert temporary static catalog fixtures, persist generated workouts/completions/programs through the service layer, verify user isolation through RLS, and then clean up the rows and users.

## What It Covers

- Static catalog table read through the anon key.
- User profile, equipment, and safety flag upserts through signed-in user clients.
- Generated workout parent and child exercise persistence.
- Generated workout load through the persistence service.
- Workout completion and exercise result persistence.
- Progression decision persistence.
- Recommendation feedback persistence.
- Generated program save/load.
- Invalid generated workout payload rejection before DB writes.
- RLS isolation for generated workouts, child exercise rows, completions, child completion rows, progression decisions, feedback, and programs.

## Required Environment

Set these values before running:

```bash
WORKOUT_DB_TESTS=1
WORKOUT_RLS_TESTS=1
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are accepted as fallbacks for the URL and anon key.

For a hosted test Supabase project, also set:

```bash
WORKOUT_DB_ALLOW_REMOTE=1
WORKOUT_RLS_ALLOW_REMOTE=1
```

Only use remote overrides with a dedicated non-production project. Both live scripts refuse remote URLs by default.

## Test Users

The script uses the service role key to create two temporary users:

- `athleticore-<run-id>-a@example.com`
- `athleticore-<run-id>-b@example.com`

It signs in each user with the anon key so persistence calls exercise normal authenticated RLS behavior. The users are deleted during cleanup. You do not need to provide `TEST_USER_A` or `TEST_USER_B` credentials for the default flow.

## Running Locally

1. Start or reset local Supabase and apply migrations.
2. Copy the local API URL, anon key, and service role key from Supabase status.
3. Run:

```bash
WORKOUT_DB_TESTS=1 npm run test:workout-db
```

For the RLS-only harness:

```bash
WORKOUT_RLS_TESTS=1 npm run test:rls
```

On Windows PowerShell:

```powershell
$env:WORKOUT_DB_TESTS='1'
$env:WORKOUT_RLS_TESTS='1'
$env:SUPABASE_URL='http://127.0.0.1:54321'
$env:SUPABASE_ANON_KEY='<anon-key>'
$env:SUPABASE_SERVICE_ROLE_KEY='<service-role-key>'
npm run test:workout-db
npm run test:rls
```

## Safety Model

- The test creates only test-specific rows with unique IDs.
- Cleanup runs in a `finally` block.
- User-scoped writes go through signed-in anon clients.
- Service role is used only for auth user creation, static fixture setup, verification, and cleanup.
- The command is not part of `npm run quality` because it requires a live DB.
- Do not run this against production.
