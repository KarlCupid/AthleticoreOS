import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ExerciseLibraryRow,
  FitnessLevel,
  FoodItemRow,
  MealType,
  AthleteGoalMode,
  Phase,
  ReadinessState,
  WorkoutFocus,
  WorkoutType,
} from '../../lib/engine/types';


export type WeeklyPlanSetupParams =
  | {
    initialGoalMode?: AthleteGoalMode;
    initialPhaseKey?: 'objective' | 'availability' | 'commitments' | 'planner';
    source?: 'dashboard' | 'plan';
  }
  | undefined;

export type TodayStackParamList = {
  TodayHome: undefined;
  Log: undefined;
  DayDetail: { date: string };
  ActivityLog: { activityId: string; date: string };
};

export type TrainStackParamList = {
  WorkoutHome: undefined;
  WeeklyPlanSetup: WeeklyPlanSetupParams;
  PlanHome: undefined;
  ExerciseSearch: { workoutLogId?: string };
  ExerciseDetail: { exercise: ExerciseLibraryRow; workoutLogId?: string };
  CustomExercise: undefined;
  ActiveWorkout: {
    workoutLogId: string;
    focus: WorkoutFocus | null;
    workoutType: WorkoutType;
    selectedExerciseId?: string;
    selectionToken?: string;
  };
  GuidedWorkout: {
    weeklyPlanEntryId?: string;
    scheduledActivityId?: string;
    focus?: WorkoutFocus | string;
    availableMinutes?: number;
    readinessState: ReadinessState;
    phase: Phase;
    fitnessLevel: FitnessLevel;
    trainingDate?: string;
    isDeloadWeek?: boolean;
    autoStart?: boolean;
    entrySource?: 'dashboard' | 'train' | 'day-detail' | 'plan';
  };
  WorkoutSummary: {
    workoutLogId?: string;
    durationMin: number;
    totalSets: number;
    totalVolume: number;
    avgRPE: number | null;
    exercisesCompleted?: number;
    hadPR?: boolean;
    prExerciseName?: string;
  };
  GymProfiles: undefined;
  WorkoutDetail: {
    weeklyPlanEntryId: string;
    date: string;
    readinessState: ReadinessState;
    phase: Phase;
    fitnessLevel: FitnessLevel;
    isDeloadWeek?: boolean;
  };
};

export type PlanStackParamList = {
  PlanHome: undefined;
  WeeklyPlanSetup:
    WeeklyPlanSetupParams;
  CalendarMain: undefined;
  DayDetail: { date: string };
  ActivityLog: { activityId: string; date: string };
  WeeklyReview: undefined;
  WorkoutDetail: {
    weeklyPlanEntryId: string;
    date: string;
    readinessState: ReadinessState;
    phase: Phase;
    fitnessLevel: FitnessLevel;
    isDeloadWeek?: boolean;
  };
};

export type FuelStackParamList = {
  NutritionHome: undefined;
  FoodSearch: { mealType?: MealType; date?: string };
  FoodDetail: { foodItem: FoodItemRow; mealType?: MealType; date?: string };
  CustomFood: undefined;
  BarcodeScan: { mealType?: MealType; date?: string };
  WeightCutHome: undefined;
  CutPlanSetup: undefined;
  FightWeekProtocol: undefined;
  RehydrationProtocol: {
    weighInWeightLbs: number;
    hoursToFight: number;
    targetWeightLbs?: number;
  };
  CutHistory: undefined;
};

export type MeStackParamList = {
  MeHome: undefined;
};

export type RootTabParamList = {
  Today: undefined;
  Train: undefined;
  Plan: undefined;
  Fuel: undefined;
  Me: undefined;
};

export type AppRouteParamList = TodayStackParamList &
  TrainStackParamList &
  PlanStackParamList &
  FuelStackParamList &
  MeStackParamList;

export type PlanStackScreenProps<T extends keyof PlanStackParamList> = NativeStackScreenProps<
  PlanStackParamList,
  T
>;
