import type {
  DailyMission,
  FoodSearchResult,
  MealType,
  ResolvedNutritionTargets,
} from '../../../lib/engine/types';
import type { DashboardNutritionTotals } from '../dashboard/utils';
import type { UnifiedPerformanceViewModel } from '../../../lib/performance-engine';

export interface MealLogEntryViewModel {
  id: string;
  mealType: MealType;
  foodName: string;
  foodBrand: string | null;
  amountLabel: string;
  loggedCalories: number;
  loggedProtein: number;
  loggedCarbs: number;
  loggedFat: number;
  amountValue: number;
  amountUnit: string;
  grams: number | null;
  foodItem: FoodSearchResult;
}

export interface HydrationEntryViewModel {
  id: string;
  amountOz: number;
  createdAtLabel: string;
  isLatest: boolean;
}

export interface FuelHistoryDay {
  mealCount: number;
  waterOz: number;
}

export interface FuelHomeViewModel {
  userId: string | null;
  date: string;
  formattedDate: string;
  dailyMission: DailyMission | null;
  targets: ResolvedNutritionTargets | null;
  totals: DashboardNutritionTotals;
  meals: Record<MealType, MealLogEntryViewModel[]>;
  hydrationEntries: HydrationEntryViewModel[];
  favorites: FoodSearchResult[];
  recent: FoodSearchResult[];
  historySummary: FuelHistoryDay;
  missionReasonLines: string[];
  missionTraceLines: string[];
  performanceContext: UnifiedPerformanceViewModel;
}

export interface FightWeekDayViewModel {
  date: string;
  daysToWeighIn: number;
  label: string;
  phaseLabel: string;
  phaseColors: [string, string];
}
