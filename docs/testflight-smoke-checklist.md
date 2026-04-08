# AthletiCore OS TestFlight Smoke Checklist

Run this checklist against the exact production/TestFlight build intended for release.

## Auth And Setup

- Sign in with the test account.
- Confirm onboarding completes without dead ends for a first-run account.
- Confirm planning setup reaches the main tab app.
- Sign out and sign back in successfully.

## Main Product Flows

- `Today` loads the mission, readiness state, training load, and fuel summary.
- Guided workout opens from `Today` or `Train` and reaches the live workout flow.
- `Plan` loads weekly planning and calendar surfaces.
- `Fuel` loads food search and nutrition summary.
- Barcode scan requests camera permission only when entering the scan flow.
- Barcode denial still leaves the user able to back out and use manual food logging.

## Release-Critical Account Flows

- `Me` > `Privacy & support` opens and shows support information clearly.
- `Me` > `Delete account` can complete successfully with a disposable test account.
- After deletion, the app signs the user out and the deleted account can no longer access prior data.

## Release Notes

- Record any crash, blank state, stuck loading state, auth issue, or broken navigation as a launch blocker.
- Do not expand feature scope during this pass; only fix launch-critical defects.
