import type { Phase } from './foundational.ts';

export type NutritionGoal = 'maintain' | 'cut' | 'bulk';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type FoodDataSource = 'usda' | 'open_food_facts' | 'custom';

export type FoodSourceType = 'ingredient' | 'packaged' | 'custom';

export type FoodSearchMode = 'all' | 'recent' | 'ingredients' | 'packaged';

export type FoodSearchBadge =
  | 'Ingredient'
  | 'Packaged'
  | 'Custom'
  | 'Recent'
  | 'Favorite'
  | 'Verified';

export interface FoodPortionOption {
  id: string;
  label: string;
  amount: number;
  unit: string;
  grams: number;
  isDefault?: boolean;
}

export interface FoodSearchResult {
  key: string;
  id?: string;
  user_id: string | null;
  source: FoodDataSource;
  sourceType: FoodSourceType;
  external_id: string | null;
  verified: boolean;
  searchRank: number;
  off_barcode: string | null;
  name: string;
  brand: string | null;
  image_url: string | null;
  baseAmount: number;
  baseUnit: string;
  gramsPerPortion: number | null;
  portionOptions: FoodPortionOption[];
  serving_size_g: number;
  serving_label: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  is_supplement: boolean;
  badges: FoodSearchBadge[];
}

export interface FoodNutritionSnapshot {
  source: FoodDataSource;
  sourceType: FoodSourceType;
  external_id: string | null;
  source_id?: string | null;
  verified: boolean;
  name: string;
  brand: string | null;
  image_url: string | null;
  baseAmount: number;
  baseUnit: string;
  gramsPerPortion: number | null;
  portionOptions: FoodPortionOption[];
  serving_size_g: number;
  serving_label: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  is_supplement: boolean;
  data_quality?: import('../../performance-engine/types/nutrition.ts').NutritionDataQuality | null;
  missing_nutrients?: string[];
  confidence?: import('../../performance-engine/types/shared.ts').ConfidenceValue | null;
}

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

export interface ProteinTargetPolicy {
  baseProteinPerKg: number;
  maxProteinPerKg: number;
  deficitScalerCapPerKg: number;
}

export interface NutritionTargets {
  engineVersion?: 'nutrition_fueling_engine_v1';
  canonicalPhase?: string;
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

export type FuelPriority =
  | 'sparring'
  | 'boxing_practice'
  | 'heavy_sc'
  | 'conditioning'
  | 'double_session'
  | 'recovery'
  | 'cut_protect';

export type DeficitClass =
  | 'steady_cut'
  | 'steady_maintain'
  | 'steady_bulk';

export type RecoveryNutritionFocus =
  | 'none'
  | 'impact_recovery'
  | 'glycogen_restore'
  | 'hydration_restore';

export interface SessionFuelingWindow {
  label: string;
  timing: string;
  carbsG: number;
  proteinG: number;
  notes: string[];
  lowResidue?: boolean;
}

export interface SessionHydrationPlan {
  fluidsOz: number;
  electrolytesMg: number | null;
  carbsG: number;
  notes: string[];
}

export interface SessionFuelingPlan {
  priority: FuelPriority;
  priorityLabel: string;
  sessionLabel: string;
  preSession: SessionFuelingWindow;
  intraSession: SessionHydrationPlan;
  betweenSessions: SessionFuelingWindow | null;
  postSession: SessionFuelingWindow;
  hydrationNotes: string[];
  coachingNotes: string[];
}

export interface DailyHydrationPlan {
  dailyTargetOz: number;
  sodiumTargetMg: number | null;
  emphasis: 'baseline' | 'performance' | 'recovery';
  notes: string[];
}

export type DailyNutritionTargetSource =
  | 'base'
  | 'daily_activity_adjusted';

export type NutritionSafetyWarning =
  | 'none'
  | 'fueling_floor_applied'
  | 'cut_readiness_floor_applied'
  | 'low_energy_availability'
  | 'critical_energy_availability'
  | 'cumulative_ea_deficit_red_flag';

export interface NutritionSafetyEvent {
  code: NutritionSafetyWarning;
  source: 'fueling_floor' | 'cut_readiness_floor' | 'cumulative_ea_deficit';
  priorValue: number | null;
  adjustedValue: number | null;
  reason: string;
}

export interface ResolvedNutritionTargets extends NutritionTargets {
  source: DailyNutritionTargetSource;
  fuelState: FuelState;
  prioritySession: FuelPriority;
  deficitClass: DeficitClass;
  recoveryNutritionFocus: RecoveryNutritionFocus;
  sessionDemandScore: number;
  hydrationBoostOz: number;
  hydrationPlan: DailyHydrationPlan;
  sessionFuelingPlan: SessionFuelingPlan;
  reasonLines: string[];
  energyAvailability: number | null;
  fuelingFloorTriggered: boolean;
  deficitBankDelta: number;
  safetyWarning: NutritionSafetyWarning;
  safetyEvents?: NutritionSafetyEvent[];
  traceLines: string[];
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
  source: FoodDataSource;
  source_type: FoodSourceType;
  external_id: string | null;
  verified: boolean;
  off_barcode: string | null;
  name: string;
  brand: string | null;
  base_amount: number;
  base_unit: string;
  grams_per_portion: number | null;
  portion_options: FoodPortionOption[] | null;
  serving_size_g: number;
  serving_label: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  is_supplement: boolean;
  image_url: string | null;
  search_text?: string | null;
}

export interface FoodLogRow {
  id: string;
  user_id: string;
  food_item_id: string;
  date: string;
  meal_type: MealType;
  servings: number;
  amount_value?: number | null;
  amount_unit?: string | null;
  grams?: number | null;
  source?: FoodDataSource | null;
  nutrition_snapshot?: FoodNutritionSnapshot | null;
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
