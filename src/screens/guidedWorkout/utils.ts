import type { RouteProp } from '@react-navigation/native';
import type { TrainStackParamList } from '../../navigation/types';
import { resolveGuidedWorkoutParams as resolveNavigationGuidedWorkoutParams } from '../../navigation/routeValidation';

export type GuidedWorkoutParams = TrainStackParamList['GuidedWorkout'];

export type GuidedWorkoutStackParamList = {
  GuidedWorkout: GuidedWorkoutParams;
  WorkoutSummary: {
    workoutLogId?: string | undefined;
    durationMin?: number | undefined;
    totalSets?: number | undefined;
    totalVolume?: number | undefined;
    avgRPE?: number | null | undefined;
  };
};

export type GuidedWorkoutRoute = RouteProp<GuidedWorkoutStackParamList, 'GuidedWorkout'>;

export function resolveGuidedWorkoutParams(params: Partial<GuidedWorkoutParams> | undefined) {
  return resolveNavigationGuidedWorkoutParams(params);
}

export function buildWarmupSetsWithState<T extends { setNumber: number }>(
  warmupSets: T[],
  warmupChecked: number[],
) {
  return warmupSets.map((warmupSet) => ({
    ...warmupSet,
    isCompleted: warmupChecked.includes(warmupSet.setNumber),
  }));
}
