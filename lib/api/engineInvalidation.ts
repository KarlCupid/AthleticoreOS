import type { DailyEngineState, WeeklyAthleteSummaryPlan } from '../engine/index.ts';

export const dailyEngineStateCache = new Map<string, DailyEngineState>();
export const dailyEngineStateInFlight = new Map<string, Promise<DailyEngineState>>();
export const weeklyAthleteSummaryCache = new Map<string, WeeklyAthleteSummaryPlan>();
export const weeklyAthleteSummaryInFlight = new Map<string, Promise<WeeklyAthleteSummaryPlan>>();

function getDailyEngineStateCacheKey(userId: string, date: string): string {
  return `${userId}::${date}`;
}

function getWeeklyAthleteSummaryCacheKey(userId: string, weekStart: string): string {
  return `${userId}::${weekStart}`;
}

function clearUserScopedKeys<T>(store: Map<string, T>, userId: string) {
  const prefix = `${userId}::`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateEngineDataCache(input: {
  userId: string;
  date?: string | undefined;
  weekStart?: string | undefined;
}) {
  const { userId, date, weekStart } = input;

  if (date) {
    const dailyKey = getDailyEngineStateCacheKey(userId, date);
    dailyEngineStateCache.delete(dailyKey);
    dailyEngineStateInFlight.delete(dailyKey);
  } else {
    clearUserScopedKeys(dailyEngineStateCache, userId);
    clearUserScopedKeys(dailyEngineStateInFlight, userId);
  }

  if (weekStart) {
    const weeklyKey = getWeeklyAthleteSummaryCacheKey(userId, weekStart);
    weeklyAthleteSummaryCache.delete(weeklyKey);
    weeklyAthleteSummaryInFlight.delete(weeklyKey);
    return;
  }

  clearUserScopedKeys(weeklyAthleteSummaryCache, userId);
  clearUserScopedKeys(weeklyAthleteSummaryInFlight, userId);
}

export async function mutateEngineAffectingData<T>(
  input: {
    userId: string;
    date?: string | undefined;
    weekStart?: string | undefined;
    reason: string;
  },
  mutation: () => Promise<T>,
): Promise<T> {
  const result = await mutation();
  invalidateEngineDataCache(input);
  return result;
}

export async function withEngineInvalidation<T>(
  input: {
    userId: string;
    date?: string | undefined;
    weekStart?: string | undefined;
    reason: string;
  },
  mutation: () => Promise<T>,
): Promise<T> {
  return mutateEngineAffectingData(input, mutation);
}
