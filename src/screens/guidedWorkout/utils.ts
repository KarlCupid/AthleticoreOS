import type { RouteProp } from '@react-navigation/native';

export type GuidedWorkoutParams = {
  weeklyPlanEntryId?: string | undefined;
  scheduledActivityId?: string | undefined;
  focus?: string | undefined;
  availableMinutes?: number | undefined;
  readinessState: 'Prime' | 'Caution' | 'Depleted';
  phase: string;
  fitnessLevel: string;
  trainingDate?: string | undefined;
  isDeloadWeek?: boolean | undefined;
  autoStart?: boolean | undefined;
  entrySource?: 'dashboard' | 'train' | 'day-detail' | 'plan' | undefined;
};

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
  return {
    readinessState: params?.readinessState ?? 'Prime',
    phase: params?.phase ?? 'off-season',
    fitnessLevel: params?.fitnessLevel ?? 'intermediate',
    focus: params?.focus,
    availableMinutes: params?.availableMinutes,
    trainingDate: params?.trainingDate,
    isDeloadWeek: params?.isDeloadWeek,
    autoStart: params?.autoStart ?? false,
    entrySource: params?.entrySource,
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
