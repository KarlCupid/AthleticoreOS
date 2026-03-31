export function resolveWeeklyPlanWeekStart(input: {
  forceStartDate?: string;
  activeWeekStart?: string | null;
  todayEngineWeekStart?: string | null;
  latestGeneratedWeekStart?: string | null;
}): string | null {
  const {
    forceStartDate,
    activeWeekStart,
    todayEngineWeekStart,
    latestGeneratedWeekStart,
  } = input;

  return forceStartDate
    ?? activeWeekStart
    ?? todayEngineWeekStart
    ?? latestGeneratedWeekStart
    ?? null;
}
