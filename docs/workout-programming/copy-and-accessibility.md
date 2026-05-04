# Workout Programming Copy and Accessibility

This guide covers generated workout descriptions and the beta generated-workout UI. The goal is clear, calm, coach-quality language that works for future localization and basic assistive technology.

## Copy Principles

- Use plain language first. Explain training terms the first time they appear, for example "effort rating" instead of unexplained "RPE".
- Give the athlete a next action: log, pause, reduce, repeat, progress, choose, review, or seek guidance.
- Keep safety language calm and direct. Say what to do, not what to fear.
- Do not diagnose, promise treatment, guarantee injury prevention, or imply missing data means the athlete is safe.
- Avoid generic filler such as "adjust as needed", "listen to your body", or "do what feels right".
- Avoid shame or fear language. No "no excuses", "pain is weakness", or alarmist warnings.

## Tone Variants

Each supported tone should remain meaningfully different:

- `beginner_friendly`: simple, reassuring, low jargon.
- `coach_like`: direct coaching with practical standards.
- `clinical`: measured, observation-focused, and neutral.
- `motivational`: encouraging without hype or pressure.
- `minimal`: short, clear, and action-oriented.
- `detailed`: more context for why the session is built this way.
- `athletic`: performance-focused, with clear quality gates.
- `rehab_informed`: symptom-aware without diagnosis or treatment claims.
- `data_driven`: explains which logged signals guide the next recommendation.

## Safety Copy

Recurring generated-workout safety wording lives in `lib/performance-engine/workout-programming/workoutSafetyCopy.ts`. UI components, description fallbacks, decision summaries, and fallback messages should import that module rather than redefining the same sentences.

Use user-safe language like:

- "Pause if pain becomes sharp, unusual, or changes how you move."
- "If you notice chest pain, fainting, severe dizziness, or neurological symptoms, stop and seek professional guidance."
- "Use a review, recovery, or mobility path before hard training."

Avoid:

- Diagnosing the cause of pain.
- Saying a movement is medically safe.
- Promising that a substitution prevents injury.
- Hiding important safety notes behind color-only warnings.

## UI Accessibility Checklist

Generated workout UI should include:

- Clear headings for session intent, blocks, exercises, safety, scaling, feedback, and next step.
- Descriptive button labels such as "Generate workout", "Start generated workout", and "Complete generated workout".
- Checkbox labels that include the exercise name.
- Input labels that include the exercise name when repeated fields appear.
- Visible safety notes, not color-only warnings.
- Minimum practical touch target sizes for chips, buttons, and steppers.

## Localization Prep

Keep copy in complete sentences where possible. Avoid concatenating fragments that depend on English word order. Preserve stable fields such as `sessionIntent`, `plainLanguageSummary`, `safetyNotes`, `completionMessage`, and `nextSessionNote`; these are the easiest future localization units.

## Validation

Run:

```bash
npm run test:engine
```

The copy/accessibility test checks:

- Description templates pass copy quality rules.
- Beginner-friendly, athletic, rehab-informed, recovery, readiness-adjusted, and safety-blocked descriptions avoid filler and unsupported medical claims.
- Generated workout UI includes basic accessibility labels and clear headings.
