import { generatePersonalizedWorkout } from './intelligenceEngine.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  ExerciseCompletionResult,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  ProgressionDecision,
  ProgressionDecisionInput,
  UserWorkoutProfile,
  WorkoutCompletionLog,
  WorkoutReadinessBand,
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

function completionRate(log: WorkoutCompletionLog): number {
  if (log.exerciseResults.length === 0) return 0;
  return log.exerciseResults.filter((result) => result.completedAsPrescribed).length / log.exerciseResults.length;
}

function numericValues(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function averageNumber(values: Array<number | null | undefined>): number | null {
  return average(numericValues(values));
}

function maxPain(log: WorkoutCompletionLog): number {
  return Math.max(
    log.painScoreAfter ?? 0,
    ...log.exerciseResults.map((result) => result.painScore ?? 0),
  );
}

function missedRepResults(log: WorkoutCompletionLog): ExerciseCompletionResult[] {
  return log.exerciseResults.filter((result) => {
    if (!result.completedAsPrescribed) return true;
    if (typeof result.repsCompleted === 'number' && typeof result.repsPrescribed === 'number') {
      return result.repsCompleted < result.repsPrescribed;
    }
    if (typeof result.setsPrescribed === 'number') {
      return result.setsCompleted < result.setsPrescribed;
    }
    return false;
  });
}

function repeatedFailedExerciseIds(current: WorkoutCompletionLog, recent: WorkoutCompletionLog[]): string[] {
  const counts = new Map<string, number>();
  for (const log of [current, ...recent]) {
    for (const result of failedExerciseResults(log)) {
      counts.set(result.exerciseId, (counts.get(result.exerciseId) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([exerciseId]) => exerciseId);
}

function workoutExercisePatterns(workout: GeneratedWorkout | undefined, exerciseIds: string[]): string[] {
  const selected = workout?.blocks.flatMap((block) => block.exercises) ?? [];
  const fromWorkout = selected
    .filter((exercise) => exerciseIds.includes(exercise.exerciseId))
    .flatMap((exercise) => exercise.movementPatternIds);
  if (fromWorkout.length > 0) return Array.from(new Set(fromWorkout));

  return Array.from(new Set(workoutProgrammingCatalog.exercises
    .filter((exercise) => exerciseIds.includes(exercise.id))
    .flatMap((exercise) => exercise.movementPatternIds)));
}

function normalizeProgressionInput(input: WorkoutCompletionLog | ProgressionDecisionInput): ProgressionDecisionInput {
  if ('completionLog' in input) return input;
  const normalized: ProgressionDecisionInput = {
    completionLog: input,
  };
  if (input.workoutTypeId) normalized.workoutTypeId = input.workoutTypeId;
  if (input.goalId) normalized.goalId = input.goalId;
  if (input.prescriptionTemplateId) normalized.prescriptionTemplateId = input.prescriptionTemplateId;
  return normalized;
}

function inferWorkoutType(input: ProgressionDecisionInput): string {
  return input.workoutTypeId
    ?? input.workout?.workoutTypeId
    ?? input.completionLog.workoutTypeId
    ?? 'strength';
}

function inferGoal(input: ProgressionDecisionInput): string {
  return input.goalId
    ?? input.workout?.goalId
    ?? input.completionLog.goalId
    ?? 'beginner_strength';
}

function completionTime(log: WorkoutCompletionLog): number {
  const value = Date.parse(log.completedAt);
  return Number.isFinite(value) ? value : 0;
}

function recentTrend(input: ProgressionDecisionInput): WorkoutCompletionLog[] {
  return [...(input.recentWorkoutCompletions ?? [])]
    .sort((a, b) => completionTime(b) - completionTime(a))
    .slice(0, 5);
}

function similarTrend(input: ProgressionDecisionInput, workoutTypeId: string, goalId: string): WorkoutCompletionLog[] {
  return recentTrend(input)
    .filter((log) => {
      const sameWorkoutType = !log.workoutTypeId || log.workoutTypeId === workoutTypeId;
      const sameGoal = !log.goalId || log.goalId === goalId;
      return sameWorkoutType && sameGoal;
    })
    .slice(0, 3);
}

function averageCompletionRate(logs: WorkoutCompletionLog[]): number | null {
  return average(logs.map(completionRate));
}

function averageSessionRpe(logs: WorkoutCompletionLog[]): number | null {
  return averageNumber(logs.map((log) => log.sessionRpe));
}

function averagePainDelta(logs: WorkoutCompletionLog[]): number | null {
  return averageNumber(logs.map((log) => {
    if (typeof log.painScoreBefore !== 'number' || typeof log.painScoreAfter !== 'number') return null;
    return log.painScoreAfter - log.painScoreBefore;
  }));
}

function averageLoad(log: WorkoutCompletionLog): number | null {
  return averageNumber(log.exerciseResults.map((result) => result.loadUsed));
}

function averageReps(log: WorkoutCompletionLog): number | null {
  return averageNumber(log.exerciseResults.map((result) => result.repsCompleted));
}

function trendDirection(current: number | null, previousValues: Array<number | null>): 'up' | 'down' | 'flat' | 'unknown' {
  const previous = averageNumber(previousValues);
  if (current == null || previous == null) return 'unknown';
  if (current > previous * 1.05) return 'up';
  if (current < previous * 0.95) return 'down';
  return 'flat';
}

function missedRepSessionCount(logs: WorkoutCompletionLog[]): number {
  return logs.filter((log) => missedRepResults(log).length > 0 || completionRate(log) < 0.85).length;
}

function notesMentionSubstitution(log: WorkoutCompletionLog): boolean {
  return /substitution|substitutions used|swapped|swap/i.test(log.notes ?? '');
}

function substitutionFrequency(logs: WorkoutCompletionLog[], decisions: ProgressionDecision[] = []): number {
  return logs.filter(notesMentionSubstitution).length
    + decisions.filter((decisionItem) => decisionItem.direction === 'substitute' || decisionItem.decision === 'substitute').length;
}

function conservativeReadinessTrend(input: ProgressionDecisionInput, logs: WorkoutCompletionLog[]): WorkoutReadinessBand[] {
  const explicit = input.readinessTrend ?? [];
  const fromLogs = logs
    .map((log) => log.readinessAfter ?? log.readinessBefore)
    .filter((band): band is WorkoutReadinessBand => Boolean(band));
  return [...explicit, ...fromLogs].slice(0, 5);
}

function readinessTrendNeedsConservativeNext(input: ProgressionDecisionInput, logs: WorkoutCompletionLog[]): boolean {
  const trend = conservativeReadinessTrend(input, logs);
  if (trend.length === 0) return false;
  const recentThree = trend.slice(0, 3);
  return recentThree.filter((band) => band === 'red' || band === 'orange').length >= 2;
}

function historySignals(input: ProgressionDecisionInput, workoutTypeId: string, goalId: string) {
  const lastFive = recentTrend(input);
  const lastThreeSimilar = similarTrend(input, workoutTypeId, goalId);
  const lastOne = lastFive[0] ?? null;
  const windowWithCurrent = [input.completionLog, ...lastFive].slice(0, 5);
  const similarWithCurrent = [input.completionLog, ...lastThreeSimilar].slice(0, 3);
  const currentLoadAverage = averageLoad(input.completionLog);
  const currentRepAverage = averageReps(input.completionLog);
  const previousLoads = lastThreeSimilar.map(averageLoad);
  const previousReps = lastThreeSimilar.map(averageReps);
  return {
    lastOne,
    lastThreeSimilar,
    lastFive,
    windowWithCurrent,
    similarWithCurrent,
    averageCompletionRate: averageCompletionRate(windowWithCurrent),
    averageSimilarCompletionRate: averageCompletionRate(similarWithCurrent),
    averageRpe: averageSessionRpe(windowWithCurrent),
    averageSimilarRpe: averageSessionRpe(similarWithCurrent),
    painDelta: averagePainDelta(windowWithCurrent),
    similarPainDelta: averagePainDelta(similarWithCurrent),
    missedRepSessions: missedRepSessionCount(similarWithCurrent),
    loadTrend: trendDirection(currentLoadAverage, previousLoads),
    repTrend: trendDirection(currentRepAverage, previousReps),
    durationTrend: trendDirection(input.completionLog.actualDurationMinutes, lastThreeSimilar.map((log) => log.actualDurationMinutes)),
    heartRateZoneCompliance: averageNumber(windowWithCurrent.map((log) => log.heartRateZoneCompliance)),
    substitutionCount: substitutionFrequency(windowWithCurrent, input.recentProgressionDecisions),
    readinessConservative: readinessTrendNeedsConservativeNext(input, windowWithCurrent),
  };
}

function hasAccumulatedFatigue(current: WorkoutCompletionLog, recent: WorkoutCompletionLog[]): boolean {
  const window = [current, ...recent].slice(0, 5);
  if (window.length < 3) return false;
  const highRpeCount = window.filter((log) => log.sessionRpe >= 8.5).length;
  const poorCompletionCount = window.filter((log) => completionRate(log) < 0.8).length;
  const painTrendCount = window.filter((log) => maxPain(log) >= 4).length;
  return highRpeCount >= 3 || poorCompletionCount >= 3 || painTrendCount >= 3;
}

function hasPerformanceDrop(current: WorkoutCompletionLog, recent: WorkoutCompletionLog[]): boolean {
  const previous = recent.slice(-3);
  if (previous.length < 2) return false;
  const previousLoads = previous.flatMap((log) => numericValues(log.exerciseResults.map((result) => result.loadUsed)));
  const currentLoads = numericValues(current.exerciseResults.map((result) => result.loadUsed));
  const previousReps = previous.flatMap((log) => numericValues(log.exerciseResults.map((result) => result.repsCompleted)));
  const currentReps = numericValues(current.exerciseResults.map((result) => result.repsCompleted));
  const previousLoadAverage = average(previousLoads);
  const currentLoadAverage = average(currentLoads);
  const previousRepAverage = average(previousReps);
  const currentRepAverage = average(currentReps);
  const loadDrop = previousLoadAverage != null && currentLoadAverage != null && currentLoadAverage <= previousLoadAverage * 0.9;
  const repDrop = previousRepAverage != null && currentRepAverage != null && currentRepAverage <= previousRepAverage * 0.85;
  return (loadDrop || repDrop) && current.sessionRpe >= 8;
}

function readinessNeedsRecovery(readiness: WorkoutReadinessBand | null | undefined): boolean {
  return readiness === 'red';
}

function decision(input: {
  kind: ProgressionDecision['direction'];
  reason: string;
  nextAdjustment: string;
  safetyFlags?: string[];
  affectedExerciseIds?: string[];
  affectedMovementPatterns?: string[];
  userMessage: string;
  coachNotes: string[];
  suggestedNextInput?: Partial<PersonalizedWorkoutInput>;
}): ProgressionDecision {
  const output: ProgressionDecision = {
    direction: input.kind,
    decision: input.kind,
    reason: input.reason,
    nextAdjustment: input.nextAdjustment,
    safetyFlags: input.safetyFlags ?? [],
    userMessage: input.userMessage,
    coachNotes: input.coachNotes,
  };
  if (input.affectedExerciseIds?.length) output.affectedExerciseIds = input.affectedExerciseIds;
  if (input.affectedMovementPatterns?.length) output.affectedMovementPatterns = input.affectedMovementPatterns;
  if (input.suggestedNextInput) output.suggestedNextInput = input.suggestedNextInput;
  return output;
}

function progressDecisionForType(input: {
  workoutTypeId: string;
  goalId: string;
  log: WorkoutCompletionLog;
  workout?: GeneratedWorkout;
}): ProgressionDecision {
  const { workoutTypeId, goalId, log } = input;
  const avgExerciseRpe = averageNumber(log.exerciseResults.map((result) => result.actualRpe)) ?? log.sessionRpe;
  const avgRir = averageNumber(log.exerciseResults.map((result) => result.actualRir));
  const completed = completionRate(log) >= 0.95;
  const movementQuality = averageNumber([
    log.movementQuality,
    ...log.exerciseResults.map((result) => result.movementQuality),
  ]);
  const zoneCompliance = averageNumber([
    log.heartRateZoneCompliance,
    ...log.exerciseResults.map((result) => result.heartRateZoneCompliance),
  ]);
  const durationRatio = log.plannedDurationMinutes > 0 ? log.actualDurationMinutes / log.plannedDurationMinutes : 1;
  const rangeControl = averageNumber([
    log.rangeControlScore,
    ...log.exerciseResults.map((result) => result.rangeControlScore),
  ]);
  const powerQuality = averageNumber([
    log.powerQualityScore,
    ...log.exerciseResults.map((result) => result.powerQualityScore),
  ]);
  const affectedExerciseIds = log.exerciseResults.map((result) => result.exerciseId);
  const affectedMovementPatterns = workoutExercisePatterns(input.workout, affectedExerciseIds);

  if (workoutTypeId === 'hypertrophy') {
    const hitTopOfRange = log.exerciseResults.every((result) => (
      typeof result.repRangeMax === 'number'
        ? (result.repsCompleted ?? 0) >= result.repRangeMax
        : result.completedAsPrescribed
    ));
    if (completed && hitTopOfRange && (avgRir == null || avgRir >= 1) && avgExerciseRpe <= 8) {
      return decision({
        kind: 'progress',
        reason: 'Hypertrophy work reached the top of the rep range with enough RIR/RPE control for double progression.',
        nextAdjustment: 'Increase load by the smallest available jump and restart near the lower end of the rep range.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'You hit the top of the range with usable reserve. Add a small load next time and rebuild from cleaner lower reps.',
        coachNotes: ['Use progression_double_8_12 when the template is 8-12.', 'Do not add sets and load in the same exposure.'],
        suggestedNextInput: { goalId, safetyFlags: [] },
      });
    }
  }

  if (workoutTypeId === 'zone2_cardio') {
    if (durationRatio >= 0.95 && log.sessionRpe <= 4 && (zoneCompliance == null || zoneCompliance >= 0.8)) {
      return decision({
        kind: 'progress',
        reason: 'Zone 2 duration and intensity compliance were both met.',
        nextAdjustment: 'Add 3-5 minutes next session while keeping the same conversational effort.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Keep the same easy pace and add a few minutes, not intensity.',
        coachNotes: ['Apply progression_zone2_duration.', 'Progress duration before pace or watts.'],
        suggestedNextInput: { goalId, durationMinutes: Math.round(log.plannedDurationMinutes + 5) },
      });
    }
  }

  if (workoutTypeId === 'conditioning' || workoutTypeId === 'low_impact_conditioning') {
    if (completed && log.sessionRpe <= 8 && (log.densityScore ?? 1) >= 0.9) {
      return decision({
        kind: 'progress',
        reason: 'Conditioning density was completed without excessive effort drop-off.',
        nextAdjustment: 'Add one round or trim transition time slightly while preserving movement quality.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Make the circuit a little denser while keeping the same clean movement standard.',
        coachNotes: ['Use progression_circuit_density or progression_hiit_interval depending on the template.', 'Do not progress if interval quality fades.'],
        suggestedNextInput: { goalId },
      });
    }
  }

  if (workoutTypeId === 'mobility') {
    if (completed && (rangeControl ?? 0) >= 4 && maxPain(log) <= 2) {
      return decision({
        kind: 'progress',
        reason: 'Mobility range/control improved without symptom increase.',
        nextAdjustment: 'Add one controlled rep per side or explore a slightly larger pain-free range.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Explore a little more range, but stop before the body guards or pinches.',
        coachNotes: ['Apply progression_mobility_range_of_motion.', 'Range progression must feel smoother, not forced.'],
        suggestedNextInput: { goalId },
      });
    }
  }

  if (workoutTypeId === 'recovery') {
    if (completed && log.sessionRpe <= 3 && maxPain(log) <= 2) {
      return decision({
        kind: 'progress',
        reason: 'Recovery work was tolerated and stayed easy.',
        nextAdjustment: 'Repeat recovery if readiness is still low, or return to a low-intensity version of the primary goal.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Recovery did its job. If readiness is better next time, move back toward easy training.',
        coachNotes: ['Recovery progression means readiness improves, not that recovery becomes hard.'],
        suggestedNextInput: { goalId: 'return_to_training', readinessBand: 'yellow' },
      });
    }
  }

  if (workoutTypeId === 'power' || workoutTypeId === 'boxing_support') {
    if (completed && (powerQuality ?? movementQuality ?? 0) >= 4 && log.sessionRpe <= 7) {
      return decision({
        kind: 'progress',
        reason: 'Power outputs stayed crisp with low enough fatigue.',
        nextAdjustment: 'Add one set or a small implement increase, but keep full recovery and stop on speed loss.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Power only progresses when every rep is sharp. Add a little, then stop before speed drops.',
        coachNotes: ['Apply progression_power_quality_gate.', 'Never add reps under fatigue to power work.'],
        suggestedNextInput: { goalId },
      });
    }
  }

  if (workoutTypeId === 'balance' || goalId === 'core_durability') {
    if (completed && (movementQuality ?? 0) >= 4 && maxPain(log) <= 2) {
      return decision({
        kind: 'progress',
        reason: 'Balance/control work was stable enough for one complexity step.',
        nextAdjustment: 'Progress stance, reach, or visual challenge before adding fatigue or load.',
        affectedExerciseIds,
        affectedMovementPatterns,
        userMessage: 'Make the balance task slightly more complex, but keep a support nearby.',
        coachNotes: ['Apply progression_balance_complexity.', 'Progress one complexity variable only.'],
        suggestedNextInput: { goalId },
      });
    }
  }

  if (completed && avgExerciseRpe <= 7) {
    return decision({
      kind: 'progress',
      reason: 'Strength work was completed with stable effort and no pain signal.',
      nextAdjustment: 'Add the smallest practical load jump next exposure while keeping the same sets and reps.',
      affectedExerciseIds,
      affectedMovementPatterns,
      userMessage: 'You owned the work. Add the smallest load jump next time and keep the same clean reps.',
      coachNotes: ['Apply progression_beginner_linear_load for beginner strength.', 'Repeat instead if readiness or pain worsens.'],
      suggestedNextInput: { goalId },
    });
  }

  return decision({
    kind: 'repeat',
    reason: 'The session was completed but did not clearly earn a workout-type-specific progression.',
    nextAdjustment: 'Repeat the same prescription and aim for cleaner completion, steadier effort, or better tracking.',
    affectedExerciseIds,
    affectedMovementPatterns,
    userMessage: 'Hold the dose. The next useful step is proving this session is repeatable.',
    coachNotes: ['Repeat is the neutral default when progression signals are incomplete.'],
    suggestedNextInput: { goalId },
  });
}

export function recommendNextProgression(input: WorkoutCompletionLog | ProgressionDecisionInput): ProgressionDecision {
  const normalized = normalizeProgressionInput(input);
  const log = normalized.completionLog;
  const summary = summarizeWorkoutCompletion(log);
  const failures = failedExerciseResults(log);
  const recent = recentTrend(normalized);
  const workoutTypeId = inferWorkoutType(normalized);
  const goalId = inferGoal(normalized);
  const signals = historySignals(normalized, workoutTypeId, goalId);
  const readinessAfter = normalized.readinessAfter ?? log.readinessAfter;
  const failedRepeatedExerciseIds = repeatedFailedExerciseIds(log, recent);
  const missed = missedRepResults(log);

  if (summary.painIncreased || failures.some((result) => (result.painScore ?? 0) >= 4)) {
    return decision({
      kind: failedRepeatedExerciseIds.length > 0 ? 'substitute' : 'regress',
      reason: failedRepeatedExerciseIds.length > 0
        ? 'Pain or failed completion is repeating on the same exercise, so the next decision should change the exercise rather than push the dose.'
        : 'Pain increased or an exercise produced a concerning pain score.',
      nextAdjustment: failedRepeatedExerciseIds.length > 0
        ? 'Swap the affected exercise for the safest same-pattern substitute and reduce target effort by one RPE point.'
        : 'Use safer substitutions where needed, reduce range/load, and cut at least one hard set next session.',
      affectedExerciseIds: failedRepeatedExerciseIds.length > 0 ? failedRepeatedExerciseIds : failures.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, failedRepeatedExerciseIds.length > 0 ? failedRepeatedExerciseIds : failures.map((result) => result.exerciseId)),
      safetyFlags: ['pain_increased_last_session'],
      userMessage: failedRepeatedExerciseIds.length > 0
        ? 'That exercise keeps failing the safety check. We will swap it before making the workout harder.'
        : 'Pain went up, so the next plan gets safer before it gets harder.',
      coachNotes: ['Regression_pain_increase overrides progression regardless of performance.', 'Escalate if symptoms are sharp, neurological, or worsening at rest.'],
      suggestedNextInput: {
        goalId,
        safetyFlags: ['pain_increased_last_session'],
        dislikedExerciseIds: failedRepeatedExerciseIds,
      },
    });
  }

  if ((signals.painDelta ?? 0) > 0.75 || (signals.similarPainDelta ?? 0) > 0.5) {
    return decision({
      kind: failedRepeatedExerciseIds.length > 0 ? 'substitute' : 'regress',
      reason: 'Pain is trending upward across recent sessions, so performance signals cannot drive progression yet.',
      nextAdjustment: failedRepeatedExerciseIds.length > 0
        ? 'Swap the repeatedly provocative exercise and reduce the next prescription by one effort level.'
        : 'Reduce load, range, or volume and keep the next session below symptom-provoking effort.',
      affectedExerciseIds: failedRepeatedExerciseIds.length > 0 ? failedRepeatedExerciseIds : log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, failedRepeatedExerciseIds.length > 0 ? failedRepeatedExerciseIds : log.exerciseResults.map((result) => result.exerciseId)),
      safetyFlags: ['pain_trend_worsening'],
      userMessage: 'Pain has been trending up. The next session gets safer before it gets harder.',
      coachNotes: ['Pain trend overrides good completion and load trends.', 'Review movement choice, range, and recent protected-workout load.'],
      suggestedNextInput: {
        goalId,
        safetyFlags: ['pain_trend_worsening'],
        dislikedExerciseIds: failedRepeatedExerciseIds,
      },
    });
  }

  if (readinessNeedsRecovery(readinessAfter)) {
    return decision({
      kind: 'recover',
      reason: 'Readiness after the session is red, so hard training should not be progressed.',
      nextAdjustment: 'Route the next workout to recovery or mobility until readiness improves.',
      safetyFlags: ['poor_readiness'],
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      userMessage: 'Readiness is red. The next session should help you recover, not prove toughness.',
      coachNotes: ['Recovery override sits above all performance progressions.', 'Preserve protected anchors but reduce supporting load.'],
      suggestedNextInput: { goalId: 'recovery', readinessBand: 'red', safetyFlags: ['poor_readiness'] },
    });
  }

  if (signals.readinessConservative) {
    return decision({
      kind: 'reduceVolume',
      reason: 'Recent readiness is mostly orange/red, so the next session should preserve the goal with a conservative dose.',
      nextAdjustment: 'Keep the same goal but reduce hard sets by 20-30 percent and cap effort one RPE point lower.',
      safetyFlags: ['readiness_trend_low'],
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      userMessage: 'Readiness has been running low. Keep the direction, but take the smaller dose.',
      coachNotes: ['Use recent readiness trend as a dose modifier before changing the primary goal.', 'Route to recovery if readiness becomes red.'],
      suggestedNextInput: { goalId, readinessBand: 'yellow', safetyFlags: ['readiness_trend_low'] },
    });
  }

  if (signals.substitutionCount >= 2) {
    const affected = failedRepeatedExerciseIds.length > 0
      ? failedRepeatedExerciseIds
      : log.exerciseResults.filter((result) => !result.completedAsPrescribed).map((result) => result.exerciseId);
    return decision({
      kind: 'substitute',
      reason: 'The recent history shows repeated substitutions, so the selected exercise is not fitting the athlete or context.',
      nextAdjustment: 'Choose a same-pattern substitute that matches equipment, skill, and safety flags before changing volume.',
      affectedExerciseIds: affected,
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, affected),
      safetyFlags: [],
      userMessage: 'You keep needing a swap here. Next time we should choose the better-fit exercise from the start.',
      coachNotes: ['Repeated substitutions are an exercise-selection signal, not an effort signal.', 'Keep training intent and adjust the movement.'],
      suggestedNextInput: { goalId, dislikedExerciseIds: affected },
    });
  }

  if (hasAccumulatedFatigue(log, recent)) {
    return decision({
      kind: 'deload',
      reason: 'Recent sessions show accumulated fatigue through high RPE, poor completion, or repeated pain signals.',
      nextAdjustment: 'Reduce hard volume 30-50 percent for one week and keep easy movement in the plan.',
      safetyFlags: ['high_fatigue'],
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      userMessage: 'Fatigue is carrying over. This week backs off so training can work again.',
      coachNotes: ['Apply deload_accumulated_fatigue.', 'Preserve protected anchors and deload support work around them.'],
      suggestedNextInput: { goalId, safetyFlags: ['high_fatigue'], readinessBand: 'yellow' },
    });
  }

  if (signals.similarWithCurrent.length >= 2 && (signals.averageSimilarRpe ?? signals.averageRpe ?? 0) >= 8.5) {
    return decision({
      kind: 'deload',
      reason: 'Actual RPE is trending high across recent similar sessions.',
      nextAdjustment: 'Repeat the goal with reduced load or volume and keep target effort below RPE 7 for the next exposure.',
      safetyFlags: ['high_rpe_trend'],
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      userMessage: 'Effort has been too high lately. Back off the dose so the next session is productive.',
      coachNotes: ['High RPE trend blocks progression even without pain.', 'Check sleep, fueling, and total weekly load.'],
      suggestedNextInput: { goalId, safetyFlags: ['high_rpe_trend'], readinessBand: 'yellow' },
    });
  }

  if (hasPerformanceDrop(log, recent)) {
    return decision({
      kind: 'deload',
      reason: 'Performance has dropped across recent sessions while effort remains high.',
      nextAdjustment: 'Reduce load and volume for 5-7 days, then return to baseline gradually.',
      safetyFlags: ['high_fatigue'],
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      userMessage: 'Performance is sliding. Take a planned back-off instead of forcing it.',
      coachNotes: ['Apply deload_performance_drop.', 'Investigate sleep, fueling, and protected workout load.'],
      suggestedNextInput: { goalId, safetyFlags: ['high_fatigue'] },
    });
  }

  if (signals.missedRepSessions >= 2) {
    const missedExerciseIds = Array.from(new Set(signals.similarWithCurrent.flatMap((item) => missedRepResults(item).map((result) => result.exerciseId))));
    return decision({
      kind: 'regress',
      reason: 'Missed reps are repeating across similar sessions.',
      nextAdjustment: 'Reduce load or reps by 10-15 percent and rebuild completion before progressing.',
      affectedExerciseIds: missedExerciseIds,
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, missedExerciseIds),
      safetyFlags: [],
      userMessage: 'The same kind of work has missed more than once. Make the next dose easier to complete cleanly.',
      coachNotes: ['Repeated missed reps override single-session completion optimism.', 'Choose repeat/regress before adding load.'],
      suggestedNextInput: { goalId },
    });
  }

  if (missed.length > 0 || summary.prescribedCompletionRate < 0.75) {
    return decision({
      kind: 'regress',
      reason: 'The workout was not completed as prescribed.',
      nextAdjustment: 'Repeat the same goal with fewer sets, lower load, or a lower target RPE.',
      affectedExerciseIds: missed.length > 0 ? missed.map((result) => result.exerciseId) : failures.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, missed.length > 0 ? missed.map((result) => result.exerciseId) : failures.map((result) => result.exerciseId)),
      safetyFlags: [],
      userMessage: 'Missed reps mean the dose was a little too high. Make the next version more repeatable.',
      coachNotes: ['Apply regression_missed_reps where available.', 'Do not progress load after missed prescribed work.'],
      suggestedNextInput: { goalId },
    });
  }

  if (workoutTypeId === 'zone2_cardio'
    && signals.similarWithCurrent.length >= 3
    && (signals.heartRateZoneCompliance ?? 0) >= 0.8
    && (signals.averageSimilarRpe ?? 10) <= 4
    && (signals.durationTrend === 'up' || signals.durationTrend === 'flat')) {
    return decision({
      kind: 'progress',
      reason: 'Recent Zone 2 sessions show duration and intensity compliance.',
      nextAdjustment: 'Add 3-5 minutes next session while staying conversational and in the same heart-rate zone.',
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      safetyFlags: [],
      userMessage: 'Your easy aerobic work is staying easy. Add a few minutes, not speed.',
      coachNotes: ['History supports duration progression.', 'Maintain talk-test compliance before progressing pace or watts.'],
      suggestedNextInput: { goalId, durationMinutes: Math.round(log.plannedDurationMinutes + 5) },
    });
  }

  if (signals.similarWithCurrent.length >= 3
    && (signals.averageSimilarCompletionRate ?? 0) >= 0.95
    && (signals.averageSimilarRpe ?? 10) <= 7.5
    && (signals.similarPainDelta ?? 0) <= 0.25
    && signals.missedRepSessions === 0) {
    const base = progressDecisionForType({
      workoutTypeId,
      goalId,
      log,
      ...(normalized.workout ? { workout: normalized.workout } : {}),
    });
    return {
      ...base,
      direction: 'progress',
      decision: 'progress',
      reason: `Three similar sessions support progression. ${base.reason}`,
      userMessage: base.userMessage ?? 'The recent trend supports a small progression next time.',
      coachNotes: ['Progression was history-supported across the last three similar sessions.', ...(base.coachNotes ?? [])],
    };
  }

  if (log.sessionRpe >= 9) {
    return decision({
      kind: 'reduceIntensity',
      reason: 'The session was completed but landed too close to max effort.',
      nextAdjustment: 'Lower target RPE by one to two points before adding volume or load.',
      affectedExerciseIds: log.exerciseResults.map((result) => result.exerciseId),
      affectedMovementPatterns: workoutExercisePatterns(normalized.workout, log.exerciseResults.map((result) => result.exerciseId)),
      safetyFlags: ['high_fatigue'],
      userMessage: 'That was too close to the ceiling. Bring effort down next time.',
      coachNotes: ['High RPE blocks progression even when completion is good.'],
      suggestedNextInput: { goalId, safetyFlags: ['high_fatigue'] },
    });
  }

  const progressInput: {
    workoutTypeId: string;
    goalId: string;
    log: WorkoutCompletionLog;
    workout?: GeneratedWorkout;
  } = {
    workoutTypeId,
    goalId,
    log,
  };
  if (normalized.workout) progressInput.workout = normalized.workout;
  return progressDecisionForType(progressInput);
}
