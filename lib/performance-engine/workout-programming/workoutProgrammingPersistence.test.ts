import {
  generateSingleSessionWorkout,
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  logReadiness,
  logWorkoutCompletion,
  saveGeneratedWorkout,
  saveProgressionDecision,
  saveRecommendationFeedback,
  updateExercisePreference,
  updateUserEquipment,
  updateUserSafetyFlags,
  workoutProgrammingCatalog,
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
      readiness_band: 'yellow',
    }],
    user_equipment: [
      { user_id: 'user-1', equipment_type_id: 'bodyweight' },
      { user_id: 'user-1', equipment_type_id: 'dumbbells' },
    ],
    user_safety_flags: [{ user_id: 'user-1', safety_flag_id: 'knee_caution' }],
    user_exercise_preferences: [
      { user_id: 'user-1', exercise_id: 'goblet_squat', preference: 'like' },
      { user_id: 'user-1', exercise_id: 'push_up', preference: 'dislike' },
    ],
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
        upsert(...args: unknown[]) {
          calls.push({ table, method: 'upsert', args });
          return Promise.resolve({ data: null, error: null });
        },
        delete(...args: unknown[]) {
          calls.push({ table, method: 'delete', args });
          state.operation = 'delete';
          return builder;
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
  console.log('\n-- workout programming persistence --');

  {
    const catalog = await loadWorkoutProgrammingCatalog();
    assert('catalog loader falls back to in-code seed catalog', catalog.exercises.length === workoutProgrammingCatalog.exercises.length);
  }

  {
    const { client, calls } = createMockSupabase();
    const profile = await loadUserWorkoutProfile('user-1', { client });
    const userScopedTables = ['user_training_profiles', 'user_equipment', 'user_safety_flags', 'user_exercise_preferences'];
    assert('profile loader maps user equipment and preferences', profile.equipmentIds.includes('dumbbells') && profile.likedExerciseIds?.includes('goblet_squat') === true && profile.dislikedExerciseIds.includes('push_up'));
    assert('profile loader scopes every user query by user_id', userScopedTables.every((table) => (
      calls.some((call) => call.table === table && call.method === 'eq' && call.args[0] === 'user_id' && call.args[1] === 'user-1')
    )));
  }

  {
    const { client, calls } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const id = await saveGeneratedWorkout('user-1', workout, { client });
    const payload = insertedPayload(calls, 'generated_workouts') as Record<string, unknown>;
    assert('generated workout persistence returns inserted id', id === 'generated_workouts-id');
    assert('generated workout insert is user scoped', payload.user_id === 'user-1' && payload.payload === workout);
    assert('generated workout exercises persist as child rows', Array.isArray(insertedPayload(calls, 'generated_workout_exercises')));
  }

  {
    const { client, calls } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 28,
      sessionRpe: 6,
      painScoreBefore: 1,
      painScoreAfter: 1,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, repsCompleted: 24, actualRpe: 6, painScore: 1, completedAsPrescribed: true },
      ],
    };
    const id = await logWorkoutCompletion('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    const payload = insertedPayload(calls, 'workout_completions') as Record<string, unknown>;
    assert('completion logging returns inserted id', id === 'workout_completions-id');
    assert('completion insert is user scoped', payload.user_id === 'user-1' && payload.generated_workout_id === 'generated-1');
    assert('exercise completion results persist through parent completion', Array.isArray(insertedPayload(calls, 'exercise_completion_results')));
  }

  {
    const { client, calls } = createMockSupabase();
    await updateUserEquipment('user-1', ['bodyweight', 'dumbbells'], { client });
    await updateUserSafetyFlags('user-1', ['knee_caution'], { client });
    await updateExercisePreference('user-1', 'goblet_squat', 'like', { client });
    await logReadiness('user-1', { readinessBand: 'yellow', notes: 'slept ok' }, { client });
    await saveRecommendationFeedback('user-1', { generatedWorkoutId: 'generated-1', rating: 4, notes: 'good fit' }, { client });
    const userTables = ['user_equipment', 'user_safety_flags', 'user_exercise_preferences', 'user_readiness_logs', 'recommendation_feedback'];
    assert('user mutation services include user_id payloads', userTables.every((table) => JSON.stringify(insertedPayload(calls, table) ?? calls.find((call) => call.table === table && call.method === 'upsert')?.args[0] ?? '').includes('user-1')));
    assert('equipment and safety updates delete only current user rows', ['user_equipment', 'user_safety_flags'].every((table) => calls.some((call) => call.table === table && call.method === 'eq' && call.args[0] === 'user_id' && call.args[1] === 'user-1')));
  }

  {
    const { client, calls } = createMockSupabase();
    const id = await saveProgressionDecision('user-1', {
      direction: 'substitute',
      decision: 'substitute',
      reason: 'RDL failed repeatedly.',
      nextAdjustment: 'Swap hinge pattern.',
      safetyFlags: ['back_caution'],
      affectedExerciseIds: ['romanian_deadlift'],
    }, { client });
    const payload = insertedPayload(calls, 'performance_observations') as Record<string, unknown>;
    assert('progression decision without completion parent persists as user-scoped observation', id === 'performance_observations-id' && payload.user_id === 'user-1');
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
