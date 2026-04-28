import { addDays, daysBetween, normalizeISODate } from '../utils/dates.ts';

export type BodyMassSupportPhase =
  | 'long_term_body_composition'
  | 'gradual_weight_class_preparation'
  | 'competition_week_body_mass_monitoring'
  | 'weigh_in_logistics'
  | 'post_weigh_in_recovery_tracking'
  | 'high_risk_review'
  | 'unknown';

export interface BodyMassTrainingConstraintPlan {
  status?: string | null;
  weigh_in_date?: string | null;
  weighInDate?: string | null;
  professionalReviewRequired?: boolean | null;
  riskLevel?: string | null;
  feasibilityStatus?: string | null;
}

export interface PostWeighInRecoverySupport {
  phases: Array<{
    name: string;
    timeWindow: string;
    fluidInstruction: string;
    foodInstruction: string;
    sodiumInstruction: string;
    targetFluidOz: number;
  }>;
  targetRegainLbs: number;
  totalFluidTargetLiters: number;
  totalSodiumTargetMg: number;
  hoursAvailable: number;
  targetWeightByFight: number;
  weightToRegainLbs: number;
  totalFluidOz: number;
  monitorMetrics: string[];
  message: string;
}

function dateValue(value: string | null | undefined): string | null {
  if (!value) return null;
  return normalizeISODate(value.slice(0, 10)) ?? normalizeISODate(value);
}

function planWeighInDate(plan: BodyMassTrainingConstraintPlan | null | undefined): string | null {
  return dateValue(plan?.weigh_in_date ?? plan?.weighInDate ?? null);
}

function round(value: number, precision = 10): number {
  return Math.round(value * precision) / precision;
}

export function getBodyMassSupportPhase(
  plan: BodyMassTrainingConstraintPlan | null | undefined,
  date: string,
): BodyMassSupportPhase {
  const weighInDate = planWeighInDate(plan);
  const currentDate = normalizeISODate(date);
  if (!weighInDate || !currentDate) return 'unknown';

  const daysToWeighIn = daysBetween(currentDate, weighInDate);
  if (daysToWeighIn < 0) return 'post_weigh_in_recovery_tracking';
  if (daysToWeighIn === 0) return 'weigh_in_logistics';
  if (daysToWeighIn <= 7) return 'competition_week_body_mass_monitoring';
  if (daysToWeighIn <= 56) return 'gradual_weight_class_preparation';
  return 'long_term_body_composition';
}

export function getBodyMassSupportDateRange(
  plan: BodyMassTrainingConstraintPlan | null | undefined,
  asOfDate: string,
): {
  competitionWeekStart: string | null;
  weighInDate: string | null;
} {
  const weighInDate = planWeighInDate(plan);
  const currentDate = normalizeISODate(asOfDate);
  if (!weighInDate || !currentDate) {
    return { competitionWeekStart: null, weighInDate };
  }

  const daysToWeighIn = Math.max(0, daysBetween(currentDate, weighInDate));
  return {
    competitionWeekStart: addDays(weighInDate, -Math.min(7, daysToWeighIn)),
    weighInDate,
  };
}

export function getBodyMassTrainingIntensityCap(
  plan: BodyMassTrainingConstraintPlan | null | undefined,
  date: string,
): number | null {
  if (!plan || plan.status !== 'active') return null;
  if (plan.professionalReviewRequired || plan.feasibilityStatus === 'unsafe' || plan.riskLevel === 'critical') {
    return 3;
  }

  const phase = getBodyMassSupportPhase(plan, date);
  if (phase === 'weigh_in_logistics') return 4;
  if (phase === 'competition_week_body_mass_monitoring') return 5;
  return null;
}

export function buildPostWeighInRecoverySupport(input: {
  weighInWeightLbs?: number | null;
  targetWeightLbs?: number | null;
  currentWeightLbs?: number | null;
  hoursToFight?: number | null;
}): PostWeighInRecoverySupport {
  const currentWeight = input.currentWeightLbs ?? input.weighInWeightLbs ?? input.targetWeightLbs ?? null;
  const targetWeight = input.targetWeightLbs ?? currentWeight ?? 0;
  const hoursAvailable = Math.max(0, Math.round(input.hoursToFight ?? 24));
  const totalFluidOz = currentWeight != null && currentWeight > 0
    ? Math.round(currentWeight * 0.35)
    : 0;
  const phaseFluidOz = Math.round(totalFluidOz / 3);

  return {
    phases: [
      {
        name: 'Post weigh-in check',
        timeWindow: '0-60 min',
        fluidInstruction: 'Sip steadily with familiar fluids and normal electrolyte support.',
        foodInstruction: 'Start with familiar carbohydrates and protein you have already practiced.',
        sodiumInstruction: 'Use normal familiar electrolyte support; do not force large boluses.',
        targetFluidOz: phaseFluidOz,
      },
      {
        name: 'Meal window',
        timeWindow: '1-4 hours',
        fluidInstruction: 'Continue steady sipping with meals.',
        foodInstruction: 'Use familiar meals that support glycogen and gut comfort.',
        sodiumInstruction: 'Keep seasoning familiar and predictable.',
        targetFluidOz: phaseFluidOz,
      },
      {
        name: 'Competition readiness',
        timeWindow: '4+ hours',
        fluidInstruction: 'Use thirst, urine color, stomach comfort, and coach feedback to pace intake.',
        foodInstruction: 'Keep food familiar and stop experimenting.',
        sodiumInstruction: 'Keep electrolyte choices familiar.',
        targetFluidOz: phaseFluidOz,
      },
    ],
    targetRegainLbs: 0,
    totalFluidTargetLiters: round(totalFluidOz / 33.814, 10),
    totalSodiumTargetMg: 0,
    hoursAvailable,
    targetWeightByFight: targetWeight,
    weightToRegainLbs: currentWeight == null ? 0 : Math.max(0, targetWeight - currentWeight),
    totalFluidOz,
    monitorMetrics: [
      'stomach comfort',
      'urine color',
      'dizziness or faintness',
      'body mass trend',
      'coach or clinician feedback',
    ],
    message: 'Post weigh-in recovery should use familiar foods, steady fluids, and symptom monitoring.',
  };
}
