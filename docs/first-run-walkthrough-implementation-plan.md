# First-Run Walkthrough Implementation Plan

This plan turns the first-run UX direction into implementation steps. It is intentionally documentation-only for now. Future implementation should preserve the current Athleticore theme, component system, navigation feel, typography, spacing, card style, dark app chrome, and Today-first hierarchy.

The implementation should guide athletes into one continuous journey, not a series of isolated plans.

## Current Architecture Starting Point

The current app entry path is:

1. `App.tsx` checks Supabase session.
2. No session renders `AuthScreen`.
3. Authenticated session calls `getAthleteJourneyAppEntryState(userId)`.
4. No profile routes to `OnboardingScreen`.
5. Profile with incomplete planning routes to `PlanningSetupStackNavigator`.
6. Ready state routes to `TabNavigator`, where Today is the first tab.

Current first-run support exists but is too narrow:

- `athlete_profiles.first_run_guidance_status`
- `athlete_profiles.first_run_guidance_intro_seen_at`
- `firstRunGuidanceService`
- Dashboard welcome modal.
- Dashboard "first 3 wins" checklist based on any check-in, training session, and food log.

This should become a versioned first-run walkthrough system that supports:

- Brand-new sign-up.
- First sign-in after account creation.
- Existing-user intro after the guided journey overhaul.

## Guiding Rules

- Do not force existing users to restart onboarding.
- Do not make phase changes feel like resets.
- Do not create a parallel design system.
- Do not add unsafe body-mass or weight-cut language.
- Treat missing data as unknown, not zero.
- Preserve protected workouts as non-negotiable anchors.
- Keep Today's Mission as the primary first destination after setup.
- Keep implementation aligned with `AthleteJourneyState`, `PerformanceState`, and Unified Performance Engine view models.

## Step 1: Walkthrough State And Completion Flags

Define a state model that separates setup, intro, tour, migration, and action checklist.

Recommended state:

- `first_run_walkthrough_version`
- `first_run_walkthrough_status`: `pending`, `active`, `completed`, `dismissed`
- `first_run_walkthrough_started_at`
- `first_run_walkthrough_completed_at`
- `first_run_intro_seen_at`
- `today_mission_intro_seen_at`
- `existing_user_guided_journey_intro_seen_at`
- `first_run_case`: `brand_new`, `first_sign_in`, `existing_user_overhaul`
- `first_run_checklist_status`: `pending`, `completed`, `dismissed`

Implementation options:

- Short term: add columns to `athlete_profiles`.
- Better long term: create a `user_walkthrough_state` table keyed by `user_id` and `walkthrough_key`.

Recommended table direction:

- `user_id`
- `walkthrough_key`
- `version`
- `status`
- `case`
- `started_at`
- `intro_seen_at`
- `completed_at`
- `dismissed_at`
- `step_state` JSON for per-step progress
- `created_at`
- `updated_at`

Service work:

- Replace or expand `firstRunGuidanceService`.
- Add a resolver that returns:
  - app entry status
  - walkthrough case
  - current walkthrough step
  - whether to show intro
  - whether to show Today coach marks
  - whether checklist remains active

Tests:

- New user without profile resolves `brand_new`.
- Confirmed account without profile resolves `first_sign_in` plus onboarding required.
- Existing user with profile and prior data resolves `existing_user_overhaul`.
- Completed version does not reappear.
- Version bump can reintroduce an intro without resetting setup.

## Step 2: New-User Sign-Up Walkthrough

Scope:

- Update sign-up and onboarding flow only after state model exists.
- Keep visual design in `AuthScreen` and `OnboardingScreen` language.
- Do not create a marketing onboarding carousel.

Behavior:

1. User creates account.
2. If email confirmation is required, show clear return copy.
3. On first authenticated session with no profile, route to onboarding.
4. Onboarding explains that answers create the athlete baseline.
5. Onboarding collects enough context for safe first guidance.
6. On completion, mark setup baseline complete and first-run walkthrough active.
7. Route to Today and introduce Today's Mission.

Questions to collect or confirm:

- Sport.
- Experience level.
- Current goal.
- Current training status.
- Current phase if known.
- Upcoming fight or no fight yet.
- Protected workouts.
- Training availability.
- Nutrition preferences.
- Body-mass or weight-class context if relevant.
- Readiness or injury baseline.
- Logging/check-in preferences.

Suggested copy:

- Welcome: "Welcome to Athleticore. We'll help you train, fuel, recover, and adapt around your real fight timeline."
- Baseline: "This setup becomes your athlete baseline. Athleticore will keep updating it as training, readiness, fuel, body mass, and fight opportunities change."
- Protected workouts: "Some sessions are non-negotiable. Add sparring, team training, or fixed sessions here, and Athleticore will build around them."
- No fight yet: "No fight on the calendar? That's fine. Athleticore will help you build so you're ready when the next opportunity shows up."
- Recovery: "Recovery is part of the work. Athleticore will help you know when to push and when to absorb the training."
- Body-mass safety: "Athleticore checks whether a target looks realistic while protecting performance."

Tests:

- Onboarding initializes `AthleteJourneyState`.
- Onboarding initializes `PerformanceState`.
- Missing body mass remains unknown.
- Protected workouts persist as anchors.
- First-run walkthrough is active after onboarding.
- No unsafe body-mass copy appears.

## Step 3: First Sign-In App Tour

Scope:

- Handle a user returning after account creation or email confirmation.
- Avoid making them feel like setup disappeared.

Behavior:

- If no profile exists, show short setup intro and route to onboarding.
- If profile exists and planning setup is complete, route to Today.
- Show a lightweight first sign-in walkthrough:
  - Today's Mission.
  - Why it changed.
  - Check-in/readiness.
  - Training/fuel/body-mass/fight support only when relevant.

Suggested copy:

- Return: "You're in. Let's set the context Athleticore needs to coach the first stretch safely."
- Setup saved: "Your setup is saved. Start with Today's Mission so Athleticore can show what matters now."
- Today's Mission: "Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next."

Auth callback considerations:

- Audit `detectSessionInUrl: false` before implementing email confirmation deep links.
- Decide whether app links should support confirmation callback, password recovery, and invite flows.
- Avoid creating a walkthrough state that assumes sign-up completed when the user has not authenticated.

Tests:

- Confirmed first sign-in with no profile routes to onboarding.
- Confirmed first sign-in with profile routes to Today.
- First sign-in intro persists once seen.
- Signing out and back in does not restart the intro after completion.

## Step 4: Existing-User Migration/Intro Walkthrough

Scope:

- Existing users with profile or historical data should not be forced through new onboarding.
- They should receive a brief guided journey intro after the overhaul.

Existing-user detection inputs:

- `athlete_profiles` row exists.
- Any prior `daily_checkins`.
- Any prior `training_sessions`.
- Any prior `food_log`.
- Any prior `macro_ledger`.
- Any prior `scheduled_activities` or `recurring_activities`.
- Active `build_phase_goals`.
- Active `fight_camps`.
- Active body-mass or weight-class plan.

Behavior:

1. Resolve existing user case.
2. Preserve current profile, phase, fight, training, readiness, fuel, and body-mass context.
3. Route to Today.
4. Show an intro that explains continuity and Today's Mission.
5. Do not reset planning, onboarding, profile, phase, or history.

Suggested copy:

"Athleticore now guides your training as one continuous journey. Your history stays with you; Today's Mission shows what matters next."

"Your existing training, readiness, fuel, body-mass, and fight context stay attached. Phase changes are transitions, not restarts."

Tests:

- Existing profile with complete setup routes to Today, not onboarding.
- Existing user intro appears once per walkthrough version.
- Existing user intro does not reset `planning_setup_version`.
- Existing user intro does not mark active goals, fight camps, or plans abandoned.
- Copy guards reject `restart`, `start over`, and `reset` language in migration intro.

## Step 5: Today's Mission Introduction

Scope:

- Today's Mission should be the walkthrough's destination and first coach mark.
- It should not be hidden under a checklist.

Behavior:

- After onboarding or existing-user intro, land on Today.
- Keep Today's Mission above readiness and supporting modules.
- Show one focused intro:
  - what matters today
  - why it matters
  - what changed
  - next action
- If check-in is needed, make `Log check-in` the primary action.
- If safety is blocking, make safe review the primary action.
- If training is ready and safe, make `Start session` the primary action.

Suggested copy:

"Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next."

"Start here. Today's Mission is the daily call from your training, readiness, fuel, body-mass, and fight context."

Implementation notes:

- Prefer extending the `TodayMissionPanel` or a small wrapper around it.
- Keep existing card styling and theme tokens.
- Avoid a new full-screen dashboard shell.
- Keep the existing "first 3 wins" checklist as a support module only if it does not compete with Today's Mission.

Tests:

- Today's Mission intro appears before generic checklist copy.
- Today's Mission remains first primary dashboard surface.
- Primary action routes correctly.
- Low-confidence state asks for the smallest useful next input.
- Safety block routes to safer options, not training.

## Step 6: Contextual Coach Marks

Scope:

- Add sparse coach marks only where they explain live, useful surfaces.
- Avoid full-product tours.

Recommended coach marks:

- Today's Mission: "This is the daily call: what matters, why it matters, and what to do next."
- Why it changed: "When Athleticore adapts the plan, the reason lives here."
- Protected anchors: "Fixed boxing work stays anchored. Athleticore adapts around it."
- Check-in: "This sharpens readiness so the plan does not guess."
- Fuel: "Fueling targets change with training demand, recovery, and safety context."
- Body mass: "Weight-class guidance stays safety-first and asks for more context when needed."

Rules:

- Show a maximum of one coach mark at a time.
- Do not block primary app usage unless the user explicitly starts the walkthrough.
- Persist seen state per coach mark and version.
- Keep coach marks reachable for later from settings if a help center exists.

Tests:

- Coach mark completion persists.
- Coach marks do not show after completed walkthrough version.
- Coach marks do not cover primary CTAs on small screens.
- Accessibility labels and screen-reader order are usable.

## Step 7: Tests And Verification

Add focused tests before implementation spreads across screens.

Recommended unit/source tests:

- Walkthrough resolver cases:
  - brand-new no profile
  - first sign-in no profile
  - first sign-in with profile
  - existing user with historical data
  - completed walkthrough
  - version bump
- Source guards:
  - first-run uses existing `Card`, `AnimatedPressable`, and theme tokens
  - no new hex palette in walkthrough components
  - no `restart`, `start over`, or `reset` copy in first-run user-facing text
  - no aggressive body-mass or dehydration language
- View-model tests:
  - Today's Mission intro chooses check-in when readiness is missing
  - safety block overrides training
  - protected workout appears as anchor context
  - no-fight path uses build/readiness language
  - confirmed fight path introduces camp as transition
  - existing-user intro preserves journey context

Recommended manual verification:

- Brand-new sign-up.
- First sign-in after email confirmation.
- Existing user with training data.
- Existing user with active fight camp.
- Existing user with body-mass/weight-class context.
- Existing user with incomplete planning setup.
- Small-screen walkthrough layout.
- Keyboard-aware onboarding screens.
- Dynamic type scan.
- Screen-reader order on modal/sheet controls.

Validation commands when logic is implemented:

- `npm run lint`
- `npm run typecheck`
- `npm run typecheck:clean`
- `npm run test:engine`
- `npm run quality` for broader handoff

## Suggested Implementation Sequence

1. Add walkthrough state model and resolver tests.
2. Add database migration for versioned walkthrough state.
3. Expand first-run guidance service into walkthrough service.
4. Update app entry state to include walkthrough case without changing route gates yet.
5. Add new-user onboarding copy and completion state.
6. Add Today Mission intro after onboarding.
7. Add first sign-in return handling and copy.
8. Add existing-user overhaul intro.
9. Add contextual coach marks.
10. Rework or reposition the existing "first 3 wins" checklist so it supports, not replaces, the walkthrough.
11. Add source guards for visual system preservation and safety copy.
12. Run focused tests, then broader validation.

## Files Likely To Change Later

Do not change these as part of this documentation task. They are listed for future implementation planning.

- `App.tsx`
- `src/screens/AuthScreen.tsx`
- `src/screens/OnboardingScreen.tsx`
- `src/screens/OnboardingScreen.styles.ts`
- `src/screens/onboarding/completeCoachIntake.ts`
- `src/screens/DashboardScreen.tsx`
- `src/screens/DashboardScreen.styles.ts`
- `lib/api/firstRunGuidanceService.ts`
- `lib/api/athleteJourneyService.ts`
- `lib/performance-engine/journey/initializeAthleteJourney.ts`
- `lib/performance-engine/presentation/todaysMissionViewModel.ts`
- `src/components/dashboard/TodayMissionPanel.tsx`
- Future migration under `supabase/migrations`

## Risks

- If walkthrough state remains tied only to `athlete_profiles.first_run_guidance_status`, existing users and new users cannot be cleanly separated.
- If the walkthrough leads with a checklist instead of Today's Mission, Athleticore will still feel like task tracking rather than coaching.
- If existing users are routed through onboarding, the overhaul will feel like a reset.
- If body-mass setup asks for targets without safety framing, it can imply unsafe weight-class pressure.
- If auth callbacks are not handled, the first sign-in experience after email confirmation may remain confusing.
- If daily `AthleteJourneyState` continues to be reconstructed from current context only, UI copy must be careful not to overpromise durable persisted journey state until persistence catches up.

## Open Questions

- Should walkthrough state live on `athlete_profiles` short term or in a dedicated table immediately?
- What exact event marks first sign-in after account creation if Supabase email confirmation is enabled?
- Should sport collection ship now or remain boxing-default until multi-sport support is ready?
- Should injury/readiness baseline be part of onboarding, or should the first check-in own it?
- Should the existing "first 3 wins" checklist remain visible for existing users, or only for brand-new users?
- Should users be able to replay the walkthrough from settings?
- How should no-gym-profile users be routed after onboarding: Today with setup guidance, or setup gate until a plan can generate?
