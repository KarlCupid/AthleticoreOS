# Boxing Generated Workout UI Smoke Checklist

Boxing generated workout programming has both source/fixture smoke guards and a fast React Native render harness. Automated UI coverage lives in:

- `lib/performance-engine/workout-programming/workoutProgrammingUiSmoke.test.ts`
- `lib/performance-engine/workout-programming/workoutProgrammingGeneratedWorkoutRender.test.ts`
- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaSessionCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaContainer.tsx`
- `src/screens/WorkoutScreen.tsx`
- `src/screens/WorkoutDetailScreen.tsx`

The render test uses `@testing-library/react-native/pure` with a small Node-compatible React Native/Reanimated mock because the repo's engine test runner is not Jest. This keeps the test fast enough for `npm run test:engine` while still mounting the real generated workout components and the Workout screen boxing rollout branches.

## Feature Flags

- Boxing engine on: set `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=1`.
- Boxing engine off: set `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=0`; the app should avoid rendering the generation UI and must not fall back to old adaptive generation.
- Internal diagnostics: `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` remains internal-only and is not part of normal Train UX.

When the boxing engine flag is off, the generated boxing section should not render and weekly generation should fail clearly instead of substituting a legacy plan. History, analytics, old compatibility entries, and guided fallback navigation should still behave normally.

Friend preview and production builds should render the boxing product path when enabled and should not render internal diagnostics.

The internal diagnostics panel is intentionally isolated. It loads a fixed fixture for debug inspection, does not persist, and does not share product fallback state or completion behavior.

## Manual Smoke Pass

1. Generate a boxing week and open the Workout screen.
2. Confirm the boxing week intelligence card, Today, Plan, History, and Analytics tabs load.
3. Open a generated boxing session.
4. Generate or inspect a boxing support session such as footwork agility or roadwork base.
5. Confirm session intent, summary, blocks, exercises, prescriptions, effort/rest guidance, safety notes, substitutions, scaling, success criteria, tracking metrics, completion copy, and any validation warnings are visible.
6. Start the workout and confirm the checklist, exercise logging fields, feedback tags, notes, and completion button appear.
7. Complete the workout and confirm the next progression recommendation appears.
8. Repeat with a red-flag safety fixture or mocked service error and confirm the UI surfaces the blocked/error state without starting a session.
9. Disable `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED` and confirm the generation UI hides without legacy fallback.

## Error States To Exercise

- Generator unavailable: service throws before returning a workout.
- Invalid workout payload: validator rejects the workout before display.
- Safety blocked: generated workout has `blocked: true`.
- No safe workout found: generator returns or throws a safe fallback failure.
- Persistence unavailable: generated workout or completion saves fail and the boxing flow falls back to local mode where allowed.

Run the automated smoke layer with:

```bash
npm run test:engine
```

The render test verifies valid generated-workout preview card content, blocked preview card content, boxing configure/inspect/started/completed states, disabled blocked starts, completion controls, progression recommendations, and Workout screen rollout visibility.
