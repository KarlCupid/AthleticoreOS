import type {
  ACWRResult,
  DailyCutProtocolRow,
  HydrationResult,
  MacroLedgerRow,
  ResolvedNutritionTargets,
  ScheduledActivityRow,
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
  hasActiveCutPlan: boolean;
  todayCutProtocol: DailyCutProtocolRow | null;
}

export interface TodayHomeState {
  training: {
    readinessScore: number;
    chronic: number;
    acute: number;
    loadChart: { value: number; label: string; isToday?: boolean }[];
    workload: DashboardWorkloadGuidance;
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

export type DashboardWorkloadTone = 'positive' | 'steady' | 'caution' | 'protect' | 'neutral';

export interface DashboardWorkloadGuidance {
  label: string;
  headline: string;
  guidance: string;
  chartHelp: string;
  detail: string;
  tone: DashboardWorkloadTone;
  confidenceLabel: string;
}

function formatRatio(value: number | null | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value.toFixed(2);
}

function buildWorkloadDetail(acwr: ACWRResult | null): string {
  const ratio = formatRatio(acwr?.ratio);
  if (!acwr || !ratio) {
    return 'Details appear after you log training.';
  }

  const daysLabel = acwr.daysOfData === 1 ? '1 day logged' : `${acwr.daysOfData} days logged`;
  return `ACWR ${ratio} - ${daysLabel}`;
}

function getConfidenceLabel(acwr: ACWRResult | null): string {
  if (!acwr || acwr.daysOfData === 0) return 'No history yet';
  if (acwr.thresholds.confidence === 'high') return 'High confidence';
  if (acwr.thresholds.confidence === 'medium') return 'Building confidence';
  return 'Low confidence';
}

export function buildDashboardWorkloadGuidance(acwr: ACWRResult | null): DashboardWorkloadGuidance {
  const detail = buildWorkloadDetail(acwr);
  const confidenceLabel = getConfidenceLabel(acwr);

  if (!acwr || acwr.daysOfData === 0) {
    return {
      label: 'Need more history',
      headline: 'Log training first',
      guidance: 'Log a few sessions to sharpen this.',
      chartHelp: 'This starts working after you log training. More history makes the guidance sharper.',
      detail,
      tone: 'neutral',
      confidenceLabel,
    };
  }

  if (acwr.thresholds.confidence === 'low' || acwr.daysOfData < 7) {
    return {
      label: 'Need more history',
      headline: 'Keep logging',
      guidance: 'We need a few more logged sessions before this trend is reliable.',
      chartHelp: 'This shows recent logged work. Your normal base gets clearer with more sessions.',
      detail,
      tone: 'neutral',
      confidenceLabel,
    };
  }

  if (acwr.status === 'redline') {
    return {
      label: 'Recovery first',
      headline: 'Protect today',
      guidance: 'Recent work is above your normal base. Keep extras light today.',
      chartHelp: 'This shows your last 7 days of training. Higher points mean more total work that day.',
      detail,
      tone: 'protect',
      confidenceLabel,
    };
  }

  if (acwr.status === 'caution') {
    return {
      label: 'Keep it controlled',
      headline: 'Trim extras',
      guidance: 'Recent work is above your normal base. Keep today controlled.',
      chartHelp: 'This shows your last 7 days of training. Higher points mean more total work that day.',
      detail,
      tone: 'caution',
      confidenceLabel,
    };
  }

  if (acwr.ratio > 0 && acwr.ratio < acwr.thresholds.detrained) {
    return {
      label: 'Build gradually',
      headline: 'Ease back in',
      guidance: 'Your recent training is below your normal base. Build gradually.',
      chartHelp: 'This shows your last 7 days of training. Higher points mean more total work that day.',
      detail,
      tone: 'steady',
      confidenceLabel,
    };
  }

  return {
    label: 'Ready to train',
    headline: 'Train as planned',
    guidance: 'Your recent training is close to your normal base.',
    chartHelp: 'This shows your last 7 days of training. Higher points mean more total work that day.',
    detail,
    tone: 'positive',
    confidenceLabel,
  };
}

export function buildTodayHomeState(input: BuildTodayHomeStateInput): TodayHomeState {
  const {
    acwr,
    hydration,
    checkinDone: _checkinDone,
    currentLevel,
    workoutPrescription,
    todayPlanEntry,
    todayActivities,
    primaryActivity,
    nutritionTargets,
    actualNutrition,
    currentLedger,
    hasActiveCutPlan,
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
      workload: buildDashboardWorkloadGuidance(acwr),
    },
    fuel: {
      actual: actualNutrition,
      targets,
      hasActiveCutProtocol: Boolean(hasActiveCutPlan && todayCutProtocol),
    },
    schedule: {
      contextualActivities: contextualActivities,
      hasLivePlanningState: Boolean(todayPlanEntry) || todayActivities.length > 0,
    },
  };
}
