#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { assertLiveDbTestAllowed } = require('./workout-programming-db-test-guards.js');

const projectRoot = path.resolve(__dirname, '..');

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

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

assertLiveDbTestAllowed({
  label: 'Account deletion live smoke test',
  enableFlag: 'ACCOUNT_DELETION_DB_TESTS',
  allowRemoteFlag: 'ACCOUNT_DELETION_DB_ALLOW_REMOTE',
  supabaseUrl,
});

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error([
    'Missing Supabase account deletion smoke environment.',
    '',
    'Required:',
    '- SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL',
    '- SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    '- SUPABASE_SERVICE_ROLE_KEY',
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
const runId = `account_delete_${Date.now()}_${randomUUID().slice(0, 8)}`;
const testDate = '2026-05-04';
const nextDate = '2026-05-05';

const ids = {
  activityLog: randomUUID(),
  athleteProfile: randomUUID(),
  bodyMassSafetyCheck: randomUUID(),
  buildPhaseGoal: randomUUID(),
  dailyCheckin: randomUUID(),
  dailyNutritionSummary: randomUUID(),
  dailyTimeline: randomUUID(),
  exerciseCompletionResult: randomUUID(),
  exerciseLibrary: randomUUID(),
  exerciseOverloadHistory: randomUUID(),
  exercisePr: randomUUID(),
  favoriteFood: randomUUID(),
  fightCamp: randomUUID(),
  foodItem: randomUUID(),
  foodLog: randomUUID(),
  generatedWorkout: randomUUID(),
  generatedWorkoutExercise: randomUUID(),
  generatedWorkoutLifecycle: randomUUID(),
  gymProfile: randomUUID(),
  hydrationLog: randomUUID(),
  macroLedger: randomUUID(),
  performanceArchive: randomUUID(),
  performanceObservation: randomUUID(),
  phaseTransition: randomUUID(),
  progressionDecision: randomUUID(),
  protectedWorkout: randomUUID(),
  recommendationEvent: randomUUID(),
  recommendationFeedback: randomUUID(),
  recommendationQuality: randomUUID(),
  recurringActivity: randomUUID(),
  scheduledActivity: randomUUID(),
  trainingSession: randomUUID(),
  userConstraint: randomUUID(),
  userPainReport: randomUUID(),
  userProgram: randomUUID(),
  userReadinessLog: randomUUID(),
  userWalkthroughState: randomUUID(),
  weeklyPlanConfig: randomUUID(),
  weeklyPlanEntry: randomUUID(),
  weeklyTarget: randomUUID(),
  weightClassHistory: randomUUID(),
  weightClassPlan: randomUUID(),
  workoutCompletion: randomUUID(),
  workoutEffort: randomUUID(),
  workoutLog: randomUUID(),
  workoutSet: randomUUID(),
};

const staticIds = {
  workoutType: `${runId}_workout_type`,
  trainingGoal: `${runId}_training_goal`,
  equipmentType: `${runId}_equipment`,
  safetyFlag: `${runId}_safety_flag`,
  programmingExercise: `${runId}_programming_exercise`,
};

let testUser = null;
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

async function insertRow(table, row) {
  const { error } = await serviceClient.from(table).insert(row);
  requireNoError(`insert ${table}`, error);
}

async function updateRows(table, values, column, value) {
  const { error } = await serviceClient.from(table).update(values).eq(column, value);
  requireNoError(`update ${table}`, error);
}

async function deleteWhere(table, column, value) {
  const { error } = await serviceClient.from(table).delete().eq(column, value);
  if (error) console.warn(`  WARN cleanup ${table}: ${error.message}`);
}

async function createTestUser() {
  const email = `athleticore-${runId}@example.com`;
  const password = `Athleticore-${runId}-Password-42!`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_deletion_test_run_id: runId,
    },
  });
  requireNoError('create account deletion test user', error);

  const userId = data.user && data.user.id;
  if (!userId) throw new Error('create account deletion test user: missing user id');

  const userClient = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  const signIn = await userClient.auth.signInWithPassword({ email, password });
  requireNoError('sign in account deletion test user', signIn.error);

  const mirrorUpsert = await serviceClient
    .from('users')
    .upsert({ id: userId, email, role: 'athlete' }, { onConflict: 'id' });
  requireNoError('upsert public user mirror', mirrorUpsert.error);

  testUser = { id: userId, email, client: userClient };
  return testUser;
}

async function insertStaticFixtures() {
  await insertRow('workout_types', {
    id: staticIds.workoutType,
    label: 'Account Deletion Smoke Type',
    summary: 'Temporary account deletion smoke fixture.',
    sort_order: 9999,
  });
  await insertRow('training_goals', {
    id: staticIds.trainingGoal,
    label: 'Account Deletion Smoke Goal',
    summary: 'Temporary account deletion smoke fixture.',
    default_workout_type_id: staticIds.workoutType,
    sort_order: 9999,
  });
  await insertRow('equipment_types', {
    id: staticIds.equipmentType,
    label: 'Account Deletion Smoke Equipment',
    category: 'bodyweight',
    summary: 'Temporary account deletion smoke fixture.',
    sort_order: 9999,
  });
  await insertRow('safety_flags', {
    id: staticIds.safetyFlag,
    label: 'Account Deletion Smoke Safety Flag',
    severity: 'caution',
    summary: 'Temporary account deletion smoke fixture.',
    blocks_hard_training: false,
  });
  await insertRow('programming_exercises', {
    id: staticIds.programmingExercise,
    name: `Account Deletion Smoke Exercise ${runId}`,
    summary: 'Temporary account deletion smoke fixture.',
    coaching_summary: 'Move calmly and stop if anything feels wrong.',
    min_experience: 'beginner',
    intensity: 'low',
    impact: 'none',
    contraindication_flags: [],
  });
}

async function seedUserOwnedRows(userId) {
  await insertRow('gym_profiles', {
    id: ids.gymProfile,
    user_id: userId,
    name: 'Account deletion gym',
    equipment: [],
    is_default: true,
  });
  await insertRow('weekly_plan_config', {
    id: ids.weeklyPlanConfig,
    user_id: userId,
    preferred_gym_profile_id: ids.gymProfile,
  });
  await insertRow('daily_timeline', {
    id: ids.dailyTimeline,
    user_id: userId,
    date: testDate,
    block_type: 'S&C',
    planned_intensity: 4,
    status: 'Scheduled',
  });
  await insertRow('recurring_activities', {
    id: ids.recurringActivity,
    user_id: userId,
    activity_type: 'boxing',
    custom_label: 'Account deletion recurring',
    estimated_duration_min: 60,
    expected_intensity: 5,
    session_components: [],
    recurrence: { frequency: 'weekly' },
  });
  await insertRow('weekly_plan_entries', {
    id: ids.weeklyPlanEntry,
    user_id: userId,
    week_start_date: testDate,
    day_of_week: 1,
    date: testDate,
    slot: 'single',
    session_type: 'sc',
    estimated_duration_min: 45,
    status: 'planned',
  });
  await insertRow('scheduled_activities', {
    id: ids.scheduledActivity,
    user_id: userId,
    recurring_activity_id: ids.recurringActivity,
    weekly_plan_entry_id: ids.weeklyPlanEntry,
    date: testDate,
    activity_type: 'sc',
    estimated_duration_min: 45,
    expected_intensity: 5,
    session_components: [],
    source: 'manual',
    status: 'scheduled',
  });
  await updateRows('weekly_plan_entries', { scheduled_activity_id: ids.scheduledActivity }, 'id', ids.weeklyPlanEntry);
  await insertRow('activity_log', {
    id: ids.activityLog,
    scheduled_activity_id: ids.scheduledActivity,
    user_id: userId,
    date: testDate,
    component_type: 'sc',
    duration_min: 45,
    intensity: 5,
  });
  await insertRow('weekly_targets', {
    id: ids.weeklyTarget,
    user_id: userId,
  });
  await insertRow('fight_camps', {
    id: ids.fightCamp,
    user_id: userId,
    fight_date: '2026-07-01',
    camp_start_date: testDate,
    total_weeks: 8,
    status: 'active',
  });
  await insertRow('build_phase_goals', {
    id: ids.buildPhaseGoal,
    user_id: userId,
    goal_type: 'strength',
    goal_statement: 'Keep the smoke test strong.',
    target_metric: 'test_metric',
    status: 'active',
  });

  await insertRow('exercise_library', {
    id: ids.exerciseLibrary,
    user_id: userId,
    name: `Account deletion custom exercise ${runId}`,
    type: 'mobility',
    cns_load: 1,
    muscle_group: 'full_body',
    equipment: 'bodyweight',
  });
  await insertRow('workout_log', {
    id: ids.workoutLog,
    user_id: userId,
    date: testDate,
    timeline_block_id: ids.dailyTimeline,
    scheduled_activity_id: ids.scheduledActivity,
    weekly_plan_entry_id: ids.weeklyPlanEntry,
    gym_profile_id: ids.gymProfile,
    workout_type: 'strength',
    focus: 'full_body',
    total_volume: 100,
    total_sets: 1,
  });
  await insertRow('workout_set_log', {
    id: ids.workoutSet,
    workout_log_id: ids.workoutLog,
    exercise_library_id: ids.exerciseLibrary,
    set_number: 1,
    reps: 5,
    weight_lbs: 10,
  });
  await insertRow('workout_effort_log', {
    id: ids.workoutEffort,
    workout_log_id: ids.workoutLog,
    exercise_library_id: ids.exerciseLibrary,
    effort_kind: 'strength_set',
    effort_index: 1,
    target_snapshot: {},
    actual_snapshot: {},
  });
  await insertRow('exercise_pr_log', {
    id: ids.exercisePr,
    user_id: userId,
    exercise_library_id: ids.exerciseLibrary,
    pr_type: 'reps',
    value: 5,
    workout_log_id: ids.workoutLog,
    achieved_date: testDate,
  });
  await insertRow('exercise_overload_history', {
    id: ids.exerciseOverloadHistory,
    user_id: userId,
    exercise_library_id: ids.exerciseLibrary,
    date: testDate,
    best_set_weight: 10,
    best_set_reps: 5,
    total_volume: 50,
    working_sets: 1,
  });

  await insertRow('training_sessions', {
    id: ids.trainingSession,
    user_id: userId,
    date: nextDate,
    duration_minutes: 30,
    intensity_srpe: 4,
  });
  await insertRow('daily_checkins', {
    id: ids.dailyCheckin,
    user_id: userId,
    date: testDate,
    readiness: 4,
    sleep_quality: 4,
  });
  await insertRow('macro_ledger', {
    id: ids.macroLedger,
    user_id: userId,
    date: testDate,
    base_tdee: 2400,
    prescribed_protein: 160,
    prescribed_fats: 70,
    prescribed_carbs: 250,
  });

  await insertRow('food_items', {
    id: ids.foodItem,
    user_id: userId,
    name: 'Account deletion custom food',
    serving_size_g: 100,
    calories_per_serving: 100,
    protein_per_serving: 10,
    carbs_per_serving: 10,
    fat_per_serving: 2,
  });
  await insertRow('food_log', {
    id: ids.foodLog,
    user_id: userId,
    food_item_id: ids.foodItem,
    date: testDate,
    meal_type: 'breakfast',
    servings: 1,
    logged_calories: 100,
    logged_protein: 10,
    logged_carbs: 10,
    logged_fat: 2,
  });
  await insertRow('favorite_foods', {
    id: ids.favoriteFood,
    user_id: userId,
    food_item_id: ids.foodItem,
  });
  await insertRow('daily_nutrition_summary', {
    id: ids.dailyNutritionSummary,
    user_id: userId,
    date: testDate,
  });
  await insertRow('hydration_log', {
    id: ids.hydrationLog,
    user_id: userId,
    date: testDate,
    amount_oz: 16,
  });

  await insertRow('weight_class_plans', {
    id: ids.weightClassPlan,
    user_id: userId,
    start_weight: 170,
    target_weight: 165,
    fight_date: '2026-07-01',
    weigh_in_date: '2026-06-30',
    fight_status: 'amateur',
  });
  await insertRow('body_mass_safety_checks', {
    id: ids.bodyMassSafetyCheck,
    user_id: userId,
    plan_id: ids.weightClassPlan,
    date: testDate,
  });
  await insertRow('weight_class_history', {
    id: ids.weightClassHistory,
    user_id: userId,
    plan_id: ids.weightClassPlan,
    start_weight: 170,
    target_weight: 165,
  });
  await insertRow('athlete_profiles', {
    id: ids.athleteProfile,
    user_id: userId,
    phase: 'off-season',
    active_weight_class_plan_id: ids.weightClassPlan,
    athlete_goal_mode: 'build_phase',
  });
  await insertRow('performance_engine_migration_archive', {
    id: ids.performanceArchive,
    source_table: 'account_deletion_smoke',
    source_id: ids.weightClassPlan,
    user_id: userId,
    archive_reason: 'account_deletion_smoke',
    payload: { runId },
  });
  await insertRow('user_walkthrough_state', {
    id: ids.userWalkthroughState,
    user_id: userId,
    athlete_id: userId,
    walkthrough_key: `account_deletion_${runId}`,
    applies_to: 'new_signup',
  });

  await insertRow('generated_workouts', {
    id: ids.generatedWorkout,
    user_id: userId,
    goal_id: staticIds.trainingGoal,
    requested_duration_minutes: 30,
    estimated_duration_minutes: 30,
    safety_flags: [],
    payload: { runId },
    blocked: false,
  });
  await insertRow('generated_workout_exercises', {
    id: ids.generatedWorkoutExercise,
    generated_workout_id: ids.generatedWorkout,
    exercise_id: staticIds.programmingExercise,
    block_id: 'main',
    prescription: { sets: 1 },
    substitutions: [],
    sort_order: 1,
  });
  await insertRow('generated_workout_session_lifecycle', {
    id: ids.generatedWorkoutLifecycle,
    generated_workout_id: ids.generatedWorkout,
    user_id: userId,
    status: 'started',
  });
  await insertRow('workout_completions', {
    id: ids.workoutCompletion,
    generated_workout_id: ids.generatedWorkout,
    user_id: userId,
    planned_duration_minutes: 30,
    actual_duration_minutes: 28,
    session_rpe: 5,
    source: 'generated_workout',
  });
  await insertRow('exercise_completion_results', {
    id: ids.exerciseCompletionResult,
    workout_completion_id: ids.workoutCompletion,
    exercise_id: staticIds.programmingExercise,
    sets_completed: 1,
    reps_completed: 5,
    completed_as_prescribed: true,
  });
  await insertRow('progression_decisions', {
    id: ids.progressionDecision,
    workout_completion_id: ids.workoutCompletion,
    direction: 'repeat',
    reason: 'Account deletion smoke.',
    next_adjustment: 'No adjustment.',
    safety_flags: [],
  });
  await insertRow('recommendation_events', {
    id: ids.recommendationEvent,
    user_id: userId,
    generated_workout_id: ids.generatedWorkout,
    event_kind: 'account_deletion_smoke',
    decision_trace: [],
  });
  await insertRow('recommendation_feedback', {
    id: ids.recommendationFeedback,
    user_id: userId,
    generated_workout_id: ids.generatedWorkout,
    rating: 5,
  });
  await insertRow('recommendation_quality_scores', {
    id: ids.recommendationQuality,
    user_id: userId,
    score: 95,
    payload: { runId },
  });
  await insertRow('performance_observations', {
    id: ids.performanceObservation,
    user_id: userId,
    observation_kind: 'account_deletion_smoke',
    payload: { runId },
  });
  await insertRow('phase_transitions', {
    id: ids.phaseTransition,
    user_id: userId,
    from_phase: 'build',
    to_phase: 'camp',
    reason: 'Account deletion smoke.',
  });
  await insertRow('protected_workouts', {
    id: ids.protectedWorkout,
    user_id: userId,
    label: 'Account deletion protected workout',
    day_index: 1,
    duration_minutes: 60,
    intensity: 'moderate',
  });
  await insertRow('user_programs', {
    id: ids.userProgram,
    user_id: userId,
    goal_id: staticIds.trainingGoal,
    status: 'active',
    payload: { runId, sessions: [], weeks: [] },
  });
  await insertRow('user_exercise_preferences', {
    user_id: userId,
    exercise_id: staticIds.programmingExercise,
    preference: 'like',
  });
  await insertRow('user_safety_flags', {
    user_id: userId,
    safety_flag_id: staticIds.safetyFlag,
    source: 'user',
  });
  await insertRow('user_equipment', {
    user_id: userId,
    equipment_type_id: staticIds.equipmentType,
  });
  await insertRow('user_constraints', {
    id: ids.userConstraint,
    user_id: userId,
    constraint_type: 'schedule',
    constraint_value: 'account_deletion_smoke',
  });
  await insertRow('user_pain_reports', {
    id: ids.userPainReport,
    user_id: userId,
    location: 'none',
    severity: 0,
  });
  await insertRow('user_readiness_logs', {
    id: ids.userReadinessLog,
    user_id: userId,
    readiness_band: 'ready',
    notes: 'Account deletion smoke.',
  });
  await insertRow('user_training_profiles', {
    user_id: userId,
    experience_level: 'beginner',
    preferred_duration_minutes: 30,
    readiness_band: 'ready',
  });
}

const directUserIdTables = [
  'activity_log',
  'athlete_profiles',
  'body_mass_safety_checks',
  'build_phase_goals',
  'daily_checkins',
  'daily_nutrition_summary',
  'daily_timeline',
  'exercise_library',
  'exercise_overload_history',
  'exercise_pr_log',
  'favorite_foods',
  'fight_camps',
  'food_items',
  'food_log',
  'generated_workout_session_lifecycle',
  'generated_workouts',
  'gym_profiles',
  'hydration_log',
  'macro_ledger',
  'performance_engine_migration_archive',
  'performance_observations',
  'phase_transitions',
  'protected_workouts',
  'recommendation_events',
  'recommendation_feedback',
  'recommendation_quality_scores',
  'recurring_activities',
  'scheduled_activities',
  'training_sessions',
  'user_constraints',
  'user_equipment',
  'user_exercise_preferences',
  'user_pain_reports',
  'user_programs',
  'user_readiness_logs',
  'user_safety_flags',
  'user_training_profiles',
  'user_walkthrough_state',
  'weekly_plan_config',
  'weekly_plan_entries',
  'weekly_targets',
  'weight_class_history',
  'weight_class_plans',
  'workout_completions',
  'workout_log',
];

const indirectRows = [
  ['exercise_completion_results', ids.exerciseCompletionResult],
  ['generated_workout_exercises', ids.generatedWorkoutExercise],
  ['progression_decisions', ids.progressionDecision],
  ['workout_effort_log', ids.workoutEffort],
  ['workout_set_log', ids.workoutSet],
];

async function countByUser(table, userId) {
  const { count, error } = await serviceClient
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  requireNoError(`count ${table}`, error);
  return count || 0;
}

async function countById(table, id) {
  const { count, error } = await serviceClient
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('id', id);
  requireNoError(`count ${table}`, error);
  return count || 0;
}

async function verifyDeletion(userId) {
  for (const table of directUserIdTables) {
    const count = await countByUser(table, userId);
    assert(`${table} has no rows for deleted user`, count === 0, `${count} rows remain`);
  }

  const publicUserCount = await countById('users', userId);
  assert('public.users mirror row removed', publicUserCount === 0, `${publicUserCount} rows remain`);

  for (const [table, id] of indirectRows) {
    const count = await countById(table, id);
    assert(`${table} seeded indirect row removed`, count === 0, `${count} rows remain`);
  }

  const authLookup = await serviceClient.auth.admin.getUserById(userId);
  const authUser = authLookup.data && authLookup.data.user;
  assert('auth user removed', !authUser, 'auth.admin.getUserById still returned a user');
}

async function cleanupUserOwnedRows(userId) {
  if (!userId) return;

  for (const [table, id] of indirectRows) await deleteWhere(table, 'id', id);

  for (const table of [
    'generated_workout_session_lifecycle',
    'recommendation_feedback',
    'recommendation_events',
    'workout_completions',
    'generated_workouts',
    'recommendation_quality_scores',
    'performance_observations',
    'phase_transitions',
    'protected_workouts',
    'user_programs',
    'user_exercise_preferences',
    'user_safety_flags',
    'user_equipment',
    'user_constraints',
    'user_pain_reports',
    'user_readiness_logs',
    'user_training_profiles',
    'workout_log',
    'activity_log',
    'scheduled_activities',
    'recurring_activities',
    'weekly_targets',
    'fight_camps',
    'build_phase_goals',
    'favorite_foods',
    'food_log',
    'daily_nutrition_summary',
    'hydration_log',
    'body_mass_safety_checks',
    'weight_class_history',
    'training_sessions',
    'daily_checkins',
    'daily_timeline',
    'macro_ledger',
    'user_walkthrough_state',
    'athlete_profiles',
    'weight_class_plans',
    'performance_engine_migration_archive',
    'weekly_plan_entries',
    'weekly_plan_config',
    'gym_profiles',
    'food_items',
    'exercise_pr_log',
    'exercise_overload_history',
    'exercise_library',
  ]) {
    await deleteWhere(table, 'user_id', userId);
  }

  await deleteWhere('users', 'id', userId);
}

async function cleanupStaticFixtures() {
  await deleteWhere('programming_exercises', 'id', staticIds.programmingExercise);
  await deleteWhere('safety_flags', 'id', staticIds.safetyFlag);
  await deleteWhere('equipment_types', 'id', staticIds.equipmentType);
  await deleteWhere('training_goals', 'id', staticIds.trainingGoal);
  await deleteWhere('workout_types', 'id', staticIds.workoutType);
}

async function cleanup() {
  if (testUser) {
    await cleanupUserOwnedRows(testUser.id);
    const { error } = await serviceClient.auth.admin.deleteUser(testUser.id);
    if (error && !/not found/i.test(error.message)) {
      console.warn(`  WARN cleanup auth user: ${error.message}`);
    }
  }
  await cleanupStaticFixtures();
}

async function main() {
  try {
    console.log(`Account deletion live smoke run: ${runId}`);
    const user = await createTestUser();
    await insertStaticFixtures();
    await seedUserOwnedRows(user.id);

    const { error } = await user.client.rpc('delete_my_account');
    requireNoError('call delete_my_account as seeded user', error);
    await verifyDeletion(user.id);

    if (failed > 0) process.exit(1);
    console.log(`PASS account deletion live smoke (${passed} assertions).`);
  } catch (error) {
    console.error(`Account deletion live smoke failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
