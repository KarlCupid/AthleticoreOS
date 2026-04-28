/**
 * Pure adapter functions that normalize engine types into the shared
 * workout view-model consumed by all `src/components/workout/` components.
 *
 * Two entry points:
 *   fromPrescriptionV2()  — live guided workout (GuidedWorkoutScreen)
 *   fromReplayDay()       — replay lab (WorkoutTab)
 */

import type {
  WorkoutPrescriptionV2,
  PrescribedExerciseV2,
  WorkoutSessionSection,
  SectionExercisePrescription,
  ExerciseSetPrescription,
} from '../../../lib/engine/types/training';
import type { DailyAthleteSummary } from '../../../lib/engine/types';
import type {
  EngineReplayDay,
  EngineReplayPrescribedExercise,
  EngineReplayWorkoutSection,
  EngineReplaySetPrescription,
  EngineReplayConditioningPrescription,
  EngineReplayConditioningLog,
  EngineReplayConditioningDrill,
  EngineReplayExerciseLog,
} from '../../../lib/engine/simulation/lab';
import type { WorkoutStats } from '../replay-lab/useReplayState';
import type { EffortEntry, ExerciseProgress, SetEntry } from '../../hooks/useGuidedWorkout';

import type {
  WorkoutSessionVM,
  WorkoutSectionVM,
  ExerciseVM,
  SetPrescriptionVM,
  TimedWorkVM,
  CircuitRoundVM,
  ConditioningVM,
  ExerciseProgressVM,
  SetLogVM,
  ConditioningLogVM,
  ConditioningDrillLogVM,
  WorkoutStatsVM,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════
// LIVE ADAPTER  — GuidedWorkoutScreen
// ═══════════════════════════════════════════════════════════════════════════

export function fromPrescriptionV2(
  rx: WorkoutPrescriptionV2,
  _mission: DailyAthleteSummary | null,
): WorkoutSessionVM {
  const sections: WorkoutSectionVM[] = (rx.sections ?? []).map(mapLiveSection);
  const flatExercises: ExerciseVM[] = rx.exercises.map(mapLiveExercise);

  return {
    workoutType: rx.workoutType,
    focus: rx.focus,
    sessionGoal: rx.sessionGoal ?? null,
    sessionIntent: rx.sessionIntent,
    primaryAdaptation: rx.primaryAdaptation,
    sessionFamily: rx.sessionPrescription?.sessionFamily ?? rx.sessionFamily ?? null,
    sessionPrescription: rx.sessionPrescription ?? null,
    modality: rx.modality ?? rx.sessionPrescription?.modality ?? null,
    energySystem: rx.energySystem ?? rx.sessionPrescription?.energySystem ?? null,
    trackingSchema: rx.sessionPrescription?.trackingSchema ?? null,
    doseSummary: rx.doseSummary ?? rx.sessionPrescription?.dose ?? null,
    safetyFlags: rx.safetyFlags ?? rx.sessionPrescription?.safetyFlags ?? [],
    wizardKind: rx.wizardKind ?? rx.sessionPrescription?.wizardKind ?? null,
    estimatedDurationMin: rx.estimatedDurationMin,
    sections,
    isDeload: rx.isDeloadWorkout,
    campPhase: rx.campPhaseContext ?? null,
    conditioning: null, // live conditioning handled separately if needed
    activationGuidance: rx.activationGuidance ?? null,
    expectedActivationRPE: rx.expectedActivationRPE ?? null,
    interferenceWarnings: rx.interferenceWarnings ?? [],
    decisionTrace: rx.decisionTrace ?? [],
    hasSections: sections.length > 0,
    sessionRole: rx.sessionFamily ?? 'strength',
    flatExercises,
    blueprintName: rx.equipmentProfile ?? '',
  };
}

function mapLiveSection(section: WorkoutSessionSection): WorkoutSectionVM {
  return {
    id: section.id,
    template: section.template,
    title: section.title,
    intent: section.intent,
    timeCap: section.timeCap,
    restRule: section.restRule,
    densityRule: section.densityRule,
    finisherReason: section.finisherReason ?? null,
    exercises: section.exercises.map(mapSectionExercise),
    decisionTrace: section.decisionTrace,
  };
}

function mapSectionExercise(ex: SectionExercisePrescription): ExerciseVM {
  return {
    id: ex.exercise.id,
    name: ex.exercise.name,
    muscleGroup: ex.exercise.muscle_group,
    role: ex.role,
    sectionId: ex.sectionId,
    sectionTemplate: ex.sectionTemplate,
    sectionTitle: ex.sectionIntent ?? null,
    loadingStrategy: ex.loadingStrategy,
    wizardKind: ex.wizardKind ?? null,
    modality: ex.modality ?? null,
    energySystem: ex.energySystem ?? null,
    modalityDose: ex.modalityDose ?? null,
    trackingSchemaId: ex.trackingSchemaId ?? null,
    setScheme: ex.setScheme ?? null,
    targetSets: ex.targetSets,
    targetReps: ex.targetReps,
    targetRPE: ex.targetRPE,
    suggestedWeight: ex.suggestedWeight ?? null,
    restSeconds: ex.restSeconds ?? null,
    warmupSetCount: ex.warmupSets?.length ?? 0,
    coachingCues: ex.coachingCues ?? [],
    loadingNotes: ex.loadingNotes ?? null,
    formCues: ex.formCues ?? null,
    setPrescription: (ex.setPrescription ?? []).map(mapLiveSetPrescription),
    substitutions: (ex.substitutions ?? []).map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      rationale: s.rationale,
    })),
    timedWork: null, // set-level timed work lives in setPrescription
    circuitRound: null,
    overloadSuggestion: ex.overloadSuggestion
      ? {
          suggestedWeight: ex.overloadSuggestion.suggestedWeight,
          reasoning: ex.overloadSuggestion.progressionModel,
          isDeload: false,
        }
      : null,
  };
}

function mapLiveExercise(ex: PrescribedExerciseV2): ExerciseVM {
  return {
    id: ex.exercise.id,
    name: ex.exercise.name,
    muscleGroup: ex.exercise.muscle_group,
    role: ex.role ?? null,
    sectionId: ex.sectionId ?? null,
    sectionTemplate: ex.sectionTemplate ?? null,
    sectionTitle: ex.sectionIntent ?? null,
    loadingStrategy: ex.loadingStrategy ?? null,
    wizardKind: ex.wizardKind ?? null,
    modality: ex.modality ?? null,
    energySystem: ex.energySystem ?? null,
    modalityDose: ex.modalityDose ?? null,
    trackingSchemaId: ex.trackingSchemaId ?? null,
    setScheme: ex.setScheme ?? null,
    targetSets: ex.targetSets,
    targetReps: ex.targetReps,
    targetRPE: ex.targetRPE,
    suggestedWeight: ex.suggestedWeight ?? null,
    restSeconds: ex.restSeconds ?? null,
    warmupSetCount: ex.warmupSets?.length ?? 0,
    coachingCues: ex.coachingCues ?? [],
    loadingNotes: ex.loadingNotes ?? null,
    formCues: ex.formCues ?? null,
    setPrescription: (ex.setPrescription ?? []).map(mapLiveSetPrescription),
    substitutions: (ex.substitutions ?? []).map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      rationale: s.rationale,
    })),
    timedWork: null,
    circuitRound: null,
    overloadSuggestion: ex.overloadSuggestion
      ? {
          suggestedWeight: ex.overloadSuggestion.suggestedWeight,
          reasoning: ex.overloadSuggestion.progressionModel,
          isDeload: false,
        }
      : null,
  };
}

function mapLiveSetPrescription(sp: ExerciseSetPrescription): SetPrescriptionVM {
  return {
    label: sp.label,
    sets: sp.sets,
    reps: sp.reps,
    targetRPE: sp.targetRPE,
    restSeconds: sp.restSeconds,
    intensityNote: sp.intensityNote ?? null,
    timedWork: sp.timedWork ? mapTimedWork(sp.timedWork) : null,
    circuitRound: sp.circuitRound ? mapCircuitRound(sp.circuitRound) : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// REPLAY ADAPTER  — Replay Lab WorkoutTab
// ═══════════════════════════════════════════════════════════════════════════

export function fromReplayDay(
  day: EngineReplayDay,
  _stats: WorkoutStats,
): WorkoutSessionVM {
  const session = day.workoutSession;
  const sections: WorkoutSectionVM[] = (session?.sections ?? []).map(mapReplaySection);
  const flatExercises: ExerciseVM[] = day.prescribedExercises.map(mapReplayExercise);

  return {
    workoutType: (day.workoutType ?? 'strength') as WorkoutSessionVM['workoutType'],
    focus: 'full_body', // replay doesn't expose focus directly
    sessionGoal: session?.sessionGoal ?? null,
    sessionIntent: session?.sessionIntent ?? null,
    primaryAdaptation: session?.primaryAdaptation ?? 'mixed',
    sessionFamily: day.sessionRole,
    sessionPrescription: null,
    modality: null,
    energySystem: null,
    trackingSchema: null,
    doseSummary: null,
    safetyFlags: [],
    wizardKind: null,
    estimatedDurationMin: session?.estimatedDurationMin ?? day.durationMin,
    sections,
    isDeload: false,
    campPhase: null,
    conditioning: day.conditioningPrescription
      ? mapReplayConditioning(day.conditioningPrescription)
      : null,
    activationGuidance: day.activationGuidance,
    expectedActivationRPE: session?.expectedActivationRPE ?? null,
    interferenceWarnings: session?.interferenceWarnings ?? [],
    decisionTrace: session?.decisionTrace ?? [],
    hasSections: sections.length > 0,
    sessionRole: day.sessionRole,
    flatExercises,
    blueprintName: day.workoutBlueprint,
  };
}

function mapReplaySection(section: EngineReplayWorkoutSection): WorkoutSectionVM {
  return {
    id: section.id,
    template: section.template as WorkoutSectionVM['template'],
    title: section.title,
    intent: section.intent,
    timeCap: section.timeCap,
    restRule: section.restRule,
    densityRule: section.densityRule,
    finisherReason: section.finisherReason ?? null,
    exercises: section.exercises.map(mapReplayExercise),
    decisionTrace: section.decisionTrace,
  };
}

function mapReplayExercise(ex: EngineReplayPrescribedExercise): ExerciseVM {
  return {
    id: ex.exerciseId,
    name: ex.exerciseName,
    muscleGroup: '',
    role: null,
    sectionId: ex.sectionId,
    sectionTemplate: ex.sectionTemplate as ExerciseVM['sectionTemplate'],
    sectionTitle: ex.sectionTitle,
    loadingStrategy: null, // replay doesn't expose this directly
    wizardKind: null,
    modality: null,
    energySystem: null,
    modalityDose: null,
    trackingSchemaId: null,
    setScheme: ex.setScheme,
    targetSets: ex.targetSets,
    targetReps: ex.targetReps,
    targetRPE: ex.targetRpe,
    suggestedWeight: ex.suggestedWeight,
    restSeconds: ex.restSeconds,
    warmupSetCount: ex.warmupSetCount,
    coachingCues: ex.coachingCues,
    loadingNotes: ex.loadingNotes,
    formCues: null,
    setPrescription: ex.setPrescription.map(mapReplaySetPrescription),
    substitutions: ex.substitutions.map(s => ({
      exerciseId: s.exerciseId,
      exerciseName: s.exerciseName,
      rationale: s.rationale,
    })),
    timedWork: null,
    circuitRound: null,
    overloadSuggestion: null,
  };
}

function mapReplaySetPrescription(sp: EngineReplaySetPrescription): SetPrescriptionVM {
  return {
    label: sp.label,
    sets: sp.sets,
    reps: sp.reps,
    targetRPE: sp.targetRPE,
    restSeconds: sp.restSeconds,
    intensityNote: sp.intensityNote ?? null,
    timedWork: sp.timedWork ? mapTimedWork(sp.timedWork) : null,
    circuitRound: sp.circuitRound ? mapCircuitRound(sp.circuitRound) : null,
  };
}

function mapReplayConditioning(
  rx: EngineReplayConditioningPrescription,
): ConditioningVM {
  return {
    type: rx.type,
    format: rx.format ?? null,
    rounds: rx.rounds,
    workIntervalSec: rx.workIntervalSec,
    restIntervalSec: rx.restIntervalSec,
    totalDurationMin: rx.totalDurationMin,
    intensityLabel: rx.intensityLabel,
    message: rx.message,
    estimatedLoad: rx.estimatedLoad,
    timedWork: rx.timedWork ? mapTimedWork(rx.timedWork) : null,
    circuitRound: rx.circuitRound ? mapCircuitRound(rx.circuitRound) : null,
    drills: rx.drills.map(d => ({
      name: d.name,
      rounds: d.rounds,
      durationSec: d.durationSec ?? null,
      reps: d.reps ?? null,
      restSec: d.restSec,
      format: d.format ?? null,
      timedWork: d.timedWork ? mapTimedWork(d.timedWork) : null,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════

/** Convert live hook ExerciseProgress → ExerciseProgressVM */
export function fromExerciseProgress(
  progress: ExerciseProgress,
  targetSets: number,
): ExerciseProgressVM {
  return {
    exerciseId: progress.exerciseId,
    setsCompleted: progress.setsLogged.filter(s => !s.isWarmup).length + progress.effortsLogged.length,
    totalTargetSets: targetSets,
    setsLogged: progress.setsLogged.map(mapSetEntry),
    effortsCompleted: progress.effortsLogged.length,
    effortsLogged: progress.effortsLogged.map(mapEffortEntry),
    warmupsCompleted: progress.warmupChecked.length,
    isComplete: progress.isComplete,
    prResult: progress.prResult
      ? {
          type: progress.prResult.prType ?? 'weight',
          value: progress.prResult.newValue ?? 0,
          previous: progress.prResult.previousBest ?? null,
        }
      : null,
  };
}

function mapEffortEntry(entry: EffortEntry) {
  return {
    effortKind: entry.effortKind,
    effortIndex: entry.effortIndex,
    targetSnapshot: entry.targetSnapshot,
    actualSnapshot: entry.actualSnapshot,
    actualRPE: entry.actualRPE,
    qualityRating: entry.qualityRating,
    painFlag: entry.painFlag,
    notes: entry.notes,
  };
}

function mapSetEntry(entry: SetEntry): SetLogVM {
  return {
    setNumber: entry.setNumber,
    reps: entry.reps,
    weight: entry.weight,
    rpe: entry.rpe,
    isWarmup: entry.isWarmup,
    wasAdapted: entry.wasAdapted,
    adaptationReason: entry.adaptationReason,
  };
}

/** Convert replay exercise logs → ExerciseProgressVM[] */
export function fromReplayExerciseLogs(
  logs: EngineReplayExerciseLog[],
): ExerciseProgressVM[] {
  return logs.map(log => ({
    exerciseId: log.exerciseId,
    setsCompleted: log.completedSets,
    totalTargetSets: log.targetSets,
    setsLogged: Array.from({ length: log.completedSets }, (_, i) => ({
      setNumber: i + 1,
      reps: log.actualReps,
      weight: log.actualWeight ?? 0,
      rpe: log.actualRpe,
      isWarmup: false,
      wasAdapted: false,
      adaptationReason: null,
    })),
    effortsCompleted: 0,
    effortsLogged: [],
    warmupsCompleted: 0,
    isComplete: log.completed,
    prResult: null,
  }));
}

/** Convert replay conditioning log → ConditioningLogVM */
export function fromReplayConditioningLog(
  log: EngineReplayConditioningLog,
): ConditioningLogVM {
  return {
    completedRounds: log.completedRounds,
    prescribedRounds: log.prescribedRounds,
    completedDurationMin: log.completedDurationMin,
    targetDurationMin: log.targetDurationMin,
    actualRpe: log.actualRpe,
    completionRate: log.completionRate,
    note: log.note,
    drillLogs: log.drillLogs.map(mapReplayDrillLog),
  };
}

function mapReplayDrillLog(drill: EngineReplayConditioningDrill): ConditioningDrillLogVM {
  return {
    name: drill.name,
    targetRounds: drill.targetRounds,
    completedRounds: drill.completedRounds,
    durationSec: drill.durationSec,
    reps: drill.reps,
    restSec: drill.restSec,
    completed: drill.completed,
    note: drill.note,
  };
}

/** Convert replay WorkoutStats → WorkoutStatsVM */
export function fromReplayStats(
  stats: WorkoutStats,
  didWarmup: boolean,
): WorkoutStatsVM {
  return {
    prescribedExerciseCount: stats.prescribedExerciseCount,
    completedExerciseCount: stats.completedExerciseCount,
    plannedSetCount: stats.plannedSetCount,
    completedSetCount: stats.completedSetCount,
    averagePrescribedRpe: stats.averagePrescribedRpe,
    averageLoggedRpe: stats.averageLoggedRpe,
    completionRate: stats.completionRate,
    conditioningCompletionRate: stats.conditioningCompletionRate ?? null,
    didWarmup,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function mapTimedWork(tw: {
  format: string;
  totalDurationSec: number;
  workIntervalSec?: number;
  restIntervalSec?: number;
  roundCount?: number;
  targetRounds?: number;
}): TimedWorkVM {
  return {
    format: tw.format as TimedWorkVM['format'],
    totalDurationSec: tw.totalDurationSec,
    workIntervalSec: tw.workIntervalSec ?? null,
    restIntervalSec: tw.restIntervalSec ?? null,
    roundCount: tw.roundCount ?? null,
    targetRounds: tw.targetRounds ?? null,
  };
}

function mapCircuitRound(cr: {
  roundCount: number;
  restBetweenRoundsSec: number;
  movements: Array<{
    exerciseId?: string;
    exerciseName: string;
    reps: number | null;
    durationSec: number | null;
    restSec: number;
  }>;
}): CircuitRoundVM {
  return {
    roundCount: cr.roundCount,
    restBetweenRoundsSec: cr.restBetweenRoundsSec,
    movements: cr.movements.map(m => ({
      exerciseId: m.exerciseId ?? null,
      exerciseName: m.exerciseName,
      reps: m.reps,
      durationSec: m.durationSec,
      restSec: m.restSec,
    })),
  };
}
