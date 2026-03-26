/**
 * Normalized view-model interfaces for the shared workout component library.
 *
 * These types decouple the UI from engine internals. Both surfaces
 * (GuidedWorkoutScreen and the Replay Lab) convert their source data
 * into these shapes via adapter functions in `adapters.ts`.
 */

import type {
  LoadingStrategy,
  WorkoutSectionTemplate,
  ExerciseRole,
} from '../../../lib/engine/types/training';
import type {
  WorkoutType,
  WorkoutFocus,
} from '../../../lib/engine/types/foundational';

// ---------------------------------------------------------------------------
// Session-level
// ---------------------------------------------------------------------------

export interface WorkoutSessionVM {
  /** High-level workout category */
  workoutType: WorkoutType;
  /** The focus/split for this session */
  focus: WorkoutFocus | 'strength';
  /** Human-readable session goal */
  sessionGoal: string | null;
  /** One-line intent */
  sessionIntent: string | null;
  /** Primary stimulus delivered */
  primaryAdaptation: 'strength' | 'power' | 'conditioning' | 'recovery' | 'mixed';
  /** Estimated total duration */
  estimatedDurationMin: number;
  /** Ordered section breakdown */
  sections: WorkoutSectionVM[];
  /** Whether this is a deload session */
  isDeload: boolean;
  /** Camp phase if in fight camp, null otherwise */
  campPhase: string | null;
  /** Conditioning block (may exist alongside or instead of sections) */
  conditioning: ConditioningVM | null;
  /** Activation guidance text */
  activationGuidance: string | null;
  /** Expected RPE for activation */
  expectedActivationRPE: number | null;
  /** Interference warnings */
  interferenceWarnings: string[];
  /** Full decision trace strings */
  decisionTrace: string[];
  /** Whether a session blueprint with sections exists */
  hasSections: boolean;
  /** Session role (e.g. 'train', 'rest', 'recover', 'cut_protect') */
  sessionRole: string;
  /** Flat exercise list (fallback when no sections exist) */
  flatExercises: ExerciseVM[];
  /** Blueprint label */
  blueprintName: string;
}

// ---------------------------------------------------------------------------
// Section-level
// ---------------------------------------------------------------------------

export interface WorkoutSectionVM {
  id: string;
  template: WorkoutSectionTemplate;
  title: string;
  intent: string;
  /** Time cap in minutes */
  timeCap: number;
  restRule: string;
  densityRule: string | null;
  finisherReason: string | null;
  exercises: ExerciseVM[];
  decisionTrace: string[];
}

// ---------------------------------------------------------------------------
// Exercise-level
// ---------------------------------------------------------------------------

export interface ExerciseVM {
  id: string;
  name: string;
  muscleGroup: string;
  role: ExerciseRole | null;
  sectionId: string | null;
  sectionTemplate: WorkoutSectionTemplate | null;
  sectionTitle: string | null;
  /** Loading approach — drives renderer selection */
  loadingStrategy: LoadingStrategy | null;
  /** Human-readable set scheme (e.g. "4 x 6 @ RPE 7") */
  setScheme: string | null;
  targetSets: number;
  targetReps: number;
  targetRPE: number;
  suggestedWeight: number | null;
  restSeconds: number | null;
  warmupSetCount: number;
  coachingCues: string[];
  loadingNotes: string | null;
  formCues: string | null;
  /** Per-set prescription for detailed loading views */
  setPrescription: SetPrescriptionVM[];
  /** Substitution options */
  substitutions: ExerciseSubstitutionVM[];
  /** Timed-work format if this exercise uses one */
  timedWork: TimedWorkVM | null;
  /** Circuit structure if this exercise is part of a circuit */
  circuitRound: CircuitRoundVM | null;
  /** Overload suggestion (live only, null in replay) */
  overloadSuggestion: OverloadSuggestionVM | null;
}

export interface SetPrescriptionVM {
  label: string;
  sets: number;
  reps: number | string;
  targetRPE: number;
  restSeconds: number;
  intensityNote: string | null;
  timedWork: TimedWorkVM | null;
  circuitRound: CircuitRoundVM | null;
}

export interface ExerciseSubstitutionVM {
  exerciseId: string;
  exerciseName: string;
  rationale: string;
}

export interface OverloadSuggestionVM {
  suggestedWeight: number;
  reasoning: string;
  isDeload: boolean;
}

// ---------------------------------------------------------------------------
// Timed-work & circuit structures
// ---------------------------------------------------------------------------

export interface TimedWorkVM {
  format: 'emom' | 'amrap' | 'tabata' | 'timed_set' | 'for_time';
  totalDurationSec: number;
  workIntervalSec: number | null;
  restIntervalSec: number | null;
  roundCount: number | null;
  targetRounds: number | null;
}

export interface CircuitRoundVM {
  roundCount: number;
  restBetweenRoundsSec: number;
  movements: CircuitMovementVM[];
}

export interface CircuitMovementVM {
  exerciseId: string | null;
  exerciseName: string;
  reps: number | null;
  durationSec: number | null;
  restSec: number;
}

// ---------------------------------------------------------------------------
// Conditioning
// ---------------------------------------------------------------------------

export interface ConditioningVM {
  type: string;
  format: string | null;
  rounds: number;
  workIntervalSec: number;
  restIntervalSec: number;
  totalDurationMin: number;
  intensityLabel: 'light' | 'moderate' | 'hard';
  message: string;
  estimatedLoad: number;
  timedWork: TimedWorkVM | null;
  circuitRound: CircuitRoundVM | null;
  drills: ConditioningDrillVM[];
}

export interface ConditioningDrillVM {
  name: string;
  rounds: number;
  durationSec: number | null;
  reps: number | null;
  restSec: number;
  format: string | null;
  timedWork: TimedWorkVM | null;
}

// ---------------------------------------------------------------------------
// Exercise progress (live logging state + replay simulated log)
// ---------------------------------------------------------------------------

export interface SetLogVM {
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  isWarmup: boolean;
  wasAdapted: boolean;
  adaptationReason: string | null;
}

export interface ExerciseProgressVM {
  exerciseId: string;
  setsCompleted: number;
  totalTargetSets: number;
  setsLogged: SetLogVM[];
  warmupsCompleted: number;
  isComplete: boolean;
  prResult: PRResultVM | null;
}

export interface PRResultVM {
  type: string;
  value: number;
  previous: number | null;
}

// ---------------------------------------------------------------------------
// Conditioning log (logged/simulated)
// ---------------------------------------------------------------------------

export interface ConditioningLogVM {
  completedRounds: number;
  prescribedRounds: number;
  completedDurationMin: number;
  targetDurationMin: number;
  actualRpe: number | null;
  completionRate: number;
  note: string;
  drillLogs: ConditioningDrillLogVM[];
}

export interface ConditioningDrillLogVM {
  name: string;
  targetRounds: number;
  completedRounds: number;
  durationSec: number | null;
  reps: number | null;
  restSec: number;
  completed: boolean;
  note: string;
}

// ---------------------------------------------------------------------------
// Workout stats summary
// ---------------------------------------------------------------------------

export interface WorkoutStatsVM {
  prescribedExerciseCount: number;
  completedExerciseCount: number;
  plannedSetCount: number;
  completedSetCount: number;
  averagePrescribedRpe: number;
  averageLoggedRpe: number;
  completionRate: number;
  conditioningCompletionRate: number | null;
  didWarmup: boolean;
}

// ---------------------------------------------------------------------------
// Renderer mode
// ---------------------------------------------------------------------------

export type WorkoutRenderMode = 'interactive' | 'readonly';
