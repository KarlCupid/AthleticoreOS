import {
  generateSingleSessionWorkout,
  loadGeneratedWorkout,
  loadRecentCompletions,
  loadRecentExerciseResults,
  loadRecentProgressionDecisionsForUser,
  loadProgressionDecisionsForCompletion,
  listGeneratedWorkoutsForUser,
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  logReadiness,
  logWorkoutCompletion,
  logWorkoutCompletionWithExerciseResults,
  NotFoundError,
  saveGeneratedWorkout,
  saveGeneratedWorkoutWithExercises,
  saveProgressionDecision,
  saveRecommendationFeedback,
  UnauthorizedError,
  updateExercisePreference,
  updateUserEquipment,
  updateUserSafetyFlags,
  upsertExercisePreferences,
  ValidationError,
  WorkoutProgrammingPersistenceError,
  workoutProgrammingCatalog,
} from './index.ts';
import type { GeneratedWorkout, WorkoutCompletionLog } from './index.ts';

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

interface MockSupabaseConfig {
  insertErrors?: Record<string, unknown>;
  selectErrors?: Record<string, unknown>;
  upsertErrors?: Record<string, unknown>;
  deleteErrors?: Record<string, unknown>;
}

function createMockSupabase(config: MockSupabaseConfig = {}) {
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
    generated_workouts: [],
    generated_workout_exercises: [],
    workout_completions: [],
    exercise_completion_results: [],
    progression_decisions: [],
    performance_observations: [],
    user_readiness_logs: [],
    recommendation_feedback: [],
    user_programs: [],
  };
  const counters: Record<string, number> = {};

  function nextId(table: string) {
    counters[table] = (counters[table] ?? 0) + 1;
    return counters[table] === 1 ? `${table}-id` : `${table}-id-${counters[table]}`;
  }

  function withIds(table: string, payload: unknown): Record<string, unknown>[] {
    const inputRows = Array.isArray(payload) ? payload : [payload];
    return inputRows.map((row) => ({
      ...(row as Record<string, unknown>),
      id: (row as Record<string, unknown>).id ?? nextId(table),
    }));
  }

  function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>) {
    return filters.every(([column, value]) => row[column] === value);
  }

  function applyUpsert(table: string, payload: unknown, args: unknown[]) {
    const nextRows = withIds(table, payload);
    const options = args[1] as { onConflict?: string } | undefined;
    const conflictColumns = options?.onConflict?.split(',').map((item) => item.trim()).filter(Boolean) ?? ['id'];
    for (const nextRow of nextRows) {
      const index = (rows[table] ?? []).findIndex((row) => conflictColumns.every((column) => row[column] === nextRow[column]));
      if (index >= 0) rows[table][index] = { ...rows[table][index], ...nextRow };
      else rows[table] = [...(rows[table] ?? []), nextRow];
    }
    return nextRows;
  }

  const client = {
    from(table: string) {
      const state: {
        operation: 'select' | 'insert' | 'upsert' | 'delete';
        filters: Array<[string, unknown]>;
        payload?: unknown;
        args: unknown[];
        limit?: number;
      } = { operation: 'select', filters: [], args: [] };
      const execute = () => {
        if (state.operation === 'select') {
          const error = config.selectErrors?.[table] ?? null;
          if (error) return { data: null, error };
          const data = (rows[table] ?? []).filter((row) => matches(row, state.filters)).slice(0, state.limit ?? undefined);
          return { data, error: null };
        }
        if (state.operation === 'insert') {
          const error = config.insertErrors?.[table] ?? null;
          if (error) return { data: null, error };
          const inserted = withIds(table, state.payload);
          rows[table] = [...(rows[table] ?? []), ...inserted];
          return { data: Array.isArray(state.payload) ? inserted : inserted[0], error: null };
        }
        if (state.operation === 'upsert') {
          const error = config.upsertErrors?.[table] ?? null;
          if (error) return { data: null, error };
          const upserted = applyUpsert(table, state.payload, state.args);
          return { data: Array.isArray(state.payload) ? upserted : upserted[0], error: null };
        }
        const error = config.deleteErrors?.[table] ?? null;
        if (error) return { data: null, error };
        rows[table] = (rows[table] ?? []).filter((row) => !matches(row, state.filters));
        return { data: null, error: null };
      };
      const builder = {
        select(...args: unknown[]) {
          calls.push({ table, method: 'select', args });
          if (state.operation !== 'insert' && state.operation !== 'upsert') state.operation = 'select';
          return builder;
        },
        insert(...args: unknown[]) {
          calls.push({ table, method: 'insert', args });
          state.operation = 'insert';
          state.payload = args[0];
          state.args = args;
          return builder;
        },
        upsert(...args: unknown[]) {
          calls.push({ table, method: 'upsert', args });
          state.operation = 'upsert';
          state.payload = args[0];
          state.args = args;
          return builder;
        },
        delete(...args: unknown[]) {
          calls.push({ table, method: 'delete', args });
          state.operation = 'delete';
          return builder;
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: 'eq', args });
          state.filters.push([args[0] as string, args[1]]);
          return builder;
        },
        order(...args: unknown[]) {
          calls.push({ table, method: 'order', args });
          return builder;
        },
        limit(...args: unknown[]) {
          calls.push({ table, method: 'limit', args });
          state.limit = args[0] as number;
          return builder;
        },
        maybeSingle() {
          calls.push({ table, method: 'maybeSingle', args: [] });
          const result = execute();
          return Promise.resolve({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error });
        },
        single() {
          calls.push({ table, method: 'single', args: [] });
          const result = execute();
          return Promise.resolve({ data: Array.isArray(result.data) ? result.data[0] ?? null : result.data, error: result.error });
        },
        then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
          return Promise.resolve(execute()).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client, calls, rows };
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
    const { client } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const id = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const loaded = await loadGeneratedWorkout('user-1', id!, { client });
    const listed = await listGeneratedWorkoutsForUser('user-1', { client, limit: 5 });
    assert('successful generated workout save/load validates payload', loaded?.schemaVersion === 'generated-workout-v1' && loaded.goalId === workout.goalId);
    assert('listGeneratedWorkoutsForUser validates and returns user workouts', listed.length === 1 && listed[0].templateId === workout.templateId);
  }

  {
    const { client, calls, rows } = createMockSupabase({
      insertErrors: {
        generated_workout_exercises: { message: 'child insert failed', code: '23503' },
      },
    });
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    let childError = false;
    try {
      await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    } catch (error) {
      childError = error instanceof WorkoutProgrammingPersistenceError
        && error.message.includes('child')
        && error.table === 'generated_workout_exercises';
    }
    assert('failed generated workout child save produces persistence error', childError);
    assert('failed generated workout child save attempts parent rollback', calls.some((call) => call.table === 'generated_workouts' && call.method === 'delete') && rows.generated_workouts.length === 0);
  }

  {
    const { client, calls } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const invalidWorkout: GeneratedWorkout = { ...workout, schemaVersion: 'broken' as never };
    let invalidRejected = false;
    try {
      await saveGeneratedWorkout('user-1', invalidWorkout, { client });
    } catch (error) {
      invalidRejected = error instanceof ValidationError;
    }
    assert('invalid generated workout payload cannot be saved', invalidRejected && !calls.some((call) => call.table === 'generated_workouts' && call.method === 'insert'));
  }

  {
    const { client } = createMockSupabase();
    let missing = false;
    try {
      await loadGeneratedWorkout('user-1', 'missing-generated-workout', { client });
    } catch (error) {
      missing = error instanceof NotFoundError;
    }
    assert('missing generated workout returns NotFoundError', missing);
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
    const id = await logWorkoutCompletionWithExerciseResults('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    const payload = insertedPayload(calls, 'workout_completions') as Record<string, unknown>;
    assert('completion logging returns inserted id', id === 'workout_completions-id');
    assert('completion insert is user scoped', payload.user_id === 'user-1' && payload.generated_workout_id === 'generated-1');
    assert('exercise completion results persist through parent completion', Array.isArray(insertedPayload(calls, 'exercise_completion_results')));
  }

  {
    const { client, rows } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      workoutTypeId: 'strength',
      goalId: 'beginner_strength',
      prescriptionTemplateId: 'strength_beginner',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 28,
      sessionRpe: 6,
      readinessBefore: 'green',
      readinessAfter: 'green',
      movementQuality: 4,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 24, repsPrescribed: 24, loadUsed: 35, actualRpe: 6, targetRpe: 7, completedAsPrescribed: true },
        { exerciseId: 'push_up', setsCompleted: 2, setsPrescribed: 2, repsCompleted: 16, repsPrescribed: 16, actualRpe: 7, completedAsPrescribed: true },
      ],
    };
    const id = await logWorkoutCompletion('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    assert('completion and exercise results save together', id === 'workout_completions-id' && rows.exercise_completion_results.length === 2);
    const loadedCompletions = await loadRecentCompletions('user-1', { client, limit: 5 });
    const loadedExerciseResults = await loadRecentExerciseResults('user-1', { client, limit: 5 });
    assert('recent completions load typed progression history fields', loadedCompletions[0]?.workoutTypeId === 'strength' && loadedCompletions[0]?.goalId === 'beginner_strength' && loadedCompletions[0]?.readinessAfter === 'green');
    assert('recent exercise-level results load prescribed and actual fields', loadedExerciseResults.some((result) => result.exerciseId === 'goblet_squat' && result.setsPrescribed === 3 && result.repsPrescribed === 24 && result.targetRpe === 7));
  }

  {
    const { client, calls } = createMockSupabase();
    await updateUserEquipment('user-1', ['bodyweight', 'dumbbells'], { client });
    await updateUserSafetyFlags('user-1', ['knee_caution'], { client });
    await updateExercisePreference('user-1', 'goblet_squat', 'like', { client });
    await upsertExercisePreferences('user-1', [{ exerciseId: 'push_up', preference: 'dislike' }, { exerciseId: 'push_up', preference: 'like' }], { client });
    await logReadiness('user-1', { readinessBand: 'yellow', notes: 'slept ok' }, { client });
    await saveRecommendationFeedback('user-1', { generatedWorkoutId: 'generated-1', rating: 4, notes: 'good fit' }, { client });
    const userTables = ['user_equipment', 'user_safety_flags', 'user_exercise_preferences', 'user_readiness_logs', 'recommendation_feedback'];
    assert('user mutation services include user_id payloads', userTables.every((table) => JSON.stringify(insertedPayload(calls, table) ?? calls.find((call) => call.table === table && call.method === 'upsert')?.args[0] ?? '').includes('user-1')));
    assert('equipment and safety updates delete only current user rows', ['user_equipment', 'user_safety_flags'].every((table) => calls.some((call) => call.table === table && call.method === 'eq' && call.args[0] === 'user_id' && call.args[1] === 'user-1')));
  }

  {
    const { client, rows } = createMockSupabase();
    await updateUserEquipment('user-1', ['bodyweight', 'dumbbells', 'dumbbells'], { client });
    assert('bulk user equipment update replaces old equipment cleanly', rows.user_equipment.length === 2 && rows.user_equipment.some((row) => row.equipment_type_id === 'bodyweight') && rows.user_equipment.some((row) => row.equipment_type_id === 'dumbbells'));
  }

  {
    const { client, calls } = createMockSupabase();
    const id = await saveProgressionDecision('user-1', {
      direction: 'progress',
      decision: 'progress',
      reason: 'Completed all work.',
      nextAdjustment: 'Add one rep next time.',
      safetyFlags: [],
    }, { client, workoutCompletionId: 'completion-1' });
    const loaded = await loadProgressionDecisionsForCompletion('completion-1', { client });
    assert('progression decision can be persisted and loaded', id === 'progression_decisions-id' && loaded.length === 1 && loaded[0].direction === 'progress');
  }

  {
    const { client } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      workoutTypeId: 'strength',
      goalId: 'beginner_strength',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      sessionRpe: 6,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 24, repsPrescribed: 24, actualRpe: 6, completedAsPrescribed: true },
      ],
    };
    const completionId = await logWorkoutCompletion('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    await saveProgressionDecision('user-1', {
      direction: 'substitute',
      decision: 'substitute',
      reason: 'The same exercise keeps needing swaps.',
      nextAdjustment: 'Use a better-fit substitute next time.',
      safetyFlags: [],
      affectedExerciseIds: ['goblet_squat'],
    }, { client, workoutCompletionId: completionId });
    const recentDecisions = await loadRecentProgressionDecisionsForUser('user-1', { client, limit: 5 });
    assert('recent progression decisions load through user-owned completions', recentDecisions.some((decision) => decision.direction === 'substitute' && decision.affectedExerciseIds?.includes('goblet_squat')));
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

  {
    const { client } = createMockSupabase({
      selectErrors: {
        user_training_profiles: { message: 'permission denied', status: 403 },
      },
    });
    let mapped = false;
    try {
      await loadUserWorkoutProfile('user-1', { client });
    } catch (error) {
      mapped = error instanceof UnauthorizedError && error.code === 'unauthorized';
    }
    assert('mock Supabase error maps to structured error', mapped);
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
