// Intentional public workout-programming surface.
// App code should prefer the workoutProgrammingService facade plus shared display types.
export * from './types.ts';

// Advanced engine/content exports remain public for content tooling, migrations, and focused engine tests.
export * from './seedData.ts';
export * from './intelligenceData.ts';
export * from './seedLoader.ts';
export * from './workoutProgrammingEngine.ts';
export * from './workoutDescriptionService.ts';
export * from './catalogValidation.ts';
export * from './content/validation.ts';
export * from './contentReview.ts';
export * from './contentReviewWorkflow.ts';
export * from './appStateAdapter.ts';
export * from './validationEngine.ts';
export * from './substitutionEngine.ts';
export * from './intelligenceEngine.ts';
export * from './personalizationEngine.ts';
export * from './programBuilder.ts';
export * from './analyticsEngine.ts';
export * from './historyAnalyticsAdapter.ts';
export * from './decisionTraceSummaries.ts';
export * from './workoutMediaAudit.ts';
export * from './workoutSafetyCopy.ts';
export * from './workoutProgrammingFallbacks.ts';
export * from './persistenceService.ts';

// Service fixtures are intentionally not exported from this barrel; import the fixture file directly in dev/test code.
export type {
  GeneratedWorkoutLifecycleResult,
  GeneratedWorkoutSessionCompletionInput,
  GeneratedWorkoutSessionCompletionResult,
  GeneratedWorkoutSessionExerciseCompletionInput,
  GeneratedWorkoutSessionResult,
} from './workoutProgrammingServiceTypes.ts';
export * as workoutProgrammingService from './workoutProgrammingService.ts';
