// Shared workout component library
// Used by both GuidedWorkoutScreen (live) and Replay Lab (readonly)

// Types
export type {
  WorkoutSessionVM,
  WorkoutSectionVM,
  ExerciseVM,
  ExerciseProgressVM,
  SetPrescriptionVM,
  ExerciseSubstitutionVM,
  OverloadSuggestionVM,
  TimedWorkVM,
  CircuitRoundVM,
  CircuitMovementVM,
  ConditioningVM,
  ConditioningDrillVM,
  ConditioningLogVM,
  ConditioningDrillLogVM,
  SetLogVM,
  EffortLogVM,
  PRResultVM,
  WorkoutStatsVM,
  WorkoutRenderMode,
} from './types';

// Adapters
export {
  fromPrescriptionV2,
  fromReplayDay,
  fromExerciseProgress,
  fromReplayExerciseLogs,
  fromReplayConditioningLog,
  fromReplayStats,
} from './adapters';

// Components
export { SetDots, SetMiniTable, ProgressBar } from './SetTracker';
export { NumberStepper, InputRow } from './SetInputPanel';
export { SessionHeader } from './SessionHeader';
export { SectionRail } from './SectionRail';
export { ExerciseCard, ExerciseRowCompact } from './ExerciseCard';
export { SectionCard } from './SectionCard';
export { ComparisonRow } from './ComparisonRow';
export { TimerDisplay } from './TimerDisplay';
export type { TimerMode, TimerDisplayProps } from './TimerDisplay';
export { LoadingPyramid } from './LoadingPyramid';
export { CircuitView } from './CircuitView';
export { ConditioningCard } from './ConditioningCard';
export { RecoveryChecklist } from './RecoveryChecklist';
export { ActivationChecklist } from './ActivationChecklist';
