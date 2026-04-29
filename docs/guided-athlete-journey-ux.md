# Guided Athlete Journey UX

Athleticore should feel like a coach in the athlete's corner: clear, calm, supportive, serious, and adaptive. The product should help the athlete understand what matters now without making them interpret a pile of disconnected metrics.

This is not a rebrand. This is a guidance and flow upgrade.

Future UX work must preserve the current Athleticore look and feel:

- Existing color palette
- Existing typography system
- Existing spacing style
- Existing card style
- Existing navigation structure where possible
- Existing component system
- Current brand feel: dark, focused, athletic, premium, and calm

Do not introduce a new visual identity. Do not replace the component system. Do not redesign every screen from scratch.

## UX Goal

Athleticore should guide athletes through one continuous journey from onboarding through build phases, fight opportunities, camps, competition weeks, recovery, and back into the next phase.

The athlete should feel:

- Athleticore knows where I am.
- Athleticore knows what matters today.
- Athleticore adapts when things change.
- Athleticore explains why it changed the plan.
- Athleticore protects me from bad decisions when I am pushing too hard.
- Athleticore understands boxing and short-notice fight opportunities.
- Athleticore supports performance, not just tracking.

The app should avoid:

- Sterile science-dashboard language
- Robotic explanations
- Disconnected feature screens
- Generic macro tracking feel
- Unsafe weight-cut framing
- Fake motivational hype
- Overwhelming new users with too much complexity
- Making phase switches feel like restarts
- Making users manually interpret too many metrics

## Product Model

The UX should follow the product architecture:

- `AthleteJourneyState` is the durable story.
- `PerformanceState` is the current operational state.
- The Unified Performance Engine resolves training, nutrition, readiness, body mass, fight context, risk, and explanations from one harmonized state.
- UI surfaces consume view models derived from unified state.

Every major screen should answer at least one of these questions:

- Where am I in my journey?
- What matters today?
- What changed?
- What should I do next?
- Why is this recommendation safe and appropriate?

## Journey Lifecycle

Athleticore should feel continuous through these moments:

- Onboarding establishes the athlete baseline.
- Build phases develop general or goal-specific capacity.
- Fight opportunities may be tentative, confirmed, short-notice, canceled, rescheduled, or changed by weight class.
- Camp adapts training, fueling, readiness, recovery, and body mass around fight demands.
- Competition week supports tapering, weigh-in logistics, fueling, hydration, and safety.
- Recovery protects the athlete after fight stress or camp accumulation.
- The next build phase starts from preserved history, not a blank reset.

Phase changes must feel like transitions. Avoid UI language that implies the athlete is starting over unless the user is performing an explicit destructive tester action.

## Screen Hierarchy

### Today

Today is the main guidance surface. It should lead with Today's Mission and make the next action obvious.

Today should summarize:

- Primary focus
- Training plan
- Fueling focus
- Readiness state
- Recovery priority
- Protected workouts
- Body-mass or weight-class context when relevant
- Fight or competition context when relevant
- Risk flags when relevant
- What changed and why
- One to three next actions

### Train

Train is the execution surface. It should show the training details needed to complete today's work, not compete with Today as a second dashboard.

Train should prioritize:

- The current session
- Why the session is shaped this way
- Effort target and guardrails
- Protected anchor context
- Guided workout entry
- History and analytics as secondary views

### Plan

Plan is the weekly and calendar context surface. It should explain how the week supports the current phase and today's mission.

Plan should prioritize:

- Weekly schedule
- Protected anchors
- Up next
- Why load is distributed this way
- Missed-session handling
- Phase or fight changes that affected the week

Avoid making Plan feel like a detached scheduling tool. It should remain part of the same athlete journey.

### Fuel

Fuel is the nutrition and fueling support surface. It should feel like performance support, not generic macro tracking.

Fuel should prioritize:

- Today's fueling focus
- Session fueling windows
- Hydration and recovery support
- Actuals vs targets
- Body-mass context when relevant
- Safety flags and confidence when relevant

### Body Mass and Weight Class

Body-mass and weight-class flows must be safety-first. They should support performance and safe decision-making, not aggressive cutting.

These flows should:

- Separate chronic body-composition work from fight-week body-mass logistics.
- Treat missing data as unknown.
- Surface feasibility and safety clearly.
- Block or redirect unsafe targets.
- Offer safer options when a target is too aggressive.
- Avoid dehydration, severe restriction, or risky cut framing.

### Me

Me is account, profile, setup, and diagnostic context. It should not become the primary explanation surface for daily decisions.

## Guidance Pattern

Use this pattern across journey-facing screens:

1. Tell the athlete what matters.
2. Explain why it matters in plain language.
3. Name what changed if the plan adapted.
4. Show the next action.
5. Put metrics behind the explanation, not in front of it.

Example:

- Primary: "Keep the main session sharp."
- Why: "You're carrying more fatigue after sparring, so extra lower-body volume is trimmed today."
- Next action: "Start session."
- Detail: "Readiness: caution. Protected anchor: sparring."

## Information Hierarchy

Prefer:

- One clear primary card per screen.
- One dominant action per section.
- Short explanations that connect training, readiness, fuel, body mass, and fight context.
- Progressive disclosure for deeper metrics.
- Calm safety language when risk is present.

Avoid:

- Multiple competing summary cards.
- Metric grids as the first thing the athlete sees.
- Dense explanation stacks.
- Technical subsystem names in primary copy.
- Redundant "mission" surfaces across every tab.

## State Coverage

Every journey-facing flow should define:

- Loading state
- Empty state
- Error state
- Offline or stale-data state when applicable
- Low-confidence state
- Missing-data state
- Success or saved state
- Safety-blocked state when applicable

Missing data should never be presented as safe, neutral, or zero. It should lower confidence, prompt for more context, or choose the safer recommendation.

## Visual System Rules

Preserve the existing Athleticore visual system:

- Use existing cards, headers, tabs, surfaces, shadows, and background treatment.
- Use current readiness and semantic colors only for their intended meaning.
- Keep the dark app shell and current navigation feel.
- Keep typography within the existing type scale.
- Keep spacing consistent with the current screen rhythm.
- Use existing component primitives before creating new ones.

Do not:

- Introduce a light theme or new palette.
- Add a new dashboard visual language.
- Replace card styling globally.
- Create a marketing-style home screen.
- Make the app feel like a different product.

## Mobile UX Rules

Athleticore is a mobile-first coaching app. Future work should:

- Keep primary actions reachable.
- Use minimum 44 pt iOS / 48 dp Android tap targets.
- Preserve safe areas around top chrome, bottom tabs, sticky actions, and workout controls.
- Support dynamic type without clipping or overlapping.
- Keep keyboard-aware layouts for onboarding, logging, and setup forms.
- Avoid gesture-only critical actions.
- Make screen-reader order follow the visual hierarchy.

## Implementation Guardrails

Future Codex work should:

- Reuse current components where possible.
- Extend presentation view models before adding screen-level decision logic.
- Keep Today as the main daily guidance surface.
- Make Train, Plan, Fuel, and Weight Class feel like detail surfaces connected to Today.
- Remove directly superseded legacy shells when a new journey surface replaces them.
- Update tests when copy or view-model behavior becomes canonical.

Do not:

- Build a parallel UX system.
- Keep old phase/reset language beside the journey model.
- Add new features while implementing this UX direction unless explicitly requested.
- Surface unsafe body-mass suggestions even as examples.

