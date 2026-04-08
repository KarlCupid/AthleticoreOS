# AthletiCore OS App Privacy Disclosure Draft

This draft maps the current product behavior to the App Privacy questionnaire in App Store Connect. Confirm final answers against the production backend and analytics setup before submission.

## Summary

- Tracking: `No`
- Third-party advertising: `No`
- Data brokers: `No`
- Purchases: `No`

## Data Linked To The User

- Contact info
  - Email address used for account sign-in and support follow-up.
- Health and fitness
  - User-entered training logs, readiness check-ins, workout history, nutrition logs, hydration logs, body weight, fight-camp inputs, and weight-cut planning data.
- User content
  - Custom exercise entries, custom food entries, notes entered during planning or logging flows.
- Identifiers
  - Account ID and related Supabase auth identifiers required to sync user data across sessions.

## Data Not Used For Tracking

- All current user data is used for app functionality, account management, and support.
- No current repo evidence shows advertising, data sale, or cross-app tracking.

## Camera Permission

- Camera access is requested only for barcode scanning in the nutrition flow.
- Camera content is used to scan the barcode value and is not presented as a general photo or video capture feature.

## Account Controls

- Users can sign out inside the app.
- Users can delete their account and stored app data inside the app under `Me` > `Delete account`.

## Final Verification Before Submission

- Confirm no hidden analytics or crash SDKs introduce additional disclosure obligations.
- Confirm the production support email and privacy policy URL are active.
- Re-verify the exact set of data stored in Supabase against the latest schema and backend behavior.
