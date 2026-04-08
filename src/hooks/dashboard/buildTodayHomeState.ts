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
    loadChart: { value: number; label: string; isToday?: boolean }[];
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
  const isDemoMode = (acwr?.chronic || 0) === 0 && (acwr?.acute || 0) === 0;
  const chronic = isDemoMode ? 450 : (acwr?.chronic || 0);
  const acute = isDemoMode ? 380 : (acwr?.acute || 0);

  // Derive 7-Day Trend data from ACWR results
  const dailyLoads = acwr?.loadMetrics?.dailyLoads ?? [];
  const last7Loads = dailyLoads.slice(-7);
  
  // Day names for the last 7 days
  const today = new Date();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  let chartData: { value: number; label: string; isToday?: boolean }[] = [];

  if (isDemoMode || last7Loads.length === 0) {
    // Premium Demo Wave
    chartData = [
      { value: 420, label: 'S' },
      { value: 380, label: 'M' },
      { value: 510, label: 'T' },
      { value: 290, label: 'W' },
      { value: 460, label: 'T' },
      { value: 580, label: 'F' },
      { value: acute, label: 'S', isToday: true },
    ];
  } else {
    chartData = last7Loads.map((load, i) => {
      const date = new Date();
      date.setDate(today.getDate() - (last7Loads.length - 1 - i));
      return {
        value: load,
        label: dayNames[date.getDay()],
        isToday: i === last7Loads.length - 1,
      };
    });
  }

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
      loadChart: chartData,
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
