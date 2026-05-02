#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const projectRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error([
    'Missing Supabase RLS test environment.',
    '',
    'Required:',
    '- SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL',
    '- SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    '- SUPABASE_SERVICE_ROLE_KEY',
    '',
    'For local Supabase, run `npx supabase status` and copy the API URL, anon key, and service_role key.',
  ].join('\n'));
  process.exit(1);
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
};

const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, clientOptions);
const anonymousClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

const runId = `rls_${Date.now()}_${randomUUID().slice(0, 8)}`;
const ids = {
  workoutType: `${runId}_workout_type`,
  goal: `${runId}_goal`,
  format: `${runId}_format`,
  movementPattern: `${runId}_movement`,
  muscleGroup: `${runId}_muscle`,
  equipment: `${runId}_equipment`,
  prescription: `${runId}_prescription`,
  exercise: `${runId}_exercise`,
  safetyFlag: `${runId}_safety`,
};

const context = {
  users: [],
  userClients: {},
  generatedWorkoutIds: [],
  generatedWorkoutExerciseIds: [],
  workoutCompletionIds: [],
  exerciseCompletionResultIds: [],
  progressionDecisionIds: [],
  directRowIdsByTable: {},
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
  if (details) {
    console.error(`       ${details}`);
  }
}

function requireNoError(label, error) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function createTestUser(suffix) {
  const email = `athleticore-${runId}-${suffix}@example.com`;
  const password = `Athleticore-${runId}-${suffix}-Password-42!`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      rls_test_run_id: runId,
      rls_test_user: suffix,
    },
  });
  requireNoError(`create ${suffix} test user`, error);

  const userId = data.user?.id;
  if (!userId) {
    throw new Error(`create ${suffix} test user: Supabase did not return a user id`);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  const signInResult = await client.auth.signInWithPassword({ email, password });
  requireNoError(`sign in ${suffix} test user`, signInResult.error);

  context.users.push({ id: userId, email });
  context.userClients[suffix] = client;

  return { id: userId, email, client };
}

async function insertStaticCatalogFixtures() {
  const upserts = [
    serviceClient.from('workout_types').upsert({
      id: ids.workoutType,
      label: 'RLS Test Strength',
      summary: 'Temporary static fixture for workout-programming RLS tests.',
      sort_order: 9999,
    }),
    serviceClient.from('workout_formats').upsert({
      id: ids.format,
      label: 'RLS Test Format',
      summary: 'Temporary static fixture for workout-programming RLS tests.',
      sort_order: 9999,
    }),
    serviceClient.from('movement_patterns').upsert({
      id: ids.movementPattern,
      label: 'RLS Test Pattern',
      summary: 'Temporary static fixture for workout-programming RLS tests.',
      sort_order: 9999,
    }),
    serviceClient.from('muscle_groups').upsert({
      id: ids.muscleGroup,
      label: 'RLS Test Muscle',
      region: 'full_body',
      summary: 'Temporary static fixture for workout-programming RLS tests.',
      sort_order: 9999,
    }),
    serviceClient.from('equipment_types').upsert({
      id: ids.equipment,
      label: 'RLS Test Equipment',
      category: 'accessory',
      summary: 'Temporary static fixture for workout-programming RLS tests.',
      sort_order: 9999,
    }),
  ];

  for (const [index, upsert] of upserts.entries()) {
    const { error } = await upsert;
    requireNoError(`insert static fixture ${index + 1}`, error);
  }

  requireNoError('insert training goal fixture', (await serviceClient.from('training_goals').upsert({
    id: ids.goal,
    label: 'RLS Test Goal',
    summary: 'Temporary static fixture for workout-programming RLS tests.',
    default_workout_type_id: ids.workoutType,
    sort_order: 9999,
  })).error);

  requireNoError('insert prescription template fixture', (await serviceClient.from('prescription_templates').upsert({
    id: ids.prescription,
    label: 'RLS Test Prescription',
    applies_to_workout_type_ids: [ids.workoutType],
    default_sets: 2,
    default_reps: '8',
    default_rpe: 6,
    rest_seconds: 60,
    intensity_cue: 'Temporary RLS test prescription.',
    kind: 'resistance',
    intensity_model: 'rpe',
    volume_model: 'sets_reps',
    rest_model: 'fixed',
  })).error);

  requireNoError('insert programming exercise fixture', (await serviceClient.from('programming_exercises').upsert({
    id: ids.exercise,
    name: `RLS Test Exercise ${runId}`,
    short_name: 'RLS Exercise',
    category: 'strength',
    summary: 'Temporary static fixture for workout-programming RLS tests.',
    coaching_summary: 'Temporary coaching fixture.',
    min_experience: 'beginner',
    intensity: 'low',
    impact: 'none',
    default_prescription_template_id: ids.prescription,
    contraindication_flags: [],
    is_active: true,
  })).error);

  requireNoError('insert safety flag fixture', (await serviceClient.from('safety_flags').upsert({
    id: ids.safetyFlag,
    label: 'RLS Test Safety Flag',
    severity: 'caution',
    summary: 'Temporary static fixture for workout-programming RLS tests.',
    blocks_hard_training: false,
    contraindication_tags: [],
  })).error);
}

async function insertRowsForUser(user, suffix) {
  const generatedWorkoutId = randomUUID();
  const generatedWorkoutExerciseId = randomUUID();
  const workoutCompletionId = randomUUID();
  const exerciseCompletionResultId = randomUUID();
  const progressionDecisionId = randomUUID();

  context.generatedWorkoutIds.push(generatedWorkoutId);
  context.generatedWorkoutExerciseIds.push(generatedWorkoutExerciseId);
  context.workoutCompletionIds.push(workoutCompletionId);
  context.exerciseCompletionResultIds.push(exerciseCompletionResultId);
  context.progressionDecisionIds.push(progressionDecisionId);

  const directIds = {
    user_constraints: randomUUID(),
    user_pain_reports: randomUUID(),
    user_readiness_logs: randomUUID(),
    performance_observations: randomUUID(),
    recommendation_events: randomUUID(),
    user_programs: randomUUID(),
    protected_workouts: randomUUID(),
    phase_transitions: randomUUID(),
    recommendation_feedback: randomUUID(),
    recommendation_quality_scores: randomUUID(),
  };

  for (const [table, id] of Object.entries(directIds)) {
    context.directRowIdsByTable[table] = context.directRowIdsByTable[table] || [];
    context.directRowIdsByTable[table].push(id);
  }

  const write = async (label, promise) => {
    const { error } = await promise;
    requireNoError(label, error);
  };

  await write('insert generated workout', serviceClient.from('generated_workouts').insert({
    id: generatedWorkoutId,
    user_id: user.id,
    goal_id: ids.goal,
    requested_duration_minutes: 30,
    estimated_duration_minutes: 30,
    safety_flags: [],
    payload: { rlsTest: runId, owner: suffix },
    blocked: false,
  }));

  await write('insert generated workout exercise', serviceClient.from('generated_workout_exercises').insert({
    id: generatedWorkoutExerciseId,
    generated_workout_id: generatedWorkoutId,
    exercise_id: ids.exercise,
    block_id: 'main',
    prescription: { sets: 2, reps: 8 },
    substitutions: [],
    sort_order: 1,
  }));

  await write('insert user training profile', serviceClient.from('user_training_profiles').upsert({
    user_id: user.id,
    experience_level: 'beginner',
    preferred_duration_minutes: 30,
    readiness_band: 'green',
  }));

  await write('insert user equipment', serviceClient.from('user_equipment').upsert({
    user_id: user.id,
    equipment_type_id: ids.equipment,
  }));

  await write('insert user constraint', serviceClient.from('user_constraints').insert({
    id: directIds.user_constraints,
    user_id: user.id,
    constraint_type: 'rls_test',
    constraint_value: suffix,
  }));

  await write('insert user safety flag', serviceClient.from('user_safety_flags').upsert({
    user_id: user.id,
    safety_flag_id: ids.safetyFlag,
    source: 'rls_test',
  }));

  await write('insert pain report', serviceClient.from('user_pain_reports').insert({
    id: directIds.user_pain_reports,
    user_id: user.id,
    location: 'rls_test_knee',
    severity: 2,
  }));

  await write('insert readiness log', serviceClient.from('user_readiness_logs').insert({
    id: directIds.user_readiness_logs,
    user_id: user.id,
    readiness_band: 'green',
    notes: `RLS test ${suffix}`,
  }));

  await write('insert exercise preference', serviceClient.from('user_exercise_preferences').upsert({
    user_id: user.id,
    exercise_id: ids.exercise,
    preference: 'like',
  }));

  await write('insert workout completion', serviceClient.from('workout_completions').insert({
    id: workoutCompletionId,
    generated_workout_id: generatedWorkoutId,
    user_id: user.id,
    planned_duration_minutes: 30,
    actual_duration_minutes: 30,
    session_rpe: 6,
    pain_score_before: 1,
    pain_score_after: 1,
    notes: `RLS test ${suffix}`,
  }));

  await write('insert exercise completion result', serviceClient.from('exercise_completion_results').insert({
    id: exerciseCompletionResultId,
    workout_completion_id: workoutCompletionId,
    exercise_id: ids.exercise,
    sets_completed: 2,
    reps_completed: 16,
    actual_rpe: 6,
    pain_score: 1,
    completed_as_prescribed: true,
  }));

  await write('insert performance observation', serviceClient.from('performance_observations').insert({
    id: directIds.performance_observations,
    user_id: user.id,
    observation_kind: 'rls_test',
    payload: { owner: suffix },
  }));

  await write('insert progression decision', serviceClient.from('progression_decisions').insert({
    id: progressionDecisionId,
    workout_completion_id: workoutCompletionId,
    direction: 'repeat',
    reason: `RLS test ${suffix}`,
    next_adjustment: 'Keep next session unchanged.',
    safety_flags: [],
  }));

  await write('insert recommendation event', serviceClient.from('recommendation_events').insert({
    id: directIds.recommendation_events,
    user_id: user.id,
    event_kind: 'rls_test',
    decision_trace: [{ owner: suffix }],
  }));

  await write('insert user program', serviceClient.from('user_programs').insert({
    id: directIds.user_programs,
    user_id: user.id,
    goal_id: ids.goal,
    status: 'active',
    payload: { owner: suffix },
  }));

  await write('insert protected workout', serviceClient.from('protected_workouts').insert({
    id: directIds.protected_workouts,
    user_id: user.id,
    label: `RLS Test Protected ${suffix}`,
    day_index: 2,
    duration_minutes: 45,
    intensity: 'moderate',
  }));

  await write('insert phase transition', serviceClient.from('phase_transitions').insert({
    id: directIds.phase_transitions,
    user_id: user.id,
    from_phase: 'accumulation',
    to_phase: 'maintenance',
    reason: `RLS test ${suffix}`,
  }));

  await write('insert recommendation feedback', serviceClient.from('recommendation_feedback').insert({
    id: directIds.recommendation_feedback,
    user_id: user.id,
    generated_workout_id: generatedWorkoutId,
    rating: 4,
    notes: `RLS test ${suffix}`,
  }));

  await write('insert recommendation quality score', serviceClient.from('recommendation_quality_scores').insert({
    id: directIds.recommendation_quality_scores,
    user_id: user.id,
    score: 90,
    payload: { owner: suffix },
  }));

  return {
    generatedWorkoutId,
    generatedWorkoutExerciseId,
    workoutCompletionId,
    exerciseCompletionResultId,
    progressionDecisionId,
    directIds,
  };
}

async function selectRows(client, table, match) {
  const { data, error } = await client.from(table).select('*').match(match);
  if (error) {
    throw new Error(`${table} select failed: ${error.message}`);
  }

  return data || [];
}

async function expectVisible(client, label, table, match) {
  const rows = await selectRows(client, table, match);
  assert(label, rows.length > 0, `Expected at least one row from ${table}`);
}

async function expectHidden(client, label, table, match) {
  const rows = await selectRows(client, table, match);
  assert(label, rows.length === 0, `Expected no rows from ${table}; received ${rows.length}`);
}

function rowTargets(fixtures) {
  return [
    ['generated_workouts', { id: fixtures.generatedWorkoutId }],
    ['generated_workout_exercises', { id: fixtures.generatedWorkoutExerciseId }],
    ['user_training_profiles', { user_id: fixtures.userId }],
    ['user_equipment', { user_id: fixtures.userId, equipment_type_id: ids.equipment }],
    ['user_constraints', { id: fixtures.directIds.user_constraints }],
    ['user_safety_flags', { user_id: fixtures.userId, safety_flag_id: ids.safetyFlag }],
    ['user_pain_reports', { id: fixtures.directIds.user_pain_reports }],
    ['user_readiness_logs', { id: fixtures.directIds.user_readiness_logs }],
    ['user_exercise_preferences', { user_id: fixtures.userId, exercise_id: ids.exercise }],
    ['workout_completions', { id: fixtures.workoutCompletionId }],
    ['exercise_completion_results', { id: fixtures.exerciseCompletionResultId }],
    ['performance_observations', { id: fixtures.directIds.performance_observations }],
    ['progression_decisions', { id: fixtures.progressionDecisionId }],
    ['recommendation_events', { id: fixtures.directIds.recommendation_events }],
    ['user_programs', { id: fixtures.directIds.user_programs }],
    ['protected_workouts', { id: fixtures.directIds.protected_workouts }],
    ['phase_transitions', { id: fixtures.directIds.phase_transitions }],
    ['recommendation_feedback', { id: fixtures.directIds.recommendation_feedback }],
    ['recommendation_quality_scores', { id: fixtures.directIds.recommendation_quality_scores }],
  ];
}

async function expectUnauthorizedInsertFails() {
  const userAClient = context.userClients.a;
  const userB = context.users.find((user) => user.email.includes(`-${runId}-b@`));
  if (!userB) {
    throw new Error('Could not find User B for unauthorized insert tests');
  }

  const generatedWorkoutAttemptId = randomUUID();
  context.generatedWorkoutIds.push(generatedWorkoutAttemptId);
  const generatedWorkoutAttempt = await userAClient.from('generated_workouts').insert({
    id: generatedWorkoutAttemptId,
    user_id: userB.id,
    goal_id: ids.goal,
    requested_duration_minutes: 20,
    estimated_duration_minutes: 20,
    safety_flags: [],
    payload: { rlsTest: runId, attemptedOwner: 'b' },
    blocked: false,
  });

  assert(
    'User A cannot insert a generated_workouts row for User B',
    Boolean(generatedWorkoutAttempt.error),
    'Expected RLS WITH CHECK to reject cross-user generated workout insert',
  );

  const childAttemptId = randomUUID();
  context.generatedWorkoutExerciseIds.push(childAttemptId);
  const childAttempt = await userAClient.from('generated_workout_exercises').insert({
    id: childAttemptId,
    generated_workout_id: context.generatedWorkoutIds[1],
    exercise_id: ids.exercise,
    block_id: 'main',
    prescription: { sets: 1, reps: 5 },
    substitutions: [],
    sort_order: 99,
  });

  assert(
    'User A cannot insert generated_workout_exercises through User B parent',
    Boolean(childAttempt.error),
    'Expected parent-scoped RLS WITH CHECK to reject cross-user child insert',
  );
}

async function cleanup() {
  const serviceDelete = async (table, builder) => {
    const { error } = await builder;
    if (error) {
      console.warn(`  WARN cleanup ${table}: ${error.message}`);
    }
  };

  const deleteByIds = async (table, rowIds) => {
    if (!rowIds || rowIds.length === 0) {
      return;
    }

    await serviceDelete(table, serviceClient.from(table).delete().in('id', rowIds));
  };

  await deleteByIds('progression_decisions', context.progressionDecisionIds);
  await deleteByIds('exercise_completion_results', context.exerciseCompletionResultIds);
  await deleteByIds('recommendation_feedback', context.directRowIdsByTable.recommendation_feedback || []);
  await deleteByIds('workout_completions', context.workoutCompletionIds);
  await deleteByIds('generated_workout_exercises', context.generatedWorkoutExerciseIds);
  await deleteByIds('generated_workouts', context.generatedWorkoutIds);

  for (const [table, rowIds] of Object.entries(context.directRowIdsByTable)) {
    if (table === 'recommendation_feedback') {
      continue;
    }
    await deleteByIds(table, rowIds);
  }

  for (const user of context.users) {
    await serviceDelete('user_training_profiles', serviceClient.from('user_training_profiles').delete().eq('user_id', user.id));
    await serviceDelete('user_equipment', serviceClient.from('user_equipment').delete().eq('user_id', user.id));
    await serviceDelete('user_safety_flags', serviceClient.from('user_safety_flags').delete().eq('user_id', user.id));
    await serviceDelete('user_exercise_preferences', serviceClient.from('user_exercise_preferences').delete().eq('user_id', user.id));
  }

  await serviceDelete('safety_flags', serviceClient.from('safety_flags').delete().eq('id', ids.safetyFlag));
  await serviceDelete('programming_exercises', serviceClient.from('programming_exercises').delete().eq('id', ids.exercise));
  await serviceDelete('prescription_templates', serviceClient.from('prescription_templates').delete().eq('id', ids.prescription));
  await serviceDelete('training_goals', serviceClient.from('training_goals').delete().eq('id', ids.goal));
  await serviceDelete('equipment_types', serviceClient.from('equipment_types').delete().eq('id', ids.equipment));
  await serviceDelete('muscle_groups', serviceClient.from('muscle_groups').delete().eq('id', ids.muscleGroup));
  await serviceDelete('movement_patterns', serviceClient.from('movement_patterns').delete().eq('id', ids.movementPattern));
  await serviceDelete('workout_formats', serviceClient.from('workout_formats').delete().eq('id', ids.format));
  await serviceDelete('workout_types', serviceClient.from('workout_types').delete().eq('id', ids.workoutType));

  for (const user of context.users) {
    const { error } = await serviceClient.auth.admin.deleteUser(user.id);
    if (error) {
      console.warn(`  WARN cleanup auth user ${user.email}: ${error.message}`);
    }
  }
}

async function run() {
  console.log('\n-- workout programming live Supabase RLS --');
  console.log(`Test run id: ${runId}`);

  let userA;
  let userB;
  let userAFixtures;
  let userBFixtures;

  try {
    await insertStaticCatalogFixtures();
    userA = await createTestUser('a');
    userB = await createTestUser('b');

    userAFixtures = { userId: userA.id, ...(await insertRowsForUser(userA, 'a')) };
    userBFixtures = { userId: userB.id, ...(await insertRowsForUser(userB, 'b')) };

    for (const [table, match] of rowTargets(userAFixtures)) {
      await expectVisible(userA.client, `User A can select own ${table}`, table, match);
    }

    for (const [table, match] of rowTargets(userBFixtures)) {
      await expectVisible(userB.client, `User B can select own ${table}`, table, match);
      await expectHidden(userA.client, `User A cannot select User B ${table}`, table, match);
      await expectHidden(anonymousClient, `Anonymous cannot select user-specific ${table}`, table, match);
      await expectVisible(serviceClient, `Service role can select ${table}`, table, match);
    }

    await expectUnauthorizedInsertFails();

    await expectVisible(anonymousClient, 'Anonymous can read static workout_types catalog', 'workout_types', { id: ids.workoutType });
    await expectVisible(userA.client, 'Signed-in users can read static programming_exercises catalog', 'programming_exercises', { id: ids.exercise });

    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
