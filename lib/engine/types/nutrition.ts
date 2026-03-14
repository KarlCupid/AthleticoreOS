import type { Phase } from './foundational';

export type NutritionGoal = 'maintain' | 'cut' | 'bulk';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface MacroLedgerRow {
  id: string;
  user_id: string;
  date: string;
  base_tdee: number;
  prescribed_calories?: number | null;
  prescribed_protein: number;
  prescribed_fats: number;
  prescribed_carbs: number;
  weight_correction_deficit: number;
  target_source?: DailyNutritionTargetSource | null;
  actual_calories?: number;
  actual_protein?: number;
  actual_carbs?: number;
  actual_fat?: number;
}

export interface NutritionProfileInput {
  weightLbs: number;
  heightInches: number | null;
  age: number | null;
  biologicalSex: 'male' | 'female';
  activityLevel: ActivityLevel;
  phase: Phase;
  nutritionGoal: NutritionGoal;
  cycleDay?: number | null;
  coachProteinOverride: number | null;
  coachCarbsOverride: number | null;
  coachFatOverride: number | null;
  coachCaloriesOverride: number | null;
  weightCorrectionDeficit?: number;
}

export interface NutritionTargets {
  tdee: number;
  adjustedCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinModifier: number;
  phaseMultiplier: number;
  weightCorrectionDeficit: number;
  message: string;
}

export type FuelState =
  | 'rest'
  | 'active_recovery'
  | 'aerobic'
  | 'strength_power'
  | 'spar_support'
  | 'double_day'
  | 'taper'
  | 'cut_protect';

export type DailyNutritionTargetSource =
  | 'base'
  | 'daily_activity_adjusted'
  | 'weight_cut_protocol';

export interface ResolvedNutritionTargets extends NutritionTargets {
  source: DailyNutritionTargetSource;
  fuelState: FuelState;
  sessionDemandScore: number;
  hydrationBoostOz: number;
  reasonLines: string[];
}

export interface MacroAdherenceResult {
  caloriesPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  overall: 'Target Met' | 'Close Enough' | 'Missed It';
}

export interface FoodItemRow {
  id: string;
  user_id: string | null;
  off_barcode: string | null;
  name: string;
  brand: string | null;
  serving_size_g: number;
  serving_label: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  is_supplement: boolean;
  image_url: string | null;
}

export interface FoodLogRow {
  id: string;
  user_id: string;
  food_item_id: string;
  date: string;
  meal_type: MealType;
  servings: number;
  logged_calories: number;
  logged_protein: number;
  logged_carbs: number;
  logged_fat: number;
}

export interface DailyNutritionSummaryRow {
  id: string;
  user_id: string;
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_water_oz: number;
  meal_count: number;
}
