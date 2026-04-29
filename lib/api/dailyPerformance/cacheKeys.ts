export function getDailyEngineStateCacheKey(userId: string, date: string): string {
  return `${userId}::${date}`;
}

export function getWeeklyAthleteSummaryCacheKey(userId: string, weekStart: string): string {
  return `${userId}::${weekStart}`;
}
