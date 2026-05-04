import {
  archiveProgram,
  attachGeneratedWorkoutToProgramSession,
  generateSingleSessionWorkout,
  generateWeeklyWorkoutProgram,
  integrateProgramWithCalendar,
  loadGeneratedWorkout,
  loadGeneratedProgram,
  loadRecentCompletions,
  loadRecentExerciseResults,
  loadRecentProgressionDecisionsForUser,
  loadProgressionDecisionsForCompletion,
  listGeneratedWorkoutsForUser,
  listUserPrograms,
  loadUserWorkoutProfile,
  loadWorkoutProgrammingCatalog,
  logReadiness,
  logWorkoutCompletion,
  logWorkoutCompletionWithExerciseResults,
  markProgramSessionCompleted,
  pauseGeneratedWorkoutSession,
  resumeGeneratedWorkoutSession,
  DatabaseUnavailableError,
  NotFoundError,
  loadActiveGeneratedWorkoutSession,
  listActiveGeneratedWorkoutSessions,
  rescheduleProgramSession,
  abandonGeneratedWorkoutSession,
  completeGeneratedWorkoutSessionLifecycle,
  startGeneratedWorkoutSession,
  stopGeneratedWorkoutSession,
  saveGeneratedProgram,
  saveGeneratedWorkout,
  saveGeneratedWorkoutWithExercises,
  saveProgressionDecision,
  saveRecommendationFeedback,
  summarizeWorkoutDecisionForAdmin,
  UnauthorizedError,
  updateProgramSession,
  updateExercisePreference,
  updateUserEquipment,
  updateUserSafetyFlags,
  upsertExercisePreferences,
  validateGeneratedProgram,
  ValidationError,
  WorkoutProgrammingPersistenceError,
  workoutProgrammingCatalog,
} from './index.ts';
import type { GeneratedProgram, GeneratedWorkout, WorkoutCompletionLog, WorkoutProgrammingSupabaseClient } from './index.ts';

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
  enableRpc?: boolean;
  rpcErrors?: Record<string, unknown>;
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
    generated_workout_session_lifecycle: [],
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

  function matches(row: Record<string, unknown>, filters: Array<[string, unknown]>, inFilters: Array<[string, unknown[]]> = []) {
    return filters.every(([column, value]) => row[column] === value)
      && inFilters.every(([column, values]) => values.includes(row[column]));
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

  function programPayloadWithIds(program: GeneratedProgram, userProgramId: string): GeneratedProgram {
    const sessions = program.sessions.map((session) => ({
      ...session,
      persistenceId: session.persistenceId ?? `${userProgramId}:${session.id}`,
      userProgramId,
    }));
    const sessionById = new Map(sessions.map((session) => [session.id, session]));
    return {
      ...program,
      persistenceId: userProgramId,
      sessions,
      weeks: program.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => sessionById.get(session.id) ?? session),
      })),
    };
  }

  function applyRpc(functionName: string, args: Record<string, unknown>) {
    const error = config.rpcErrors?.[functionName] ?? null;
    if (error) return { data: null, error };

    if (functionName === 'save_generated_workout_with_exercises') {
      const workoutId = (args.p_generated_workout_id as string | null | undefined) ?? nextId('generated_workouts');
      const parentRow = { ...(args.p_workout as Record<string, unknown>), id: workoutId };
      rows.generated_workouts = rows.generated_workouts.filter((row) => row.id !== workoutId);
      rows.generated_workouts.push(parentRow);
      rows.generated_workout_exercises = rows.generated_workout_exercises.filter((row) => row.generated_workout_id !== workoutId);
      const exerciseRows = ((args.p_exercises as Record<string, unknown>[] | undefined) ?? []).map((row) => ({
        ...row,
        generated_workout_id: workoutId,
        id: nextId('generated_workout_exercises'),
      }));
      rows.generated_workout_exercises.push(...exerciseRows);
      return { data: workoutId, error: null };
    }

    if (functionName === 'log_workout_completion_with_results') {
      const completionId = nextId('workout_completions');
      rows.workout_completions.push({ ...(args.p_completion as Record<string, unknown>), id: completionId });
      const resultRows = ((args.p_results as Record<string, unknown>[] | undefined) ?? []).map((row) => ({
        ...row,
        workout_completion_id: completionId,
        id: nextId('exercise_completion_results'),
      }));
      rows.exercise_completion_results.push(...resultRows);
      return { data: completionId, error: null };
    }

    if (functionName === 'save_generated_program_with_sessions') {
      const existingId = args.p_user_program_id as string | null | undefined;
      const userProgramId = existingId ?? nextId('user_programs');
      const payload = programPayloadWithIds(args.p_program as GeneratedProgram, userProgramId);
      applyUpsert('user_programs', {
        id: userProgramId,
        user_id: args.p_user_id,
        goal_id: payload.goalId,
        status: payload.status ?? 'active',
        started_at: payload.startedAt ?? payload.scheduleStartDate,
        payload,
      }, [{}, { onConflict: 'id' }]);
      return { data: userProgramId, error: null };
    }

    if (functionName === 'complete_program_session') {
      const userProgramId = args.p_user_program_id as string;
      const payload = programPayloadWithIds(args.p_program as GeneratedProgram, userProgramId);
      applyUpsert('user_programs', {
        id: userProgramId,
        user_id: args.p_user_id,
        goal_id: payload.goalId,
        status: payload.status ?? 'active',
        started_at: payload.startedAt ?? payload.scheduleStartDate,
        payload,
      }, [{}, { onConflict: 'id' }]);
      return { data: userProgramId, error: null };
    }

    return { data: null, error: { message: `Unknown mock RPC ${functionName}`, code: 'PGRST202' } };
  }

  const client: WorkoutProgrammingSupabaseClient = {
    from(table: string) {
      const state: {
        operation: 'select' | 'insert' | 'upsert' | 'delete';
        filters: Array<[string, unknown]>;
        inFilters: Array<[string, unknown[]]>;
        payload?: unknown;
        args: unknown[];
        limit?: number;
      } = { operation: 'select', filters: [], inFilters: [], args: [] };
      const execute = () => {
        if (state.operation === 'select') {
          const error = config.selectErrors?.[table] ?? null;
          if (error) return { data: null, error };
          const data = (rows[table] ?? []).filter((row) => matches(row, state.filters, state.inFilters)).slice(0, state.limit ?? undefined);
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
        rows[table] = (rows[table] ?? []).filter((row) => !matches(row, state.filters, state.inFilters));
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
        in(...args: unknown[]) {
          calls.push({ table, method: 'in', args });
          state.inFilters.push([args[0] as string, args[1] as unknown[]]);
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
  if (config.enableRpc || config.rpcErrors) {
    client.rpc = (...rpcArgs: unknown[]) => {
      const functionName = rpcArgs[0] as string;
      const args = (rpcArgs[1] ?? {}) as Record<string, unknown>;
      calls.push({ table: 'rpc', method: functionName, args: [args] });
      return Promise.resolve(applyRpc(functionName, args));
    };
  }
  return { client, calls, rows };
}

function insertedPayload(calls: CallRecord[], table: string): unknown {
  return calls.find((call) => call.table === table && call.method === 'insert')?.args[0];
}

function createCalendarProgram(): GeneratedProgram {
  return generateWeeklyWorkoutProgram({
    userId: 'user-1',
    goalId: 'beginner_strength',
    durationMinutes: 40,
    preferredDurationMinutes: 40,
    equipmentIds: ['bodyweight', 'dumbbells'],
    experienceLevel: 'beginner',
    safetyFlags: [],
    readinessBand: 'green',
    desiredProgramLengthWeeks: 4,
    sessionsPerWeek: 3,
    availableDays: [1, 3, 5],
    startDate: '2026-05-04',
    protectedWorkouts: [{
      id: 'boxing-practice',
      label: 'Boxing practice',
      dayIndex: 2,
      durationMinutes: 75,
      intensity: 'hard',
    }],
    deloadStrategy: 'week_four',
  });
}

function firstGeneratedSession(program: GeneratedProgram) {
  const session = program.sessions.find((item) => !item.protectedAnchor && item.workout);
  if (!session) throw new Error('Expected a generated program session.');
  return session;
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
    const { client, calls, rows } = createMockSupabase({ enableRpc: true });
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const id = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const rpcCall = calls.find((call) => call.table === 'rpc' && call.method === 'save_generated_workout_with_exercises');
    assert('generated workout persistence prefers atomic RPC when available', id === 'generated_workouts-id' && Boolean(rpcCall));
    assert('generated workout RPC stores parent and child rows together', rows.generated_workouts.length === 1 && rows.generated_workout_exercises.length > 0);
    assert('generated workout RPC path avoids client-orchestrated inserts', !calls.some((call) => call.table === 'generated_workouts' && call.method === 'insert'));
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
    const loadedTrace = loaded ? summarizeWorkoutDecisionForAdmin(loaded) : null;
    assert('successful generated workout save/load validates payload', loaded?.schemaVersion === 'generated-workout-v1' && loaded.goalId === workout.goalId);
    assert('trace survives generated workout persistence and load', Boolean(
      loadedTrace?.selectedTemplateTrace
        && loadedTrace.scoring.selectedExerciseScores.length > 0
        && loadedTrace.validation.validationTrace.length > 0,
    ));
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
    const { client, calls, rows } = createMockSupabase({
      enableRpc: true,
      rpcErrors: {
        save_generated_workout_with_exercises: { message: 'permission denied for RPC', code: '42501' },
      },
    });
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    let rpcError = false;
    try {
      await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    } catch (error) {
      rpcError = error instanceof UnauthorizedError && error.table === 'save_generated_workout_with_exercises';
    }
    assert('generated workout RPC failure preserves structured error', rpcError);
    assert('generated workout RPC failure does not fall through to direct parent/child writes', rows.generated_workouts.length === 0 && !calls.some((call) => call.table === 'generated_workouts' && call.method === 'insert'));
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
    const { client, calls } = createMockSupabase({ enableRpc: true });
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const invalidWorkout: GeneratedWorkout = { ...workout, schemaVersion: 'broken' as never };
    let invalidRejected = false;
    try {
      await saveGeneratedWorkoutWithExercises('user-1', invalidWorkout, { client });
    } catch (error) {
      invalidRejected = error instanceof ValidationError;
    }
    assert('invalid generated workout payload is rejected before RPC', invalidRejected && !calls.some((call) => call.table === 'rpc'));
  }

  {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const blocked = createMockSupabase();
      const workout = generateSingleSessionWorkout({
        goalId: 'beginner_strength',
        durationMinutes: 30,
        equipmentIds: ['bodyweight', 'dumbbells'],
        experienceLevel: 'beginner',
      });
      let fallbackBlocked = false;
      try {
        await saveGeneratedWorkoutWithExercises('user-1', workout, { client: blocked.client });
      } catch (error) {
        fallbackBlocked = error instanceof DatabaseUnavailableError;
      }
      const allowed = createMockSupabase();
      const id = await saveGeneratedWorkoutWithExercises('user-1', workout, {
        client: allowed.client,
        allowClientWriteFallback: true,
      });
      assert('client-orchestrated workout fallback is blocked in production without explicit opt-in', fallbackBlocked && blocked.rows.generated_workouts.length === 0);
      assert('client-orchestrated workout fallback can be explicitly allowed for dev/test harnesses', id === 'generated_workouts-id' && allowed.rows.generated_workout_exercises.length > 0);
    } finally {
      if (previousNodeEnv == null) Reflect.deleteProperty(process.env, 'NODE_ENV');
      else process.env.NODE_ENV = previousNodeEnv;
    }
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
    const { client, rows } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const generatedWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const started = await startGeneratedWorkoutSession('user-1', generatedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:00:00.000Z',
      activeBlockId: workout.blocks[0]?.id,
      activeExerciseId: workout.blocks[0]?.exercises[0]?.exerciseId,
    });
    const paused = await pauseGeneratedWorkoutSession('user-1', generatedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:10:00.000Z',
    });
    const resumed = await resumeGeneratedWorkoutSession('user-1', generatedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:15:00.000Z',
    });
    assert('generated workout session lifecycle start persists started state', started?.status === 'started' && started.startedAt === '2026-05-01T12:00:00.000Z');
    assert('generated workout session lifecycle pause/resume updates status', paused?.status === 'paused' && resumed?.status === 'resumed' && rows.generated_workout_session_lifecycle.length === 1);
  }

  {
    const { client } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const generatedWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    await startGeneratedWorkoutSession('user-1', generatedWorkoutId!, { client, occurredAt: '2026-05-01T12:00:00.000Z' });
    const completed = await completeGeneratedWorkoutSessionLifecycle('user-1', generatedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:40:00.000Z',
      completionStatus: 'partial',
      notes: 'Stopped after accessory work.',
    });
    assert('generated workout session lifecycle complete updates completed state', completed?.status === 'completed' && completed.completedAt === '2026-05-01T12:40:00.000Z' && completed.completionStatus === 'partial');
  }

  {
    const { client } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const abandonedWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const activeWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const stoppedWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    const abandoned = await abandonGeneratedWorkoutSession('user-1', abandonedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:20:00.000Z',
    });
    const stopped = await stopGeneratedWorkoutSession('user-1', stoppedWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:25:00.000Z',
    });
    await startGeneratedWorkoutSession('user-1', activeWorkoutId!, {
      client,
      occurredAt: '2026-05-01T12:30:00.000Z',
    });
    const active = await loadActiveGeneratedWorkoutSession('user-1', { client });
    const activeList = await listActiveGeneratedWorkoutSessions('user-1', { client, limit: 5 });
    assert('generated workout session lifecycle abandon updates abandoned state', abandoned?.status === 'abandoned' && abandoned.completionStatus === 'abandoned');
    assert('generated workout session lifecycle stop updates stopped state', stopped?.status === 'stopped' && stopped.completionStatus === 'stopped');
    assert('active generated workout session can be loaded without terminal sessions', active?.generatedWorkoutId === activeWorkoutId && activeList.every((session) => session.status !== 'abandoned' && session.status !== 'stopped'));
  }

  {
    const { client } = createMockSupabase();
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const generatedWorkoutId = await saveGeneratedWorkoutWithExercises('user-1', workout, { client });
    let blocked = false;
    try {
      await startGeneratedWorkoutSession('user-2', generatedWorkoutId!, { client });
    } catch (error) {
      blocked = error instanceof NotFoundError;
    }
    assert('cross-user generated workout session lifecycle access is blocked', blocked);
  }

  {
    const { client, calls } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 28,
      sessionRpe: 6,
      completionStatus: 'completed',
      substitutionsUsed: ['box_squat'],
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
    assert('completion insert preserves generated source metadata', payload.source === 'generated_workout' && payload.completion_status === 'completed' && Array.isArray(payload.substitutions_used));
    assert('exercise completion results persist through parent completion', Array.isArray(insertedPayload(calls, 'exercise_completion_results')));
  }

  {
    const { client, calls, rows } = createMockSupabase({ enableRpc: true });
    const completion: WorkoutCompletionLog = {
      workoutId: 'generated-1',
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
    const rpcCall = calls.find((call) => call.table === 'rpc' && call.method === 'log_workout_completion_with_results');
    assert('workout completion persistence prefers atomic RPC when available', id === 'workout_completions-id' && Boolean(rpcCall));
    assert('workout completion RPC uses returned id for exercise results', rows.exercise_completion_results.every((row) => row.workout_completion_id === id));
    assert('workout completion RPC path avoids direct completion insert', !calls.some((call) => call.table === 'workout_completions' && call.method === 'insert'));
  }

  {
    const { client, rows } = createMockSupabase({
      enableRpc: true,
      rpcErrors: {
        log_workout_completion_with_results: { message: 'child insert rejected', code: '23503' },
      },
    });
    const completion: WorkoutCompletionLog = {
      workoutId: 'generated-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 28,
      sessionRpe: 6,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, completedAsPrescribed: true },
      ],
    };
    let atomicFailure = false;
    try {
      await logWorkoutCompletionWithExerciseResults('user-1', completion, { client, generatedWorkoutId: 'generated-1' });
    } catch (error) {
      atomicFailure = error instanceof ValidationError;
    }
    assert('workout completion RPC failure behaves as one failed operation', atomicFailure && rows.workout_completions.length === 0 && rows.exercise_completion_results.length === 0);
  }

  {
    const { client, rows } = createMockSupabase();
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-1',
      completedAt: '2026-05-01T12:00:00.000Z',
      workoutTypeId: 'strength',
      goalId: 'beginner_strength',
      prescriptionTemplateId: 'strength_beginner',
      completionStatus: 'partial',
      substitutionsUsed: ['incline_push_up'],
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
    assert('recent completions load surface metadata', loadedCompletions[0]?.source === 'generated_workout' && loadedCompletions[0]?.completionStatus === 'partial' && loadedCompletions[0]?.substitutionsUsed?.includes('incline_push_up') === true);
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
    const { client, rows } = createMockSupabase();
    const program = createCalendarProgram();
    const id = await saveGeneratedProgram('user-1', program, { client });
    const loaded = await loadGeneratedProgram('user-1', id!, { client });
    const listed = await listUserPrograms('user-1', { client, limit: 5 });
    const stored = rows.user_programs[0]?.payload as GeneratedProgram | undefined;
    assert('4-week generated program persists and reloads with persistence ids', id === 'user_programs-id' && loaded?.persistenceId === id && loaded.weeks.length === 4 && loaded.sessions.every((session) => session.userProgramId === id));
    assert('persisted program keeps week-four deload and movement balance summary', loaded?.weeks[3]?.phase === 'deload' && Boolean(stored?.movementPatternBalance?.programTotal) && listed.length === 1);
    assert('persisted program validates after reload', Boolean(loaded && validateGeneratedProgram(loaded).valid));
  }

  {
    const { client, calls, rows } = createMockSupabase({ enableRpc: true });
    const program = createCalendarProgram();
    const id = await saveGeneratedProgram('user-1', program, { client });
    const loaded = await loadGeneratedProgram('user-1', id!, { client });
    const rpcCall = calls.find((call) => call.table === 'rpc' && call.method === 'save_generated_program_with_sessions');
    assert('generated program persistence prefers atomic RPC when available', id === 'user_programs-id' && Boolean(rpcCall));
    assert('generated program RPC stores sessions with returned program id', loaded?.sessions.every((session) => session.userProgramId === id) === true);
    assert('generated program RPC path avoids client-orchestrated program insert/upsert sequence', rows.user_programs.length === 1 && !calls.some((call) => call.table === 'user_programs' && call.method === 'insert'));
  }

  {
    const program = createCalendarProgram();
    const protectedBefore = program.sessions.filter((session) => session.protectedAnchor).map((session) => `${session.id}:${session.scheduledDate}:${session.dayIndex}`);
    const generated = firstGeneratedSession(program);
    const conflicted = integrateProgramWithCalendar(program, {
      startDate: '2026-05-04',
      availableDays: [1, 3, 5, 6],
      existingCalendarEvents: [{
        id: 'work-conflict',
        date: generated.scheduledDate ?? '2026-05-04',
        label: 'Late work meeting',
        durationMinutes: 90,
        source: 'calendar',
      }],
    });
    const moved = conflicted.sessions.find((session) => session.id === generated.id);
    const protectedAfter = conflicted.sessions.filter((session) => session.protectedAnchor).map((session) => `${session.id}:${session.scheduledDate}:${session.dayIndex}`);
    assert('calendar conflicts move generated sessions but preserve protected workouts', moved?.status === 'rescheduled' && moved.scheduledDate !== generated.scheduledDate && JSON.stringify(protectedAfter) === JSON.stringify(protectedBefore));
    assert('calendar conflicts produce validation warnings', (conflicted.calendarWarnings ?? []).some((warning) => warning.includes('calendar conflict')));
  }

  {
    const program = createCalendarProgram();
    const generated = firstGeneratedSession(program);
    const rescheduled = rescheduleProgramSession(program, {
      sessionId: generated.id,
      targetDate: '2026-05-10',
      existingCalendarEvents: [],
    });
    const moved = rescheduled.sessions.find((session) => session.id === generated.id);
    const protectedUntouched = rescheduled.sessions
      .filter((session) => session.protectedAnchor)
      .every((session) => program.sessions.some((original) => original.id === session.id && original.scheduledDate === session.scheduledDate && original.dayIndex === session.dayIndex));
    assert('missed generated session can be rescheduled', moved?.status === 'rescheduled' && moved.scheduledDate === '2026-05-10' && protectedUntouched);
  }

  {
    const { client } = createMockSupabase();
    const program = createCalendarProgram();
    const userProgramId = await saveGeneratedProgram('user-1', program, { client });
    const generated = firstGeneratedSession(program);
    const updated = await updateProgramSession('user-1', userProgramId!, generated.id, {
      scheduledDate: '2026-05-10',
      dayIndex: 7,
      status: 'rescheduled',
      validationWarning: 'Session was manually moved after a calendar conflict.',
    }, { client });
    const workout = generateSingleSessionWorkout({
      goalId: 'beginner_strength',
      durationMinutes: 30,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
    });
    const attached = await attachGeneratedWorkoutToProgramSession('user-1', userProgramId!, generated.id, workout, { client });
    const completed = await markProgramSessionCompleted('user-1', userProgramId!, generated.id, {
      completedAt: '2026-05-06T18:00:00.000Z',
      workoutCompletionId: 'completion-1',
    }, { client });
    const archived = await archiveProgram('user-1', userProgramId!, { client });
    assert('program session updates persist scheduled date and warnings', updated.sessions.some((session) => session.id === generated.id && session.scheduledDate === '2026-05-10' && session.status === 'rescheduled') && updated.validationWarnings.includes('Session was manually moved after a calendar conflict.'));
    assert('generated workout can attach to a program session', attached.sessions.some((session) => session.id === generated.id && session.generatedWorkoutId === 'generated_workouts-id' && session.workout?.templateId === workout.templateId));
    assert('program session completion and archive persist lifecycle state', completed.sessions.some((session) => session.id === generated.id && session.status === 'completed' && session.workoutCompletionId === 'completion-1') && archived.status === 'archived' && Boolean(archived.archivedAt));
  }

  {
    const { client, calls } = createMockSupabase({ enableRpc: true });
    const program = createCalendarProgram();
    const userProgramId = await saveGeneratedProgram('user-1', program, { client });
    const generated = firstGeneratedSession(program);
    const completed = await markProgramSessionCompleted('user-1', userProgramId!, generated.id, {
      completedAt: '2026-05-06T18:00:00.000Z',
      workoutCompletionId: 'completion-1',
    }, { client });
    const completeRpcCall = calls.find((call) => call.table === 'rpc' && call.method === 'complete_program_session');
    assert('program session completion uses dedicated atomic RPC when available', Boolean(completeRpcCall) && completed.sessions.some((session) => session.id === generated.id && session.status === 'completed'));
    assert('program session completion RPC receives the completed session id', (completeRpcCall?.args[0] as Record<string, unknown> | undefined)?.p_session_id === generated.id);
  }

  {
    const { client } = createMockSupabase();
    const program = createCalendarProgram();
    const id = await saveGeneratedProgram('user-1', program, { client });
    const protectedSession = program.sessions.find((session) => session.protectedAnchor);
    let protectedBlocked = false;
    try {
      await updateProgramSession('user-1', id!, protectedSession!.id, {
        scheduledDate: '2026-05-07',
        status: 'rescheduled',
      }, { client });
    } catch (error) {
      protectedBlocked = error instanceof ValidationError;
    }
    assert('protected workouts cannot be moved through program persistence', protectedBlocked);
  }

  {
    const program = createCalendarProgram();
    const week = program.weeks[0]!;
    const generated = firstGeneratedSession(program);
    const hardSessions = [1, 2, 3, 4].map((dayIndex) => ({
      ...generated,
      id: `${generated.id}:hard:${dayIndex}`,
      dayIndex,
      protectedAnchor: true,
      workout: null,
      plannedIntensity: 'hard' as const,
    }));
    const invalid: GeneratedProgram = {
      ...program,
      weeks: [{ ...week, sessions: hardSessions }, ...program.weeks.slice(1)],
      sessions: [...hardSessions, ...program.sessions.filter((session) => session.weekIndex !== week.weekIndex)],
    };
    const validation = validateGeneratedProgram(invalid);
    assert('program validation catches too many hard days', !validation.valid && validation.errors.some((error) => error.includes('too many hard sessions')));
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
