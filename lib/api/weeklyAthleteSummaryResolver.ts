import type {
  DailyAthleteSummary,
  WeeklyAthleteSummaryPlan,
  WeeklyPlanEntryRow,
} from '../engine/index.ts';

export interface WeeklyAthleteSummaryResolverOptions {
  forceRefresh?: boolean | undefined;
}

export interface WeeklyAthleteSummaryResolverDependencies {
  loadWeeklyPlanEntries: (userId: string, weekStart: string) => Promise<WeeklyPlanEntryRow[]>;
  getDailyAthleteSummary: (
    userId: string,
    date: string,
    options?: WeeklyAthleteSummaryResolverOptions,
  ) => Promise<DailyAthleteSummary>;
}

export async function resolveWeeklyAthleteSummaryWithDependencies(
  userId: string,
  weekStart: string,
  options: WeeklyAthleteSummaryResolverOptions,
  dependencies: WeeklyAthleteSummaryResolverDependencies,
): Promise<WeeklyAthleteSummaryPlan> {
  const entries = await dependencies.loadWeeklyPlanEntries(userId, weekStart);

  if (entries.length === 0) {
    return {
      entries: [],
      headline: 'No weekly athlete summary',
      summary: 'There is no active weekly plan for this window.',
    };
  }

  const uniqueDates = Array.from(new Set(entries.map((entry) => entry.date)));
  const summariesByDate = new Map<string, DailyAthleteSummary>();

  for (const date of uniqueDates) {
    const summary = await dependencies.getDailyAthleteSummary(userId, date, { forceRefresh: options.forceRefresh });
    summariesByDate.set(date, summary);
  }

  return {
    entries: entries.map((entry) => ({
      ...entry,
      dailyAthleteSummary: summariesByDate.get(entry.date) ?? null,
    })),
    headline: 'Weekly athlete summary',
    summary: `${uniqueDates.length} daily athlete summaries resolved from canonical performance output.`,
  };
}
