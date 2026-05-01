import { summarizeWorkoutCompletion } from './personalizationEngine.ts';
import type { WorkoutAnalyticsSummary, WorkoutCompletionLog } from './types.ts';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeWorkoutAnalytics(input: {
  plannedWorkoutCount: number;
  completions: WorkoutCompletionLog[];
}): WorkoutAnalyticsSummary {
  const completionSummaries = input.completions.map(summarizeWorkoutCompletion);
  const averageSessionRpe = average(input.completions.map((log) => log.sessionRpe));
  const totalCompletedSets = input.completions.reduce((sum, log) => (
    sum + log.exerciseResults.reduce((inner, result) => inner + result.setsCompleted, 0)
  ), 0);
  const painDeltas = input.completions
    .map((log) => {
      if (typeof log.painScoreBefore !== 'number' || typeof log.painScoreAfter !== 'number') return null;
      return log.painScoreAfter - log.painScoreBefore;
    })
    .filter((value): value is number => value !== null);
  const painAverage = average(painDeltas);
  const adherenceRate = input.plannedWorkoutCount === 0 ? 0 : input.completions.length / input.plannedWorkoutCount;
  const completionRate = average(completionSummaries.map((summary) => summary.prescribedCompletionRate)) ?? 0;
  const painPenalty = painAverage == null ? 0 : Math.max(0, painAverage) * 10;
  const recommendationQualityScore = Math.max(0, Math.min(100, Math.round((adherenceRate * 45) + (completionRate * 45) - painPenalty + 10)));
  const warnings: string[] = [];

  if (painAverage != null && painAverage > 0.5) warnings.push('Pain is trending upward; future recommendations should become more conservative.');
  if (adherenceRate < 0.7) warnings.push('Adherence is below target; reduce friction or volume.');
  if ((averageSessionRpe ?? 0) >= 8.5) warnings.push('Average effort is high; monitor recovery.');

  return {
    workoutsPlanned: input.plannedWorkoutCount,
    workoutsCompleted: input.completions.length,
    adherenceRate,
    averageSessionRpe,
    totalCompletedSets,
    painTrend: painAverage == null || painDeltas.length === 0
      ? 'none'
      : painAverage < -0.25 ? 'improving' : painAverage > 0.25 ? 'worsening' : 'stable',
    recommendationQualityScore,
    warnings,
    summary: `${input.completions.length}/${input.plannedWorkoutCount} workouts completed with ${Math.round(adherenceRate * 100)}% adherence.`,
  };
}
