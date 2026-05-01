import {
  createUserWorkoutProfile,
  generateSingleSessionWorkout,
  generatePersonalizedWorkout,
  generateWeeklyWorkoutProgram,
  generateWorkoutDescription,
  generateWorkoutForUserProfile,
  recommendNextProgression,
  rankExerciseSubstitutions,
  summarizeWorkoutAnalytics,
  validateGeneratedProgram,
  validatePersonalizedWorkoutSafety,
  validateWorkoutIntelligenceCatalog,
  workoutProgrammingCatalog,
  workoutIntelligenceCatalog,
  workoutValidationRuleIds,
} from './index.ts';
import type { WorkoutCompletionLog } from './index.ts';

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

const requiredExerciseIntelligenceIds = [
  'goblet_squat',
  'bodyweight_squat',
  'box_squat',
  'romanian_deadlift',
  'glute_bridge',
  'push_up',
  'incline_push_up',
  'dumbbell_bench_press',
  'overhead_press',
  'one_arm_dumbbell_row',
  'lat_pulldown',
  'dead_bug',
  'front_plank',
  'side_plank',
  'pallof_press',
  'stationary_bike_zone2',
  'incline_walk',
  'rower_zone2',
  'worlds_greatest_stretch',
  'thoracic_open_book',
  'half_kneeling_hip_flexor',
  'band_pull_apart',
  'band_external_rotation',
  'sled_push',
  'battle_rope_wave',
];

function hasSpecificText(items: string[]): boolean {
  const generic = ['Start easier than you think.', 'Stop on sharp pain.', 'Keep reps clean and repeatable.'];
  return items.length >= 3 && items.every((item) => item.length >= 20 && !generic.includes(item));
}

const requiredDescriptionTemplateIds = [
  'description_beginner_full_body_strength',
  'description_intermediate_strength',
  'description_upper_body_hypertrophy',
  'description_lower_body_hypertrophy',
  'description_zone2_cardio',
  'description_threshold_cardio',
  'description_low_impact_hiit',
  'description_metabolic_conditioning',
  'description_hip_tspine_mobility',
  'description_recovery',
  'description_balance_older_adult',
  'description_power_session',
  'description_boxing_support',
  'description_return_to_training',
  'description_no_equipment_strength',
];

const supportedToneVariants = [
  'beginner_friendly',
  'coach_like',
  'clinical',
  'motivational',
  'minimal',
  'detailed',
  'athletic',
  'rehab_informed',
  'data_driven',
];

function hasCompleteDescriptionTemplate(template: (typeof workoutIntelligenceCatalog.descriptionTemplates)[number]): boolean {
  const generic = ['adjust as needed', 'do what feels right', 'listen to your body', 'workout summary'];
  const text = [
    template.summaryTemplate,
    template.sessionIntent,
    template.plainLanguageSummary,
    template.coachExplanation,
    template.effortExplanation,
    template.whyThisMatters,
    template.howItShouldFeel,
    template.scalingDown,
    template.scalingUp,
    template.breathingFocus,
    template.recoveryExpectation,
    template.completionMessage,
    template.nextSessionNote,
    ...(template.successCriteria ?? []),
    ...(template.formFocus ?? []),
    ...(template.commonMistakes ?? []),
    ...(template.safetyNotes ?? []),
  ].filter(Boolean).join(' ').toLowerCase();

  return Boolean(
    template.descriptionTemplateId
    && template.appliesToEntityType
    && template.appliesToEntityId
    && template.toneVariant
    && supportedToneVariants.includes(template.toneVariant)
    && template.sessionIntent
    && template.plainLanguageSummary
    && template.coachExplanation
    && template.effortExplanation
    && template.whyThisMatters
    && template.howItShouldFeel
    && (template.successCriteria?.length ?? 0) >= 3
    && (template.formFocus?.length ?? 0) >= 2
    && (template.commonMistakes?.length ?? 0) >= 2
    && (template.safetyNotes?.length ?? 0) >= 1
    && !generic.some((fragment) => text.includes(fragment))
  );
}

function rankedSubstitutions(input: Parameters<typeof rankExerciseSubstitutions>[0]) {
  return rankExerciseSubstitutions({
    catalog: workoutProgrammingCatalog,
    intelligence: workoutIntelligenceCatalog,
    limit: 4,
    ...input,
  });
}

function exerciseIds(workout: ReturnType<typeof generatePersonalizedWorkout>): string[] {
  return workout.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));
}

function averageMainRpe(workout: ReturnType<typeof generatePersonalizedWorkout>): number {
  const rpes = workout.blocks
    .filter((block) => block.kind === 'main')
    .flatMap((block) => block.exercises.map((exercise) => exercise.prescription.targetRpe));
  return rpes.reduce((sum, rpe) => sum + rpe, 0) / Math.max(1, rpes.length);
}

function totalMainSets(workout: ReturnType<typeof generatePersonalizedWorkout>): number {
  return workout.blocks
    .filter((block) => block.kind === 'main')
    .flatMap((block) => block.exercises)
    .reduce((sum, exercise) => sum + (exercise.prescription.sets ?? 0), 0);
}

console.log('\n-- workout programming remaining phases --');

(() => {
  const validation = validateWorkoutIntelligenceCatalog();
  assert(validation.valid ? 'intelligence catalog validates' : validation.errors.join('\n'), validation.valid);
  const allRules = [
    ...workoutIntelligenceCatalog.progressionRules,
    ...workoutIntelligenceCatalog.regressionRules,
    ...workoutIntelligenceCatalog.deloadRules,
  ];
  assert('20 specific progression rules seeded', workoutIntelligenceCatalog.progressionRules.length >= 20);
  assert('20 specific regression rules seeded', workoutIntelligenceCatalog.regressionRules.length >= 20);
  assert('10 specific deload rules seeded', workoutIntelligenceCatalog.deloadRules.length >= 10);
  assert('rules use hand-authored ids', allRules.every((rule) => !/^(progression_rule|regression_rule|deload_rule)_\d+$/.test(rule.id)));
  assert('rules include structured trigger conditions', allRules.every((rule) => (rule.triggerConditions?.length ?? 0) > 0));
  assert('rules include workout type scope', allRules.every((rule) => (rule.appliesToWorkoutTypeIds?.length ?? 0) > 0));
  assert('rules include experience scope', allRules.every((rule) => (rule.appliesToExperienceLevels?.length ?? 0) > 0));
  assert('rules include required tracking metrics', allRules.every((rule) => (rule.requiredTrackingMetricIds?.length ?? 0) > 0));
  assert('rules include user-facing messages', allRules.every((rule) => (rule.userMessage?.length ?? 0) > 20));
  assert('rules include coach notes', allRules.every((rule) => (rule.coachNotes?.length ?? 0) > 0));
  assert('progression rules include max progression rates', workoutIntelligenceCatalog.progressionRules.every((rule) => Boolean(rule.maxProgressionRate)));
  assert('25 substitution rules seeded', workoutIntelligenceCatalog.substitutionRules.length >= 25);
  assert('substitution rules use authored replacement fields', workoutIntelligenceCatalog.substitutionRules.every((rule) => (
    Boolean(rule.sourceExerciseId)
    && (rule.sourceMovementPatternIds?.length ?? 0) > 0
    && (rule.acceptableReplacementIds?.length ?? 0) > 0
    && (rule.replacementPriority?.length ?? 0) > 0
    && Boolean(rule.reason && rule.reason.length > 30)
    && Boolean(rule.prescriptionAdjustment?.note)
    && Boolean(rule.coachingNote && rule.coachingNote.length > 30)
  )));
  assert('25 safety flags seeded', workoutIntelligenceCatalog.safetyFlags.length >= 25);
  assert('required exercises have coaching cue sets', requiredExerciseIntelligenceIds.every((id) => workoutIntelligenceCatalog.coachingCueSets.some((set) => set.exerciseId === id)));
  assert('required exercises have common mistake sets', requiredExerciseIntelligenceIds.every((id) => workoutIntelligenceCatalog.commonMistakeSets.some((set) => set.exerciseId === id)));
  assert('coaching cue sets are exercise-specific', workoutIntelligenceCatalog.coachingCueSets.every((set) => hasSpecificText(set.cues)));
  assert('common mistake sets are exercise-specific', workoutIntelligenceCatalog.commonMistakeSets.every((set) => hasSpecificText(set.mistakes)));
  assert('cue and mistake ids are not generated placeholders', [
    ...workoutIntelligenceCatalog.coachingCueSets.map((set) => set.id),
    ...workoutIntelligenceCatalog.commonMistakeSets.map((set) => set.id),
  ].every((id) => !/^cue_set_\d+$|^mistake_set_\d+$/.test(id)));
  assert('20 rich description templates seeded', workoutIntelligenceCatalog.descriptionTemplates.length >= 20);
  assert('description templates include full coaching language', workoutIntelligenceCatalog.descriptionTemplates.every((template) => (
    Boolean(template.sessionIntent)
    && Boolean(template.plainLanguageSummary)
    && Boolean(template.coachExplanation)
    && Boolean(template.whyThisMatters)
    && (template.successCriteria?.length ?? 0) >= 3
    && (template.formFocus?.length ?? 0) > 0
  )));
  assert('required coaching description templates are seeded', requiredDescriptionTemplateIds.every((id) => (
    workoutIntelligenceCatalog.descriptionTemplates.some((template) => template.descriptionTemplateId === id)
  )));
  assert('description templates are scoped and non-generic', workoutIntelligenceCatalog.descriptionTemplates.every(hasCompleteDescriptionTemplate));
  assert('all requested tone variants are represented', supportedToneVariants.every((tone) => (
    workoutIntelligenceCatalog.descriptionTemplates.some((template) => template.toneVariant === tone)
  )));
  assert('25 domain validation rules seeded', workoutIntelligenceCatalog.validationRules.length >= 25);
  assert('all executable domain validation rules have catalog entries', workoutValidationRuleIds().every((id) => (
    workoutIntelligenceCatalog.validationRules.some((rule) => rule.id === id)
  )));
})();

(() => {
  const dumbbellSquat = rankedSubstitutions({
    sourceExerciseId: 'barbell_back_squat',
    workoutTypeId: 'strength',
    goalId: 'full_gym_strength',
    equipmentIds: ['dumbbells'],
    safetyFlagIds: ['equipment_limited'],
    experienceLevel: 'intermediate',
  });
  const kneeSquat = rankedSubstitutions({
    sourceExerciseId: 'goblet_squat',
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    equipmentIds: ['bodyweight', 'dumbbells'],
    safetyFlagIds: ['knee_caution'],
    experienceLevel: 'beginner',
  });
  const backHinge = rankedSubstitutions({
    sourceExerciseId: 'romanian_deadlift',
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    equipmentIds: ['bodyweight', 'dumbbells'],
    safetyFlagIds: ['back_caution', 'poor_readiness'],
    experienceLevel: 'beginner',
  });
  const noJump = rankedSubstitutions({
    sourceExerciseId: 'box_jump',
    workoutTypeId: 'power',
    goalId: 'boxing_support',
    equipmentIds: ['bodyweight', 'stationary_bike'],
    safetyFlagIds: ['no_jumping', 'low_impact_required'],
    experienceLevel: 'beginner',
  });
  const noOverhead = rankedSubstitutions({
    sourceExerciseId: 'overhead_press',
    workoutTypeId: 'upper_strength',
    goalId: 'upper_body_strength',
    equipmentIds: ['dumbbells', 'resistance_band'],
    safetyFlagIds: ['no_overhead_pressing', 'shoulder_caution'],
    experienceLevel: 'beginner',
  });
  const noFloor = rankedSubstitutions({
    sourceExerciseId: 'front_plank',
    workoutTypeId: 'core_durability',
    goalId: 'core_durability',
    equipmentIds: ['bodyweight', 'resistance_band'],
    safetyFlagIds: ['no_floor_work', 'wrist_caution'],
    experienceLevel: 'beginner',
  });
  const disliked = rankedSubstitutions({
    sourceExerciseId: 'goblet_squat',
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    equipmentIds: ['bodyweight', 'dumbbells'],
    safetyFlagIds: ['knee_caution'],
    experienceLevel: 'beginner',
    dislikedExerciseIds: ['box_squat'],
  });

  assert('dumbbell-only back squat substitution picks goblet squat first', dumbbellSquat[0]?.exerciseId === 'goblet_squat');
  assert('knee-caution goblet squat substitution prioritizes box squat', kneeSquat[0]?.exerciseId === 'box_squat');
  assert('back-caution hinge substitution reduces spinal demand', ['glute_bridge', 'hip_hinge_dowel'].includes(backHinge[0]?.exerciseId ?? ''));
  assert('no-jumping power substitution removes jump patterns', noJump.length > 0 && noJump.every((option) => {
    const exercise = workoutProgrammingCatalog.exercises.find((candidate) => candidate.id === option.exerciseId);
    return !exercise?.movementPatternIds.includes('jump_land') && exercise?.impact !== 'moderate' && exercise?.impact !== 'high';
  }));
  assert('no-overhead pressing substitution avoids vertical push', noOverhead.length > 0 && noOverhead.every((option) => {
    const exercise = workoutProgrammingCatalog.exercises.find((candidate) => candidate.id === option.exerciseId);
    return !exercise?.movementPatternIds.includes('vertical_push');
  }));
  assert('no-floor core substitution can select standing anti-rotation', noFloor[0]?.exerciseId === 'pallof_press');
  assert('disliked substitute is removed from ranking', disliked.every((option) => option.exerciseId !== 'box_squat'));
  assert('substitution options explain and adjust prescriptions', [
    dumbbellSquat[0],
    kneeSquat[0],
    backHinge[0],
    noJump[0],
  ].every((option) => Boolean(option?.rationale && option.rationale.length > 30 && option.prescriptionAdjustment?.note && option.coachingNote)));
})();

(() => {
  const workout = generateSingleSessionWorkout({
    goalId: 'zone2_cardio',
    durationMinutes: 35,
    equipmentIds: ['stationary_bike'],
    experienceLevel: 'beginner',
  });
  const coach = generateWorkoutDescription(workout, { toneVariant: 'coach_like' });
  const minimal = generateWorkoutDescription(workout, { toneVariant: 'minimal' });
  const clinical = generateWorkoutDescription(workout, { toneVariant: 'clinical' });

  assert('description service returns display-ready sections', Boolean(
    coach.intro
    && coach.effortExplanation
    && coach.safetyNotes.length
    && coach.successCriteria.length
    && coach.scalingDown
    && coach.scalingUp
    && coach.completionMessage
    && coach.nextSessionNote
  ));
  assert('description tone variants change copy', coach.intro !== minimal.intro && clinical.intro !== minimal.intro);
  assert('Zone 2 description uses conversational effort language', coach.effortExplanation.includes('conversational effort'));
})();

(() => {
  const workout = generatePersonalizedWorkout({
    goalId: 'low_impact_conditioning',
    durationMinutes: 30,
    equipmentIds: ['stationary_bike', 'battle_rope'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_jumping'],
    readinessBand: 'yellow',
  });
  const safety = validatePersonalizedWorkoutSafety(workout);
  const exercises = workout.blocks.flatMap((block) => block.exercises);

  assert('no-jumping personalized workout validates safety', safety.valid);
  assert('no-jumping personalized workout excludes jump patterns', exercises.every((exercise) => !exercise.movementPatternIds.includes('jump_land')));
  assert('personalized workout includes substitutions', exercises.every((exercise) => (exercise.substitutions?.length ?? 0) > 0));
  assert('personalized workout includes scaling options', exercises.every((exercise) => Boolean(exercise.scalingOptions)));
})();

(() => {
  const blocked = generatePersonalizedWorkout({
    goalId: 'beginner_strength',
    durationMinutes: 40,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
    safetyFlags: ['acute_chest_pain'],
    readinessBand: 'red',
  });

  assert('red flag blocks personalized workout', blocked.blocked === true);
  assert('blocked workout explains safety wins', blocked.explanations.some((explanation) => explanation.includes('Safety wins')));
})();

(() => {
  const profileA = createUserWorkoutProfile({
    userId: 'a',
    equipmentIds: ['bodyweight'],
    preferredDurationMinutes: 30,
    dislikedExerciseIds: ['push_up'],
    readinessBand: 'unknown',
  });
  const profileB = createUserWorkoutProfile({
    userId: 'b',
    equipmentIds: ['dumbbells', 'bench', 'resistance_band'],
    preferredDurationMinutes: 45,
    readinessBand: 'green',
  });
  const a = generateWorkoutForUserProfile(profileA, { goalId: 'beginner_strength' });
  const b = generateWorkoutForUserProfile(profileB, { goalId: 'beginner_strength' });
  const aExerciseIds = a.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));
  const bExerciseIds = b.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));

  assert('profile dislikes affect exercise selection', !aExerciseIds.includes('push_up'));
  assert('two users can receive different workouts for same goal', aExerciseIds.join(',') !== bExerciseIds.join(','));
  assert('preferred duration affects generated duration', b.estimatedDurationMinutes > a.estimatedDurationMinutes);
})();

(() => {
  const bodyweightUser = generatePersonalizedWorkout({
    userId: 'phase11-bodyweight',
    goalId: 'beginner_strength',
    durationMinutes: 40,
    equipmentIds: ['bodyweight', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    workoutEnvironment: 'home',
  });
  const gymUser = generatePersonalizedWorkout({
    userId: 'phase11-gym',
    goalId: 'beginner_strength',
    durationMinutes: 40,
    equipmentIds: ['dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    workoutEnvironment: 'gym',
  });
  const green = generatePersonalizedWorkout({
    userId: 'phase11-green',
    goalId: 'beginner_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
  });
  const orange = generatePersonalizedWorkout({
    userId: 'phase11-orange',
    goalId: 'beginner_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'orange',
  });
  const kneePain = generatePersonalizedWorkout({
    userId: 'phase11-knee',
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells'],
    experienceLevel: 'beginner',
    readinessBand: 'yellow',
    painFlags: ['knee_caution'],
  });
  const disliked = generatePersonalizedWorkout({
    userId: 'phase11-dislike',
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    dislikedExerciseIds: ['goblet_squat', 'push_up'],
    likedExerciseIds: ['box_squat'],
  });
  const poorSleep = generatePersonalizedWorkout({
    userId: 'phase11-sleep',
    goalId: 'beginner_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
    sleepQuality: 3,
  });
  const sore = generatePersonalizedWorkout({
    userId: 'phase11-sore',
    goalId: 'beginner_strength',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'green',
    sorenessLevel: 8,
  });
  const red = generatePersonalizedWorkout({
    userId: 'phase11-red',
    goalId: 'full_gym_strength',
    durationMinutes: 45,
    equipmentIds: ['dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'red',
  });
  const unknown = generatePersonalizedWorkout({
    userId: 'phase11-unknown',
    goalId: 'full_gym_strength',
    durationMinutes: 45,
    equipmentIds: ['dumbbells', 'bench', 'resistance_band'],
    experienceLevel: 'intermediate',
    readinessBand: 'unknown',
  });

  const bodyweightIds = exerciseIds(bodyweightUser);
  const gymIds = exerciseIds(gymUser);
  const kneeExercises = kneePain.blocks.flatMap((block) => block.exercises);
  const kneeSubstitutionText = kneeExercises
    .flatMap((exercise) => exercise.substitutions ?? [])
    .map((option) => option.rationale.toLowerCase())
    .join(' ');
  const bodyweightLoadEquipment = new Set(['dumbbells', 'kettlebell', 'barbell', 'cable_machine', 'leg_press', 'lat_pulldown']);

  assert('phase 11 same goal different equipment changes selections', bodyweightIds.join(',') !== gymIds.join(','));
  assert('phase 11 equipment-specific selections stay compatible', bodyweightUser.blocks.flatMap((block) => block.exercises).every((exercise) => (
    !exercise.equipmentIds.some((id) => bodyweightLoadEquipment.has(id))
  )));
  assert('phase 11 orange readiness preserves primary goal when safe', orange.goalId === 'beginner_strength' && orange.workoutTypeId !== 'recovery');
  assert('phase 11 orange readiness reduces intensity', averageMainRpe(orange) < averageMainRpe(green));
  assert('phase 11 pain flag triggers safer substitutions', kneePain.safetyFlags.includes('knee_caution') && kneeSubstitutionText.includes('knee'));
  assert('phase 11 disliked exercises are excluded', !exerciseIds(disliked).some((id) => ['goblet_squat', 'push_up'].includes(id)));
  assert('phase 11 poor sleep reduces intensity', averageMainRpe(poorSleep) < averageMainRpe(green));
  assert('phase 11 high soreness reduces volume', totalMainSets(sore) < totalMainSets(green));
  assert('phase 11 red readiness routes hard training to recovery', red.workoutTypeId === 'recovery' && red.explanations.some((explanation) => explanation.includes('Red readiness')));
  assert('phase 11 unknown readiness stays conservative but usable', !unknown.blocked && unknown.blocks.length > 0 && averageMainRpe(unknown) <= averageMainRpe(green));
  assert('phase 11 readiness changes are explainable', [orange, poorSleep, sore, red, unknown].every((workout) => (
    workout.decisionTrace?.some((entry) => entry.step === 'personalize_readiness' && entry.reason.length > 40)
  )));
})();

const goodCompletion: WorkoutCompletionLog = {
  workoutId: 'workout-1',
  completedAt: '2026-05-01T12:00:00.000Z',
  plannedDurationMinutes: 40,
  actualDurationMinutes: 39,
  sessionRpe: 6,
  painScoreBefore: 1,
  painScoreAfter: 1,
  exerciseResults: [
    { exerciseId: 'goblet_squat', setsCompleted: 3, repsCompleted: 24, actualRpe: 6, painScore: 1, completedAsPrescribed: true },
    { exerciseId: 'push_up', setsCompleted: 3, repsCompleted: 20, actualRpe: 7, painScore: 1, completedAsPrescribed: true },
  ],
};

const painfulCompletion: WorkoutCompletionLog = {
  workoutId: 'workout-2',
  completedAt: '2026-05-02T12:00:00.000Z',
  plannedDurationMinutes: 40,
  actualDurationMinutes: 28,
  sessionRpe: 9,
  painScoreBefore: 2,
  painScoreAfter: 5,
  exerciseResults: [
    { exerciseId: 'romanian_deadlift', setsCompleted: 1, repsCompleted: 6, actualRpe: 9, painScore: 5, completedAsPrescribed: false },
  ],
};

(() => {
  const progress = recommendNextProgression(goodCompletion);
  const regress = recommendNextProgression(painfulCompletion);

  assert('successful workout progresses modestly', progress.direction === 'progress');
  assert('painful workout regresses', regress.direction === 'regress');
  assert('painful workout emits safety flag', regress.safetyFlags.includes('pain_increased_last_session'));
})();

(() => {
  const program = generateWeeklyWorkoutProgram({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    weekCount: 4,
    sessionsPerWeek: 3,
    protectedWorkouts: [
      { id: 'boxing-practice', label: 'Boxing Practice', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
    ],
  });
  const validation = validateGeneratedProgram(program);

  assert('generated program validates', validation.valid);
  assert('program spans four weeks', program.weekCount === 4);
  assert('protected workout appears every week', program.sessions.filter((session) => session.protectedAnchor).length === 4);
  assert('protected workouts are never replaced with generated workouts', program.sessions.filter((session) => session.protectedAnchor).every((session) => session.workout === null));
})();

(() => {
  const analytics = summarizeWorkoutAnalytics({
    plannedWorkoutCount: 3,
    completions: [goodCompletion, painfulCompletion],
  });

  assert('analytics computes adherence', analytics.adherenceRate > 0.6 && analytics.adherenceRate < 0.7);
  assert('analytics tracks completed sets', analytics.totalCompletedSets === 7);
  assert('analytics detects worsening pain', analytics.painTrend === 'worsening');
  assert('analytics quality score is bounded', analytics.recommendationQualityScore >= 0 && analytics.recommendationQualityScore <= 100);
  assert('analytics warns on pain trend', analytics.warnings.some((warning) => warning.includes('Pain')));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
