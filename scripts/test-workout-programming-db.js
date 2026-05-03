#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const projectRoot = path.resolve(__dirname, '..');

function registerTypeScriptHook() {
  const compile = (filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    return ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: true,
        jsx: ts.JsxEmit.React,
      },
      fileName: filename,
    }).outputText;
  };

  require.extensions['.ts'] = (module, filename) => {
    const js = compile(filename);
    module._compile(js, filename);
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function isLocalSupabaseUrl(value) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1'
      || hostname.endsWith('.local');
  } catch {
    return false;
  }
}

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

if (process.env.WORKOUT_DB_TESTS !== '1') {
  console.error([
    'Workout-programming live DB smoke tests are disabled.',
    'Set WORKOUT_DB_TESTS=1 to run against a local or dedicated test Supabase instance.',
  ].join('\n'));
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error([
    'Missing Supabase workout DB smoke environment.',
    '',
    'Required:',
    '- SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL',
    '- SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    '- SUPABASE_SERVICE_ROLE_KEY',
  ].join('\n'));
  process.exit(1);
}

if (!isLocalSupabaseUrl(supabaseUrl) && process.env.WORKOUT_DB_ALLOW_REMOTE !== '1') {
  console.error([
    `Refusing to run workout DB smoke tests against remote Supabase URL: ${supabaseUrl}`,
    'Use a local instance, or set WORKOUT_DB_ALLOW_REMOTE=1 only for a dedicated non-production test project.',
  ].join('\n'));
  process.exit(1);
}

registerTypeScriptHook();

const {
  ValidationError,
  loadGeneratedWorkout,
  loadUserProgram,
  loadUserWorkoutProfile,
  logWorkoutCompletionWithExerciseResults,
  saveGeneratedProgram,
  saveGeneratedWorkoutWithExercises,
  saveProgressionDecision,
  saveRecommendationFeedback,
  upsertUserEquipment,
  upsertUserSafetyFlags,
  upsertUserWorkoutProfile,
} = require('../lib/performance-engine/workout-programming/persistenceService.ts');

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, clientOptions);
const anonymousClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

const runId = `workout_db_${Date.now()}_${randomUUID().slice(0, 8)}`;
const ids = {
  workoutType: `${runId}_type`,
  goal: `${runId}_goal`,
  format: `${runId}_format`,
  movement: `${runId}_movement`,
  muscle: `${runId}_muscle`,
  equipment: `${runId}_equipment`,
  trackingMetric: `${runId}_metric`,
  prescription: `${runId}_prescription`,
  exercise: `${runId}_exercise`,
  safetyFlag: `${runId}_safety`,
  template: `${runId}_session`,
  program: `${runId}_program`,
};

const context = {
  users: [],
  generatedWorkoutIds: [],
  workoutCompletionIds: [],
  progressionDecisionIds: [],
  feedbackIds: [],
  programIds: [],
};

let passed = 0;
let failed = 0;

function assert(label, condition, details) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
    return;
  }
  failed += 1;
  console.error(`  FAIL ${label}`);
  if (details) console.error(`       ${details}`);
}

function requireNoError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function testDate(offsetDays = 0) {
  const date = new Date(Date.UTC(2026, 4, 4 + offsetDays));
  return date.toISOString().slice(0, 10);
}

async function createTestUser(suffix) {
  const email = `athleticore-${runId}-${suffix}@example.com`;
  const password = `Athleticore-${runId}-${suffix}-Password-42!`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      workout_db_test_run_id: runId,
      workout_db_test_user: suffix,
    },
  });
  requireNoError(`create ${suffix} test user`, error);
  const userId = data.user && data.user.id;
  if (!userId) throw new Error(`create ${suffix} test user: Supabase did not return a user id`);

  const client = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  const signInResult = await client.auth.signInWithPassword({ email, password });
  requireNoError(`sign in ${suffix} test user`, signInResult.error);
  context.users.push({ id: userId, email });
  return { id: userId, email, client };
}

async function insertStaticFixtures() {
  const writes = [
    ['workout_types', {
      id: ids.workoutType,
      label: 'Workout DB Smoke Type',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
    ['workout_formats', {
      id: ids.format,
      label: 'Workout DB Smoke Format',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
    ['movement_patterns', {
      id: ids.movement,
      label: 'Workout DB Smoke Movement',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
    ['muscle_groups', {
      id: ids.muscle,
      label: 'Workout DB Smoke Muscle',
      region: 'full_body',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
    ['equipment_types', {
      id: ids.equipment,
      label: 'Workout DB Smoke Equipment',
      category: 'bodyweight',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
    ['tracking_metrics', {
      id: ids.trackingMetric,
      label: 'Workout DB Smoke Metric',
      summary: 'Temporary workout-programming DB smoke fixture.',
      sort_order: 9999,
    }],
  ];

  for (const [table, payload] of writes) {
    const { error } = await serviceClient.from(table).insert(payload);
    requireNoError(`insert static fixture ${table}`, error);
  }

  requireNoError('insert training goal fixture', (await serviceClient.from('training_goals').insert({
    id: ids.goal,
    label: 'Workout DB Smoke Goal',
    summary: 'Temporary workout-programming DB smoke fixture.',
    default_workout_type_id: ids.workoutType,
    sort_order: 9999,
  })).error);

  requireNoError('insert prescription template fixture', (await serviceClient.from('prescription_templates').insert({
    id: ids.prescription,
    label: 'Workout DB Smoke Prescription',
    applies_to_workout_type_ids: [ids.workoutType],
    applies_to_goal_ids: [ids.goal],
    default_sets: 1,
    default_reps: '5',
    default_rpe: 5,
    rest_seconds: 30,
    tempo: 'controlled',
    intensity_cue: 'Stay smooth and repeatable.',
    kind: 'resistance',
    intensity_model: 'rpe',
    volume_model: 'sets_reps',
    rest_model: 'fixed',
    prescription_payload: { kind: 'resistance' },
    rollout_eligibility: 'preview',
  })).error);

  requireNoError('insert programming exercise fixture', (await serviceClient.from('programming_exercises').insert({
    id: ids.exercise,
    name: `Workout DB Smoke Exercise ${runId}`,
    short_name: 'DB Smoke Exercise',
    category: 'strength',
    summary: 'Temporary workout-programming DB smoke fixture.',
    coaching_summary: 'Temporary coaching fixture.',
    min_experience: 'beginner',
    intensity: 'low',
    impact: 'none',
    contraindication_flags: [],
    is_active: true,
    home_friendly: true,
    gym_friendly: true,
    beginner_friendly: true,
    setup_instructions: ['Set up in open space.'],
    execution_instructions: ['Move under control.'],
    breathing_instructions: ['Breathe steadily.'],
    safety_notes: ['Stop if pain becomes sharp or unusual.'],
    default_prescription_ranges: { sets: { target: 1 }, reps: { target: 5 } },
    rollout_eligibility: 'preview',
  })).error);

  requireNoError('insert safety flag fixture', (await serviceClient.from('safety_flags').insert({
    id: ids.safetyFlag,
    label: 'Workout DB Smoke Safety Flag',
    severity: 'caution',
    summary: 'Temporary workout-programming DB smoke fixture.',
    blocks_hard_training: false,
    contraindication_tags: [],
    rollout_eligibility: 'preview',
  })).error);
}

function generatedExercise(blockId, name, rpe) {
  return {
    exerciseId: ids.exercise,
    name,
    blockId,
    movementPatternIds: [ids.movement],
    primaryMuscleIds: [ids.muscle],
    equipmentIds: [ids.equipment],
    prescription: {
      sets: 1,
      reps: '5',
      durationSeconds: null,
      durationMinutes: null,
      targetRpe: rpe,
      restSeconds: 30,
      tempo: 'controlled',
      intensityCue: 'Keep the effort smooth and repeatable.',
      kind: 'resistance',
      payload: {
        kind: 'resistance',
        sets: { target: 1 },
        reps: '5',
        repRange: { target: 5 },
        loadGuidance: 'Bodyweight only for this smoke test.',
        intensityModel: 'rpe',
        RPE: { target: rpe },
        RIR: { target: 4 },
        restSecondsRange: { target: 30 },
        tempo: 'controlled',
        effortGuidance: 'Leave several reps in reserve.',
        mainLiftVsAccessory: blockId === 'main' ? 'main_lift' : 'accessory',
        progressionRuleIds: [],
      },
    },
    trackingMetricIds: [ids.trackingMetric],
    explanation: 'Temporary generated workout exercise for live DB smoke testing.',
    substitutions: [],
    scalingOptions: {
      down: 'Reduce range of motion.',
      up: 'Add a slower lowering phase.',
    },
    coachingCues: ['Move with control.', 'Keep breathing steady.'],
    commonMistakes: ['Rushing reps.'],
  };
}

function generatedWorkout(ownerLabel) {
  return {
    schemaVersion: 'generated-workout-v1',
    workoutTypeId: ids.workoutType,
    goalId: ids.goal,
    trainingGoalLabel: 'Workout DB Smoke Goal',
    templateId: ids.template,
    formatId: ids.format,
    experienceLevel: 'beginner',
    sessionIntent: `Live DB smoke ${ownerLabel}`,
    userFacingSummary: 'A temporary generated workout used to verify persistence and RLS.',
    requestedDurationMinutes: 20,
    estimatedDurationMinutes: 20,
    equipmentIds: [ids.equipment],
    safetyFlags: [],
    blocks: [
      {
        id: 'warmup',
        kind: 'warmup',
        title: 'Warm-up',
        estimatedDurationMinutes: 5,
        exercises: [generatedExercise('warmup', 'DB Smoke Warm-up', 4)],
      },
      {
        id: 'main',
        kind: 'main',
        title: 'Main work',
        estimatedDurationMinutes: 10,
        exercises: [generatedExercise('main', 'DB Smoke Main Work', 6)],
      },
      {
        id: 'cooldown',
        kind: 'cooldown',
        title: 'Cooldown',
        estimatedDurationMinutes: 5,
        exercises: [generatedExercise('cooldown', 'DB Smoke Cooldown', 3)],
      },
    ],
    trackingMetricIds: [ids.trackingMetric],
    trackingMetrics: [ids.trackingMetric],
    successCriteria: ['Finish without sharp or unusual pain.'],
    scalingOptions: {
      down: 'Reduce range of motion.',
      up: 'Slow the tempo.',
    },
    safetyNotes: ['Stop if pain becomes sharp or unusual.'],
    explanations: [`Created by ${ownerLabel} for live DB smoke testing.`],
    validation: {
      valid: true,
      isValid: true,
      errors: [],
      warnings: [],
      suggestedCorrections: [],
      userFacingMessages: [],
      failedRuleIds: [],
      decisionTrace: [],
    },
    decisionTrace: [{
      id: `${runId}_${ownerLabel}_trace`,
      step: 'db_smoke',
      reason: 'Temporary persistence smoke fixture.',
      selectedId: ids.exercise,
    }],
  };
}

function completionLog(generatedWorkoutId) {
  return {
    workoutId: generatedWorkoutId,
    completedAt: new Date().toISOString(),
    workoutTypeId: ids.workoutType,
    goalId: ids.goal,
    plannedDurationMinutes: 20,
    actualDurationMinutes: 20,
    sessionRpe: 6,
    readinessBefore: 'green',
    readinessAfter: 'green',
    painScoreBefore: 0,
    painScoreAfter: 0,
    notes: `Workout DB smoke ${runId}`,
    exerciseResults: [{
      exerciseId: ids.exercise,
      setsCompleted: 1,
      setsPrescribed: 1,
      repsCompleted: 5,
      repsPrescribed: 5,
      actualRpe: 6,
      targetRpe: 6,
      painScore: 0,
      completedAsPrescribed: true,
    }],
  };
}

function generatedProgram(workout) {
  const session = {
    id: `${runId}_session_1`,
    dayIndex: 1,
    weekIndex: 1,
    scheduledDate: testDate(),
    status: 'planned',
    phase: 'accumulation',
    protectedAnchor: false,
    label: 'Workout DB Smoke Session',
    workout,
    plannedIntensity: 'moderate',
    rationale: ['Temporary generated program smoke session.'],
  };
  const weeklyVolumeSummary = {
    weekIndex: 1,
    phase: 'accumulation',
    generatedSessionCount: 1,
    protectedSessionCount: 0,
    estimatedMinutes: 20,
    hardDayCount: 0,
    workoutTypeCounts: {
      [ids.workoutType]: 1,
    },
  };
  return {
    id: ids.program,
    status: 'active',
    startedAt: testDate(),
    scheduleStartDate: testDate(),
    scheduleEndDate: testDate(6),
    goalId: ids.goal,
    weekCount: 1,
    phase: 'accumulation',
    weeks: [{
      weekIndex: 1,
      phase: 'accumulation',
      sessions: [session],
      rationale: ['Temporary generated program smoke week.'],
      movementPatternBalance: {
        [ids.movement]: 1,
      },
      weeklyVolumeSummary,
      hardDayCount: 0,
      validationWarnings: [],
    }],
    sessions: [session],
    rationale: ['Temporary generated program smoke test.'],
    movementPatternBalance: {
      weekly: {
        1: {
          [ids.movement]: 1,
        },
      },
      programTotal: {
        [ids.movement]: 1,
      },
      warnings: [],
    },
    weeklyVolumeSummary: [weeklyVolumeSummary],
    hardDayCount: 0,
    progressionPlan: ['Repeat this smoke fixture only inside the test run.'],
    explanations: ['Temporary generated program smoke test.'],
    validationWarnings: [],
  };
}

async function selectRows(client, table, match) {
  let query = client.from(table).select('*');
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }
  const { data, error } = await query;
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return data || [];
}

async function expectVisible(client, label, table, match) {
  const rows = await selectRows(client, table, match);
  assert(label, rows.length > 0, `Expected at least one row from ${table}`);
  return rows;
}

async function expectHidden(client, label, table, match) {
  const rows = await selectRows(client, table, match);
  assert(label, rows.length === 0, `Expected no rows from ${table}; received ${rows.length}`);
}

async function cleanup() {
  async function serviceDelete(label, promise) {
    const { error } = await promise;
    if (error) console.warn(`  WARN cleanup ${label}: ${error.message}`);
  }

  async function deleteByIds(table, rowIds) {
    if (!rowIds || rowIds.length === 0) return;
    await serviceDelete(table, serviceClient.from(table).delete().in('id', rowIds));
  }

  await deleteByIds('progression_decisions', context.progressionDecisionIds);
  await deleteByIds('recommendation_feedback', context.feedbackIds);
  await deleteByIds('workout_completions', context.workoutCompletionIds);
  await deleteByIds('user_programs', context.programIds);
  await deleteByIds('generated_workouts', context.generatedWorkoutIds);

  for (const user of context.users) {
    await serviceDelete('user_training_profiles', serviceClient.from('user_training_profiles').delete().eq('user_id', user.id));
    await serviceDelete('user_equipment', serviceClient.from('user_equipment').delete().eq('user_id', user.id));
    await serviceDelete('user_safety_flags', serviceClient.from('user_safety_flags').delete().eq('user_id', user.id));
  }

  await serviceDelete('safety_flags', serviceClient.from('safety_flags').delete().eq('id', ids.safetyFlag));
  await serviceDelete('programming_exercises', serviceClient.from('programming_exercises').delete().eq('id', ids.exercise));
  await serviceDelete('prescription_templates', serviceClient.from('prescription_templates').delete().eq('id', ids.prescription));
  await serviceDelete('tracking_metrics', serviceClient.from('tracking_metrics').delete().eq('id', ids.trackingMetric));
  await serviceDelete('training_goals', serviceClient.from('training_goals').delete().eq('id', ids.goal));
  await serviceDelete('equipment_types', serviceClient.from('equipment_types').delete().eq('id', ids.equipment));
  await serviceDelete('muscle_groups', serviceClient.from('muscle_groups').delete().eq('id', ids.muscle));
  await serviceDelete('movement_patterns', serviceClient.from('movement_patterns').delete().eq('id', ids.movement));
  await serviceDelete('workout_formats', serviceClient.from('workout_formats').delete().eq('id', ids.format));
  await serviceDelete('workout_types', serviceClient.from('workout_types').delete().eq('id', ids.workoutType));

  for (const user of context.users) {
    const { error } = await serviceClient.auth.admin.deleteUser(user.id);
    if (error) console.warn(`  WARN cleanup auth user ${user.email}: ${error.message}`);
  }
}

async function runForUser(user, ownerLabel) {
  await upsertUserWorkoutProfile(user.id, {
    experienceLevel: 'beginner',
    preferredDurationMinutes: 20,
    readinessBand: 'green',
  }, { client: user.client });
  const profile = await loadUserWorkoutProfile(user.id, { client: user.client });
  assert(`${ownerLabel} user profile upsert/read works`, profile.userId === user.id && profile.experienceLevel === 'beginner');

  await upsertUserEquipment(user.id, [ids.equipment], { client: user.client });
  const equipmentRows = await expectVisible(user.client, `${ownerLabel} user equipment upsert writes rows`, 'user_equipment', {
    user_id: user.id,
    equipment_type_id: ids.equipment,
  });
  assert(`${ownerLabel} user equipment upsert avoids duplicate rows`, equipmentRows.length === 1);

  await upsertUserSafetyFlags(user.id, [ids.safetyFlag], { client: user.client });
  const safetyRows = await expectVisible(user.client, `${ownerLabel} user safety flag upsert writes rows`, 'user_safety_flags', {
    user_id: user.id,
    safety_flag_id: ids.safetyFlag,
  });
  assert(`${ownerLabel} user safety flag upsert avoids duplicate rows`, safetyRows.length === 1);

  const workout = generatedWorkout(ownerLabel);
  const generatedWorkoutId = await saveGeneratedWorkoutWithExercises(user.id, workout, { client: user.client });
  context.generatedWorkoutIds.push(generatedWorkoutId);
  assert(`${ownerLabel} generated workout save returns id`, typeof generatedWorkoutId === 'string' && generatedWorkoutId.length > 0);

  await expectVisible(serviceClient, `${ownerLabel} generated workout parent row exists`, 'generated_workouts', { id: generatedWorkoutId });
  const childRows = await expectVisible(serviceClient, `${ownerLabel} generated workout exercises save`, 'generated_workout_exercises', {
    generated_workout_id: generatedWorkoutId,
  });
  assert(`${ownerLabel} generated workout exercises include all blocks`, childRows.length === workout.blocks.length);

  const loadedWorkout = await loadGeneratedWorkout(user.id, generatedWorkoutId, { client: user.client });
  assert(`${ownerLabel} generated workout load returns persisted payload`, loadedWorkout && loadedWorkout.sessionIntent === workout.sessionIntent);

  const completionId = await logWorkoutCompletionWithExerciseResults(user.id, completionLog(generatedWorkoutId), {
    client: user.client,
    generatedWorkoutId,
  });
  context.workoutCompletionIds.push(completionId);
  assert(`${ownerLabel} workout completion save returns id`, typeof completionId === 'string' && completionId.length > 0);
  await expectVisible(serviceClient, `${ownerLabel} workout completion row exists`, 'workout_completions', { id: completionId });
  await expectVisible(serviceClient, `${ownerLabel} exercise completion result row exists`, 'exercise_completion_results', {
    workout_completion_id: completionId,
  });

  const progressionId = await saveProgressionDecision(user.id, {
    direction: 'repeat',
    reason: 'Live DB smoke completion was neutral.',
    nextAdjustment: 'Repeat the same smoke dose.',
    safetyFlags: [],
    userMessage: 'Repeat this test fixture only inside smoke testing.',
  }, {
    client: user.client,
    workoutCompletionId: completionId,
  });
  context.progressionDecisionIds.push(progressionId);
  assert(`${ownerLabel} progression decision save returns id`, typeof progressionId === 'string' && progressionId.length > 0);
  await expectVisible(serviceClient, `${ownerLabel} progression decision row exists`, 'progression_decisions', { id: progressionId });

  const feedbackId = await saveRecommendationFeedback(user.id, {
    generatedWorkoutId,
    rating: 4,
    notes: `Live DB smoke feedback ${ownerLabel}`,
  }, { client: user.client });
  context.feedbackIds.push(feedbackId);
  assert(`${ownerLabel} recommendation feedback save returns id`, typeof feedbackId === 'string' && feedbackId.length > 0);

  const program = generatedProgram(workout);
  const programId = await saveGeneratedProgram(user.id, program, { client: user.client });
  context.programIds.push(programId);
  assert(`${ownerLabel} generated program save returns id`, typeof programId === 'string' && programId.length > 0);
  const loadedProgram = await loadUserProgram(user.id, programId, { client: user.client });
  assert(`${ownerLabel} generated program load returns persisted payload`, loadedProgram && loadedProgram.persistenceId === programId && loadedProgram.sessions.length === 1);

  return {
    workout,
    generatedWorkoutId,
    completionId,
    progressionId,
    feedbackId,
    programId,
  };
}

async function expectInvalidPayloadRejected(user) {
  const invalidWorkout = {
    ...generatedWorkout('invalid'),
    schemaVersion: 'bad-schema',
  };
  let rejected = false;
  try {
    await saveGeneratedWorkoutWithExercises(user.id, invalidWorkout, { client: user.client });
  } catch (error) {
    rejected = error instanceof ValidationError || /schemaVersion|invalid persistence payload/i.test(error.message);
  }
  assert('invalid generated workout payload is rejected before DB persistence', rejected);
}

async function expectRlsIsolation(userA, userB, userBRows) {
  await expectHidden(userA.client, 'User A cannot select User B generated_workouts', 'generated_workouts', { id: userBRows.generatedWorkoutId });
  await expectHidden(userA.client, 'User A cannot select User B generated_workout_exercises through parent', 'generated_workout_exercises', {
    generated_workout_id: userBRows.generatedWorkoutId,
  });
  await expectHidden(userA.client, 'User A cannot select User B workout_completions', 'workout_completions', { id: userBRows.completionId });
  await expectHidden(userA.client, 'User A cannot select User B exercise_completion_results through parent', 'exercise_completion_results', {
    workout_completion_id: userBRows.completionId,
  });
  await expectHidden(userA.client, 'User A cannot select User B progression_decisions through completion', 'progression_decisions', {
    id: userBRows.progressionId,
  });
  await expectHidden(userA.client, 'User A cannot select User B recommendation_feedback', 'recommendation_feedback', {
    id: userBRows.feedbackId,
  });
  await expectHidden(userA.client, 'User A cannot select User B user_programs', 'user_programs', { id: userBRows.programId });
  await expectHidden(anonymousClient, 'Anonymous cannot read User B generated_workouts', 'generated_workouts', { id: userBRows.generatedWorkoutId });
  await expectHidden(anonymousClient, 'Anonymous cannot read User B completions', 'workout_completions', { id: userBRows.completionId });
  await expectVisible(serviceClient, 'Service role can read User B generated_workouts for server context', 'generated_workouts', { id: userBRows.generatedWorkoutId });

  let blockedByRls = false;
  try {
    await loadGeneratedWorkout(userB.id, userBRows.generatedWorkoutId, { client: userA.client });
  } catch (error) {
    blockedByRls = /not found|not.*found/i.test(error.message);
  }
  assert('Persistence load cannot bypass RLS with another user id', blockedByRls);
}

async function run() {
  console.log('\n-- workout programming live DB smoke --');
  console.log(`Test run id: ${runId}`);

  try {
    await insertStaticFixtures();
    const staticRows = await expectVisible(anonymousClient, 'Anonymous can read static workout_types catalog table', 'workout_types', {
      id: ids.workoutType,
    });
    assert('Static catalog read returns expected fixture id', staticRows[0] && staticRows[0].id === ids.workoutType);

    const userA = await createTestUser('a');
    const userB = await createTestUser('b');

    const userARows = await runForUser(userA, 'User A');
    const userBRows = await runForUser(userB, 'User B');
    await expectInvalidPayloadRejected(userA);
    await expectRlsIsolation(userA, userB, userBRows);

    assert('User A generated workout remains readable after User B writes', Boolean(await loadGeneratedWorkout(userA.id, userARows.generatedWorkoutId, { client: userA.client })));

    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
