# Workout Programming Content Review

Workout-programming content is split into static programming content and user data. Static content includes exercises, prescription templates, description templates, safety flags, validation rules, substitutions, and progression/regression/deload rules. User data remains protected by Supabase RLS; static content remains public-readable, but production generation must only select reviewed content.

This workflow is a programming safety and content quality gate. It does not make medical claims or replace clinical judgment.

## Review Status

Every reviewable content record supports:

- `reviewStatus`: `draft`, `needs_review`, `approved`, or `rejected`
- `reviewedBy`
- `reviewedAt`
- `reviewNotes`
- `safetyReviewStatus`: `not_required`, `needs_review`, `approved`, or `rejected`
- `contentVersion`
- `lastUpdatedAt`
- `riskLevel`: `low`, `moderate`, or `high`
- `rolloutEligibility`: `dev_only`, `preview`, `production`, or `blocked`

Rejected or blocked content must never be selected. Draft and needs-review content can be used only in internal preview/beta workflows that surface warnings. Production generation requires `reviewStatus = approved` and `rolloutEligibility = production`.

## Risk Levels

Use `low` for simple copy or content that cannot materially change training stress.

Use `moderate` for ordinary exercise, prescription, substitution, and coaching content that affects workout selection or user-facing guidance.

Use `high` for content that can materially change safety, fatigue, pain constraints, progression, regression, deloads, hard training eligibility, or restrictions. High-risk production content requires `safetyReviewStatus = approved`.

## What Requires Safety Review

Safety review is required for:

- safety flags and contraindication mappings
- validation rules that block or allow training under risk signals
- regression and deload rules
- high-risk progression rules
- substitutions chosen for pain, impact, readiness, or restriction flags
- exercise records with high impact, high spinal loading, high technical complexity, or strong joint demand
- copy that explains pain, readiness, recovery, or restriction handling

Keep safety copy practical and non-alarming. Do not diagnose, promise outcomes, or imply that missing readiness, pain, sleep, or symptom data means the athlete is safe.

## Reviewer Checklist

- The record has a clear purpose and is not generic filler.
- Exercise ontology fields match the actual movement and equipment requirements.
- Prescription variables match the workout type.
- Safety notes are specific, plain-language, and not medical claims.
- Progression/regression/deload rules include clear triggers and actions.
- Substitutions preserve training intent while respecting equipment, skill, fatigue, and restrictions.
- Description templates explain effort, success criteria, scaling, and recovery expectations.
- High-risk records have explicit safety approval before production rollout.
- `contentVersion`, `lastUpdatedAt`, `reviewedBy`, and `reviewNotes` are updated.

## Approval Flow

1. Author creates or edits content with `reviewStatus = draft` and `rolloutEligibility = dev_only`.
2. Author moves ready content to `needs_review` and `rolloutEligibility = preview`.
3. Coach/content reviewer approves wording and programming fit.
4. Safety reviewer approves high-risk records when required.
5. Approved production records use `reviewStatus = approved`, `rolloutEligibility = production`, and for high-risk content `safetyReviewStatus = approved`.
6. Rejected content uses `reviewStatus = rejected` and `rolloutEligibility = blocked`.

Helpers in `lib/performance-engine/workout-programming/contentReview.ts`:

- `listContentNeedingReview()`
- `markContentApproved()`
- `markContentRejected()`
- `getUnsafeOrUnreviewedContentReport()`
- `prepareWorkoutProgrammingContentForMode()`

## Runtime Gates

Production generation uses the content review gate before workout generation. It excludes rejected, blocked, draft, needs-review, preview-only, and high-risk-without-safety-approval records.

Preview generation can include draft or needs-review content when allowed, but it attaches warnings so reviewers can see that the workout is not production-ready.

## Audit Behavior

Content audit tooling mirrors the runtime gate. Records that are explicitly `dev_only` or `preview` are reported as gated review work, not as production-breaking errors, as long as they are not rejected, blocked, or marked production-eligible with unsafe review metadata. This lets the app ship production-approved content while newer exercises or rules remain visible to reviewers in beta.

Run:

```bash
npm run workout:validate-content
npm run workout:audit-content
```

Use `--strict` or `--fail-on-warnings` when a release requires all preview content, missing media, and authoring warnings to be cleared as well.

## Database Support

Migration `038_workout_programming_content_review_metadata.sql` adds review metadata columns to the static workout-programming content tables and indexes review fields for audit/reporting queries.

The migration is forward-only and does not change user-data RLS. Static content remains public read-only through existing policies; user-specific rows remain user-scoped.

## Blocking Content

Use rejection or blocked rollout when content is unsafe, obsolete, too generic, or inconsistent with the current ontology.

Blocked content should stay in the database for audit history, but generation must not select it. Revise blocked content by creating a new draft or moving it back to draft only after the reviewer intentionally reopens it.
