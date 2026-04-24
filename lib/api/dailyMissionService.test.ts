import { DAILY_ENGINE_VERSION } from '../engine/calculateMission.ts';
import type {
  DailyEngineSnapshotRow,
  DailyMission,
  WeeklyPlanEntryRow,
} from '../engine/index.ts';
import { resolveWeeklyMissionWithDependencies } from './weeklyMissionResolver.ts';

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

function makeMission(id: string, engineVersion = DAILY_ENGINE_VERSION): DailyMission {
  return {
    id,
    date: '2026-04-20',
    engineVersion,
  } as unknown as DailyMission;
}

function makeEntry(input: {
  id: string;
  date: string;
  mission?: DailyMission | null;
}): WeeklyPlanEntryRow {
  return {
    id: input.id,
    user_id: 'user-1',
    week_start_date: '2026-04-20',
    day_of_week: 1,
    date: input.date,
    slot: 'am',
    session_type: 'sc',
    focus: 'full_body',
    estimated_duration_min: 45,
    target_intensity: 7,
    status: 'planned',
    rescheduled_to: null,
    workout_log_id: null,
    prescription_snapshot: null,
    daily_mission_snapshot: input.mission ?? null,
    engine_notes: null,
    is_deload: false,
    created_at: '2026-04-20T00:00:00.000Z',
  } as WeeklyPlanEntryRow;
}

function makeSnapshot(date: string, mission: DailyMission): DailyEngineSnapshotRow {
  return {
    id: `snapshot-${date}`,
    user_id: 'user-1',
    date,
    engine_version: mission.engineVersion,
    objective_context_snapshot: {},
    nutrition_targets_snapshot: {},
    workout_prescription_snapshot: null,
    mission_snapshot: mission,
    created_at: '2026-04-20T00:00:00.000Z',
    updated_at: '2026-04-20T00:00:00.000Z',
  } as DailyEngineSnapshotRow;
}

function createDependencies(input: {
  entries: WeeklyPlanEntryRow[];
  snapshots?: Map<string, DailyEngineSnapshotRow>;
  recomputed?: Map<string, DailyMission>;
}) {
  const calls = {
    loadEntries: 0,
    snapshotDates: [] as string[][],
    updates: [] as Array<Array<{ date: string; mission: DailyMission }>>,
    recomputeDates: [] as string[],
  };

  return {
    calls,
    dependencies: {
      engineVersion: DAILY_ENGINE_VERSION,
      loadWeeklyPlanEntries: async () => {
        calls.loadEntries++;
        return input.entries;
      },
      getDailyEngineSnapshotsForDates: async (_userId: string, dates: string[]) => {
        calls.snapshotDates.push(dates);
        return input.snapshots ?? new Map<string, DailyEngineSnapshotRow>();
      },
      updateDailyMissionSnapshotsByDate: async (_userId: string, snapshots: Array<{ date: string; mission: DailyMission }>) => {
        calls.updates.push(snapshots);
      },
      getDailyMission: async (_userId: string, date: string) => {
        calls.recomputeDates.push(date);
        return input.recomputed?.get(date) ?? makeMission(`recomputed-${date}`);
      },
    },
  };
}

async function run() {
  console.log('\n-- dailyMissionService weekly mission reuse --');

  {
    const mondayMission = makeMission('entry-monday');
    const tuesdayMission = makeMission('entry-tuesday');
    const { calls, dependencies } = createDependencies({
      entries: [
        makeEntry({ id: 'entry-1', date: '2026-04-20', mission: mondayMission }),
        makeEntry({ id: 'entry-2', date: '2026-04-21', mission: tuesdayMission }),
      ],
    });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('current weekly mirrors return both entries', result.entries.length === 2);
    assert('current weekly mirrors keep saved mission', result.entries[0].daily_mission_snapshot === mondayMission);
    assert('current weekly mirrors do not query daily snapshots', calls.snapshotDates.length === 0);
    assert('current weekly mirrors do not recompute', calls.recomputeDates.length === 0);
    assert('current weekly mirrors do not write mirrors', calls.updates.length === 0);
  }

  {
    const staleMission = makeMission('stale-entry', 'old-engine');
    const storedMission = makeMission('stored-current');
    const snapshots = new Map([
      ['2026-04-20', makeSnapshot('2026-04-20', storedMission)],
    ]);
    const { calls, dependencies } = createDependencies({
      entries: [makeEntry({ id: 'entry-1', date: '2026-04-20', mission: staleMission })],
      snapshots,
    });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('current daily snapshot repairs stale weekly mirror in result', result.entries[0].daily_mission_snapshot === storedMission);
    assert('current daily snapshot does not recompute', calls.recomputeDates.length === 0);
    assert('current daily snapshot writes one mirror batch', calls.updates.length === 1);
    assert('current daily snapshot writes the stored mission', calls.updates[0][0]?.mission === storedMission);
  }

  {
    const recomputedMission = makeMission('recomputed-current');
    const { calls, dependencies } = createDependencies({
      entries: [makeEntry({ id: 'entry-1', date: '2026-04-20', mission: null })],
      recomputed: new Map([['2026-04-20', recomputedMission]]),
    });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('missing snapshots recompute mission', calls.recomputeDates.length === 1);
    assert('missing snapshots recompute the unique date', calls.recomputeDates[0] === '2026-04-20');
    assert('missing snapshots return recomputed mission', result.entries[0].daily_mission_snapshot === recomputedMission);
    assert('missing snapshots write recomputed mission mirror', calls.updates[0][0]?.mission === recomputedMission);
  }

  {
    const recomputedMission = makeMission('same-date-recomputed');
    const { calls, dependencies } = createDependencies({
      entries: [
        makeEntry({ id: 'entry-1', date: '2026-04-20', mission: null }),
        makeEntry({ id: 'entry-2', date: '2026-04-20', mission: null }),
      ],
      recomputed: new Map([['2026-04-20', recomputedMission]]),
    });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('same-date entries recompute once', calls.recomputeDates.length === 1);
    assert('same-date entries share one mission', result.entries.every((entry) => entry.daily_mission_snapshot === recomputedMission));
    assert('same-date entries write one mirror update item', calls.updates.length === 1 && calls.updates[0].length === 1);
  }

  {
    const entryMission = makeMission('entry-current');
    const storedMission = makeMission('stored-current');
    const recomputedMission = makeMission('force-refresh-current');
    const snapshots = new Map([
      ['2026-04-20', makeSnapshot('2026-04-20', storedMission)],
    ]);
    const { calls, dependencies } = createDependencies({
      entries: [makeEntry({ id: 'entry-1', date: '2026-04-20', mission: entryMission })],
      snapshots,
      recomputed: new Map([['2026-04-20', recomputedMission]]),
    });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', { forceRefresh: true }, dependencies);

    assert('force refresh skips daily snapshot lookup', calls.snapshotDates.length === 0);
    assert('force refresh recomputes mission', calls.recomputeDates.length === 1);
    assert('force refresh ignores current weekly mirror', result.entries[0].daily_mission_snapshot !== entryMission);
    assert('force refresh returns recomputed mission', result.entries[0].daily_mission_snapshot === recomputedMission);
    assert('force refresh writes recomputed mission mirror', calls.updates[0][0]?.mission === recomputedMission);
  }

  {
    const { calls, dependencies } = createDependencies({ entries: [] });

    const result = await resolveWeeklyMissionWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('empty week returns no entries', result.entries.length === 0);
    assert('empty week uses no weekly mission headline', result.headline === 'No weekly mission');
    assert('empty week does not query daily snapshots', calls.snapshotDates.length === 0);
    assert('empty week does not recompute', calls.recomputeDates.length === 0);
    assert('empty week does not write mirrors', calls.updates.length === 0);
  }
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
