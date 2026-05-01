import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import type {
  ExerciseCompletionResult,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  UserWorkoutProfile,
  WorkoutCompletionLog,
} from './types.ts';

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function createUserWorkoutProfile(input: Partial<UserWorkoutProfile> & { userId: string }): UserWorkoutProfile {
  const profile: UserWorkoutProfile = {
    userId: input.userId,
    equipmentIds: input.equipmentIds ?? ['bodyweight'],
    experienceLevel: input.experienceLevel ?? 'beginner',
    safetyFlags: input.safetyFlags ?? [],
    dislikedExerciseIds: input.dislikedExerciseIds ?? [],
    likedExerciseIds: input.likedExerciseIds ?? [],
    preferredDurationMinutes: input.preferredDurationMinutes ?? 35,
    readinessBand: input.readinessBand ?? 'unknown',
    painFlags: input.painFlags ?? [],
    workoutEnvironment: input.workoutEnvironment ?? 'unknown',
  };
  if (input.preferredToneVariant) profile.preferredToneVariant = input.preferredToneVariant;
  return profile;
}

export function generateWorkoutForUserProfile(
  profile: UserWorkoutProfile,
  request: Pick<PersonalizedWorkoutInput, 'goalId'> & Partial<PersonalizedWorkoutInput>,
): GeneratedWorkout {
  const input: PersonalizedWorkoutInput = {
    goalId: request.goalId,
    durationMinutes: request.durationMinutes ?? profile.preferredDurationMinutes,
    preferredDurationMinutes: request.preferredDurationMinutes ?? profile.preferredDurationMinutes,
    equipmentIds: request.equipmentIds ?? profile.equipmentIds,
    experienceLevel: request.experienceLevel ?? profile.experienceLevel,
    safetyFlags: [...profile.safetyFlags, ...(request.safetyFlags ?? [])],
    readinessBand: request.readinessBand ?? profile.readinessBand,
    painFlags: [...profile.painFlags, ...(request.painFlags ?? [])],
    dislikedExerciseIds: [...profile.dislikedExerciseIds, ...(request.dislikedExerciseIds ?? [])],
    likedExerciseIds: [...(profile.likedExerciseIds ?? []), ...(request.likedExerciseIds ?? [])],
  };
  const workoutEnvironment = request.workoutEnvironment ?? profile.workoutEnvironment;
  const preferredToneVariant = request.preferredToneVariant ?? profile.preferredToneVariant;
  if (workoutEnvironment) input.workoutEnvironment = workoutEnvironment;
  if (preferredToneVariant) input.preferredToneVariant = preferredToneVariant;
  if (request.priorExerciseOutcomes) input.priorExerciseOutcomes = request.priorExerciseOutcomes;
  if (request.recentCompletedWorkoutIds) input.recentCompletedWorkoutIds = request.recentCompletedWorkoutIds;
  if (request.recentWorkoutCompletions) input.recentWorkoutCompletions = request.recentWorkoutCompletions;
  if (request.recentProgressionDecisions) input.recentProgressionDecisions = request.recentProgressionDecisions;
  if (request.protectedWorkouts) input.protectedWorkouts = request.protectedWorkouts;
  if (request.sorenessLevel != null) input.sorenessLevel = request.sorenessLevel;
  if (request.sleepQuality != null) input.sleepQuality = request.sleepQuality;
  if (request.energyLevel != null) input.energyLevel = request.energyLevel;
  if (request.availableTimeRange) input.availableTimeRange = request.availableTimeRange;
  return generatePersonalizedWorkout(input);
}

export function summarizeWorkoutCompletion(log: WorkoutCompletionLog): {
  completedExerciseCount: number;
  prescribedCompletionRate: number;
  averageExerciseRpe: number | null;
  painIncreased: boolean;
} {
  const completed = log.exerciseResults.filter((result) => result.completedAsPrescribed).length;
  const rpes = log.exerciseResults
    .map((result) => result.actualRpe)
    .filter((value): value is number => typeof value === 'number');
  return {
    completedExerciseCount: log.exerciseResults.length,
    prescribedCompletionRate: log.exerciseResults.length === 0 ? 0 : completed / log.exerciseResults.length,
    averageExerciseRpe: average(rpes),
    painIncreased: typeof log.painScoreBefore === 'number'
      && typeof log.painScoreAfter === 'number'
      && log.painScoreAfter > log.painScoreBefore,
  };
}

function failedExerciseResults(log: WorkoutCompletionLog): ExerciseCompletionResult[] {
  return log.exerciseResults.filter((result) => !result.completedAsPrescribed || (result.painScore ?? 0) >= 4 || (result.actualRpe ?? 0) >= 9);
}

export function recommendNextProgression(log: WorkoutCompletionLog): ProgressionDecision {
  const summary = summarizeWorkoutCompletion(log);
  const failures = failedExerciseResults(log);
  const safetyFlags: string[] = [];

  if (summary.painIncreased || failures.some((result) => (result.painScore ?? 0) >= 4)) {
    safetyFlags.push('pain_increased_last_session');
    return {
      direction: 'regress',
      reason: 'Pain increased or an exercise produced a concerning pain score.',
      nextAdjustment: 'Use safer substitutions and reduce volume by at least one set next session.',
      safetyFlags,
    };
  }

  if (log.sessionRpe >= 9 || summary.prescribedCompletionRate < 0.75) {
    return {
      direction: 'regress',
      reason: 'The workout was too hard or not completed as prescribed.',
      nextAdjustment: 'Repeat the same goal with lower RPE and fewer sets.',
      safetyFlags,
    };
  }

  if (summary.prescribedCompletionRate >= 0.95 && log.sessionRpe <= 7) {
    return {
      direction: 'progress',
      reason: 'The athlete completed the prescription with manageable effort.',
      nextAdjustment: 'Progress modestly: add one set, two to five minutes, or a small load increase.',
      safetyFlags,
    };
  }

  return {
    direction: 'repeat',
    reason: 'The session was completed but not clearly easy enough to progress.',
    nextAdjustment: 'Repeat the same prescription and aim for cleaner execution.',
    safetyFlags,
  };
}
