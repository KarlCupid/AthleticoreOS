import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import type {
  GeneratedProgram,
  GeneratedProgramSession,
  PersonalizedWorkoutInput,
  ProtectedWorkoutInput,
} from './types.ts';

function goalRotation(primaryGoalId: string): string[] {
  if (primaryGoalId === 'hypertrophy') return ['hypertrophy', 'zone2_cardio', 'mobility'];
  if (primaryGoalId === 'zone2_cardio') return ['zone2_cardio', 'beginner_strength', 'recovery'];
  if (primaryGoalId === 'mobility' || primaryGoalId === 'recovery') return [primaryGoalId, 'zone2_cardio', 'core_durability'];
  return [primaryGoalId, 'zone2_cardio', 'mobility'];
}

export function generateWeeklyWorkoutProgram(input: PersonalizedWorkoutInput & {
  weekCount?: number;
  sessionsPerWeek?: number;
  protectedWorkouts?: ProtectedWorkoutInput[];
}): GeneratedProgram {
  const weekCount = input.weekCount ?? 4;
  const sessionsPerWeek = input.sessionsPerWeek ?? 3;
  const protectedWorkouts = input.protectedWorkouts ?? [];
  const rotation = goalRotation(input.goalId);
  const sessions: GeneratedProgramSession[] = [];
  const warnings: string[] = [];

  for (let weekIndex = 0; weekIndex < weekCount; weekIndex += 1) {
    for (const protectedWorkout of protectedWorkouts) {
      sessions.push({
        id: `week_${weekIndex + 1}:protected:${protectedWorkout.id}`,
        dayIndex: protectedWorkout.dayIndex,
        weekIndex: weekIndex + 1,
        protectedAnchor: true,
        label: protectedWorkout.label,
        workout: null,
      });
    }

    let generatedCount = 0;
    for (let dayIndex = 1; dayIndex <= 7 && generatedCount < sessionsPerWeek; dayIndex += 2) {
      if (protectedWorkouts.some((protectedWorkout) => protectedWorkout.dayIndex === dayIndex)) {
        continue;
      }
      const goalId = rotation[(weekIndex + generatedCount) % rotation.length]!;
      const request = {
        ...input,
        goalId,
        durationMinutes: Math.max(20, input.durationMinutes + (weekIndex === 3 ? -5 : 0)),
      };
      const workout = generatePersonalizedWorkout(weekIndex === 3
        ? { ...request, safetyFlags: [...(input.safetyFlags ?? []), 'time_limited'] }
        : request);
      sessions.push({
        id: `week_${weekIndex + 1}:day_${dayIndex}:${goalId}`,
        dayIndex,
        weekIndex: weekIndex + 1,
        protectedAnchor: false,
        label: workout.blocked ? `Blocked ${goalId}` : workout.templateId,
        workout,
      });
      generatedCount += 1;
    }

    if (generatedCount < sessionsPerWeek) {
      warnings.push(`Week ${weekIndex + 1} has fewer generated sessions because protected anchors occupied available slots.`);
    }
  }

  return {
    id: `${input.goalId}:program:${weekCount}w`,
    goalId: input.goalId,
    weekCount,
    sessions,
    explanations: [
      'Protected workouts were preserved as anchors.',
      'Generated sessions rotate the primary goal with aerobic and mobility support.',
      'Week four is slightly reduced as a basic deload placeholder.',
    ],
    validationWarnings: warnings,
  };
}

export function validateGeneratedProgram(program: GeneratedProgram): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (program.sessions.length === 0) errors.push('Program has no sessions.');
  for (let weekIndex = 1; weekIndex <= program.weekCount; weekIndex += 1) {
    const week = program.sessions.filter((session) => session.weekIndex === weekIndex);
    if (week.length === 0) errors.push(`Week ${weekIndex} has no sessions.`);
    const hardGenerated = week.filter((session) => session.workout && !session.workout.blocked && ['strength', 'hypertrophy', 'full_body_strength'].includes(session.workout.workoutTypeId));
    if (hardGenerated.length > 3) errors.push(`Week ${weekIndex} has too many hard generated sessions.`);
  }
  const protectedIds = program.sessions.filter((session) => session.protectedAnchor).map((session) => session.id);
  if (new Set(protectedIds).size !== protectedIds.length) errors.push('Protected anchor ids must stay unique per week.');
  return { valid: errors.length === 0, errors };
}
