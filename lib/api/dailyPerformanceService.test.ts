import fs from 'node:fs';
import path from 'node:path';
import type {
  DailyAthleteSummary,
  WeeklyPlanEntryRow,
} from '../engine/index.ts';
import { resolveWeeklyAthleteSummaryWithDependencies } from './weeklyAthleteSummaryResolver.ts';

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

function makeSummary(id: string, date: string): DailyAthleteSummary {
  return {
    id,
    date,
    engineVersion: 'unified-performance-engine-v1',
  } as unknown as DailyAthleteSummary;
}

function makeEntry(input: {
  id: string;
  date: string;
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
    engine_notes: null,
    is_deload: false,
    created_at: '2026-04-20T00:00:00.000Z',
  } as WeeklyPlanEntryRow;
}

function createDependencies(input: {
  entries: WeeklyPlanEntryRow[];
  summaries?: Map<string, DailyAthleteSummary>;
}) {
  const calls = {
    loadEntries: 0,
    summaryDates: [] as string[],
  };

  return {
    calls,
    dependencies: {
      loadWeeklyPlanEntries: async () => {
        calls.loadEntries++;
        return input.entries;
      },
      getDailyAthleteSummary: async (_userId: string, date: string) => {
        calls.summaryDates.push(date);
        return input.summaries?.get(date) ?? makeSummary(`summary-${date}`, date);
      },
    },
  };
}

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
}

async function run() {
  console.log('\n-- dailyPerformanceService weekly athlete summary --');

  {
    const dailyService = read('lib/api/dailyPerformanceService.ts');

    assert('daily UPE handoff maps ACWRResult ratio through finite mapper', dailyService.includes('function acwrRatioForUnifiedEngine(acwr: ACWRResult | null): number | null')
      && dailyService.includes('const ratio = acwr?.ratio')
      && dailyService.includes('Number.isFinite(ratio)'));
    assert('daily UPE handoff passes mapped ACWR ratio instead of a hard-coded null', dailyService.includes('acuteChronicWorkloadRatio: acwrRatioForUnifiedEngine(input.acwr)')
      && !dailyService.includes('acuteChronicWorkloadRatio: null'));
  }

  {
    const mondaySummary = makeSummary('monday', '2026-04-20');
    const tuesdaySummary = makeSummary('tuesday', '2026-04-21');
    const { calls, dependencies } = createDependencies({
      entries: [
        makeEntry({ id: 'entry-1', date: '2026-04-20' }),
        makeEntry({ id: 'entry-2', date: '2026-04-21' }),
      ],
      summaries: new Map([
        ['2026-04-20', mondaySummary],
        ['2026-04-21', tuesdaySummary],
      ]),
    });

    const result = await resolveWeeklyAthleteSummaryWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('weekly athlete summary returns both entries', result.entries.length === 2);
    assert('entries receive UPE-native daily athlete summary', result.entries[0].dailyAthleteSummary === mondaySummary);
    assert('weekly summaries resolve unique dates from canonical daily output', calls.summaryDates.length === 2);
    assert('weekly summaries do not depend on persisted daily snapshot mirrors', !('daily_performance_summary_snapshot' in result.entries[0]));
  }

  {
    const sharedSummary = makeSummary('shared-date', '2026-04-20');
    const { calls, dependencies } = createDependencies({
      entries: [
        makeEntry({ id: 'entry-1', date: '2026-04-20' }),
        makeEntry({ id: 'entry-2', date: '2026-04-20' }),
      ],
      summaries: new Map([['2026-04-20', sharedSummary]]),
    });

    const result = await resolveWeeklyAthleteSummaryWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('same-date entries resolve one canonical summary', calls.summaryDates.length === 1);
    assert('same-date entries share the daily athlete summary', result.entries.every((entry) => entry.dailyAthleteSummary === sharedSummary));
  }

  {
    const { calls, dependencies } = createDependencies({ entries: [] });

    const result = await resolveWeeklyAthleteSummaryWithDependencies('user-1', '2026-04-20', {}, dependencies);

    assert('empty week returns no entries', result.entries.length === 0);
    assert('empty week uses daily athlete summary language', result.headline === 'No weekly athlete summary');
    assert('empty week does not request daily summaries', calls.summaryDates.length === 0);
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
