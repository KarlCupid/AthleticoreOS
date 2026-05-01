import {
  createUserWorkoutProfile,
  generatePersonalizedWorkout,
  generateWeeklyWorkoutProgram,
  generateWorkoutForUserProfile,
  recommendNextProgression,
  summarizeWorkoutAnalytics,
  validateGeneratedProgram,
  validatePersonalizedWorkoutSafety,
  validateWorkoutIntelligenceCatalog,
  workoutIntelligenceCatalog,
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
  assert('validation rules seeded', workoutIntelligenceCatalog.validationRules.length >= 10);
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
