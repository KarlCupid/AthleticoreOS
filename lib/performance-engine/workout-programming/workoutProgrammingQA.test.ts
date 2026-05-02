import {
  generatePersonalizedWorkout,
  generateWeeklyWorkoutProgram,
  loadUserWorkoutProfile,
  recommendNextProgression,
  rankExerciseSubstitutions,
  validateGeneratedProgram,
  validateWorkoutDomain,
  workoutProgrammingCatalog,
} from './index.ts';
import type {
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  PrescriptionPayload,
  ProgressionDecisionInput,
  WorkoutCompletionLog,
} from './index.ts';

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

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function exercises(workout: GeneratedWorkout) {
  return workout.blocks.flatMap((block) => block.exercises);
}

function exerciseIds(workout: GeneratedWorkout): string[] {
  return exercises(workout).map((exercise) => exercise.exerciseId);
}

function mainExercises(workout: GeneratedWorkout) {
  return workout.blocks.filter((block) => block.kind === 'main').flatMap((block) => block.exercises);
}

function catalogExercise(id: string) {
  const exercise = workoutProgrammingCatalog.exercises.find((item) => item.id === id);
  if (!exercise) throw new Error(`Missing catalog exercise ${id}`);
  return exercise;
}

function selectedCatalogExercises(workout: GeneratedWorkout) {
  return exerciseIds(workout).map(catalogExercise);
}

function hasAny(workout: GeneratedWorkout, ids: string[]): boolean {
  const selected = new Set(exerciseIds(workout));
  return ids.some((id) => selected.has(id));
}

function hasNone(workout: GeneratedWorkout, ids: string[]): boolean {
  const selected = new Set(exerciseIds(workout));
  return ids.every((id) => !selected.has(id));
}

function noSelectedExerciseMatches(workout: GeneratedWorkout, predicate: (exercise: ReturnType<typeof catalogExercise>) => boolean): boolean {
  return selectedCatalogExercises(workout).every((exercise) => !predicate(exercise));
}

function generated(label: string, input: PersonalizedWorkoutInput, expectedWorkoutTypeId: string | string[]): GeneratedWorkout {
  const workout = generatePersonalizedWorkout(input);
  const expectedTypes = Array.isArray(expectedWorkoutTypeId) ? expectedWorkoutTypeId : [expectedWorkoutTypeId];
  assert(`${label} has expected workout type (${workout.workoutTypeId})`, expectedTypes.includes(workout.workoutTypeId));
  assert(`${label} has selected exercises`, exercises(workout).length > 0 || workout.blocked === true);
  assert(`${label} has complete prescriptions`, workout.blocked === true || hasCompletePrescriptions(workout));
  assert(`${label} has complete description`, hasCompleteDescription(workout));
  assert(`${label} validates`, workout.blocked === true || validateWorkoutDomain(workout).isValid);
  assert(`${label} exposes tracking metrics`, workout.trackingMetricIds.length > 0);
  assert(`${label} exposes decision trace`, (workout.decisionTrace?.length ?? 0) > 0 || workout.blocked === true);
  return workout;
}

function rangeComplete(range: { min?: unknown; max?: unknown; target?: unknown } | undefined): boolean {
  return Boolean(range && (range.target != null || range.min != null || range.max != null));
}

function payloadComplete(payload: PrescriptionPayload): boolean {
  if (payload.kind === 'resistance') {
    return rangeComplete(payload.sets)
      && rangeComplete(payload.repRange as { min?: unknown; max?: unknown; target?: unknown })
      && rangeComplete(payload.RPE)
      && rangeComplete(payload.restSecondsRange)
      && payload.loadGuidance.length > 20
      && payload.effortGuidance.length > 20
      && payload.progressionRuleIds.length > 0;
  }
  if (payload.kind === 'cardio') {
    return rangeComplete(payload.durationMinutes)
      && rangeComplete(payload.RPE)
      && rangeComplete(payload.heartRateZone as { min?: unknown; max?: unknown; target?: unknown })
      && payload.talkTest.length > 20
      && payload.progressionRuleIds.length > 0;
  }
  if (payload.kind === 'interval' || payload.kind === 'conditioning') {
    return rangeComplete(payload.workIntervalSeconds)
      && rangeComplete(payload.restIntervalSeconds)
      && rangeComplete(payload.rounds)
      && rangeComplete(payload.targetIntensity.RPE)
      && payload.scalingOptions.down.length > 10
      && payload.scalingOptions.up.length > 10;
  }
  if (payload.kind === 'mobility') {
    return payload.targetJoints.length > 0
      && payload.rangeOfMotionIntent.length > 20
      && payload.breathing.length > 10
      && payload.painFreeRange;
  }
  if (payload.kind === 'flexibility') {
    return payload.targetTissues.length > 0
      && payload.targetJoints.length > 0
      && rangeComplete(payload.holdTimeSeconds)
      && payload.painFreeRange;
  }
  if (payload.kind === 'balance') {
    return rangeComplete(payload.durationSeconds)
      && payload.complexityProgression.length > 0
      && payload.fallRiskRules.length > 0;
  }
  if (payload.kind === 'power') {
    return rangeComplete(payload.sets)
      && rangeComplete(payload.reps as { min?: unknown; max?: unknown; target?: unknown })
      && rangeComplete(payload.fullRecoverySeconds)
      && payload.lowFatigue
      && payload.eligibilityRestrictions.length > 0;
  }
  return rangeComplete(payload.durationMinutes)
    && rangeComplete(payload.intensityCap)
    && payload.breathingStrategy.length > 10
    && payload.readinessAdjustment.length > 10;
}

function hasCompletePrescriptions(workout: GeneratedWorkout): boolean {
  return exercises(workout).every((exercise) => (
    exercise.prescription.kind === exercise.prescription.payload.kind
    && exercise.trackingMetricIds.length > 0
    && exercise.prescription.targetRpe >= 0
    && payloadComplete(exercise.prescription.payload)
  ));
}

function hasCompleteDescription(workout: GeneratedWorkout): boolean {
  const description = workout.description;
  if (!description) return false;
  const text = [
    description.intro,
    description.effortExplanation,
    description.scalingDown,
    description.scalingUp,
    description.completionMessage,
    description.nextSessionNote,
  ].join(' ').toLowerCase();
  return Boolean(
    description.intro.length > 60
    && description.sessionIntent.length > 20
    && description.plainLanguageSummary.length > 20
    && description.effortExplanation.length > 30
    && description.successCriteria.length >= 3
    && description.safetyNotes.length > 0
    && description.completionMessage.length > 20
    && !['adjust as needed', 'do what feels right', 'workout summary'].some((fragment) => text.includes(fragment))
  );
}

function assertConstraint(label: string, condition: boolean): void {
  assert(`${label} respects scenario constraint`, condition);
}

function assertSubstitutionsUseful(label: string, workout: GeneratedWorkout): void {
  const options = exercises(workout).flatMap((exercise) => exercise.substitutions ?? []);
  assert(`${label} exposes useful substitutions`, options.length > 0 && options.every((option) => (
    option.exerciseId
    && option.name
    && option.rationale.length > 25
    && option.coachingNote
    && option.prescriptionAdjustment?.note
  )));
}

function completionBase(patch: Partial<WorkoutCompletionLog>): WorkoutCompletionLog {
  return {
    workoutId: 'qa-completion',
    completedAt: '2026-05-02T12:00:00.000Z',
    plannedDurationMinutes: 40,
    actualDurationMinutes: 40,
    sessionRpe: 7,
    painScoreBefore: 1,
    painScoreAfter: 1,
    exerciseResults: [
      { exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 24, repsPrescribed: 24, actualRpe: 7, painScore: 1, completedAsPrescribed: true },
    ],
    ...patch,
  };
}

console.log('\n-- workout programming deep QA --');

(() => {
  const beginner = generated('beginner no-equipment 30-minute strength', {
    goalId: 'no_equipment',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    workoutEnvironment: 'home',
  }, 'bodyweight_strength');
  assert('beginner no-equipment selects bodyweight-compatible exercises', selectedCatalogExercises(beginner).every((exercise) => (
    exercise.equipmentIds.includes('bodyweight') || exercise.equipmentIds.includes('mat')
  )));
  assert('beginner no-equipment excludes loaded gym exercises', hasNone(beginner, ['barbell_back_squat', 'trap_bar_deadlift', 'lat_pulldown', 'leg_press']));
  assert('beginner no-equipment exposes scaling options', exercises(beginner).every((exercise) => Boolean(exercise.scalingOptions?.down && exercise.scalingOptions.up)));

  const dumbbellHypertrophy = generated('intermediate dumbbells-only hypertrophy', {
    goalId: 'dumbbell_hypertrophy',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
    workoutEnvironment: 'gym',
  }, 'hypertrophy');
  assert('dumbbell hypertrophy selects dumbbell work', hasAny(dumbbellHypertrophy, ['dumbbell_bench_press', 'one_arm_dumbbell_row', 'goblet_squat']));
  assert('dumbbell hypertrophy excludes barbell-only work', hasNone(dumbbellHypertrophy, ['barbell_back_squat', 'barbell_bench_press', 'barbell_row']));
  assert('dumbbell hypertrophy includes hypertrophy proximity guidance', mainExercises(dumbbellHypertrophy).some((exercise) => (
    exercise.prescription.payload.kind === 'resistance'
    && Boolean(exercise.prescription.payload.RIR)
    && exercise.prescription.payload.progressionRuleIds.some((id) => id.includes('double'))
  )));

  const fullGym = generated('full gym strength', {
    goalId: 'full_gym_strength',
    durationMinutes: 50,
    equipmentIds: ['bodyweight', 'dumbbells', 'barbell', 'rack', 'bench', 'trap_bar', 'lat_pulldown', 'leg_press', 'cable_machine'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
    workoutEnvironment: 'gym',
  }, 'full_body_strength');
  assert('full gym strength uses gym-loadable exercises', selectedCatalogExercises(fullGym).some((exercise) => exercise.loadability === 'high'));
  assert('full gym strength has rest guidance on main work', mainExercises(fullGym).every((exercise) => exercise.prescription.restSeconds >= 60));

  const bikeZone2 = generated('Zone 2 cardio with bike', {
    goalId: 'zone2_cardio',
    durationMinutes: 40,
    equipmentIds: ['bodyweight', 'stationary_bike'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
  }, ['zone2_cardio', 'low_impact_conditioning', 'recovery']);
  assert('bike Zone 2 selects stationary bike', hasAny(bikeZone2, ['stationary_bike_zone2']));
  assert('bike Zone 2 exposes duration and intensity target', mainExercises(bikeZone2).some((exercise) => (
    exercise.prescription.payload.kind === 'cardio'
    && rangeComplete(exercise.prescription.payload.durationMinutes)
    && rangeComplete(exercise.prescription.payload.heartRateZone as { min?: unknown; max?: unknown; target?: unknown })
  )));

  const fallbackZone2 = generated('Zone 2 without cardio equipment fallback', {
    goalId: 'zone2_cardio',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'open_space'],
    experienceLevel: 'beginner',
    readinessBand: 'yellow',
    safetyFlags: ['no_running'],
  }, ['zone2_cardio', 'low_impact_conditioning', 'recovery']);
  assert('Zone 2 fallback avoids machines and running', noSelectedExerciseMatches(fallbackZone2, (exercise) => (
    exercise.equipmentIds.some((id) => ['stationary_bike', 'rowing_machine', 'assault_bike', 'treadmill'].includes(id))
    || exercise.contraindicationFlags.includes('no_running')
  )));

  const lowImpactHiit = generated('low-impact HIIT with no jumping', {
    goalId: 'low_impact_conditioning',
    durationMinutes: 28,
    equipmentIds: ['bodyweight', 'stationary_bike', 'sled', 'battle_rope'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
    safetyFlags: ['no_jumping', 'low_impact_required'],
  }, 'low_impact_conditioning');
  assertConstraint('low-impact HIIT', noSelectedExerciseMatches(lowImpactHiit, (exercise) => (
    exercise.movementPatternIds.includes('jump_land') || exercise.impact === 'high'
  )));

  const mobility = generated('mobility hips and t-spine', {
    goalId: 'mobility',
    durationMinutes: 25,
    equipmentIds: ['bodyweight', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'yellow',
  }, 'mobility');
  assert('mobility includes hip or t-spine work', selectedCatalogExercises(mobility).some((exercise) => (
    exercise.jointsInvolved?.includes('hips') || exercise.movementPatternIds.includes('thoracic_mobility')
  )));
  assert('mobility uses pain-free range prescriptions', mainExercises(mobility).every((exercise) => (
    exercise.prescription.payload.kind !== 'mobility' || exercise.prescription.payload.painFreeRange
  )));

  const recovery = generated('recovery after hard session', {
    goalId: 'recovery',
    durationMinutes: 20,
    equipmentIds: ['bodyweight', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'orange',
    recentWorkoutCompletions: [completionBase({ workoutId: 'hard-session', sessionRpe: 9, actualDurationMinutes: 48 })],
  }, 'recovery');
  assert('recovery stays low effort', mainExercises(recovery).every((exercise) => exercise.prescription.targetRpe <= 4));

  const balance = generated('balance for fall-risk older adult', {
    goalId: 'core_durability',
    durationMinutes: 25,
    equipmentIds: ['bodyweight', 'chair', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'yellow',
    safetyFlags: ['fall_risk'],
  }, ['core_durability', 'recovery']);
  assert('balance session includes balance or supported core work', selectedCatalogExercises(balance).some((exercise) => (
    exercise.movementPatternIds.includes('balance') || exercise.movementPatternIds.includes('anti_rotation')
  )));
  assert('balance fall-risk avoids unstable advanced surfaces', noSelectedExerciseMatches(balance, (exercise) => (
    exercise.technicalComplexity === 'high' || exercise.technicalComplexity === 'coach_required'
  )));

  const power = generated('power for advanced athlete', {
    goalId: 'boxing_support',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'medicine_ball', 'open_space', 'resistance_band'],
    experienceLevel: 'advanced',
    readinessBand: 'green',
    workoutEnvironment: 'gym',
  }, 'boxing_support');
  assert('advanced power uses low-fatigue quality gate', mainExercises(power).some((exercise) => exercise.prescription.payload.kind === 'power' && exercise.prescription.payload.lowFatigue));
})();

(() => {
  const knee = generated('knee caution', {
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    safetyFlags: ['knee_caution'],
    readinessBand: 'green',
  }, 'strength');
  assertConstraint('knee caution', noSelectedExerciseMatches(knee, (exercise) => exercise.contraindicationFlags.includes('knee_caution')));
  const kneeSubstitutions = rankExerciseSubstitutions({
    sourceExerciseId: 'goblet_squat',
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    equipmentIds: ['bodyweight', 'dumbbells'],
    safetyFlagIds: ['knee_caution'],
    experienceLevel: 'beginner',
    limit: 3,
  });
  assert('knee caution ranks useful safer substitutions', kneeSubstitutions[0]?.exerciseId === 'box_squat' && kneeSubstitutions[0].rationale.length > 25 && Boolean(kneeSubstitutions[0].prescriptionAdjustment?.note));

  const back = generated('low-back caution', {
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    safetyFlags: ['back_caution'],
    readinessBand: 'green',
  }, 'strength');
  assertConstraint('low-back caution', noSelectedExerciseMatches(back, (exercise) => exercise.contraindicationFlags.includes('back_caution') || ['high', 'axial', 'shear'].includes(exercise.spineLoading ?? '')));

  const shoulder = generated('shoulder caution', {
    goalId: 'upper_body_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'beginner',
    safetyFlags: ['shoulder_caution'],
    readinessBand: 'green',
  }, ['upper_strength', 'strength', 'recovery']);
  assertConstraint('shoulder caution', noSelectedExerciseMatches(shoulder, (exercise) => exercise.contraindicationFlags.includes('shoulder_caution') || exercise.shoulderDemand === 'high'));

  const wrist = generated('wrist caution', {
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    safetyFlags: ['wrist_caution'],
    readinessBand: 'green',
  }, 'strength');
  assertConstraint('wrist caution', noSelectedExerciseMatches(wrist, (exercise) => exercise.contraindicationFlags.includes('wrist_caution') || (exercise.setupType === 'floor' && exercise.wristDemand === 'high')));

  const noRunning = generated('no running', {
    goalId: 'zone2_cardio',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'track_or_road', 'stationary_bike'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_running'],
    readinessBand: 'green',
  }, 'zone2_cardio');
  assertConstraint('no running', noSelectedExerciseMatches(noRunning, (exercise) => exercise.contraindicationFlags.includes('no_running') || exercise.id.includes('running')));

  const noOverhead = generated('no overhead pressing', {
    goalId: 'upper_body_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_overhead_pressing'],
    readinessBand: 'green',
  }, ['upper_strength', 'strength', 'recovery']);
  assertConstraint('no overhead pressing', noSelectedExerciseMatches(noOverhead, (exercise) => exercise.movementPatternIds.includes('vertical_push')));

  const noFloor = generated('no floor work', {
    goalId: 'core_durability',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band', 'cable_machine'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_floor_work'],
    readinessBand: 'green',
  }, ['core_durability', 'recovery']);
  assertConstraint('no floor work', noSelectedExerciseMatches(noFloor, (exercise) => exercise.setupType === 'floor'));

  const limitedTime = generated('limited time', {
    goalId: 'beginner_strength',
    durationMinutes: 18,
    preferredDurationMinutes: 18,
    availableTimeRange: { maxMinutes: 20 },
    equipmentIds: ['bodyweight', 'dumbbells'],
    experienceLevel: 'beginner',
    safetyFlags: ['time_limited'],
    readinessBand: 'green',
  }, 'strength');
  assert('limited time fits requested window', limitedTime.estimatedDurationMinutes <= 20);

  const poorReadiness = generated('poor readiness', {
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'red',
  }, 'recovery');
  assert('poor readiness routes to recovery', poorReadiness.explanations.some((explanation) => explanation.includes('Red readiness')));

  const redFlag = generatePersonalizedWorkout({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    safetyFlags: ['red_flag_symptoms'],
  });
  assert('red-flag safety blocks workout', redFlag.blocked === true && redFlag.blocks.length === 0 && redFlag.workoutTypeId === 'recovery');

  const disliked = generated('disliked exercise excluded', {
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    dislikedExerciseIds: ['goblet_squat', 'push_up', 'romanian_deadlift'],
    readinessBand: 'green',
  }, 'strength');
  assert('disliked exercise excluded from selections', hasNone(disliked, ['goblet_squat', 'push_up', 'romanian_deadlift']));

  const preferredEquipment = generated('preferred equipment used', {
    goalId: 'dumbbell_hypertrophy',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'barbell'],
    preferredExerciseIds: ['dumbbell_bench_press', 'one_arm_dumbbell_row'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
  }, 'hypertrophy');
  assert('preferred equipment and exercises influence selection', hasAny(preferredEquipment, ['dumbbell_bench_press', 'one_arm_dumbbell_row']));
})();

(() => {
  const painRegression = recommendNextProgression({
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    completionLog: completionBase({
      workoutId: 'pain-increase',
      painScoreBefore: 1,
      painScoreAfter: 5,
      sessionRpe: 8,
      exerciseResults: [
        { exerciseId: 'romanian_deadlift', setsCompleted: 2, setsPrescribed: 3, repsCompleted: 6, repsPrescribed: 8, actualRpe: 8, painScore: 5, completedAsPrescribed: false },
      ],
    }),
  });
  assert('pain increased after workout triggers regression', painRegression.direction === 'regress' && painRegression.safetyFlags.includes('pain_increased_last_session'));

  const hypertrophyProgress = recommendNextProgression({
    workoutTypeId: 'hypertrophy',
    goalId: 'dumbbell_hypertrophy',
    completionLog: completionBase({
      workoutId: 'hypertrophy-double-progress',
      exerciseResults: [
        { exerciseId: 'dumbbell_bench_press', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 12, repRangeMax: 12, actualRpe: 8, actualRir: 2, painScore: 1, completedAsPrescribed: true },
        { exerciseId: 'one_arm_dumbbell_row', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 12, repRangeMax: 12, actualRpe: 8, actualRir: 2, painScore: 1, completedAsPrescribed: true },
      ],
    }),
  });
  assert('successful hypertrophy triggers double progression', hypertrophyProgress.direction === 'progress' && hypertrophyProgress.nextAdjustment.includes('lower end of the rep range'));

  const zone2Progress = recommendNextProgression({
    workoutTypeId: 'zone2_cardio',
    goalId: 'zone2_cardio',
    completionLog: completionBase({
      workoutId: 'zone2-compliant',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      sessionRpe: 3,
      heartRateZoneCompliance: 0.9,
      exerciseResults: [
        { exerciseId: 'stationary_bike_zone2', setsCompleted: 1, durationMinutesCompleted: 30, durationMinutesPrescribed: 30, actualRpe: 3, heartRateZoneCompliance: 0.9, painScore: 0, completedAsPrescribed: true },
      ],
    }),
  });
  assert('Zone 2 compliance triggers duration progression', zone2Progress.direction === 'progress' && zone2Progress.suggestedNextInput?.durationMinutes === 35);

  const failedReps = recommendNextProgression({
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    completionLog: completionBase({
      workoutId: 'failed-reps',
      sessionRpe: 9,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 2, setsPrescribed: 3, repsCompleted: 5, repsPrescribed: 8, actualRpe: 9, painScore: 1, completedAsPrescribed: false },
      ],
    }),
  });
  assert('failed reps trigger repeat or regress', failedReps.direction === 'repeat' || failedReps.direction === 'regress' || failedReps.direction === 'reduceVolume');

  const sorenessDeload: ProgressionDecisionInput = {
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    completionLog: completionBase({
      workoutId: 'sore-current',
      sessionRpe: 9,
      actualDurationMinutes: 32,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 2, setsPrescribed: 3, repsCompleted: 6, repsPrescribed: 8, actualRpe: 9, painScore: 1, completedAsPrescribed: false },
      ],
    }),
    recentWorkoutCompletions: [
      completionBase({ workoutId: 'sore-1', sessionRpe: 9, actualDurationMinutes: 34 }),
      completionBase({ workoutId: 'sore-2', sessionRpe: 8.5, actualDurationMinutes: 35 }),
    ],
  };
  const deload = recommendNextProgression(sorenessDeload);
  assert('high soreness or accumulated fatigue triggers deload', deload.direction === 'deload' && deload.safetyFlags.includes('high_fatigue'));
})();

(() => {
  const protectedProgram = generateWeeklyWorkoutProgram({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'stationary_bike'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    sessionsPerWeek: 3,
    desiredProgramLengthWeeks: 4,
    availableDays: [1, 3, 5, 7],
    protectedWorkouts: [
      { id: 'boxing-practice', label: 'Boxing Practice', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
    ],
  });
  const validation = validateGeneratedProgram(protectedProgram);
  assert('protected workout preserved in weekly program', validation.valid && protectedProgram.sessions.filter((session) => session.protectedAnchor && session.label === 'Boxing Practice').length === 4);
  assert('protected workout is never replaced', protectedProgram.sessions.filter((session) => session.protectedAnchor).every((session) => session.workout === null));
  assert('movement patterns balanced across week', (
    protectedProgram.movementPatternBalance.programTotal.squat >= 1
    && protectedProgram.movementPatternBalance.programTotal.hinge >= 1
    && protectedProgram.movementPatternBalance.programTotal.locomotion >= 1
    && protectedProgram.weeklyVolumeSummary.some((week) => week.workoutTypeCounts.zone2_cardio >= 1)
  ));
})();

(() => {
  const validZone2 = generatePersonalizedWorkout({
    goalId: 'zone2_cardio',
    durationMinutes: 30,
    equipmentIds: ['bodyweight', 'stationary_bike'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
  });
  const invalid = structuredClone(validZone2) as GeneratedWorkout;
  const firstMain = invalid.blocks.find((block) => block.kind === 'main')?.exercises[0];
  if (!firstMain) throw new Error('Expected Zone 2 QA fixture to include a main exercise.');
  firstMain.prescription.durationMinutes = null;
  if (firstMain.prescription.payload.kind === 'cardio') {
    firstMain.prescription.payload.durationMinutes = {};
    firstMain.prescription.payload.heartRateZone = {};
    firstMain.prescription.payload.talkTest = '';
  }
  delete invalid.description;
  invalid.trackingMetricIds = [];
  const result = validateWorkoutDomain(invalid);
  assert('invalid generated workout fails validation', !result.isValid && result.failedRuleIds.includes('cardio_constraints'));
  assert('invalid generated workout reports actionable corrections', result.suggestedCorrections.length > 0 && result.userFacingMessages.length > 0);
})();

async function runSecurityScopedPersistenceSmoke(): Promise<void> {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const rows: Record<string, Record<string, unknown>[]> = {
    user_training_profiles: [{ user_id: 'user-qa', experience_level: 'beginner', preferred_duration_minutes: 30, readiness_band: 'unknown' }],
    user_equipment: [{ user_id: 'user-qa', equipment_type_id: 'bodyweight' }],
    user_safety_flags: [],
    user_exercise_preferences: [],
  };
  const client = {
    from(table: string) {
      const builder = {
        select(...args: unknown[]) {
          calls.push({ table, method: 'select', args });
          return builder;
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: 'eq', args });
          return builder;
        },
        maybeSingle() {
          calls.push({ table, method: 'maybeSingle', args: [] });
          return Promise.resolve({ data: rows[table]?.[0] ?? null, error: null });
        },
        then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
          return Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  await loadUserWorkoutProfile('user-qa', { client });
  const scopedTables = ['user_training_profiles', 'user_equipment', 'user_safety_flags', 'user_exercise_preferences'];
  assert('security-sensitive persistence assumptions stay user scoped in tests', scopedTables.every((table) => (
    calls.some((call) => call.table === table && call.method === 'eq' && call.args[0] === 'user_id' && call.args[1] === 'user-qa')
  )));
}

runSecurityScopedPersistenceSmoke()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
