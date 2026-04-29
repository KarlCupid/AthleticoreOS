# Manual Smoke Test: Guided Athlete Journey UX

Use this checklist when a tester has a local browser, Expo Go session, iOS simulator, Android emulator, or TestFlight build with access to a dedicated development test account.

This smoke test verifies the Guided Athlete Journey UX without expanding feature scope. Record screenshots for Today, phase transition, fight opportunity summary, Fuel, readiness check-in, and weight-class feasibility states.

## Setup

1. Pull the latest branch and install dependencies if needed.
2. Confirm `.env` has the development Supabase URL and anon key.
3. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run typecheck:clean`
   - `npm run test:engine`
4. Start one runtime:
   - Web: `npm run web`
   - iOS simulator: `npm run ios`
   - Android emulator: `npm run android`
5. Sign in with a guided-UX test athlete, or create a disposable account.

## Theme Preservation

1. Visit Today, Plan, Train, Fuel, Log, Weight Class, and Me.
2. Compare the guided journey surfaces to existing cards, tabs, buttons, type, spacing, shadows, and background treatment.
3. Confirm the app still feels like Athleticore: dark, focused, premium, calm, and athletic.

Expected result:

- No new visual identity, color palette, typography system, navigation model, or one-off component style appears.
- Today Mission, phase transition, fight opportunity, Fuel, readiness, and body-mass surfaces reuse existing Athleticore components and tokens.

## Today's Mission

Use an athlete with a current weekly plan and at least one current-day training session.

1. Open Today.
2. Confirm Today's Mission is the primary home/dashboard surface.
3. Confirm it answers:
   - What do I need to do today?
   - Why does today matter?
   - What changed?
   - What should I do next?
4. Expand the explanation area if available.
5. Confirm the primary CTA matches the most important next action.

Expected result:

- The mission shows current phase, primary focus, why today matters, training summary, fueling focus, readiness summary, recovery priority, plan adjustment or stable continuity, and one to three next actions.
- Metrics support the mission but do not dominate it.

## Continuous Journey

Use an athlete with existing training, readiness, nutrition, and body-mass history.

1. Complete onboarding or planning setup.
2. Open Today and confirm the app presents the athlete's current phase and journey context.
3. Create or update a fight opportunity.
4. Move through camp, competition week, recovery, and a later build block if test data supports it.

Expected result:

- Phase and fight changes feel like transitions, not restarts.
- Prior training, protected workouts, readiness, fueling, and body-mass context remains visible where relevant.
- The app does not say or imply "start over" for normal phase movement.

## Phase Transitions

Test these scenarios with seeded data or admin tools:

1. Build to Camp after a confirmed fight.
2. Build to Short-Notice Camp after a close fight opportunity.
3. Camp to Competition Week.
4. Competition Week or Camp to Recovery.

Expected result:

- The transition card explains where the athlete is now, why the phase changed, what carries forward, what changes now, and the next focus.
- Protected workouts remain anchors.
- Copy is warm and direct, such as keeping progress attached, protecting freshness, or treating recovery as productive.

## Fight Opportunity Flow

Use the fight opportunity setup flow.

1. Add a tentative fight with a date, optional weigh-in, target class, and event details.
2. Confirm the fight.
3. Create a short-notice fight.
4. Cancel a fight.
5. Reschedule a fight.
6. Change the target weight class.

Expected result:

- The flow asks only necessary details.
- The summary shows fight status, time available, recommended transition, training adjustment, fueling adjustment, readiness concerns, body-mass or weight-class feasibility, risk flags, protected workouts, and what happens next.
- Tentative fights prepare without fully overriding the current build.
- Canceled and rescheduled fights update the journey without erasing history.

## Training UX

Use an athlete with protected boxing or sparring sessions.

1. Open Today and Plan.
2. Confirm protected workouts appear as anchors.
3. Inspect any merged or adapted sessions.
4. Open Train or the guided workout entry.

Expected result:

- Protected sessions are not silently moved, deleted, or treated as optional extras.
- Adapted or merged sessions explain why they changed in athlete-facing language.
- Training guidance names the main work and the guardrail, not just load metrics.

## Fueling UX

Use a high-output training day and a recovery day.

1. Open Fuel on a sparring, conditioning, or camp day.
2. Confirm today's fueling focus appears before macro details.
3. Confirm session-specific fueling guidance appears when relevant.
4. Log an estimated or incomplete meal.
5. Open Fuel on a recovery day.

Expected result:

- Nutrition feels like performance fueling, not a dieting app.
- Missing nutrients are unknown, not zero.
- Low food-log confidence is visible and calm.
- Recovery day copy still supports enough food, hydration, and protein.

## Check-In And Readiness UX

1. Open Log or Check-In.
2. Confirm the flow feels quick and uses athlete prompts for recovery feeling, soreness, sleep, fatigue, stress or mood if supported, pain or injury, and fueling confidence if supported.
3. Submit poor sleep and high soreness.
4. Submit low subjective readiness even if device data looks normal.
5. Leave key readiness data missing for a separate test.

Expected result:

- Readiness explains what changed and why.
- Missing data lowers confidence instead of being treated as good data.
- Subjective low readiness is respected.
- Injury or pain creates appropriate caution without medical overreach.
- Today Mission and training recommendations reflect readiness when applicable.

## Body-Mass And Weight-Class UX

Use a fight or target-class scenario.

1. Open Weight Class or Body-Mass support.
2. Review a feasible target.
3. Review an aggressive target.
4. Review an unsafe target or one with too little time available.
5. Test insufficient body-mass data.
6. Test a fight weight-class change.

Expected result:

- The screen asks: "Can this target be reached safely while maintaining performance?"
- Feasible, aggressive, unsafe, and insufficient-data statuses render clearly.
- Unsafe targets block automatic support or escalate to professional review.
- Safer alternatives appear.
- Dangerous methods are never recommended.
- User-facing copy uses body-mass and weight-class language, not aggressive weight-cut framing.

## Risk And Confidence UX

1. Trigger low confidence with missing readiness, food, or body-mass data.
2. Trigger risk flags for poor readiness, under-fueling, protected workout conflict, and unsafe weight-class target.

Expected result:

- Risk flags are clear and firm without being alarmist.
- Low-confidence copy asks for useful next context.
- Missing data is never presented as safe, neutral, or zero.
- Safety-related CTAs do not pressure the athlete to override caution.

## Copy And Tone

Across all guided surfaces, visually scan for old or unsafe wording.

Must not appear as athlete-facing copy:

- "training load adjustment computed"
- "phase transition executed"
- "caloric target deviation"
- "workout conflict detected"
- "unsafe cut protocol"
- "readiness state insufficient"
- "nutritional compliance failure"
- "weight cut"
- "sauna"
- "sweat suit"
- "diuretic"
- "laxative"
- "vomiting"
- "severe fasting"
- "extreme fluid restriction"
- "push through"
- "no excuses"
- "beast mode"

Expected result:

- Copy feels calm, confident, supportive, serious, human, coach-like, direct, and practical.
- It avoids robotic, cold, overly medical, fake motivational, shame-based, and alarmist language.

## Pass Or Block Criteria

Pass if:

- Static checks pass.
- The app launches on at least one runtime.
- Today Mission is primary and usable.
- Phase, fight, Fuel, readiness, and weight-class flows feel connected to the same athlete journey.
- No unsafe body-mass guidance appears.
- No major blank states, crashes, stuck loaders, broken navigation, or unthemed guided surfaces appear.

Block release if:

- Unsafe body-mass or dehydration guidance appears.
- Missing data is treated as safe or zero.
- A normal phase/fight change erases journey context.
- Today's Mission is not visible on Today.
- Guided surfaces introduce a visibly different theme or component system.
- A key tab or guided flow crashes.

