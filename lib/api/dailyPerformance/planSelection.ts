import type {
  ScheduledActivityRow,
  WeeklyPlanEntryRow,
} from '../../engine/index.ts';
import {
  isActiveTrainingPlanEntry,
  planEntryActiveTrainingRank,
} from '../../performance-engine/workout-programming/planEntryRuntime.ts';

type QueryResult<T> = Promise<{ data: T | null; error: unknown | null }>;

interface PlanSelectionQueryBuilder {
  select: (columns: string) => PlanSelectionQueryBuilder;
  eq: (column: string, value: string) => PlanSelectionQueryBuilder;
  gte: (column: string, value: string) => PlanSelectionQueryBuilder;
  lte: (column: string, value: string) => PlanSelectionQueryBuilder;
  order: (column: string) => PlanSelectionQueryBuilder;
}

interface PlanSelectionClient {
  from(table: 'weekly_plan_entries'): PlanSelectionQueryBuilder;
}

export interface PlanSelectionDependencies {
  loadPlanEntriesForDate: (userId: string, date: string) => Promise<WeeklyPlanEntryRow[]>;
  loadPlanEntriesForRange: (userId: string, startDate: string, endDate: string) => Promise<WeeklyPlanEntryRow[]>;
  isActiveTrainingPlanEntry: (entry: WeeklyPlanEntryRow) => boolean;
}

export interface DailyPlanSelection {
  weeklyPlanEntries: WeeklyPlanEntryRow[];
  weeklyEntries: WeeklyPlanEntryRow[];
  primaryPlanEntry: WeeklyPlanEntryRow | null;
  primaryTrainingPlanEntry: WeeklyPlanEntryRow | null;
  /**
   * Compatibility name for older callers. This now means the primary active
   * Athleticore training row, not just a legacy GuidedWorkout prescription.
   */
  primaryEnginePlanEntry: WeeklyPlanEntryRow | null;
}

async function queryRows(query: PlanSelectionQueryBuilder): Promise<WeeklyPlanEntryRow[]> {
  const result = await (query as unknown as QueryResult<WeeklyPlanEntryRow[]>);
  if (result.error) throw result.error;
  return result.data ?? [];
}

export async function loadPlanEntriesForDate(
  userId: string,
  date: string,
  client?: PlanSelectionClient,
): Promise<WeeklyPlanEntryRow[]> {
  const resolvedClient = client ?? (await import('../../supabase')).supabase as unknown as PlanSelectionClient;
  return queryRows(
    resolvedClient
      .from('weekly_plan_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('slot'),
  );
}

export async function loadPlanEntriesForRange(
  userId: string,
  startDate: string,
  endDate: string,
  client?: PlanSelectionClient,
): Promise<WeeklyPlanEntryRow[]> {
  const resolvedClient = client ?? (await import('../../supabase')).supabase as unknown as PlanSelectionClient;
  return queryRows(
    resolvedClient
      .from('weekly_plan_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('slot'),
  );
}

export const defaultPlanSelectionDependencies: PlanSelectionDependencies = {
  loadPlanEntriesForDate,
  loadPlanEntriesForRange,
  isActiveTrainingPlanEntry,
};

function comparePlanEntriesByTrainingWeight(a: WeeklyPlanEntryRow, b: WeeklyPlanEntryRow): number {
  const intensityDelta = (b.target_intensity ?? 0) - (a.target_intensity ?? 0);
  if (intensityDelta !== 0) return intensityDelta;

  const durationDelta = b.estimated_duration_min - a.estimated_duration_min;
  if (durationDelta !== 0) return durationDelta;

  const slotRank: Record<WeeklyPlanEntryRow['slot'], number> = {
    single: 0,
    pm: 1,
    am: 2,
  };
  return slotRank[a.slot] - slotRank[b.slot];
}

export function pickPrimaryPlanEntry(entries: WeeklyPlanEntryRow[]): WeeklyPlanEntryRow | null {
  if (entries.length === 0) return null;

  return [...entries].sort(comparePlanEntriesByTrainingWeight)[0] ?? null;
}

export function pickPrimaryTrainingPlanEntry(
  entries: WeeklyPlanEntryRow[],
  isActiveTrainingEntry: (entry: WeeklyPlanEntryRow) => boolean = isActiveTrainingPlanEntry,
): WeeklyPlanEntryRow | null {
  const ranked = entries
    .filter((entry) => isActiveTrainingEntry(entry) || planEntryActiveTrainingRank(entry) === 3)
    .map((entry) => ({ entry, rank: planEntryActiveTrainingRank(entry) ?? 99 }))
    .sort((left, right) => {
      const rankDelta = left.rank - right.rank;
      if (rankDelta !== 0) return rankDelta;
      return comparePlanEntriesByTrainingWeight(left.entry, right.entry);
    });

  return ranked[0]?.entry ?? null;
}

export const pickPrimaryEnginePlanEntry = pickPrimaryTrainingPlanEntry;

export function pickPrimaryScheduledActivity(activities: ScheduledActivityRow[]): ScheduledActivityRow | null {
  const activeActivities = activities.filter((activity) => activity.status !== 'skipped');
  if (activeActivities.length === 0) return null;

  const activityRank = (activity: ScheduledActivityRow): number => {
    switch (activity.activity_type) {
      case 'sparring':
        return 0;
      case 'boxing_practice':
        return 1;
      case 'sc':
        return 2;
      case 'conditioning':
        return 3;
      case 'road_work':
      case 'running':
        return 4;
      default:
        return 5;
    }
  };

  return [...activeActivities].sort((a, b) => {
    const rankDelta = activityRank(a) - activityRank(b);
    if (rankDelta !== 0) return rankDelta;

    const intensityDelta = (b.expected_intensity ?? 0) - (a.expected_intensity ?? 0);
    if (intensityDelta !== 0) return intensityDelta;

    return (b.estimated_duration_min ?? 0) - (a.estimated_duration_min ?? 0);
  })[0] ?? null;
}

export async function resolveDailyPlanSelection(
  input: {
    userId: string;
    date: string;
    weekStart: string;
    weekEnd: string;
  },
  dependencies: PlanSelectionDependencies = defaultPlanSelectionDependencies,
): Promise<DailyPlanSelection> {
  const [weeklyPlanEntries, weeklyEntries] = await Promise.all([
    dependencies.loadPlanEntriesForDate(input.userId, input.date),
    dependencies.loadPlanEntriesForRange(input.userId, input.weekStart, input.weekEnd),
  ]);

  const primaryTrainingPlanEntry = pickPrimaryTrainingPlanEntry(
    weeklyPlanEntries,
    dependencies.isActiveTrainingPlanEntry,
  );

  return {
    weeklyPlanEntries,
    weeklyEntries,
    primaryPlanEntry: pickPrimaryPlanEntry(weeklyPlanEntries),
    primaryTrainingPlanEntry,
    primaryEnginePlanEntry: primaryTrainingPlanEntry,
  };
}
