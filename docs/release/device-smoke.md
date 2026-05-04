# Athleticore OS Device Smoke Suite

Use this scripted manual suite as the final device-level gate before friend preview. Run it against the exact `preview` build intended for distribution, installed on at least one real iOS device and one real Android device. Simulator, emulator, and Expo Go runs are useful while fixing bugs, but they do not satisfy this release gate.

## Release Gate

Preview can ship only when:

- One real iOS device row and one real Android device row below are complete.
- Every flow has a pass/fail result on both platforms.
- Every failed step is triaged as `Blocker`, `Acceptable preview limitation`, or `Deferred production issue`.
- Blockers are fixed and re-tested on both platforms.
- Screenshots and logs are captured for every failed flow, and at least one screenshot is captured for each passed major flow on each platform.

## Build Under Test

| Field | Value |
| --- | --- |
| Git SHA | TBD |
| App version/build | TBD |
| EAS profile | `preview` |
| Supabase project/environment | TBD |
| iOS install source | TBD |
| Android install source | TBD |
| Tester(s) | TBD |
| Smoke started | TBD |
| Smoke completed | TBD |
| Final decision | TBD |

Confirm the preview build uses:

- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA=0`
- `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW=0`

## Required Physical Devices

| Platform | Device model | OS version | Install source/build id | Tester | Date | Result | Artifact folder |
| --- | --- | --- | --- | --- | --- | --- | --- |
| iOS | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Android | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

## Test Accounts

Prepare disposable accounts only. Do not use a personal production account for destructive tests.

| Account | Purpose | Email | Notes |
| --- | --- | --- | --- |
| Fresh account A | Sign-up, email confirmation, onboarding, planning setup | TBD | Delete after smoke if deletion is in scope. |
| Existing account B | Sign-in, reload, main flows with saved data | TBD | Should already have completed onboarding and planning setup. |
| Disposable deletion account C | Account deletion | TBD | Must contain enough data to prove deletion signs out and blocks re-access. |
| Password reset account D | Password reset | TBD | Must have mailbox access. |

## Artifact Rules

Use one folder per platform and build, for example:

- `artifacts/device-smoke/ios-<build-id>/`
- `artifacts/device-smoke/android-<build-id>/`

For each flow, record:

- Result: `Pass`, `Fail`, or `Not applicable with reason`.
- Screenshots: start state, critical confirmation state, and any error state.
- Logs: device console excerpt for failures, plus timestamps.
- Notes: account used, network state, permission state, and any retries.

Suggested screenshot names:

- `01-auth-sign-up-confirmation-ios.png`
- `07-train-active-workout-android.png`
- `12-offline-retry-ios.png`

Suggested logs:

- iOS: collect from Xcode Devices and Simulators console or macOS Console filtered to the device/app.
- Android: collect `adb logcat` filtered around the test timestamp.

## Triage Ledger

Every failed step must get one row before the preview decision is made.

| ID | Flow | Platform | Failure summary | Classification | Owner | Issue/PR | Retest result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | `Blocker` / `Acceptable preview limitation` / `Deferred production issue` | TBD | TBD | TBD |

Classification rules:

- `Blocker`: crash, blank screen, infinite loading, auth dead end, onboarding/setup dead end, data loss, unsafe body-mass guidance, broken active-workout recovery, account deletion failure, or any flow required for friend preview that cannot be completed.
- `Acceptable preview limitation`: a known constraint that does not block safe friend preview, is clearly documented to testers, and has a workaround inside the app.
- `Deferred production issue`: a non-critical defect that should be fixed before broader release but does not compromise safety, trust, or core preview use.

## Preflight

1. Install the exact preview build on both required devices.
2. Confirm both devices have enough battery and storage.
3. Confirm date/time are automatic and correct.
4. Start on Wi-Fi with cellular available if the device supports it.
5. On each device, uninstall older Athleticore builds before testing fresh sign-up.
6. Confirm camera permission is reset before barcode testing.
7. Run local checks before the device pass when preparing the build:

```bash
npm run quality
```

Pass criteria:

- Local checks passed before the build was cut, or any known local-check failure is separately triaged.
- Preview build launches on both physical devices without a crash, red error overlay, or blank startup state.

Screenshot/log notes:

- Capture the installed build number/version screen if available.
- Capture launch screen or first auth screen on both platforms.

## Flow 1: Auth, Sign-Up, Email Confirmation, Sign-In, Sign-Out

Run on: iOS and Android.

Steps:

1. Start from a clean install with no active session.
2. Enter fresh account A email and password.
3. Tap `Create Account`.
4. If the app shows `Check your email for confirmation.`, open the confirmation email on the same device, complete the confirmation, and return to Athleticore.
5. If the backend does not require confirmation, confirm the app proceeds directly into the authenticated first-run state.
6. Kill and reopen the app.
7. Sign in with fresh account A if not already signed in.
8. Navigate to `Me`.
9. Tap `Sign Out`.
10. Confirm the auth screen returns.
11. Sign in again with the same account.

Pass criteria:

- Sign-up gives a clear success or confirmation state.
- Email confirmation, when required, can be completed without trapping the user outside the app.
- Sign-in works after confirmation.
- Sign-out clears the authenticated app state and returns to the auth screen.
- Re-sign-in restores the same account and does not create duplicate onboarding state.

Fail criteria:

- Confirmation link cannot be completed on device.
- Sign-in succeeds but app remains stuck loading.
- Sign-out leaves private data visible.
- Account enters the wrong user state after re-sign-in.

Screenshot/log notes:

- Capture auth screen, sign-up success/confirmation alert, post-confirmation destination, sign-out destination, and any auth error.
- For failures, include Supabase/auth error text and the device log timestamp.

## Flow 2: Password Reset

Run on: iOS and Android.

Steps:

1. Start signed out.
2. Look for a password reset entry point on the auth screen.
3. Request a reset email for password reset account D.
4. Open the reset email on the same device.
5. Complete the reset and set a new password.
6. Return to the app and sign in with the new password.
7. Confirm the old password no longer signs in.

Pass criteria:

- User can discover and complete password reset from the signed-out state.
- Reset email opens safely on both platforms.
- New password signs in and old password fails.
- Errors are clear and do not expose sensitive data.

Fail criteria:

- No password reset entry point exists in the preview build.
- Reset link does not open or cannot complete on device.
- New password cannot sign in after reset.

Screenshot/log notes:

- Capture reset entry point, reset request confirmation, reset completion, successful sign-in, and any missing UI/error state.
- If no reset flow exists, triage explicitly. For friend preview, classify as `Blocker` unless preview distribution is intentionally invite-only and testers have a documented support workaround.

## Flow 3: Onboarding Completion

Run on: iOS and Android with fresh account A.

Steps:

1. Sign in with a fresh account that has no athlete profile.
2. Confirm the app routes to onboarding instead of `Today`.
3. Complete athlete basics with realistic combat-sports data.
4. Test no-fight, tentative-fight, and confirmed-fight branches where the flow allows backtracking.
5. Leave optional readiness/body-mass fields blank in one pass.
6. Add at least one protected workout in another pass if the UI supports it.
7. Submit onboarding.
8. Kill and reopen the app.

Pass criteria:

- Required fields gate progress clearly.
- Optional missing data is treated as unknown, not zero.
- Protected workouts persist as schedule anchors when entered.
- Body-mass and weight-class copy stays safety-first.
- Completion routes to planning setup or the main app according to the account state.
- Reload does not restart completed onboarding.

Fail criteria:

- User is trapped by keyboard, validation, modal, or disabled CTA.
- Missing body-mass/readiness data is presented as safe or as `0`.
- Unsafe weight-class guidance appears.
- Completed onboarding restarts after reload.

Screenshot/log notes:

- Capture first onboarding screen, a validation state, fight/body-mass state, protected workout state if used, final completion state, and reload state.

## Flow 4: Planning Setup Completion

Run on: iOS and Android after onboarding.

Steps:

1. Continue from an account whose entry state is `needs_training_setup`.
2. Complete `Journey Planning` / weekly plan setup.
3. Enter realistic availability, goal, training background, and fixed commitments.
4. Add a fight opportunity if available.
5. Submit or generate the plan.
6. Confirm the app enters the main tab app.
7. Open `Plan` and `Today` to confirm plan context is visible.
8. Kill and reopen the app.

Pass criteria:

- Planning setup completes without a dead end.
- Protected/fixed sessions remain anchors.
- Generated plan appears in `Plan` and informs `Today`.
- Reload does not force planning setup again.

Fail criteria:

- Setup cannot complete on either platform.
- Generated plan is empty without a clear explanation.
- Protected sessions are silently moved or removed.
- The account returns to setup after a successful submit.

Screenshot/log notes:

- Capture setup start, final review/submit, generated plan, `Today` plan context, and reload destination.

## Flow 5: Today Dashboard, Refresh, Check-In Logging, Activity Logging

Run on: iOS and Android with an account that completed planning setup.

Steps:

1. Open `Today`.
2. Confirm Today's Mission, readiness state, training load, and fuel summary load.
3. Pull to refresh or use the visible refresh behavior if available.
4. Open check-in/log from the primary mission CTA or `Today` action.
5. Log sleep, stress, soreness/readiness, hydration/nutrition context, and body mass where available.
6. Submit the check-in.
7. Return to `Today` and confirm guidance updates or acknowledges the check-in.
8. Open `ActivityLog`.
9. Log a non-guided activity with duration/intensity.
10. Return to `Today` and confirm the activity appears or the training load changes.

Pass criteria:

- Dashboard loads without blank cards or infinite loading.
- Refresh completes and preserves navigation state.
- Check-in saves and updates visible guidance.
- Activity logging saves and updates visible context.
- Missing optional values remain unknown and do not become zero.

Fail criteria:

- Refresh crashes or duplicates data.
- Check-in/activity submit appears successful but data disappears after navigation/reload.
- Today guidance contradicts safety signals.

Screenshot/log notes:

- Capture initial `Today`, refreshing/loading state, check-in form, check-in confirmation, activity form, and updated `Today`.

## Flow 6: Train Guided Workout Lifecycle

Run on: iOS and Android with a planned guided workout available.

Steps:

1. Open `Train`.
2. Confirm workout home loads current/next session and history without crashing.
3. Open the current workout detail if shown.
4. Start the guided workout.
5. Log at least one set, interval, or effort according to the workout type.
6. Pause the workout if a pause control exists.
7. Background the app for at least 60 seconds.
8. Reopen the app.
9. Resume the workout.
10. Complete the workout.
11. Confirm the workout summary appears.
12. Return to `Train`, `Plan`, and `Today` to confirm completion state is reflected.

Pass criteria:

- Workout home and detail load on both platforms.
- Guided workout starts and hides bottom tabs when expected.
- Background/resume keeps the active workout usable.
- Completion creates a summary and updates plan/training state.
- No duplicate workout log appears after completion.

Fail criteria:

- Active workout is lost after backgrounding.
- App reloads into a broken or blank workout state.
- Completion fails silently or creates duplicate records.
- Summary cannot be exited.

Screenshot/log notes:

- Capture workout home, active workout, paused state, resumed state, completion submit, summary, and updated plan/training state.
- For failures, capture device logs from 30 seconds before backgrounding through resume.

## Flow 7: Plan Weekly Plan, Calendar, Day Detail, Weekly Review

Run on: iOS and Android.

Steps:

1. Open `Plan`.
2. Confirm weekly plan loads current week.
3. Navigate previous/next week if controls exist.
4. Open `Calendar`.
5. Select a day with a planned activity.
6. Open day detail.
7. Add or edit an activity if the UI allows it.
8. Mark a day complete/skip from the appropriate control if available.
9. Open `Weekly Review`.
10. Return to `Plan`.

Pass criteria:

- Weekly plan, calendar, day detail, and weekly review are reachable.
- Day detail reflects planned and logged activities.
- Edits/completion status persist after navigation.
- Weekly review handles insufficient data with a clear empty/low-confidence state.

Fail criteria:

- Calendar/day detail opens the wrong date.
- Plan actions corrupt protected workouts.
- Weekly review crashes with low or no data.

Screenshot/log notes:

- Capture weekly plan, calendar, day detail, any add/edit sheet, weekly review, and return state.

## Flow 8: Fuel Nutrition, Food Search, Custom Food, Barcode Permission, Hydration

Run on: iOS and Android.

Steps:

1. Reset camera permission for the app before starting this flow.
2. Open `Fuel`.
3. Confirm nutrition summary and hydration state load.
4. Log hydration.
5. Open food search.
6. Search for a common food and open food detail.
7. Add the food to the log.
8. Return to `Fuel` and confirm totals update.
9. Open custom food.
10. Attempt to save with required fields empty.
11. Fill required fields and save.
12. Open barcode scan.
13. Deny camera permission.
14. Confirm the app remains usable and manual search/custom food are still reachable.
15. Reset permission to allowed in device settings.
16. Reopen barcode scan and allow camera permission.
17. Scan a barcode or, if no barcode fixture is available, confirm the camera scanner opens and can be exited safely.

Pass criteria:

- Fuel summary, food search, custom food, barcode scanner, and hydration are reachable.
- Hydration and food logs update totals.
- Custom food validation prevents incomplete saves.
- Camera denial has clear copy and safe navigation.
- Camera allowed state opens scanner without crashing.

Fail criteria:

- Barcode permission denial traps the user.
- Camera permission is requested before entering scan flow.
- Food/hydration logs disappear after navigation or reload.
- Manual logging is unavailable when barcode scanning fails.

Screenshot/log notes:

- Capture Fuel home, hydration entry, food search results, food detail, custom food validation, barcode denied state, barcode allowed scanner, and updated totals.

## Flow 9: Weight-Class Setup, Competition Body-Mass, Post-Weigh-In Recovery

Run on: iOS and Android with safe, realistic test data. Do not test aggressive dehydration or extreme restriction protocols.

Steps:

1. Open `Fuel`.
2. Open `Weight Class`.
3. Start or edit weight-class setup.
4. Enter sport, current body mass, target class, fight date, and weigh-in date.
5. First use a realistic target.
6. Review and activate/save the plan if allowed.
7. Open competition body-mass monitoring.
8. Log a realistic body-mass value.
9. Return to weight-class home.
10. Open post-weigh-in recovery.
11. Review guidance and log recovery/hydration inputs if supported.
12. Repeat setup with an unsafe target far enough from current body mass that the app should warn or block activation.

Pass criteria:

- Setup, competition monitoring, and post-weigh-in recovery are reachable.
- Safe plans use cautious, explainable copy.
- Unsafe targets are blocked or clearly escalated to safer alternatives.
- Missing safety data lowers confidence or asks for context.
- No copy recommends dehydration, extreme restriction, diuretics, laxatives, or pushing through illness/injury.

Fail criteria:

- Unsafe target can be activated without safety warning.
- Missing safety data is treated as safe.
- Post-weigh-in recovery implies aggressive dehydration is acceptable.
- Body-mass values save as zero when blank.

Screenshot/log notes:

- Capture setup inputs, safe review/activation, competition body-mass log, post-weigh-in recovery, unsafe warning/block, and any safety copy.

## Flow 10: Me Profile, Legal/Support Links, Account Deletion

Run on: iOS and Android. Use disposable deletion account C for deletion.

Steps:

1. Open `Me`.
2. Edit profile fields available in the preview build.
3. Save and navigate away.
4. Return to `Me` and confirm edits persist.
5. Open legal/support links.
6. Confirm privacy/support content loads and any external links open safely.
7. Sign out and sign back in.
8. With disposable deletion account C, open `Me` > `Delete account`.
9. Confirm the destructive confirmation is required.
10. Complete deletion.
11. Confirm the app signs out.
12. Attempt to sign in again with deleted account C.

Pass criteria:

- Profile edits persist after navigation and sign-in.
- Legal/support content is reachable and readable.
- Account deletion requires explicit confirmation.
- Deletion signs out and prevents access to prior account data.
- Deletion errors are clear and do not leave the account half-deleted.

Fail criteria:

- Delete button can be triggered accidentally.
- Deletion reports success but account can still access data.
- Legal/support links are missing or crash.
- Sign-out/sign-in loses unrelated profile state.

Screenshot/log notes:

- Capture profile before/after edit, legal/support screen, delete confirmation, post-deletion auth screen, and deleted-account re-sign-in result.

## Flow 11: Network Degraded And Offline Behavior

Run on: iOS and Android.

Steps:

1. Start authenticated on `Today`.
2. Turn on airplane mode.
3. Kill and reopen the app.
4. Confirm the app shows a recoverable loading/error state instead of a blank screen.
5. Try `Today` refresh.
6. Try opening `Train`, `Plan`, `Fuel`, and `Me`.
7. Attempt one check-in or food/activity log while offline if the UI allows it.
8. Turn network back on.
9. Tap retry or refresh.
10. Confirm the app recovers without duplicate writes.
11. Repeat with degraded network if available, such as poor Wi-Fi or OS network conditioner.

Pass criteria:

- Offline startup is understandable and recoverable.
- Existing authenticated state is not lost solely due to network failure.
- Retry works after network returns.
- Failed writes show clear errors or queued state.
- No duplicate check-ins, activities, food logs, or workout logs are created after recovery.

Fail criteria:

- App signs out unexpectedly because network is unavailable.
- User sees a permanent blank/loading state.
- Failed writes look successful but are lost.
- Retry creates duplicate records.

Screenshot/log notes:

- Capture offline startup, retry/error copy, offline action attempt, restored network state, and updated data after recovery.
- Include timestamps for network toggles.

## Flow 12: App Reload While Authenticated

Run on: iOS and Android.

Steps:

1. Sign in with existing account B.
2. Open `Today`.
3. Kill the app from the app switcher.
4. Reopen the app.
5. Confirm the authenticated app loads without asking for credentials.
6. Navigate to `Train`, `Plan`, `Fuel`, and `Me`.
7. Repeat after device lock/unlock.

Pass criteria:

- Session is restored.
- App routes to the correct post-onboarding/planning state.
- No private data from a previous account appears.
- Main tabs remain responsive after reload.

Fail criteria:

- Authenticated user is signed out unexpectedly.
- App re-enters onboarding or planning setup incorrectly.
- Previous account data flashes or appears.
- Tabs are unresponsive after reload.

Screenshot/log notes:

- Capture pre-kill `Today`, first screen after reopen, and one main tab after reload.

## Flow 13: App Reload During Active Workout

Run on: iOS and Android with a guided workout available.

Steps:

1. Open `Train`.
2. Start a guided workout.
3. Log at least one set/effort.
4. Background the app for 60 seconds.
5. Return and confirm active workout state.
6. Kill the app from the app switcher while the workout is active.
7. Reopen the app.
8. Navigate back to `Train` or the active workout if automatically restored.
9. Confirm the user can safely resume, complete, or intentionally exit without corrupting the workout log.
10. Complete the workout if possible.
11. Confirm summary and plan/history updates.

Pass criteria:

- Active workout progress survives backgrounding.
- Reload during active workout has a clear recovery path.
- Logged sets/efforts are not duplicated or lost.
- Completion after reload produces one summary and one completion record.

Fail criteria:

- Workout disappears with no recovery or explanation.
- Workout reload opens a blank or broken screen.
- Completion after reload creates duplicate records.
- User cannot leave or complete the recovered workout.

Screenshot/log notes:

- Capture active workout before kill, first screen after reopen, recovered workout/progress, completion summary, and workout history.
- Include device logs from the kill/reopen window.

## Final Decision

| Decision item | Result |
| --- | --- |
| iOS physical-device smoke complete | TBD |
| Android physical-device smoke complete | TBD |
| All blockers fixed and re-tested | TBD |
| Preview limitations documented for friends | TBD |
| Deferred production issues filed | TBD |
| Friend preview approved by | TBD |
| Approval date | TBD |

Friend preview is approved only when the final decision table is complete and no `Blocker` rows remain open in the triage ledger.
