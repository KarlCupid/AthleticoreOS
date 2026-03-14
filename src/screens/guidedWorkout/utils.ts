import type { RouteProp } from '@react-navigation/native';

export type GuidedWorkoutParams = {
  weeklyPlanEntryId?: string;
  scheduledActivityId?: string;
  focus?: string;
  availableMinutes?: number;
  readinessState: 'Prime' | 'Caution' | 'Depleted';
  phase: string;
  fitnessLevel: string;
  trainingDate?: string;
  isDeloadWeek?: boolean;
};

export type GuidedWorkoutStackParamList = {
  GuidedWorkout: GuidedWorkoutParams;
  WorkoutSummary: {
    workoutLogId?: string;
    durationMin?: number;
    totalSets?: number;
    totalVolume?: number;
    avgRPE?: number | null;
  };
};

export type GuidedWorkoutRoute = RouteProp<GuidedWorkoutStackParamList, 'GuidedWorkout'>;

export function resolveGuidedWorkoutParams(params: Partial<GuidedWorkoutParams> | undefined) {
  return {
    readinessState: params?.readinessState ?? 'Prime',
    phase: params?.phase ?? 'off-season',
    fitnessLevel: params?.fitnessLevel ?? 'intermediate',
    focus: params?.focus,
    availableMinutes: params?.availableMinutes,
    trainingDate: params?.trainingDate,
    isDeloadWeek: params?.isDeloadWeek,
  };
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
