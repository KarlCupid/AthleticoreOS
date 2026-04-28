# AthletiCore OS App Review Notes

Fill the `TBD` values below before submission. This file is the working source for the Review Notes field in App Store Connect.

## Review Credentials

- Demo email: `TBD_BEFORE_SUBMISSION`
- Demo password: `TBD_BEFORE_SUBMISSION`
- App version under review: `1.0.0`
- Support contact: `support@athleticore.app` or the configured `EXPO_PUBLIC_SUPPORT_EMAIL`

## Reviewer Path

1. Sign in with the demo account above.
2. Complete onboarding only if the demo account lands there on first launch.
3. Open `Today` to review the mission, readiness state, training load, and nutrition summary.
4. Open `Train` and launch the guided workout flow to review a prescribed session and workout history.
5. Open `Plan` to review weekly planning, calendar, and generated training structure.
6. Open `Fuel` to review nutrition search, barcode scan, weight-class setup, competition body-mass monitoring, and post-weigh-in recovery guidance.
7. Open `Me` to review profile settings, setup guide controls, privacy/support, and in-app account deletion.
8. Open `Me` > `Delete account` to confirm the app includes a complete in-app deletion flow.

## Review Notes

- This first release is free and does not include purchases, subscriptions, or paywalled features.
- Camera permission is used only for food barcode scanning. Users can still search or log food manually without granting camera access.
- Weight-class, rehydration, and recovery content is coaching-oriented educational guidance. The app is not a medical diagnosis, treatment, or emergency service.
- Internal replay-lab tooling is disabled in production builds.
- Account deletion is available inside the app under `Me` > `Delete account`.
- Privacy/support information is available inside the app under `Me` > `Privacy & support`.

## Pre-Submission Checks

- Replace the demo credentials above with a working production account.
- Confirm the support email is monitored.
- Publish the public privacy policy URL referenced in App Store Connect and in the app environment.
- Re-test the barcode scan, delete-account flow, and onboarding path with the exact build being submitted.
