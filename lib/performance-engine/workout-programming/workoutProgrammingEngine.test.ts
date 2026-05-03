import {
  buildWorkoutProgrammingSeedRows,
  EXERCISE_SELECTION_SCORE_WEIGHTS,
  generateSingleSessionWorkout,
  queryWorkoutExercises,
  rankExerciseSubstitutions,
  validateWorkoutDomain,
  validateGeneratedWorkout,
  validateWorkoutProgrammingCatalog,
  workoutProgrammingCatalog,
} from './index.ts';
import type { Exercise, ExerciseSelectionScoreTrace, GenerateSingleWorkoutInput, GeneratedExercisePrescription, GeneratedWorkout } from './index.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function generated(input: GenerateSingleWorkoutInput): GeneratedWorkout {
  const workout = generateSingleSessionWorkout(input);
  const validation = validateGeneratedWorkout(workout);
  assert(`${input.goalId} generated workout validates`, validation.valid);
  if (!validation.valid) {
    console.error(validation.errors.join('\n'));
  }
  return workout;
}

function allExercises(workout: GeneratedWorkout) {
  return workout.blocks.flatMap((block) => block.exercises);
}

function mainExercises(workout: GeneratedWorkout) {
  return workout.blocks.filter((block) => block.kind === 'main').flatMap((block) => block.exercises);
}

function cloneWorkout(workout: GeneratedWorkout): GeneratedWorkout {
  return structuredClone(workout) as GeneratedWorkout;
}

function exerciseSource(id: string): Exercise {
  const source = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === id);
  if (!source) throw new Error(`Missing exercise fixture ${id}`);
  return source;
}

function scoreTrace(workout: GeneratedWorkout, exerciseId: string, slotId?: string): ExerciseSelectionScoreTrace {
  const traceItem = (workout.exerciseSelectionTrace ?? []).find((trace) => (
    trace.exerciseId === exerciseId && (!slotId || trace.slotId === slotId)
  ));
  if (!traceItem) throw new Error(`Missing score trace for ${exerciseId}${slotId ? ` in ${slotId}` : ''}.`);
  return traceItem;
}

function replaceFirstMainExercise(workout: GeneratedWorkout, exerciseId: string, patch?: Partial<GeneratedExercisePrescription>): GeneratedWorkout {
  const copy = cloneWorkout(workout);
  const target = copy.blocks.find((block) => block.kind === 'main')?.exercises[0];
  const source = exerciseSource(exerciseId);
  if (!target) throw new Error('Workout fixture has no main exercise.');
  Object.assign(target, {
    exerciseId: source.id,
    name: source.name,
    movementPatternIds: source.movementPatternIds,
    primaryMuscleIds: source.primaryMuscleIds,
    equipmentIds: source.equipmentIds,
    trackingMetricIds: source.trackingMetricIds,
    ...patch,
  });
  copy.equipmentIds = Array.from(new Set([...copy.equipmentIds, ...source.equipmentIds]));
  copy.trackingMetricIds = Array.from(new Set([...copy.trackingMetricIds, ...source.trackingMetricIds]));
  return copy;
}

function assertInvalidCase(label: string, workout: GeneratedWorkout, expectedRuleId: string): void {
  const validation = validateWorkoutDomain(workout);
  assert(`${label} fails validation`, !validation.isValid && !validation.valid);
  assert(`${label} fails ${expectedRuleId}`, validation.failedRuleIds.includes(expectedRuleId));
  assert(`${label} has actionable correction`, validation.suggestedCorrections.some((correction) => correction.length > 20));
  assert(`${label} has clear user-facing message`, validation.userFacingMessages.some((message) => message.length > 20 && !message.toLowerCase().includes('danger')));
  assert(`${label} records decision trace`, validation.decisionTrace.some((trace) => trace.ruleId === expectedRuleId && trace.status === 'failed'));
}

const genericOntologyFragments = ['adjust as needed', 'use good form', 'do what feels right'];
const genericDescriptionFragments = ['adjust as needed', 'do what feels right', 'listen to your body', 'workout summary'];

function hasCompleteGeneratedDescription(workout: GeneratedWorkout): boolean {
  const description = workout.description;
  if (!description) return false;
  const text = [
    description.intro,
    description.effortExplanation,
    description.scalingDown,
    description.scalingUp,
    description.completionMessage,
    description.nextSessionNote,
    ...description.safetyNotes,
    ...description.successCriteria,
  ].join(' ').toLowerCase();

  return Boolean(
    description.descriptionTemplateId
    && description.intro.length > 80
    && description.sessionIntent
    && description.plainLanguageSummary
    && description.coachExplanation
    && description.effortExplanation
    && description.whyThisMatters
    && description.howItShouldFeel
    && description.safetyNotes.length > 0
    && description.successCriteria.length >= 3
    && description.scalingDown
    && description.scalingUp
    && description.completionMessage
    && description.nextSessionNote
    && !genericDescriptionFragments.some((fragment) => text.includes(fragment))
  );
}

console.log('\n-- workout programming engine --');

(() => {
  const validation = validateWorkoutProgrammingCatalog();
  assert(
    validation.valid ? 'catalog validates' : validation.errors.join('\n'),
    validation.valid,
  );
  assert('15 workout types seeded', workoutProgrammingCatalog.workoutTypes.length >= 15);
  assert('15 training goals seeded', workoutProgrammingCatalog.trainingGoals.length >= 15);
  assert('15 workout formats seeded', workoutProgrammingCatalog.workoutFormats.length >= 15);
  assert('20 movement patterns seeded', workoutProgrammingCatalog.movementPatterns.length >= 20);
  assert('25 muscle groups seeded', workoutProgrammingCatalog.muscleGroups.length >= 25);
  assert('25 equipment types seeded', workoutProgrammingCatalog.equipmentTypes.length >= 25);
  assert('50 exercises seeded', workoutProgrammingCatalog.exercises.length >= 50);
  assert('12 prescription templates seeded', workoutProgrammingCatalog.prescriptionTemplates.length >= 12);
  assert('12 session templates seeded', workoutProgrammingCatalog.sessionTemplates.length >= 12);
  assert('25 tracking metrics seeded', workoutProgrammingCatalog.trackingMetrics.length >= 25);
  assert('15 assessment metrics seeded', workoutProgrammingCatalog.assessmentMetrics.length >= 15);
  assert('every prescription template has a typed payload', workoutProgrammingCatalog.prescriptionTemplates.every((template) => (
    template.kind === template.payload.kind
  )));
  assert('all major prescription payload kinds are seeded', (
    ['resistance', 'cardio', 'interval', 'mobility', 'flexibility', 'balance', 'recovery', 'power', 'conditioning']
      .every((kind) => workoutProgrammingCatalog.prescriptionTemplates.some((template) => template.payload.kind === kind))
  ));
  const seedRows = buildWorkoutProgrammingSeedRows();
  assert('seed loader emits exercise rows', seedRows.programming_exercises.length === workoutProgrammingCatalog.exercises.length);
  assert('seed loader emits enriched exercise ontology columns', seedRows.programming_exercises.every((exercise) => (
    Boolean(exercise.short_name)
    && Boolean(exercise.category)
    && exercise.sub_pattern_ids.length > 0
    && exercise.joints_involved.length > 0
    && exercise.plane_of_motion.length > 0
    && exercise.setup_instructions.length > 0
    && exercise.execution_instructions.length > 0
    && exercise.safety_notes.length > 0
    && Object.keys(exercise.default_prescription_ranges).length > 0
  )));
  assert('seed loader emits exercise relationship rows', (
    seedRows.exercise_progressions.length > 0
    && seedRows.exercise_regressions.length > 0
    && seedRows.exercise_substitution_links.length > 0
  ));
  assert('seed loader emits typed prescription payloads', seedRows.prescription_templates.every((template) => (
    Boolean(template.kind)
    && Boolean(template.prescription_payload)
  )));
  assert('seed loader emits movement-slot rows', seedRows.session_template_movement_slots.length > 0);
})();

(() => {
  const ids = new Set(workoutProgrammingCatalog.exercises.map((exercise) => exercise.id));
  const validRelationIds = workoutProgrammingCatalog.exercises.every((exercise) => (
    [...(exercise.regressionExerciseIds ?? []), ...(exercise.progressionExerciseIds ?? []), ...(exercise.substitutionExerciseIds ?? [])]
      .every((id) => ids.has(id))
  ));
  const completeOntology = workoutProgrammingCatalog.exercises.every((exercise) => {
    const text = [
      ...(exercise.setupInstructions ?? []),
      ...(exercise.executionInstructions ?? []),
      ...(exercise.breathingInstructions ?? []),
      ...(exercise.safetyNotes ?? []),
    ].join(' ').toLowerCase();
    return (
      Boolean(exercise.shortName)
      && Boolean(exercise.category)
      && exercise.movementPatternIds.length > 0
      && exercise.primaryMuscleIds.length > 0
      && exercise.equipmentIds.length > 0
      && (exercise.equipmentRequiredIds?.length ?? 0) > 0
      && (exercise.subPatternIds?.length ?? 0) > 0
      && (exercise.jointsInvolved?.length ?? 0) > 0
      && Boolean(exercise.planeOfMotion)
      && Boolean(exercise.setupType)
      && ['low', 'moderate', 'high'].includes(exercise.technicalComplexity ?? '')
      && ['low', 'moderate', 'high'].includes(exercise.loadability ?? '')
      && ['low', 'moderate', 'high'].includes(exercise.fatigueCost ?? '')
      && Boolean(exercise.spineLoading)
      && Boolean(exercise.kneeDemand)
      && Boolean(exercise.hipDemand)
      && Boolean(exercise.shoulderDemand)
      && Boolean(exercise.wristDemand)
      && Boolean(exercise.ankleDemand)
      && Boolean(exercise.balanceDemand)
      && Boolean(exercise.cardioDemand)
      && (exercise.spaceRequired?.length ?? 0) > 0
      && exercise.homeFriendly != null
      && exercise.gymFriendly != null
      && exercise.beginnerFriendly != null
      && (exercise.setupInstructions?.length ?? 0) > 0
      && (exercise.executionInstructions?.length ?? 0) > 0
      && (exercise.breathingInstructions?.length ?? 0) > 0
      && (exercise.safetyNotes?.length ?? 0) > 0
      && exercise.trackingMetricIds.length > 0
      && Boolean(exercise.defaultPrescriptionRanges)
      && Object.keys(exercise.defaultPrescriptionRanges ?? {}).length > 0
      && !genericOntologyFragments.some((fragment) => text.includes(fragment))
    );
  });

  const stationaryBike = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'stationary_bike_zone2');
  const romanianDeadlift = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'romanian_deadlift');
  const gobletSquat = workoutProgrammingCatalog.exercises.find((exercise) => exercise.id === 'goblet_squat');
  const mobilityDrills = workoutProgrammingCatalog.exercises.filter((exercise) => exercise.category === 'mobility' || exercise.category === 'flexibility');

  assert('all exercises have complete ontology fields', completeOntology);
  assert('exercise ontology relationships reference existing exercises', validRelationIds);
  assert('goblet squat has sensible scaling relationships', Boolean(
    gobletSquat?.regressionExerciseIds?.includes('box_squat')
    && gobletSquat.regressionExerciseIds.includes('bodyweight_squat')
    && gobletSquat.progressionExerciseIds?.includes('trap_bar_deadlift'),
  ));
  assert('romanian deadlift carries hinge and back-safety ontology', Boolean(
    romanianDeadlift?.contraindicationFlags.includes('back_caution')
    && romanianDeadlift.spineLoading === 'high'
    && romanianDeadlift.hipDemand === 'high'
    && romanianDeadlift.regressionExerciseIds?.includes('hip_hinge_dowel'),
  ));
  assert('stationary bike supports zone 2 tracking ontology', Boolean(
    stationaryBike?.trackingMetricIds.includes('heart_rate_zone')
    && stationaryBike.trackingMetricIds.includes('heart_rate_avg')
    && stationaryBike.trackingMetricIds.includes('duration_minutes')
    && stationaryBike.defaultPrescriptionRanges?.heartRateZone
    && stationaryBike.defaultPrescriptionRanges?.talkTest,
  ));
  assert('mobility drills include target joints and range intent', mobilityDrills.every((exercise) => (
    (exercise.defaultPrescriptionRanges?.targetJoints?.length ?? 0) > 0
    && Boolean(exercise.defaultPrescriptionRanges?.rangeOfMotionIntent)
  )));
})();

(() => {
  const templates = workoutProgrammingCatalog.prescriptionTemplates;
  const strength = templates.find((template) => template.id === 'strength_beginner');
  const hypertrophy = templates.find((template) => template.id === 'hypertrophy_straight');
  const zone2 = templates.find((template) => template.id === 'zone2_steady');
  const hiit = templates.find((template) => template.id === 'hiit_interval');
  const mobility = templates.find((template) => template.id === 'mobility_hold');
  const flexibility = templates.find((template) => template.id === 'flexibility_hold');
  const balance = templates.find((template) => template.id === 'core_control');
  const recovery = templates.find((template) => template.id === 'recovery_easy');
  const power = templates.find((template) => template.id === 'power_quality');
  const conditioning = templates.find((template) => template.id === 'conditioning_interval');

  assert('strength payload includes rest and load guidance', Boolean(
    strength?.payload.kind === 'resistance'
    && strength.payload.restSecondsRange.min
    && strength.payload.loadGuidance
    && strength.payload.progressionRuleIds.length,
  ));
  assert('hypertrophy payload includes RIR and double progression', Boolean(
    hypertrophy?.payload.kind === 'resistance'
    && hypertrophy.payload.RIR
    && hypertrophy.payload.progressionRuleIds.some((id) => id.includes('double')),
  ));
  assert('Zone 2 payload includes duration and intensity target', Boolean(
    zone2?.payload.kind === 'cardio'
    && zone2.payload.durationMinutes
    && zone2.payload.heartRateZone
    && zone2.payload.talkTest,
  ));
  assert('HIIT payload includes work rest rounds and intensity', Boolean(
    hiit?.payload.kind === 'interval'
    && hiit.payload.workIntervalSeconds
    && hiit.payload.restIntervalSeconds
    && hiit.payload.rounds
    && hiit.payload.targetIntensity.RPE,
  ));
  assert('mobility payload includes target joints and end-range control', Boolean(
    mobility?.payload.kind === 'mobility'
    && mobility.payload.targetJoints.length
    && mobility.payload.endRangeControl,
  ));
  assert('flexibility payload includes tissues and hold time', Boolean(
    flexibility?.payload.kind === 'flexibility'
    && flexibility.payload.targetTissues.length
    && flexibility.payload.holdTimeSeconds,
  ));
  assert('balance payload includes fall-risk rules', Boolean(
    balance?.payload.kind === 'balance'
    && balance.payload.fallRiskRules.length
    && balance.payload.complexityProgression.length,
  ));
  assert('recovery payload caps intensity below hard', Boolean(
    recovery?.payload.kind === 'recovery'
    && (recovery.payload.intensityCap.max ?? 10) <= 3,
  ));
  assert('power payload requires full recovery and low fatigue', Boolean(
    power?.payload.kind === 'power'
    && power.payload.lowFatigue
    && (power.payload.fullRecoverySeconds.min ?? 0) >= 90,
  ));
  assert('conditioning payload includes repeatable interval controls', Boolean(
    conditioning?.payload.kind === 'conditioning'
    && conditioning.payload.workIntervalSeconds
    && conditioning.payload.restIntervalSeconds
    && conditioning.payload.rounds
    && conditioning.payload.scalingOptions.down,
  ));
})();

(() => {
  const rows = queryWorkoutExercises({
    movementPatternIds: ['squat'],
    equipmentIds: ['bodyweight'],
    excludedSafetyFlags: ['knee_caution'],
    experienceLevel: 'beginner',
  });

  assert('exercise query returns bodyweight-compatible squats', rows.some((exercise) => exercise.id === 'box_squat'));
  assert('exercise query filters knee caution exercises', rows.every((exercise) => !exercise.contraindicationFlags.includes('knee_caution')));
})();

(() => {
  const scenarios: GenerateSingleWorkoutInput[] = [
    { goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner' },
    { goalId: 'hypertrophy', durationMinutes: 45, equipmentIds: ['dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner' },
    { goalId: 'zone2_cardio', durationMinutes: 35, equipmentIds: ['stationary_bike'], experienceLevel: 'beginner' },
    { goalId: 'mobility', durationMinutes: 25, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' },
    { goalId: 'recovery', durationMinutes: 20, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' },
    { goalId: 'limited_equipment', durationMinutes: 35, equipmentIds: ['dumbbells', 'resistance_band'], experienceLevel: 'beginner' },
  ];

  for (const scenario of scenarios) {
    const workout = generated(scenario);
    assert(`${scenario.goalId} includes warmup`, workout.blocks.some((block) => block.kind === 'warmup'));
    assert(`${scenario.goalId} includes main block`, workout.blocks.some((block) => block.kind === 'main'));
    assert(`${scenario.goalId} includes cooldown`, workout.blocks.some((block) => block.kind === 'cooldown'));
    assert(`${scenario.goalId} duration fits`, workout.estimatedDurationMinutes <= scenario.durationMinutes * 1.1);
    assert(`${scenario.goalId} has complete prescriptions`, allExercises(workout).every((exercise) => (
      exercise.prescription.targetRpe > 0
      && exercise.prescription.restSeconds >= 0
      && (
        exercise.prescription.sets !== null
        || exercise.prescription.durationSeconds !== null
        || exercise.prescription.durationMinutes !== null
      )
    )));
    assert(`${scenario.goalId} includes generated coaching description`, hasCompleteGeneratedDescription(workout));
  }
})();

(() => {
  const strength = generated({ goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner' });
  const hypertrophy = generated({ goalId: 'hypertrophy', durationMinutes: 45, equipmentIds: ['dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner' });
  const zone2 = generated({ goalId: 'zone2_cardio', durationMinutes: 35, equipmentIds: ['stationary_bike'], experienceLevel: 'beginner' });
  const mobility = generated({ goalId: 'mobility', durationMinutes: 25, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' });
  const recovery = generated({ goalId: 'recovery', durationMinutes: 20, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' });
  const conditioning = generated({ goalId: 'low_impact_conditioning', durationMinutes: 30, equipmentIds: ['stationary_bike', 'battle_rope'], experienceLevel: 'beginner' });
  const power = generated({ goalId: 'boxing_support', durationMinutes: 40, equipmentIds: ['bodyweight', 'resistance_band', 'dumbbells'], experienceLevel: 'beginner' });
  const balance = generated({ goalId: 'core_durability', durationMinutes: 30, equipmentIds: ['bodyweight', 'mat', 'resistance_band'], experienceLevel: 'beginner' });

  assert('generated strength exposes resistance payload with rest guidance', mainExercises(strength).every((exercise) => (
    exercise.prescription.payload.kind === 'resistance'
    && Boolean(exercise.prescription.payload.restSecondsRange)
  )));
  assert('generated hypertrophy exposes RIR and double-progression payload', mainExercises(hypertrophy).every((exercise) => (
    exercise.prescription.payload.kind === 'resistance'
    && Boolean(exercise.prescription.payload.RIR)
    && exercise.prescription.payload.progressionRuleIds.some((id) => id.includes('double'))
  )));
  assert('generated Zone 2 exposes cardio duration and talk-test payload', mainExercises(zone2).every((exercise) => (
    exercise.prescription.payload.kind === 'cardio'
    && Boolean(exercise.prescription.payload.durationMinutes)
    && Boolean(exercise.prescription.payload.heartRateZone)
    && Boolean(exercise.prescription.payload.talkTest)
  )));
  assert('generated mobility exposes target joint payload', mainExercises(mobility).every((exercise) => (
    exercise.prescription.payload.kind === 'mobility'
    && exercise.prescription.payload.targetJoints.length > 0
  )));
  assert('generated recovery stays easy', mainExercises(recovery).every((exercise) => (
    exercise.prescription.payload.kind === 'recovery'
    && exercise.prescription.targetRpe <= 3
  )));
  assert('generated conditioning exposes work rest rounds and intensity', mainExercises(conditioning).every((exercise) => (
    exercise.prescription.payload.kind === 'conditioning'
    && Boolean(exercise.prescription.payload.workIntervalSeconds)
    && Boolean(exercise.prescription.payload.restIntervalSeconds)
    && Boolean(exercise.prescription.payload.rounds)
    && Boolean(exercise.prescription.payload.targetIntensity.RPE)
  )));
  assert('generated power exposes low-fatigue quality gate', mainExercises(power).every((exercise) => (
    exercise.prescription.payload.kind === 'power'
    && exercise.prescription.payload.lowFatigue
    && exercise.prescription.restSeconds >= 90
  )));
  assert('generated balance exposes fall-risk controls', mainExercises(balance).some((exercise) => (
    exercise.prescription.payload.kind === 'balance'
    && exercise.prescription.payload.fallRiskRules.length > 0
  )));
  assert('generated descriptions are complete for eight workout goals', [
    strength,
    hypertrophy,
    zone2,
    mobility,
    recovery,
    conditioning,
    power,
    balance,
  ].every(hasCompleteGeneratedDescription));
  assert('strength description includes reserve and rest guidance', Boolean(
    strength.description?.effortExplanation.includes('two good reps in reserve')
    && strength.description.effortExplanation.includes('Rest long enough'),
  ));
  assert('Zone 2 description includes talk-test guidance', Boolean(
    zone2.description?.effortExplanation.includes('conversational effort')
    && zone2.description.effortExplanation.includes('without gasping'),
  ));
  assert('mobility description includes pain-free range guidance', Boolean(
    mobility.description?.effortExplanation.includes('pain-free range')
    && mobility.description.effortExplanation.includes('not forcing depth'),
  ));
})();

(() => {
  const strength = generated({ goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner' });
  const hypertrophy = generated({ goalId: 'hypertrophy', durationMinutes: 45, equipmentIds: ['dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner' });
  const zone2 = generated({ goalId: 'zone2_cardio', durationMinutes: 35, equipmentIds: ['stationary_bike'], experienceLevel: 'beginner' });
  const mobility = generated({ goalId: 'mobility', durationMinutes: 25, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' });
  const recovery = generated({ goalId: 'recovery', durationMinutes: 20, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' });
  const conditioning = generated({ goalId: 'low_impact_conditioning', durationMinutes: 30, equipmentIds: ['stationary_bike', 'battle_rope'], experienceLevel: 'beginner' });
  const power = generated({ goalId: 'boxing_support', durationMinutes: 40, equipmentIds: ['bodyweight', 'resistance_band', 'dumbbells', 'medicine_ball'], experienceLevel: 'beginner' });
  const balance = generated({ goalId: 'core_durability', durationMinutes: 30, equipmentIds: ['bodyweight', 'mat', 'resistance_band'], experienceLevel: 'beginner' });

  assertInvalidCase(
    'advanced plyometrics for beginner',
    replaceFirstMainExercise(power, 'box_jump'),
    'experience_level_compatibility',
  );

  const olympicAmrap = replaceFirstMainExercise(strength, 'kettlebell_swing', { name: 'Olympic Clean' });
  olympicAmrap.formatId = 'amrap';
  assertInvalidCase('Olympic lift inside fatigue-based AMRAP', olympicAmrap, 'fatigue_management');

  const lowBackCaution = replaceFirstMainExercise(strength, 'trap_bar_deadlift');
  lowBackCaution.safetyFlags = ['back_caution'];
  assertInvalidCase('heavy spinal loading with low-back caution', lowBackCaution, 'pain_flag_compatibility');

  const hiitRecovery = cloneWorkout(conditioning);
  hiitRecovery.workoutTypeId = 'recovery';
  assertInvalidCase('HIIT labeled as recovery', hiitRecovery, 'recovery_session_constraints');

  const zone2MissingTarget = cloneWorkout(zone2);
  for (const exercise of mainExercises(zone2MissingTarget)) {
    const payload = exercise.prescription.payload;
    if (payload.kind === 'cardio') {
      delete (payload as Partial<typeof payload>).durationMinutes;
      delete (payload as Partial<typeof payload>).heartRateZone;
    }
  }
  assertInvalidCase('Zone 2 without duration or intensity target', zone2MissingTarget, 'cardio_constraints');

  const strengthNoRest = cloneWorkout(strength);
  for (const exercise of mainExercises(strengthNoRest)) {
    exercise.prescription.restSeconds = 0;
    if (exercise.prescription.payload.kind === 'resistance') {
      delete (exercise.prescription.payload as Partial<typeof exercise.prescription.payload>).restSecondsRange;
    }
  }
  assertInvalidCase('strength sets without rest guidance', strengthNoRest, 'rest_guidance_completeness');

  const mobilityNoTarget = cloneWorkout(mobility);
  for (const exercise of mainExercises(mobilityNoTarget)) {
    if (exercise.prescription.payload.kind === 'mobility') {
      exercise.prescription.payload.targetJoints = [];
    }
  }
  assertInvalidCase('mobility without target joint', mobilityNoTarget, 'mobility_constraints');

  const powerShortRest = cloneWorkout(power);
  for (const exercise of mainExercises(powerShortRest)) {
    exercise.prescription.restSeconds = 30;
    if (exercise.prescription.payload.kind === 'power') {
      exercise.prescription.payload.lowFatigue = false;
      exercise.prescription.payload.fullRecoverySeconds = { min: 30, max: 60, target: 45 };
    }
  }
  assertInvalidCase('power work with short rest and high fatigue', powerShortRest, 'power_session_constraints');

  const hypertrophyNoEffort = cloneWorkout(hypertrophy);
  for (const exercise of mainExercises(hypertrophyNoEffort)) {
    if (exercise.prescription.payload.kind === 'resistance') {
      delete (exercise.prescription.payload as Partial<typeof exercise.prescription.payload>).RIR;
      delete (exercise.prescription.payload as Partial<typeof exercise.prescription.payload>).RPE;
      exercise.prescription.payload.effortGuidance = '';
    }
  }
  assertInvalidCase('hypertrophy without RIR/RPE/proximity guidance', hypertrophyNoEffort, 'strength_training_constraints');

  const fallRiskBalance = cloneWorkout(balance);
  fallRiskBalance.safetyFlags = ['balance_concern'];
  for (const exercise of mainExercises(fallRiskBalance)) {
    if (exercise.prescription.payload.kind === 'balance') {
      exercise.prescription.payload.surface = 'unstable';
      exercise.prescription.payload.visualInput = 'eyes_closed';
    }
  }
  assertInvalidCase('balance fall-risk user with unstable surface too early', fallRiskBalance, 'balance_training_constraints');

  const noJumping = replaceFirstMainExercise(power, 'box_jump');
  noJumping.safetyFlags = ['no_jumping'];
  assertInvalidCase('no-jumping user receiving jump/land pattern', noJumping, 'safety_flag_compatibility');

  const running = replaceFirstMainExercise(zone2, 'easy_walk', {
    name: 'Track Run',
    equipmentIds: ['track_or_road'],
  });
  running.safetyFlags = ['no_running'];
  running.equipmentIds = ['track_or_road'];
  assertInvalidCase('no-running user receiving running', running, 'safety_flag_compatibility');

  const shoulderCaution = replaceFirstMainExercise(strength, 'overhead_press');
  shoulderCaution.safetyFlags = ['shoulder_caution'];
  assertInvalidCase('shoulder-caution user receiving aggressive overhead pressing', shoulderCaution, 'pain_flag_compatibility');

  const wristCaution = replaceFirstMainExercise(strength, 'bear_crawl', { substitutions: [] });
  wristCaution.safetyFlags = ['wrist_caution'];
  assertInvalidCase('wrist-caution user receiving loaded wrist floor work without alternative', wristCaution, 'pain_flag_compatibility');

  assert('domain validation returns rich success shape for valid workout', Boolean(
    validateWorkoutDomain(recovery).isValid
    && validateWorkoutDomain(recovery).warnings
    && validateWorkoutDomain(recovery).suggestedCorrections
    && validateWorkoutDomain(recovery).userFacingMessages
    && validateWorkoutDomain(recovery).decisionTrace.length >= 25
  ));
})();

(() => {
  const noEquipment = generated({
    goalId: 'no_equipment',
    durationMinutes: 30,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
  });
  assert(
    'no-equipment workout only selects bodyweight-compatible exercises',
    allExercises(noEquipment).every((exercise) => (
      exercise.equipmentIds.includes('bodyweight')
      || exercise.equipmentIds.every((id) => ['mat', 'open_space', 'track_or_road'].includes(id))
    )),
  );
})();

(() => {
  const noJumping = generated({
    goalId: 'low_impact_conditioning',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'stationary_bike', 'battle_rope'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_jumping'],
  });
  assert(
    'no-jumping safety removes jump/land patterns',
    allExercises(noJumping).every((exercise) => !exercise.movementPatternIds.includes('jump_land')),
  );
})();

(() => {
  const scenarios: Array<{ label: string; input: GenerateSingleWorkoutInput; check: (workout: GeneratedWorkout) => boolean }> = [
    {
      label: 'no-equipment strength uses bodyweight-compatible scored choices',
      input: { goalId: 'no_equipment', durationMinutes: 30, equipmentIds: ['bodyweight'], experienceLevel: 'beginner' },
      check: (workout) => allExercises(workout).every((exercise) => exercise.equipmentIds.includes('bodyweight')),
    },
    {
      label: 'dumbbell hypertrophy keeps typed hypertrophy prescriptions',
      input: { goalId: 'dumbbell_hypertrophy', durationMinutes: 45, equipmentIds: ['dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner' },
      check: (workout) => mainExercises(workout).every((exercise) => exercise.prescription.payload.kind === 'resistance' && exercise.prescription.payload.RIR),
    },
    {
      label: 'knee caution avoids knee-contraindicated selections',
      input: { goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner', safetyFlags: ['knee_caution'] },
      check: (workout) => allExercises(workout).every((exercise) => !exerciseSource(exercise.exerciseId).contraindicationFlags.includes('knee_caution')),
    },
    {
      label: 'low-back caution avoids high spinal-load selections',
      input: { goalId: 'beginner_strength', durationMinutes: 40, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner', safetyFlags: ['back_caution'] },
      check: (workout) => allExercises(workout).every((exercise) => {
        const source = exerciseSource(exercise.exerciseId);
        return !source.contraindicationFlags.includes('back_caution') && source.spineLoading !== 'high';
      }),
    },
    {
      label: 'no jumping keeps low-impact conditioning grounded',
      input: { goalId: 'low_impact_conditioning', durationMinutes: 30, equipmentIds: ['bodyweight', 'stationary_bike', 'battle_rope'], experienceLevel: 'beginner', safetyFlags: ['no_jumping', 'low_impact_required'] },
      check: (workout) => allExercises(workout).every((exercise) => !exercise.movementPatternIds.includes('jump_land') && exerciseSource(exercise.exerciseId).impact !== 'high'),
    },
    {
      label: 'no running keeps Zone 2 non-running or recovery paced',
      input: { goalId: 'zone2_cardio', durationMinutes: 30, equipmentIds: ['bodyweight', 'stationary_bike'], experienceLevel: 'beginner', safetyFlags: ['no_running'] },
      check: (workout) => mainExercises(workout).every((exercise) => !exercise.exerciseId.includes('running')),
    },
    {
      label: 'no overhead pressing avoids vertical push',
      input: { goalId: 'upper_body_strength', durationMinutes: 35, equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'], experienceLevel: 'beginner', safetyFlags: ['no_overhead_pressing', 'shoulder_caution'] },
      check: (workout) => allExercises(workout).every((exercise) => !exercise.movementPatternIds.includes('vertical_push')),
    },
    {
      label: 'no floor work uses standing or supported core alternatives',
      input: { goalId: 'core_durability', durationMinutes: 30, equipmentIds: ['bodyweight', 'resistance_band'], experienceLevel: 'beginner', safetyFlags: ['no_floor_work'] },
      check: (workout) => allExercises(workout).every((exercise) => exerciseSource(exercise.exerciseId).setupType !== 'floor'),
    },
    {
      label: 'poor readiness falls back to recovery instead of throwing',
      input: { goalId: 'beginner_strength', durationMinutes: 25, equipmentIds: ['bodyweight'], experienceLevel: 'beginner', safetyFlags: ['poor_readiness'] },
      check: (workout) => workout.workoutTypeId === 'recovery' && workout.goalId === 'recovery',
    },
    {
      label: 'disliked exercise is excluded from scored selections',
      input: { goalId: 'beginner_strength', durationMinutes: 35, equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'], experienceLevel: 'beginner', dislikedExerciseIds: ['push_up'] },
      check: (workout) => allExercises(workout).every((exercise) => exercise.exerciseId !== 'push_up'),
    },
  ];

  for (const scenario of scenarios) {
    const workout = generated(scenario.input);
    assert(scenario.label, scenario.check(workout));
    assert(`${scenario.label} returns decision trace`, (workout.decisionTrace?.length ?? 0) > 0);
    assert(`${scenario.label} returns validation result`, workout.validation?.isValid === true);
    assert(`${scenario.label} returns training goal label`, Boolean(workout.trainingGoalLabel));
    assert(`${scenario.label} returns prescriptions and descriptions`, Boolean(workout.prescriptions?.length && workout.descriptions?.length));
    assert(`${scenario.label} returns substitutions and scaling`, Boolean((workout.substitutions?.length ?? 0) > 0 && workout.scalingOptions?.down));
    assert(`${scenario.label} returns tracking metrics`, Boolean(workout.trackingMetrics?.length));
  }
})();

(() => {
  assert('exercise scoring weights are exported and safety-dominant', (
    EXERCISE_SELECTION_SCORE_WEIGHTS.dislikedExerciseHardExclude < -500
    && Math.abs(EXERCISE_SELECTION_SCORE_WEIGHTS.jointDemandPenalty) > EXERCISE_SELECTION_SCORE_WEIGHTS.preferredExercise
    && EXERCISE_SELECTION_SCORE_WEIGHTS.workoutTypeMatch > EXERCISE_SELECTION_SCORE_WEIGHTS.preferredExercise
  ));

  const kneeCaution = generated({
    goalId: 'beginner_strength',
    durationMinutes: 40,
    equipmentIds: ['bodyweight', 'dumbbells', 'plyo_box', 'resistance_band'],
    experienceLevel: 'beginner',
    safetyFlags: ['knee_caution'],
    preferredExerciseIds: ['goblet_squat'],
  });
  const selectedSquat = mainExercises(kneeCaution).find((exercise) => exercise.movementPatternIds.includes('squat'));
  const gobletTrace = scoreTrace(kneeCaution, 'goblet_squat');
  const selectedSquatTrace = scoreTrace(kneeCaution, selectedSquat!.exerciseId, selectedSquat!.scoreTrace?.slotId);
  assert('safer exercise outranks risky exercise with pain flag', Boolean(selectedSquat && selectedSquat.exerciseId !== 'goblet_squat' && selectedSquatTrace.totalScore > gobletTrace.totalScore));
  assert('preference cannot override safety exclusion', gobletTrace.finalDecision === 'excluded' && gobletTrace.excludedReasons.some((reason) => reason.toLowerCase().includes('safety hard mismatch')));

  const preferredSafe = generated({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'],
    experienceLevel: 'beginner',
    preferredExerciseIds: ['goblet_squat'],
  });
  assert('preferred exercise wins when safe', mainExercises(preferredSafe).some((exercise) => exercise.exerciseId === 'goblet_squat' && exercise.scoreTrace?.preferenceAdjustment === EXERCISE_SELECTION_SCORE_WEIGHTS.preferredExercise));

  const disliked = generated({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'],
    experienceLevel: 'beginner',
    dislikedExerciseIds: ['goblet_squat'],
  });
  const dislikedTrace = scoreTrace(disliked, 'goblet_squat');
  assert('disliked exercise is excluded or heavily penalized', mainExercises(disliked).every((exercise) => exercise.exerciseId !== 'goblet_squat') && dislikedTrace.preferenceAdjustment <= EXERCISE_SELECTION_SCORE_WEIGHTS.dislikedExerciseHardExclude);

  const noEquipment = generated({
    goalId: 'no_equipment',
    durationMinutes: 30,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
  });
  const equipmentTrace = scoreTrace(noEquipment, 'goblet_squat');
  assert('equipment mismatch excludes exercise', !equipmentTrace.equipmentMatch && equipmentTrace.finalDecision === 'excluded' && equipmentTrace.excludedReasons.some((reason) => reason.includes('Equipment hard mismatch')));

  const beginner = generated({
    goalId: 'no_equipment',
    durationMinutes: 30,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
  });
  const burpeeTrace = scoreTrace(beginner, 'burpee');
  assert('beginner does not receive advanced movement', burpeeTrace.finalDecision === 'excluded' && !burpeeTrace.experienceMatch && allExercises(beginner).every((exercise) => exercise.exerciseId !== 'burpee'));

  const green = generated({
    goalId: 'full_gym_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'barbell', 'squat_rack', 'dumbbells', 'bench', 'lat_pulldown'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
  });
  const orange = generated({
    goalId: 'full_gym_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'barbell', 'squat_rack', 'dumbbells', 'bench', 'lat_pulldown'],
    experienceLevel: 'intermediate',
    readinessBand: 'orange',
  });
  const greenTrapBar = scoreTrace(green, 'trap_bar_deadlift');
  const orangeTrapBar = scoreTrace(orange, 'trap_bar_deadlift');
  assert('low readiness reduces high-fatigue selection', orangeTrapBar.fatigueCostPenalty < greenTrapBar.fatigueCostPenalty && orangeTrapBar.totalScore < greenTrapBar.totalScore);

  assert('decision trace explains final choice', mainExercises(preferredSafe).every((exercise) => (
    exercise.scoreTrace?.finalDecision === 'selected'
    && (exercise.scoreTrace.includedReasons.length > 0 || exercise.scoreTrace.scoreBreakdown.movementPatternMatch != null)
    && preferredSafe.decisionTrace?.some((entry) => entry.step === 'score_movement_slot' && entry.selectedId === exercise.exerciseId)
  )));

  const substitutions = rankExerciseSubstitutions({
    sourceExerciseId: 'goblet_squat',
    movementPatternIds: ['squat'],
    primaryMuscleIds: ['quads', 'glutes'],
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    equipmentIds: ['bodyweight', 'dumbbells', 'plyo_box'],
    safetyFlagIds: ['knee_caution'],
    experienceLevel: 'beginner',
    limit: 3,
  });
  assert('substitution trace explains replacement', Boolean(
    substitutions[0]?.scoreTrace?.finalDecision === 'substitution_selected'
    && substitutions[0].scoreTrace.includedReasons.length > 0
    && substitutions[0].scoreTrace.safetyFlagsApplied.includes('knee_caution')
    && substitutions[0].rationale.length > 30,
  ));

  const tracedWorkout = generated({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'],
    experienceLevel: 'beginner',
  });
  assert('generated workout exposes grouped scoring trace', Boolean(
    tracedWorkout.generationTrace?.selectedTemplateTrace
    && tracedWorkout.generationTrace.selectedPrescriptionTrace?.length
    && tracedWorkout.generationTrace.movementSlotTrace?.length
    && tracedWorkout.generationTrace.exerciseSelectionTrace?.length
    && tracedWorkout.generationTrace.substitutionTrace?.length
    && tracedWorkout.generationTrace.validationTrace?.length
  ));
})();

(() => {
  let blocked = false;
  try {
    generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 40,
      equipmentIds: ['bodyweight'],
      experienceLevel: 'beginner',
      safetyFlags: ['red_flag_symptoms'],
    });
  } catch {
    blocked = true;
  }
  assert('red-flag symptoms block workout generation', blocked);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
