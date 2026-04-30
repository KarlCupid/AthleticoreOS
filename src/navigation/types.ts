import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ExerciseLibraryRow,
  FitnessLevel,
  FoodSearchResult,
  MealType,
  AthleteGoalMode,
  Phase,
  ReadinessState,
  WorkoutFocus,
} from '../../lib/engine/types';


export type WeeklyPlanSetupParams =
  | {
    initialGoalMode?: AthleteGoalMode;
    initialPhaseKey?: 'objective' | 'availability' | 'commitments';
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
  ExerciseSearch: undefined;
  ExerciseDetail: { exercise: ExerciseLibraryRow };
  CustomExercise: undefined;
  GuidedWorkout: {
    weeklyPlanEntryId?: string | undefined;
    scheduledActivityId?: string | undefined;
    focus?: WorkoutFocus | string | undefined;
    availableMinutes?: number | undefined;
    readinessState: ReadinessState;
    phase: Phase;
    fitnessLevel: FitnessLevel;
    trainingDate?: string | undefined;
    isDeloadWeek?: boolean | undefined;
    autoStart?: boolean | undefined;
    entrySource?: 'dashboard' | 'train' | 'day-detail' | 'plan' | undefined;
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
  FoodSearch: { mealType: MealType; date?: string };
  FoodDetail: {
    foodItem: FoodSearchResult;
    mealType: MealType;
    date?: string;
    foodLogId?: string;
    initialAmountValue?: number;
    initialAmountUnit?: string;
    initialGrams?: number | null;
  };
  CustomFood: { mealType?: MealType; date?: string } | undefined;
  BarcodeScan: { mealType: MealType; date?: string };
  WeightClassHome: undefined;
  WeightClassPlanSetup: undefined;
  CompetitionBodyMass: undefined;
  PostWeighInRecovery: {
    weighInWeightLbs: number;
    hoursToFight: number;
    targetWeightLbs?: number;
  };
  WeightClassHistory: undefined;
};

export type MeStackParamList = {
  MeHome: undefined;
  LegalSupport: undefined;
  DeleteAccount: undefined;
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
