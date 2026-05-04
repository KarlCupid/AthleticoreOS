# Current Production Readiness Status

This is the current workout-programming rollout posture. It is intentionally operational, not promotional.

## Status

Workout-programming infrastructure is production-hardened behind release gates and feature flags, but the current catalog is not production-release-ready. The launch posture is **fully gated preview**: generated workouts are intentionally unavailable in friend preview and production builds until the strict content report has `productionReady: true`, the live DB/RLS checks pass against a local or dedicated non-production Supabase project, and the remaining device/E2E risks are accepted.

Friend preview builds must present the existing Today, Plan, Train, guided workout, history, and analytics experiences only. They must not show a generated workout beta, developer preview, or half-production generated workout entry point.

The system currently has:

- Service-layer orchestration behind `workoutProgrammingService`.
- Strict validation and content-review gates.
- JSON review queue/decision workflow for coach/admin review handoff.
- Supabase persistence with transactional RPCs for critical parent/child writes.
- Durable generated workout session lifecycle state.
- Generated workout completions mapped into history and analytics surfaces.
- Recommendation quality telemetry.
- User-safe and admin/debug decision trace summaries.
- React Native render tests for generated workout preview and beta flow.
- Guarded live DB/RLS smoke scripts and an optional manual GitHub release-gate job.

## Runtime Flags

- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=1` enables the generated workout beta flow only when `__DEV__` is true.
- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` enables the isolated developer preview only when `__DEV__` is true and beta is off.
- EAS `preview` and `production` profiles explicitly set both flags to `0`.
- With both flags off, generated workout beta and preview UI should not render.
- In non-dev builds, generated workout beta and preview UI should not render even if a flag is accidentally set.

Current rollout decision:

- `productionReady: false`
- Rollout posture: gated preview, dev-only generated workout surfaces.
- Friend preview posture: generated workouts unavailable by design.

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

Coach/admin review workflow:

```bash
npm run workout:review-content -- export-queue --out review-queue.json
npm run workout:review-content -- validate-decisions --in review-decisions.json
npm run workout:review-content -- export-sql --in review-decisions.json --out review-updates.sql
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
- 0 release production blockers.
- 16 review blockers, all intentionally gated preview content.
- 0 release review blockers.
- 66 production-eligible exercises missing approved production media.
- Media audit output now separates production missing media, beta missing media, missing alt text, unreviewed media, and high-priority exercises without demo assets.
- 130 content warnings, mostly missing media hooks/assets.

The remaining strict-release blocker is missing reviewed production exercise media. The preview-only review blockers are gated out of production selection and are not a friend-preview launch surface. The previous production prescription progression/regression/deload rule-link blockers have been closed.

## Current Limitations

- Live DB/RLS tests are intentionally outside `npm run quality`; they require a real Supabase target.
- Generated workout UI has render coverage, but broad rollout still needs device/E2E smoke coverage for backgrounding, reload, and resume.
- Generated workout beta and developer preview surfaces are dev-only while the catalog is not production-ready.
- The catalog currently fails strict release until production exercise media is produced, reviewed, and linked.
- Program persistence is hardened, but program scheduling is not yet a polished calendar-driven production workflow.
- Recommendation quality telemetry exists, but production tuning needs real outcome volume.
- Preview/dev-only content remains intentionally gated from production generation.
- Content authoring still happens in TypeScript content packs, but review status can now move through the JSON review-decision workflow or Supabase review metadata updates instead of only manual TypeScript edits.

## Manual GitHub Release Gate

The `Quality` workflow has an optional manual job named `Workout programming live DB/RLS smoke`. It runs after normal quality, uses strict content gates, and then runs the live DB and RLS scripts. Configure secrets on the protected `workout-programming-live-db-test` environment as described in `live-db-smoke-tests.md`.
