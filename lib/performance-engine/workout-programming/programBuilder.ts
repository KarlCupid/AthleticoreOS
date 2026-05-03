import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import type {
  GeneratedProgram,
  GeneratedProgramSession,
  GeneratedProgramWeek,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgramCalendarEvent,
  ProgramDeloadStrategy,
  ProgramMovementPatternBalance,
  ProgramPhase,
  ProgramSessionStatus,
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
  startDate?: string;
  calendarEvents?: ProgramCalendarEvent[];
  existingCalendarEvents?: ProgramCalendarEvent[];
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

function isoDate(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    ? value
    : null;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

function dateForProgramDay(startDate: string, weekIndex: number, dayIndex: number): string {
  return addDays(startDate, (weekIndex - 1) * 7 + (clampDay(dayIndex) - 1));
}

function dayIndexForDate(startDate: string, date: string): { weekIndex: number; dayIndex: number } {
  const delta = Math.max(0, daysBetween(startDate, date));
  return {
    weekIndex: Math.floor(delta / 7) + 1,
    dayIndex: (delta % 7) + 1,
  };
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

function programEndDate(startDate: string, weekCount: number): string {
  return addDays(startDate, Math.max(0, weekCount * 7 - 1));
}

function conflictEventsFor(date: string, events: readonly ProgramCalendarEvent[]): ProgramCalendarEvent[] {
  return events.filter((event) => event.date === date);
}

function existingSessionDates(
  sessions: readonly GeneratedProgramSession[],
  excludedSessionId: string,
): Set<string> {
  return new Set(sessions
    .filter((session) => session.id !== excludedSessionId && Boolean(session.scheduledDate))
    .map((session) => session.scheduledDate as string));
}

function openDateForSession(input: {
  session: GeneratedProgramSession;
  weekSessions: GeneratedProgramSession[];
  startDate: string;
  availableDays: number[];
  events: readonly ProgramCalendarEvent[];
  occupiedDates: Set<string>;
}): { dayIndex: number; scheduledDate: string } | null {
  const candidateDays = unique([input.session.dayIndex, ...input.availableDays].map(clampDay));
  for (const dayIndex of candidateDays) {
    const scheduledDate = dateForProgramDay(input.startDate, input.session.weekIndex, dayIndex);
    if (input.occupiedDates.has(scheduledDate)) continue;
    if (conflictEventsFor(scheduledDate, input.events).length > 0) continue;
    if (sessionIsHard(input.session) && hasAdjacentHardDay(dayIndex, input.weekSessions.filter((session) => session.id !== input.session.id))) continue;
    return { dayIndex, scheduledDate };
  }
  return null;
}

function rebuildProgram(
  program: GeneratedProgram,
  weeks: GeneratedProgramWeek[],
  warnings: string[],
): GeneratedProgram {
  const sessions = weeks.flatMap((week) => week.sessions);
  const updatedWeeks = weeks.map((week) => {
    const summary = weeklySummary(week.weekIndex, week.phase, week.sessions);
    const weekWarnings: string[] = [];
    for (let day = 1; day <= 6; day += 1) {
      const todayHard = week.sessions.some((session) => session.dayIndex === day && sessionIsHard(session));
      const tomorrowHard = week.sessions.some((session) => session.dayIndex === day + 1 && sessionIsHard(session));
      if (todayHard && tomorrowHard) weekWarnings.push(`Week ${week.weekIndex} has back-to-back hard days on days ${day} and ${day + 1}.`);
    }
    return {
      ...week,
      movementPatternBalance: movementPatternCounts(week.sessions),
      weeklyVolumeSummary: summary,
      hardDayCount: summary.hardDayCount,
      validationWarnings: unique([...week.validationWarnings, ...weekWarnings]),
    };
  });
  const movementPatternBalance = buildMovementPatternBalance(updatedWeeks);
  const weeklyVolumeSummary = updatedWeeks.map((week) => week.weeklyVolumeSummary);
  return {
    ...program,
    weeks: updatedWeeks,
    sessions,
    movementPatternBalance,
    weeklyVolumeSummary,
    hardDayCount: weeklyVolumeSummary.reduce((sum, week) => sum + week.hardDayCount, 0),
    validationWarnings: unique([...program.validationWarnings, ...warnings, ...updatedWeeks.flatMap((week) => week.validationWarnings), ...movementPatternBalance.warnings]),
    calendarWarnings: unique([...(program.calendarWarnings ?? []), ...warnings]),
  };
}

export function integrateProgramWithCalendar(
  program: GeneratedProgram,
  options: {
    startDate?: string;
    availableDays?: number[];
    existingCalendarEvents?: ProgramCalendarEvent[];
  } = {},
): GeneratedProgram {
  const startDate = isoDate(options.startDate ?? program.scheduleStartDate ?? '');
  if (!startDate) return program;

  const availableDays = unique((options.availableDays?.length ? options.availableDays : DEFAULT_AVAILABLE_DAYS).map(clampDay));
  const events = options.existingCalendarEvents ?? [];
  const warnings: string[] = [];
  const weeks = program.weeks.map((week) => {
    const occupiedDates = new Set(events.map((event) => event.date));
    const nextSessions: GeneratedProgramSession[] = [];
    for (const session of week.sessions) {
      const defaultDate = session.scheduledDate ?? dateForProgramDay(startDate, session.weekIndex, session.dayIndex);
      const conflicts = conflictEventsFor(defaultDate, events);
      if (session.protectedAnchor) {
        if (conflicts.length > 0) {
          warnings.push(`${session.label} is protected and remains on ${defaultDate} despite a calendar overlap.`);
        }
        const protectedSession: GeneratedProgramSession = {
          ...session,
          scheduledDate: defaultDate,
          status: session.status ?? 'scheduled',
        };
        nextSessions.push(protectedSession);
        occupiedDates.add(defaultDate);
        continue;
      }

      if (conflicts.length === 0 && !occupiedDates.has(defaultDate)) {
        const scheduledSession: GeneratedProgramSession = {
          ...session,
          scheduledDate: defaultDate,
          status: session.status ?? 'scheduled',
        };
        nextSessions.push(scheduledSession);
        occupiedDates.add(defaultDate);
        continue;
      }

      const candidate = openDateForSession({
        session,
        weekSessions: [...nextSessions, ...week.sessions.filter((item) => item.id !== session.id)],
        startDate,
        availableDays,
        events,
        occupiedDates,
      });
      if (candidate) {
        warnings.push(`${session.label} moved from ${defaultDate} to ${candidate.scheduledDate} to avoid a calendar conflict.`);
        const movedSession: GeneratedProgramSession = {
          ...session,
          dayIndex: candidate.dayIndex,
          scheduledDate: candidate.scheduledDate,
          originalScheduledDate: session.originalScheduledDate ?? defaultDate,
          status: 'rescheduled',
          calendarEventId: conflicts[0]?.id ?? null,
        };
        nextSessions.push(movedSession);
        occupiedDates.add(candidate.scheduledDate);
      } else {
        warnings.push(`${session.label} could not be moved away from ${defaultDate}; all available days were occupied or unsafe.`);
        const conflictedSession: GeneratedProgramSession = {
          ...session,
          scheduledDate: defaultDate,
          status: session.status ?? 'scheduled',
          calendarEventId: conflicts[0]?.id ?? null,
        };
        nextSessions.push(conflictedSession);
        occupiedDates.add(defaultDate);
      }
    }
    return {
      ...week,
      sessions: nextSessions.sort((a, b) => a.dayIndex - b.dayIndex),
    };
  });

  return rebuildProgram({
    ...program,
    scheduleStartDate: startDate,
    scheduleEndDate: programEndDate(startDate, program.weekCount),
  }, weeks, warnings);
}

export function rescheduleProgramSession(
  program: GeneratedProgram,
  input: {
    sessionId: string;
    targetDate?: string;
    missedAt?: string;
    availableDays?: number[];
    existingCalendarEvents?: ProgramCalendarEvent[];
  },
): GeneratedProgram {
  const startDate = isoDate(program.scheduleStartDate ?? input.missedAt?.slice(0, 10) ?? input.targetDate ?? '');
  if (!startDate) {
    return {
      ...program,
      validationWarnings: unique([...program.validationWarnings, 'Cannot reschedule program session without a program schedule start date or target date.']),
    };
  }
  const warnings: string[] = [];
  const events = input.existingCalendarEvents ?? [];
  const targetSession = program.sessions.find((session) => session.id === input.sessionId);
  if (!targetSession) {
    return {
      ...program,
      validationWarnings: unique([...program.validationWarnings, `Program session ${input.sessionId} was not found for rescheduling.`]),
    };
  }
  if (targetSession.protectedAnchor) {
    warnings.push(`${targetSession.label} is protected and was not rescheduled.`);
    return rebuildProgram(program, program.weeks, warnings);
  }

  const occupied = existingSessionDates(program.sessions, input.sessionId);
  for (const event of events) occupied.add(event.date);
  const preferredDate = isoDate(input.targetDate ?? '') ?? addDays(targetSession.scheduledDate ?? dateForProgramDay(startDate, targetSession.weekIndex, targetSession.dayIndex), 1);
  const preferredIndex = dayIndexForDate(startDate, preferredDate);
  const preferredWeekSessions = program.sessions.filter((session) => session.weekIndex === preferredIndex.weekIndex && session.id !== input.sessionId);
  const preferredAllowed = preferredIndex.weekIndex >= 1
    && preferredIndex.weekIndex <= program.weekCount
    && conflictEventsFor(preferredDate, events).length === 0
    && !occupied.has(preferredDate)
    && !(sessionIsHard(targetSession) && hasAdjacentHardDay(preferredIndex.dayIndex, preferredWeekSessions));
  const candidate = preferredAllowed
    ? { dayIndex: preferredIndex.dayIndex, scheduledDate: preferredDate }
    : openDateForSession({
      session: targetSession,
      weekSessions: program.sessions.filter((session) => session.weekIndex === targetSession.weekIndex),
      startDate,
      availableDays: input.availableDays ?? DEFAULT_AVAILABLE_DAYS,
      events,
      occupiedDates: occupied,
    });

  const updatedSessions = program.sessions.map((session) => {
    if (session.id !== input.sessionId) return session;
    if (!candidate) {
      warnings.push(`${session.label} was marked missed but no open reschedule date was found.`);
      return {
        ...session,
        status: 'missed' as ProgramSessionStatus,
      };
    }
    warnings.push(`${session.label} was rescheduled to ${candidate.scheduledDate}.`);
    const candidateIndex = dayIndexForDate(startDate, candidate.scheduledDate);
    return {
      ...session,
      weekIndex: candidateIndex.weekIndex,
      dayIndex: candidate.dayIndex,
      originalScheduledDate: session.originalScheduledDate ?? session.scheduledDate ?? dateForProgramDay(startDate, session.weekIndex, session.dayIndex),
      scheduledDate: candidate.scheduledDate,
      status: 'rescheduled' as ProgramSessionStatus,
    };
  });
  const weeks = program.weeks.map((week) => ({
    ...week,
    sessions: updatedSessions.filter((session) => session.weekIndex === week.weekIndex).sort((a, b) => a.dayIndex - b.dayIndex),
  }));
  return rebuildProgram(program, weeks, warnings);
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

  const program: GeneratedProgram = {
    id: `${input.goalId}:program:${weekCount}w`,
    status: 'draft',
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
  const calendarEvents = input.calendarEvents ?? input.existingCalendarEvents ?? [];
  if (input.startDate || calendarEvents.length > 0) {
    return integrateProgramWithCalendar(program, {
      ...(input.startDate ? { startDate: input.startDate } : {}),
      availableDays,
      existingCalendarEvents: calendarEvents,
    });
  }
  return program;
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
