# Workout Programming Manual Test Checklist

Use this as the final pre-release hands-on pass for Athleticore boxer S&C support. Each scenario should be checked on Today, Week/Plan, WorkoutDetail, Fuel, completion/history, and analytics when applicable.

## Pass/Fail Result Template

Use `Pass`, `Fail`, or `N/A with reason`. Every `Fail` needs a screenshot or screen recording, device/platform, account type, timestamp, and a short note about whether it is a blocker or a deferred issue.

| Flow | iOS result | Android result | Evidence | Notes / issue |
| --- | --- | --- | --- | --- |
| Fresh onboarding | TBD | TBD | TBD | Confirm sign-up, first-run questions, safe-area layout, keyboard behavior, and final navigation into the app. |
| Generate weekly plan | TBD | TBD | TBD | Confirm protected anchors remain fixed and generated support fills gaps without duplicate planners. |
| Today planned support session | TBD | TBD | TBD | Confirm Today shows the planned support session as the active execution surface and keeps the CTA reachable. |
| WorkoutDetail lazy build | TBD | TBD | TBD | Open a planned support row without attached details and confirm full session build/inspect happens from WorkoutDetail. |
| Complete generated support session | TBD | TBD | TBD | Start, pause/resume if available, log work, complete, and verify progression copy appears. |
| Fuel quick after training | TBD | TBD | TBD | Confirm fuel guidance follows the completed or upcoming training demand and does not contradict session intensity. |
| Weight-class high-risk safety flow | TBD | TBD | TBD | Confirm safety guidance and safer action appear before scale metrics and remain visible on small screens. |
| History/analytics after completion | TBD | TBD | TBD | Confirm the completed support session appears as support/logged work without developer language. |
| Engine flag off behavior | TBD | TBD | TBD | Confirm generated support UI hides or falls back cleanly without old generation paths appearing. |
| Old row compatibility | TBD | TBD | TBD | Confirm older rows remain readable and do not trigger new unsafe generation automatically. |
| Missing media/text fallback | TBD | TBD | TBD | Confirm exercise rows remain usable with text instructions when media is missing. |
| Small phone scroll/CTA reachability | TBD | TBD | TBD | Confirm primary CTAs can be reached without layout overlap, clipped text, or hidden safety copy. |

## Stop Conditions

Stop the smoke pass, capture evidence, and file/triage the issue before continuing if any of these appear:

- App crash, blank screen, or unrecoverable loading state.
- Impossible to reach the primary CTA on a normal or small phone viewport.
- Safety warning hidden below scale numbers or lower-priority metrics.
- Generated support routes to old GuidedWorkout instead of WorkoutDetail.
- Sparring generated instead of appearing only as a protected anchor.
- Fuel advice contradicts training demand or under-fuels hard work.
- Completion saves but plan status does not update or explain the pending state.
- Developer terms visible in normal UI, including `GeneratedWorkout`, `snapshot`, `payload`, `validation`, `legacy`, `beta`, `dev preview`, `protocol`, `compliance`, `adherence`, `classification`, `intervention`, `directive`, `invalid`, or `failure`.

## 1. Aspiring Boxer, No Anchors

- UI behavior: Today shows one Athleticore support session or a clear plan setup state, never a standalone extra generator by default.
- Training logic: Generated work starts with safe skill microdose, mobility, durability, or basic strength support. No sparring appears.
- Fueling logic: Low skill microdose reads as light support fuel, not sparring.
- Failure signs: Any live sparring, hard round-tolerance intervals, or "GeneratedWorkout snapshot" style copy.

## 2. Amateur With Two Boxing Classes

- UI behavior: Protected boxing classes appear as anchors; support sessions are separate and open through WorkoutDetail.
- Training logic: S&C fills gaps around the classes without moving protected workouts.
- Fueling logic: Hard/long boxing practice gets boxing-practice fuel; low support microdoses stay light.
- Failure signs: Protected classes disappear, shift days, or become generated support.

## 3. Amateur With Two Hard Sparring Days

- UI behavior: Sparring days are clearly protected anchors.
- Training logic: No generated hard work stacks on sparring days unless it is safe low-load recovery or mobility support.
- Fueling logic: Sparring day says not to under-fuel high-stress work.
- Failure signs: Generated sparring, hard intervals next to sparring without warning, or sparring treated as a light skill session.

## 4. Pro 8-10 Round Build

- UI behavior: Week summary shows athletic-development focus areas and support domain counts.
- Training logic: Roadwork, strength/power, durability, and conditioning progress without exceeding hard-day caps.
- Fueling logic: Tempo/intervalling days prioritize carbs and recovery; strength days prioritize training fuel and protein.
- Failure signs: Every support day looks identical, demand scores feel too low, or recovery/durability is absent.

## 5. Pro 12-Round Taper Week

- UI behavior: Today and WorkoutDetail communicate sharpen/taper support calmly.
- Training logic: Generated work reduces intensity and volume; protected competition-week anchors remain.
- Fueling logic: Fuel remains familiar and adequate; no novel or restrictive fight-week copy.
- Failure signs: Hard generated S&C in taper, aggressive restriction language, or new supplement suggestions.

## 6. Red Readiness

- UI behavior: Today shows recovery-first guidance with clear blocked/reduced copy.
- Training logic: Hard work is blocked or replaced by recovery/mobility.
- Fueling logic: Fueling avoids restriction and supports recovery.
- Failure signs: Hard conditioning still generated, readiness treated as zero data, or unsafe override copy.

## 7. Roadwork Already Protected

- UI behavior: Protected roadwork shows as an anchor; generated plan does not duplicate it blindly.
- Training logic: Zone 2 maps to roadwork aerobic, tempo maps to roadwork tempo, intervals map to conditioning intervals.
- Fueling logic: Long/tempo/intervalling roadwork raises carb/hydration emphasis.
- Failure signs: Roadwork title parsing overrides direct metadata, or all roadwork becomes generic conditioning.

## 8. Shoulder Caution / No-Running Safety Flag

- UI behavior: WorkoutDetail shows safe substitutions or a recovery-first alternative.
- Training logic: Shoulder-heavy or running-dependent selections are filtered or replaced.
- Fueling logic: Fuel guidance follows the safe replacement, not the original blocked plan.
- Failure signs: Unsafe exercise remains, no safe workout found without calm copy, or blocked content is hidden silently.

## 9. Missing Generated Workout Attachment

- UI behavior: Today says details will build when opened; WorkoutDetail says the plan is set and offers Build Full Session.
- Training logic: Lazy generation uses the weekly snapshot metadata and then attaches the GeneratedWorkout to the row.
- Fueling logic: Fuel still reads support-domain metadata before attachment.
- Failure signs: Standalone generator appears by default, old legacy generator runs, or attachment failure has no user copy/log.

## 10. Fuel Screen After Support Types

- UI behavior: Fuel lead copy changes based on direct FuelDirective metadata.
- Training logic: Strength, roadwork, intervals, durability, and sparring each preserve their own support/fuel identity.
- Fueling logic: Strength says fuel enough to train plus protein; roadwork says steady hydration; intervals say pre-session carbs and glycogen restore; durability says lower carb but protein/hydration still matter; sparring says do not under-fuel.
- Failure signs: Fuel parses titles, shows generic macro copy only, or treats durability like sparring.

## 11. Completion -> History -> Analytics -> Next Plan

- UI behavior: Completion saves, History shows the session, Analytics updates, and progression copy appears.
- Training logic: Completed generated support links to weekly entry and generated program session when available.
- Fueling logic: Completion does not erase daily fuel context.
- Failure signs: Completion saved but weekly row remains planned with no message, program sync failure is silent, or analytics ignores generated sessions.

## 12. Legacy Archived Row View-Only Compatibility

- UI behavior: Old rows open in compatibility view with calm copy.
- Training logic: Regeneration requires explicit safe boxing intent; protected sparring is not regenerated.
- Fueling logic: Old rows remain readable without corrupting new support metadata.
- Failure signs: Silent legacy fallback, old calculateSC generation on product paths, or archived rows crash.

## 13. Engine Flag Off Behavior

- UI behavior: App falls back cleanly to compatible views without duplicate generators.
- Training logic: New generated support is not silently mixed with legacy workout generation.
- Fueling logic: Daily fuel remains safe and does not infer missing data as zero.
- Failure signs: Mixed old/new planners active together, missing data treated as safe, or no explanation for unavailable support details.

## 14. Media Missing But Text Fallback Safe

- UI behavior: Exercise rows remain usable without media and show text instructions/cues.
- Training logic: Missing media does not block safe text-only execution when content is otherwise approved.
- Fueling logic: No effect.
- Failure signs: Blank media areas, no instructions, or production exercise with neither approved media nor safe text fallback.
