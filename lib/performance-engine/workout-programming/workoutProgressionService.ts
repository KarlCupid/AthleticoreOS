import {
  loadRecentCompletions,
  loadRecentProgressionDecisionsForUser,
  loadRecentReadiness,
} from './persistenceService.ts';
import type {
  ProgressionDecision,
  WorkoutCompletionLog,
} from './types.ts';
import type { ProgressionLookupOptions } from './workoutProgrammingServiceTypes.ts';

export async function getNextProgression(
  userId: string,
  completion: WorkoutCompletionLog,
  options?: ProgressionLookupOptions,
): Promise<ProgressionDecision> {
  const { recommendNextProgression } = await import('./personalizationEngine.ts');
  const loadedRecentCompletions = options?.recentWorkoutCompletions
    ?? (await loadRecentCompletions(userId, { ...options, limit: 5 })).filter((recent) => {
      if (options?.workoutCompletionId && recent.id === options.workoutCompletionId) return false;
      return recent.completedAt !== completion.completedAt || recent.workoutId !== completion.workoutId;
    });
  const loadedProgressionDecisions = options?.recentProgressionDecisions
    ?? await loadRecentProgressionDecisionsForUser(userId, { ...options, limit: 5 });
  const loadedReadinessTrend = options?.readinessTrend
    ?? (await loadRecentReadiness(userId, { ...options, limit: 5 })).map((log) => log.readinessBand);
  const input: Parameters<typeof recommendNextProgression>[0] = {
    completionLog: completion,
  };
  if (options?.workout) input.workout = options.workout;
  const workoutTypeId = completion.workoutTypeId ?? options?.workout?.workoutTypeId;
  const goalId = completion.goalId ?? options?.workout?.goalId;
  if (workoutTypeId) input.workoutTypeId = workoutTypeId;
  if (goalId) input.goalId = goalId;
  if (completion.prescriptionTemplateId) input.prescriptionTemplateId = completion.prescriptionTemplateId;
  if (loadedRecentCompletions.length > 0) input.recentWorkoutCompletions = loadedRecentCompletions;
  if (loadedProgressionDecisions.length > 0) input.recentProgressionDecisions = loadedProgressionDecisions;
  if (loadedReadinessTrend.length > 0) input.readinessTrend = loadedReadinessTrend;
  if (completion.readinessBefore) input.readinessBefore = completion.readinessBefore;
  if (completion.readinessAfter) input.readinessAfter = completion.readinessAfter;
  return recommendNextProgression(input);
}
