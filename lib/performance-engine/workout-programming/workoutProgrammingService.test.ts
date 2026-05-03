import {
  getWorkoutDescription,
  getWorkoutProgrammingCatalog,
  completeGeneratedWorkoutSession,
  generateGeneratedWorkoutSessionForUser,
  generatePreviewWorkout,
  generateWeeklyProgramForUser,
  generateWorkoutForUser,
  logWorkoutCompletion,
  substituteExercise,
  validateWorkout,
} from './workoutProgrammingService.ts';
import { workoutProgrammingServiceFixtures } from './workoutProgrammingServiceFixtures.ts';
import type { WorkoutCompletionLog } from './types.ts';

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

interface CallRecord {
  table: string;
  method: string;
  args: unknown[];
}

function terminal<T>(value: T) {
  const promise = Promise.resolve(value);
  return {
    select(..._args: unknown[]) {
      return {
        single() {
          return promise;
        },
      };
    },
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
}

function createMockSupabase() {
  const calls: CallRecord[] = [];
  const rows: Record<string, Record<string, unknown>[]> = {
    user_training_profiles: [{
      user_id: 'user-1',
      experience_level: 'intermediate',
      preferred_duration_minutes: 42,
      readiness_band: 'green',
    }],
    user_equipment: [
      { user_id: 'user-1', equipment_type_id: 'bodyweight' },
      { user_id: 'user-1', equipment_type_id: 'dumbbells' },
      { user_id: 'user-1', equipment_type_id: 'bench' },
    ],
    user_safety_flags: [],
    user_exercise_preferences: [{ user_id: 'user-1', exercise_id: 'push_up', preference: 'dislike' }],
  };

  const client = {
    from(table: string) {
      const state = { operation: 'select' };
      const builder = {
        select(...args: unknown[]) {
          calls.push({ table, method: 'select', args });
          state.operation = 'select';
          return builder;
        },
        insert(...args: unknown[]) {
          calls.push({ table, method: 'insert', args });
          return terminal({ data: { id: `${table}-id` }, error: null });
        },
        delete(...args: unknown[]) {
          calls.push({ table, method: 'delete', args });
          state.operation = 'delete';
          return builder;
        },
        upsert(...args: unknown[]) {
          calls.push({ table, method: 'upsert', args });
          return Promise.resolve({ data: null, error: null });
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: 'eq', args });
          if (state.operation === 'delete') return Promise.resolve({ data: null, error: null });
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

  return { client, calls };
}

function insertedPayload(calls: CallRecord[], table: string): unknown {
  return calls.find((call) => call.table === table && call.method === 'insert')?.args[0];
}

async function run() {
  console.log('\n-- workout programming service --');

  const catalog = await getWorkoutProgrammingCatalog();
  assert('service catalog exposes static fallback', catalog.exercises.length > 0 && catalog.prescriptionTemplates.length > 0);

  const fixtureEntries = Object.entries(workoutProgrammingServiceFixtures);
  const previews = await Promise.all(fixtureEntries.map(async ([name, fixture]) => ({
    name,
    workout: await generatePreviewWorkout(fixture),
  })));
  assert('all example fixtures generate workouts', previews.length === 8 && previews.every(({ workout }) => workout.schemaVersion === 'generated-workout-v1'));
  assert('fixture previews include descriptions', previews.every(({ workout }) => Boolean(workout.description?.intro && workout.userFacingSummary)));
  assert('fixture previews validate', previews.every(({ workout }) => workout.validation?.isValid === true));
  assert('fixture previews expose decision traces', previews.every(({ workout }) => (workout.decisionTrace?.length ?? 0) > 0));

  const bodyweightPreview = previews.find(({ name }) => name === 'beginnerBodyweightStrength')!.workout;
  const validation = await validateWorkout(bodyweightPreview);
  const description = getWorkoutDescription(bodyweightPreview, 'minimal');
  const substitutions = await substituteExercise(bodyweightPreview, 'goblet_squat', {
    equipmentIds: ['bodyweight', 'dumbbells'],
    safetyFlagIds: ['knee_caution'],
    experienceLevel: 'beginner',
  });
  assert('validateWorkout returns domain validation shape', validation.isValid && Array.isArray(validation.decisionTrace));
  assert('getWorkoutDescription returns requested tone', description.toneVariant === 'minimal' && description.intro.length > 0);
  assert('substituteExercise ranks replacement options', substitutions.sourceExerciseId === 'goblet_squat' && substitutions.options.length > 0 && substitutions.selected != null);

  {
    const { client, calls } = createMockSupabase();
    const workout = await generateWorkoutForUser('user-1', {
      goalId: 'dumbbell_hypertrophy',
      preferredToneVariant: 'coach_like',
    }, { client });
    const payload = insertedPayload(calls, 'generated_workouts') as Record<string, unknown>;
    assert('generateWorkoutForUser merges persisted profile data', workout.equipmentIds.includes('dumbbells') && workout.experienceLevel === 'intermediate');
    assert('generateWorkoutForUser persists generated workout when a client is configured', payload.user_id === 'user-1' && payload.payload === workout);
    assert('generateWorkoutForUser scopes profile reads by user_id', ['user_training_profiles', 'user_equipment', 'user_safety_flags', 'user_exercise_preferences'].every((table) => (
      calls.some((call) => call.table === table && call.method === 'eq' && call.args[0] === 'user_id' && call.args[1] === 'user-1')
    )));
  }

  {
    const { client, calls } = createMockSupabase();
    const session = await generateGeneratedWorkoutSessionForUser('user-1', {
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
      readinessBand: 'green',
    }, { client });
    const result = await completeGeneratedWorkoutSession('user-1', {
      workout: session.workout,
      generatedWorkoutId: session.generatedWorkoutId,
      startedAt: '2026-05-01T12:00:00.000Z',
      completedAt: '2026-05-01T12:40:00.000Z',
      exerciseResults: [{
        exerciseId: session.workout.blocks[0]?.exercises[0]?.exerciseId ?? 'bodyweight_squat',
        setsCompleted: 2,
        repsCompleted: 8,
        completedAsPrescribed: true,
      }],
      sessionRpe: 6,
      painScoreBefore: 0,
      painScoreAfter: 1,
      completionStatus: 'completed',
      rating: 5,
      feedbackTags: ['good_fit'],
      likedExerciseIds: [session.workout.blocks[0]?.exercises[0]?.exerciseId ?? 'bodyweight_squat'],
      dislikedExerciseIds: [],
      substitutionsUsed: [],
      notes: 'Felt repeatable.',
    }, { client });
    const completionChildPayloadRaw = insertedPayload(calls, 'exercise_completion_results');
    const completionChildPayload = Array.isArray(completionChildPayloadRaw)
      ? completionChildPayloadRaw[0] as Record<string, unknown> | undefined
      : completionChildPayloadRaw as Record<string, unknown> | undefined;
    assert('generated workout beta session persists parent and child exercise rows', session.persisted && session.generatedWorkoutId === 'generated_workouts-id' && Boolean(insertedPayload(calls, 'generated_workout_exercises')));
    assert('generated workout beta completion persists actual exercise work', completionChildPayload?.sets_completed === 2 && completionChildPayload?.reps_completed === 8);
    assert('generated workout beta completion saves completion, feedback, and preferences', result.workoutCompletionId === 'workout_completions-id' && result.feedbackId === 'recommendation_feedback-id' && calls.some((call) => call.table === 'user_exercise_preferences' && call.method === 'upsert'));
    assert('generated workout beta completion returns next progression', Boolean(result.progressionDecision.reason && result.progressionDecision.nextAdjustment));
  }

  {
    const { client, calls } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      workoutTypeId: 'strength',
      goalId: 'beginner_strength',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      sessionRpe: 6,
      readinessBefore: 'green',
      readinessAfter: 'green',
      painScoreBefore: 1,
      painScoreAfter: 1,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 24, repsPrescribed: 24, actualRpe: 6, completedAsPrescribed: true },
      ],
    };
    const result = await logWorkoutCompletion('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    assert('logWorkoutCompletion persists completion and progression decision', result.workoutCompletionId === 'workout_completions-id' && result.progressionDecisionId === 'progression_decisions-id');
    assert('logWorkoutCompletion writes through scoped parent rows', Boolean(insertedPayload(calls, 'workout_completions')) && Boolean(insertedPayload(calls, 'progression_decisions')));
  }

  {
    const program = await generateWeeklyProgramForUser('user-1', {
      goalId: 'beginner_strength',
      sessionsPerWeek: 2,
      desiredProgramLengthWeeks: 2,
      equipmentIds: ['bodyweight'],
      experienceLevel: 'beginner',
    });
    assert('generateWeeklyProgramForUser returns weekly program shape', program.weeks.length === 2 && program.sessions.length > 0 && program.progressionPlan.length === 2);
  }
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
