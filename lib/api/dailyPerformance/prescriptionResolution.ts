import {
  generateWorkoutV2,
  type ACWRResult,
  type FitnessLevel,
  type MacrocycleContext,
  type MEDStatus,
  type Phase,
  type ReadinessProfile,
  type ReadinessState,
  type StimulusConstraintSet,
  type TrainingAge,
  type WeeklyPlanEntryRow,
} from '../../engine/index.ts';
import type { WorkoutPrescriptionV2 } from '../../engine/types';
import { adaptPrescriptionToDailyReadiness } from '../../engine/readiness/dailyCheck.ts';
import type { getDefaultGymProfile } from '../gymProfileService';
import type {
  getExerciseHistoryBatch,
  getExerciseLibrary,
  getRecentExerciseIds,
  getRecentMuscleVolume,
} from '../scService';

export interface PrescriptionResolutionDependencies {
  adaptPrescriptionToDailyReadiness: typeof adaptPrescriptionToDailyReadiness;
  generateWorkoutV2: typeof generateWorkoutV2;
  getDefaultGymProfile: typeof getDefaultGymProfile;
  getExerciseLibrary: typeof getExerciseLibrary;
  getRecentExerciseIds: typeof getRecentExerciseIds;
  getRecentMuscleVolume: typeof getRecentMuscleVolume;
  getExerciseHistoryBatch: typeof getExerciseHistoryBatch;
}

export const defaultPrescriptionResolutionDependencies: PrescriptionResolutionDependencies = {
  adaptPrescriptionToDailyReadiness,
  generateWorkoutV2,
  getDefaultGymProfile: async (userId) => {
    const module = await import('../gymProfileService');
    return module.getDefaultGymProfile(userId);
  },
  getExerciseLibrary: async () => {
    const module = await import('../scService');
    return module.getExerciseLibrary();
  },
  getRecentExerciseIds: async (userId: string) => {
    const module = await import('../scService');
    return module.getRecentExerciseIds(userId);
  },
  getRecentMuscleVolume: async (userId, days) => {
    const module = await import('../scService');
    return module.getRecentMuscleVolume(userId, days);
  },
  getExerciseHistoryBatch: async (userId, exerciseIds, sessionsPerExercise) => {
    const module = await import('../scService');
    return module.getExerciseHistoryBatch(userId, exerciseIds, sessionsPerExercise);
  },
};

export async function resolveWorkoutPrescriptionWithDependencies(
  input: {
    userId: string;
    date: string;
    phase: Phase;
    readinessState: ReadinessState;
    readinessProfile: ReadinessProfile;
    constraintSet: StimulusConstraintSet;
    acwr: ACWRResult;
    fitnessLevel: FitnessLevel;
    trainingAge: TrainingAge;
    performanceGoalType: MacrocycleContext['performanceGoalType'];
    weeklyPlanEntry: WeeklyPlanEntryRow | null;
    objectiveContext: MacrocycleContext;
    medStatus: MEDStatus | null;
  },
  dependencies: PrescriptionResolutionDependencies = defaultPrescriptionResolutionDependencies,
): Promise<WorkoutPrescriptionV2 | null> {
  if (!input.weeklyPlanEntry) {
    return null;
  }

  const storedPrescription = input.weeklyPlanEntry.prescription_snapshot ?? null;

  if (storedPrescription) {
    return dependencies.adaptPrescriptionToDailyReadiness({
      prescription: storedPrescription,
      readinessProfile: input.readinessProfile,
      constraintSet: input.constraintSet,
    });
  }

  const [gym, library, recentIds, recentMuscleVolume] = await Promise.all([
    dependencies.getDefaultGymProfile(input.userId),
    dependencies.getExerciseLibrary(),
    dependencies.getRecentExerciseIds(input.userId),
    dependencies.getRecentMuscleVolume(input.userId),
  ]);

  const exerciseHistory = await dependencies.getExerciseHistoryBatch(
    input.userId,
    library.map((exercise) => exercise.id),
  );

  const generatedPrescription = dependencies.generateWorkoutV2({
    readinessState: input.readinessState,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
    phase: input.phase,
    acwr: input.acwr.ratio,
    exerciseLibrary: library,
    recentExerciseIds: recentIds,
    recentMuscleVolume,
    trainingDate: input.date,
    focus: input.weeklyPlanEntry?.focus ?? undefined,
    trainingIntensityCap: undefined,
    fitnessLevel: input.fitnessLevel,
    trainingAge: input.trainingAge,
    performanceGoalType: input.performanceGoalType,
    availableMinutes: input.weeklyPlanEntry?.estimated_duration_min,
    gymEquipment: gym?.equipment ?? [],
    exerciseHistory,
    isDeloadWeek: input.weeklyPlanEntry?.is_deload ?? false,
    weeklyPlanFocus: input.weeklyPlanEntry?.focus ?? undefined,
    medStatus: input.medStatus,
  });

  return dependencies.adaptPrescriptionToDailyReadiness({
    prescription: generatedPrescription,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
  });
}
