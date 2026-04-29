# Manual UI Smoke Test

Use this checklist when validating UI interactions, responsive layout, keyboard behavior, and safe-area coverage. Preserve the existing Athleticore visual style; this pass is only for reachability, clipping, blocked controls, and broken interactions.

Run this checklist when automated browser or simulator UI testing is unavailable. The current repo has source-level UI guards, engine tests, linting, type checks, and Expo web export, but does not include Playwright, Cypress, Detox, React Native Testing Library, or another tap/click-capable UI runner.

## Viewports

- Small phone portrait: 320 x 568.
- Common phone portrait: 375 x 667.
- Large phone portrait: 390 x 844.
- Phone landscape: 667 x 375.
- Tablet portrait, if supported: 768 x 1024.
- Desktop/web, if supported: 1280 x 800.

## Global Checks

- App starts without a runtime crash.
- Dashboard/home loads after auth or seeded app state resolves.
- The app still looks like Athleticore: same dark shell, card style, colors, typography, spacing rhythm, and tab navigation feel.
- No screen has horizontal scrolling from cards, long copy, or action rows.
- Bottom navigation never covers the final primary CTA or submit button.
- Sticky headers do not cover the first actionable control.
- Long athlete names, emails, fight names, phase names, and explanation text wrap inside their containers.
- Loading, empty, and error states keep retry/cancel actions visible.
- Modal, drawer, and bottom-sheet content can scroll when taller than the viewport.
- Close, cancel, destructive, and secondary actions remain visible and tappable.
- Touch targets for important actions are at least 44 px tall.

## Test Data

- Long athlete name: "Alexandria Montgomery-Santos Championship Camp".
- Long opponent/event name: "Northwest Golden Gloves Regional Final Alternate Opportunity".
- Fight date: 21 days from today.
- Weigh-in date: 1 day before fight date.
- Body mass: a realistic current value for the test athlete.
- Unsafe target: a target weight far enough away from current body mass that Athleticore should block a risky plan.
- Long explanation/risk message: use seeded or debug state that produces missing readiness, under-fueling, or unsafe weight-class context.

## Startup And Navigation

1. Launch the app.
2. Confirm there is no runtime crash, red error overlay, blank screen, or infinite loading state.
3. Confirm the dashboard/home screen loads.
4. Tap each bottom tab: Today, Train, Plan, Fuel, Me.
5. Confirm each tab switches, the active tab state updates, and no tab opens the wrong screen.
6. Use visible back buttons from nested screens and confirm each returns to the prior screen.

## Today And Today's Mission

1. Open Today on a small phone viewport.
2. Confirm Today's Mission appears near the top of the dashboard.
3. Confirm the primary CTA is visible, enabled when expected, and tappable.
4. Tap the primary CTA and confirm it navigates or acts according to the mission intent: check-in, start session, log fuel, review plan, or weight-class support.
5. Return to Today.
6. Tap each secondary action and confirm it opens the expected screen or action.
7. Open and close the mission details or explanation toggle.
8. Confirm risk, confidence, and explanation text do not cover the primary CTA or secondary actions.
9. Scroll to the bottom and confirm bottom navigation does not cover the final card or action.
10. Trigger the first-run modal if available. Confirm "Check In" is reachable and "Not now" closes the modal.

## Onboarding

1. Start from a fresh or reset user state.
2. Move through each onboarding step.
3. Confirm each Continue button is disabled until required fields are valid.
4. Enter text into required fields and confirm the keyboard does not cover Continue or Submit.
5. Tap Back where available and confirm it returns to the previous step without losing valid entered context unexpectedly.
6. Complete final submit.
7. Confirm athlete journey setup initializes and the app lands on the expected post-onboarding surface.

## Phase Transition

1. Use a seeded state with a phase transition card.
2. Confirm transition copy avoids reset-style language such as "start over", "restart", or "reset".
3. Tap Continue or Confirm.
4. Confirm the card resolves or advances without resetting the athlete journey context.
5. If a cancel/back action appears, tap it and confirm it closes or returns safely.

## Fight Opportunity

1. Open Plan and start the fight opportunity setup.
2. Choose a tentative fight status.
3. Enter a long opponent/event name, fight date, weigh-in timing, rounds, and optional details.
4. Tap Evaluate and confirm a summary or recommendation appears.
5. Go back/cancel and confirm the user is not trapped.
6. Repeat with confirmed fight status.
7. Toggle changed weight-class flow and select or enter the changed class.
8. Confirm risk warnings are visible but do not block safe navigation, back, cancel, or safer review actions.
9. Submit/Save where available and confirm the app transitions the journey without restart copy.

## Training

1. Open Train.
2. Open the current or next training session.
3. Tap the session/start CTA.
4. Confirm guided workout controls are reachable: activation done, skip activation, previous exercise, leave, retry if shown.
5. Open any explanation or merged-session detail if available, then close it.
6. Finish or exit to the workout summary.
7. Confirm summary buttons navigate back to plan/training home as labeled.
8. Open a protected workout detail if supported and confirm it is visible as an anchor, not silently removed.

## Fueling And Nutrition

1. Open Fuel.
2. Toggle quick and detailed modes.
3. Open fueling details/expanders and close them.
4. Tap main nutrition CTAs: quick log, full tracker, scan food if available, custom food, and weight-class link.
5. In food search, type a query, switch search modes, select a result, and use the back button.
6. In food detail, change serving/amount if available, toggle Save to Favorites, and tap Add/Save.
7. In custom food, leave required fields empty and confirm Save is disabled or guarded.
8. Fill required fields, open the keyboard, and confirm Save remains reachable by scrolling if needed.
9. Confirm macro/fueling cards and low-confidence explanations do not block CTAs.

## Check-In And Readiness

1. Open Log or Check-In.
2. Enter body mass if available.
3. Tap each readiness scale value and confirm it updates.
4. Open help/tooltips and close them.
5. Add pain/injury concern if available.
6. Open the keyboard in an input field and confirm Submit remains reachable.
7. Tap Submit.
8. Confirm a readiness response, updated guidance, or saved state appears.
9. If missing-data prompt actions appear, tap them and confirm they route to the expected input or check-in surface.

## Body Mass And Weight Class

1. Open Weight Class or Body Mass from Fuel/Today.
2. Tap evaluate class or start setup.
3. Enter sport, current body mass, target class, fight date, and weigh-in date.
4. Confirm Next and Activate/Submit buttons are reachable on small phone and landscape viewports.
5. Test an unsafe target.
6. Confirm the unsafe warning blocks risky plan activation but still allows back, safer alternatives, review, or cancellation.
7. Confirm safe navigation actions such as history, fight-week support, post-weigh-in recovery, and end plan are reachable if shown.

## Modals, Sheets, Drawers, And Pickers

1. Open date and time pickers.
2. Confirm Cancel, Done, and scrim close behavior work where supported.
3. Open readiness gates, PR celebrations, day-detail add/edit sheets, and any drawer/bottom sheet reachable from the core tabs.
4. Confirm every close/cancel/back action is visible and tappable.
5. On a short viewport, confirm modal/sheet content scrolls and the final action is not below the safe area.

## Settings And Profile

1. Open Me.
2. Edit base weight, target weight, and fight date on small phone and landscape.
3. Confirm Save and Cancel remain visible above the keyboard.
4. Confirm long email/profile text wraps and does not push actions off screen.
5. Toggle supported settings and confirm changes persist or show a clear error.

## Pass Criteria

- The user can complete each intended flow without rotating the device, dismissing overlays by force, or guessing at hidden controls.
- The final actionable control on every scrollable screen has enough bottom padding to clear safe area and bottom navigation.
- Every modal/sheet either fits or scrolls, and every visible active control responds to tap/click.
- Safety-blocked body-mass and weight-class flows prevent risky activation while preserving safe navigation.
- No active button, link, tab, modal close, drawer close, or form submit is a dead control.
