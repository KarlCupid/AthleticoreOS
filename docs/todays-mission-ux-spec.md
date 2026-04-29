# Today's Mission UX Spec

Today's Mission is the main daily experience in Athleticore. It should be the first clear answer an athlete sees when they open the app.

It should answer:

- What do I need to do today?
- Why does today matter?
- What changed?
- What should I focus on?
- What is the next action?

This is a guidance and flow upgrade, not a visual redesign. Today's Mission must preserve the current Athleticore theme, component system, navigation feel, typography, spacing, card style, and brand direction.

## Placement

Today's Mission should live on the Today tab, in the current Today home screen.

It should be the primary top-level surface on Today. Readiness, journey summary, workload, nutrition, body mass, and plan details should support the mission instead of competing with it.

Recommended hierarchy:

1. Greeting and date
2. Today's Mission
3. Supporting readiness and risk context
4. Quick actions
5. Journey, trend, and setup/support modules

Do not create a separate new dashboard shell or a new visual identity for this experience.

## Primary Outcome

Within a few seconds, the athlete should know:

- The day's primary focus
- Whether to train, check in, fuel, recover, review the plan, or address safety context
- Why the plan looks the way it does
- What changed since the last meaningful state
- Whether any protected workout, fight, body-mass, or safety context matters today

## Content Requirements

Today's Mission should include:

- Today's primary focus
- Training plan summary
- Fueling focus
- Readiness state
- Recovery priority
- Protected workouts
- Body-mass or weight-class context if relevant
- Fight or competition context if relevant
- Risk flags if relevant
- What changed and why
- One to three clear next actions

The primary card should not try to show every metric. It should show the decision, the reason, and the next action. Metrics belong in supporting detail.

## Data Contract

Today's Mission should be derived from the Unified Performance Engine and current app state.

Required input categories:

- `PerformanceState` phase and objective
- Journey continuity and recent transition context
- Fight opportunity status, fight date, weigh-in timing, and travel context when present
- Composed sessions and training block
- Protected anchors
- Readiness band, confidence, missing data, and recommended training adjustment
- Nutrition target and session fueling directives
- Body-mass trend, weight-class feasibility, safety label, and plan status when relevant
- Risk flags and blocking risk flags
- Explanation trace
- Whether today's check-in is complete
- Whether today's training session is complete
- Whether today's fuel logging is meaningfully started
- Whether the weekly plan exists

The view model should expose:

- `status`: good to push, train smart, pull back, blocked, or needs context
- `primaryFocus`
- `missionSummary`
- `whyLines`
- `whatChanged`
- `trainingSummary`
- `fuelingSummary`
- `readinessSummary`
- `recoverySummary`
- `protectedAnchorSummary`
- `bodyMassSummary`
- `fightSummary`
- `riskSummary`
- `confidenceSummary`
- `primaryAction`
- `secondaryActions`
- `supportCards`

Names can change during implementation, but this shape should remain conceptually stable.

## Decision Priority

Today's Mission should resolve priorities in this order:

1. Blocking safety risk
2. Missing data that prevents a safe recommendation
3. Active body-mass or weight-class safety issue
4. Fight or competition-week requirement
5. Protected workout anchor
6. Today's main training session
7. Fueling requirement for today's training or recovery
8. Readiness-driven adjustment
9. Recovery priority
10. Weekly plan or setup gap

Safety wins over performance goals. Protected workouts remain anchors.

## Mission Statuses

### Good To Push

Use when readiness, risk, and training context support planned work.

Example:

"Push the main session today. Readiness is solid, and the week still needs this training touch."

### Train Smart

Use when the athlete can train, but the plan should be controlled.

Example:

"Train, but keep it controlled. You're carrying some fatigue, so the main work stays sharp and the extras come down."

### Pull Back

Use when recovery, readiness, or workload should clearly reduce training stress.

Example:

"Pull back today. Recovery is behind the work, so the priority is movement, food, hydration, and sleep."

### Blocked

Use when Athleticore should not build or recommend the risky plan.

Example:

"This target looks too aggressive for the time available. Athleticore won't build a risky cut around it. Let's look at safer options."

### Needs Context

Use when missing data prevents a confident recommendation.

Example:

"Athleticore needs today's check-in before pushing intensity. Log how you're feeling so the plan can adjust safely."

## Next Actions

Today's Mission should show one to three actions.

Primary action examples:

- Log check-in
- Start session
- Log fuel
- Review plan
- View safer options
- Open weight-class plan
- Update fight details
- Start recovery

Secondary actions should be quieter and context-specific.

Avoid unsafe or pressure-heavy actions:

- Proceed anyway
- Ignore warning
- Push through
- Override safety

## What Changed

Today's Mission should explicitly explain meaningful changes.

Examples:

- "Your fight is confirmed, so Athleticore is moving you into camp while keeping your recent training and body-mass history."
- "Sparring is locked in today, so heavy lower-body work moved away from it."
- "Readiness dipped after the last hard session, so extra conditioning is trimmed."
- "Fuel has been light lately, so today's priority is getting enough in before and after training."
- "This weight-class target is too aggressive for the timeline, so Athleticore is showing safer options."

If nothing meaningful changed, use stable continuity copy:

"The plan is steady today. Follow the main session and keep fuel consistent."

## Screen Behavior

### Loading

Show a calm loading state that keeps the Today layout stable.

Copy:

"Building today's mission..."

### Empty Or New User

If setup is incomplete, Today's Mission should guide the next setup step without becoming a generic checklist.

Copy:

"Athleticore needs your training anchors before it can build the first mission."

### Missing Check-In

The mission should make check-in the primary action when readiness data is needed for safe intensity.

Copy:

"Start with your check-in. Athleticore needs today's context before it pushes intensity."

### Session Complete

After training is complete, the mission should shift toward fuel, recovery, logging, or the next protected priority.

Copy:

"Main work is done. Refuel, hydrate, and protect recovery so tomorrow's plan stays on track."

### Safety Block

Safety blocks should be clear and firm, not frightening.

Copy:

"Athleticore is not pushing this plan today. The safer move is to adjust and protect recovery."

### Low Confidence

Low confidence should ask for the smallest useful next input.

Copy:

"The trend is not clear yet. Log today's check-in so Athleticore can make the next call with more confidence."

## Visual And Component Direction

Reuse existing components and style:

- Existing Today screen shell
- Existing `MissionDashboardPanel` direction
- Existing `Card` component
- Existing `ScreenWrapper` and app chrome
- Existing readiness colors and semantic palette
- Existing typography scale
- Existing spacing rhythm
- Existing bottom tab navigation

Today's Mission may extend existing mission components, but it should not introduce:

- A new visual theme
- A new color palette
- A different dashboard framework
- A marketing hero
- A separate design system

Support cards should use existing card language and should be limited to the most relevant context for the day.

## Relationship To Other Tabs

Today's Mission is the daily command center.

Train, Plan, Fuel, and Weight Class should act as detail surfaces:

- Train explains and executes the training part of the mission.
- Plan explains weekly structure and protected anchors.
- Fuel explains targets, session fueling, hydration, and recovery nutrition.
- Weight Class explains feasibility, safety, trend, and safer options.

Avoid duplicating a full daily mission on every tab.

## Testing Requirements

Add or update tests for the view model before or during implementation.

Required scenarios:

- Missing check-in makes check-in the primary action when readiness is needed.
- Blocking risk overrides training and fuel actions.
- Unsafe body-mass target appears on Today and points to safer options.
- Protected sparring stays visible and influences training/fueling copy.
- Confirmed fight transitions the journey without restart language.
- Short-notice fight prioritizes freshness and fight readiness.
- Completed session changes next action toward fuel/recovery/logging.
- Low confidence does not present missing data as safe.
- Stable day shows continuity without inventing changes.

Run relevant validation before handoff:

- Focused view-model tests
- `npm run test:engine`
- `npm run typecheck`
- Broader `npm run quality` when implementation touches shared behavior

## Open UX Questions

These should be answered during implementation planning:

- How much of the Unified Journey Summary should remain visible on Today once Today's Mission becomes primary?
- Should Today's Mission support an expandable "Why this changed" drawer, or should it route to detail screens?
- What is the exact threshold for making check-in the primary action?
- How should Today prioritize fuel logging after a completed workout?
- How should tentative fight opportunities be shown without overcommitting the athlete to camp language?
- Which legacy calendar/day-detail surfaces should be retired or reframed first?

