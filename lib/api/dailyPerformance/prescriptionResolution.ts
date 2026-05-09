import type {
  ACWRResult,
  FitnessLevel,
  MacrocycleContext,
  MEDStatus,
  Phase,
  ReadinessProfile,
  ReadinessState,
  StimulusConstraintSet,
  TrainingAge,
  WeeklyPlanEntryRow,
} from '../../engine/index.ts';
import type { WorkoutPrescriptionV2 } from '../../engine/types';
import { getBoxingSnapshotFromWeeklyPlanEntry } from '../../performance-engine/workout-programming';
import { adaptPrescriptionToDailyReadiness } from '../../engine/readiness/dailyCheck.ts';

export interface PrescriptionResolutionDependencies {
  adaptPrescriptionToDailyReadiness: typeof adaptPrescriptionToDailyReadiness;
}

export const defaultPrescriptionResolutionDependencies: PrescriptionResolutionDependencies = {
  adaptPrescriptionToDailyReadiness,
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

  if (getBoxingSnapshotFromWeeklyPlanEntry(input.weeklyPlanEntry)) {
    return null;
  }

  if (storedPrescription) {
    return dependencies.adaptPrescriptionToDailyReadiness({
      prescription: storedPrescription,
      readinessProfile: input.readinessProfile,
      constraintSet: input.constraintSet,
    });
  }

  return null;
}
