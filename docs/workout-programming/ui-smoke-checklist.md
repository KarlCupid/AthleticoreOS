# Athleticore Support Session UI Smoke Checklist

Athleticore support-session programming has both source/fixture smoke guards and a fast React Native render harness. Automated UI coverage lives in:

- `lib/performance-engine/workout-programming/workoutProgrammingUiSmoke.test.ts`
- `lib/performance-engine/workout-programming/workoutProgrammingGeneratedWorkoutRender.test.ts`
- `src/components/workout/GeneratedWorkoutPreviewCard.tsx`
- `src/components/workout/BoxingGeneratedWorkoutSessionCard.tsx`
- `src/components/workout/BoxingGeneratedWorkoutContainer.tsx`
- `src/screens/WorkoutScreen.tsx`
- `src/screens/WorkoutDetailScreen.tsx`

The render test uses `@testing-library/react-native/pure` with a small Node-compatible React Native/Reanimated mock because the repo's engine test runner is not Jest. This keeps the test fast enough for `npm run test:engine` while still mounting the real support-session components and the Workout screen boxing rollout branches.

## UI Copy Smoke Checklist

- Is there one main decision?
- Is the next action obvious?
- Is the why clear?
- Is the copy specific to the athlete's context?
- Are developer words hidden?
- Is detail progressive?
- Is safety firm but calm?
- Does the screen avoid shame, hype, and generic dashboard language?
- Does the screen still work on a small phone without reading five cards?

## Feature Flags

- Boxing engine on: set `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=1`.
- Boxing engine off: set `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED=0`; the app should avoid rendering the generation UI and must not fall back to old adaptive generation.
- Internal diagnostics: `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=1` remains internal-only and is not part of normal Train UX.

When the boxing engine flag is off, the standalone extra-support section should not render and weekly support-session creation should fail clearly instead of substituting an older plan. A weekly entry that already has a `BoxingGeneratedPlanEntrySnapshot` still appears on Today as the planned Athleticore support session and opens `WorkoutDetail`. History, analytics, older session entries, and guided fallback navigation should still behave normally.

Friend preview and production builds should render the boxing product path when enabled and should not render internal diagnostics. Today should remain entry-bound: a planned support entry gets one execution CTA into `WorkoutDetail`, with no duplicate hero start CTA and no standalone configure/build surface beneath it.

The internal diagnostics panel is intentionally isolated. It loads a fixed fixture for debug inspection, does not persist, and does not share product fallback state or completion behavior.

## Manual Smoke Pass

1. Build a boxing week and open the Workout screen.
2. Confirm Athlete Support This Week, Today, Plan, History, and Analytics tabs load.
3. Confirm Today shows the planned Athleticore support session card as the only active-session execution card, not a duplicate hero CTA or the standalone generator.
4. Open an Athleticore support session and confirm it routes to `WorkoutDetail`.
5. Build or inspect a support session such as rotational power, roadwork base, shoulder durability, or footwork agility from the detail surface when full details are missing.
6. Confirm session intent, summary, sections, exercises, prescriptions, effort/rest guidance, safety notes, substitutions, scaling, success criteria, tracking metrics, completion copy, and any review notes are visible.
7. Start the workout and confirm the checklist, exercise logging fields, feedback tags, notes, and completion button appear.
8. Complete the workout and confirm the next progression recommendation appears.
9. Repeat with a red-flag safety fixture or mocked service error and confirm the UI surfaces the blocked/error state without starting a session.
10. Disable `EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED` and confirm the standalone/ad hoc extra support UI hides without older-plan fallback.

## Error States To Exercise

- Builder unavailable: service throws before returning a workout.
- Workout details need review before display.
- Safety paused: support session has `blocked: true`.
- No safe workout found: builder returns a calm safety message.
- Persistence unavailable: support session or completion saves fail and the boxing flow falls back to local mode where allowed.

Run the automated smoke layer with:

```bash
npm run test:engine
```

The render test verifies valid support-session preview card content, blocked preview card content, boxing configure/review/started/completed states, disabled blocked starts, completion controls, progression recommendations, Today planned-support card rendering, absence of the standalone builder by default, one planned-support CTA, and WorkoutDetail routing from that CTA.
