import type {
  ExerciseSelectionFinalDecision,
  ExerciseSelectionScoreTrace,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  WorkoutDecisionTraceEntry,
  WorkoutValidationResult,
} from './types.ts';

export interface UserWorkoutDecisionSummary {
  headline: string;
  whyThisWorkout: string[];
  intensityAdjustments: string[];
  safety: string[];
  recoveryFallback: string | null;
  substitutions: string[];
}

export interface UserExerciseSelectionSummary {
  exerciseId: string;
  exerciseName: string;
  whyThisExercise: string[];
  intensity: string[];
  safety: string[];
  substitutions: string[];
}

export interface AdminScoreTraceSummary {
  exerciseId: string;
  slotId: string;
  totalScore: number;
  scoreBreakdown: Record<string, number>;
  includedReasons: string[];
  excludedReasons: string[];
  safetyFlagsApplied: string[];
  finalDecision: ExerciseSelectionFinalDecision;
}

export interface AdminSlotCandidateSummary {
  slotId: string;
  selectedExerciseId: string | null;
  candidates: AdminScoreTraceSummary[];
}

export interface AdminRejectedCandidateSummary {
  exerciseId: string;
  slotId?: string;
  totalScore?: number;
  rejectedBy?: string;
  excludedReasons: string[];
  safetyFlagsApplied: string[];
}

export interface AdminSafetyExclusionSummary {
  exerciseId: string;
  slotId: string;
  finalDecision: ExerciseSelectionFinalDecision;
  excludedReasons: string[];
  safetyFlagsApplied: string[];
  scoreBreakdown: Record<string, number>;
}

export interface AdminScoringTraceSummary {
  selectedExerciseScores: AdminScoreTraceSummary[];
  slotLevelCandidateScoring: AdminSlotCandidateSummary[];
  rejectedCandidates: AdminRejectedCandidateSummary[];
  safetyExclusions: AdminSafetyExclusionSummary[];
  substitutionScoring: AdminScoreTraceSummary[];
}

export interface AdminValidationTraceSummary {
  isValid: boolean | null;
  errors: string[];
  warnings: string[];
  failedRuleIds: string[];
  validationTrace: WorkoutValidationResult['decisionTrace'];
  contentReviewGateDecisions: WorkoutDecisionTraceEntry[];
}

export interface AdminWorkoutDecisionSummary {
  schemaVersion: GeneratedWorkout['schemaVersion'];
  workoutTypeId: string;
  goalId: string;
  templateId: string;
  selectedTemplateTrace: WorkoutDecisionTraceEntry | null;
  selectedPrescriptionTrace: WorkoutDecisionTraceEntry[];
  movementSlotTrace: WorkoutDecisionTraceEntry[];
  scoring: AdminScoringTraceSummary;
  validation: AdminValidationTraceSummary;
  contentReviewGateDecisions: WorkoutDecisionTraceEntry[];
  fallbackDecisions: WorkoutDecisionTraceEntry[];
  decisionTrace: WorkoutDecisionTraceEntry[];
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function labelize(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function userSafeText(value: string): string {
  return value
    .replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (match) => labelize(match).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function allExercises(workout: GeneratedWorkout): GeneratedExercisePrescription[] {
  return workout.blocks.flatMap((block) => block.exercises);
}

function allDecisionTrace(workout: GeneratedWorkout): WorkoutDecisionTraceEntry[] {
  return workout.decisionTrace ?? [];
}

function validationDecisionTrace(workout: GeneratedWorkout): WorkoutValidationResult['decisionTrace'] {
  return workout.generationTrace?.validationTrace ?? workout.validation?.decisionTrace ?? [];
}

function traceReasons(workout: GeneratedWorkout, pattern: RegExp): string[] {
  return unique(allDecisionTrace(workout)
    .filter((entry) => pattern.test(entry.step) || pattern.test(entry.reason))
    .map((entry) => userSafeText(entry.reason)));
}

function workoutSubstitutionReasons(workout: GeneratedWorkout): string[] {
  return unique(allExercises(workout)
    .flatMap((exercise) => exercise.substitutions ?? [])
    .map((substitution) => `${substitution.name}: ${userSafeText(substitution.rationale)}`))
    .slice(0, 6);
}

function safetySummary(workout: GeneratedWorkout): string[] {
  const safetyFlags = workout.safetyFlags.map(labelize);
  const notes = [
    ...(workout.safetyNotes ?? []),
    ...(workout.validation?.userFacingMessages ?? []),
  ].map(userSafeText);
  const blocked = workout.blocked
    ? ['Safety blocked hard training for this generated session. Choose review, recovery, or mobility before training hard.']
    : [];
  const activeFlags = safetyFlags.length
    ? [`Active safety flags shaped the session: ${safetyFlags.join(', ')}.`]
    : [];
  return unique([...blocked, ...activeFlags, ...notes]).slice(0, 5);
}

function intensitySummary(workout: GeneratedWorkout): string[] {
  const readiness = traceReasons(workout, /readiness|sleep|soreness|fatigue|energy|intensity|volume|rpe/i);
  const lowTargets = allExercises(workout).filter((exercise) => exercise.prescription.targetRpe <= 4).length;
  const conservative = lowTargets > 0 && workout.safetyFlags.length > 0
    ? [`${lowTargets} exercise${lowTargets === 1 ? '' : 's'} use easy-to-moderate effort because safety or readiness flags are active.`]
    : [];
  return unique([...readiness, ...conservative]).slice(0, 4);
}

function recoveryFallbackReason(workout: GeneratedWorkout): string | null {
  const fallback = traceReasons(workout, /safety_goal_fallback|validation_recovery_fallback|recovery-first|recovery instead/i)[0];
  if (fallback) return fallback;
  if (workout.workoutTypeId === 'recovery' && workout.safetyFlags.length > 0) {
    return `Recovery was selected because ${workout.safetyFlags.map(labelize).join(', ')} made hard training a poor fit today.`;
  }
  return null;
}

export function summarizeWorkoutDecisionForUser(workout: GeneratedWorkout): UserWorkoutDecisionSummary {
  const recoveryFallback = recoveryFallbackReason(workout);
  const whyThisWorkout = unique([
    workout.userFacingSummary ?? '',
    workout.description?.plainLanguageSummary ?? '',
    ...traceReasons(workout, /resolve_goal_type|select_session_template/),
    ...workout.explanations.map(userSafeText),
  ]).slice(0, 5);
  const headline = workout.blocked
    ? 'Safety-first recommendation'
    : recoveryFallback
      ? 'Recovery-first recommendation'
      : workout.sessionIntent ?? workout.description?.sessionIntent ?? 'Generated workout recommendation';

  return {
    headline,
    whyThisWorkout,
    intensityAdjustments: intensitySummary(workout),
    safety: safetySummary(workout),
    recoveryFallback,
    substitutions: workoutSubstitutionReasons(workout),
  };
}

export function summarizeExerciseSelectionForUser(
  workout: GeneratedWorkout,
  exerciseId: string,
): UserExerciseSelectionSummary {
  const exercise = allExercises(workout).find((item) => item.exerciseId === exerciseId);
  if (!exercise) {
    return {
      exerciseId,
      exerciseName: labelize(exerciseId),
      whyThisExercise: ['This exercise is not part of the generated workout.'],
      intensity: [],
      safety: [],
      substitutions: [],
    };
  }
  const scoreTrace = exercise.scoreTrace
    ?? workout.exerciseSelectionTrace?.find((trace) => trace.exerciseId === exercise.exerciseId && trace.finalDecision === 'selected');
  const whyThisExercise = unique([
    userSafeText(exercise.explanation),
    ...(scoreTrace?.includedReasons.map(userSafeText) ?? []),
  ]).slice(0, 5);
  const safety = unique([
    ...(scoreTrace?.safetyFlagsApplied.length
      ? [`Safety checks considered: ${scoreTrace.safetyFlagsApplied.map(labelize).join(', ')}.`]
      : []),
    ...(scoreTrace?.excludedReasons.filter((reason) => /safety|joint|impact|readiness|fatigue/i.test(reason)).map(userSafeText) ?? []),
  ]).slice(0, 4);
  const intensity = unique([
    `Target effort is ${exercise.prescription.targetRpe}/10 so the work matches today's session intent.`,
    exercise.prescription.intensityCue,
  ].map(userSafeText)).slice(0, 3);
  const substitutions = unique((exercise.substitutions ?? [])
    .map((substitution) => `${substitution.name} appears because ${userSafeText(substitution.rationale)}`))
    .slice(0, 4);

  return {
    exerciseId,
    exerciseName: exercise.name,
    whyThisExercise,
    intensity,
    safety,
    substitutions,
  };
}

function adminScore(trace: ExerciseSelectionScoreTrace): AdminScoreTraceSummary {
  return {
    exerciseId: trace.exerciseId,
    slotId: trace.slotId,
    totalScore: trace.totalScore,
    scoreBreakdown: trace.scoreBreakdown,
    includedReasons: trace.includedReasons,
    excludedReasons: trace.excludedReasons,
    safetyFlagsApplied: trace.safetyFlagsApplied,
    finalDecision: trace.finalDecision,
  };
}

function groupBySlot(traces: ExerciseSelectionScoreTrace[]): AdminSlotCandidateSummary[] {
  const slotIds = Array.from(new Set(traces.map((trace) => trace.slotId)));
  return slotIds.map((slotId) => {
    const candidates = traces
      .filter((trace) => trace.slotId === slotId)
      .sort((left, right) => {
        if (left.finalDecision === 'selected') return -1;
        if (right.finalDecision === 'selected') return 1;
        return right.totalScore - left.totalScore;
      })
      .map(adminScore);
    return {
      slotId,
      selectedExerciseId: candidates.find((candidate) => candidate.finalDecision === 'selected')?.exerciseId ?? null,
      candidates,
    };
  });
}

function rejectedFromMovementTrace(workout: GeneratedWorkout): AdminRejectedCandidateSummary[] {
  return (workout.generationTrace?.movementSlotTrace ?? [])
    .flatMap((entry) => (entry.rejectedIds ?? []).map((exerciseId) => ({
      exerciseId,
      rejectedBy: entry.id,
      excludedReasons: [],
      safetyFlagsApplied: entry.safetyFlagIds ?? [],
    })));
}

export function summarizeScoringTraceForAdmin(workout: GeneratedWorkout): AdminScoringTraceSummary {
  const traces = workout.generationTrace?.exerciseSelectionTrace ?? workout.exerciseSelectionTrace ?? [];
  const selectedExerciseScores = allExercises(workout)
    .map((exercise) => exercise.scoreTrace ?? traces.find((trace) => trace.exerciseId === exercise.exerciseId && trace.finalDecision === 'selected'))
    .filter((trace): trace is ExerciseSelectionScoreTrace => Boolean(trace))
    .map(adminScore);
  const rejectedTraceRows = traces
    .filter((trace) => trace.finalDecision === 'rejected')
    .map((trace) => ({
      exerciseId: trace.exerciseId,
      slotId: trace.slotId,
      totalScore: trace.totalScore,
      excludedReasons: trace.excludedReasons,
      safetyFlagsApplied: trace.safetyFlagsApplied,
    }));
  const safetyExclusions = traces
    .filter((trace) => trace.finalDecision === 'excluded' && (
      trace.safetyFlagsApplied.length > 0
      || trace.excludedReasons.some((reason) => /safety|contraindication|joint|impact|readiness|fatigue/i.test(reason))
    ))
    .map((trace) => ({
      exerciseId: trace.exerciseId,
      slotId: trace.slotId,
      finalDecision: trace.finalDecision,
      excludedReasons: trace.excludedReasons,
      safetyFlagsApplied: trace.safetyFlagsApplied,
      scoreBreakdown: trace.scoreBreakdown,
    }));

  return {
    selectedExerciseScores,
    slotLevelCandidateScoring: groupBySlot(traces),
    rejectedCandidates: [...rejectedTraceRows, ...rejectedFromMovementTrace(workout)],
    safetyExclusions,
    substitutionScoring: (workout.generationTrace?.substitutionTrace ?? workout.substitutionTrace ?? []).map(adminScore),
  };
}

export function summarizeValidationTraceForAdmin(workout: GeneratedWorkout): AdminValidationTraceSummary {
  const contentReviewGateDecisions = allDecisionTrace(workout).filter((entry) => entry.step === 'content_review');
  return {
    isValid: workout.validation?.isValid ?? null,
    errors: workout.validationErrors ?? workout.validation?.errors ?? [],
    warnings: workout.validationWarnings ?? workout.validation?.warnings ?? [],
    failedRuleIds: workout.validation?.failedRuleIds ?? [],
    validationTrace: validationDecisionTrace(workout),
    contentReviewGateDecisions,
  };
}

export function summarizeWorkoutDecisionForAdmin(workout: GeneratedWorkout): AdminWorkoutDecisionSummary {
  const contentReviewGateDecisions = allDecisionTrace(workout).filter((entry) => entry.step === 'content_review');
  const fallbackDecisions = [
    ...(workout.generationTrace?.fallbackTrace ?? []),
    ...allDecisionTrace(workout).filter((entry) => /fallback|blocked|missing|required/i.test(entry.step)),
  ];
  return {
    schemaVersion: workout.schemaVersion,
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    templateId: workout.templateId,
    selectedTemplateTrace: workout.generationTrace?.selectedTemplateTrace ?? null,
    selectedPrescriptionTrace: workout.generationTrace?.selectedPrescriptionTrace ?? [],
    movementSlotTrace: workout.generationTrace?.movementSlotTrace ?? [],
    scoring: summarizeScoringTraceForAdmin(workout),
    validation: summarizeValidationTraceForAdmin(workout),
    contentReviewGateDecisions,
    fallbackDecisions,
    decisionTrace: allDecisionTrace(workout),
  };
}
