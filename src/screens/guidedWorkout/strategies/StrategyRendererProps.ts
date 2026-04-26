/**
 * Shared props interface for all strategy renderers.
 *
 * Every renderer receives the same set of props from GuidedWorkoutScreen.
 * Renderers can ignore props that don't apply to their strategy
 * (e.g. CircuitRenderer ignores overloadSuggestion).
 */

import type { ExerciseVM, ExerciseProgressVM, WorkoutSessionVM, WorkoutSectionVM } from '../../../components/workout/types';
import type { SetAdaptationResult, WorkoutEffortLogInput } from '../../../../lib/engine/types';

export interface StrategyRendererProps {
  // Session context
  session: WorkoutSessionVM;
  currentSection: WorkoutSectionVM | null;
  currentSectionIndex: number;

  // Current exercise
  exercise: ExerciseVM;
  exerciseIndex: number;
  totalExercises: number;
  progress: ExerciseProgressVM | null;

  // Input state
  selectedWeight: number;
  selectedReps: number;
  selectedRPE: number | null;
  isLoggingSet: boolean;

  // Interaction mode
  isGymFloor: boolean;

  // Adaptation/feedback
  adaptationResult: SetAdaptationResult | null;
  adaptationDismissed: boolean;

  // Rest timer
  restSeconds: number | null;
  restTotal: number;

  // Callbacks
  onLogSet: () => void;
  onLogEffort: (effort: WorkoutEffortLogInput) => Promise<void>;
  onCompleteExercise: () => void;
  onSkipExercise: () => void;
  onWeightDecrement: () => void;
  onWeightIncrement: () => void;
  onRepsDecrement: () => void;
  onRepsIncrement: () => void;
  onSelectRPE: (rpe: number | null) => void;
  onDismissAdaptation: () => void;
  onSkipRest: () => void;
  onExtendRest: (additionalSeconds: number) => void;
  onFinishWorkout: () => void;

  // Warmup
  warmupSets: Array<{ setNumber: number; weight: number; reps: number; label: string; isCompleted: boolean }>;
  allWarmupsDone: boolean;
  onToggleWarmup: (setNumber: number) => void;

  // Overload suggestion
  showWeightBanner: boolean;
  overloadSuggestion: {
    lastSessionWeight: number;
    lastSessionReps: number;
    lastSessionRPE: number | null;
    suggestedWeight: number;
    suggestedReps: number;
    reasoning: string;
    isDeloadSet?: boolean;
  } | null;
  onAcceptSuggestion: () => void;
  onModifySuggestion: () => void;

  // Form cues
  formCues: string | null;
  formCueExpanded: boolean;
  onToggleFormCue: () => void;

  // Navigation
  isLastExercise: boolean;
  nextExerciseName: string | null;

  // Display helpers
  formatWeight: (v: number) => string;
}
