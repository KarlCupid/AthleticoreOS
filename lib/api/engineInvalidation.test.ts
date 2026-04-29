import fs from 'node:fs';
import path from 'node:path';
import {
  dailyEngineStateCache,
  dailyEngineStateInFlight,
  weeklyAthleteSummaryCache,
  weeklyAthleteSummaryInFlight,
  mutateEngineAffectingData,
  withEngineInvalidation,
} from './engineInvalidation.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

function assertIncludes(source: string, label: string, needles: string[]) {
  for (const needle of needles) {
    assert(`${label} includes ${needle}`, source.includes(needle));
  }
}

async function run() {
  console.log('\n-- engine invalidation --');

  dailyEngineStateCache.clear();
  dailyEngineStateInFlight.clear();
  weeklyAthleteSummaryCache.clear();
  weeklyAthleteSummaryInFlight.clear();

  dailyEngineStateCache.set('user-1::2026-04-29', {} as never);
  dailyEngineStateInFlight.set('user-1::2026-04-29', Promise.resolve({} as never));
  weeklyAthleteSummaryCache.set('user-1::2026-04-27', {} as never);
  weeklyAthleteSummaryInFlight.set('user-1::2026-04-27', Promise.resolve({} as never));

  const result = await withEngineInvalidation(
    {
      userId: 'user-1',
      date: '2026-04-29',
      weekStart: '2026-04-27',
      reason: 'test_mutation',
    },
    async () => 'saved',
  );

  assert('helper returns mutation result', result === 'saved');
  assert('helper clears daily cache key', !dailyEngineStateCache.has('user-1::2026-04-29'));
  assert('helper clears daily in-flight key', !dailyEngineStateInFlight.has('user-1::2026-04-29'));
  assert('helper clears weekly cache key', !weeklyAthleteSummaryCache.has('user-1::2026-04-27'));
  assert('helper clears weekly in-flight key', !weeklyAthleteSummaryInFlight.has('user-1::2026-04-27'));

  dailyEngineStateCache.set('user-alias::2026-04-29', {} as never);
  await mutateEngineAffectingData(
    { userId: 'user-alias', date: '2026-04-29', reason: 'alias_mutation' },
    async () => undefined,
  );
  assert('mutateEngineAffectingData clears daily cache key', !dailyEngineStateCache.has('user-alias::2026-04-29'));

  dailyEngineStateCache.set('user-date-only::2026-04-29', {} as never);
  weeklyAthleteSummaryCache.set('user-date-only::2026-04-27', {} as never);
  weeklyAthleteSummaryInFlight.set('user-date-only::2026-04-27', Promise.resolve({} as never));
  await withEngineInvalidation(
    { userId: 'user-date-only', date: '2026-04-29', reason: 'date_only_mutation' },
    async () => undefined,
  );
  assert('date-scoped mutation clears its daily cache', !dailyEngineStateCache.has('user-date-only::2026-04-29'));
  assert('date-scoped mutation clears user weekly cache', !weeklyAthleteSummaryCache.has('user-date-only::2026-04-27'));
  assert('date-scoped mutation clears user weekly in-flight cache', !weeklyAthleteSummaryInFlight.has('user-date-only::2026-04-27'));

  dailyEngineStateCache.set('user-2::2026-04-29', {} as never);
  weeklyAthleteSummaryCache.set('user-2::2026-04-27', {} as never);
  try {
    await withEngineInvalidation({ userId: 'user-2', reason: 'failed_mutation' }, async () => {
      throw new Error('boom');
    });
  } catch {
    // Expected: failed mutations must not evict known-good cache.
  }
  assert('helper preserves daily cache when mutation fails', dailyEngineStateCache.has('user-2::2026-04-29'));
  assert('helper preserves weekly cache when mutation fails', weeklyAthleteSummaryCache.has('user-2::2026-04-27'));

  const dailyCheckIn = read('lib/api/dailyCheckInService.ts');
  const nutrition = read('lib/api/nutritionService.ts');
  const schedule = read('lib/api/scheduleService.ts');
  const sc = read('lib/api/scService.ts');
  const weeklyPlan = read('lib/api/weeklyPlanService.ts');
  const planningSetup = read('src/screens/weeklyPlanSetup/useWeeklyPlanSetupController.ts');
  const onboarding = read('src/screens/onboarding/completeCoachIntake.ts');
  const fightCamp = read('lib/api/fightCampService.ts');
  const weightClass = read('lib/api/weightClassPlanService.ts');
  const fitness = read('lib/api/fitnessService.ts');
  const gymProfiles = read('lib/api/gymProfileService.ts');

  assertIncludes(dailyCheckIn, 'daily check-in/bodyweight save', [
    'mutateEngineAffectingData',
    "reason: 'daily_checkin_save'",
    "reason: 'daily_checkin_readiness_score_update'",
  ]);
  assertIncludes(nutrition, 'nutrition and hydration logs', [
    "reason: 'nutrition_log_save'",
    "reason: 'nutrition_log_update'",
    "reason: 'nutrition_log_remove'",
    "reason: 'hydration_log_save'",
    "reason: 'hydration_log_update'",
    "reason: 'hydration_log_remove'",
  ]);
  assertIncludes(schedule, 'activity and commitment mutations', [
    "reason: 'activity_add'",
    "reason: 'activity_update'",
    "reason: 'activity_future_update'",
    "reason: 'activity_complete'",
    "reason: 'activity_skip'",
    "reason: 'recurring_activity_remove'",
    "reason: 'recurring_activities_replace'",
    "reason: 'rolling_schedule_generate'",
  ]);
  assertIncludes(sc, 'guided workout mutations', [
    "reason: 'guided_workout_start'",
    "reason: 'guided_workout_complete'",
  ]);
  assertIncludes(weeklyPlan, 'weekly plan edits', [
    "reason: 'weekly_plan_config_save'",
    "reason: 'weekly_plan_save'",
    "reason: 'weekly_plan_day_complete'",
    "reason: 'weekly_plan_day_skip'",
    "reason: 'weekly_plan_day_reschedule'",
    "reason: 'weekly_plan_prescription_update'",
    "reason: 'weekly_plan_entry_restore'",
    "reason: 'weekly_plan_recommendation_accept'",
  ]);
  assertIncludes(planningSetup, 'planning setup save', [
    'withEngineInvalidation',
    "reason: 'planning_setup_save'",
  ]);
  assertIncludes(onboarding, 'onboarding setup save', [
    'withEngineInvalidation',
    "reason: 'onboarding_complete'",
    "reason: 'onboarding_readiness_baseline_save'",
  ]);
  assertIncludes(fightCamp, 'fight camp update', [
    "reason: 'fight_camp_update'",
  ]);
  assertIncludes(weightClass, 'weight class updates', [
    "reason: 'weight_class_plan_create'",
    "reason: 'weight_class_plan_status_update'",
    "reason: 'weight_class_plan_abandon'",
    "reason: 'body_mass_safety_check_upsert'",
    "reason: 'weight_class_plan_complete'",
  ]);
  assertIncludes(fitness, 'fitness profile updates', [
    "reason: 'fitness_questionnaire_save'",
    "reason: 'fitness_level_update'",
  ]);
  assertIncludes(gymProfiles, 'gym profile updates', [
    "reason: 'gym_profile_create'",
    "reason: 'gym_profile_update'",
    "reason: 'gym_profile_delete'",
    "reason: 'gym_profile_default_update'",
  ]);

  const files = [
    ...['lib/api', 'src/hooks', 'src/screens'].flatMap((root) =>
      fs.readdirSync(path.join(process.cwd(), root), { recursive: true })
        .map((entry) => path.join(root, String(entry)))
        .filter((filePath) => /\.(ts|tsx)$/.test(filePath) && !filePath.endsWith('.test.ts')),
    ),
  ];
  const manualInvalidationFiles = files.filter((filePath) => {
    if (filePath.replace(/\\/g, '/') === 'lib/api/engineInvalidation.ts') return false;
    if (filePath.replace(/\\/g, '/') === 'lib/api/dailyPerformanceService.ts') return false;
    return read(filePath).includes('invalidateEngineDataCache(');
  });
  assert('mutation callers do not manually call invalidateEngineDataCache', manualInvalidationFiles.length === 0);
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
