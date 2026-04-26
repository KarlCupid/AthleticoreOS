import type { DailyCutProtocolRow } from './types/weight_cut.ts';
import type {
  DailyHydrationPlan,
  DeficitClass,
  FuelPriority,
  MacroAdherenceResult,
  NutritionProfileInput,
  NutritionTargets,
  RecoveryNutritionFocus,
  ResolvedNutritionTargets,
  SessionFuelingPlan,
} from './types/nutrition.ts';
import type { Phase } from './types/foundational.ts';
import type { ActivityLevel, NutritionGoal } from './types/nutrition.ts';
import type { ActivityType } from './types/schedule.ts';
import type { MacrocycleContext } from './types/mission.ts';
import type { MEDStatus, ReadinessProfile, StimulusConstraintSet } from './types/readiness.ts';
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
    maintain: 0,
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
    maintain: 0,  // Taper maintain stays neutral; active cut protocol owns deficit pressure
    cut: -0.20,
    bulk: 0,
  },
};

type DayActivity = {
  activity_type: ActivityType;
  expected_intensity: number;
  estimated_duration_min: number;
  start_time?: string | null;
  custom_label?: string | null;
};

type NutritionResolutionOptions = {
  daysToWeighIn?: number | null;
  bodyweightLbs?: number | null;
  leanMassKg?: number | null;
  athleteAge?: number | null;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  macrocycleContext?: MacrocycleContext | null;
  medStatus?: MEDStatus | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getDeficitClass(baseTargets: NutritionTargets): DeficitClass {
  if (baseTargets.phaseMultiplier <= -0.04 || baseTargets.weightCorrectionDeficit > 0) {
    return 'steady_cut';
  }
  if (baseTargets.phaseMultiplier >= 0.04) {
    return 'steady_bulk';
  }
  return 'steady_maintain';
}

function getPriorityScore(activity: DayActivity): number {
  const baseScore = activity.expected_intensity * 10 + Math.round(activity.estimated_duration_min / 5);
  switch (activity.activity_type) {
    case 'sparring':
      return baseScore + 35;
    case 'boxing_practice':
      return baseScore + 20;
    case 'sc':
      return baseScore + (activity.expected_intensity >= 7 ? 18 : 8);
    case 'conditioning':
      return baseScore + 14;
    case 'road_work':
    case 'running':
      return baseScore + 8;
    case 'active_recovery':
      return 10;
    case 'rest':
      return 0;
    default:
      return baseScore;
  }
}

function sortActivities(activities: DayActivity[]): DayActivity[] {
  return [...activities].sort((a, b) => {
    const timeA = a.start_time ?? '99:99';
    const timeB = b.start_time ?? '99:99';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return getPriorityScore(b) - getPriorityScore(a);
  });
}

function getPrioritySession(activities: DayActivity[], trainingIntensityCap?: number | null): {
  priority: FuelPriority;
  label: string;
  sessionLabel: string;
  activity: DayActivity | null;
  isDoubleSession: boolean;
} {
  const activeSessions = sortActivities(
    activities.filter((activity) => activity.activity_type !== 'rest' && activity.activity_type !== 'active_recovery'),
  );

  if ((trainingIntensityCap ?? 10) <= 4) {
    const activity = activeSessions[0] ?? null;
    return {
      priority: 'cut_protect',
      label: 'Cut-protect session',
      sessionLabel: activity?.custom_label ?? 'Allowed training window',
      activity,
      isDoubleSession: activeSessions.length >= 2,
    };
  }

  if (activeSessions.length >= 2) {
    const primaryActivity = [...activeSessions].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))[0] ?? activeSessions[0] ?? null;
    return {
      priority: 'double_session',
      label: 'Double session day',
      sessionLabel: primaryActivity?.custom_label ?? 'Two-a-day',
      activity: primaryActivity,
      isDoubleSession: true,
    };
  }

  const activity = activeSessions[0] ?? null;
  if (!activity) {
    const recoveryActivity = sortActivities(activities)[0] ?? null;
    return {
      priority: 'recovery',
      label: recoveryActivity?.activity_type === 'active_recovery' ? 'Recovery session' : 'Recovery day',
      sessionLabel: recoveryActivity?.custom_label ?? 'Recovery day',
      activity: recoveryActivity,
      isDoubleSession: false,
    };
  }

  switch (activity.activity_type) {
    case 'sparring':
      return { priority: 'sparring', label: 'Sparring', sessionLabel: activity.custom_label ?? 'Sparring', activity, isDoubleSession: false };
    case 'boxing_practice':
      return { priority: 'boxing_practice', label: 'Boxing practice', sessionLabel: activity.custom_label ?? 'Technical practice', activity, isDoubleSession: false };
    case 'sc':
      return {
        priority: activity.expected_intensity >= 7 ? 'heavy_sc' : 'conditioning',
        label: activity.expected_intensity >= 7 ? 'Heavy S&C' : 'S&C session',
        sessionLabel: activity.custom_label ?? 'Strength and conditioning',
        activity,
        isDoubleSession: false,
      };
    case 'conditioning':
    case 'road_work':
    case 'running':
      return { priority: 'conditioning', label: 'Conditioning', sessionLabel: activity.custom_label ?? 'Conditioning session', activity, isDoubleSession: false };
    default:
      return { priority: 'conditioning', label: 'Training session', sessionLabel: activity.custom_label ?? 'Training session', activity, isDoubleSession: false };
  }
}

function getLegacyFuelState(priority: FuelPriority, macrocycleContext?: MacrocycleContext | null): ResolvedNutritionTargets['fuelState'] {
  if (priority === 'cut_protect') return 'cut_protect';
  if (macrocycleContext?.campPhase === 'taper') return 'taper';
  switch (priority) {
    case 'sparring':
    case 'boxing_practice':
      return 'spar_support';
    case 'heavy_sc':
      return 'strength_power';
    case 'double_session':
      return 'double_day';
    case 'recovery':
      return 'active_recovery';
    case 'conditioning':
    default:
      return 'aerobic';
  }
}

function inferRecoveryFocus(input: {
  priority: FuelPriority;
  readinessProfile?: ReadinessProfile | null;
  hydrationBoostOz: number;
}): RecoveryNutritionFocus {
  const { priority, readinessProfile, hydrationBoostOz } = input;
  if ((readinessProfile?.structuralReadiness ?? 100) < 60 || priority === 'sparring') {
    return 'impact_recovery';
  }
  if ((readinessProfile?.metabolicReadiness ?? 100) < 60) {
    return 'hydration_restore';
  }
  if (priority === 'double_session' || priority === 'conditioning' || priority === 'boxing_practice' || hydrationBoostOz >= 16) {
    return 'glycogen_restore';
  }
  return 'none';
}

function buildTimingLabel(startTime: string | null | undefined, fallback: string): string {
  return startTime ? `${fallback} before ${startTime}` : fallback;
}

function getElectrolyteTarget(priority: FuelPriority, metabolicReady: boolean, cutProtocol: DailyCutProtocolRow | null): number | null {
  if (cutProtocol?.sodium_target_mg != null) return cutProtocol.sodium_target_mg;
  if (!metabolicReady) return 900;
  if (priority === 'double_session' || priority === 'sparring') return 800;
  if (priority === 'conditioning' || priority === 'boxing_practice') return 600;
  return 400;
}

function buildHydrationPlan(input: {
  hydrationBoostOz: number;
  priority: FuelPriority;
  recoveryFocus: RecoveryNutritionFocus;
  readinessProfile?: ReadinessProfile | null;
  cutProtocol: DailyCutProtocolRow | null;
}): DailyHydrationPlan {
  const { hydrationBoostOz, priority, recoveryFocus, readinessProfile, cutProtocol } = input;
  const baselineTarget = cutProtocol?.water_target_oz ?? 96;
  const dailyTargetOz = clamp(Math.round(baselineTarget + hydrationBoostOz), 80, 220);
  const emphasis = cutProtocol
    ? 'cut'
    : recoveryFocus === 'hydration_restore'
      ? 'recovery'
      : priority === 'double_session' || priority === 'sparring'
        ? 'performance'
        : 'baseline';
  const notes: string[] = [];

  if (priority === 'double_session') {
    notes.push('Spread fluids across both sessions instead of back-loading water at night.');
  }
  if (priority === 'sparring' || priority === 'boxing_practice') {
    notes.push('Start the first session hydrated so speed and decision-making do not fade.');
  }
  if ((readinessProfile?.metabolicReadiness ?? 100) < 60) {
    notes.push('Low metabolic readiness today. Use fluids plus electrolytes early, not only after training.');
  }
  if (cutProtocol?.sodium_instruction) {
    notes.push(cutProtocol.sodium_instruction);
  } else if (emphasis === 'performance') {
    notes.push('Add sodium around training to hold fluid and support repeat efforts.');
  }

  return {
    dailyTargetOz,
    sodiumTargetMg: cutProtocol?.sodium_target_mg ?? null,
    emphasis,
    notes,
  };
}

function buildSessionFuelingPlan(input: {
  priority: FuelPriority;
  priorityLabel: string;
  sessionLabel: string;
  activity: DayActivity | null;
  adjustedCalories: number;
  protein: number;
  carbs: number;
  hydrationBoostOz: number;
  recoveryFocus: RecoveryNutritionFocus;
  readinessProfile?: ReadinessProfile | null;
  cutProtocol: DailyCutProtocolRow | null;
}): SessionFuelingPlan {
  const {
    priority,
    priorityLabel,
    sessionLabel,
    activity,
    adjustedCalories,
    protein,
    carbs,
    hydrationBoostOz,
    recoveryFocus,
    readinessProfile,
    cutProtocol,
  } = input;
  const durationMin = activity?.estimated_duration_min ?? 0;
  const intensity = activity?.expected_intensity ?? 0;
  const cutProtected = Boolean(cutProtocol) || priority === 'cut_protect';
  const neuralReady = (readinessProfile?.neuralReadiness ?? 100) >= 60;
  const metabolicReady = (readinessProfile?.metabolicReadiness ?? 100) >= 60;
  const preCarbCap = Math.max(15, Math.round(carbs * 0.22));
  const preProteinCap = Math.max(15, Math.round(protein * 0.16));
  const preCarbs = cutProtected
    ? clamp(Math.round(Math.min(preCarbCap, 20 + durationMin / 12)), 15, 35)
    : clamp(Math.round(Math.min(preCarbCap, 25 + intensity * 3 + durationMin / 10 + (neuralReady ? 0 : 8))), 20, 75);
  const preProtein = cutProtected ? clamp(Math.round(Math.min(preProteinCap, 20)), 15, 25) : clamp(Math.round(Math.min(preProteinCap, 20 + durationMin / 30)), 20, 35);
  const intraCarbs = cutProtected
    ? 0
    : ((durationMin >= 75 && intensity >= 7) || priority === 'double_session')
      ? clamp(Math.round((durationMin / 60) * 60), 20, 70)
      : priority === 'sparring' || priority === 'boxing_practice'
        ? clamp(Math.round(durationMin / 6), 10, 25)
        : 0;
  const intraFluids = cutProtected
    ? clamp(12 + hydrationBoostOz, 12, 28)
    : clamp(Math.round(durationMin / 3) + hydrationBoostOz + (priority === 'double_session' ? 10 : 0), 16, 48);
  const postProtein = cutProtected ? clamp(Math.round(Math.min(protein * 0.18, 30)), 20, 30) : clamp(Math.round(Math.min(protein * 0.22, 40)), 25, 40);
  const postCarbs = cutProtected
    ? clamp(Math.round(Math.min(carbs * 0.12, 25)), 10, 25)
    : clamp(Math.round(Math.min(carbs * 0.24, priority === 'double_session' ? 70 : 55)), 20, 70);
  const betweenSessions = priority === 'double_session'
    ? {
        label: 'Between sessions',
        timing: 'Within 30-60 min after the first session',
        carbsG: cutProtected ? 20 : clamp(Math.round(Math.min(carbs * 0.18, 45)), 25, 45),
        proteinG: cutProtected ? 15 : clamp(Math.round(Math.min(protein * 0.12, 25)), 15, 25),
        notes: ['Keep this light and easy to digest so the second session still feels sharp.'],
        lowResidue: Boolean(cutProtocol),
      }
    : null;
  const hydrationNotes = [
    cutProtected
      ? 'Keep fluids on schedule and follow the cut instructions exactly.'
      : 'Start sipping early. Do not wait until after the session to chase fluids.',
  ];
  const coachingNotes: string[] = [];

  if (!neuralReady && !cutProtected) {
    coachingNotes.push('Low neural readiness: protect sharpness by keeping pre-session carbs and fluids in place.');
  }
  if (recoveryFocus === 'impact_recovery') {
    coachingNotes.push('Impact-heavy day: keep protein distribution tight and bias recovery meals toward tissue support.');
  } else if (recoveryFocus === 'hydration_restore') {
    coachingNotes.push('Low metabolic readiness: push electrolytes and easy carbs before adding more food volume later.');
  } else if (recoveryFocus === 'glycogen_restore') {
    coachingNotes.push('Restore glycogen early so the next quality session is not under-fueled.');
  }
  if (adjustedCalories <= 1900 && !cutProtected) {
    coachingNotes.push('Calories are still controlled today, so place most of the day’s carbs around the priority session.');
  }

  return {
    priority,
    priorityLabel,
    sessionLabel,
    preSession: {
      label: 'Before training',
      timing: buildTimingLabel(activity?.start_time, '60-90 min'),
      carbsG: preCarbs,
      proteinG: preProtein,
      lowResidue: Boolean(cutProtocol),
      notes: cutProtected
        ? ['Keep the meal light and low residue if the cut protocol is tightening digestion.']
        : ['Use easy-digesting carbs and keep fat/fiber low enough that the session starts light.'],
    },
    intraSession: {
      fluidsOz: intraFluids,
      electrolytesMg: getElectrolyteTarget(priority, metabolicReady, cutProtocol),
      carbsG: intraCarbs,
      notes: intraCarbs > 0
        ? ['Use carbs plus electrolytes if the session runs long or repeats hard efforts.']
        : ['Water plus electrolytes is enough for this session demand.'],
    },
    betweenSessions,
    postSession: {
      label: 'After training',
      timing: 'Within 60 min after training',
      carbsG: postCarbs,
      proteinG: postProtein,
      notes: ['Treat the recovery meal as mandatory if there is another hard session within 24 hours.'],
    },
    hydrationNotes,
    coachingNotes,
  };
}

function reconcileShiftedMacros(input: {
  adjustedCalories: number;
  proteinTarget: number;
  targetCarbs: number;
  minFatG?: number;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const { adjustedCalories, proteinTarget, targetCarbs, minFatG = 40 } = input;
  const protein = Math.max(0, Math.round(proteinTarget));
  const remainingCalories = Math.max(0, adjustedCalories - protein * 4);
  const maxCarbsAtMinFat = Math.max(0, Math.floor((remainingCalories - minFatG * 9) / 4));
  const carbs = clamp(Math.round(targetCarbs), 0, maxCarbsAtMinFat);
  const fat = Math.max(minFatG, Math.round((adjustedCalories - protein * 4 - carbs * 4) / 9));
  return {
    calories: calculateCaloriesFromMacros(protein, carbs, fat),
    protein,
    carbs,
    fat,
  };
}

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
  const deficitPercent = tdee > 0 ? Math.max(0, (tdee - adjustedCalories) / tdee) : 0;
  let proteinModifier = 1.0;
  let biologyMessage = '';
  if (cycleDay != null && cycleDay >= 1 && cycleDay <= 28) {
    const biology = adjustForBiology({ cycleDay, energyDeficitPercent: deficitPercent * 100 });
    proteinModifier = biology.proteinModifier;
    biologyMessage = biology.message;
  }
  const protein = coachProteinOverride != null
    ? Math.round(coachProteinOverride * proteinModifier)
    : getProteinTarget({
        bodyweightLbs: weightLbs,
        deficitPercent,
        proteinModifier,
        phase,
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
  dayActivities: DayActivity[],
  options?: NutritionResolutionOptions,
): ResolvedNutritionTargets {
  const sortedActivities = sortActivities(dayActivities);
  const deficitClass = getDeficitClass(baseTargets);
  const prioritySession = getPrioritySession(sortedActivities, cutProtocol?.training_intensity_cap ?? null);
  const activeTrainingCount = sortedActivities.filter((activity) =>
    activity.activity_type !== 'rest' && activity.activity_type !== 'active_recovery',
  ).length;
  const bodyweightLbs = options?.bodyweightLbs
    ?? options?.macrocycleContext?.currentWeightLbs
    ?? 180;
  const leanMassKg = options?.leanMassKg ?? estimateLeanMassKg(bodyweightLbs);
  const estimatedExpenditure = estimateTrainingExpenditure(sortedActivities);
  const isTrainingDay = activeTrainingCount > 0;
  const legacyFuelState = getLegacyFuelState(prioritySession.priority, options?.macrocycleContext);
  const baselineHydrationBoost = prioritySession.priority === 'double_session'
    ? 18
    : prioritySession.priority === 'sparring'
      ? 14
      : prioritySession.priority === 'boxing_practice'
        ? 10
        : prioritySession.priority === 'conditioning'
          ? 12
          : prioritySession.priority === 'heavy_sc'
            ? 8
            : prioritySession.priority === 'recovery'
              ? 4
              : 0;

  // 1. If active cut, cut protocol is the ultimate truth. 
  if (cutProtocol) {
    const cutCalories = calculateCaloriesFromMacros(
      cutProtocol.prescribed_protein,
      cutProtocol.prescribed_carbs,
      cutProtocol.prescribed_fat,
    );
    const deficitPercent = baseTargets.tdee > 0 ? Math.max(0, (baseTargets.tdee - cutCalories) / baseTargets.tdee) : 0;
    const scaledProtein = getProteinTarget({
      bodyweightLbs,
      deficitPercent,
      proteinModifier: baseTargets.proteinModifier,
      phase: options?.macrocycleContext?.phase ?? null,
    });
    const cutDistributed = distributeMacros({
      adjustedCalories: cutCalories,
      proteinTarget: Math.max(cutProtocol.prescribed_protein, scaledProtein),
    });
    const metabolicReadiness = options?.readinessProfile?.metabolicReadiness ?? 100;
    const cutReadinessCalories = isTrainingDay && metabolicReadiness < 60
      ? cutDistributed.calories + 100
      : cutDistributed.calories;
    const floorResult = applyFuelingFloor({
      targetCalories: cutReadinessCalories,
      estimatedExpenditure,
      leanMassKg,
      isTrainingDay,
      daysToWeighIn: options?.daysToWeighIn ?? cutProtocol.days_to_weigh_in,
      minimumEnergyAvailability: isTrainingDay && metabolicReadiness < 60 ? 23 : null,
      floorSource: isTrainingDay && metabolicReadiness < 60 ? 'cut_readiness_floor' : 'fueling_floor',
    });
    const finalDistributed = distributeMacros({
      adjustedCalories: floorResult.adjustedCalories,
      proteinTarget: cutDistributed.protein,
    });
    const reasonLines = ['Active weight cut protocol overrides the normal day engine.'];
    const recoveryNutritionFocus = inferRecoveryFocus({
      priority: prioritySession.priority,
      readinessProfile: options?.readinessProfile,
      hydrationBoostOz: baselineHydrationBoost,
    });
    const hydrationPlan = buildHydrationPlan({
      hydrationBoostOz: baselineHydrationBoost,
      priority: prioritySession.priority,
      recoveryFocus: recoveryNutritionFocus,
      readinessProfile: options?.readinessProfile,
      cutProtocol,
    });
    const traceLines = [...reasonLines, ...floorResult.traceLines];
    const sessionFuelingPlan = buildSessionFuelingPlan({
      priority: prioritySession.priority,
      priorityLabel: prioritySession.label,
      sessionLabel: prioritySession.sessionLabel,
      activity: prioritySession.activity,
      adjustedCalories: finalDistributed.calories,
      protein: finalDistributed.protein,
      carbs: finalDistributed.carbs,
      hydrationBoostOz: baselineHydrationBoost,
      recoveryFocus: recoveryNutritionFocus,
      readinessProfile: options?.readinessProfile,
      cutProtocol,
    });

    return {
      ...baseTargets,
      adjustedCalories: finalDistributed.calories,
      protein: finalDistributed.protein,
      carbs: finalDistributed.carbs,
      fat: finalDistributed.fat,
      source: floorResult.fuelingFloorTriggered ? 'weight_cut_protocol_safety_adjusted' as const : 'weight_cut_protocol' as const,
      fuelState: 'cut_protect',
      prioritySession: prioritySession.priority,
      deficitClass,
      recoveryNutritionFocus,
      sessionDemandScore: prioritySession.priority === 'recovery' ? 12 : clamp(Math.round(estimatedExpenditure / 4), 15, 90),
      hydrationBoostOz: baselineHydrationBoost,
      hydrationPlan,
      sessionFuelingPlan,
      reasonLines,
      energyAvailability: floorResult.energyAvailability,
      fuelingFloorTriggered: floorResult.fuelingFloorTriggered,
      deficitBankDelta: floorResult.deficitBankDelta,
      safetyWarning: floorResult.safetyWarning,
      safetyEvents: floorResult.safetyEvents,
      traceLines,
      message: cutProtocol.cut_phase
        ? `Weight cut protocol (${cutProtocol.cut_phase.replace(/_/g, ' ')})`
        : 'Following active weight cut macro targets.',
    };
  }

  // 2. If no active cut, apply daily activity adjustments to base targets
  const dayAdj = adjustNutritionForDay(baseTargets, sortedActivities, null);
  const readinessProfile = options?.readinessProfile ?? null;
  const neuralLow = (readinessProfile?.neuralReadiness ?? 100) < 60;
  const structuralLow = (readinessProfile?.structuralReadiness ?? 100) < 60;
  const metabolicLow = (readinessProfile?.metabolicReadiness ?? 100) < 60;
  const fightCamp = options?.macrocycleContext?.goalMode === 'fight_camp';
  const taperPhase = options?.macrocycleContext?.campPhase === 'taper';
  const peakPhase = options?.macrocycleContext?.campPhase === 'peak';
  const medPressure = options?.medStatus?.overall === 'at_risk' || options?.medStatus?.overall === 'missed';

  let calorieModifier = dayAdj.calorieModifier;
  let carbModifierPct = dayAdj.carbModifierPct;
  let proteinModifier = dayAdj.proteinModifier;
  let hydrationBoostOz = Math.max(dayAdj.hydrationBoostOz, baselineHydrationBoost);
  const reasonLines = [...dayAdj.reasons];

  if (!isTrainingDay) {
    calorieModifier = clamp(calorieModifier, -160, 40);
  } else {
    const positiveCap = taperPhase ? 180 : peakPhase ? 220 : fightCamp ? 280 : 240;
    const negativeCap = fightCamp ? -80 : -140;
    calorieModifier = clamp(calorieModifier, negativeCap, positiveCap);
  }

  if (medPressure && isTrainingDay && calorieModifier < 0) {
    calorieModifier = 0;
    reasonLines.push('Weekly MED exposure is under pressure, so the engine keeps fueling neutral instead of cutting the day deeper.');
  }

  if (neuralLow && isTrainingDay) {
    calorieModifier = Math.max(calorieModifier, 60);
    carbModifierPct = Math.max(carbModifierPct, 6);
    hydrationBoostOz += 8;
    reasonLines.push('Low neural readiness keeps around-session carbs and fluids in place to protect sharpness.');
  }

  if (structuralLow) {
    proteinModifier += 8;
    hydrationBoostOz += 4;
    reasonLines.push('Low structural readiness raises recovery emphasis so tissue support stays high.');
  }

  if (metabolicLow) {
    calorieModifier += isTrainingDay ? 120 : 60;
    carbModifierPct = Math.max(carbModifierPct, isTrainingDay ? 8 : 0);
    hydrationBoostOz += 12;
    reasonLines.push('Low metabolic readiness reduces extra deficit pressure and shifts support toward fluids, electrolytes, and easier carbs.');
  }

  if (fightCamp && isTrainingDay && prioritySession.priority === 'sparring' && !taperPhase) {
    calorieModifier = Math.max(calorieModifier, 140);
    carbModifierPct = Math.max(carbModifierPct, 10);
    hydrationBoostOz += 4;
    reasonLines.push('Fight-camp sparring days keep a moderate fuel bump so the key session is protected.');
  }

  calorieModifier = Math.round(calorieModifier);
  carbModifierPct = clamp(Math.round(carbModifierPct), -18, 18);
  proteinModifier = clamp(Math.round(proteinModifier), 0, 24);
  hydrationBoostOz = clamp(Math.round(hydrationBoostOz), 0, 32);

  const modifiedCalories = baseTargets.adjustedCalories + calorieModifier;
  const deficitPercent = baseTargets.tdee > 0 ? Math.max(0, (baseTargets.tdee - modifiedCalories) / baseTargets.tdee) : 0;
  const modifiedProtein = getProteinTarget({
    bodyweightLbs,
    deficitPercent,
    proteinModifier: baseTargets.proteinModifier,
    phase: options?.macrocycleContext?.phase ?? null,
  }) + proteinModifier;
  const distributed = distributeMacros({
    adjustedCalories: modifiedCalories,
    proteinTarget: modifiedProtein,
  });
  let modifiedCarbs = Math.max(0, Math.round(distributed.carbs * (1 + carbModifierPct / 100)));
  let modifiedFat = Math.round((modifiedCalories - (modifiedProtein * 4) - (modifiedCarbs * 4)) / 9);
  if (modifiedFat < 40) {
    const caloriesNeeded = (40 - modifiedFat) * 9;
    modifiedCarbs = Math.max(0, modifiedCarbs - Math.ceil(caloriesNeeded / 4));
    modifiedFat = 40;
  }
  const floorResult = applyFuelingFloor({
    targetCalories: calculateCaloriesFromMacros(modifiedProtein, modifiedCarbs, modifiedFat),
    estimatedExpenditure,
    leanMassKg,
    isTrainingDay,
    daysToWeighIn: options?.daysToWeighIn ?? null,
  });
  const finalDistributed = reconcileShiftedMacros({
    adjustedCalories: floorResult.adjustedCalories,
    proteinTarget: modifiedProtein,
    targetCarbs: modifiedCarbs,
  });
  const recoveryNutritionFocus = inferRecoveryFocus({
    priority: prioritySession.priority,
    readinessProfile,
    hydrationBoostOz,
  });
  const hydrationPlan = buildHydrationPlan({
    hydrationBoostOz,
    priority: prioritySession.priority,
    recoveryFocus: recoveryNutritionFocus,
    readinessProfile,
    cutProtocol: null,
  });
  const sessionFuelingPlan = buildSessionFuelingPlan({
    priority: prioritySession.priority,
    priorityLabel: prioritySession.label,
    sessionLabel: prioritySession.sessionLabel,
    activity: prioritySession.activity,
    adjustedCalories: finalDistributed.calories,
    protein: finalDistributed.protein,
    carbs: finalDistributed.carbs,
    hydrationBoostOz,
    recoveryFocus: recoveryNutritionFocus,
    readinessProfile,
    cutProtocol: null,
  });
  const reconciledCalories = finalDistributed.calories;

  return {
    ...baseTargets,
    adjustedCalories: reconciledCalories,
    protein: finalDistributed.protein,
    carbs: finalDistributed.carbs,
    fat: finalDistributed.fat,
    source: dayActivities.length > 0 ? 'daily_activity_adjusted' as const : 'base' as const,
    fuelState: legacyFuelState === 'active_recovery' && dayActivities.length === 0 ? 'rest' : legacyFuelState,
    prioritySession: prioritySession.priority,
    deficitClass,
    recoveryNutritionFocus,
    sessionDemandScore: Math.max(dayAdj.sessionDemandScore, clamp(Math.round(estimatedExpenditure / 5), 0, 95)),
    hydrationBoostOz,
    hydrationPlan,
    sessionFuelingPlan,
    reasonLines,
    energyAvailability: floorResult.energyAvailability,
    fuelingFloorTriggered: floorResult.fuelingFloorTriggered,
    deficitBankDelta: floorResult.deficitBankDelta,
    safetyWarning: floorResult.safetyWarning,
    safetyEvents: floorResult.safetyEvents,
    traceLines: [...reasonLines, ...floorResult.traceLines],
    message: dayActivities.length > 0 ? reasonLines.join(' ') : baseTargets.message,
  };
}

export function resolveDailyMacros(
  baseTargets: NutritionTargets,
  cutProtocol: DailyCutProtocolRow | null,
  dayActivities: DayActivity[],
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
