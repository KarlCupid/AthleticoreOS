export const GENERATED_WORKOUT_SAFETY_COPY = {
  user: {
    sharpPainReminder: 'Pause if pain becomes sharp, unusual, or changes how you move.',
    redFlagSymptomMessage: 'If you notice chest pain, fainting, severe dizziness, or neurological symptoms, stop and seek professional guidance.',
    professionalGuidance: 'Seek professional guidance if symptoms are unusual, severe, or changing.',
    blockedWorkoutMessage: 'This generated session is blocked. Use the safety notes and choose a review, recovery, or mobility path before training.',
    blockedWorkoutStatusDetail: 'Hard training is not recommended from this generated session.',
    sessionBlockedBySafetyReview: 'This session is blocked by safety review.',
    recoveryFallback: 'Use a review, recovery, or mobility path before hard training.',
    blockedWorkoutDecisionSummary: 'Safety blocked hard training for this generated session. Choose review, recovery, or mobility before training hard.',
    safetyGuardrailsActive: 'Safety guardrails are active.',
    validationReviewBeforeStart: 'Review validation messages before starting.',
    noGeneratedWorkoutYet: 'No generated workout yet.',
    noExtraSafetyFlag: 'No extra safety flag was applied.',
    noExtraSafetyFlagForSession: 'No extra safety flag was applied to this generated session.',
    listedGuardrails: 'Use the listed guardrails and keep the session comfortable and controlled.',
  },
  persistence: {
    generatedLocallyPersistenceUnavailable: 'Generated locally. Persistence unavailable.',
    completedLocallyPersistenceUnavailable: 'Completed locally. Persistence unavailable.',
    completedLocallyPrefix: 'Completed locally:',
    noSafeGeneratedWorkoutFound: 'No safe generated workout found.',
    generatedSessionLocal: 'Generated session is local on this device.',
    sessionStartedLocalPersistenceUnavailable: 'Session started locally. Persistence unavailable.',
    sessionPausedLocalPersistenceUnavailable: 'Session paused locally. Persistence unavailable.',
    sessionResumedLocalPersistenceUnavailable: 'Session resumed locally. Persistence unavailable.',
    sessionAbandonedLocalPersistenceUnavailable: 'Abandoned locally. Persistence unavailable.',
  },
  adminDebug: {
    safetyReviewBlocked: 'Generated workout was blocked by the safety review gate.',
    persistenceFallbackUsed: 'Generated workout flow used local fallback because persistence was unavailable.',
    recoveryFallbackApplied: 'Generated workout routed to recovery because safety or readiness flags made hard training a poor fit.',
  },
} as const;

export function generatedWorkoutSafetyReminder(): string {
  return `${GENERATED_WORKOUT_SAFETY_COPY.user.sharpPainReminder} ${GENERATED_WORKOUT_SAFETY_COPY.user.redFlagSymptomMessage}`;
}

export function generatedWorkoutDefaultSafetyNotes(): string[] {
  return [
    GENERATED_WORKOUT_SAFETY_COPY.user.sharpPainReminder,
    GENERATED_WORKOUT_SAFETY_COPY.user.redFlagSymptomMessage,
  ];
}
