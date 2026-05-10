# Testing, Limitations, and Roadmap

## How to Run Tests

Focused commands:

```bash
npm run typecheck
npm run test:engine
```

Full quality gate:

```bash
npm run quality
```

`npm run quality` runs:

1. ESLint
2. TypeScript check
3. Clean TypeScript config check
4. Engine/API tests

Workout-programming release gate:

```bash
npm run workout:release-gate
```

`workout:release-gate` extends the normal quality gate with strict content validation, release-mode content audit, and the guarded live DB/RLS smoke scripts. It requires a local Supabase instance or a dedicated non-production Supabase test project with the environment variables described in `live-db-smoke-tests.md`.

For the current rollout posture, feature flags, and remaining production blockers, see `current-production-readiness-status.md`.

Content release checks can also be run directly:

```bash
npm run workout:validate-content -- --strict
npm run workout:audit-content -- --release
```

These commands fail unless the workout-programming release report is production-ready. Preview/dev-only content can remain gated for internal review, but production-eligible content must have review approval, safety approval where required, complete descriptions, exercise safety notes, relevant substitutions, prescription progression/regression/deload rules, and approved production media.

## Workout-Programming Test Files

- `workoutProgrammingEngine.test.ts`: catalog, seed loader, generator, prescription, validation, descriptions.
- `workoutProgrammingRemainingPhases.test.ts`: rules, substitutions, personalization, progression, program builder, analytics.
- `workoutProgrammingPersistence.test.ts`: persistence service user scoping, atomic RPC coverage, guarded fallback behavior, and insert payloads.
- `workoutProgrammingService.test.ts`: high-level app-facing service output shape.
- `workoutProgrammingQA.test.ts`: deep scenario QA and edge cases.
- `generatedProgramWeeklyPlanAdapter.test.ts`: `GeneratedProgram` to `weekly_plan_entries` projection, boxing metadata snapshots, no generated sparring, external non-boxing load mapping, and old-row compatibility helpers.
- `workoutProgrammingUiSmoke.test.ts`: feature-flag and fixture smoke coverage for Athleticore support UI and internal diagnostics.
- `workoutProgrammingGeneratedWorkoutRender.test.ts`: React Native render coverage for generated preview, support-flow states, blocked starts, completion controls, progression copy, and Workout screen rollout behavior.
- `workoutProgrammingOperationalGuards.test.ts`: live DB guard behavior and content-audit release gating.

## What Tests Should Catch

Tests should fail for:

- Unsafe exercise selection under pain or safety flags.
- Missing typed prescription payload fields.
- Generic or empty descriptions.
- Bad substitution ranking.
- Missing tracking metrics.
- Invalid generated workouts.
- Red-flag safety not blocking.
- Protected workouts being removed from programs.
- Boxing weekly generation falling back to old adaptive generation.
- Generated sparring.
- MMA, grappling, wrestling, BJJ, Muay Thai, or kickboxing being counted as boxing skill.
- Generic generated workout UI replacing boxer-first support-session intent.
- User-specific persistence reads/writes missing `user_id` or parent scoping.

## Current QA Scenarios

`workoutProgrammingQA.test.ts` covers:

1. Beginner, no equipment, 30-minute strength
2. Intermediate, dumbbells only, hypertrophy
3. Full gym strength
4. Zone 2 cardio with bike
5. Zone 2 without cardio equipment fallback
6. Low-impact HIIT with no jumping
7. Mobility hips/t-spine
8. Recovery after hard session
9. Balance for fall-risk/older adult
10. Power for advanced athlete
11. Knee caution
12. Low-back caution
13. Shoulder caution
14. Wrist caution
15. No running
16. No overhead pressing
17. No floor work
18. Limited time
19. Poor readiness
20. Red-flag safety block
21. Disliked exercise excluded
22. Preferred equipment used
23. Pain increase triggers regression
24. Hypertrophy double progression
25. Zone 2 duration progression
26. Failed reps repeat/regress
27. Accumulated fatigue deload
28. Protected workout preservation
29. Weekly movement pattern balance
30. Invalid generated workout validation failure

## Known Limitations

- Static catalog loading from Supabase is conservative and falls back to in-code seed data if incomplete.
- Live database RLS isolation and DB smoke scripts require a local or dedicated test Supabase instance and are intentionally not part of `npm run quality`; they run through the manual GitHub release-gate job, `npm run workout:live-db-smoke`, or `npm run workout:release-gate`.
- Athleticore support-session persistence and start/log UI are wired into the main product path behind `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED`; device/E2E coverage is still needed for backgrounding, reload, and resume on real devices.
- Generated workout lifecycle state is durable for persisted sessions, including active-session restore.
- Program persistence has atomic save/load/update/archive/session-completion helpers, and weekly plan rows are now a projection of `GeneratedProgram`; live calendar polish still needs device/E2E coverage.
- Strict content release mode is wired into `workout:release-gate`; the current catalog fails release until production exercise media is produced, reviewed, and linked. Production prescription progression/regression/deload rule-link gaps are covered by content tests.
- Some constrained requests intentionally fall back to recovery instead of forcing the requested workout type.
- Balance and older-adult concepts are represented through current goals/safety flags, not a dedicated older-adult product surface.
- The generator is deterministic enough for tests but not yet tuned with real-world recommendation quality data.
- Media fields exist but are not fully populated with production assets.
- Preview/dev-only content is intentionally gated from production generation until review is complete.
- Legacy weekly rows and old `WorkoutPrescriptionV2` snapshots are readable for compatibility, but old adaptive generation is not a product fallback.
- Content authoring still happens in TypeScript content packs, but review status can now move through the JSON review-decision workflow or Supabase review metadata updates instead of only manual TypeScript edits.

## Future Roadmap

Near term:

- Keep the manual live Supabase RLS and DB release gate green against a dedicated test project before workout-programming rollout.
- Add device/E2E smoke tests for boxing generated session start, pause/resume, completion, active-session restore, Plan navigation, and Workout Detail lazy generation.
- Promote preview/dev-only exercises only after coach and safety review.
- Add a developer fixture selector to the isolated internal diagnostics panel if fixed-fixture debugging becomes too narrow.
- Add content QA snapshots for descriptions and prescription payloads.

Medium term:

- Add a full admin/content UI for exercise and rule editing.
- Add production media assets for exercises.
- Expand user profile inputs: injury history, sport demands, schedule constraints, environment, goals.
- Feed real completion trends into exercise scoring and substitutions.
- Add recommendation quality monitoring tied to feedback and adherence.

Long term:

- Integrate workout programming directly with the Unified Performance Engine and `PerformanceState`.
- Continue harmonizing Athleticore support sessions with protected boxing anchors, nutrition/fueling, readiness, body mass, and risk state.
- Support richer periodization across build, camp, competition week, and recovery phases.
- Add coach-facing review tools for generated programs.
- Build a safe content publishing pipeline with validation before content reaches users.
