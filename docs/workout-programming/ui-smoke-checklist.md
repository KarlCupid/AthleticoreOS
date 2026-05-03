# Generated Workout UI Smoke Checklist

The repo currently uses source-level and service-fixture smoke tests as the lightweight UI regression layer for generated workout programming. Full React Native render tooling is not installed, so generated workout UI coverage lives in:

- `lib/performance-engine/workout-programming/workoutProgrammingUiSmoke.test.ts`
- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/GeneratedWorkoutBetaSessionCard.tsx`
- `src/screens/WorkoutScreen.tsx`

## Feature Flags

- Default/off: leave `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA` unset or not equal to `1`.
- Beta/on: set `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=1`.
- Developer preview: set `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` while beta is off.

When flags are off, the generated workout beta and preview sections should not render and the existing Today, Plan, History, Analytics, guided workout, and prescription flows should still behave normally.

## Manual Smoke Pass

1. Open the Workout screen with generated workout flags off.
2. Confirm the existing training card, workout details, plan, history, and analytics tabs still load.
3. Enable the beta flag and open the Workout screen.
4. Generate a beginner strength workout.
5. Confirm session intent, summary, blocks, exercises, prescriptions, effort/rest guidance, safety notes, substitutions, scaling, success criteria, tracking metrics, completion copy, and any validation warnings are visible.
6. Start the workout and confirm the checklist, exercise logging fields, feedback tags, notes, and completion button appear.
7. Complete the workout and confirm the next progression recommendation appears.
8. Repeat with a red-flag safety fixture or mocked service error and confirm the UI surfaces the blocked/error state without starting a session.

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
