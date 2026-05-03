import {
  getWorkoutDescription,
  getWorkoutProgrammingCatalog,
  completeGeneratedWorkoutSession,
  generateGeneratedWorkoutSessionForUser,
  generatePreviewWorkout,
  generateWeeklyProgramForUser,
  generateWorkoutForUser,
  loadActiveGeneratedWorkoutSession,
  loadGeneratedWorkoutCompletionSurfacesForUser,
  logWorkoutCompletion,
  pauseGeneratedWorkoutSession,
  resumeGeneratedWorkoutSession,
  startGeneratedWorkoutSession,
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

function createMockSupabase(extraRows: Record<string, Record<string, unknown>[]> = {}) {
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
    generated_workouts: [],
    generated_workout_exercises: [],
    generated_workout_session_lifecycle: [],
    workout_completions: [],
    exercise_completion_results: [],
    progression_decisions: [],
    recommendation_feedback: [],
    user_programs: [],
    ...extraRows,
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
      const state: { operation: 'select' | 'delete'; filters: Array<[string, unknown]>; inFilters: Array<[string, unknown[]]>; limit?: number } = { operation: 'select', filters: [], inFilters: [] };
      const selectRows = () => (rows[table] ?? [])
        .filter((row) => state.filters.every(([column, value]) => row[column] === value))
        .filter((row) => state.inFilters.every(([column, values]) => values.includes(row[column])))
        .slice(0, state.limit ?? undefined);
      const builder = {
        select(...args: unknown[]) {
          calls.push({ table, method: 'select', args });
          state.operation = 'select';
          return builder;
        },
        insert(...args: unknown[]) {
          calls.push({ table, method: 'insert', args });
          const inserted = withIds(table, args[0]);
          rows[table] = [...(rows[table] ?? []), ...inserted];
          return terminal({ data: Array.isArray(args[0]) ? inserted : inserted[0], error: null });
        },
        delete(...args: unknown[]) {
          calls.push({ table, method: 'delete', args });
          state.operation = 'delete';
          return builder;
        },
        upsert(...args: unknown[]) {
          calls.push({ table, method: 'upsert', args });
          applyUpsert(table, args[0], args);
          return Promise.resolve({ data: null, error: null });
        },
        eq(...args: unknown[]) {
          calls.push({ table, method: 'eq', args });
          state.filters.push([args[0] as string, args[1]]);
          if (state.operation === 'delete') return Promise.resolve({ data: null, error: null });
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
          return Promise.resolve({ data: selectRows()[0] ?? null, error: null });
        },
        then(resolve: (value: unknown) => void, reject: (reason?: unknown) => void) {
          return Promise.resolve({ data: selectRows(), error: null }).then(resolve, reject);
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
    const startedLifecycle = await startGeneratedWorkoutSession('user-1', session.generatedWorkoutId, {
      client,
      occurredAt: '2026-05-01T12:00:00.000Z',
      activeBlockId: session.workout.blocks[0]?.id,
    });
    const pausedLifecycle = await pauseGeneratedWorkoutSession('user-1', session.generatedWorkoutId, {
      client,
      occurredAt: '2026-05-01T12:10:00.000Z',
    });
    const resumedLifecycle = await resumeGeneratedWorkoutSession('user-1', session.generatedWorkoutId, {
      client,
      occurredAt: '2026-05-01T12:15:00.000Z',
    });
    const activeLifecycle = await loadActiveGeneratedWorkoutSession('user-1', { client });
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
    const completionParentPayload = insertedPayload(calls, 'workout_completions') as Record<string, unknown> | undefined;
    assert('generated workout beta session persists parent and child exercise rows', session.persisted && session.generatedWorkoutId === 'generated_workouts-id' && Boolean(insertedPayload(calls, 'generated_workout_exercises')));
    assert('generated workout beta lifecycle persists inspected and start states', session.lifecycle?.persisted === true && session.lifecycle.lifecycle.status === 'inspected' && startedLifecycle.lifecycle.status === 'started');
    assert('generated workout beta lifecycle pause/resume stays durable and loadable', pausedLifecycle.lifecycle.status === 'paused' && resumedLifecycle.lifecycle.status === 'resumed' && activeLifecycle?.generatedWorkoutId === session.generatedWorkoutId);
    assert('generated workout beta completion persists generated source metadata', completionParentPayload?.source === 'generated_workout' && completionParentPayload?.completion_status === 'completed');
    assert('generated workout beta completion persists actual exercise work', completionChildPayload?.sets_completed === 2 && completionChildPayload?.reps_completed === 8);
    assert('generated workout beta completion saves completion, feedback, and preferences', result.workoutCompletionId === 'workout_completions-id' && result.feedbackId === 'recommendation_feedback-id' && calls.some((call) => call.table === 'user_exercise_preferences' && call.method === 'upsert'));
    assert('generated workout beta completion persists completed lifecycle state', result.lifecycle?.persisted === true && result.lifecycle.lifecycle.status === 'completed');
    assert('generated workout beta completion returns next progression', Boolean(result.progressionDecision.reason && result.progressionDecision.nextAdjustment));
  }

  {
    const localStarted = await startGeneratedWorkoutSession('local-user', null, {
      occurredAt: '2026-05-01T12:00:00.000Z',
    });
    assert('generated workout beta lifecycle keeps local fallback without persistence', localStarted.persisted === false && localStarted.lifecycle.status === 'started');
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
    const { client } = createMockSupabase({
      workout_completions: [{
        id: 'completion-generated-history',
        generated_workout_id: 'generated-history',
        user_id: 'user-1',
        source: 'generated_workout',
        workout_type_id: 'bodyweight_strength',
        goal_id: 'strength_foundation',
        completion_status: 'completed',
        substitutions_used: ['incline_push_up'],
        completed_at: '2026-05-01T12:00:00.000Z',
        planned_duration_minutes: 30,
        actual_duration_minutes: 28,
        session_rpe: 6,
        pain_score_before: 1,
        pain_score_after: 1,
        notes: 'Good fit.',
      }],
      exercise_completion_results: [
        { workout_completion_id: 'completion-generated-history', exercise_id: 'push_up', sets_completed: 3, sets_prescribed: 3, reps_completed: 24, reps_prescribed: 24, actual_rpe: 6, completed_as_prescribed: true },
      ],
      progression_decisions: [{
        workout_completion_id: 'completion-generated-history',
        direction: 'progress',
        reason: 'Clean completion.',
        next_adjustment: 'Add one rep.',
        safety_flags: [],
        payload: {
          direction: 'progress',
          reason: 'Clean completion.',
          nextAdjustment: 'Add one rep.',
          safetyFlags: [],
        },
      }],
    });
    const surfaces = await loadGeneratedWorkoutCompletionSurfacesForUser('user-1', { client });
    assert('generated workout completion surfaces load completion and progression', surfaces.length === 1 && surfaces[0].completion.generatedWorkoutId === 'generated-history' && surfaces[0].progressionDecision?.nextAdjustment === 'Add one rep.');
  }

  {
    const { client, calls } = createMockSupabase({
      workout_completions: [
        {
          id: 'recent-1',
          user_id: 'user-1',
          workout_type_id: 'strength',
          goal_id: 'beginner_strength',
          generated_workout_id: 'generated-recent-1',
          completed_at: '2026-04-29T12:00:00.000Z',
          planned_duration_minutes: 30,
          actual_duration_minutes: 30,
          session_rpe: 9,
          pain_score_before: 1,
          pain_score_after: 1,
        },
        {
          id: 'recent-2',
          user_id: 'user-1',
          workout_type_id: 'strength',
          goal_id: 'beginner_strength',
          generated_workout_id: 'generated-recent-2',
          completed_at: '2026-04-27T12:00:00.000Z',
          planned_duration_minutes: 30,
          actual_duration_minutes: 30,
          session_rpe: 9,
          pain_score_before: 1,
          pain_score_after: 1,
        },
      ],
      exercise_completion_results: [
        { workout_completion_id: 'recent-1', exercise_id: 'goblet_squat', sets_completed: 3, sets_prescribed: 3, reps_completed: 10, reps_prescribed: 10, actual_rpe: 9, completed_as_prescribed: true },
        { workout_completion_id: 'recent-2', exercise_id: 'goblet_squat', sets_completed: 3, sets_prescribed: 3, reps_completed: 10, reps_prescribed: 10, actual_rpe: 9, completed_as_prescribed: true },
      ],
    });
    const completion: WorkoutCompletionLog = {
      workoutId: 'workout-history-current',
      completedAt: '2026-05-01T12:00:00.000Z',
      workoutTypeId: 'strength',
      goalId: 'beginner_strength',
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      sessionRpe: 8,
      painScoreBefore: 1,
      painScoreAfter: 1,
      exerciseResults: [
        { exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 10, repsPrescribed: 10, actualRpe: 8, completedAsPrescribed: true },
      ],
    };
    const result = await logWorkoutCompletion('user-1', completion, { client, generatedWorkoutId: 'generated-current' });
    assert('logWorkoutCompletion loads recent history before progression', calls.some((call) => call.table === 'workout_completions' && call.method === 'select') && calls.some((call) => call.table === 'exercise_completion_results' && call.method === 'select'));
    assert('history-based progression uses high RPE trend', result.progressionDecision.direction === 'deload' && result.nextSessionRecommendation.length > 0);
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

  {
    const { client, calls } = createMockSupabase({ user_programs: [] });
    const program = await generateWeeklyProgramForUser('user-1', {
      goalId: 'beginner_strength',
      sessionsPerWeek: 2,
      desiredProgramLengthWeeks: 2,
      equipmentIds: ['bodyweight', 'dumbbells'],
      experienceLevel: 'beginner',
      startDate: '2026-05-04',
      calendarEvents: [{
        id: 'busy-day',
        date: '2026-05-04',
        label: 'Calendar hold',
        source: 'calendar',
      }],
    }, { client, persistGeneratedProgram: true });
    const payload = insertedPayload(calls, 'user_programs') as Record<string, unknown>;
    assert('generateWeeklyProgramForUser can persist calendar-aware programs behind service option', program.persistenceId === 'user_programs-id' && payload.user_id === 'user-1' && calls.some((call) => call.table === 'user_programs' && call.method === 'upsert'));
    assert('calendar-aware service programs expose schedule warnings', Boolean(program.scheduleStartDate) && (program.calendarWarnings?.length ?? 0) > 0);
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
