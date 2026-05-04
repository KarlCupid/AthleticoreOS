# Friend Preview Readiness Dossier

Last updated: 2026-05-04

This is the source of truth for the KarlCupid/AthleticoreOS friend-preview launch state. Friend preview means a controlled internal distribution to known testers, not a production catalog rollout.

## Decision

**Status: gated, not yet distributable.**

Core repo quality passes on the current target commit, but the preview build has not been cut, physical-device smoke results are not complete, public support/privacy/marketing URLs are still unset, Sentry preview-event verification is not complete, and live DB/RLS smoke has not been run against a protected non-production Supabase target.

## Target Build

| Item | Value |
| --- | --- |
| Target commit SHA | `cf830a713625e5ab91d484b7adfcb6234e9d8c28` |
| Branch | `main` |
| App version | `1.0.0` |
| iOS build number | `1` |
| Bundle identifier | `com.karlcupid.athleticoreos` |
| Expo owner | `karlcupid` |
| EAS project ID | `60dff959-8e97-4284-a7c7-be0e8c442c00` |
| EAS build profile | `preview` |
| EAS build IDs | None yet. `npx eas-cli build:list --limit 5 --json --non-interactive` returned `[]` on 2026-05-04. |
| Distribution decision | Do not invite friends until iOS and Android preview build IDs are added here and `docs/release/device-smoke.md` is completed. |

## Evidence Links

| Area | Result | Evidence |
| --- | --- | --- |
| Current repo quality | Pass on 2026-05-04: `npm run quality` completed with exit code 0. Includes lint, typecheck, clean typecheck, engine tests, and account deletion coverage. | Current captured log: `docs/release/preview-quality-gate-output/npm-run-quality-current.log`; generated gate logs: `docs/release/preview-quality-gate-output/`; prior generated report: `docs/release/preview-quality-gate-output/docs/release/preview-readiness.md`. |
| Device smoke | Not complete. This is a launch gate. | Checklist/result ledger: `docs/release/device-smoke.md`. |
| Content gate | Not production-ready by design. Strict content commands report `productionReady: false`, `0` production blockers, `0` release review blockers, `16` gated preview/dev-only content items, and `66` production exercises missing media. Generated workout surfaces stay off for friend preview. | Current logs: `docs/release/preview-quality-gate-output/npm-run-workout-validate-strict-current.log` and `docs/release/preview-quality-gate-output/npm-run-workout-audit-release-current.log`; status: `docs/workout-programming/current-production-readiness-status.md`; content policy: `docs/workout-programming/content-review.md`. |
| Live DB/RLS | Deferred/gated. Not part of normal quality because it requires a protected non-production Supabase target and service-role secret. | Guarded workflow: `.github/workflows/quality.yml`; live smoke instructions: `docs/workout-programming/live-db-smoke-tests.md`; default gate exception: `docs/release/preview-quality-gate-output/status.json`. |
| Account deletion | Static coverage pass: `51` user-owned public tables covered and `auth.users` deletion present. Live deletion smoke not run yet. | `npm run quality` and `npm run test:account-deletion`; posture: `docs/STATE.md`; live script: `scripts/test-account-deletion-live.js`. |
| Monitoring | Code and config are present. Sentry preview test event is not verified yet. | Setup checklist: `README.md`; implementation: `lib/observability/monitoring.ts`. |

## Preview Environment

| Item | Value |
| --- | --- |
| Supabase URL | `https://xhzxeuromnuxobiibwpf.supabase.co` |
| Supabase project ref | `xhzxeuromnuxobiibwpf` |
| Supabase use | Current configured preview target from local `.env`. Confirm this is non-production before destructive live smoke or friend distribution. |
| Public support email | `support@athleticore.app` unless overridden by `EXPO_PUBLIC_SUPPORT_EMAIL`. |
| Support URL | TBD public HTTPS URL. Gate before App Store/TestFlight-style external metadata. |
| Privacy Policy URL | TBD public HTTPS URL. In-repo policy exists at `docs/privacy-policy.md`; in-app fallback copy exists. |
| Marketing URL | TBD optional public HTTPS URL. |

## Required Env Vars

App runtime:

| Variable | Preview value/requirement |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Required. `https://xhzxeuromnuxobiibwpf.supabase.co` for current preview target. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Required. Set in EAS; never paste into this doc. |
| `EXPO_PUBLIC_USDA_API_KEY` | Optional but recommended. Without it, USDA search uses `DEMO_KEY` with limited coverage. |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Recommended. Defaults to `support@athleticore.app`. |
| `EXPO_PUBLIC_SUPPORT_URL` | Gated/TBD. |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | Gated/TBD. |
| `EXPO_PUBLIC_MARKETING_URL` | Gated/TBD optional. |

Monitoring/build secrets:

| Variable | Preview value/requirement |
| --- | --- |
| `EXPO_PUBLIC_SENTRY_DSN` | Required before preview monitoring is considered verified. |
| `SENTRY_ORG` | Required for release upload/ops. |
| `SENTRY_PROJECT` | Required for release upload/ops. |
| `SENTRY_AUTH_TOKEN` | Server-side only in EAS/GitHub. |

Live test only:

| Variable | Use |
| --- | --- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Required for account-deletion live smoke and workout DB/RLS smoke. |
| `ACCOUNT_DELETION_DB_TESTS=1` | Enables guarded live account-deletion smoke. |
| `WORKOUT_DB_TESTS=1` / `WORKOUT_RLS_TESTS=1` | Enables guarded workout live DB/RLS smoke. |
| `WORKOUT_DB_ALLOW_REMOTE=1` / `WORKOUT_RLS_ALLOW_REMOTE=1` / `WORKOUT_SUPABASE_NON_PRODUCTION=1` | Required for remote non-production live DB/RLS target. |

## Feature Flags

Expected `preview` profile values from `eas.json`:

| Flag | Expected value | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_BUILD_PROFILE` | `preview` | Identifies preview build. |
| `EXPO_PUBLIC_MONITORING_ENABLED` | `1` | Enables monitoring when DSN is present. |
| `EXPO_PUBLIC_MONITORING_DISABLED` | `0` | Kill switch must be off for normal preview. Set `1` only for emergency rollback. |
| `EXPO_PUBLIC_MONITORING_TEST_ERROR` | `0` | Must be `1` only in the one-off monitoring verification build, then reset to `0`. |
| `EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA` | `0` | Generated workout beta must not render in friend preview. |
| `EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW` | `0` | Developer preview must not render in friend preview. |

## Ready

- Core app shell, auth gate, onboarding, planning setup, Today, Train, Plan, Fuel, and Me surfaces are present.
- Repo quality passes on the current target commit.
- Account deletion static coverage guard passes.
- Preview/production EAS profiles explicitly keep generated workout beta and developer preview flags off.
- Generated-workout unsafe/unfinished catalog surfaces are gated out of friend preview.
- In-app legal/support fallback copy exists even though public URLs are not finalized.

## Known Limitations Accepted For Friend Preview

- Generated workouts are unavailable by design. Testers should use existing guided workout, plan, logging, nutrition, hydration, body-mass, and profile flows only.
- USDA food search may have limited coverage if `EXPO_PUBLIC_USDA_API_KEY` is not configured and the app falls back to `DEMO_KEY`.
- Friend preview is not a production content rollout. Missing exercise media and preview/dev-only workout content are accepted only because generated workout entry points are off.
- Support/privacy/marketing public URLs are not finalized; in-app support email and privacy fallback content cover friend-preview use.
- Friend testers are known users; broad self-serve acquisition, polished public onboarding copy, and App Store metadata are outside this preview.

## Blockers Resolved

- Preview quality command passes.
- Account-deletion static coverage is wired into `npm run quality` and passes.
- Generated workout flags are explicitly off in EAS preview/production.
- Live DB/RLS scripts have guardrails that reject unmarked remote or production-like targets.
- Content audit has zero production blockers and zero release review blockers for production-eligible content.

## Blockers Deferred Or Still Gated

| Item | Classification | Required before friend invite? | Disposition |
| --- | --- | --- | --- |
| EAS preview build IDs missing | Gate | Yes | Cut iOS and Android `preview` builds, then add build IDs above. |
| Physical iOS/Android smoke incomplete | Gate | Yes | Complete `docs/release/device-smoke.md` against exact build IDs. |
| Sentry preview event not verified | Gate | Yes | Build once with `EXPO_PUBLIC_MONITORING_TEST_ERROR=1`, verify sanitized event, then rebuild/reset with `0`. |
| Live account-deletion smoke not run | Gate unless friend preview uses only disposable accounts and manual deletion is verified during device smoke | Preferred yes | Run `ACCOUNT_DELETION_DB_TESTS=1 npm run test:account-deletion-live` against non-production target. |
| Workout live DB/RLS smoke not run | Preview limitation | No, because generated workouts are off | Keep generated workout flags off; run before enabling any generated workout tester cohort. |
| Production exercise media missing | Preview limitation | No, because generated workouts are off | Required before generated workout/production rollout. |
| Public support/privacy/marketing URLs TBD | Gate for external metadata, acceptable for small friend preview if testers receive support email | Yes for TestFlight/App Store-style metadata | Publish URLs or keep preview invite-only with direct support instructions. |

## Manual Smoke Checklist

Complete this checklist in `docs/release/device-smoke.md` for one physical iOS device and one physical Android device:

1. Clean install exact EAS preview build.
2. Auth sign-up, email confirmation if required, sign-in, sign-out, re-sign-in.
3. Password reset or documented support workaround.
4. Onboarding with missing optional readiness/body-mass data treated as unknown.
5. Planning setup with protected workouts preserved.
6. Today load, refresh, check-in logging, activity logging.
7. Train guided workout start, pause/background, resume, complete, summary.
8. Plan weekly view, calendar, day detail, weekly review.
9. Fuel nutrition search, custom food, hydration, barcode permission denied/allowed.
10. Weight-class setup, competition body-mass monitoring, post-weigh-in recovery, unsafe target warning/block.
11. Me profile edit, legal/support, account deletion.
12. Offline/degraded network recovery.
13. Authenticated reload.
14. Reload during active workout.

Any failure must be classified in the device-smoke triage ledger as `Blocker`, `Acceptable preview limitation`, or `Deferred production issue`.

## Friend Tester Instructions

Send testers:

1. Install the build link for their platform.
2. Use a fresh disposable account unless Karl explicitly assigns a test account.
3. Do not enter sensitive medical information, emergency symptoms, or private fight-contract details.
4. Treat body-mass and weight-class features as educational preview guidance; safety warnings win over performance goals.
5. Do not use generated workout beta/preview features; they should not appear in this build.
6. Try normal daily flow: sign up, onboard, set a plan, check Today, log a check-in, use Train, log Fuel, review Plan, open Me.
7. Report every crash, blank screen, infinite loading state, unsafe recommendation, missing save, confusing copy, or broken link.
8. Include platform, build ID, account email used, approximate time, steps, expected result, actual result, screenshots, and whether retry fixed it.
9. For account deletion testing, use only a disposable account and tell Karl before deleting so the backend can be verified.

## Bug Report Template

```md
Title:
Tester:
Platform/device/OS:
Build ID:
Account email:
Time and timezone:
Flow:
Steps to reproduce:
Expected:
Actual:
Screenshots/video:
Network state:
Did retry/reload fix it:
Safety/privacy concern:
Severity: Blocker / Preview limitation / Deferred production issue
Notes:
```

## Feedback Handling

- Karl or release owner triages incoming reports daily during preview.
- Blockers pause new invites until fixed, rebuilt, and re-smoked on both platforms.
- Safety, privacy, account deletion, auth dead ends, data loss, blank startup, and active workout corruption are always blockers.
- Accepted preview limitations stay documented here and in tester instructions.
- Deferred production issues should get an issue/owner before broader release.

## Rollback Plan

1. Stop sending invite links.
2. If an EAS update/channel is used, repoint testers to the previous known-good update or disable the bad update.
3. If the issue is monitoring-only, set `EXPO_PUBLIC_MONITORING_DISABLED=1` in a replacement preview build.
4. If the issue is generated-workout exposure, confirm both generated workout flags are `0` and cut a replacement preview build.
5. If the issue is backend/data safety, disable affected tester accounts or pause Supabase credentials for the preview app, preserve logs, and do not run destructive cleanup until evidence is captured.
6. Notify testers with the issue summary, whether they should uninstall/reinstall, and whether any data deletion action is needed.

## Data Deletion Test Result

- Static result: pass. `npm run test:account-deletion` reports `PASS account deletion coverage: 51 user-owned public tables covered; auth.users deletion present.`
- Live result: not yet run for this target. Gate with `ACCOUNT_DELETION_DB_TESTS=1` against local Supabase or a dedicated non-production Supabase project before relying on deletion during friend preview.

## Monitoring Test Result

- Code/config status: monitoring is implemented through Sentry, preview enables monitoring when DSN is present, and a one-off test error path exists.
- Verification result: not yet verified for a preview build. Gate before friend invite by cutting one test build with `EXPO_PUBLIC_MONITORING_TEST_ERROR=1`, confirming the event named `Athleticore preview monitoring test error` appears with app/build/route tags and sanitized payload, then cutting the real preview build with `EXPO_PUBLIC_MONITORING_TEST_ERROR=0`.
