# Current Production Readiness Status

This is the current workout-programming rollout posture. It is intentionally operational, not promotional.

## Status

Workout-programming infrastructure is production-hardened behind release gates and feature flags, but the current catalog is not production-release-ready. Broad rollout should remain gated until the strict content report has `productionReady: true`, the live DB/RLS checks pass against a local or dedicated non-production Supabase project, and the remaining device/E2E risks are accepted.

The system currently has:

- Service-layer orchestration behind `workoutProgrammingService`.
- Strict validation and content-review gates.
- Supabase persistence with transactional RPCs for critical parent/child writes.
- Durable generated workout session lifecycle state.
- Generated workout completions mapped into history and analytics surfaces.
- Recommendation quality telemetry.
- User-safe and admin/debug decision trace summaries.
- React Native render tests for generated workout preview and beta flow.
- Guarded live DB/RLS smoke scripts and an optional manual GitHub release-gate job.

## Runtime Flags

- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=1` enables the generated workout beta flow.
- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` enables the isolated developer preview only in dev builds when beta is off.
- With both flags off, generated workout beta and preview UI should not render.

## Release Commands

Normal repo quality:

```bash
npm run quality
```

Workout content release gates:

```bash
npm run workout:validate-content -- --strict
npm run workout:audit-content -- --release
```

Live DB/RLS smoke checks:

```bash
WORKOUT_DB_TESTS=1 npm run test:workout-db
WORKOUT_RLS_TESTS=1 npm run test:rls
```

Combined workout-programming release gate:

```bash
npm run workout:release-gate
```

`workout:release-gate` requires live Supabase test environment variables because it runs both live DB/RLS smoke scripts.

## Live Supabase Guardrails

Use local Supabase or a dedicated non-production test project. Remote test projects require:

```bash
WORKOUT_DB_ALLOW_REMOTE=1
WORKOUT_RLS_ALLOW_REMOTE=1
WORKOUT_SUPABASE_NON_PRODUCTION=1
```

Set production comparison values when available:

```bash
WORKOUT_PRODUCTION_SUPABASE_URL=https://<production-ref>.supabase.co
WORKOUT_PRODUCTION_SUPABASE_PROJECT_REF=<production-ref>
```

Do not run the live DB/RLS scripts against production. Do not store production service-role credentials in the workout-programming live DB test environment.

## Current Release Blockers

The current strict content commands run and fail as intended. At the time of this audit, the release report shows:

- `productionReady: false`
- 35 release production blockers, mainly production-eligible prescriptions missing progression, regression, or deload rule links.
- 66 production-eligible exercises missing approved production media.
- 135 content warnings, mostly missing media hooks/assets.

These are content-release blockers, not missing release-gate tooling.

## Current Limitations

- Live DB/RLS tests are intentionally outside `npm run quality`; they require a real Supabase target.
- Generated workout UI has render coverage, but broad rollout still needs device/E2E smoke coverage for backgrounding, reload, and resume.
- The catalog currently fails strict release until production media and prescription rule-link gaps are completed.
- Program persistence is hardened, but program scheduling is not yet a polished calendar-driven production workflow.
- Recommendation quality telemetry exists, but production tuning needs real outcome volume.
- Preview/dev-only content remains intentionally gated from production generation.
- Content editing still happens in TypeScript content packs rather than an admin CMS.

## Manual GitHub Release Gate

The `Quality` workflow has an optional manual job named `Workout programming live DB/RLS smoke`. It runs after normal quality, uses strict content gates, and then runs the live DB and RLS scripts. Configure secrets on the protected `workout-programming-live-db-test` environment as described in `live-db-smoke-tests.md`.
