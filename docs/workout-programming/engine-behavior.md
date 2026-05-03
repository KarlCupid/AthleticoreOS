# Engine Behavior

This guide covers validation, substitution, progression, and program building.

## Safety and Validation Guide

`validationEngine.ts` returns:

- `isValid`
- `errors`
- `warnings`
- `suggestedCorrections`
- `userFacingMessages`
- `failedRuleIds`
- `decisionTrace`

Validation is domain-specific, not just structural. It checks:

- Workout type consistency
- Goal consistency
- Format consistency
- Intensity model consistency
- Volume and rest completeness
- Exercise eligibility
- Equipment compatibility
- Experience compatibility
- Safety and pain flags
- Movement pattern balance
- Fatigue management
- Progression logic
- Tracking metric availability
- Description completeness
- Warmup/cooldown requirements
- Recovery, power, HIIT, mobility, strength, cardio, and balance constraints

The generator validates before returning normal workouts. Invalid generated workouts should fail with actionable corrections and non-alarming user messages.

## Safety Rules

Safety wins over performance. Examples:

- Red readiness routes hard training to recovery/mobility.
- Red-flag symptoms block hard generation.
- Pain flags reduce joint demand or route to safer substitutions.
- No-running and no-jumping flags remove incompatible patterns.
- No-floor and no-overhead flags can change workout type if needed.
- Missing readiness is unknown, not a green light.

## Substitution Logic Guide

`substitutionEngine.ts` ranks replacements using:

1. Movement pattern match
2. Similar primary muscles
3. Equipment availability
4. Experience compatibility
5. Lower joint demand when pain flags exist
6. Similar goal or workout type
7. Similar loadability
8. Lower complexity when readiness is poor
9. Lower impact when low-impact/no-jumping is required
10. User likes/dislikes

Substitution rules live in `intelligenceData.ts`. A good rule includes:

- Source exercise
- Source movement patterns
- Acceptable replacements
- Replacement priority
- Reason
- Equipment constraints
- Safety flag support/exclusion
- Skill-level match
- Goal match
- Prescription adjustment
- Coaching note

Substitutions should preserve training intent. A knee-caution squat substitution should keep a squat pattern when safe, reduce knee stress, and explain the tradeoff.

## Exercise Selection Scoring Trace

`workoutProgrammingEngine.ts` exposes `EXERCISE_SELECTION_SCORE_WEIGHTS` and attaches `ExerciseSelectionScoreTrace` records to generated workouts. The trace is meant for inspection, QA, and UI explanations; React components should display it, not recalculate it.

Scoring is calibrated with this order of authority:

- Safety hard constraints exclude exercises before preference can help them.
- Equipment hard mismatches exclude exercises.
- Experience hard mismatches exclude exercises.
- Movement pattern, workout type, and goal matches carry the strongest positive ranking weights.
- Preferences nudge ranking only after safety, equipment, and experience compatibility are satisfied.
- Readiness and fatigue flags increase fatigue and intensity penalties.
- Pain flags increase joint-demand penalties, while hard contraindications still exclude.

Generated workouts expose:

- `generationTrace.selectedTemplateTrace`
- `generationTrace.selectedPrescriptionTrace`
- `generationTrace.movementSlotTrace`
- `generationTrace.exerciseSelectionTrace`
- `generationTrace.substitutionTrace`
- `generationTrace.validationTrace`
- `generationTrace.fallbackTrace`

Each selected exercise also carries its own `scoreTrace`, including score breakdown, included reasons, excluded reasons, safety flags applied, match booleans, penalties, preference adjustment, and final decision.

## Progression, Regression, and Deload Guide

`personalizationEngine.ts` includes `recommendNextProgression`.

Decision kinds:

- `progress`
- `repeat`
- `regress`
- `deload`
- `recover`
- `substitute`
- `reduceVolume`
- `reduceIntensity`
- `changeWorkoutType`

Inputs can include:

- Workout type
- Goal
- Prescription template
- Generated workout
- Completion log
- Exercise-level results
- Session RPE
- RIR/RPE
- Pain before/after
- Pain by exercise
- Missed reps
- Load used
- Duration completed
- Heart-rate zone compliance
- Readiness before/after
- Recent trend

Principles:

- Pain overrides performance progression.
- Hypertrophy uses rep-range and RIR/RPE logic.
- Zone 2 uses duration and intensity compliance.
- Power progresses only if quality stays high and fatigue low.
- Accumulated high fatigue or repeated poor completion can deload.
- Repeated failure of one exercise can trigger substitution.

## Program Builder Guide

`programBuilder.ts` creates weekly programs that respect:

- Primary and secondary goals
- Sessions per week
- Available days
- Protected workouts
- Equipment
- Experience level
- Safety flags
- Readiness trend
- Program length
- Deload strategy
- Workout environment
- Movement pattern balance
- Hard/easy distribution

Supported phases:

- `accumulation`
- `intensification`
- `deload`
- `return_to_training`
- `maintenance`

Protected workouts are anchors. The builder can work around them, reduce hard work nearby, or change supporting sessions, but should not silently remove or replace them.

Generated programs expose:

- `weeks`
- `sessions`
- `phase`
- `rationale`
- `movementPatternBalance`
- `weeklyVolumeSummary`
- `hardDayCount`
- `validationWarnings`
- `progressionPlan`

## Service Layer

`workoutProgrammingService.ts` is the clean app/API integration layer.

Use these functions from app code:

- `getWorkoutProgrammingCatalog`
- `generateWorkoutForUser`
- `generatePreviewWorkout`
- `validateWorkout`
- `substituteExercise`
- `logWorkoutCompletion`
- `getNextProgression`
- `generateWeeklyProgramForUser`
- `getWorkoutDescription`

Do not duplicate generation, validation, substitution, or prescription logic in UI components.
