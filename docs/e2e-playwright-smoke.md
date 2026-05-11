# Playwright Expo Web Smoke

This smoke suite runs Athleticore OS through the Expo web build with Playwright. It is a preliminary UI check for obvious app-flow, copy, routing, first-screen hierarchy, CTA, and layout regressions before native device testing.

It is not a replacement for iOS or Android manual testing. Native behavior, safe areas, haptics, camera, keyboard behavior, and device-specific rendering still need hands-on checks.

## Setup

Install the Playwright Chromium browser once:

```bash
npm run e2e:install
```

The test runner starts Expo web on `http://127.0.0.1:8081` through `scripts/start-expo-web-e2e.js` in offline mode. The wrapper keeps Expo startup network checks out of local smoke runs and shuts the dev server down cleanly on Windows. Override the port or base URL only when needed:

```bash
E2E_WEB_PORT=8090 npm run e2e:web
E2E_BASE_URL=http://127.0.0.1:8090 npm run e2e:web
```

## Run

```bash
npm run e2e:web
npm run e2e:web:headed
npm run e2e:web:debug
npm run e2e:report
```

The combined preliminary smoke command also runs the source-level UI copy audit:

```bash
npm run e2e:smoke
```

## Test Credentials

Authenticated app flows require a real safe test account:

```bash
E2E_EMAIL=tester@example.com E2E_PASSWORD=replace-me npm run e2e:web
```

Do not hardcode credentials in the repo. Without `E2E_EMAIL` and `E2E_PASSWORD`, the auth smoke tests still run and authenticated tests skip with a clear reason.

## Coverage

The suite covers:

- Auth screen load, forgot password, and invalid sign-in copy.
- Onboarding guard behavior for signed-out users.
- Authenticated onboarding copy when the configured account still needs onboarding.
- Signed-in Today, Train, Fuel, Me, and reachable Weight Class surfaces.
- Train Today, Week, Recent, and Progress subtabs.
- WorkoutDetail support-session preview when the test account has a support session.
- Fuel quick and tracker modes.
- Weight-class context when reachable.
- Desktop Chromium and a small-phone Chromium viewport around 390 x 844.

Data-dependent tests skip when the configured account has no relevant plan entry, support session, onboarding state, or reachable weight-class context. That skip is intentional: this harness should catch broken surfaces without creating production-visible backdoors.

## Failure Artifacts

Playwright keeps artifacts on failure:

- Screenshots, traces, and videos: `test-results/`
- HTML report: `playwright-report/`

Open the report with:

```bash
npm run e2e:report
```

Use the failing screenshot or trace to decide whether the issue blocks manual native testing. After the web smoke is green or the remaining skips are understood, continue with the manual iOS and Android smoke checklist.
