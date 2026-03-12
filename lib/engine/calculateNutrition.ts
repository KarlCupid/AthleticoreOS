import {
  NutritionProfileInput,
  NutritionTargets,
  MacroAdherenceResult,
  ActivityLevel,
  Phase,
  NutritionGoal,
  DailyCutProtocolRow,
  ActivityType,
  ResolvedNutritionTargets,
} from './types';
import { adjustForBiology } from './adjustForBiology';
import { adjustNutritionForDay } from './calculateSchedule';

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - weightLbs: number (from morning_weight or Athlete_Profiles.base_weight)
 *   - heightInches: number | null (from Athlete_Profiles.height_inches)
 *   - age: number | null (from Athlete_Profiles.age)
 *   - biologicalSex: 'male' | 'female' (from Athlete_Profiles.biological_sex)
 *   - activityLevel: ActivityLevel (from Athlete_Profiles.activity_level)
 *   - phase: Phase (from Athlete_Profiles.phase)
 *   - nutritionGoal: NutritionGoal (from Athlete_Profiles.nutrition_goal)
 *   - cycleDay: number | null (if cycle_tracking is TRUE and biological_sex is 'female')
 *   - coachProteinOverride, coachCarbsOverride, coachFatOverride, coachCaloriesOverride
 *
 * Returns: NutritionTargets
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.15,
  light: 1.25,
  moderate: 1.4,
  very_active: 1.6,
  extra_active: 1.75,
};

// Phase + goal → calorie adjustment percentage
const PHASE_GOAL_MODIFIERS: Record<Phase, Record<NutritionGoal, number>> = {
  'off-season': {
    maintain: 0,
    cut: -0.1,
    bulk: 0.1,
  },
  'pre-camp': {
    maintain: -0.05,
    cut: -0.15,
    bulk: 0.05,
  },
  'fight-camp': {
    maintain: -0.15,
    cut: -0.25,
    bulk: 0,
  },
  // Camp phases — nutrition adjusts to phase demand
  'camp-base': {
    maintain: 0.05,   // High volume base: slight surplus to support training load
    cut: -0.10,
    bulk: 0.10,
  },
  'camp-build': {
    maintain: 0,      // Increasing intensity: strict maintenance
    cut: -0.15,
    bulk: 0.05,
  },
  'camp-peak': {
    maintain: -0.05,  // Peak: slight cut to sharpen
    cut: -0.20,
    bulk: 0,
  },
  'camp-taper': {
    maintain: -0.10,  // Taper: moderate cut to make weight while maintaining muscle
    cut: -0.20,
    bulk: 0,
  },
};

function calculateBMR(
  weightLbs: number,
  heightInches: number | null,
  age: number | null,
  biologicalSex: 'male' | 'female'
): number {
  // If height or age unavailable, use simplified athlete approximation
  if (heightInches == null || age == null) {
    return 10 * weightLbs; // Lowered from 15 to 10 for safer baseline
  }

  const weightKg = weightLbs * 0.453592;
  const heightCm = heightInches * 2.54;

  // Mifflin-St Jeor
  if (biologicalSex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateNutritionTargets(
  input: NutritionProfileInput
): NutritionTargets {
  const {
    weightLbs,
    heightInches,
    age,
    biologicalSex,
    activityLevel,
    phase,
    nutritionGoal,
    cycleDay,
    coachProteinOverride,
    coachCarbsOverride,
    coachFatOverride,
    coachCaloriesOverride,
    weightCorrectionDeficit,
  } = input;

  // 1. Calculate TDEE
  const bmr = calculateBMR(weightLbs, heightInches, age, biologicalSex);
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const tdee = Math.round(bmr * activityMultiplier);

  // 2. Apply phase + goal modifier
  const phaseMultiplier = PHASE_GOAL_MODIFIERS[phase][nutritionGoal];
  let adjustedCalories = coachCaloriesOverride ?? Math.round(tdee * (1 + phaseMultiplier));

  // Safe floor for calories (1200 for women, 1500 for men)
  const minCalories = biologicalSex === 'female' ? 1200 : 1500;
  adjustedCalories = Math.max(minCalories, adjustedCalories);

  // 2b. Apply weight correction deficit
  const correction = weightCorrectionDeficit ?? 0;
  if (correction > 0) {
    adjustedCalories = Math.max(minCalories, adjustedCalories - correction);
  } else if (correction < 0) {
    // Negative correction = reduce deficit (ahead of target)
    adjustedCalories = adjustedCalories - correction; // subtracting negative = adding
  }

  // 3. Biology modifier for protein
  let proteinModifier = 1.0;
  let biologyMessage = '';
  if (cycleDay != null && cycleDay >= 1 && cycleDay <= 28) {
    const biology = adjustForBiology({ cycleDay });
    proteinModifier = biology.proteinModifier;
    biologyMessage = biology.message;
  }

  // 4. Protein: 1.0g/lb bodyweight, modified by biology
  const protein = coachProteinOverride ?? Math.round(weightLbs * 1.0 * proteinModifier);

  // 5. Fat: 30% of adjusted calories (up from 25% to prevent crazy high carbs), min 40g
  const fatFromCalories = Math.round((adjustedCalories * 0.30) / 9);
  const fat = coachFatOverride ?? Math.max(40, fatFromCalories);

  // 6. Carbs: remaining calories
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const remainingCalories = Math.max(0, adjustedCalories - proteinCalories - fatCalories);
  const carbs = coachCarbsOverride ?? Math.round(remainingCalories / 4);

  // 7. Build message
  let message = '';
  if (nutritionGoal === 'cut') {
    const deficit = Math.round(tdee * Math.abs(phaseMultiplier));
    message = `${deficit} cal deficit applied for your ${phase.replace('-', ' ')} cut.`;
  } else if (nutritionGoal === 'bulk') {
    const surplus = Math.round(tdee * phaseMultiplier);
    message = `${surplus} cal surplus for lean gaining in ${phase.replace('-', ' ')}.`;
  } else {
    message = `Maintenance calories for ${phase.replace('-', ' ')} phase.`;
  }
  if (biologyMessage) {
    message += ` ${biologyMessage}`;
  }
  if (correction > 0) {
    message += ` ${correction} cal weight correction applied.`;
  } else if (correction < 0) {
    message += ` Deficit reduced by ${Math.abs(correction)} cal — ahead of weight target.`;
  }

  return {
    tdee,
    adjustedCalories,
    protein,
    carbs,
    fat,
    proteinModifier,
    phaseMultiplier,
    weightCorrectionDeficit: correction,
    message,
  };
}

/**
 * Computes adherence ratios for a day's nutrition.
 * Within 10% = Target Met, within 20% = Close Enough, else Missed It.
 */
export function computeMacroAdherence(
  actual: { calories: number; protein: number; carbs: number; fat: number },
  prescribed: { calories: number; protein: number; carbs: number; fat: number }
): MacroAdherenceResult {
  const safePct = (a: number, p: number) =>
    p > 0 ? Math.round((a / p) * 100) : a === 0 ? 100 : 0;

  const caloriesPct = safePct(actual.calories, prescribed.calories);
  const proteinPct = safePct(actual.protein, prescribed.protein);
  const carbsPct = safePct(actual.carbs, prescribed.carbs);
  const fatPct = safePct(actual.fat, prescribed.fat);

  const withinRange = (pct: number, threshold: number) =>
    Math.abs(pct - 100) <= threshold;

  const allWithin10 =
    withinRange(caloriesPct, 10) &&
    withinRange(proteinPct, 10) &&
    withinRange(carbsPct, 10) &&
    withinRange(fatPct, 10);

  const allWithin20 =
    withinRange(caloriesPct, 20) &&
    withinRange(proteinPct, 20) &&
    withinRange(carbsPct, 20) &&
    withinRange(fatPct, 20);

  let overall: MacroAdherenceResult['overall'];
  if (allWithin10) {
    overall = 'Target Met';
  } else if (allWithin20) {
    overall = 'Close Enough';
  } else {
    overall = 'Missed It';
  }

  return { caloriesPct, proteinPct, carbsPct, fatPct, overall };
}

/**
 * Single source of truth for daily dashboard macros.
 * Resolves the three-way conflict between:
 * 1. Base nutrition engine (calculateNutritionTargets)
 * 2. Day-specific activity adjustments (adjustNutritionForDay)
 * 3. Active weight cut protocols (computeDailyCutProtocol)
 *
 * @ANTI-WIRING:
 * To be called by the dashboard loader after computing both base targets and the cut protocol.
 */
export function resolveDailyNutritionTargets(
  baseTargets: NutritionTargets,
  cutProtocol: DailyCutProtocolRow | null,
  dayActivities: { activity_type: ActivityType; expected_intensity: number; estimated_duration_min: number }[],
): ResolvedNutritionTargets {
  // 1. If active cut, cut protocol is the ultimate truth. 
  // It already factors in baseline, biology, and activity adjustments.
  if (cutProtocol) {
    return {
      ...baseTargets,
      adjustedCalories: cutProtocol.prescribed_calories,
      protein: cutProtocol.prescribed_protein,
      carbs: cutProtocol.prescribed_carbs,
      fat: cutProtocol.prescribed_fat,
      source: 'weight_cut_protocol' as const,
      message: cutProtocol.cut_phase
        ? `Weight cut protocol (${cutProtocol.cut_phase.replace(/_/g, ' ')})`
        : 'Following active weight cut macro targets.',
    };
  }

  // 2. If no active cut, apply daily activity adjustments to base targets
  const dayAdj = adjustNutritionForDay(baseTargets, dayActivities, null);

  const modifiedCalories = baseTargets.adjustedCalories + dayAdj.calorieModifier;
  const modifiedProtein = baseTargets.protein + dayAdj.proteinModifier;
  const modifiedCarbs = Math.round(baseTargets.carbs * (1 + dayAdj.carbModifierPct / 100));

  // Fat soaks up remaining calories
  const fatCalories = Math.max(0, modifiedCalories - (modifiedProtein * 4) - (modifiedCarbs * 4));
  const modifiedFat = Math.round(fatCalories / 9);

  return {
    ...baseTargets,
    adjustedCalories: modifiedCalories,
    protein: modifiedProtein,
    carbs: modifiedCarbs,
    fat: modifiedFat,
    source: dayActivities.length > 0 ? 'daily_activity_adjusted' as const : 'base' as const,
    message: dayActivities.length > 0 ? dayAdj.message : baseTargets.message,
  };
}

export function resolveDailyMacros(
  baseTargets: NutritionTargets,
  cutProtocol: DailyCutProtocolRow | null,
  dayActivities: { activity_type: ActivityType; expected_intensity: number; estimated_duration_min: number }[],
) {
  const resolved = resolveDailyNutritionTargets(baseTargets, cutProtocol, dayActivities);

  return {
    calories: resolved.adjustedCalories,
    protein: resolved.protein,
    carbs: resolved.carbs,
    fat: resolved.fat,
    source: resolved.source,
    message: resolved.message,
  };
}
