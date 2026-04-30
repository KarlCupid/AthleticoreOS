export function resolveWeeklyPlanWeekStart(input: {
  forceStartDate?: string | undefined;
  activeWeekStart?: string | null | undefined;
  todayEngineWeekStart?: string | null | undefined;
  latestGeneratedWeekStart?: string | null | undefined;
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
