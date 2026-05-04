# Generated Workout UI Smoke Checklist

Generated workout programming now has both source/fixture smoke guards and a fast React Native render harness. Automated UI coverage lives in:

- `lib/performance-engine/workout-programming/workoutProgrammingUiSmoke.test.ts`
- `lib/performance-engine/workout-programming/workoutProgrammingGeneratedWorkoutRender.test.ts`
- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaSessionCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaContainer.tsx`
- `src/components/workout/GeneratedWorkoutDevPreviewPanel.tsx`
- `src/screens/WorkoutScreen.tsx`

The render test uses `@testing-library/react-native/pure` with a small Node-compatible React Native/Reanimated mock because the repo's engine test runner is not Jest. This keeps the test fast enough for `npm run test:engine` while still mounting the real generated workout components and the Workout screen feature-flag branches.

## Feature Flags

- Default/off: leave `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA` unset or not equal to `1`.
- Beta/on: in a dev build only, set `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=1`.
- Developer preview: in a dev build only, set `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` while beta is off.

When flags are off, the generated workout beta and preview sections should not render and the existing Today, Plan, History, Analytics, guided workout, and prescription flows should still behave normally.

Friend preview and production builds should not render generated workout beta or developer preview UI even if a generated-workout flag is accidentally set.

The developer preview is intentionally isolated in `GeneratedWorkoutDevPreviewPanel`.
It loads a fixed fixture for debug inspection, does not persist, and does not share
beta fallback state or completion behavior.

## Manual Smoke Pass

1. Open the Workout screen with generated workout flags off.
2. Confirm the existing training card, workout details, plan, history, and analytics tabs still load.
3. In a dev build, enable the beta flag and open the Workout screen.
4. Generate a beginner strength workout.
5. Confirm session intent, summary, blocks, exercises, prescriptions, effort/rest guidance, safety notes, substitutions, scaling, success criteria, tracking metrics, completion copy, and any validation warnings are visible.
6. Start the workout and confirm the checklist, exercise logging fields, feedback tags, notes, and completion button appear.
7. Complete the workout and confirm the next progression recommendation appears.
8. Repeat with a red-flag safety fixture or mocked service error and confirm the UI surfaces the blocked/error state without starting a session.
9. In a non-dev preview/production build, confirm generated workout beta and developer preview sections do not render with both EAS flags set to `0`.

## Error States To Exercise

- Generator unavailable: service throws before returning a workout.
- Invalid workout payload: validator rejects the workout before display.
- Safety blocked: generated workout has `blocked: true`.
- No safe workout found: generator returns or throws a safe fallback failure.
- Persistence unavailable: generated workout or completion saves fail and the beta flow falls back to local mode where allowed.

Run the automated smoke layer with:

```bash
npm run test:engine
```

The render test verifies valid generated-workout preview card content, blocked preview card content, beta configure/inspect/started/completed states, disabled blocked starts, completion controls, progression recommendations, and Workout screen feature-flag visibility.
