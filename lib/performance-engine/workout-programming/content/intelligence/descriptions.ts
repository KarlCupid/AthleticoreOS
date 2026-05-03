import type { DescriptionTemplate } from '../../types.ts';

export const descriptionTemplates = [
  {
    "id": "description_beginner_full_body_strength",
    "descriptionTemplateId": "description_beginner_full_body_strength",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "beginner_strength",
    "appliesToGoalIds": [
      "beginner_strength"
    ],
    "summaryTemplate": "A beginner full-body strength session that builds squat, hinge, push, pull, and trunk control.",
    "toneVariant": "beginner_friendly",
    "sessionIntent": "Build full-body strength without chasing fatigue.",
    "plainLanguageSummary": "Practice the main patterns with enough challenge to learn and enough reserve to repeat them.",
    "coachExplanation": "The session is built around repeatable positions. A good set today should look like something we can safely build on next time.",
    "effortExplanation": "Use a load that leaves about two good reps in reserve. Rest long enough that the next set is strong, not rushed.",
    "whyThisMatters": "Beginner strength improves fastest when movement quality, confidence, and symptom control stay high.",
    "howItShouldFeel": "Worked and coordinated, with enough control to repeat the main patterns.",
    "successCriteria": [
      "No pain increase",
      "All main patterns completed",
      "Effort rating stays within the target range"
    ],
    "scalingDown": "Use the easiest safe variation, reduce one set, and keep the same movement pattern.",
    "scalingUp": "Add the smallest load jump or one clean rep only when every set stays controlled.",
    "formFocus": [
      "Full-foot pressure",
      "Controlled lowering",
      "Stable trunk"
    ],
    "breathingFocus": "Inhale and brace before the hard part, then exhale through the finish without losing position.",
    "commonMistakes": [
      "Adding load before the pattern is stable",
      "Rushing rest and letting the next set fall apart"
    ],
    "safetyNotes": [
      "Pause if pain becomes sharp, dizziness appears, or symptoms change how you move."
    ],
    "recoveryExpectation": "Mild muscle soreness is acceptable; joint pain or worsening symptoms are not.",
    "completionMessage": "Base built. Log reps, load, effort rating, and any pain signal so the next step is clear.",
    "nextSessionNote": "Repeat or progress only if soreness, sleep, readiness, and pain signals are stable."
  },
  {
    "id": "description_intermediate_strength",
    "descriptionTemplateId": "description_intermediate_strength",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "full_gym_strength",
    "appliesToGoalIds": [
      "full_gym_strength",
      "upper_body_strength",
      "lower_body_strength"
    ],
    "summaryTemplate": "An intermediate strength session using heavier anchors, longer rest, and clean submaximal force.",
    "toneVariant": "athletic",
    "sessionIntent": "Build strength with heavier exposures that still protect technical quality.",
    "plainLanguageSummary": "Lift heavy enough to train force, but not so heavy that reps turn into a fight.",
    "coachExplanation": "Intermediate strength work needs clear anchors, enough rest, and strict cutoffs for speed or position loss.",
    "effortExplanation": "Most working sets should feel like 7-8 out of 10 effort, with two good reps still available.",
    "whyThisMatters": "Strength transfers best when the athlete can repeat high-quality force without burying recovery.",
    "howItShouldFeel": "Strong, focused, and controlled with full recovery between important sets.",
    "successCriteria": [
      "No grinding reps",
      "Load and effort rating logged",
      "Main lift position stays consistent"
    ],
    "scalingDown": "Use a machine, dumbbell, or reduced-range option and remove the final heavy set.",
    "scalingUp": "Add a small load jump only after speed, position, and readiness all stay stable.",
    "formFocus": [
      "Brace before load",
      "Consistent setup",
      "Clean implement path"
    ],
    "breathingFocus": "Brace before the rep, exhale after the sticking point, and fully reset before the next rep.",
    "commonMistakes": [
      "Testing maxes during a training session",
      "Cutting rest short because the clock feels urgent"
    ],
    "safetyNotes": [
      "Back, knee, shoulder, and wrist flags change anchor selection before they change effort."
    ],
    "recoveryExpectation": "Heavy work may create fatigue, but it should not compromise protected practices or tomorrow readiness.",
    "completionMessage": "Strength exposure logged. Quality, not ego, decides the progression.",
    "nextSessionNote": "Return to the same anchor or progress only if recovery markers support it."
  },
  {
    "id": "description_upper_body_hypertrophy",
    "descriptionTemplateId": "description_upper_body_hypertrophy",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "upper_strength",
    "appliesToGoalIds": [
      "upper_body_strength",
      "hypertrophy",
      "dumbbell_hypertrophy"
    ],
    "summaryTemplate": "An upper-body hypertrophy session focused on pressing, pulling, shoulder control, and repeatable volume.",
    "toneVariant": "detailed",
    "sessionIntent": "Accumulate upper-body volume without turning joints into the limiter.",
    "plainLanguageSummary": "Make the chest, back, shoulders, and arms work hard while keeping reps clean.",
    "coachExplanation": "Hypertrophy work should bias the target tissue, preserve shoulder position, and use double progression: reach the top of the rep range before adding load.",
    "effortExplanation": "Stay one to three reps short of your all-out point. The last reps can burn, but they should not pinch or grind.",
    "whyThisMatters": "Upper-body size and strength respond to consistent quality volume more than occasional all-out sets.",
    "howItShouldFeel": "Target muscles working hard, shoulders centered, and breathing controlled between sets.",
    "successCriteria": [
      "Target rep ranges reached",
      "No all-out reps",
      "Pressing and pulling both logged"
    ],
    "scalingDown": "Remove one accessory set or choose a more supported press or row.",
    "scalingUp": "Use double progression: earn the top of the rep range before adding load.",
    "formFocus": [
      "Scapular position",
      "Controlled eccentric",
      "Pain-free range"
    ],
    "breathingFocus": "Exhale through presses and reset the rib cage before pulling work.",
    "commonMistakes": [
      "Taking every set to the all-out point",
      "Letting the shoulder roll forward to chase reps"
    ],
    "safetyNotes": [
      "Shoulder and wrist flags cap range and change exercise selection."
    ],
    "recoveryExpectation": "Muscle fatigue is expected; shoulder or elbow irritation should not climb.",
    "completionMessage": "Upper volume banked. Log reps and reps in reserve so the next load choice is clear.",
    "nextSessionNote": "Progress the movements that hit the top of the range with stable joints."
  },
  {
    "id": "description_lower_body_hypertrophy",
    "descriptionTemplateId": "description_lower_body_hypertrophy",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "lower_strength",
    "appliesToGoalIds": [
      "lower_body_strength",
      "hypertrophy",
      "dumbbell_hypertrophy"
    ],
    "summaryTemplate": "A lower-body hypertrophy session for squat, hinge, and unilateral volume with knee and back guardrails.",
    "toneVariant": "coach_like",
    "sessionIntent": "Build lower-body muscle through controlled volume and joint-aware ranges.",
    "plainLanguageSummary": "Train legs and hips hard enough to grow, while keeping knee and back signals quiet.",
    "coachExplanation": "Lower hypertrophy succeeds when the target muscles keep doing the work across sets, not when fatigue forces compensation.",
    "effortExplanation": "Work near 7-8 out of 10 effort with one to three reps in reserve and controlled lowering.",
    "whyThisMatters": "Repeatable lower-body volume builds capacity for strength, conditioning, and sport support.",
    "howItShouldFeel": "Quads, glutes, or hamstrings loaded with a stable trunk and predictable joint feel.",
    "successCriteria": [
      "Rep range completed",
      "Pain stable",
      "Load or variation recorded"
    ],
    "scalingDown": "Use box squat, leg press, glute bridge, or shorter range before cutting the whole pattern.",
    "scalingUp": "Add reps first, then load, when all sets stay in the target range.",
    "formFocus": [
      "Full-foot pressure",
      "Hip control",
      "Controlled range"
    ],
    "breathingFocus": "Brace into the descent or hinge, then exhale through the effort.",
    "commonMistakes": [
      "Forcing depth for more stretch",
      "Letting back fatigue replace hamstring or glute work"
    ],
    "safetyNotes": [
      "Knee and back caution flags lower load, range, or complexity immediately."
    ],
    "recoveryExpectation": "Local muscle soreness is normal; joint pain or altered walking mechanics are not.",
    "completionMessage": "Lower volume logged. The next step depends on reps, reps in reserve, and symptom response.",
    "nextSessionNote": "Repeat the dose if soreness or pain trends are not clearly stable."
  },
  {
    "id": "description_zone2_cardio",
    "descriptionTemplateId": "description_zone2_cardio",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "zone2_cardio",
    "appliesToGoalIds": [
      "zone2_cardio"
    ],
    "summaryTemplate": "A Zone 2 conversational cardio session built around steady duration, low recovery cost, and easy breathing.",
    "toneVariant": "minimal",
    "sessionIntent": "Build aerobic base without adding heavy recovery cost.",
    "plainLanguageSummary": "Stay easy enough to talk and finish feeling like you could keep going.",
    "coachExplanation": "Zone 2 means easy conversational cardio. It expands the base that harder work sits on, and the intensity ceiling matters more than pace.",
    "effortExplanation": "Stay at a conversational effort. You should be able to speak in short sentences without gasping.",
    "whyThisMatters": "Easy aerobic work supports recovery, workload tolerance, and future conditioning.",
    "howItShouldFeel": "Smooth, sustainable, and almost too easy during the first third.",
    "successCriteria": [
      "Conversational breathing maintained",
      "Duration completed",
      "No symptom increase"
    ],
    "scalingDown": "Reduce duration by 5-10 minutes or choose the lowest-impact modality.",
    "scalingUp": "Add 3-5 minutes before adding intensity.",
    "formFocus": [
      "Relaxed posture",
      "Smooth cadence",
      "Even effort"
    ],
    "breathingFocus": "Breathing should stay controlled enough to speak without gasping.",
    "commonMistakes": [
      "Chasing pace",
      "Turning easy conversational cardio into intervals",
      "Ignoring breathing drift"
    ],
    "safetyNotes": [
      "No-running and impact restrictions move this to bike, rower, or walking."
    ],
    "recoveryExpectation": "Readiness should feel the same or better after cooldown.",
    "completionMessage": "Aerobic base work banked. The win was steady, not flashy.",
    "nextSessionNote": "Progress duration or weekly frequency before intensity."
  },
  {
    "id": "description_threshold_cardio",
    "descriptionTemplateId": "description_threshold_cardio",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "conditioning",
    "appliesToGoalIds": [
      "low_impact_conditioning",
      "boxing_support"
    ],
    "summaryTemplate": "A threshold cardio session for controlled hard efforts below an all-out limit.",
    "toneVariant": "clinical",
    "sessionIntent": "Improve sustained hard effort while keeping output repeatable.",
    "plainLanguageSummary": "Work near the edge of comfort, but do not sprint or chase a max.",
    "coachExplanation": "Threshold work should create pressure without breaking pacing, mechanics, or recovery.",
    "effortExplanation": "Expect 7-8 out of 10 effort. Breathing is heavy, but you should still control pace and posture.",
    "whyThisMatters": "Threshold capacity helps bridge easy aerobic work and high-intensity intervals.",
    "howItShouldFeel": "Hard, controlled, and repeatable with clear pacing discipline.",
    "successCriteria": [
      "Work intervals completed",
      "Pace or watts stay steady",
      "No concerning symptoms"
    ],
    "scalingDown": "Shorten the work interval or switch to easy conversational cardio if readiness is poor.",
    "scalingUp": "Add one interval only when every repeat stays within the same output band.",
    "formFocus": [
      "Relaxed shoulders",
      "Stable cadence",
      "Even output"
    ],
    "breathingFocus": "Recover breathing during rest before starting the next repeat.",
    "commonMistakes": [
      "Starting too fast",
      "Calling HIIT threshold work",
      "Ignoring pace collapse"
    ],
    "safetyNotes": [
      "Poor sleep, high soreness, illness, or pain trends should replace this with easier cardio."
    ],
    "recoveryExpectation": "Fatigue is expected, but it should settle after cooldown and not spike symptoms.",
    "completionMessage": "Threshold work logged. Output consistency matters more than peak output.",
    "nextSessionNote": "Repeat the same dose before extending the work interval."
  },
  {
    "id": "description_low_impact_hiit",
    "descriptionTemplateId": "description_low_impact_hiit",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "low_impact_conditioning",
    "appliesToGoalIds": [
      "low_impact_conditioning"
    ],
    "summaryTemplate": "A low-impact HIIT session using repeatable work and rest intervals without jumping or running.",
    "toneVariant": "motivational",
    "sessionIntent": "Train hard breathing while protecting joints and landing exposure.",
    "plainLanguageSummary": "Push the intervals, but keep the tool low-impact and the output repeatable.",
    "coachExplanation": "The goal is high effort without extra joint contacts. Repeatability is the quality gate.",
    "effortExplanation": "Work intervals can reach 7-8 out of 10 effort, but the last round should still look controlled.",
    "whyThisMatters": "Conditioning does not require unnecessary pounding when bike, rower, rope, or sled options fit better.",
    "howItShouldFeel": "Hard breathing, stable joints, and a clear recovery between rounds.",
    "successCriteria": [
      "No jumping or running required",
      "Work/rest/rounds completed",
      "Pain stable"
    ],
    "scalingDown": "Cut two rounds, lengthen rest, or shift to easy conversational cardio.",
    "scalingUp": "Add one round only when output and form stay consistent.",
    "formFocus": [
      "Stable trunk",
      "Smooth rhythm",
      "Controlled transitions"
    ],
    "breathingFocus": "Start the next round only when breathing is recovered enough to repeat quality.",
    "commonMistakes": [
      "Going all-out in round one",
      "Letting knee or back signals climb to finish the set"
    ],
    "safetyNotes": [
      "No-jumping and no-running flags are hard constraints, not suggestions."
    ],
    "recoveryExpectation": "Breathing fatigue should settle quickly after cooldown.",
    "completionMessage": "Low-impact intensity done. You got the conditioning without the extra pounding.",
    "nextSessionNote": "Progress rounds before intensity if recovery is stable."
  },
  {
    "id": "description_metabolic_conditioning",
    "descriptionTemplateId": "description_metabolic_conditioning",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "conditioning",
    "appliesToGoalIds": [
      "low_impact_conditioning",
      "limited_equipment",
      "boxing_support"
    ],
    "summaryTemplate": "A metabolic conditioning session using density, repeatable rounds, and strict fatigue guardrails.",
    "toneVariant": "coach_like",
    "sessionIntent": "Build work capacity without letting fatigue erase movement quality.",
    "plainLanguageSummary": "Move through the circuit with purpose, but keep every round technically honest.",
    "coachExplanation": "Metabolic conditioning is not random suffering. Density only counts when the movements still match the intent.",
    "effortExplanation": "Aim for 6-8 out of 10 effort and leave enough control to finish the final round cleanly.",
    "whyThisMatters": "Well-controlled density improves capacity while still respecting safety and skill.",
    "howItShouldFeel": "Breathing and muscles challenged, but movement patterns recognizable.",
    "successCriteria": [
      "Rounds completed",
      "Movement quality maintained",
      "Effort rating and substitutions logged"
    ],
    "scalingDown": "Reduce one round or remove the highest-demand movement.",
    "scalingUp": "Add a round or shorten rest only after clean completion.",
    "formFocus": [
      "Pattern integrity",
      "Transition control",
      "No sloppy finishers"
    ],
    "breathingFocus": "Use rest periods to bring breathing back under control.",
    "commonMistakes": [
      "Chasing sweat instead of quality",
      "Adding density after form has already faded"
    ],
    "safetyNotes": [
      "Pain increase, high fatigue, or poor readiness turns this into lower-impact conditioning."
    ],
    "recoveryExpectation": "Session fatigue is expected; joint irritation or next-day crash is not.",
    "completionMessage": "Conditioning density logged. Quality kept the work useful.",
    "nextSessionNote": "Progress density only if completion and recovery both look stable."
  },
  {
    "id": "description_hip_tspine_mobility",
    "descriptionTemplateId": "description_hip_tspine_mobility",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "mobility",
    "appliesToGoalIds": [
      "mobility",
      "return_to_training"
    ],
    "summaryTemplate": "A hip and thoracic mobility session for usable range, control, and calmer breathing.",
    "toneVariant": "rehab_informed",
    "sessionIntent": "Improve hip and upper-back range without forcing depth.",
    "plainLanguageSummary": "Move slowly through pain-free range. The goal is control and usable range, not forcing depth.",
    "coachExplanation": "Hips and thoracic spine often unlock better squat, hinge, breathing, and rotation when the new range is controlled.",
    "effortExplanation": "Keep effort low. A mild stretch is fine; sharp pain, numbness, or pinching is not.",
    "whyThisMatters": "Usable mobility supports training quality and lowers the need for compensations.",
    "howItShouldFeel": "Warmer, freer, and more controlled without symptom escalation.",
    "successCriteria": [
      "Pain-free range used",
      "Breathing stays calm",
      "Range feels same or better after"
    ],
    "scalingDown": "Reduce range, shorten holds, or use supported positions.",
    "scalingUp": "Add a slow rep, longer exhale, or slightly deeper controlled range.",
    "formFocus": [
      "Pelvis control",
      "Upper-back rotation",
      "No forced end range"
    ],
    "breathingFocus": "Use long exhales at end range to reduce guarding.",
    "commonMistakes": [
      "Cranking through the shoulder to rotate",
      "Arching the low back to fake hip extension"
    ],
    "safetyNotes": [
      "Sharp pain, numbness, or worsening symptoms means stop or regress."
    ],
    "recoveryExpectation": "This should feel restorative, not like a workout you need to recover from.",
    "completionMessage": "Mobility work logged. Notice which range changed without forcing it.",
    "nextSessionNote": "Progress only the ranges that stayed comfortable afterward."
  },
  {
    "id": "description_recovery",
    "descriptionTemplateId": "description_recovery",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "recovery",
    "appliesToGoalIds": [
      "recovery"
    ],
    "summaryTemplate": "A low-stress recovery session for breathing, circulation, and symptom tracking.",
    "toneVariant": "minimal",
    "sessionIntent": "Support recovery without adding meaningful training load.",
    "plainLanguageSummary": "Move enough to feel better, not enough to create another workout to recover from.",
    "coachExplanation": "Recovery sessions keep the athlete engaged while letting the system absorb training.",
    "effortExplanation": "Effort stays 1-3 out of 10. If it feels like training, make it easier.",
    "whyThisMatters": "Recovery is part of the continuous athlete journey, not a reset or a skipped day.",
    "howItShouldFeel": "Easy, calming, and restorative.",
    "successCriteria": [
      "Symptoms same or better",
      "Breathing calmer",
      "No hard efforts"
    ],
    "scalingDown": "Use breathing only or shorten the flow.",
    "scalingUp": "Add easy walking or gentle mobility if readiness improves.",
    "formFocus": [
      "Comfortable range",
      "Relaxed pace",
      "No strain"
    ],
    "breathingFocus": "Use long exhales and nasal breathing when possible.",
    "commonMistakes": [
      "Turning recovery into conditioning",
      "Chasing sweat or calories"
    ],
    "safetyNotes": [
      "Concerning symptoms block hard training and require review."
    ],
    "recoveryExpectation": "You should finish feeling at least a little better.",
    "completionMessage": "Recovery work counts. Log how symptoms and readiness changed.",
    "nextSessionNote": "Use readiness and symptoms to decide whether to rebuild load."
  },
  {
    "id": "description_balance_older_adult",
    "descriptionTemplateId": "description_balance_older_adult",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "mobility",
    "appliesToGoalIds": [
      "mobility",
      "return_to_training",
      "core_durability"
    ],
    "summaryTemplate": "A balance session for older adults or cautious return-to-training scenarios using support before complexity.",
    "toneVariant": "rehab_informed",
    "sessionIntent": "Improve balance confidence without creating fall risk.",
    "plainLanguageSummary": "Stay supported enough to practice calm balance, not a scrambling save.",
    "coachExplanation": "Balance progresses by narrowing support, changing vision, or adding movement one step at a time.",
    "effortExplanation": "This is low fatigue and high attention. Stop before fear, dizziness, or scrambling takes over.",
    "whyThisMatters": "Safe balance practice improves confidence and reduces wasted tension in movement.",
    "howItShouldFeel": "Focused, steady, and safe with a clear support option nearby.",
    "successCriteria": [
      "Support available",
      "No unsafe stumbles",
      "Breathing steady"
    ],
    "scalingDown": "Use two-foot stance, hand support, or floor-based control work.",
    "scalingUp": "Add reach, head turns, or single-leg time one variable at a time.",
    "formFocus": [
      "Foot pressure",
      "Tall posture",
      "Quiet trunk"
    ],
    "breathingFocus": "Keep breathing slow so tension does not create false instability.",
    "commonMistakes": [
      "Removing support too soon",
      "Training balance while dizzy or rushed"
    ],
    "safetyNotes": [
      "Dizziness, fainting, or acute neurological symptoms block this session."
    ],
    "recoveryExpectation": "Balance work should improve confidence, not create fatigue or fear.",
    "completionMessage": "Balance practice logged. The steady version is the right version.",
    "nextSessionNote": "Progress only after the current stance feels calm and repeatable."
  },
  {
    "id": "description_power_session",
    "descriptionTemplateId": "description_power_session",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "power",
    "appliesToGoalIds": [
      "boxing_support",
      "full_gym_strength"
    ],
    "summaryTemplate": "A low-volume power session where speed, rest, and technical quality decide the dose.",
    "toneVariant": "athletic",
    "sessionIntent": "Express power without accumulating sloppy fatigue.",
    "plainLanguageSummary": "Move fast, rest fully, and stop before speed drops.",
    "coachExplanation": "Power trains the nervous system. Once reps slow down or landings get noisy, the training effect has changed.",
    "effortExplanation": "Use low reps, explosive intent, and full recovery. This is quality work, not conditioning.",
    "whyThisMatters": "High-quality power supports athletic output without stealing recovery from skill work.",
    "howItShouldFeel": "Fast, crisp, and controlled with plenty of rest.",
    "successCriteria": [
      "Speed stays high",
      "Technique stays clean",
      "Full rest taken"
    ],
    "scalingDown": "Use a lighter tool, lower jump/throw demand, or technique-only work.",
    "scalingUp": "Add one set only if every rep stays sharp and fatigue remains low.",
    "formFocus": [
      "Explosive intent",
      "Clean finish",
      "Stable landing or trunk"
    ],
    "breathingFocus": "Recover breathing fully before the next set.",
    "commonMistakes": [
      "Using power work as conditioning",
      "Adding reps after speed drops"
    ],
    "safetyNotes": [
      "Poor readiness, pain increase, or high fatigue blocks progression."
    ],
    "recoveryExpectation": "Power work should not create heavy next-day fatigue.",
    "completionMessage": "Power quality logged. You stopped where speed still mattered.",
    "nextSessionNote": "Progress only through the quality gate, not through fatigue."
  },
  {
    "id": "description_boxing_support",
    "descriptionTemplateId": "description_boxing_support",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "boxing_support",
    "appliesToGoalIds": [
      "boxing_support"
    ],
    "summaryTemplate": "Support work for boxing that protects shoulder capacity, trunk control, and ring-session readiness.",
    "toneVariant": "athletic",
    "sessionIntent": "Support boxing without competing with protected coach-led work.",
    "plainLanguageSummary": "Train the qualities that help boxing while keeping boxing sessions as the anchor.",
    "coachExplanation": "Boxing support should improve readiness for practice, sparring, and skill work rather than becoming a second fight session.",
    "effortExplanation": "Power stays crisp, shoulder work stays controlled, and conditioning stops before it drains skill quality.",
    "whyThisMatters": "Better support work raises the floor for boxing while protecting the sessions that matter most.",
    "howItShouldFeel": "Sharp, athletic, and prepared, not exhausted.",
    "successCriteria": [
      "Protected boxing preserved",
      "Shoulders stable",
      "Power or trunk quality maintained"
    ],
    "scalingDown": "Use shoulder preparation, trunk control, easy conversational cardio, or breathing work.",
    "scalingUp": "Add low-volume power only when readiness and shoulder signals are good.",
    "formFocus": [
      "Rotational control",
      "Scapular support",
      "Foot pressure"
    ],
    "breathingFocus": "Recover fully between power efforts and downshift during cooldown.",
    "commonMistakes": [
      "Fatiguing shoulders before boxing",
      "Turning support work into sparring conditioning"
    ],
    "safetyNotes": [
      "Sparring and coach-led boxing remain protected schedule anchors."
    ],
    "recoveryExpectation": "You should leave more prepared for boxing, not drained by support work.",
    "completionMessage": "Boxing support logged. The anchor sessions stay protected.",
    "nextSessionNote": "Adjust support load around practice, sparring, and readiness trends."
  },
  {
    "id": "description_return_to_training",
    "descriptionTemplateId": "description_return_to_training",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "return_to_training",
    "appliesToGoalIds": [
      "return_to_training"
    ],
    "summaryTemplate": "A return-to-training session that rebuilds tolerance without pretending the athlete is starting over.",
    "toneVariant": "rehab_informed",
    "sessionIntent": "Transition back into training safely.",
    "plainLanguageSummary": "Do enough to rebuild confidence and tolerance, not enough to test limits.",
    "coachExplanation": "Return-to-training is a transition in the same journey. We use current symptoms, readiness, and completion data to choose the next useful dose.",
    "effortExplanation": "Stay around 3-6 out of 10 effort and stop well before pain, dizziness, or compensation changes the session.",
    "whyThisMatters": "Conservative re-entry protects consistency and keeps a minor interruption from becoming a longer pause.",
    "howItShouldFeel": "Controlled, confidence-building, and symptom-aware.",
    "successCriteria": [
      "Symptoms stable",
      "No hard efforts",
      "Completion and pain response logged"
    ],
    "scalingDown": "Use recovery-only flow, fewer movements, or shorter ranges.",
    "scalingUp": "Add small volume only after repeatable easy sessions with stable symptoms.",
    "formFocus": [
      "Comfortable range",
      "Technique clarity",
      "Low fatigue"
    ],
    "breathingFocus": "Use breathing and warm-up feel to monitor readiness.",
    "commonMistakes": [
      "Trying to prove readiness in one session",
      "Treating missing data as safe"
    ],
    "safetyNotes": [
      "Unknown readiness reduces confidence and blocks aggressive progression."
    ],
    "recoveryExpectation": "The session should make the next decision easier, not riskier.",
    "completionMessage": "Return step completed. The data guides the next transition.",
    "nextSessionNote": "Repeat before progressing if pain, readiness, or symptom data is uncertain."
  },
  {
    "id": "description_no_equipment_strength",
    "descriptionTemplateId": "description_no_equipment_strength",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "no_equipment",
    "appliesToGoalIds": [
      "no_equipment"
    ],
    "summaryTemplate": "A no-equipment strength session using bodyweight, leverage, tempo, and trunk control.",
    "toneVariant": "beginner_friendly",
    "sessionIntent": "Train useful strength with no required equipment.",
    "plainLanguageSummary": "Use bodyweight patterns that match the goal and your space.",
    "coachExplanation": "No-equipment strength progresses through cleaner reps, harder leverage, longer controlled range, and density, not random exercise swaps.",
    "effortExplanation": "Keep reps clean and stop before positions fall apart.",
    "whyThisMatters": "Consistency should not depend on having a gym available.",
    "howItShouldFeel": "Simple, focused, and repeatable.",
    "successCriteria": [
      "Bodyweight-compatible exercises only",
      "Effort rating within target",
      "No pain increase"
    ],
    "scalingDown": "Use higher inclines, shorter holds, fewer rounds, or smaller ranges.",
    "scalingUp": "Slow tempo, add reps, add range, or progress leverage one variable at a time.",
    "formFocus": [
      "Body line",
      "Tempo",
      "Range control"
    ],
    "breathingFocus": "Exhale on the hard part and reset before the next rep.",
    "commonMistakes": [
      "Making variations too hard too soon",
      "Ignoring wrist or shoulder pressure"
    ],
    "safetyNotes": [
      "Wrist and shoulder flags change push-up and plank choices immediately."
    ],
    "recoveryExpectation": "This should be manageable enough to repeat during constrained weeks.",
    "completionMessage": "No-equipment strength completed. The win was consistency and control.",
    "nextSessionNote": "Progress one variable at a time after clean completion."
  },
  {
    "id": "description_limited_equipment",
    "descriptionTemplateId": "description_limited_equipment",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "limited_equipment",
    "appliesToGoalIds": [
      "limited_equipment"
    ],
    "summaryTemplate": "A limited-equipment session that keeps movement intent intact with available tools.",
    "toneVariant": "minimal",
    "sessionIntent": "Build useful training from a small equipment footprint.",
    "plainLanguageSummary": "Use the tools you have without changing the goal.",
    "coachExplanation": "The pattern matters more than the implement when constraints are real.",
    "effortExplanation": "Keep the target effort and adjust exercise choice instead of forcing unavailable equipment.",
    "whyThisMatters": "Constraint-aware programming protects adherence and keeps the plan moving.",
    "howItShouldFeel": "Practical and focused, not compromised.",
    "successCriteria": [
      "Available equipment only",
      "Movement pattern preserved",
      "Pain stable"
    ],
    "scalingDown": "Choose bodyweight or band substitutions.",
    "scalingUp": "Add tempo, reps, or load if equipment allows.",
    "formFocus": [
      "Intent match",
      "Safe setup",
      "Compatible loading"
    ],
    "breathingFocus": "Reset before each set or interval.",
    "commonMistakes": [
      "Replacing the wrong movement pattern",
      "Using equipment that is not actually available"
    ],
    "safetyNotes": [
      "Substitutions still must respect safety limits."
    ],
    "recoveryExpectation": "Recovery should match the equivalent full-equipment session.",
    "completionMessage": "Limited-equipment session completed. The available setup worked.",
    "nextSessionNote": "Keep substitutions that improved fit and safety."
  },
  {
    "id": "description_core_durability",
    "descriptionTemplateId": "description_core_durability",
    "appliesToEntityType": "goal",
    "appliesToEntityId": "core_durability",
    "appliesToGoalIds": [
      "core_durability"
    ],
    "summaryTemplate": "A trunk durability session using anti-extension, anti-rotation, carries, and balance.",
    "toneVariant": "coach_like",
    "sessionIntent": "Improve trunk endurance and position control.",
    "plainLanguageSummary": "Train the trunk to hold useful positions while breathing.",
    "coachExplanation": "Durability comes from repeatable positions, not from holding after the low back, neck, or shoulders take over.",
    "effortExplanation": "Stop sets before posture collapses. Quality beats longer time.",
    "whyThisMatters": "Trunk control supports lifting, boxing, locomotion, and recovery quality.",
    "howItShouldFeel": "Deep trunk work with calm breathing and stable joints.",
    "successCriteria": [
      "Position maintained",
      "Breathing controlled",
      "No back pain increase"
    ],
    "scalingDown": "Shorten holds, lower leverage, or use dead bug and supported variations.",
    "scalingUp": "Add hold time, anti-rotation challenge, or carry load only while breathing stays controlled.",
    "formFocus": [
      "Rib-pelvis stack",
      "Quiet hips",
      "Breathing behind the brace"
    ],
    "breathingFocus": "Do not hold your breath for the entire set.",
    "commonMistakes": [
      "Chasing time after position fails",
      "Letting shoulders collapse"
    ],
    "safetyNotes": [
      "Back caution lowers lever length, hold time, or load."
    ],
    "recoveryExpectation": "This should feel activated, not strained.",
    "completionMessage": "Core durability work logged. Hold quality is the progression signal.",
    "nextSessionNote": "Add seconds only when the same position and breathing are repeatable."
  },
  {
    "id": "description_deload_week",
    "descriptionTemplateId": "description_deload_week",
    "appliesToEntityType": "program",
    "appliesToEntityId": "deload",
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "boxing_support",
      "low_impact_conditioning"
    ],
    "summaryTemplate": "A planned reduced session that keeps patterns alive while lowering fatigue.",
    "toneVariant": "data_driven",
    "sessionIntent": "Reduce fatigue and preserve rhythm.",
    "plainLanguageSummary": "Do less on purpose so the next block can move forward.",
    "coachExplanation": "Deloads maintain skill and tissue exposure while recovery catches up.",
    "effortExplanation": "Effort rating and total volume both stay lower than normal.",
    "whyThisMatters": "Planned reductions lower fatigue and protect future progression.",
    "howItShouldFeel": "Easy-to-moderate, crisp, and unfinished in a good way.",
    "successCriteria": [
      "Volume reduced",
      "Movement patterns maintained",
      "No new pain"
    ],
    "scalingDown": "Use recovery-only if safety flags are active.",
    "scalingUp": "Return to baseline before introducing new progression.",
    "formFocus": [
      "Clean patterning",
      "Low fatigue",
      "No grinders"
    ],
    "breathingFocus": "Keep breath calm between sets.",
    "commonMistakes": [
      "Turning deload into testing week",
      "Adding missed volume back in"
    ],
    "safetyNotes": [
      "Protected workouts stay anchored; support load drops around them."
    ],
    "recoveryExpectation": "Readiness should improve by the end of the reduced exposure.",
    "completionMessage": "Deload work done. The purpose was absorption.",
    "nextSessionNote": "Return to baseline first, then progress."
  },
  {
    "id": "description_readiness_adjusted",
    "descriptionTemplateId": "description_readiness_adjusted",
    "appliesToEntityType": "program",
    "appliesToEntityId": "readiness_adjusted",
    "appliesToGoalIds": [
      "beginner_strength",
      "hypertrophy",
      "zone2_cardio",
      "mobility",
      "recovery"
    ],
    "summaryTemplate": "A readiness-aware session that adjusts dose using pain, sleep, soreness, and energy signals.",
    "toneVariant": "data_driven",
    "sessionIntent": "Match the session to the athlete current state.",
    "plainLanguageSummary": "Check the signals, then train the version that fits today.",
    "coachExplanation": "Missing or poor readiness data lowers confidence and increases caution instead of being treated as safe.",
    "effortExplanation": "Effort is capped when readiness is unknown, pain is active, or soreness is high.",
    "whyThisMatters": "The plan should adapt through the journey instead of restarting or ignoring risk.",
    "howItShouldFeel": "Appropriate for today state, not forced.",
    "successCriteria": [
      "Readiness considered",
      "Safety flags respected",
      "Decision explained"
    ],
    "scalingDown": "Use recovery or lower volume.",
    "scalingUp": "Use normal progression only with stable safety data.",
    "formFocus": [
      "Warm-up response",
      "Movement quality",
      "Symptom trend"
    ],
    "breathingFocus": "Use breathing and warm-up feel to confirm readiness.",
    "commonMistakes": [
      "Treating missing data as safe",
      "Ignoring pain signals"
    ],
    "safetyNotes": [
      "Safety wins over performance goals."
    ],
    "recoveryExpectation": "The session should support the next step, not compromise it.",
    "completionMessage": "State-aware training logged.",
    "nextSessionNote": "Better data improves the next recommendation."
  },
  {
    "id": "description_aerobic_frequency",
    "descriptionTemplateId": "description_aerobic_frequency",
    "appliesToEntityType": "workout_type",
    "appliesToEntityId": "zone2_cardio",
    "appliesToGoalIds": [
      "zone2_cardio",
      "recovery",
      "low_impact_conditioning"
    ],
    "summaryTemplate": "An easy aerobic frequency session that adds consistency without raising intensity.",
    "toneVariant": "minimal",
    "sessionIntent": "Increase aerobic touch points safely.",
    "plainLanguageSummary": "Add another easy session, not another hard one.",
    "coachExplanation": "Aerobic frequency helps the base when each exposure remains low cost.",
    "effortExplanation": "Effort stays 2-4 out of 10 and conversation stays possible.",
    "whyThisMatters": "More easy exposures can support recovery and capacity.",
    "howItShouldFeel": "Light, repeatable, and low-stress.",
    "successCriteria": [
      "Easy effort",
      "Short duration",
      "No symptoms worse"
    ],
    "scalingDown": "Use walking or breathing only.",
    "scalingUp": "Add minutes gradually after frequency is stable.",
    "formFocus": [
      "Relaxed posture",
      "Smooth cadence",
      "Low tension"
    ],
    "breathingFocus": "Stay conversational throughout.",
    "commonMistakes": [
      "Making the extra session intense",
      "Adding frequency before the current easy dose feels routine"
    ],
    "safetyNotes": [
      "Illness caution keeps this recovery-only."
    ],
    "recoveryExpectation": "Should not create meaningful soreness.",
    "completionMessage": "Easy aerobic exposure logged.",
    "nextSessionNote": "Keep frequency easy until it feels normal."
  }
] satisfies DescriptionTemplate[];
