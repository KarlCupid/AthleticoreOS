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

export type PlanStackParamList = {
  PlanHome: undefined;
  WeeklyPlanSetup:
    | {
      initialGoalMode?: AthleteGoalMode;
      initialPhaseKey?: 'objective' | 'availability' | 'commitments' | 'planner';
      source?: 'dashboard' | 'plan';
    }
    | undefined;
  WorkoutHome: undefined;
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
  CalendarMain: undefined;
  DayDetail: { date: string };
  ActivityLog: { activityId: string; date: string };
  WeeklyTemplate: undefined;
  WeeklyReview: undefined;
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

export type PlanStackScreenProps<T extends keyof PlanStackParamList> = NativeStackScreenProps<
  PlanStackParamList,
  T
>;
