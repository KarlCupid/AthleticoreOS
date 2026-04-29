# First-Run Walkthrough UX

Athleticore first-run should move athletes from account creation into one continuous supported journey. It should not feel like a user signs up, answers setup questions, and then starts a disconnected plan. The first-run experience should introduce Athleticore as a coach in the athlete's corner: clear, calm, supportive, serious, adaptive, and human.

This is a UX flow and guidance upgrade, not a visual redesign. Future implementation must preserve the current Athleticore theme, component system, navigation feel, typography, spacing, card language, dark app chrome, brand direction, and Today-first hierarchy.

## Core Principle

The athlete journey begins at sign-up. First-run should establish the athlete baseline, explain how Athleticore adapts around real training life, and hand the athlete into Today's Mission as the main daily guidance surface.

The athlete should understand:

- Athleticore remembers context across build, camp, competition week, recovery, fight changes, readiness changes, nutrition trends, body-mass trends, and risk signals.
- Phases are transitions, not restarts.
- Protected workouts are anchors the app builds around.
- Today's Mission explains what matters today, why it matters, what changed, and what to do next.
- Safety wins when body-mass, readiness, injury, illness, under-fueling, or recovery risk conflicts with performance pressure.

## Experience Goals

First-run should help the athlete feel:

- "Athleticore knows where I am starting from."
- "Athleticore understands boxing and fight uncertainty."
- "Athleticore will build around the sessions I cannot move."
- "Athleticore will tell me what matters today."
- "Athleticore will explain why the plan changed."
- "Athleticore will be cautious when data is missing or risk is high."

First-run should avoid:

- A long generic slideshow.
- Robotic product-tour language.
- Asking too many questions at once.
- Forcing existing users to restart.
- Treating phases as disconnected plans.
- Aggressive weight-cut language.
- Overwhelming users with internal engine complexity.
- Changing Athleticore's visual identity.

## Visual Direction

Use the existing Athleticore visual system:

- Root app chrome from `App.tsx`.
- Existing dark background, aurora treatment, and bottom navigation feel.
- Existing `Card`, `ScreenWrapper`, `AnimatedPressable`, icons, and dashboard/onboarding card language.
- Existing `COLORS`, `APP_CHROME`, `TYPOGRAPHY_V2`, `SPACING`, `RADIUS`, `SHADOWS`, readiness colors, and semantic palette.
- Existing Today hierarchy where Today's Mission is primary.

Do not introduce:

- A new palette.
- A new onboarding visual identity.
- Marketing-style hero screens.
- A separate dashboard shell.
- A new component framework.
- Full-screen decorative tour art that makes the app feel like a different product.

## First-Run Cases

### Brand-New Sign-Up

Use when a user creates a new account and has no `athlete_profiles` row.

Primary job:

- Welcome the athlete.
- Explain that setup creates their starting athlete baseline.
- Collect enough context for a safe first mission and first training direction.
- Preserve missing information as unknown, not zero.
- Land on Today and introduce Today's Mission.

Suggested welcome copy:

"Welcome to Athleticore. We'll help you train, fuel, recover, and adapt around your real fight timeline."

Suggested baseline framing:

"This setup becomes your athlete baseline. Athleticore will keep updating it as training, readiness, fuel, body mass, and fight opportunities change."

Suggested completion copy:

"Your baseline is set. Next, Athleticore will show today's mission and the first actions that help the system learn."

### First Sign-In After Account Creation

Use when a user has created an account but is signing in for the first time after email confirmation, session restore, or delayed return.

Primary job:

- Continue the account-created flow without making the athlete feel lost.
- If no profile exists, route to guided setup with a short reminder of why these questions matter.
- If profile exists, route to Today and show the light app walkthrough.

Suggested return copy:

"You're in. Let's set the context Athleticore needs to coach the first stretch safely."

Suggested profile-exists copy:

"Your setup is saved. Start with Today's Mission so Athleticore can show what matters now."

### Existing User First Sign-In After The Overhaul

Use when an existing user already has profile, training, nutrition, readiness, schedule, body-mass, or fight data.

Primary job:

- Do not force re-onboarding.
- Do not reset phase, plan, or history.
- Introduce the new guided journey model.
- Explain that their existing context is being carried forward.
- Show Today's Mission as the new daily command center.

Suggested intro copy:

"Athleticore now guides your training as one continuous journey. Your history stays with you; Today's Mission shows what matters next."

Suggested preserved-context copy:

"Your existing training, readiness, fuel, body-mass, and fight context stay attached. Phase changes are transitions, not restarts."

Suggested CTA:

"Open Today's Mission"

## Walkthrough Structure

First-run should be short and contextual. It should not be a long slideshow. Recommended shape:

1. Welcome and posture.
2. Athlete baseline questions.
3. Protected anchors and availability.
4. Goal, phase, and fight context.
5. Readiness, injury, logging, nutrition, and body-mass safety context.
6. Today handoff with Today's Mission introduction.
7. Optional coach marks on the first Today visit.

Each step should have one primary idea, one primary action, and progressive disclosure for details.

## Context To Collect Or Confirm

Collect this as progressively as possible. Do not force all questions into one dense screen.

### Athlete And Sport Context

- Sport.
- Experience level.
- Current training status.
- Current goal.
- Current phase if known.

Default sport can be boxing when the product path is boxing-specific, but future UI should still keep the data model ready for sport context.

Suggested copy:

"Start with where you are now. Athleticore uses this to shape the first mission without pretending it knows your full history yet."

### Fight Context

Collect:

- Upcoming fight or no fight yet.
- Tentative, confirmed, short-notice, rescheduled, or canceled status when relevant.
- Fight date when known.
- Weigh-in timing when relevant.
- Weight-class change when relevant.

No-fight copy:

"No fight on the calendar? That's fine. Athleticore will help you build so you're ready when the next opportunity shows up."

Fight-opportunity copy:

"Fight details can change. Athleticore will adapt training, fuel, recovery, and body-mass context without treating each change like a restart."

### Protected Workouts

Collect:

- Sparring.
- Team training.
- Coach-led boxing practice.
- Fixed classes.
- Other sessions the athlete cannot move.
- Day, time, duration, usual effort, and whether the session is non-negotiable.

Suggested copy:

"Some sessions are non-negotiable. Add sparring, team training, or fixed sessions here, and Athleticore will build around them."

### Training Availability

Collect:

- Realistic training days.
- Preferred training windows if available.
- Session duration.
- Whether two-a-days are realistic if this is supported later.

Suggested copy:

"Pick the days the plan can actually use. Athleticore will do better with honest availability than an ideal week you cannot repeat."

### Nutrition And Fueling Preferences

Collect:

- Main nutrition goal: maintain, build, gradual cut, or unknown.
- Dietary constraints or preferences.
- Meal logging preference: quick logging, detailed logging, or reminders later.
- Session fueling comfort if relevant.

Suggested copy:

"Fueling guidance starts simple. Athleticore will sharpen targets as training demand and food logs come in."

### Body-Mass And Weight-Class Context

Collect only when relevant:

- Current body mass.
- Target class or target body mass if known.
- Weigh-in timing.
- Recent trend if known.
- Safety-relevant signals: dizziness, fainting, acute illness, under-fueling, severe restriction, dehydration concerns, menstrual-cycle concerns when applicable, or other symptoms.

Safety copy:

"Athleticore checks whether a target looks realistic while protecting performance."

Missing-data copy:

"If body-mass context is missing, Athleticore will treat it as unknown and stay cautious."

Blocked-target copy:

"This target needs more context before Athleticore builds around it. The safer move is to review options first."

Do not use aggressive cut language. Do not suggest dehydration tactics, severe calorie restriction, extreme fluid restriction, diuretics, laxatives, vomiting, sweat suits, or sauna-driven cutting.

### Readiness And Injury Baseline

Collect:

- Sleep baseline.
- Current soreness/fatigue.
- Pain, injury, illness, dizziness, fainting, or acute symptoms.
- Training confidence.
- Optional cycle tracking preference where relevant.

Suggested copy:

"Readiness is not a score to chase. It helps Athleticore decide when to push, trim extras, or protect recovery."

Recovery copy:

"Recovery is part of the work. Athleticore will help you know when to push and when to absorb the training."

### Logging And Check-In Preferences

Collect:

- Preferred check-in cadence.
- Meal logging preference.
- Body-mass logging preference when relevant.
- Reminder preference if supported.

Suggested copy:

"Small check-ins make the plan safer. You can start with the basics and add detail later."

## Today Handoff

The walkthrough should culminate on Today, not a generic dashboard.

Today's Mission intro copy:

"Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next."

The first Today visit should point out:

- Today's Mission.
- Primary action.
- Why/what-changed disclosure.
- Check-in if needed.
- Protected workout anchor if one exists.
- Fueling focus when training demand exists.
- Body-mass or weight-class safety context when relevant.
- Fight opportunity support when relevant.

The first action should usually be:

- `Log check-in` when readiness context is missing.
- `Start session` when a safe session is ready and check-in is not needed first.
- `Review plan` when training setup is incomplete.
- `View safer options` when body-mass or weight-class safety is blocking.
- `Update fight details` when fight context is incomplete and relevant.

## Coach Marks

Coach marks should be contextual and sparse. They should appear only when they explain a live surface the athlete can act on.

Recommended coach marks:

- Today's Mission: "This is the daily call: what matters, why it matters, and what to do next."
- Why it changed: "When Athleticore adapts the plan, the reason lives here."
- Protected anchors: "Fixed boxing work stays anchored. Athleticore adapts around it."
- Check-in: "This sharpens readiness so the plan does not guess."
- Fuel: "Fueling targets change with training demand, recovery, and safety context."
- Body mass: "Weight-class guidance stays safety-first and asks for more context when needed."

Avoid coach marks for every tab, icon, or metric. The athlete should not have to dismiss a tour before using the app.

## Suggested Copy Library

### Welcome

"Welcome to Athleticore. We'll help you train, fuel, recover, and adapt around your real fight timeline."

"This is not a one-time plan. Athleticore keeps your athlete journey moving as training, readiness, fuel, body mass, and fight context change."

### Journey Continuity

"Your journey starts here and keeps adapting. Build phases, fight opportunities, camps, recovery, and check-ins all update the same context."

"Phase changes are transitions, not restarts."

### Protected Workouts

"Some sessions are non-negotiable. Add sparring, team training, or fixed sessions here, and Athleticore will build around them."

"Protected workouts stay anchored. The supporting work moves around them."

### No Fight Yet

"No fight on the calendar? That's fine. Athleticore will help you build so you're ready when the next opportunity shows up."

### Fight Opportunity

"Fight details can change. Athleticore will adapt the journey without throwing away what it already knows."

"If a fight becomes short-notice, Athleticore will protect freshness first and trim anything that does not help fight readiness."

### Today's Mission

"Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next."

"Start here. Today's Mission is the daily call from the full athlete context."

### Training Guidance

"Training guidance starts with what matters most today, then adapts around readiness, anchors, and the week ahead."

"The plan can change without the journey restarting."

### Fueling Guidance

"Fueling targets move with the work. Athleticore uses training demand, recovery, and safety context to guide the day."

"Today needs more fuel when the work asks for it."

### Readiness And Recovery

"Recovery is part of the work. Athleticore will help you know when to push and when to absorb the training."

"A check-in helps Athleticore avoid guessing when intensity should change."

### Body-Mass Safety

"Athleticore checks whether a target looks realistic while protecting performance."

"If the target needs more context, Athleticore stays cautious and shows safer options."

### Explanations

"When the plan changes, Athleticore shows what changed and why."

"The reason matters. You should know what the plan is responding to."

## State Coverage

The walkthrough should define:

- Loading state.
- Empty state.
- Error state.
- Offline or stale-data state when applicable.
- Low-confidence state.
- Missing-data state.
- Success state.
- Dismissed-but-not-completed state.
- Completed state.
- Safety-blocked state when body-mass, readiness, illness, injury, or under-fueling risk is present.

Missing data should lower confidence, ask for more context, or choose a safer option. It should never be treated as safe, neutral, or zero.

## Completion Behavior

Walkthrough completion should be persistent and versioned. Completion should not depend only on whether the user has logged a check-in, training session, and meal.

Recommended completion concepts:

- Setup baseline completed.
- First-run intro seen.
- Today's Mission introduced.
- First-run walkthrough completed.
- Existing-user overhaul intro completed.
- First-run checklist dismissed.
- First-run checklist completed.
- Walkthrough version.

The first-run checklist can remain as a support module, but it should not be the whole walkthrough.

## Relationship To Existing Surfaces

First-run should reuse and guide users into existing surfaces:

- `OnboardingScreen` for new baseline setup.
- `PlanningSetupStackNavigator` for training setup gaps.
- `DashboardScreen` / Today for the primary handoff.
- `TodayMissionPanel` for the daily mission.
- `UnifiedJourneySummaryCard` for journey continuity.
- `GuidedPhaseTransitionCard` for phase transitions.
- Fuel, Weight Class, and Log surfaces for contextual detail.

Do not create a separate first-run dashboard that competes with Today.

## Open Questions

- Should sport be explicitly collected now, or default to boxing until multi-sport support is ready?
- What exact data qualifies an account as an existing user for the overhaul intro?
- Should the first-run walkthrough be a modal, inline Today module, or short sequence of bottom sheets?
- Should `first_run_guidance_status` be split into multiple columns or a JSON/versioned table?
- How should email confirmation and deep-link callback handling be represented in the first sign-in flow?
- Should onboarding collect injury/readiness baseline immediately, or should it defer to the first check-in on Today?
- Should no-gym-profile users land on Today with setup guidance or be gated into gym setup before training generation?
