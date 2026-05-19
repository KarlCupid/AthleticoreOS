import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import {
  emptySupportDomainSummary,
  isSAndCSupportDomain,
  protectedModalityToAthleticDevelopmentDomain,
  supportDomainLabel,
  supportSessionMetadata,
  familyToAthleticDevelopmentDomain,
  supportDomainSourceLabel,
} from './athleteSupportDomains.ts';
import {
  finalizeBoxingWeeklyDosePlan,
  inferProtectedWorkoutModality,
  planWeeklyTrainingDose,
  protectedWorkoutCountsAsHardDay,
  protectedWorkoutLoadScore,
  templateIdForBoxingFamily,
} from './boxingTrainingModel.ts';
import type {
  BoxingWeekLayoutCandidate,
  BoxingAthleteSupportDomain,
  BoxingTrainingContext,
  BoxingSessionFamily,
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
  boxingTrainingContext?: BoxingTrainingContext;
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
  'boxing_skill_microdose',
  'boxing_technical_practice',
  'footwork_agility',
  'reaction_rhythm',
  'shoulder_scap_durability',
  'neck_trap_durability',
  'hip_footwork_durability',
  'roadwork_aerobic_base',
  'aerobic_base',
  'mobility_prehab',
  'recovery_reset',
  'recovery',
  'accessory',
  'maintenance',
]);

const HARD_BOXING_FAMILIES = new Set([
  'max_strength_lower',
  'strength_power',
  'explosive_power',
  'roadwork_intervals',
  'alactic_repeat_power',
  'glycolytic_round_tolerance',
]);

const PLAUSIBLE_BOXING_TEMPLATE_IDS: Partial<Record<BoxingSessionFamily, readonly string[]>> = {
  boxing_skill_microdose: ['boxing_skill_microdose'],
  footwork_agility: ['footwork_agility'],
  reaction_rhythm: ['boxing_skill_microdose', 'shadowboxing_quality', 'footwork_agility'],
  shadowboxing_quality: ['shadowboxing_quality'],
  bag_pad_support: ['boxing_skill_microdose', 'shadowboxing_quality'],
  max_strength_lower: ['lower_strength', 'full_gym_strength'],
  strength_power: ['boxing_support', 'full_gym_strength', 'lower_strength'],
  explosive_power: ['boxing_rotational_power', 'boxing_support'],
  rotational_power: ['boxing_rotational_power'],
  trunk_durability: ['boxing_trunk_durability'],
  shoulder_scap_durability: ['boxing_shoulder_scap_durability'],
  neck_trap_durability: ['boxing_neck_trap_durability'],
  hip_ankle_mobility: ['boxing_hip_ankle_mobility'],
  roadwork_zone2: ['boxing_roadwork_zone2'],
  roadwork_tempo: ['boxing_roadwork_tempo'],
  roadwork_intervals: ['boxing_roadwork_intervals'],
  alactic_repeat_power: ['boxing_alactic_repeat_power'],
  glycolytic_round_tolerance: ['boxing_glycolytic_round_tolerance'],
  boxing_conditioning_support: ['boxing_alactic_repeat_power', 'boxing_glycolytic_round_tolerance'],
  mobility_prehab: ['boxing_hip_ankle_mobility', 'boxing_shoulder_scap_durability', 'boxing_neck_trap_durability', 'boxing_recovery_reset', 'recovery_reset'],
  recovery_reset: ['boxing_recovery_reset', 'recovery_reset'],
};

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
  if (session.protectedAnchor) {
    return session.plannedIntensity === 'hard'
      || session.protectedWorkoutModality === 'sparring'
      || session.protectedWorkoutModality === 'competition';
  }
  if (session.plannedIntensity === 'hard') return true;
  if (session.plannedIntensity === 'moderate' && session.boxingSessionFamily && HARD_BOXING_FAMILIES.has(session.boxingSessionFamily)) return true;
  if (session.plannedIntensity) return false;
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
    day.totalMinutes += session.workout?.estimatedDurationMinutes
      ?? session.workout?.requestedDurationMinutes
      ?? session.protectedDurationMinutes
      ?? 0;
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
  return intent.countsAsHard === true
    || intent.plannedIntensity === 'hard'
    || (intent.plannedIntensity === 'moderate' && HARD_BOXING_FAMILIES.has(intent.family));
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
  const protectedModalities = new Set(input.day.sessions
    .filter((session) => session.protectedAnchor)
    .map((session) => session.protectedWorkoutModality));
  if (
    (protectedModalities.has('sparring') || protectedModalities.has('competition'))
    && !['mobility_prehab', 'recovery_reset', 'recovery', 'boxing_skill_microdose', 'footwork_agility'].includes(input.intent.role)
  ) {
    return false;
  }
  if (input.day.hardCount > 0 && !['mobility_prehab', 'recovery_reset', 'recovery', 'accessory'].includes(input.intent.role)) return false;
  if (input.day.totalMinutes + input.durationMinutes > 140) return false;
  return input.day.sessions.every((session) => session.protectedAnchor ? session.protectedAnchor && sessionIsHard(session) ? input.intent.plannedIntensity !== 'moderate' : true : false);
}

function canStackOnGeneratedSupportDay(input: {
  day: DayLoadState;
  intent: PlannedSessionIntent;
  durationMinutes: number;
  allowSameDaySupportSessions: boolean;
}): boolean {
  if (input.day.sessions.length === 0) return false;
  if (input.day.sessions.some((session) => session.protectedAnchor)) return false;
  if (intentCountsAsHard(input.intent)) return false;
  if (!LOW_LOAD_STACKING_ROLES.has(input.intent.role)) return false;
  if (!input.allowSameDaySupportSessions && !input.intent.canStackWithProtected) return false;
  if (input.day.sessions.some((session) => session.boxingSessionFamily === input.intent.family)) return false;

  const hardDaySupportRoles = ['mobility_prehab', 'recovery_reset', 'recovery', 'accessory', 'maintenance'];
  if (input.day.hardCount > 0 && !hardDaySupportRoles.includes(input.intent.role)) return false;

  const maxMinutes = input.day.hardCount > 0 ? 90 : 105;
  if (input.day.totalMinutes + input.durationMinutes > maxMinutes) return false;
  if (input.day.sessions.length >= 3) return false;

  return input.day.sessions.every((session) => !sessionIsHard(session) || hardDaySupportRoles.includes(input.intent.role));
}

function chooseDayForIntent(input: {
  availableDays: number[];
  weekSessions: GeneratedProgramSession[];
  intent: PlannedSessionIntent;
  hardDayCap: number;
  allowSameDaySupportSessions: boolean;
  durationMinutes: number;
  track?: string | undefined;
  phase?: ProgramPhase | undefined;
}): { dayIndex: number; stacked: boolean; stackedWith?: 'protected_anchor' | 'generated_support' | undefined } | null {
  const dayLoads = dayLoadsFromSessions(input.weekSessions);
  const candidateDays = input.availableDays.map((day) => dayLoads.get(day)).filter((day): day is DayLoadState => Boolean(day));
  const hardIntent = intentCountsAsHard(input.intent);
  const currentHardDays = hardDayCount(input.weekSessions);
  const weekLoad = input.weekSessions.reduce((sum, session) => sum + (session.estimatedLoadScore ?? 0), 0);

  const sorted = candidateDays
    .map((day): BoxingWeekLayoutCandidate => {
      const stacked = day.sessions.length > 0;
      const protectedHard = day.modalities.includes('sparring') || day.modalities.includes('competition');
      const adjacentHard = hasAdjacentHardDay(day.dayIndex, input.weekSessions);
      const rationale: string[] = [];
      let score = day.sessions.length * 30 + day.totalMinutes + day.estimatedLoadScore / 25;
      if (protectedHard && hardIntent) {
        score += 1_000;
        rationale.push('Hard generated work cannot sit on sparring or competition day.');
      }
      if (adjacentHard) {
        score += hardIntent ? 350 : 20;
        rationale.push(hardIntent ? 'Avoids reckless adjacent hard-day placement.' : 'Low-load support can live near hard work when capacity is safe.');
      }
      if (day.hardCount > 0) {
        score += hardIntent ? 600 : 60;
        rationale.push('Existing hard load on this day increases placement cost.');
      }
      if (stacked && !hardIntent && LOW_LOAD_STACKING_ROLES.has(input.intent.role)) {
        score -= 25;
        rationale.push('Low-load boxing support may stack with an existing support day when duration and load are safe.');
      }
      if (weekLoad >= 1_200 && day.sessions.length === 0 && [6, 7].includes(day.dayIndex) && !hardIntent) {
        score += 30;
        rationale.push('High-load weeks preserve a true recovery day when possible.');
      }
      if (input.track?.startsWith('amateur') && ['footwork_agility', 'alactic_repeat_power'].includes(input.intent.family)) {
        score += adjacentHard ? 70 : -10;
        rationale.push('Amateur layout favors spaced agility and repeat-output exposures.');
      }
      if (input.track?.startsWith('pro') && ['roadwork_zone2', 'roadwork_tempo', 'trunk_durability', 'shoulder_scap_durability'].includes(input.intent.family)) {
        if (!hardIntent && day.hardCount === 0) score -= 8;
        rationale.push('Pro layout favors pacing durability and recovery spacing.');
      }
      if (input.phase === 'return_to_training' || input.phase === 'deload') {
        score += hardIntent ? 500 : -6;
        rationale.push('Recovery/deload weeks bias low-load placement.');
      }
      return { dayIndex: day.dayIndex, score, stacked, hardIntent, rationale };
    })
    .sort((a, b) => a.score - b.score || a.dayIndex - b.dayIndex);

  for (const candidate of sorted) {
    const day = dayLoads.get(candidate.dayIndex);
    if (!day) continue;
    if (hardIntent) {
      if (currentHardDays >= input.hardDayCap) continue;
      if (day.sessions.length > 0) continue;
      if (hasAdjacentHardDay(day.dayIndex, input.weekSessions)) continue;
      return { dayIndex: day.dayIndex, stacked: false };
    }
    if (day.sessions.length === 0) return { dayIndex: day.dayIndex, stacked: false };
  }

  for (const candidate of sorted) {
    const day = dayLoads.get(candidate.dayIndex);
    if (!day) continue;
    if (canStackOnProtectedDay({
      day,
      intent: input.intent,
      durationMinutes: input.durationMinutes,
      allowSameDaySupportSessions: input.allowSameDaySupportSessions,
    })) {
      return { dayIndex: day.dayIndex, stacked: true, stackedWith: 'protected_anchor' };
    }
  }

  for (const candidate of sorted) {
    const day = dayLoads.get(candidate.dayIndex);
    if (!day) continue;
    if (canStackOnGeneratedSupportDay({
      day,
      intent: input.intent,
      durationMinutes: input.durationMinutes,
      allowSameDaySupportSessions: input.allowSameDaySupportSessions,
    })) {
      return { dayIndex: day.dayIndex, stacked: true, stackedWith: 'generated_support' };
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
  if (intent.doseCategory === 'recovery_reset') return Math.min(base, 25);
  if (intent.doseCategory === 'microdose') return Math.min(base, Math.max(25, Math.round(base * 0.55)));
  if (intent.doseCategory === 'support_session') return Math.min(base, Math.max(25, Math.round(base * 0.75)));
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

function allowSameDaySupportSessions(input: ProgramBuilderInput): boolean {
  return input.boxingTrainingContext?.allowSameDaySupportSessions === true
    || input.combatSportContext?.allowSameDaySupportSessions === true;
}

function placementPriorityForIntent(intent: PlannedSessionIntent): number {
  if (intent.doseCategory === 'full_session') return 60;
  if (intent.athleticDevelopmentDomain === 'roadwork' || intent.athleticDevelopmentDomain === 'conditioning') return 50;
  if (['roadwork_zone2', 'roadwork_tempo', 'roadwork_intervals', 'alactic_repeat_power', 'glycolytic_round_tolerance', 'boxing_conditioning_support'].includes(intent.family)) return 50;
  if (intent.athleticDevelopmentDomain === 'strength' || intent.athleticDevelopmentDomain === 'power') return 45;
  if (intent.doseCategory === 'support_session') return 35;
  if (intent.doseCategory === 'microdose') return 25;
  if (intent.doseCategory === 'recovery_reset') return 10;
  return 20;
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

function supportDomainForSession(session: GeneratedProgramSession): BoxingAthleteSupportDomain | undefined {
  return session.athleticDevelopmentDomain
    ?? familyToAthleticDevelopmentDomain(session.boxingSessionFamily, session.boxingSessionRole)
    ?? protectedModalityToAthleticDevelopmentDomain(session.protectedWorkoutModality);
}

function supportDomainCounts(sessions: readonly GeneratedProgramSession[]): Record<BoxingAthleteSupportDomain, number> {
  const counts = emptySupportDomainSummary();
  for (const session of sessions) {
    if (!session.protectedAnchor && session.workout?.blocked) continue;
    const domain = supportDomainForSession(session);
    if (!domain) continue;
    counts[domain] += 1;
  }
  return counts;
}

function generatedSupportDomainCounts(sessions: readonly GeneratedProgramSession[]): Record<BoxingAthleteSupportDomain, number> {
  return supportDomainCounts(sessions.filter((session) => !session.protectedAnchor && !session.workout?.blocked));
}

function topSupportDomains(counts: Record<BoxingAthleteSupportDomain, number>, limit = 3): BoxingAthleteSupportDomain[] {
  return (Object.keys(counts) as BoxingAthleteSupportDomain[])
    .filter((domain) => counts[domain] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, limit);
}

function supportDomainPhrase(domains: readonly BoxingAthleteSupportDomain[]): string {
  const labels = domains.map(supportDomainLabel);
  if (labels.length === 0) return 'athlete support';
  if (labels.length === 1) return labels[0] ?? 'athlete support';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function hardDayCount(sessions: GeneratedProgramSession[]): number {
  return sessions.filter(sessionIsHard).length;
}

function weeklySummary(weekIndex: number, phase: ProgramPhase, sessions: GeneratedProgramSession[]): ProgramWeeklyVolumeSummary {
  const generatedSessions = sessions.filter((session) => !session.protectedAnchor && !session.workout?.blocked);
  const protectedSessions = sessions.filter((session) => session.protectedAnchor);
  const domainCounts = generatedSupportDomainCounts(sessions);
  const focusAreas = topSupportDomains(domainCounts, 4);
  return {
    weekIndex,
    phase,
    generatedSessionCount: generatedSessions.length,
    protectedSessionCount: protectedSessions.length,
    estimatedMinutes: sessions.reduce((sum, session) => sum + (
      session.workout?.estimatedDurationMinutes
      ?? session.workout?.requestedDurationMinutes
      ?? session.protectedDurationMinutes
      ?? 0
    ), 0),
    hardDayCount: hardDayCount(sessions),
    totalExposureCount: sessions.length,
    protectedLoadScore: protectedSessions
      .reduce((sum, session) => sum + (session.estimatedLoadScore ?? 0), 0),
    generatedLoadScore: generatedSessions.reduce((sum, session) => sum + (session.estimatedLoadScore ?? 0), 0),
    generatedHardSessionCount: generatedSessions.filter(sessionIsHard).length,
    generatedFullSessionCount: generatedSessions.filter((session) => session.sessionDoseCategory === 'full_session').length,
    generatedSupportSessionCount: generatedSessions.filter((session) => session.sessionDoseCategory === 'support_session' || session.sessionDoseCategory === 'recovery_reset').length,
    generatedMicrodoseCount: generatedSessions.filter((session) => session.sessionDoseCategory === 'microdose').length,
    protectedBoxingSessionCount: protectedSessions.filter((session) => (
      session.protectedWorkoutModality === 'boxing_skill'
      || session.protectedWorkoutModality === 'shadowboxing'
      || session.protectedWorkoutModality === 'footwork'
      || session.protectedWorkoutModality === 'bag_work'
      || session.protectedWorkoutModality === 'pad_work'
      || session.protectedWorkoutModality === 'sparring'
      || session.protectedWorkoutModality === 'boxing_conditioning'
      || session.protectedWorkoutModality === 'competition'
    )).length,
    protectedSparringCount: protectedSessions.filter((session) => session.protectedWorkoutModality === 'sparring').length,
    protectedRoadworkCount: protectedSessions.filter((session) => (
      session.protectedWorkoutModality === 'roadwork_zone2'
      || session.protectedWorkoutModality === 'roadwork_tempo'
      || session.protectedWorkoutModality === 'roadwork_intervals'
      || session.protectedWorkoutModality === 'zone2'
    )).length,
    generatedSAndCSessionCount: generatedSessions.filter((session) => isSAndCSupportDomain(supportDomainForSession(session))).length,
    generatedSkillSupportCount: domainCounts.boxing_skill_support,
    generatedRoadworkCount: domainCounts.roadwork,
    generatedStrengthPowerCount: domainCounts.strength + domainCounts.power,
    generatedDurabilityCount: domainCounts.durability + domainCounts.mobility,
    generatedRecoveryCount: domainCounts.recovery,
    supportDomainSummary: domainCounts,
    protectedBoxingPracticeSummary: `${protectedSessions.filter((session) => supportDomainForSession(session) === 'boxing_skill_support').length} protected boxing anchor(s) cover practice exposure.`,
    athleticDevelopmentFocusAreas: focusAreas,
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
  const domainCounts = generatedSupportDomainCounts(sessions);
  const focusAreas = topSupportDomains(domainCounts, 4);
  return {
    ...summary,
    hardDayCap: weeklyDose.hardDayCap,
    totalExposureCount: sessions.length,
    protectedLoadScore: weeklyDose.protectedLoadScore,
    generatedLoadScore: weeklyDose.loadLedger.generatedLoadScore,
    generatedFullSessionCount: weeklyDose.loadLedger.generatedFullSessionCount,
    generatedSupportSessionCount: weeklyDose.loadLedger.generatedSupportSessionCount,
    generatedMicrodoseCount: weeklyDose.loadLedger.generatedMicrodoseCount,
    protectedBoxingSessionCount: sessions.filter((session) => session.protectedAnchor && (
      session.protectedWorkoutModality === 'boxing_skill'
      || session.protectedWorkoutModality === 'shadowboxing'
      || session.protectedWorkoutModality === 'footwork'
      || session.protectedWorkoutModality === 'bag_work'
      || session.protectedWorkoutModality === 'pad_work'
      || session.protectedWorkoutModality === 'sparring'
      || session.protectedWorkoutModality === 'boxing_conditioning'
      || session.protectedWorkoutModality === 'competition'
    )).length,
    protectedSparringCount: weeklyDose.protectedSparringCount,
    protectedRoadworkCount: weeklyDose.protectedRoadworkCount,
    generatedSAndCSessionCount: summary.generatedSAndCSessionCount ?? 0,
    generatedSkillSupportCount: domainCounts.boxing_skill_support,
    generatedRoadworkCount: domainCounts.roadwork,
    generatedStrengthPowerCount: domainCounts.strength + domainCounts.power,
    generatedDurabilityCount: domainCounts.durability + domainCounts.mobility,
    generatedRecoveryCount: domainCounts.recovery,
    supportDomainSummary: domainCounts,
    protectedBoxingPracticeSummary: `${summary.protectedBoxingSessionCount ?? 0} protected boxing anchor(s) cover practice exposure.`,
    athleticDevelopmentFocusAreas: focusAreas,
    boxingLoadLedger: weeklyDose.loadLedger,
    rulesetTrack: weeklyDose.track,
    boxingProgressionPhase: weeklyDose.boxingProgressionPhase,
    qualityGaps: weeklyDose.qualityGaps,
    variancePlan: weeklyDose.variancePlan,
    coachRationale: weeklyDose.rationale,
    userFacingWarnings: weeklyDose.warnings,
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

function sessionDefaultDate(startDate: string, session: GeneratedProgramSession): string {
  return session.scheduledDate ?? dateForProgramDay(startDate, session.weekIndex, session.dayIndex);
}

function hasPlannedSameDayStack(input: {
  session: GeneratedProgramSession;
  weekSessions: readonly GeneratedProgramSession[];
  startDate: string;
  defaultDate: string;
}): boolean {
  return input.weekSessions.some((other) => (
    other.id !== input.session.id
    && sessionDefaultDate(input.startDate, other) === input.defaultDate
  ));
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
    const copy = boxingWeekCopy({
      weekIndex: week.weekIndex,
      phase: week.phase,
      sessions: week.sessions,
      weeklyDose: week.weeklyDose,
    });
    return {
      ...week,
      movementPatternBalance: movementPatternCounts(week.sessions),
      weeklyVolumeSummary: summary,
      boxingWeeklyDosePlan: week.weeklyDose,
      boxingLoadLedger: week.weeklyDose?.loadLedger,
      rulesetTrack: week.weeklyDose?.track,
      boxingProgressionPhase: week.weeklyDose?.boxingProgressionPhase,
      qualityGaps: week.weeklyDose?.qualityGaps,
      variancePlan: week.weeklyDose?.variancePlan,
      coachRationale: week.weeklyDose?.rationale,
      userFacingWarnings: week.weeklyDose?.warnings,
      hardDayCount: summary.hardDayCount,
      validationWarnings: unique([...week.validationWarnings, ...weekWarnings]),
      ...copy,
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
    boxingWeeklyDosePlan: updatedWeeks.map((week) => week.weeklyDose).filter((dose): dose is WeeklyTrainingDosePrescription => Boolean(dose)),
    boxingLoadLedger: updatedWeeks.map((week) => week.weeklyDose?.loadLedger).filter((ledger): ledger is NonNullable<typeof ledger> => Boolean(ledger)),
    rulesetTrack: updatedWeeks[0]?.weeklyDose?.track,
    boxingProgressionPhase: updatedWeeks[0]?.weeklyDose?.boxingProgressionPhase,
    qualityGaps: updatedWeeks.flatMap((week) => week.weeklyDose?.qualityGaps ?? []),
    variancePlan: updatedWeeks.map((week) => week.weeklyDose?.variancePlan).filter((plan): plan is NonNullable<typeof plan> => Boolean(plan)),
    coachRationale: unique(updatedWeeks.flatMap((week) => week.weeklyDose?.rationale ?? [])),
    userFacingWarnings: unique(updatedWeeks.flatMap((week) => week.weeklyDose?.warnings ?? [])),
    weeklyBoxingHeadline: updatedWeeks[0]?.weeklyBoxingHeadline,
    weeklyBoxingSummary: updatedWeeks[0]?.weeklyBoxingSummary,
    primaryBoxingFocus: updatedWeeks[0]?.primaryBoxingFocus,
    weeklyAthleticDevelopmentHeadline: updatedWeeks[0]?.weeklyAthleticDevelopmentHeadline,
    weeklyAthleticDevelopmentSummary: updatedWeeks[0]?.weeklyAthleticDevelopmentSummary,
    sAndCFocus: updatedWeeks[0]?.sAndCFocus,
    supportDomainSummary: updatedWeeks[0]?.supportDomainSummary,
    protectedBoxingPracticeSummary: updatedWeeks[0]?.protectedBoxingPracticeSummary,
    athleticDevelopmentFocusAreas: updatedWeeks[0]?.athleticDevelopmentFocusAreas,
    hardDaySummary: updatedWeeks[0]?.hardDaySummary,
    protectedLoadSummary: updatedWeeks[0]?.protectedLoadSummary,
    generatedSupportSummary: updatedWeeks[0]?.generatedSupportSummary,
    nextBestAction: updatedWeeks[0]?.nextBestAction,
    coachSummaryBullets: updatedWeeks[0]?.coachSummaryBullets,
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
      const defaultDate = sessionDefaultDate(startDate, session);
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

      const plannedSameDayStack = hasPlannedSameDayStack({
        session,
        weekSessions: week.sessions,
        startDate,
        defaultDate,
      });
      if (conflicts.length === 0 && (!occupiedDates.has(defaultDate) || plannedSameDayStack)) {
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

function titleCaseTrack(track: string | undefined): string {
  return (track ?? 'boxing')
    .split('_')
    .map((part) => part.length ? `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}` : part)
    .join(' ');
}

function primaryFocusFromDose(dose: WeeklyTrainingDosePrescription | undefined): string {
  if (!dose) return 'athlete support';
  const domains = unique(dose.intents
    .map((intentItem) => intentItem.athleticDevelopmentDomain ?? familyToAthleticDevelopmentDomain(intentItem.family, intentItem.boxingRole))
    .filter((domain): domain is BoxingAthleteSupportDomain => Boolean(domain)));
  const priorityGap = dose.qualityGaps[0]?.quality;
  if (priorityGap) return `${String(priorityGap)} with ${supportDomainPhrase(domains.slice(0, 2))}`;
  return supportDomainPhrase(domains.slice(0, 3));
}

function boxingWeekCopy(input: {
  weekIndex: number;
  phase: ProgramPhase;
  sessions: GeneratedProgramSession[];
  weeklyDose?: WeeklyTrainingDosePrescription | undefined;
}): Pick<GeneratedProgramWeek,
  | 'weeklyBoxingHeadline'
  | 'weeklyBoxingSummary'
  | 'primaryBoxingFocus'
  | 'weeklyAthleticDevelopmentHeadline'
  | 'weeklyAthleticDevelopmentSummary'
  | 'sAndCFocus'
  | 'supportDomainSummary'
  | 'protectedBoxingPracticeSummary'
  | 'athleticDevelopmentFocusAreas'
  | 'hardDaySummary'
  | 'protectedLoadSummary'
  | 'generatedSupportSummary'
  | 'nextBestAction'
  | 'coachSummaryBullets'
> {
  const dose = input.weeklyDose;
  const trackLabel = titleCaseTrack(dose?.track);
  const protectedBoxing = input.sessions.filter((session) => session.protectedAnchor && session.protectedWorkoutModality && session.protectedWorkoutModality !== 'external_non_boxing_load').length;
  const protectedSparring = input.sessions.filter((session) => session.protectedAnchor && session.protectedWorkoutModality === 'sparring').length;
  const generated = input.sessions.filter((session) => !session.protectedAnchor && !session.workout?.blocked);
  const domainCounts = generatedSupportDomainCounts(input.sessions);
  const focusAreas = topSupportDomains(domainCounts, 4);
  const focusPhrase = supportDomainPhrase(focusAreas);
  const supportCount = generated.filter((session) => session.sessionDoseCategory === 'support_session' || session.sessionDoseCategory === 'microdose' || session.sessionDoseCategory === 'recovery_reset').length;
  const hardGenerated = generated.filter(sessionIsHard).length;
  const primaryFocus = primaryFocusFromDose(dose);
  const redReadiness = dose?.hardDayCap === 0 || input.phase === 'return_to_training';
  const sparringMessage = protectedSparring >= 1
    ? 'Your sparring already owns the hard boxing stress, so Athleticore kept generated work supportive.'
    : protectedBoxing > 0
      ? 'Protected boxing anchors are counted as load while Athleticore fills the missing athletic-chain support.'
      : 'Athleticore is building boxing frequency with low-risk skill support plus the missing athletic-chain qualities.';
  const weeklyAthleticDevelopmentHeadline = `${trackLabel}: week ${input.weekIndex} builds ${focusPhrase}.`;
  const weeklyAthleticDevelopmentSummary = redReadiness
    ? `${trackLabel}: red readiness means no hard generated work; Athleticore stays with recovery, mobility, and low-risk support only.`
    : protectedBoxing >= 2
      ? `Your boxing practice is covered by ${protectedBoxing} protected anchor(s), so Athleticore is filling ${focusPhrase}.`
      : `${trackLabel}: Athleticore builds ${focusPhrase} around ${protectedBoxing} protected boxing anchor(s).`;
  const weeklyBoxingHeadline = weeklyAthleticDevelopmentHeadline;
  const weeklyBoxingSummary = weeklyAthleticDevelopmentSummary;
  const nextBestAction = redReadiness
    ? 'Keep the next session easy and log readiness, pain, and completion before progressing.'
    : protectedSparring >= 2
      ? 'Treat sparring as the high-stress exposure and complete the generated recovery or durability support.'
      : 'Complete the first generated support session and log RPE so next week can progress or repeat intelligently.';
  const protectedBoxingPracticeSummary = protectedBoxing > 0
    ? `${protectedBoxing} protected boxing anchor(s) cover boxing practice exposure this week.`
    : 'No protected boxing anchors are logged, so Athleticore keeps skill support low risk and still builds the full boxer.';
  return {
    weeklyBoxingHeadline,
    weeklyBoxingSummary,
    primaryBoxingFocus: primaryFocus,
    weeklyAthleticDevelopmentHeadline,
    weeklyAthleticDevelopmentSummary,
    sAndCFocus: focusPhrase,
    supportDomainSummary: domainCounts,
    protectedBoxingPracticeSummary,
    athleticDevelopmentFocusAreas: focusAreas,
    hardDaySummary: `Hard days: ${input.sessions.filter(sessionIsHard).length}/${dose?.hardDayCap ?? 3}; generated hard work: ${hardGenerated}.`,
    protectedLoadSummary: `${protectedBoxing} protected boxing anchor(s), ${protectedSparring} sparring anchor(s), protected load ${dose?.protectedLoadScore ?? 0}.`,
    generatedSupportSummary: `${supportCount} Athleticore support exposure(s), generated load ${dose?.loadLedger.generatedLoadScore ?? 0}.`,
    nextBestAction,
    coachSummaryBullets: unique([
      sparringMessage,
      protectedBoxingPracticeSummary,
      dose?.protectedRoadworkCount ? 'Roadwork is covered, so generated work can bias strength-power, durability, or technical-light support.' : 'Roadwork and aerobic support are checked against the weekly ledger.',
      dose?.variancePlan.reason ?? 'Variance stays controlled so the adaptation target does not become random.',
      nextBestAction,
    ].filter(Boolean)),
  };
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
    let weeklyDose = planWeeklyTrainingDose({
      goalId: input.goalId,
      phase,
      readinessBand,
      protectedWorkouts,
      boxingTrainingContext: input.boxingTrainingContext,
      combatSportContext: input.combatSportContext,
      sessionsPerWeek: input.sessionsPerWeek,
      generatedSessionsPerWeek: input.generatedSessionsPerWeek,
      totalExposureTarget: input.totalExposureTarget,
      safetyFlags,
      recentWorkoutCompletions: input.recentWorkoutCompletions,
      recentProgressionDecisions: input.recentProgressionDecisions,
      recentFeedbackTags: input.recentFeedbackTags,
    });
    const boxingDrivenWeek = weeklyDose.track !== 'general_fitness_legacy';
    const weekSessions: GeneratedProgramSession[] = [];

    for (const protectedWorkout of protectedWorkouts) {
      const modality = inferProtectedWorkoutModality(protectedWorkout);
      const isHard = protectedWorkoutCountsAsHardDay(protectedWorkout);
      const protectedMeta = supportSessionMetadata({
        protectedModality: modality,
        plannedIntensity: isHard ? 'hard' : protectedWorkout.intensity,
        durationMinutes: protectedWorkout.protectedDurationMinutes ?? protectedWorkout.durationMinutes,
      });
      const protectedSession: GeneratedProgramSession = {
        id: `week_${weekIndex}:protected:${protectedWorkout.id}`,
        dayIndex: protectedWorkout.dayIndex,
        weekIndex,
        phase,
        protectedAnchor: true,
        label: protectedWorkout.label,
        workout: null,
        plannedIntensity: isHard ? 'hard' : protectedWorkout.intensity,
        athleticDevelopmentDomain: protectedMeta.athleticDevelopmentDomain,
        supportDomainLabel: modality === 'sparring' || modality === 'competition' ? 'Protected boxing' : protectedMeta.supportDomainLabel,
        isBoxingPracticeReplacement: false,
        isCoachLedRequired: modality === 'sparring' || modality === 'competition' || modality === 'pad_work',
        expectedFuelPriority: protectedMeta.expectedFuelPriority,
        expectedCarbDemandClass: protectedMeta.expectedCarbDemandClass,
        expectedRecoveryDemandClass: protectedMeta.expectedRecoveryDemandClass,
        expectedHydrationDemandClass: protectedMeta.expectedHydrationDemandClass,
        sessionEnergyDemandScore: protectedMeta.sessionEnergyDemandScore,
        sessionRecoveryDemandScore: protectedMeta.sessionRecoveryDemandScore,
        protectedWorkoutModality: modality,
        protectedDurationMinutes: protectedWorkout.protectedDurationMinutes ?? protectedWorkout.durationMinutes,
        estimatedLoadScore: protectedWorkoutLoadScore(protectedWorkout),
        rationale: [
          'Protected workouts are schedule anchors and are preserved untouched.',
          `${modality} counts toward boxing practice exposure and weekly load${isHard ? ' and hard-day exposure' : ''}; Athleticore supports around it.`,
        ],
      };
      weekSessions.push(protectedSession);
    }

    let generatedCount = 0;
    let generatedHardCount = 0;
    const scheduledIntents = [...weeklyDose.intents].sort((a, b) => {
      const hardDelta = Number(intentCountsAsHard(b)) - Number(intentCountsAsHard(a));
      if (hardDelta !== 0) return hardDelta;
      const priorityDelta = placementPriorityForIntent(b) - placementPriorityForIntent(a);
      if (priorityDelta !== 0) return priorityDelta;
      return a.goalId.localeCompare(b.goalId);
    });
    for (const sessionIntent of scheduledIntents) {
      const durationMinutes = requestedDurationForIntent(input, phase, sessionIntent);
      let placementIntent = sessionIntent;
      let candidate = chooseDayForIntent({
        availableDays,
        weekSessions,
        intent: placementIntent,
        hardDayCap: weeklyDose.hardDayCap,
        allowSameDaySupportSessions: allowSameDaySupportSessions(input),
        durationMinutes,
        track: weeklyDose.track,
        phase,
      });
      if (candidate == null && intentCountsAsHard(sessionIntent)) {
        placementIntent = {
          ...sessionIntent,
          goalId: 'mobility_prehab',
          plannedIntensity: 'low',
          role: 'mobility_prehab',
          boxingRole: 'mobility_prehab',
          family: 'mobility_prehab',
          doseCategory: 'support_session',
          canStackWithProtected: true,
          rationale: [
            ...sessionIntent.rationale,
            'Hard support was converted to low boxing-relevant mobility/prehab because no safe hard day was available.',
          ],
        };
        candidate = chooseDayForIntent({
          availableDays,
          weekSessions,
          intent: placementIntent,
          hardDayCap: weeklyDose.hardDayCap,
          allowSameDaySupportSessions: allowSameDaySupportSessions(input),
          durationMinutes,
          track: weeklyDose.track,
          phase,
        });
      }
      if (candidate == null) {
        warnings.push(`Week ${weekIndex} could not place ${sessionIntent.goalId}; day load and hard-day capacity were full.`);
        continue;
      }

      const intentHard = intentCountsAsHard(placementIntent);
      const overHardBudget = intentHard && generatedHardCount >= weeklyDose.generatedHardSessionCap;
      const adjacentHard = intentHard && hasAdjacentHardDay(candidate.dayIndex, weekSessions);
      const lowConditioningIntent = (placementIntent.role === 'conditioning_support' || placementIntent.role === 'boxing_conditioning_support')
        && placementIntent.plannedIntensity !== 'hard';
      const downgradeToMobility = overHardBudget || adjacentHard || lowConditioningIntent;
      const workoutIntent: PlannedSessionIntent = downgradeToMobility
        ? {
          ...placementIntent,
          goalId: 'mobility_prehab',
          plannedIntensity: 'low',
          role: 'mobility_prehab',
          boxingRole: 'mobility_prehab',
          family: 'mobility_prehab',
          doseCategory: 'support_session',
          canStackWithProtected: true,
          countsAsHard: false,
          rationale: [
            ...placementIntent.rationale,
            'The actual generated dose was converted to low boxing-relevant mobility/prehab because the original hard or conditioning intent was not appropriate for this week layout.',
          ],
        }
        : placementIntent;
      const supportMeta = supportSessionMetadata({
        family: workoutIntent.family,
        role: workoutIntent.boxingRole,
        domain: workoutIntent.athleticDevelopmentDomain,
        doseCategory: workoutIntent.doseCategory,
        plannedIntensity: workoutIntent.plannedIntensity,
        durationMinutes,
      });
      const goalId = workoutIntent.goalId;
      const effectiveIntensity = workoutIntent.plannedIntensity;
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
      if (boxingDrivenWeek) {
        workoutRequest.intendedBoxingSessionFamily = workoutIntent.family;
        workoutRequest.intendedBoxingSessionRole = workoutIntent.boxingRole;
        workoutRequest.intendedSessionDoseCategory = workoutIntent.doseCategory;
        workoutRequest.athleticDevelopmentDomain = supportMeta.athleticDevelopmentDomain;
        workoutRequest.preferredSessionTemplateId = templateIdForBoxingFamily(workoutIntent.family);
      }
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
        sessionRole: workoutIntent.role,
        boxingSessionRole: boxingDrivenWeek ? workoutIntent.boxingRole : undefined,
        boxingSessionFamily: boxingDrivenWeek ? workoutIntent.family : undefined,
        sessionDoseCategory: workoutIntent.doseCategory,
        athleticDevelopmentDomain: supportMeta.athleticDevelopmentDomain,
        supportDomainLabel: supportMeta.supportDomainLabel,
        boxingRelevance: supportMeta.boxingRelevance,
        athleticDevelopmentRationale: supportMeta.athleticDevelopmentRationale,
        sAndCRationale: supportMeta.sAndCRationale,
        isBoxingPracticeReplacement: false,
        isCoachLedRequired: false,
        expectedFuelPriority: supportMeta.expectedFuelPriority,
        expectedCarbDemandClass: supportMeta.expectedCarbDemandClass,
        expectedRecoveryDemandClass: supportMeta.expectedRecoveryDemandClass,
        expectedHydrationDemandClass: supportMeta.expectedHydrationDemandClass,
        sessionEnergyDemandScore: supportMeta.sessionEnergyDemandScore,
        sessionRecoveryDemandScore: supportMeta.sessionRecoveryDemandScore,
        estimatedLoadScore: estimateGeneratedLoad(workout.estimatedDurationMinutes, effectiveIntensity),
        rationale: [
          ...workoutIntent.rationale,
          `${goalId} was selected as ${supportMeta.supportDomainLabel ?? supportDomainSourceLabel(supportMeta.athleticDevelopmentDomain)} for boxing in the ${phase} phase.`,
          supportMeta.boxingRelevance ?? '',
          candidate.stacked
            ? candidate.stackedWith === 'generated_support'
              ? 'This short low-load support pairs with another Athleticore support session because total day load stayed safe.'
              : 'This low-load support session safely stacks with a protected anchor instead of treating that day as closed.'
            : 'Placement respects weekly day load and hard/easy distribution.',
          overHardBudget ? 'A hard support intent was downgraded because protected work already consumed the hard-session budget.' : '',
          adjacentHard ? 'A hard support intent was downgraded to avoid back-to-back high-fatigue days.' : '',
          workout.decisionTrace?.some((entry) => entry.step.includes('fallback') || entry.step.includes('rejected'))
            ? 'Template binding emitted a trace because the intended boxing template required a safe fallback.'
            : '',
        ].filter(Boolean),
      };
      if (!generatedSession.workout?.blocked && sessionIsHard(generatedSession)) {
        generatedHardCount += 1;
      }
      if (candidate.stacked && candidate.stackedWith === 'protected_anchor') {
        generatedSession.rationale?.push('Protected boxing sessions count as load, not as automatic generated-session substitutions.');
      } else if (candidate.stacked && candidate.stackedWith === 'generated_support') {
        generatedSession.rationale?.push('Low-load support may be paired on one day to preserve strength, conditioning, mobility, and skill spread when available days are limited.');
      }
      if (workout.blocked && effectiveIntensity === 'hard') {
        const recoveryMeta = supportSessionMetadata({
          family: 'recovery_reset',
          role: 'recovery_reset',
          doseCategory: 'recovery_reset',
          plannedIntensity: 'recovery',
          durationMinutes: workout.estimatedDurationMinutes,
        });
        generatedSession.plannedIntensity = 'low';
        generatedSession.sessionRole = 'recovery_reset';
        if (boxingDrivenWeek) {
          generatedSession.boxingSessionRole = 'recovery_reset';
          generatedSession.boxingSessionFamily = 'recovery_reset';
        }
        generatedSession.sessionDoseCategory = 'recovery_reset';
        generatedSession.athleticDevelopmentDomain = recoveryMeta.athleticDevelopmentDomain;
        generatedSession.supportDomainLabel = recoveryMeta.supportDomainLabel;
        generatedSession.boxingRelevance = recoveryMeta.boxingRelevance;
        generatedSession.athleticDevelopmentRationale = recoveryMeta.athleticDevelopmentRationale;
        generatedSession.sAndCRationale = recoveryMeta.sAndCRationale;
        generatedSession.expectedFuelPriority = recoveryMeta.expectedFuelPriority;
        generatedSession.expectedCarbDemandClass = recoveryMeta.expectedCarbDemandClass;
        generatedSession.expectedRecoveryDemandClass = recoveryMeta.expectedRecoveryDemandClass;
        generatedSession.expectedHydrationDemandClass = recoveryMeta.expectedHydrationDemandClass;
        generatedSession.sessionEnergyDemandScore = recoveryMeta.sessionEnergyDemandScore;
        generatedSession.sessionRecoveryDemandScore = recoveryMeta.sessionRecoveryDemandScore;
      }
      weekSessions.push(generatedSession);
      generatedCount += 1;
    }

    if (generatedCount < weeklyDose.generatedSessionTarget) {
      warnings.push(`Week ${weekIndex} placed ${generatedCount}/${weeklyDose.generatedSessionTarget} generated support sessions because day load or safety capacity was full.`);
    }
    warnings.push(...weeklyDose.warnings.map((warning) => `Week ${weekIndex}: ${warning}`));

    weekSessions.sort((a, b) => a.dayIndex - b.dayIndex);
    weeklyDose = finalizeBoxingWeeklyDosePlan(weeklyDose, weekSessions);
    weeklyDosePlan.push(weeklyDose);
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
    const copy = boxingWeekCopy({ weekIndex, phase, sessions: weekSessions, weeklyDose });
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
      boxingWeeklyDosePlan: weeklyDose,
      boxingLoadLedger: weeklyDose.loadLedger,
      rulesetTrack: weeklyDose.track,
      boxingProgressionPhase: weeklyDose.boxingProgressionPhase,
      qualityGaps: weeklyDose.qualityGaps,
      variancePlan: weeklyDose.variancePlan,
      coachRationale: weeklyDose.rationale,
      userFacingWarnings: weeklyDose.warnings,
      hardDayCount: summary.hardDayCount,
      validationWarnings: weekWarnings,
      ...copy,
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
  const firstWeekCopy = weeks[0] ? boxingWeekCopy({
    weekIndex: weeks[0].weekIndex,
    phase: weeks[0].phase,
    sessions: weeks[0].sessions,
    weeklyDose: weeks[0].weeklyDose,
  }) : {};

  const program: GeneratedProgram = {
    id: `${input.goalId}:program:${weekCount}w`,
    status: 'draft',
    goalId: input.goalId,
    weekCount,
    phase: currentPhase,
    weeks,
    sessions,
    rationale: [
      'Program sessions are planned from a boxing-first athlete development dose before scheduling.',
      'Protected boxing workouts count toward training load and hard-day exposure without automatically replacing generated S&C/support frequency.',
      'Generated sessions are placed by day load, weekly availability, safety flags, same-day support rules, and hard/easy distribution.',
      'The boxing athletic chain, weekly load ledger, and controlled variance plan are tracked for each week.',
      'Deload and return-to-training weeks reduce dose before adding progression.',
    ],
    movementPatternBalance,
    weeklyVolumeSummary,
    hardDayCount: weeklyVolumeSummary.reduce((sum, week) => sum + week.hardDayCount, 0),
    progressionPlan,
    explanations: [
      'Protected workouts were preserved as anchors.',
      'Generated sessions are labeled as full sessions, support sessions, microdoses, or recovery resets.',
      'Readiness and protected hard days can reduce intensity or hard-session count while preserving useful low-load frequency.',
      'Sparring is never generated; it only appears as protected coach-led work.',
    ],
    validationWarnings: warnings,
    weeklyDosePlan,
    boxingWeeklyDosePlan: weeklyDosePlan,
    boxingLoadLedger: weeklyDosePlan.map((dose) => dose.loadLedger),
    rulesetTrack: weeklyDosePlan[0]?.track,
    boxingProgressionPhase: weeklyDosePlan[0]?.boxingProgressionPhase,
    qualityGaps: weeklyDosePlan.flatMap((dose) => dose.qualityGaps),
    variancePlan: weeklyDosePlan.map((dose) => dose.variancePlan),
    coachRationale: unique(weeklyDosePlan.flatMap((dose) => dose.rationale)),
    userFacingWarnings: unique(weeklyDosePlan.flatMap((dose) => dose.warnings)),
    ...firstWeekCopy,
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
    const strictBoxingContent = week?.weeklyDose?.track != null && week.weeklyDose.track !== 'general_fitness_legacy';
    if (!week) errors.push(`Week ${weekIndex} is missing structured week output.`);
    if (weekSessions.length === 0) errors.push(`Week ${weekIndex} has no sessions.`);
    if (hardDayCount(weekSessions) > hardDayCap) errors.push(`Week ${weekIndex} has too many hard sessions for the resolved hard-day cap (${hardDayCount(weekSessions)}/${hardDayCap}).`);
    const dose = week?.weeklyDose;
    if (dose && week) {
      const placedGeneratedDose = weekSessions.filter((session) => !session.protectedAnchor && !session.workout?.blocked).length;
      const underTarget = placedGeneratedDose < dose.generatedSessionTarget;
      const hasPlacementWarning = [...program.validationWarnings, ...week.validationWarnings].some((warning) => warning.includes(`Week ${weekIndex}`) && /placed|could not place|capacity|warning/i.test(warning));
      if (underTarget && !hasPlacementWarning) {
        errors.push(`Week ${weekIndex} generated dose is below the boxing dose target without a clear warning (${placedGeneratedDose}/${dose.generatedSessionTarget}).`);
      }
      if (dose.hardDayCap === 0 && weekSessions.some((session) => !session.protectedAnchor && sessionIsHard(session))) {
        errors.push(`Week ${weekIndex} has hard generated work despite red readiness or recovery-return constraints.`);
      }
      if (dose.track === 'aspiring_boxer' && weekSessions.some((session) => !session.protectedAnchor && session.boxingSessionFamily === 'glycolytic_round_tolerance')) {
        errors.push(`Week ${weekIndex} gave aspiring-boxer track an unsafe advanced conditioning family.`);
      }
      if (dose.boxingProgressionPhase === 'taper' && weekSessions.some((session) => !session.protectedAnchor && sessionIsHard(session))) {
        errors.push(`Week ${weekIndex} taper includes hard generated S&C or conditioning.`);
      }
      const summary = week.weeklyVolumeSummary;
      if (summary.generatedFullSessionCount == null || summary.generatedSupportSessionCount == null || summary.generatedMicrodoseCount == null) {
        errors.push(`Week ${weekIndex} summary is missing generated dose category counts.`);
      }
      if (summary.protectedBoxingSessionCount == null || summary.protectedSparringCount == null || summary.protectedRoadworkCount == null) {
        errors.push(`Week ${weekIndex} summary is missing protected boxing counts.`);
      }
      if (summary.generatedSAndCSessionCount == null || summary.generatedSkillSupportCount == null || !summary.supportDomainSummary) {
        errors.push(`Week ${weekIndex} summary is missing athletic-development support domain counts.`);
      }
      if (!summary.boxingLoadLedger || !week.boxingLoadLedger) errors.push(`Week ${weekIndex} is missing boxing load ledger output.`);
      if (!week.qualityGaps) errors.push(`Week ${weekIndex} is missing boxing quality gaps.`);
      if (!week.variancePlan) errors.push(`Week ${weekIndex} is missing controlled variance plan.`);
      if (!week.weeklyBoxingHeadline || !week.weeklyBoxingSummary || !week.nextBestAction || !week.coachSummaryBullets?.length) {
        errors.push(`Week ${weekIndex} is missing UI-ready boxing summary fields.`);
      }
      if (!week.weeklyAthleticDevelopmentHeadline || !week.weeklyAthleticDevelopmentSummary || !week.protectedBoxingPracticeSummary) {
        errors.push(`Week ${weekIndex} is missing UI-ready athletic development summary fields.`);
      }
    }
    for (let day = 1; day <= 6; day += 1) {
      const todayHard = weekSessions.some((session) => session.dayIndex === day && sessionIsHard(session));
      const tomorrowHard = weekSessions.some((session) => session.dayIndex === day + 1 && sessionIsHard(session));
      if (todayHard && tomorrowHard) errors.push(`Week ${weekIndex} has back-to-back hard days on days ${day} and ${day + 1}.`);
    }
    const protectedHardBoxingDays = new Set(weekSessions
      .filter((session) => session.protectedAnchor && (
        session.protectedWorkoutModality === 'sparring'
        || session.protectedWorkoutModality === 'competition'
      ))
      .map((session) => session.dayIndex));
    for (const session of weekSessions) {
      if (session.protectedAnchor && (session.protectedDurationMinutes == null || session.protectedDurationMinutes <= 0)) {
        errors.push(`${session.id} protected duration is missing or uncountable.`);
      }
      if (!session.protectedAnchor && !session.workout) errors.push(`${session.id} is missing generated workout.`);
      if (session.workout?.validation && !session.workout.validation.isValid) errors.push(`${session.id} generated workout is invalid.`);
      if (!session.protectedAnchor && session.boxingSessionFamily) {
        if (!session.boxingSessionRole || !session.sessionDoseCategory || !session.rationale?.length || !session.athleticDevelopmentDomain) {
          errors.push(`${session.id} has a boxing family without role, dose category, support domain, or rationale.`);
        }
        const plausibleTemplateIds = strictBoxingContent ? PLAUSIBLE_BOXING_TEMPLATE_IDS[session.boxingSessionFamily] : undefined;
        if (plausibleTemplateIds && session.workout && !plausibleTemplateIds.includes(session.workout.templateId)) {
          errors.push(`${session.id} used template ${session.workout.templateId} for ${session.boxingSessionFamily}; expected one of ${plausibleTemplateIds.join(', ')}.`);
        }
        const intendedTemplateId = strictBoxingContent ? templateIdForBoxingFamily(session.boxingSessionFamily) : null;
        const hasFallbackTrace = session.workout?.decisionTrace?.some((entry) => (
          /fallback|rejected|preferred_session_template_rejected|boxing_family_template_rejected/i.test(entry.step)
          || /could not be used|fallback/i.test(entry.reason)
        )) ?? false;
        if (intendedTemplateId && session.workout && session.workout.templateId !== intendedTemplateId && !hasFallbackTrace) {
          errors.push(`${session.id} used ${session.workout.templateId} for ${session.boxingSessionFamily} without a template-binding fallback warning; intended ${intendedTemplateId}.`);
        }
      }
      if (!session.protectedAnchor && sessionIsHard(session) && protectedHardBoxingDays.has(session.dayIndex)) {
        errors.push(`${session.id} stacks hard generated work on protected sparring/competition day.`);
      }
      if (!session.protectedAnchor && session.protectedWorkoutModality === 'sparring') {
        errors.push(`${session.id} generated sparring, which is not allowed.`);
      }
      if (!session.protectedAnchor && session.boxingSessionFamily && session.boxingSessionFamily.includes('sparring')) {
        errors.push(`${session.id} generated a sparring family, which is not allowed.`);
      }
    }
  }

  const protectedIds = program.sessions.filter((session) => session.protectedAnchor).map((session) => session.id);
  if (new Set(protectedIds).size !== protectedIds.length) errors.push('Protected anchor ids must stay unique per week.');
  if (program.sessions.some((session) => session.protectedAnchor && session.protectedWorkoutModality === 'external_non_boxing_load' && /boxing/i.test(session.label))) {
    errors.push('A boxing-labeled protected workout was treated as external non-boxing load.');
  }
  if (program.sessions.some((session) => (
    session.protectedAnchor
    && session.protectedWorkoutModality !== 'external_non_boxing_load'
    && /\b(mma|grappling|wrestling|bjj|jiu jitsu|jiu-jitsu|muay thai|kickboxing)\b/i.test(session.label)
  ))) {
    errors.push('A non-boxing protected combat label was treated as boxing load.');
  }
  if (program.movementPatternBalance.warnings.some((warning) => warning.includes('needs mobility'))) {
    errors.push('Program movement pattern balance is missing recovery support.');
  }
  return { valid: errors.length === 0, errors };
}
