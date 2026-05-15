import fs from 'node:fs';
import path from 'node:path';
import {
  buildPlanCalendarScheduleItems,
  getPlanCalendarItemDots,
} from './planCalendarSchedule.ts';
import type {
  ScheduledActivityRow,
  WeeklyPlanEntryRow,
} from '../types/schedule.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}`);
    return;
  }

  failed += 1;
  console.error(`  FAIL ${label}`);
}

function makeEntry(overrides: Partial<WeeklyPlanEntryRow> = {}): WeeklyPlanEntryRow {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    week_start_date: '2026-05-04',
    day_of_week: 1,
    date: '2026-05-04',
    slot: 'single',
    day_order: null,
    session_type: 'sc',
    focus: 'upper_push',
    session_family: 'strength',
    sc_session_family: null,
    placement_source: 'generated',
    progression_intent: null,
    carry_forward_reason: null,
    session_modules: null,
    dose_credits: null,
    dose_summary: null,
    realized_dose_buckets: null,
    estimated_duration_min: 55,
    target_intensity: 7,
    status: 'planned',
    rescheduled_to: null,
    workout_log_id: null,
    scheduled_activity_id: null,
    prescription_snapshot: null,
    engine_notes: null,
    is_deload: false,
    created_at: '2026-05-01T00:00:00Z',
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ScheduledActivityRow> = {}): ScheduledActivityRow {
  return {
    id: 'activity-1',
    recurring_activity_id: null,
    weekly_plan_entry_id: null,
    user_id: 'user-1',
    date: '2026-05-04',
    activity_type: 'sc',
    custom_label: 'sc',
    start_time: '08:00',
    estimated_duration_min: 35,
    expected_intensity: 4,
    session_components: [],
    source: 'engine',
    status: 'scheduled',
    actual_duration_min: null,
    actual_rpe: null,
    notes: null,
    engine_recommendation: null,
    athlete_locked: false,
    intended_intensity: null,
    constraint_tier: null,
    recommendation_reason: null,
    recommendation_severity: null,
    recommendation_affected_subsystem: null,
    recommendation_change: null,
    recommendation_education: null,
    recommendation_status: null,
    ...overrides,
  };
}

console.log('\n-- plan calendar schedule merge model --');

{
  const items = buildPlanCalendarScheduleItems(
    [makeEntry({ id: 'entry-linked', scheduled_activity_id: 'activity-linked' })],
    [makeActivity({ id: 'activity-linked', weekly_plan_entry_id: null })],
  );

  assert('linked by scheduled_activity_id renders once', items.length === 1);
  assert('linked item records both ids', items[0].weeklyPlanEntryId === 'entry-linked' && items[0].scheduledActivityId === 'activity-linked');
}

{
  const items = buildPlanCalendarScheduleItems(
    [makeEntry({ id: 'entry-linked-by-plan' })],
    [makeActivity({ id: 'activity-linked-by-plan', weekly_plan_entry_id: 'entry-linked-by-plan' })],
  );

  assert('linked by weekly_plan_entry_id renders once', items.length === 1);
  assert('schedule metadata comes from activity', items[0].startTime === '08:00' && items[0].scheduledActivityId === 'activity-linked-by-plan');
}

{
  const item = buildPlanCalendarScheduleItems(
    [makeEntry({ focus: 'upper_push', session_type: 'sc', estimated_duration_min: 55, target_intensity: 7 })],
    [makeActivity({ custom_label: 'sc', estimated_duration_min: 35, expected_intensity: 4, weekly_plan_entry_id: 'entry-1' })],
  )[0];

  assert('generated workout label comes from weekly entry', item.label === 'Upper Push Strength');
  assert('generated workout duration comes from weekly entry', item.durationMin === 55);
  assert('generated workout intensity comes from weekly entry', item.intensity === 7);
}

{
  const items = buildPlanCalendarScheduleItems(
    [],
    [makeActivity({
      id: 'manual-1',
      source: 'manual',
      activity_type: 'boxing_practice',
      custom_label: 'Coach pads',
      athlete_locked: true,
    })],
  );

  assert('manual activity without plan entry remains visible', items.length === 1 && items[0].label === 'Coach pads');
  assert('manual protected activity keeps anchor state', items[0].protectedAnchor === true);
}

{
  const items = buildPlanCalendarScheduleItems(
    [makeEntry({ id: 'entry-unsynced', focus: 'lower', scheduled_activity_id: null })],
    [],
  );

  assert('weekly entry without scheduled activity remains visible', items.length === 1);
  assert('unsynced generated workout still has entry label', items[0].label === 'Lower Body Strength');
}

{
  const completed = buildPlanCalendarScheduleItems(
    [makeEntry({ id: 'entry-completed-by-activity', status: 'planned' })],
    [makeActivity({ id: 'activity-completed', weekly_plan_entry_id: 'entry-completed-by-activity', status: 'completed' })],
  )[0];
  const skipped = buildPlanCalendarScheduleItems(
    [makeEntry({ id: 'entry-skipped', status: 'skipped' })],
    [makeActivity({ id: 'activity-scheduled', weekly_plan_entry_id: 'entry-skipped', status: 'scheduled' })],
  )[0];

  assert('completed status resolves from activity update', completed.status === 'completed');
  assert('skipped status resolves from entry update', skipped.status === 'skipped');
}

{
  const items = buildPlanCalendarScheduleItems(
    [
      makeEntry({ id: 'entry-start-month', date: '2026-05-01', week_start_date: '2026-04-27' }),
      makeEntry({ id: 'entry-end-month', date: '2026-05-28', week_start_date: '2026-05-25', focus: 'conditioning', session_family: 'conditioning' }),
    ],
    [],
  );
  const dots = getPlanCalendarItemDots(items);

  assert('month dots include early-month entry', dots.has('2026-05-01'));
  assert('month dots include late-month entry outside selected week', dots.has('2026-05-28'));
}

{
  const items = buildPlanCalendarScheduleItems(
    [makeEntry({
      id: 'sparring-anchor',
      session_type: 'sparring',
      session_family: 'sparring',
      focus: null,
      placement_source: 'locked',
    })],
    [],
  );

  assert('protected boxing/sparring anchor is preserved', items[0].protectedAnchor === true && items[0].label === 'Sparring');
}

console.log('\n-- plan screen display source smoke --');

{
  const projectRoot = process.cwd();
  const planScreen = fs.readFileSync(path.join(projectRoot, 'src', 'screens', 'PlanCalendarScreen.tsx'), 'utf8');
  const planHook = fs.readFileSync(path.join(projectRoot, 'src', 'hooks', 'usePlanCalendarData.ts'), 'utf8');

  assert('Plan screen uses the normalized calendar data hook', planScreen.includes('usePlanCalendarData'));
  assert('Plan screen no longer imports useWeeklyPlan', !planScreen.includes('useWeeklyPlan'));
  assert('Plan screen no longer imports syncEngineSchedule', !planScreen.includes('syncEngineSchedule'));
  assert('Plan hook builds normalized schedule items', planHook.includes('buildPlanCalendarScheduleItems'));
  assert('Plan hook fetches weekly entries by date range', planHook.includes('getWeeklyPlanEntriesForRange'));
  assert('Plan hook does not passively sync engine schedule', !planHook.includes('syncEngineSchedule'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
