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

`workout:release-gate` extends the normal quality gate with content validation, content audit, and the guarded live DB/RLS smoke scripts. It requires a local Supabase instance or a dedicated non-production Supabase test project with the environment variables described in `live-db-smoke-tests.md`.

## Workout-Programming Test Files

- `workoutProgrammingEngine.test.ts`: catalog, seed loader, generator, prescription, validation, descriptions.
- `workoutProgrammingRemainingPhases.test.ts`: rules, substitutions, personalization, progression, program builder, analytics.
- `workoutProgrammingPersistence.test.ts`: persistence service user scoping and insert payloads.
- `workoutProgrammingService.test.ts`: high-level app-facing service output shape.
- `workoutProgrammingQA.test.ts`: deep scenario QA and edge cases.
- `workoutProgrammingUiSmoke.test.ts`: feature-flag and fixture smoke coverage for generated workout preview and beta flow.
- `workoutProgrammingGeneratedWorkoutRender.test.ts`: React Native render coverage for generated preview, beta flow states, blocked starts, completion controls, progression copy, and Workout screen feature flags.
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
- Live database RLS isolation and DB smoke scripts require a local or dedicated test Supabase instance and are intentionally not part of `npm run quality`; they now run through the manual GitHub release-gate job or `npm run workout:release-gate`.
- Generated workout persistence and beta start/log UI are wired behind feature flags, with component-level React Native render coverage now in place; broad rollout still needs device/E2E coverage.
- Program persistence has save/load/update/archive helpers, but it is not yet a polished calendar-driven production workflow.
- Some constrained requests intentionally fall back to recovery instead of forcing the requested workout type.
- Balance and older-adult concepts are represented through current goals/safety flags, not a dedicated older-adult product surface.
- The generator is deterministic enough for tests but not yet tuned with real-world recommendation quality data.
- Media fields exist but are not fully populated with production assets.
- Preview/dev-only content is intentionally gated from production generation until review is complete.
- Coach/content editing still happens in TypeScript content packs rather than an admin CMS.

## Future Roadmap

Near term:

- Keep the manual live Supabase RLS and DB release gate green against a dedicated test project before workout-programming rollout.
- Add device/E2E smoke tests for the generated workout beta flow.
- Promote preview/dev-only exercises only after coach and safety review.
- Add a developer fixture selector for generated workout previews.
- Add content QA snapshots for descriptions and prescription payloads.

Medium term:

- Add admin/content workflows for exercise and rule editing.
- Add production media assets for exercises.
- Expand user profile inputs: injury history, sport demands, schedule constraints, environment, goals.
- Feed real completion trends into exercise scoring and substitutions.
- Add recommendation quality monitoring tied to feedback and adherence.

Long term:

- Integrate workout programming directly with the Unified Performance Engine and `PerformanceState`.
- Harmonize generated workouts with protected boxing sessions, nutrition/fueling, readiness, body mass, and risk state.
- Support richer periodization across build, camp, competition week, and recovery phases.
- Add coach-facing review tools for generated programs.
- Build a safe content publishing pipeline with validation before content reaches users.
