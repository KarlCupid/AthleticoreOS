# Models and Content

This guide explains the TypeScript model, seed data, prescription model, and coaching language system.

## TypeScript Model Overview

`types.ts` is the canonical source for workout-programming shapes.

Core static models:

- `WorkoutProgrammingCatalog`
- `Exercise`
- `PrescriptionTemplate`
- `SessionTemplate`
- `WorkoutIntelligenceCatalog`
- `DescriptionTemplate`
- `ValidationRule`
- `SubstitutionRule`

Generated output models:

- `GeneratedWorkout`
- `GeneratedWorkoutBlock`
- `GeneratedExercisePrescription`
- `WorkoutDescription`
- `WorkoutValidationResult`
- `ProgressionDecision`
- `GeneratedProgram`

User input models:

- `GenerateSingleWorkoutInput`
- `PersonalizedWorkoutInput`
- `UserWorkoutProfile`
- `WorkoutCompletionLog`
- `ExerciseCompletionResult`
- `ProtectedWorkoutInput`

## Exercise Ontology

Exercises should support selection, scaling, substitution, safety filtering, and coaching. A production-ready exercise includes:

- Identity: `id`, `name`, `shortName`, `category`, summaries
- Movement: `movementPatternIds`, `subPatternIds`, muscles, joints, plane
- Equipment: required, optional, home/gym compatibility
- Accessibility: `minExperience`, technical complexity, beginner friendliness
- Stress profile: fatigue, impact, spine, knee, hip, shoulder, wrist, ankle, balance, cardio demand
- Safety: contraindication flags and safety notes
- Relationships: regression, progression, substitution IDs
- Coaching: setup, execution, breathing, cues, mistakes
- Tracking: tracking metrics and default prescription ranges
- Media: optional thumbnail/video/image/animation metadata, alt text, media review status, missing reason, and production priority

Do not add generic filler like "adjust as needed." If a field is unknown, make that explicit in a structured way rather than pretending.

Media hooks should be honest. When assets are not available, set `videoUrl`, `imageUrl`, `thumbnailUrl`, and `animationUrl` to `null`, include specific `altText`, set `media.reviewStatus` to `needs_review`, and add `media.missingReason`. The content audit reports these records as missing media so production surfaces do not mistake placeholders for real assets. Any real media URL requires `altText`; high-priority exercises should get reviewed video or animation demos before media-rich release.

## Seed Data Guide

`seedData.ts` owns static catalog seed content:

- Taxonomy lists
- Equipment
- Movement patterns
- Muscle groups
- Tracking metrics
- Exercises
- Prescription templates
- Session templates

`seedLoader.ts` converts seed data into rows for Supabase migrations or seeding scripts. Keep seed fields aligned with migrations and `types.ts`.

When editing seed content:

- Reuse controlled values.
- Keep IDs stable and snake_case.
- Verify every referenced exercise, rule, template, metric, equipment, and movement-pattern ID exists.
- Add relationships only when they preserve training intent.
- Prefer fewer high-quality records over broad shallow coverage.

## Prescription Model Guide

Prescription templates are typed by `PrescriptionKind`:

- `resistance`
- `cardio`
- `interval`
- `mobility`
- `flexibility`
- `balance`
- `recovery`
- `power`
- `conditioning`

Each template has a typed `payload`. Do not rely only on legacy `sets`, `reps`, `RPE`, and `rest` fields.

Required examples:

- Strength: sets, rep range, load guidance, RPE/RIR/percent1RM model, rest range, tempo, effort guidance.
- Hypertrophy: rep range, RIR or RPE, rest range, proximity-to-failure guidance, volume target, double progression rules.
- Zone 2: duration, modality, heart-rate zone, RPE, talk test, duration/frequency progression.
- HIIT/conditioning: work interval, rest interval, rounds, target intensity, impact level, fatigue risk, scaling options.
- Mobility: target joints, range intent, reps/holds, breathing, pain-free range, end-range control.
- Balance: base of support, surface, visual input, static/dynamic mode, duration, fall-risk rules.
- Recovery: intensity cap, duration, breathing strategy, circulation goal, readiness adjustment.
- Power: low reps, explosive intent, full recovery, technical quality, low fatigue, movement speed, eligibility restrictions.

## Description and Coaching Language Guide

`workoutDescriptionService.ts` turns a generated workout and `DescriptionTemplate` into display-ready copy.

Description templates live in `intelligenceData.ts` and support:

- Tone variants
- Session intent
- Plain-language summary
- Coach explanation
- Effort explanation
- Why it matters
- How it should feel
- Safety notes
- Success criteria
- Scaling down/up
- Form focus
- Breathing focus
- Common mistakes
- Recovery expectation
- Completion message
- Next-session note

Supported tone variants:

- `beginner_friendly`
- `coach_like`
- `clinical`
- `motivational`
- `minimal`
- `detailed`
- `athletic`
- `rehab_informed`
- `data_driven`

Coaching copy should be specific to workout type and prescription. For example:

- Strength: leave reps in reserve and rest enough for strong sets.
- Zone 2: conversational effort and short sentences without gasping.
- Mobility: pain-free range and control, not forced depth.
- Power: fast reps, full recovery, low fatigue.

Avoid vague filler. Tests intentionally reject generic fragments.
