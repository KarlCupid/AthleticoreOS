export const GENERATED_WORKOUT_SAFETY_COPY = {
  user: {
    sharpPainReminder: 'Pause if pain becomes sharp, unusual, or changes how you move.',
    redFlagSymptomMessage: 'If you notice chest pain, fainting, severe dizziness, or neurological symptoms, stop and seek professional guidance.',
    professionalGuidance: 'Seek professional guidance if symptoms are unusual, severe, or changing.',
    blockedWorkoutMessage: 'This support session needs review before hard training. Use the safety notes and choose recovery or mobility if anything feels off.',
    blockedWorkoutStatusDetail: 'Hard training is not the right call from this session today.',
    sessionBlockedBySafetyReview: 'Review safety notes before training.',
    recoveryFallback: 'Use a review, recovery, or mobility path before hard training.',
    blockedWorkoutDecisionSummary: 'Safety review paused hard training for this support session. Choose review, recovery, or mobility before training hard.',
    safetyGuardrailsActive: 'Safety notes are active.',
    validationReviewBeforeStart: 'Review notes before starting.',
    noGeneratedWorkoutYet: 'No support session has been built yet.',
    noExtraSafetyFlag: 'No extra safety note was added.',
    noExtraSafetyFlagForSession: 'No extra safety note was added for this session.',
    listedGuardrails: 'Use the listed guardrails and keep the session comfortable and controlled.',
  },
  persistence: {
    generatedLocallyPersistenceUnavailable: 'Built on this device. Saving is not ready.',
    completedLocallyPersistenceUnavailable: 'Completed on this device. Saving is not ready.',
    completedLocallyPrefix: 'Completed locally:',
    noSafeGeneratedWorkoutFound: 'No safe support session was found.',
    generatedSessionLocal: 'This support session is stored on this device.',
    sessionStartedLocalPersistenceUnavailable: 'Session started on this device. Saving is not ready.',
    sessionPausedLocalPersistenceUnavailable: 'Session paused on this device. Saving is not ready.',
    sessionResumedLocalPersistenceUnavailable: 'Session resumed on this device. Saving is not ready.',
    sessionAbandonedLocalPersistenceUnavailable: 'Stopped on this device. Saving is not ready.',
  },
  adminDebug: {
    safetyReviewBlocked: 'Support session was paused by the safety review gate.',
    persistenceFallbackUsed: 'Support-session flow used local fallback because saving was not ready.',
    recoveryFallbackApplied: 'Support session routed to recovery because safety or readiness flags made hard training a poor fit.',
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
