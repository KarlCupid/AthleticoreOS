# Manual Smoke Test: First-Run Walkthrough

Use this checklist when automated runtime UI testing is unavailable. The current repo has source-level UI guards, linting, type checks, and engine/API tests, but does not include Playwright, Cypress, Detox, Maestro, Appium, React Native Testing Library, or another tap-capable E2E runner.

## Setup

1. Pull the latest branch.
2. Confirm `.env` points at a development Supabase project.
3. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run typecheck:clean`
   - `npm run test:engine`
4. Start one runtime:
   - Web: `npm run web`
   - iOS simulator: `npm run ios`
   - Android emulator: `npm run android`
5. Use disposable development accounts only.
6. Capture screenshots for each first-run case on a small phone viewport and one standard phone viewport.

## Test Accounts

Prepare three accounts:

1. Brand-new account with no `athlete_profiles` row.
2. New account that completed setup but has not completed the first sign-in walkthrough.
3. Existing account with historical profile, training, nutrition, readiness, schedule, body-mass, or fight data and no completed guided journey intro for the current walkthrough version.

## Brand-New Sign-Up

1. Sign out.
2. Create a new disposable account.
3. Complete authentication or email confirmation if required.
4. Confirm the app enters the guided setup walkthrough instead of Today directly.
5. On the welcome step, confirm copy says Athleticore will help the athlete train, fuel, recover, and adapt around the real fight timeline.
6. Complete athlete basics with sport, experience level, current goal, and training status.
7. Leave optional age and current weight blank.
8. Confirm missing optional fields are accepted and not shown as `0`.
9. Continue to journey and fight context.
10. Select `No fight yet`.
11. Confirm no camp is forced and copy says Athleticore will help the athlete build until an opportunity appears.
12. Go back, select `Tentative fight`, add a fight date, and confirm camp language is not forced too early.
13. Go back or reset the step, select `Confirmed fight`, add fight date, optional weigh-in, target class, and target body mass.
14. Confirm body-mass copy says Athleticore checks whether a target looks realistic while protecting performance.
15. Continue to anchors and availability.
16. Select at least one realistic training day.
17. Skip protected workouts and confirm the flow still proceeds.
18. Go back, add a protected sparring or coach-led boxing session, save day, time, duration, and effort.
19. Confirm protected workout copy explains that locked sessions stay anchored and Athleticore builds around them.
20. Continue to fuel and readiness.
21. Select a fueling preference and leave dietary notes blank.
22. Fill one readiness baseline value, then test a second run with all readiness values skipped.
23. Confirm skipped readiness stays unknown and the app remains calm.
24. Complete the final step with `Build my first mission`.
25. Confirm the account lands on Today with Today's Mission visible near the top.
26. Confirm `AthleteJourneyState` and `PerformanceState` behavior through UI:
    - Today shows phase or setup context.
    - Protected workout appears as an anchor when entered.
    - Fight context appears when entered.
    - Missing readiness/body-mass context lowers confidence or asks for context rather than showing zero.
27. Sign out and back in.
28. Confirm completed new-signup setup does not restart from the beginning.

Expected result:

- The user enters first-run setup.
- Required steps work.
- Optional sections can be skipped.
- Missing data remains unknown, not zero.
- Protected workouts persist as anchors.
- Fight context flows into the journey.
- The user lands on Today's Mission.
- Walkthrough progress persists across sign-out/sign-in.

## First Sign-In App Tour

1. Use the account that completed setup but has not completed the app tour.
2. Sign in.
3. Confirm Today opens and Today's Mission remains visible before the tour module.
4. Confirm the first-look walkthrough appears inline, not as a blocking full-screen overlay.
5. Verify each step:
   - Today's Mission: explains what matters today, why, what changed, and what to do next.
   - Training: explains phase, readiness, and protected workouts.
   - Fueling: explains training load, recovery, and fight timeline.
   - Check-In / Readiness: explains when to push, trim extras, or protect recovery.
   - Journey: explains phases, fights, recovery, and progress stay connected.
   - Fight / Competition Hub: appears only when fight context or fight hub support is relevant.
6. Tap each step action and confirm it opens the expected surface or safely stays on Today.
7. Tap `Save for later`.
8. Confirm the tour collapses into a saved/resume state and primary Today actions remain usable.
9. Tap `Resume walkthrough`.
10. Complete all steps.
11. Sign out and sign back in.
12. Confirm the tour does not repeat after completion.

Expected result:

- The tour appears only when appropriate.
- The tour can be skipped and resumed.
- Completion persists.
- The tour does not hide Today's Mission primary CTA, bottom tabs, or urgent actions.

## Existing User Overhaul Intro

1. Use an existing account with historical data.
2. Sign in after clearing only the current walkthrough completion state for the test account.
3. Confirm the user is routed to Today, not forced into full onboarding.
4. Confirm the guided journey intro appears below Today's Mission.
5. Confirm copy explains:
   - history is coming with the athlete
   - Athleticore is organized around the athlete journey
   - Today's Mission brings training, fueling, readiness, body mass, and fight timeline together
   - phase changes are transitions, not restarts
   - protected workouts stay anchored
6. Confirm existing phase, plan, training history, nutrition context, body-mass context, readiness history, and protected workouts are preserved.
7. If missing prompts appear, tap `Review context`.
8. Confirm it routes to the smallest useful existing surface:
   - Log for readiness/check-in context
   - Weight Class for body-mass or weight-class context
   - Plan setup for planning, fight, or protected workout context
9. Return to Today.
10. Tap `Not now`.
11. Confirm data is preserved and the intro does not immediately reappear.
12. Repeat with a fresh test state and tap `Open Today's Mission`.
13. Confirm the intro advances into the first-look walkthrough or resolves according to current walkthrough state.
14. Sign out and back in.
15. Confirm completed or dismissed intro does not repeat.

Expected result:

- Existing users are not forced to restart onboarding.
- Existing data and phase context are preserved.
- Missing critical context can be reviewed without a full reset.
- Intro appears once per walkthrough version unless intentionally versioned again.

## Skip And Resume

1. On a first sign-in tour, tap `Save for later`.
2. Refresh, background/foreground, or sign out/sign in.
3. Confirm the saved walkthrough can resume.
4. Complete the walkthrough.
5. Confirm it no longer appears.
6. On existing-user intro, tap `Not now`.
7. Confirm the intro dismisses and data remains unchanged.

Expected result:

- Skipped app tour can resume.
- Completed tour does not repeat.
- Dismissed existing-user intro does not reset athlete data.

## Today's Mission Landing

1. Complete each first-run case.
2. Confirm Today is the landing surface.
3. Confirm Today's Mission is above the first-look walkthrough, existing-user intro, readiness card, journey summary, and checklist modules.
4. Confirm primary CTA remains visible and tappable.
5. Confirm low-confidence copy asks for a check-in or missing context calmly.

Expected result:

- Today remains the daily command center.
- First-run guidance supports Today's Mission instead of replacing it.

## Small-Screen Walkthrough

Test at:

- 320 x 568
- 375 x 667
- 390 x 844

Steps:

1. Open onboarding and move through every step.
2. Open the first-look walkthrough.
3. Open the existing-user intro.
4. Confirm action rows wrap instead of clipping.
5. Confirm primary, secondary, skip, resume, back, and close controls are at least 44 px tall and tappable.
6. Confirm no card creates horizontal scrolling.
7. Confirm bottom navigation and safe area do not cover final actions.

Expected result:

- No hidden buttons.
- No blocked CTAs.
- No overlapping text or clipped action labels.

## Keyboard And Form Behavior

1. In onboarding, focus age, current weight, target body mass, opponent, event, dietary notes, and injury notes fields.
2. Confirm keyboard-aware layout keeps Continue or final submit reachable by scrolling.
3. Enter invalid age, current weight, target body mass, and fixed-session time.
4. Confirm errors are clear and do not strand the user.
5. Confirm valid values allow progress.

Expected result:

- Keyboard does not trap the user.
- Errors are calm and actionable.
- Form state is retained when navigating back and forward.

## Fight Opportunity Setup

1. In onboarding, test no fight, tentative fight, and confirmed fight paths.
2. In existing user intro, use `Review context` when fight context is missing for a camp or competition-week state.
3. Confirm tentative fights do not force a camp.
4. Confirm confirmed fights can shape camp, fueling, readiness, and body-mass context.
5. Confirm weigh-in date/time, target class, opponent, and event are optional unless required by the selected state.

Expected result:

- Fight context updates the same journey.
- Copy does not imply a reset.
- Body-mass and weight-class language remains safety-first.

## Protected Workout Setup

1. Add sparring, team training, coach-led boxing, fixed class, and other recurring sessions where supported.
2. Confirm day, time, duration, and effort can be set.
3. Complete setup.
4. Open Today and Plan.
5. Confirm protected workouts appear as anchors and are not silently moved or removed.
6. Confirm supporting work adapts around anchors.

Expected result:

- Protected workouts remain non-negotiable anchors.
- Training and fueling guidance reflects hard anchors when relevant.

## Copy And Theme Sweep

Across onboarding, first-look walkthrough, existing-user intro, Today, Plan, Fuel, Log, and Weight Class, confirm:

- Copy feels calm, clear, supportive, serious, human, and coach-like.
- No user-facing robotic phrases appear:
  - `Phase transition state initialized`
  - `Protected sessions detected`
  - `Nutrition preferences collected`
  - `Insufficient body mass data`
- No unsafe user-facing terms appear:
  - `weight cut`
  - `water cut`
  - `dehydration`
  - `sweat suit`
  - `sauna`
  - `diuretic`
  - `laxative`
  - `proceed anyway`
  - `push through`
- The app still uses Athleticore's dark shell, existing cards, typography, spacing, button language, and navigation feel.

## Pass Or Block Criteria

Pass if:

- Automated checks pass.
- The app launches on at least one runtime.
- All three first-run cases route correctly.
- Today's Mission remains primary and usable.
- Completion, skip, resume, and dismissal persist.
- No user is forced to restart unless they truly have no profile.
- No unsafe body-mass or weight-class copy appears.
- No hidden-button, overlay, safe-area, or keyboard trap is found.

Block release if:

- Existing users are sent through full onboarding.
- Any walkthrough reset changes phase, training, nutrition, body-mass, readiness, or protected workouts.
- Missing data is treated as safe or zero.
- Today's Mission is hidden by the tour or intro.
- User-facing weight-cut/dehydration language appears.
- First-run surfaces introduce a visibly different theme.
