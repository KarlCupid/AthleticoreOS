import type { DailyCutProtocolRow } from './types/weight_cut.ts';
import type {
  MacroAdherenceResult,
  NutritionProfileInput,
  NutritionTargets,
  ResolvedNutritionTargets,
} from './types/nutrition.ts';
import type { Phase } from './types/foundational.ts';
import type { ActivityLevel, NutritionGoal } from './types/nutrition.ts';
import type { ActivityType } from './types/schedule.ts';
import { adjustForBiology } from './adjustForBiology.ts';
import { adjustNutritionForDay } from './schedule/safety.ts';
import { calculateCaloriesFromMacros } from '../utils/nutrition.ts';
import {
  applyFuelingFloor,
  estimateLeanMassKg,
  estimateTrainingExpenditure,
} from './nutrition/energyAvailability.ts';
import { distributeMacros, getProteinTarget } from './nutrition/macroDistribution.ts';

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

  const deficitPercent = tdee > 0 ? Math.max(0, (tdee - adjustedCalories) / tdee) : 0;
  const protein = coachProteinOverride ?? getProteinTarget({
    bodyweightLbs: weightLbs,
    deficitPercent,
    proteinModifier,
  });

  const distributed = distributeMacros({
    adjustedCalories,
    proteinTarget: protein,
  });
  const fat = coachFatOverride ?? distributed.fat;
  const carbs = coachCarbsOverride ?? Math.max(0, Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4));

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

  const reconciledCalories = calculateCaloriesFromMacros(protein, carbs, fat);

  return {
    tdee,
    adjustedCalories: reconciledCalories,
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
  options?: {
    daysToWeighIn?: number | null;
  },
): ResolvedNutritionTargets {
  const estimatedBodyweightLbs = Math.max(100, Math.round(baseTargets.protein / Math.max(baseTargets.proteinModifier, 1)));
  const leanMassKg = estimateLeanMassKg(estimatedBodyweightLbs);
  const estimatedExpenditure = estimateTrainingExpenditure(dayActivities);
  const isTrainingDay = dayActivities.some((activity) => activity.activity_type !== 'rest' && activity.activity_type !== 'active_recovery');

  // 1. If active cut, cut protocol is the ultimate truth. 
  if (cutProtocol) {
    const cutCalories = calculateCaloriesFromMacros(
      cutProtocol.prescribed_protein,
      cutProtocol.prescribed_carbs,
      cutProtocol.prescribed_fat,
    );
    const deficitPercent = baseTargets.tdee > 0 ? Math.max(0, (baseTargets.tdee - cutCalories) / baseTargets.tdee) : 0;
    const scaledProtein = getProteinTarget({
      bodyweightLbs: estimatedBodyweightLbs,
      deficitPercent,
      proteinModifier: baseTargets.proteinModifier,
    });
    const cutDistributed = distributeMacros({
      adjustedCalories: cutCalories,
      proteinTarget: Math.max(cutProtocol.prescribed_protein, scaledProtein),
    });
    const floorResult = applyFuelingFloor({
      targetCalories: cutDistributed.calories,
      estimatedExpenditure,
      leanMassKg,
      isTrainingDay,
      daysToWeighIn: options?.daysToWeighIn ?? cutProtocol.days_to_weigh_in,
    });
    const finalDistributed = distributeMacros({
      adjustedCalories: floorResult.adjustedCalories,
      proteinTarget: cutDistributed.protein,
    });
    const reasonLines = ['Active weight cut protocol overrides the normal day engine.'];
    const traceLines = [...reasonLines, ...floorResult.traceLines];

    return {
      ...baseTargets,
      adjustedCalories: finalDistributed.calories,
      protein: finalDistributed.protein,
      carbs: finalDistributed.carbs,
      fat: finalDistributed.fat,
      source: floorResult.fuelingFloorTriggered ? 'weight_cut_protocol_safety_adjusted' as const : 'weight_cut_protocol' as const,
      fuelState: 'cut_protect',
      sessionDemandScore: 0,
      hydrationBoostOz: 0,
      reasonLines,
      energyAvailability: floorResult.energyAvailability,
      fuelingFloorTriggered: floorResult.fuelingFloorTriggered,
      deficitBankDelta: floorResult.deficitBankDelta,
      safetyWarning: floorResult.safetyWarning,
      traceLines,
      message: cutProtocol.cut_phase
        ? `Weight cut protocol (${cutProtocol.cut_phase.replace(/_/g, ' ')})`
        : 'Following active weight cut macro targets.',
    };
  }

  // 2. If no active cut, apply daily activity adjustments to base targets
  const dayAdj = adjustNutritionForDay(baseTargets, dayActivities, null);

  const modifiedCalories = baseTargets.adjustedCalories + dayAdj.calorieModifier;
  const deficitPercent = baseTargets.tdee > 0 ? Math.max(0, (baseTargets.tdee - modifiedCalories) / baseTargets.tdee) : 0;
  const modifiedProtein = getProteinTarget({
    bodyweightLbs: estimatedBodyweightLbs,
    deficitPercent,
    proteinModifier: baseTargets.proteinModifier,
  }) + dayAdj.proteinModifier;
  const distributed = distributeMacros({
    adjustedCalories: modifiedCalories,
    proteinTarget: modifiedProtein,
  });
  const targetCarbs = Math.max(0, Math.round(distributed.carbs * (1 + dayAdj.carbModifierPct / 100)));
  const modifiedCarbs = Math.min(targetCarbs, distributed.carbs);
  const modifiedFat = Math.max(40, Math.round((modifiedCalories - (modifiedProtein * 4) - (modifiedCarbs * 4)) / 9));
  const floorResult = applyFuelingFloor({
    targetCalories: calculateCaloriesFromMacros(modifiedProtein, modifiedCarbs, modifiedFat),
    estimatedExpenditure,
    leanMassKg,
    isTrainingDay,
    daysToWeighIn: options?.daysToWeighIn ?? null,
  });
  const finalDistributed = distributeMacros({
    adjustedCalories: floorResult.adjustedCalories,
    proteinTarget: modifiedProtein,
  });
  const reconciledCalories = finalDistributed.calories;

  return {
    ...baseTargets,
    adjustedCalories: reconciledCalories,
    protein: finalDistributed.protein,
    carbs: finalDistributed.carbs,
    fat: finalDistributed.fat,
    source: dayActivities.length > 0 ? 'daily_activity_adjusted' as const : 'base' as const,
    fuelState: dayAdj.fuelState,
    sessionDemandScore: dayAdj.sessionDemandScore,
    hydrationBoostOz: dayAdj.hydrationBoostOz,
    reasonLines: dayAdj.reasons,
    energyAvailability: floorResult.energyAvailability,
    fuelingFloorTriggered: floorResult.fuelingFloorTriggered,
    deficitBankDelta: floorResult.deficitBankDelta,
    safetyWarning: floorResult.safetyWarning,
    traceLines: [...dayAdj.reasons, ...floorResult.traceLines],
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
