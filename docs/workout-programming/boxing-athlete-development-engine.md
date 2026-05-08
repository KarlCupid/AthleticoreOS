# Boxing Athlete Development Engine

Athleticore workout programming is boxing-first. The engine is not a generic workout generator and not a broad combat-sport generator. Protected boxing sessions stay anchored, then Athleticore fills the missing athletic qualities around them.

## Pillars

- Variance: rotate formats only when the trained quality remains stable. Beginners and tapers use low variance. Open/development tracks can use moderate variance.
- Volume: track generated and protected dose through a weekly boxing load ledger instead of guessing.
- Frequency: preserve full sessions, support sessions, microdoses, and recovery resets so useful exposure does not disappear when protected boxing is present.

## Tracks

- `aspiring_boxer`: fundamentals, shadowboxing, footwork, roadwork, mobility, and strength basics. No generated sparring.
- `amateur_novice`: high-frequency short development with controlled conditioning and durability.
- `amateur_open`: repeat-output, agility, fast starts, alactic repeatability, and enough aerobic support.
- `amateur_elite`: higher specificity, sharper high/low scheduling, frequent microdoses, and controlled variance.
- `pro_development`: longer pacing durability, power retention, durability, and repeat-round recovery.
- `pro_4_6_round`: bridge between amateur pace and professional pacing.
- `pro_8_10_round`: aerobic durability, strength maintenance, durability, and fewer random finishers.
- `pro_12_round`: highest aerobic base, repeat-round recovery, durability, pacing, and taper discipline.
- `general_fitness_legacy`: explicit opt-in only.

Legacy combat archetypes are accepted only as compatibility inputs and map into boxing tracks when the goal, labels, or context clearly indicate boxing. Non-boxing protected labels such as MMA, grappling, wrestling, BJJ, Muay Thai, and kickboxing are external load, not boxing skill.

## Protected Load

Protected boxing sessions are schedule anchors. Boxing skill, pads, bag work, sparring, roadwork, competition, mobility/prehab, and recovery labels are inferred when modality is missing.

Sparring and competition are protected or coach-led only. The generator never creates live sparring, unsupervised fight simulation, or high-contact prescriptions.

Deprecated `sport_skill` inputs are treated cautiously. They become boxing load only when the label clearly says boxing, pads, mitts, bag work, shadowboxing, footwork, sparring, bout, or boxing class/practice. MMA, grappling, wrestling, BJJ, Muay Thai, and kickboxing labels remain external non-boxing load.

## Boxing Content Layer

The planner requests boxing session families and the content layer now resolves those families to dedicated templates, prescriptions, and exercises rather than generic cardio, mobility, or strength fallbacks.

- `boxing_skill_microdose`: short, low-risk skill support built around stance, breathing, rhythm, posture, and movement quality.
- `footwork_agility`: boxing footwork, change-of-direction quality, ankle/calf/hip capacity, balance, and repeatable stance resets.
- `shadowboxing_quality`: self-guided, low-contact shadowboxing quality with guard, foot placement, breath, and rhythm cues. It is support work, not a replacement for coaching.
- `roadwork_zone2`: conversational aerobic base for repeat-round recovery.
- `roadwork_tempo`: controlled moderate pacing durability for prepared weeks.
- `roadwork_intervals`: harder aerobic-power support only when readiness and hard-day budget allow.
- `alactic_repeat_power`: short burst work with long recoveries and low total fatigue, aimed at first-step and repeat-output quality.
- `glycolytic_round_tolerance`: controlled round-based tolerance for prepared athletes, kept away from hard sparring.
- `rotational_power`: low-volume, high-intent hip-to-trunk power transfer.
- `trunk_durability`: anti-rotation, anti-extension, carries, bracing, and posture under fatigue.
- `shoulder_scap_durability`: scapular control, serratus/rotator-cuff endurance, thoracic position, and guard durability.
- `neck_trap_durability`: conservative trap, scapular, and postural durability only. The engine does not prescribe loaded neck bridges, aggressive manual resistance, or contact preparation.
- `hip_ankle_mobility` and `hip_footwork_durability`: hips, ankles, calves, adductors, lateral movement capacity, and footwork readiness.
- `recovery_reset`: breathing, easy circulation, mobility, and nervous-system downshifting.

Microdoses exist because boxing adaptation depends on useful frequency, but not every exposure should be a full workout. A microdose can stack with protected boxing when it is short, low-load, and improves the chain without stealing from skill practice or recovery.

## Intent-To-Template Binding

Planner intents carry the intended boxing session family, planned role, dose category, and optional preferred template ID into workout generation. The engine first tries the preferred template, then the canonical template for the boxing family, then falls back to normal scoring only when the intended template is incompatible with readiness, safety flags, duration, equipment, or experience.

Fallbacks must be visible. If a boxing intent cannot use its intended template, the generated workout decision trace explains what was rejected and which safe fallback was selected. Silent generic fallbacks are treated as validation risk.

## Athletic Chain

The weekly dose plan scores a boxing performance vector:

- Skill, footwork, reaction, and rhythm
- Lower-body strength and explosive strength
- Upper-body explosive strength
- Rotational transfer and anti-rotation durability
- Shoulder/scapular, neck/trap, wrist/hand, hip/ankle, and thoracic durability
- Aerobic base, aerobic power, alactic repeat power, glycolytic round tolerance
- Recovery capacity

Quality gaps expose underdosed areas with priority and rationale.

## Load Ledger

Each week exposes a boxing load ledger with protected boxing minutes/rounds, sparring rounds, bag/pad rounds, roadwork minutes, external load, generated dose categories, strength sets, power contacts, trunk and shoulder durability, mobility, intervals, alactic bursts, glycolytic rounds, load scores, hard-day count, and hard-day cap.

Protected roadwork can reduce additional generated roadwork, but protected boxing does not automatically erase Athleticore S&C or low-load support.

Generated workouts update the ledger from actual selected content. If a hard conditioning intent is downgraded to mobility, recovery, or durability support, the ledger credits the lower-load work that was actually prescribed. Blocked workouts do not count as successful generated dose.

The ledger also tracks technical microdose minutes so short boxing-support exposures are visible instead of being hidden inside generic session counts.

## Outcome-Aware Progression

The engine now has conservative progression hooks for boxing families. Recent completions, session RPE, pain before and after, completion status, feedback tags, and recent progression decisions can produce one of these actions:

- `progress_volume`
- `progress_intensity`
- `repeat`
- `regress`
- `swap_family`
- `deload`
- `coach_review`

Easy completed roadwork can earn a small volume or frequency progression. Hard alactic work that felt too difficult repeats or regresses instead of intensifying. Increased pain during shoulder or neck/trap durability triggers regression or coach review. Missed or abandoned sessions reduce variance and complexity before the engine adds novelty.

These decisions can influence next-week family selection, variance level, dose target, and the hard generated cap. They are deliberately conservative until richer athlete history is available.

## Scheduling

Hard generated work does not stack onto sparring or competition. Hard generated conditioning is kept away from hard sparring unless the plan can justify it. Low-load mobility, prehab, recovery, and footwork microdoses may stack when day capacity is safe.

Protected duration and load count toward day capacity. If hard work cannot be placed safely, the scheduler downgrades to boxing-relevant low-load support when useful and warns when dose is under target.

Placement uses a lightweight boxing week layout score. Candidates are penalized for hard work on sparring or competition days, reckless adjacent hard days, losing the only recovery day on high-load weeks, and poor spacing for the track. Amateur plans prefer agility and repeat-output spacing. Pro plans prefer pacing durability and recovery spacing. Limited availability can still stack low-load support on protected boxing days when the capacity math is safe.

## UI-Ready Summary

Generated weeks expose boxing-specific helper copy for product surfaces:

- `weeklyBoxingHeadline`
- `weeklyBoxingSummary`
- `primaryBoxingFocus`
- `hardDaySummary`
- `protectedLoadSummary`
- `generatedSupportSummary`
- `nextBestAction`
- `coachSummaryBullets`

The copy should explain the actual programming decision, such as sparring owning the hard stress, roadwork already being covered, or red readiness removing hard work.

## Media Readiness

Dedicated boxing exercises currently use pending media hooks rather than invented assets. The content audit reports how many boxing exercises still need media, their priority, whether alt text is present, whether a missing-media reason is present, and whether a safe text-only fallback exists through setup, execution, and safety instructions.

Text-only fallback is acceptable for the current safe-support layer, but media readiness remains a production review item before media-rich surfaces rely on these drills.

## Readiness And Taper

Red readiness allows no hard generated work. Orange and yellow readiness reduce hard work while preserving useful low-load frequency. Fight-camp taper reduces hard S&C close to the bout and keeps maintenance, recovery, mobility, and technical-light support.

Safety wins over performance goals. Missing readiness, weight, intake, hydration, sleep, symptoms, or other safety data is unknown, not safe.

## Limitations

The current content layer supports low-risk boxing development through S&C, roadwork, mobility, durability, footwork, and shadowboxing-style support. It does not replace a boxing coach, medical professional, or qualified strength coach. Athletes with injury, illness, dizziness, fainting, acute pain, under-fueling risk, REDs-style risk, or weight-cut concerns need human review before hard training.
