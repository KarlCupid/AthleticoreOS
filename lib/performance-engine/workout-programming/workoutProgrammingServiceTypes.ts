import type { ContentReviewMode } from './contentReview.ts';
import type { WorkoutProgrammingAppStateAdapterInput } from './appStateAdapter.ts';
import type { WorkoutProgrammingPersistenceOptions } from './persistenceService.ts';
import type {
  ExerciseSubstitutionOption,
  GeneratedWorkout,
  GeneratedWorkoutSessionLifecycle,
  PersonalizedWorkoutInput,
  ProgramCalendarEvent,
  ProgressionDecision,
  ProtectedWorkoutInput,
  WorkoutCompletionLog,
  WorkoutExperienceLevel,
  WorkoutReadinessBand,
} from './types.ts';

export interface WorkoutProgrammingServiceOptions extends WorkoutProgrammingPersistenceOptions {
  persistGeneratedWorkout?: boolean;
  persistGeneratedProgram?: boolean;
  contentReviewMode?: ContentReviewMode;
  allowDraftContent?: boolean;
  telemetryEnabled?: boolean;
  appContextVersion?: string;
  engineVersion?: string;
  contentVersion?: string;
}

export type WorkoutProgrammingPreviewRequest = PersonalizedWorkoutInput;

export type WorkoutProgrammingUserRequest = Pick<PersonalizedWorkoutInput, 'goalId'> & Partial<PersonalizedWorkoutInput> & {
  regeneratedFromGeneratedWorkoutId?: string | null;
};

export interface WorkoutProgrammingSubstitutionConstraints {
  userId?: string;
  generatedWorkoutId?: string | null;
  equipmentIds?: string[];
  safetyFlagIds?: string[];
  experienceLevel?: WorkoutExperienceLevel;
  dislikedExerciseIds?: string[];
  limit?: number;
}

export interface WorkoutProgrammingSubstitutionResult {
  sourceExerciseId: string;
  options: ExerciseSubstitutionOption[];
  selected: ExerciseSubstitutionOption | null;
}

export interface WorkoutProgrammingCompletionResult {
  workoutCompletionId: string | null;
  progressionDecision: ProgressionDecision;
  progressionDecisionId: string | null;
  nextSessionRecommendation: string;
}

export interface GeneratedWorkoutSessionResult {
  workout: GeneratedWorkout;
  generatedWorkoutId: string | null;
  persisted: boolean;
  lifecycle?: GeneratedWorkoutLifecycleResult;
  lifecycleFallbackMessage?: string;
}

export interface GeneratedWorkoutLifecycleResult {
  lifecycle: GeneratedWorkoutSessionLifecycle;
  persisted: boolean;
  fallbackMessage?: string;
}

export interface GeneratedWorkoutSessionExerciseCompletionInput {
  exerciseId: string;
  setsCompleted?: number | null;
  repsCompleted?: number | null;
  durationSecondsCompleted?: number | null;
  durationMinutesCompleted?: number | null;
  actualRpe?: number | null;
  painScore?: number | null;
  completedAsPrescribed?: boolean;
}

export interface GeneratedWorkoutSessionCompletionInput {
  workout: GeneratedWorkout;
  generatedWorkoutId?: string | null;
  startedAt?: string | null;
  completedAt?: string;
  completedExerciseIds?: string[];
  exerciseResults?: GeneratedWorkoutSessionExerciseCompletionInput[];
  sessionRpe: number;
  painScoreBefore?: number | null;
  painScoreAfter?: number | null;
  notes?: string | null;
  completionStatus?: 'completed' | 'partial' | 'stopped';
  substitutionsUsed?: string[];
  rating?: number | null;
  feedbackTags?: string[];
  likedExerciseIds?: string[];
  dislikedExerciseIds?: string[];
}

export interface GeneratedWorkoutSessionCompletionResult extends WorkoutProgrammingCompletionResult {
  feedbackId: string | null;
  lifecycle?: GeneratedWorkoutLifecycleResult;
  lifecycleFallbackMessage?: string;
}

export type WorkoutProgrammingProgramRequest = Pick<PersonalizedWorkoutInput, 'goalId'> & Partial<PersonalizedWorkoutInput> & {
  secondaryGoalIds?: string[];
  weekCount?: number;
  desiredProgramLengthWeeks?: number;
  sessionsPerWeek?: number;
  availableDays?: number[];
  protectedWorkouts?: ProtectedWorkoutInput[];
  readinessTrend?: WorkoutReadinessBand[];
  deloadStrategy?: 'none' | 'week_four' | 'readiness_based' | 'every_fourth_week';
  startDate?: string;
  calendarEvents?: ProgramCalendarEvent[];
  existingCalendarEvents?: ProgramCalendarEvent[];
};

export type WorkoutProgrammingPerformanceStateRequest = WorkoutProgrammingAppStateAdapterInput;

export interface LogWorkoutCompletionOptions extends WorkoutProgrammingServiceOptions {
  generatedWorkoutId?: string | null;
  workoutCompletionId?: string | null;
  workout?: GeneratedWorkout;
}

export interface ProgressionLookupOptions extends WorkoutProgrammingServiceOptions {
  workout?: GeneratedWorkout;
  recentWorkoutCompletions?: WorkoutCompletionLog[];
  recentProgressionDecisions?: ProgressionDecision[];
  readinessTrend?: WorkoutReadinessBand[];
  workoutCompletionId?: string | null;
}
