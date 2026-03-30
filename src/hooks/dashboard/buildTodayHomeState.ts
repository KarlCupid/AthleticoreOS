import type {
  ACWRResult,
  DailyCutProtocolRow,
  HydrationResult,
  MacroLedgerRow,
  ResolvedNutritionTargets,
  ScheduledActivityRow,
  WeightCutPlanRow,
  WeeklyPlanEntryRow,
  WorkoutPrescription,
} from '../../../lib/engine/types';
import { isGuidedEngineActivityType } from '../../../lib/engine/sessionOwnership';
import { calculateCaloriesFromMacros } from '../../../lib/utils/nutrition';
import type { DashboardNutritionTotals } from './utils';

type ReadinessLevel = 'Prime' | 'Caution' | 'Depleted' | null;

interface BuildTodayHomeStateInput {
  acwr: ACWRResult | null;
  hydration: HydrationResult | null;
  checkinDone: boolean;
  sessionDone: boolean;
  currentLevel: ReadinessLevel;
  workoutPrescription: WorkoutPrescription | null;
  todayPlanEntry: WeeklyPlanEntryRow | null;
  todayActivities: ScheduledActivityRow[];
  primaryActivity: ScheduledActivityRow | null;
  nutritionTargets: ResolvedNutritionTargets | null;
  actualNutrition: DashboardNutritionTotals;
  currentLedger: MacroLedgerRow | null;
  activeCutPlan: WeightCutPlanRow | null;
  todayCutProtocol: DailyCutProtocolRow | null;
}

export interface TodayHomeState {
  training: {
    readinessScore: number;
    chronic: number;
    acute: number;
    loadChart: { x: number; fitness: number; fatigue: number; readiness: number }[];
  };
  fuel: {
    actual: DashboardNutritionTotals;
    targets: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      water: number;
    };
    hasActiveCutProtocol: boolean;
  };
  schedule: {
    contextualActivities: ScheduledActivityRow[];
    hasLivePlanningState: boolean;
  };
}

export function buildTodayHomeState(input: BuildTodayHomeStateInput): TodayHomeState {
  const {
    acwr,
    hydration,
    checkinDone,
    currentLevel,
    workoutPrescription,
    todayPlanEntry,
    todayActivities,
    primaryActivity,
    nutritionTargets,
    actualNutrition,
    currentLedger,
    activeCutPlan,
    todayCutProtocol,
  } = input;

  const readinessScore = currentLevel === 'Prime' ? 92 : currentLevel === 'Caution' ? 58 : 25;
  const readinessBar = checkinDone ? (currentLevel === 'Prime' ? 100 : currentLevel === 'Caution' ? 65 : 30) : 0;
  const isDemoMode = (acwr?.chronic || 0) === 0 && (acwr?.acute || 0) === 0;
  const chronic = isDemoMode ? 450 : (acwr?.chronic || 0);
  const acute = isDemoMode ? 380 : (acwr?.acute || 0);
  const contextualActivities = (workoutPrescription || isGuidedEngineActivityType(primaryActivity?.activity_type))
    ? todayActivities.filter((activity) => !isGuidedEngineActivityType(activity.activity_type))
    : todayActivities;

  const targets = todayCutProtocol
    ? {
        calories: calculateCaloriesFromMacros(
          todayCutProtocol.prescribed_protein,
          todayCutProtocol.prescribed_carbs,
          todayCutProtocol.prescribed_fat,
        ),
        protein: todayCutProtocol.prescribed_protein,
        carbs: todayCutProtocol.prescribed_carbs,
        fat: todayCutProtocol.prescribed_fat,
        water: todayCutProtocol.water_target_oz,
      }
    : {
        calories: nutritionTargets?.adjustedCalories ?? 0,
        protein: nutritionTargets?.protein ?? (currentLedger?.prescribed_protein ?? 150),
        carbs: nutritionTargets?.carbs ?? (currentLedger?.prescribed_carbs ?? 200),
        fat: nutritionTargets?.fat ?? (currentLedger?.prescribed_fats ?? 60),
        water: hydration?.dailyWaterOz ?? 100,
      };

  return {
    training: {
      readinessScore,
      chronic,
      acute,
      loadChart: [
        { x: 0, fitness: chronic, fatigue: 0, readiness: 0 },
        { x: 1, fitness: 0, fatigue: acute, readiness: 0 },
        { x: 2, fitness: 0, fatigue: 0, readiness: readinessBar },
      ],
    },
    fuel: {
      actual: actualNutrition,
      targets,
      hasActiveCutProtocol: Boolean(activeCutPlan && todayCutProtocol),
    },
    schedule: {
      contextualActivities: contextualActivities,
      hasLivePlanningState: Boolean(todayPlanEntry) || todayActivities.length > 0,
    },
  };
}
