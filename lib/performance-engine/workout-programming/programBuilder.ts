import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import {
  inferProtectedWorkoutModality,
  planWeeklyTrainingDose,
  protectedWorkoutCountsAsHardDay,
  protectedWorkoutLoadScore,
} from './combatTrainingModel.ts';
import type {
  CombatSportContext,
  GeneratedProgram,
  GeneratedProgramSession,
  GeneratedProgramWeek,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  PlannedSessionIntent,
  ProgramCalendarEvent,
  ProgramDeloadStrategy,
  ProgramMovementPatternBalance,
  ProgramPhase,
  ProgramSessionStatus,
  ProgramWeeklyVolumeSummary,
  ProtectedWorkoutInput,
  ProtectedWorkoutModality,
  WeeklyTrainingDosePrescription,
  WorkoutIntensity,
  WorkoutReadinessBand,
} from './types.ts';

type ProgramBuilderInput = PersonalizedWorkoutInput & {
  secondaryGoalIds?: string[];
  weekCount?: number;
  desiredProgramLengthWeeks?: number;
  sessionsPerWeek?: number;
  generatedSessionsPerWeek?: number;
  totalExposureTarget?: number;
  availableDays?: number[];
  protectedWorkouts?: ProtectedWorkoutInput[];
  combatSportContext?: CombatSportContext;
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
const LOW_LOAD_STACKING_ROLES = new Set([
  'aerobic_base',
  'mobility_prehab',
  'recovery',
  'accessory',
  'maintenance',
]);

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
  if (session.plannedIntensity) return session.plannedIntensity === 'hard';
  return isHardWorkout(session.workout);
}

function hasAdjacentHardDay(dayIndex: number, weekSessions: GeneratedProgramSession[]): boolean {
  return weekSessions.some((session) => sessionIsHard(session) && Math.abs(session.dayIndex - dayIndex) <= 1);
}

interface DayLoadState {
  dayIndex: number;
  sessions: GeneratedProgramSession[];
  totalMinutes: number;
  hardCount: number;
  estimatedLoadScore: number;
  modalities: ProtectedWorkoutModality[];
}

function dayLoadsFromSessions(sessions: readonly GeneratedProgramSession[]): Map<number, DayLoadState> {
  const loads = new Map<number, DayLoadState>();
  for (let dayIndex = 1; dayIndex <= 7; dayIndex += 1) {
    loads.set(dayIndex, {
      dayIndex,
      sessions: [],
      totalMinutes: 0,
      hardCount: 0,
      estimatedLoadScore: 0,
      modalities: [],
    });
  }
  for (const session of sessions) {
    const dayIndex = clampDay(session.dayIndex);
    const day = loads.get(dayIndex);
    if (!day) continue;
    day.sessions.push(session);
    day.totalMinutes += session.workout?.estimatedDurationMinutes ?? session.workout?.requestedDurationMinutes ?? 0;
    if (sessionIsHard(session)) day.hardCount += 1;
    day.estimatedLoadScore += session.estimatedLoadScore ?? 0;
    if (session.protectedWorkoutModality) day.modalities.push(session.protectedWorkoutModality);
  }
  return loads;
}

function estimateGeneratedLoad(minutes: number, intensity: WorkoutIntensity): number {
  const rpe = intensity === 'hard' ? 8 : intensity === 'moderate' ? 6 : intensity === 'low' ? 3 : 2;
  return Math.round(minutes * rpe);
}

function intentCountsAsHard(intent: PlannedSessionIntent): boolean {
  return intent.plannedIntensity === 'hard' || (intent.plannedIntensity === 'moderate' && intent.role === 'conditioning_support');
}

function canStackOnProtectedDay(input: {
  day: DayLoadState;
  intent: PlannedSessionIntent;
  durationMinutes: number;
  allowSameDaySupportSessions: boolean;
}): boolean {
  if (input.day.sessions.length === 0) return false;
  const hasProtected = input.day.sessions.some((session) => session.protectedAnchor);
  if (!hasProtected) return false;
  if (intentCountsAsHard(input.intent)) return false;
  if (!input.allowSameDaySupportSessions && !input.intent.canStackWithProtected) return false;
  if (!LOW_LOAD_STACKING_ROLES.has(input.intent.role)) return false;
  if (input.day.hardCount > 0 && !['mobility_prehab', 'recovery', 'accessory'].includes(input.intent.role)) return false;
  if (input.day.totalMinutes + input.durationMinutes > 140) return false;
  return input.day.sessions.every((session) => session.protectedAnchor ? session.protectedAnchor && sessionIsHard(session) ? input.intent.plannedIntensity !== 'moderate' : true : false);
}

function chooseDayForIntent(input: {
  availableDays: number[];
  weekSessions: GeneratedProgramSession[];
  intent: PlannedSessionIntent;
  hardDayCap: number;
  allowSameDaySupportSessions: boolean;
  durationMinutes: number;
}): { dayIndex: number; stacked: boolean } | null {
  const dayLoads = dayLoadsFromSessions(input.weekSessions);
  const candidateDays = input.availableDays.map((day) => dayLoads.get(day)).filter((day): day is DayLoadState => Boolean(day));
  const hardIntent = intentCountsAsHard(input.intent);
  const currentHardDays = hardDayCount(input.weekSessions);

  const sorted = candidateDays
    .map((day) => {
      const stacked = day.sessions.length > 0;
      let score = day.sessions.length * 30 + day.totalMinutes + day.estimatedLoadScore / 25;
      if (hasAdjacentHardDay(day.dayIndex, input.weekSessions)) score += hardIntent ? 250 : 20;
      if (day.hardCount > 0) score += hardIntent ? 500 : 80;
      if (stacked && !hardIntent && LOW_LOAD_STACKING_ROLES.has(input.intent.role)) score -= 12;
      return { day, score, stacked };
    })
    .sort((a, b) => a.score - b.score || a.day.dayIndex - b.day.dayIndex);

  for (const candidate of sorted) {
    const day = candidate.day;
    if (hardIntent) {
      if (currentHardDays >= input.hardDayCap) continue;
      if (day.sessions.length > 0) continue;
      if (hasAdjacentHardDay(day.dayIndex, input.weekSessions)) continue;
      return { dayIndex: day.dayIndex, stacked: false };
    }
    if (day.sessions.length === 0) return { dayIndex: day.dayIndex, stacked: false };
  }

  for (const candidate of sorted) {
    const day = candidate.day;
    if (canStackOnProtectedDay({
      day,
      intent: input.intent,
      durationMinutes: input.durationMinutes,
      allowSameDaySupportSessions: input.allowSameDaySupportSessions,
    })) {
      return { dayIndex: day.dayIndex, stacked: true };
    }
  }

  return null;
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

function requestedDuration(input: ProgramBuilderInput, phase: ProgramPhase, plannedIntensity: WorkoutIntensity): number {
  const range = input.availableTimeRange;
  const base = input.preferredDurationMinutes ?? input.durationMinutes;
  const phaseAdjusted = phase === 'deload' ? base - 8 : phase === 'return_to_training' ? Math.min(base, 30) : base;
  const intensityAdjusted = plannedIntensity === 'hard' ? phaseAdjusted : Math.min(phaseAdjusted, base);
  const min = range?.minMinutes ?? 20;
  const max = range?.maxMinutes ?? Math.max(min, base);
  return Math.max(min, Math.min(max, Math.round(intensityAdjusted)));
}

function requestedDurationForIntent(input: ProgramBuilderInput, phase: ProgramPhase, intent: PlannedSessionIntent): number {
  const base = requestedDuration(input, phase, intent.plannedIntensity);
  if (intent.role === 'mobility_prehab' || intent.role === 'recovery' || intent.role === 'accessory') {
    return Math.min(base, Math.max(20, Math.round(base * 0.75)));
  }
  if (phase === 'deload' && intent.plannedIntensity !== 'recovery') return Math.min(base, 35);
  return base;
}

function preferredDays(input: ProgramBuilderInput): number[] {
  return unique((input.availableDays?.length ? input.availableDays : DEFAULT_AVAILABLE_DAYS).map(clampDay))
    .sort((a, b) => a - b);
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
    totalExposureCount: sessions.length,
    protectedLoadScore: sessions
      .filter((session) => session.protectedAnchor)
      .reduce((sum, session) => sum + (session.estimatedLoadScore ?? 0), 0),
    generatedHardSessionCount: sessions.filter((session) => !session.protectedAnchor && sessionIsHard(session)).length,
    workoutTypeCounts: workoutTypeCounts(sessions),
  };
}

function weeklySummaryWithDose(
  weekIndex: number,
  phase: ProgramPhase,
  sessions: GeneratedProgramSession[],
  weeklyDose?: WeeklyTrainingDosePrescription,
): ProgramWeeklyVolumeSummary {
  const summary = weeklySummary(weekIndex, phase, sessions);
  if (!weeklyDose) return summary;
  return {
    ...summary,
    hardDayCap: weeklyDose.hardDayCap,
    totalExposureCount: sessions.length,
    protectedLoadScore: weeklyDose.protectedLoadScore,
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
    const summary = weeklySummaryWithDose(week.weekIndex, week.phase, week.sessions, week.weeklyDose);
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
    weeklyDosePlan: updatedWeeks.map((week) => week.weeklyDose).filter((dose): dose is WeeklyTrainingDosePrescription => Boolean(dose)),
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
  const protectedWorkouts = input.protectedWorkouts ?? [];
  const availableDays = preferredDays(input);
  const sessions: GeneratedProgramSession[] = [];
  const weeks: GeneratedProgramWeek[] = [];
  const warnings: string[] = [];
  const safetyFlags = input.safetyFlags ?? [];
  const weeklyDosePlan: WeeklyTrainingDosePrescription[] = [];

  for (let weekIndex = 1; weekIndex <= weekCount; weekIndex += 1) {
    const phase = phaseForWeek(input, weekIndex, weekCount);
    const readinessBand = input.readinessTrend?.[weekIndex - 1] ?? input.readinessBand ?? 'unknown';
    const weeklyDose = planWeeklyTrainingDose({
      goalId: input.goalId,
      phase,
      readinessBand,
      protectedWorkouts,
      combatSportContext: input.combatSportContext,
      sessionsPerWeek: input.sessionsPerWeek,
      generatedSessionsPerWeek: input.generatedSessionsPerWeek,
      totalExposureTarget: input.totalExposureTarget,
      safetyFlags,
    });
    weeklyDosePlan.push(weeklyDose);
    const weekSessions: GeneratedProgramSession[] = [];

    for (const protectedWorkout of protectedWorkouts) {
      const modality = inferProtectedWorkoutModality(protectedWorkout);
      const isHard = protectedWorkoutCountsAsHardDay(protectedWorkout);
      const protectedSession: GeneratedProgramSession = {
        id: `week_${weekIndex}:protected:${protectedWorkout.id}`,
        dayIndex: protectedWorkout.dayIndex,
        weekIndex,
        phase,
        protectedAnchor: true,
        label: protectedWorkout.label,
        workout: null,
        plannedIntensity: isHard ? 'hard' : protectedWorkout.intensity,
        protectedWorkoutModality: modality,
        estimatedLoadScore: protectedWorkoutLoadScore(protectedWorkout),
        rationale: [
          'Protected workouts are schedule anchors and are preserved untouched.',
          `${modality} counts toward weekly load${isHard ? ' and hard-day exposure' : ''}, but does not automatically replace generated S&C support.`,
        ],
      };
      weekSessions.push(protectedSession);
    }

    let generatedCount = 0;
    let generatedHardCount = 0;
    for (const sessionIntent of weeklyDose.intents) {
      const durationMinutes = requestedDurationForIntent(input, phase, sessionIntent);
      let placementIntent = sessionIntent;
      let candidate = chooseDayForIntent({
        availableDays,
        weekSessions,
        intent: placementIntent,
        hardDayCap: weeklyDose.hardDayCap,
        allowSameDaySupportSessions: input.combatSportContext?.allowSameDaySupportSessions === true,
        durationMinutes,
      });
      if (candidate == null && intentCountsAsHard(sessionIntent)) {
        placementIntent = {
          ...sessionIntent,
          goalId: 'zone2_cardio',
          plannedIntensity: 'low',
          role: 'accessory',
          canStackWithProtected: true,
          rationale: [
            ...sessionIntent.rationale,
            'Hard support was converted to low aerobic accessory work because no safe hard day was available.',
          ],
        };
        candidate = chooseDayForIntent({
          availableDays,
          weekSessions,
          intent: placementIntent,
          hardDayCap: weeklyDose.hardDayCap,
          allowSameDaySupportSessions: input.combatSportContext?.allowSameDaySupportSessions === true,
          durationMinutes,
        });
      }
      if (candidate == null) {
        warnings.push(`Week ${weekIndex} could not place ${sessionIntent.goalId}; day load and hard-day capacity were full.`);
        continue;
      }

      const intentHard = intentCountsAsHard(placementIntent);
      const overHardBudget = intentHard && generatedHardCount >= weeklyDose.generatedHardSessionCap;
      const adjacentHard = intentHard && hasAdjacentHardDay(candidate.dayIndex, weekSessions);
      const lowConditioningIntent = placementIntent.role === 'conditioning_support'
        && placementIntent.plannedIntensity !== 'hard';
      const goalId = (overHardBudget || adjacentHard || lowConditioningIntent) ? 'zone2_cardio' : placementIntent.goalId;
      const effectiveIntensity = (overHardBudget || adjacentHard) ? 'low' : placementIntent.plannedIntensity;
      const phaseSafetyFlags = phase === 'deload'
        ? unique([...safetyFlags, 'time_limited'])
        : phase === 'return_to_training'
          ? unique([...safetyFlags, 'poor_readiness'])
          : safetyFlags;
      const workoutRequest: PersonalizedWorkoutInput = {
        ...input,
        goalId,
        durationMinutes,
        preferredDurationMinutes: durationMinutes,
        safetyFlags: phaseSafetyFlags,
      };
      if (phase === 'return_to_training') {
        workoutRequest.readinessBand = 'red';
      } else {
        workoutRequest.readinessBand = readinessBand;
      }
      if (input.workoutEnvironment) workoutRequest.workoutEnvironment = input.workoutEnvironment;
      const workout = generatePersonalizedWorkout(workoutRequest);

      const generatedSession: GeneratedProgramSession = {
        id: `week_${weekIndex}:day_${candidate.dayIndex}:${goalId}:${generatedCount + 1}`,
        dayIndex: candidate.dayIndex,
        weekIndex,
        phase,
        protectedAnchor: false,
        label: workout.blocked ? `Blocked ${goalId}` : workout.templateId,
        workout,
        plannedIntensity: effectiveIntensity,
        sessionRole: placementIntent.role,
        estimatedLoadScore: estimateGeneratedLoad(workout.estimatedDurationMinutes, effectiveIntensity),
        rationale: [
          ...placementIntent.rationale,
          `${goalId} was selected as ${placementIntent.role} support in the ${phase} phase.`,
          candidate.stacked ? 'This low-load support session safely stacks with a protected anchor instead of treating that day as closed.' : 'Placement respects weekly day load and hard/easy distribution.',
          overHardBudget ? 'A hard support intent was downgraded because protected work already consumed the hard-session budget.' : '',
          adjacentHard ? 'A hard support intent was downgraded to avoid back-to-back high-fatigue days.' : '',
        ].filter(Boolean),
      };
      if (!generatedSession.workout?.blocked && sessionIsHard(generatedSession)) {
        generatedHardCount += 1;
      }
      if (candidate.stacked) {
        generatedSession.rationale?.push('Protected combat sessions count as load, not as automatic generated-session substitutions.');
      }
      if (workout.blocked && effectiveIntensity === 'hard') {
        generatedSession.plannedIntensity = 'low';
        generatedSession.sessionRole = 'recovery';
      }
      weekSessions.push(generatedSession);
      generatedCount += 1;
    }

    if (generatedCount < weeklyDose.generatedSessionTarget) {
      warnings.push(`Week ${weekIndex} placed ${generatedCount}/${weeklyDose.generatedSessionTarget} generated support sessions because day load or safety capacity was full.`);
    }
    warnings.push(...weeklyDose.warnings.map((warning) => `Week ${weekIndex}: ${warning}`));

    weekSessions.sort((a, b) => a.dayIndex - b.dayIndex);
    const weekPatternBalance = movementPatternCounts(weekSessions);
    const weekWarnings: string[] = [];
    for (let day = 1; day <= 6; day += 1) {
      const todayHard = weekSessions.some((session) => session.dayIndex === day && sessionIsHard(session));
      const tomorrowHard = weekSessions.some((session) => session.dayIndex === day + 1 && sessionIsHard(session));
      if (todayHard && tomorrowHard) weekWarnings.push(`Week ${weekIndex} has back-to-back hard days on days ${day} and ${day + 1}.`);
    }
    if (hardDayCount(weekSessions) > weeklyDose.hardDayCap) {
      weekWarnings.push(`Week ${weekIndex} exceeds resolved hard-day cap (${hardDayCount(weekSessions)}/${weeklyDose.hardDayCap}).`);
    }
    const summary = weeklySummaryWithDose(weekIndex, phase, weekSessions, weeklyDose);
    const week: GeneratedProgramWeek = {
      weekIndex,
      phase,
      sessions: weekSessions,
      rationale: [
        `Week ${weekIndex} uses ${phase} phase logic.`,
        ...weeklyDose.rationale,
        'Protected anchors are placed before generated sessions and credited to load without subtracting from generated support frequency.',
        'Generated sessions are placed with day-load capacity, safe same-day support rules, and hard/easy distribution.',
      ],
      movementPatternBalance: weekPatternBalance,
      weeklyVolumeSummary: summary,
      weeklyDose,
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
      'Program sessions are planned from a combat-first weekly dose before scheduling.',
      'Protected workouts count toward training load and hard-day exposure without automatically replacing generated S&C support.',
      'Generated sessions are placed by day load, weekly availability, safety flags, same-day support rules, and hard/easy distribution.',
      'Movement pattern exposure is tracked to reduce repeated joint and muscle stress.',
      'Deload and return-to-training weeks reduce dose before adding progression.',
    ],
    movementPatternBalance,
    weeklyVolumeSummary,
    hardDayCount: weeklyVolumeSummary.reduce((sum, week) => sum + week.hardDayCount, 0),
    progressionPlan,
    explanations: [
      'Protected workouts were preserved as anchors.',
      'Generated sessions are labeled as strength/power, aerobic, conditioning support, mobility/prehab, recovery, accessory, or maintenance.',
      'Readiness and protected hard days can reduce intensity or hard-session count while preserving useful low-load frequency.',
      'Phase logic controls accumulation, intensification, deload, return-to-training, and maintenance weeks.',
    ],
    validationWarnings: warnings,
    weeklyDosePlan,
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
    const hardDayCap = week?.weeklyDose?.hardDayCap ?? week?.weeklyVolumeSummary.hardDayCap ?? 3;
    if (!week) errors.push(`Week ${weekIndex} is missing structured week output.`);
    if (weekSessions.length === 0) errors.push(`Week ${weekIndex} has no sessions.`);
    if (hardDayCount(weekSessions) > hardDayCap) errors.push(`Week ${weekIndex} has too many hard sessions for the resolved hard-day cap (${hardDayCount(weekSessions)}/${hardDayCap}).`);
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
