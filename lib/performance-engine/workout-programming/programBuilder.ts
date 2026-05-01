import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import type {
  GeneratedProgram,
  GeneratedProgramSession,
  GeneratedProgramWeek,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgramDeloadStrategy,
  ProgramMovementPatternBalance,
  ProgramPhase,
  ProgramWeeklyVolumeSummary,
  ProtectedWorkoutInput,
  WorkoutIntensity,
  WorkoutReadinessBand,
} from './types.ts';

type ProgramBuilderInput = PersonalizedWorkoutInput & {
  secondaryGoalIds?: string[];
  weekCount?: number;
  desiredProgramLengthWeeks?: number;
  sessionsPerWeek?: number;
  availableDays?: number[];
  protectedWorkouts?: ProtectedWorkoutInput[];
  readinessTrend?: WorkoutReadinessBand[];
  deloadStrategy?: ProgramDeloadStrategy;
};

const HARD_WORKOUT_TYPES = new Set([
  'strength',
  'full_body_strength',
  'upper_strength',
  'lower_strength',
  'hypertrophy',
  'power',
  'boxing_support',
  'conditioning',
]);

const DEFAULT_AVAILABLE_DAYS = [1, 3, 5, 7];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function clampDay(day: number): number {
  return Math.max(1, Math.min(7, Math.round(day)));
}

function isHardWorkout(workout: GeneratedWorkout | null): boolean {
  if (!workout || workout.blocked) return false;
  if (HARD_WORKOUT_TYPES.has(workout.workoutTypeId)) return true;
  return workout.blocks
    .flatMap((block) => block.exercises)
    .some((exercise) => exercise.prescription.targetRpe >= 7);
}

function sessionIsHard(session: GeneratedProgramSession): boolean {
  if (session.protectedAnchor) return session.plannedIntensity === 'hard';
  return isHardWorkout(session.workout);
}

function hasAdjacentHardDay(dayIndex: number, weekSessions: GeneratedProgramSession[]): boolean {
  return weekSessions.some((session) => sessionIsHard(session) && Math.abs(session.dayIndex - dayIndex) <= 1);
}

function phaseForWeek(input: ProgramBuilderInput, weekIndex: number, weekCount: number): ProgramPhase {
  const readiness = input.readinessTrend?.[weekIndex - 1] ?? input.readinessBand;
  if (readiness === 'red') return 'return_to_training';

  const deloadStrategy = input.deloadStrategy ?? 'week_four';
  if (
    deloadStrategy === 'week_four' && weekIndex % 4 === 0
    || deloadStrategy === 'every_fourth_week' && weekIndex % 4 === 0
    || deloadStrategy === 'readiness_based' && readiness === 'orange'
  ) {
    return 'deload';
  }

  if (weekCount <= 2) return 'maintenance';
  if (weekIndex === 1) return 'accumulation';
  if (weekIndex < weekCount) return 'intensification';
  return 'maintenance';
}

function primaryGoalCount(goalId: string, sessionsPerWeek: number, phase: ProgramPhase): number {
  if (phase === 'deload' || phase === 'return_to_training') return 0;
  if (sessionsPerWeek < 3) return 1;
  if (['hypertrophy', 'dumbbell_hypertrophy', 'beginner_strength', 'full_gym_strength'].includes(goalId)) return 2;
  return 1;
}

function supportGoal(goalId: string, used: string[]): string {
  if (goalId === 'zone2_cardio') return used.includes('beginner_strength') ? 'mobility' : 'beginner_strength';
  if (goalId === 'mobility' || goalId === 'recovery') return used.includes('zone2_cardio') ? 'core_durability' : 'zone2_cardio';
  return used.includes('zone2_cardio') ? 'mobility' : 'zone2_cardio';
}

function goalQueue(input: ProgramBuilderInput, phase: ProgramPhase, sessionsPerWeek: number): string[] {
  if (phase === 'return_to_training') return ['recovery', 'mobility', 'zone2_cardio', 'core_durability'].slice(0, sessionsPerWeek);
  if (phase === 'deload') return ['recovery', 'mobility', 'zone2_cardio', input.goalId].slice(0, sessionsPerWeek);

  const goals: string[] = [];
  const primaryCount = primaryGoalCount(input.goalId, sessionsPerWeek, phase);
  for (let index = 0; index < primaryCount; index += 1) goals.push(input.goalId);
  for (const secondaryGoalId of input.secondaryGoalIds ?? []) {
    if (goals.length < sessionsPerWeek) goals.push(secondaryGoalId);
  }
  while (goals.length < sessionsPerWeek) goals.push(supportGoal(input.goalId, goals));
  return goals.slice(0, sessionsPerWeek);
}

function plannedIntensityForGoal(goalId: string, phase: ProgramPhase): WorkoutIntensity {
  if (phase === 'deload' || phase === 'return_to_training') return goalId === 'recovery' ? 'recovery' : 'low';
  if (['zone2_cardio', 'mobility', 'recovery'].includes(goalId)) return goalId === 'recovery' ? 'recovery' : 'low';
  if (['beginner_strength', 'hypertrophy', 'dumbbell_hypertrophy', 'full_gym_strength', 'upper_body_strength', 'lower_body_strength', 'boxing_support'].includes(goalId)) return 'hard';
  return 'moderate';
}

function requestedDuration(input: ProgramBuilderInput, phase: ProgramPhase, plannedIntensity: WorkoutIntensity): number {
  const range = input.availableTimeRange;
  const base = input.preferredDurationMinutes ?? input.durationMinutes;
  const phaseAdjusted = phase === 'deload' ? base - 8 : phase === 'return_to_training' ? Math.min(base, 30) : base;
  const intensityAdjusted = plannedIntensity === 'hard' ? phaseAdjusted : Math.min(phaseAdjusted, base);
  const min = range?.minMinutes ?? 20;
  const max = range?.maxMinutes ?? Math.max(min, base);
  return Math.max(min, Math.min(max, Math.round(intensityAdjusted)));
}

function preferredDays(input: ProgramBuilderInput): number[] {
  return unique((input.availableDays?.length ? input.availableDays : DEFAULT_AVAILABLE_DAYS).map(clampDay))
    .sort((a, b) => a - b);
}

function chooseDay(input: {
  availableDays: number[];
  occupiedDays: Set<number>;
  weekSessions: GeneratedProgramSession[];
  plannedIntensity: WorkoutIntensity;
}): number | null {
  const openDays = input.availableDays.filter((day) => !input.occupiedDays.has(day));
  if (openDays.length === 0) return null;
  if (input.plannedIntensity !== 'hard') return openDays[0] ?? null;
  return openDays.find((day) => !hasAdjacentHardDay(day, input.weekSessions)) ?? openDays[0] ?? null;
}

function movementPatternCounts(sessions: GeneratedProgramSession[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    for (const exercise of session.workout?.blocks.flatMap((block) => block.exercises) ?? []) {
      for (const patternId of exercise.movementPatternIds) {
        counts[patternId] = (counts[patternId] ?? 0) + 1;
      }
    }
  }
  return counts;
}

function workoutTypeCounts(sessions: GeneratedProgramSession[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    if (!session.workout || session.workout.blocked) continue;
    counts[session.workout.workoutTypeId] = (counts[session.workout.workoutTypeId] ?? 0) + 1;
  }
  return counts;
}

function hardDayCount(sessions: GeneratedProgramSession[]): number {
  return sessions.filter(sessionIsHard).length;
}

function weeklySummary(weekIndex: number, phase: ProgramPhase, sessions: GeneratedProgramSession[]): ProgramWeeklyVolumeSummary {
  return {
    weekIndex,
    phase,
    generatedSessionCount: sessions.filter((session) => !session.protectedAnchor).length,
    protectedSessionCount: sessions.filter((session) => session.protectedAnchor).length,
    estimatedMinutes: sessions.reduce((sum, session) => sum + (session.workout?.estimatedDurationMinutes ?? 0), 0),
    hardDayCount: hardDayCount(sessions),
    workoutTypeCounts: workoutTypeCounts(sessions),
  };
}

function movementBalanceWarnings(weeklyCounts: Record<number, Record<string, number>>): string[] {
  const warnings: string[] = [];
  for (const [weekIndex, counts] of Object.entries(weeklyCounts)) {
    for (const [patternId, count] of Object.entries(counts)) {
      if (count > 6 && !['breathing', 'locomotion'].includes(patternId)) {
        warnings.push(`Week ${weekIndex} has high ${patternId} exposure (${count}).`);
      }
    }
    const hasStrengthPattern = ['squat', 'hinge', 'horizontal_push', 'horizontal_pull'].some((patternId) => (counts[patternId] ?? 0) > 0);
    const hasRecoveryPattern = ['breathing', 'hip_mobility', 'thoracic_mobility', 'locomotion'].some((patternId) => (counts[patternId] ?? 0) > 0);
    if (hasStrengthPattern && !hasRecoveryPattern) warnings.push(`Week ${weekIndex} needs mobility, recovery, or aerobic support.`);
  }
  return warnings;
}

function buildMovementPatternBalance(weeks: GeneratedProgramWeek[]): ProgramMovementPatternBalance {
  const weekly: Record<number, Record<string, number>> = {};
  const programTotal: Record<string, number> = {};
  for (const week of weeks) {
    weekly[week.weekIndex] = week.movementPatternBalance;
    for (const [patternId, count] of Object.entries(week.movementPatternBalance)) {
      programTotal[patternId] = (programTotal[patternId] ?? 0) + count;
    }
  }
  return {
    weekly,
    programTotal,
    warnings: movementBalanceWarnings(weekly),
  };
}

function progressionPlanFor(input: ProgramBuilderInput, weeks: GeneratedProgramWeek[]): string[] {
  return weeks.map((week) => {
    if (week.phase === 'deload') return `Week ${week.weekIndex}: reduce hard volume and keep recovery/mobility support.`;
    if (week.phase === 'return_to_training') return `Week ${week.weekIndex}: rebuild with recovery-first sessions until readiness improves.`;
    if (week.phase === 'intensification') return `Week ${week.weekIndex}: progress ${input.goalId} only if pain, readiness, and completion stay stable.`;
    if (week.phase === 'maintenance') return `Week ${week.weekIndex}: maintain exposure and avoid adding new fatigue.`;
    return `Week ${week.weekIndex}: accumulate repeatable ${input.goalId} work with aerobic and mobility support.`;
  });
}

export function generateWeeklyWorkoutProgram(input: ProgramBuilderInput): GeneratedProgram {
  const weekCount = input.desiredProgramLengthWeeks ?? input.weekCount ?? 4;
  const sessionsPerWeek = input.sessionsPerWeek ?? 3;
  const protectedWorkouts = input.protectedWorkouts ?? [];
  const availableDays = preferredDays(input);
  const sessions: GeneratedProgramSession[] = [];
  const weeks: GeneratedProgramWeek[] = [];
  const warnings: string[] = [];
  const safetyFlags = input.safetyFlags ?? [];

  for (let weekIndex = 1; weekIndex <= weekCount; weekIndex += 1) {
    const phase = phaseForWeek(input, weekIndex, weekCount);
    const weekSessions: GeneratedProgramSession[] = [];
    const occupiedDays = new Set<number>();

    for (const protectedWorkout of protectedWorkouts) {
      const protectedSession: GeneratedProgramSession = {
        id: `week_${weekIndex}:protected:${protectedWorkout.id}`,
        dayIndex: protectedWorkout.dayIndex,
        weekIndex,
        phase,
        protectedAnchor: true,
        label: protectedWorkout.label,
        workout: null,
        plannedIntensity: protectedWorkout.intensity,
        rationale: ['Protected workouts are schedule anchors and are preserved untouched.'],
      };
      weekSessions.push(protectedSession);
      occupiedDays.add(protectedWorkout.dayIndex);
    }

    const goals = goalQueue(input, phase, sessionsPerWeek);
    let generatedCount = 0;
    for (const originalGoalId of goals) {
      const plannedIntensity = plannedIntensityForGoal(originalGoalId, phase);
      const dayIndex = chooseDay({ availableDays, occupiedDays, weekSessions, plannedIntensity });
      if (dayIndex == null) {
        warnings.push(`Week ${weekIndex} could not place ${originalGoalId}; available days were occupied.`);
        continue;
      }

      const adjacentHard = plannedIntensity === 'hard' && hasAdjacentHardDay(dayIndex, weekSessions);
      const goalId = adjacentHard ? 'zone2_cardio' : originalGoalId;
      const effectiveIntensity = adjacentHard ? 'low' : plannedIntensity;
      const phaseSafetyFlags = phase === 'deload'
        ? unique([...safetyFlags, 'time_limited'])
        : phase === 'return_to_training'
          ? unique([...safetyFlags, 'poor_readiness'])
          : safetyFlags;
      const workoutRequest: PersonalizedWorkoutInput = {
        ...input,
        goalId,
        durationMinutes: requestedDuration(input, phase, effectiveIntensity),
        preferredDurationMinutes: requestedDuration(input, phase, effectiveIntensity),
        safetyFlags: phaseSafetyFlags,
      };
      if (phase === 'return_to_training') {
        workoutRequest.readinessBand = 'red';
      } else if (input.readinessBand) {
        workoutRequest.readinessBand = input.readinessBand;
      }
      if (input.workoutEnvironment) workoutRequest.workoutEnvironment = input.workoutEnvironment;
      const workout = generatePersonalizedWorkout(workoutRequest);

      const generatedSession: GeneratedProgramSession = {
        id: `week_${weekIndex}:day_${dayIndex}:${goalId}:${generatedCount + 1}`,
        dayIndex,
        weekIndex,
        phase,
        protectedAnchor: false,
        label: workout.blocked ? `Blocked ${goalId}` : workout.templateId,
        workout,
        plannedIntensity: effectiveIntensity,
        rationale: [
          `${goalId} was selected for ${phase} phase support.`,
          adjacentHard ? 'A hard session was downgraded to avoid back-to-back high-fatigue days.' : 'Placement respects hard/easy distribution.',
        ],
      };
      weekSessions.push(generatedSession);
      occupiedDays.add(dayIndex);
      generatedCount += 1;
    }

    if (generatedCount < sessionsPerWeek) {
      warnings.push(`Week ${weekIndex} has fewer generated sessions because protected anchors or availability occupied slots.`);
    }

    weekSessions.sort((a, b) => a.dayIndex - b.dayIndex);
    const weekPatternBalance = movementPatternCounts(weekSessions);
    const weekWarnings: string[] = [];
    for (let day = 1; day <= 6; day += 1) {
      const todayHard = weekSessions.some((session) => session.dayIndex === day && sessionIsHard(session));
      const tomorrowHard = weekSessions.some((session) => session.dayIndex === day + 1 && sessionIsHard(session));
      if (todayHard && tomorrowHard) weekWarnings.push(`Week ${weekIndex} has back-to-back hard days on days ${day} and ${day + 1}.`);
    }
    const summary = weeklySummary(weekIndex, phase, weekSessions);
    const week: GeneratedProgramWeek = {
      weekIndex,
      phase,
      sessions: weekSessions,
      rationale: [
        `Week ${weekIndex} uses ${phase} phase logic.`,
        'Protected anchors are placed before generated sessions.',
        'Generated sessions are placed to balance hard and easy exposures.',
      ],
      movementPatternBalance: weekPatternBalance,
      weeklyVolumeSummary: summary,
      hardDayCount: summary.hardDayCount,
      validationWarnings: weekWarnings,
    };
    weeks.push(week);
    sessions.push(...weekSessions);
    warnings.push(...weekWarnings);
  }

  const movementPatternBalance = buildMovementPatternBalance(weeks);
  warnings.push(...movementPatternBalance.warnings);
  const weeklyVolumeSummary = weeks.map((week) => week.weeklyVolumeSummary);
  const progressionPlan = progressionPlanFor(input, weeks);
  const currentPhase = weeks[0]?.phase ?? 'maintenance';

  return {
    id: `${input.goalId}:program:${weekCount}w`,
    goalId: input.goalId,
    weekCount,
    phase: currentPhase,
    weeks,
    sessions,
    rationale: [
      'Program sessions are planned by phase, weekly availability, protected anchors, safety flags, and hard/easy distribution.',
      'Movement pattern exposure is tracked to reduce repeated joint and muscle stress.',
      'Deload and return-to-training weeks reduce dose before adding progression.',
    ],
    movementPatternBalance,
    weeklyVolumeSummary,
    hardDayCount: weeklyVolumeSummary.reduce((sum, week) => sum + week.hardDayCount, 0),
    progressionPlan,
    explanations: [
      'Protected workouts were preserved as anchors.',
      'Generated sessions balance primary work with aerobic, mobility, and recovery support.',
      'Phase logic controls accumulation, intensification, deload, return-to-training, and maintenance weeks.',
    ],
    validationWarnings: warnings,
  };
}

export function validateGeneratedProgram(program: GeneratedProgram): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (program.sessions.length === 0) errors.push('Program has no sessions.');
  if (program.weeks.length !== program.weekCount) errors.push('Program weeks do not match weekCount.');
  if (program.weeklyVolumeSummary.length !== program.weekCount) errors.push('Program weekly summaries do not match weekCount.');
  if (!program.progressionPlan.length) errors.push('Program is missing progression plan.');

  for (let weekIndex = 1; weekIndex <= program.weekCount; weekIndex += 1) {
    const week = program.weeks.find((item) => item.weekIndex === weekIndex);
    const weekSessions = program.sessions.filter((session) => session.weekIndex === weekIndex);
    if (!week) errors.push(`Week ${weekIndex} is missing structured week output.`);
    if (weekSessions.length === 0) errors.push(`Week ${weekIndex} has no sessions.`);
    if (hardDayCount(weekSessions) > 3) errors.push(`Week ${weekIndex} has too many hard sessions.`);
    for (let day = 1; day <= 6; day += 1) {
      const todayHard = weekSessions.some((session) => session.dayIndex === day && sessionIsHard(session));
      const tomorrowHard = weekSessions.some((session) => session.dayIndex === day + 1 && sessionIsHard(session));
      if (todayHard && tomorrowHard) errors.push(`Week ${weekIndex} has back-to-back hard days on days ${day} and ${day + 1}.`);
    }
    for (const session of weekSessions) {
      if (!session.protectedAnchor && !session.workout) errors.push(`${session.id} is missing generated workout.`);
      if (session.workout?.validation && !session.workout.validation.isValid) errors.push(`${session.id} generated workout is invalid.`);
    }
  }

  const protectedIds = program.sessions.filter((session) => session.protectedAnchor).map((session) => session.id);
  if (new Set(protectedIds).size !== protectedIds.length) errors.push('Protected anchor ids must stay unique per week.');
  if (program.movementPatternBalance.warnings.some((warning) => warning.includes('needs mobility'))) {
    errors.push('Program movement pattern balance is missing recovery support.');
  }
  return { valid: errors.length === 0, errors };
}
