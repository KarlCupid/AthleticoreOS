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

export function summarizeProgressionTrends(completions: WorkoutCompletionLog[]): {
  lastSession: WorkoutCompletionLog | null;
  lastThreeSimilar: WorkoutCompletionLog[];
  lastFiveTotal: WorkoutCompletionLog[];
  completionRate: number;
  actualRpeTrend: number | null;
  painTrend: 'none' | 'improving' | 'stable' | 'worsening';
  missedRepSessionCount: number;
  substitutionSessionCount: number;
} {
  const ordered = [...completions]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, 5);
  const lastSession = ordered[0] ?? null;
  const lastThreeSimilar = lastSession
    ? ordered.filter((log) => (
      (!lastSession.workoutTypeId || !log.workoutTypeId || log.workoutTypeId === lastSession.workoutTypeId)
      && (!lastSession.goalId || !log.goalId || log.goalId === lastSession.goalId)
    )).slice(0, 3)
    : [];
  const completionRate = average(ordered.map((log) => summarizeWorkoutCompletion(log).prescribedCompletionRate)) ?? 0;
  const actualRpeTrend = average(ordered.map((log) => log.sessionRpe));
  const painDeltas = ordered
    .map((log) => {
      if (typeof log.painScoreBefore !== 'number' || typeof log.painScoreAfter !== 'number') return null;
      return log.painScoreAfter - log.painScoreBefore;
    })
    .filter((value): value is number => value != null);
  const averagePainDelta = average(painDeltas);
  return {
    lastSession,
    lastThreeSimilar,
    lastFiveTotal: ordered,
    completionRate,
    actualRpeTrend,
    painTrend: averagePainDelta == null || painDeltas.length === 0
      ? 'none'
      : averagePainDelta < -0.25 ? 'improving' : averagePainDelta > 0.25 ? 'worsening' : 'stable',
    missedRepSessionCount: ordered.filter((log) => log.exerciseResults.some((result) => {
      if (!result.completedAsPrescribed) return true;
      if (typeof result.repsCompleted === 'number' && typeof result.repsPrescribed === 'number') {
        return result.repsCompleted < result.repsPrescribed;
      }
      return typeof result.setsPrescribed === 'number' && result.setsCompleted < result.setsPrescribed;
    })).length,
    substitutionSessionCount: ordered.filter((log) => /substitution|substitutions used|swap/i.test(log.notes ?? '')).length,
  };
}
