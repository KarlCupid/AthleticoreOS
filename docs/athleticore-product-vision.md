# Athleticore Product Vision

Athleticore OS is a continuous athlete operating system. It should not feel like a user restarts every time they begin a new block, switch phases, accept a fight, miss a workout, log a rough readiness day, or change a weight target. The product should remember the athlete, carry context forward, and adapt the plan as the athlete's real life changes.

## Continuous Athlete Journey

The athlete journey begins at sign-up. Onboarding initializes the baseline: sport context, training background, body-mass data, schedule constraints, protected workouts, goals, equipment access, nutrition context, and safety-relevant signals.

After onboarding, every important event updates the same journey:

- New build phase
- Tentative fight
- Confirmed fight
- Short-notice fight
- Changed weight class
- Rescheduled fight
- Canceled fight
- Camp start
- Competition week
- Recovery period
- Readiness change
- Training completion or missed session
- Nutrition trend
- Food log trend
- Weight trend
- Safety or under-fueling signal

The app should always answer: where is this athlete in their journey, what changed, what should happen next, and why?

## Phases as Transitions

Phases are state transitions, not separate programs. Moving from build phase to camp phase, camp to competition week, or fight week to recovery should preserve context from previous training, readiness, nutrition, body mass, and risk history.

The major product phases are:

- Build phase: general performance development, strength, conditioning, boxing skill, or weight-class preparation.
- Camp phase: fight-specific preparation with increasing specificity and constraints.
- Competition week: taper, weigh-in, fueling, hydration, rehydration, and execution support.
- Recovery phase: post-fight or post-camp restoration before the next build or opportunity.

## Boxing Fight Uncertainty

Boxing has uncertain fight logistics. The product must handle fight opportunities without pretending the schedule is stable.

The system must support:

- Tentative fights
- Confirmed fights
- Short-notice fights
- Canceled fights
- Rescheduled fights
- Changed opponents when relevant
- Changed weight classes
- Same-day and next-day weigh-ins
- Travel windows

These events should transition the athlete journey. They should not reset the athlete, orphan old plans, or leave stale nutrition, training, or weight-cut logic active.

## Protected Workouts as Anchors

Coach-led boxing sessions, sparring, fixed classes, and other protected workouts are non-negotiable anchors. Athleticore should adapt around them instead of silently moving or deleting them.

Protected workouts influence:

- Weekly training distribution
- Strength and conditioning placement
- Recovery windows
- Nutrition and fueling needs
- Readiness interpretation
- Risk and safety flags

## Integrated Performance Support

Training, nutrition, tracking, readiness, body mass, and risk are one system. A hard sparring day should affect readiness, food targets, hydration, next-day load, soreness interpretation, and the explanation shown to the athlete. A weight trend should influence fueling and risk without blindly forcing unsafe restriction. A poor readiness day should change training and explain the tradeoff.

## Safety-First Weight-Class Management

Weight-class features must protect the athlete. The product should distinguish chronic body-composition work from acute fight-week cutting and rehydration. It should screen for unsafe patterns, under-fueling, dehydration risk, rapid weight loss, poor readiness, and REDs-style risk signals.

Missing data is unknown, not zero. If the app lacks enough information to make a safe recommendation, it should lower confidence, ask for more data, or choose the safer option.

## Explainable Recommendations

Every major recommendation should be explainable in plain language. The athlete should understand why a workout changed, why calories moved, why a recovery day was suggested, why a cut protocol was capped, or why a fight opportunity changed the plan.

Explanations should connect decisions to the athlete's current state:

- Phase and fight context
- Protected workouts
- Training load
- Readiness
- Nutrition and fueling
- Body mass trend
- Safety constraints
- Data confidence
