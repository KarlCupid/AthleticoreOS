# Current Production Readiness Status

This is the current workout-programming rollout posture. It is intentionally operational, not promotional.

## Status

Workout-programming infrastructure is production-hardened behind release gates and feature flags. The product posture is now **boxing-athlete support canonical**: new weekly plans, generated S&C/support sessions, completion, progression, history, analytics, Train, Plan, Workout Detail, nutrition, and daily performance all route through the boxing athlete support engine.

Strict content/media release gates still matter. Text-only generated support can remain usable when media is missing and the content review gate allows it; production media-rich surfaces must respect approved media and release reports. Internal diagnostics must not appear as normal product UX.

The system currently has:

- Service-layer orchestration behind `workoutProgrammingService`.
- Strict validation and content-review gates.
- JSON review queue/decision workflow for coach/admin review handoff.
- Supabase persistence with transactional RPCs for critical parent/child writes.
- Durable generated workout session lifecycle state.
- Generated workout completions mapped into history and analytics surfaces.
- Recommendation quality telemetry.
- User-safe and admin/debug decision trace summaries.
- React Native render tests for generated workout preview and boxing generated flow.
- Guarded live DB/RLS smoke scripts and an optional manual GitHub release-gate job.

## Runtime Flags

- `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=1` enables the boxing S&C support product path.
- `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=0` hides the support-generation UI and fails weekly generation clearly instead of falling back to legacy generation.
- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA` and `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW` are internal diagnostics flags only. They must not own normal Train UX.
- EAS `development`, `preview`, and `production` profiles explicitly set the boxing engine flag to `1`; preview and production keep diagnostics flags at `0`.

Current rollout decision:

- Canonical engine: boxing athlete support engine.
- Weekly source of truth: `GeneratedProgram`.
- Weekly storage/calendar projection: `weekly_plan_entries` created from `GeneratedProgramSession`.
- Compatibility posture: old entries and old prescription snapshots remain readable, but old adaptive generation is not a fallback.

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
- 81 production-eligible exercises missing approved production media.
- Media audit output separates production missing media, internal-preview missing media, missing alt text, unreviewed media, and high-priority exercises without demo assets.
- 145 content warnings, mostly missing media hooks/assets.

The remaining strict-release blocker is missing reviewed production exercise media. The preview-only review blockers are gated out of production selection and are not a friend-preview launch surface. The previous production prescription progression/regression/deload rule-link blockers have been closed.

## Current Limitations

- Live DB/RLS tests are intentionally outside `npm run quality`; they require a real Supabase target.
- Boxing generated workout UI has render coverage, but still needs device/E2E smoke coverage for backgrounding, reload, resume, Detail lazy generation, and Plan navigation.
- Internal diagnostics surfaces are gated away from normal Train UX.
- The catalog currently fails strict release until production exercise media is produced, reviewed, and linked.
- Program persistence is hardened, but program scheduling is not yet a polished calendar-driven production workflow.
- Legacy weekly rows can be rendered or safely migrated to boxing intent, but old `calculateSC`/adaptive weekly generation is not a normal runtime path.
- Recommendation quality telemetry exists, but production tuning needs real outcome volume.
- Preview/dev-only content remains intentionally gated from production generation.
- Content authoring still happens in TypeScript content packs, but review status can now move through the JSON review-decision workflow or Supabase review metadata updates instead of only manual TypeScript edits.

## Manual GitHub Release Gate

The `Quality` workflow has an optional manual job named `Workout programming live DB/RLS smoke`. It runs after normal quality, uses strict content gates, and then runs the live DB and RLS scripts. Configure secrets on the protected `workout-programming-live-db-test` environment as described in `live-db-smoke-tests.md`.
