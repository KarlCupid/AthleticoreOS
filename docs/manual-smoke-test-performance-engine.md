# Manual Smoke Test: Performance Engine Journey

Use this checklist when a local browser, simulator, or Expo Go session has access to a real test account and development database.

## Setup

1. Pull the latest branch.
2. Confirm `.env` includes `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Install dependencies if needed: `npm install`.
4. Run static checks:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run typecheck:clean`
   - `npm run test:engine`
5. Start the app:
   - Web: `npm run web`
   - iOS simulator: `npm run ios`
   - Android simulator: `npm run android`
6. Sign in with a dedicated test user or create a disposable development account.

## New User Onboarding

1. Start with a test user that has no profile or journey records.
2. Complete onboarding with age, body mass, training background, available days, and at least one fixed boxing or sparring session.
3. Confirm onboarding completes without a runtime error.
4. Confirm the app proceeds into the journey/planning flow instead of restarting setup.
5. Confirm missing optional data is represented as unknown or low confidence, not as `0`.

Expected result:

- An `AthleteJourneyState` is initialized.
- Initial `PerformanceState` is available to dashboard and planning surfaces.
- Protected workouts captured in onboarding remain visible as anchors.

## Dashboard Journey Continuity

1. Open Today/Dashboard after onboarding.
2. Confirm the dashboard loads without crashes or blank panels.
3. Confirm it shows:
   - current phase
   - journey segment or current block context
   - protected workouts
   - training focus
   - nutrition focus
   - readiness state or low-confidence state
   - risk flags when present
   - explanations for major recommendations

Expected result:

- The dashboard reads canonical unified performance output.
- The athlete journey feels continuous from onboarding.

## Build To Camp Transition

1. Begin from a build-phase athlete with existing dashboard/training context.
2. Create or confirm a fight opportunity if the UI exposes this flow.
3. Return to dashboard and plan screens.

Expected result:

- Phase changes to camp or an appropriate fight-specific phase.
- Prior body-mass, nutrition, readiness, protected workout, and training context remains visible.
- The dashboard explains why the phase changed.

## Fight Opportunity Updates

Use a test athlete with existing build or camp history.

1. Add a tentative fight.
2. Confirm that the app updates journey context without fully overriding the current phase.
3. Confirm the fight.
4. Confirm camp or short-notice camp is recommended when timing calls for it.
5. Reschedule the fight.
6. Cancel the fight.

Expected result:

- Tentative, confirmed, short-notice, rescheduled, and canceled states update the same journey.
- Canceled or delayed fights do not erase history.
- Changed timing updates phase recommendations and explanations.

## Training And Protected Workouts

1. Open Plan or Training.
2. Confirm protected workouts from onboarding or calendar imports are visible.
3. Confirm generated training works around protected sparring or boxing practice.
4. Confirm competition or hard sparring is treated as a hard-day anchor.

Expected result:

- Protected workouts are not silently moved, deleted, shortened, or merged.
- Generated sessions preserve recovery instead of spreading medium stress across every day.

## Nutrition And Fueling

1. Open Fuel or Nutrition.
2. Confirm daily targets show phase-aware and training-aware nutrition.
3. Inspect a hard sparring or camp day.
4. Confirm session fueling guidance exists for that session.
5. Log a manual or incomplete food entry.

Expected result:

- High-intensity sparring or camp context increases fueling/recovery emphasis.
- Low-confidence food logging is surfaced as low confidence.
- Missing nutrients are unknown, not zero.

## Tracking And Readiness

1. Open Log or Tracking.
2. Log poor sleep, soreness, fatigue, or low subjective readiness.
3. Return to dashboard and training surfaces.

Expected result:

- Readiness changes.
- Training recommendation adjusts or becomes more conservative.
- The app explains the adjustment.
- Wearable-positive data does not override a subjective concern automatically.

## Body-Mass And Weight-Class Safety

1. Open the body-mass or weight-class management surface.
2. Enter an aggressive or unrealistic target for an upcoming competition.
3. Review the resulting guidance.

Expected result:

- Unsafe targets are blocked or escalated.
- Safer alternatives or professional review are surfaced.
- The UI does not recommend dehydration protocols, sauna, sweat suits, diuretics, laxatives, vomiting, severe fasting, or extreme fluid restriction.
- User-facing copy uses body-mass or weight-class language, not "weight cut" language.

## Language Sweep

1. Navigate Auth, Onboarding, Today, Plan, Train, Fuel, Log, Me, body-mass, and weight-class surfaces.
2. Search visually for "weight cut", "cut protocol", and similar language.

Expected result:

- No user-facing "weight cut" language remains unless it appears in an explicitly deprecated or historical note.
- Preferred language is body mass, body-mass management, weight-class management, weight-class feasibility, competition body mass, or weigh-in logistics.

## Final Validation

Run:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run test:engine`
- `npm run quality`

Record:

- platform tested
- test account used
- browser or simulator version
- flows completed
- screenshots of dashboard, fueling, readiness, and body-mass safety states
- any console/runtime errors
