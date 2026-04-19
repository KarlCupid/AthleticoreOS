import type { ActivityType } from '../types/schedule.ts';
import type { NutritionSafetyEvent, NutritionSafetyWarning } from '../types/nutrition.ts';

export interface PlannedActivityLoad {
  activity_type: ActivityType;
  expected_intensity: number;
  estimated_duration_min: number;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  boxing_practice: 7.5,
  sparring: 8.5,
  sc: 6.5,
  running: 7,
  road_work: 7,
  conditioning: 8,
  active_recovery: 3,
  rest: 0,
  other: 5,
};

export function estimateTrainingExpenditure(dayActivities: PlannedActivityLoad[]): number {
  return Math.round(dayActivities.reduce((total, activity) => {
    const baseMultiplier = ACTIVITY_MULTIPLIERS[activity.activity_type] ?? ACTIVITY_MULTIPLIERS.other;
    const multiplier = activity.activity_type === 'sparring'
      ? 7.5 + (Math.max(0, activity.expected_intensity) / 6) * 1.5
      : baseMultiplier;
    const durationHours = Math.max(0, activity.estimated_duration_min) / 60;
    const intensityFactor = Math.max(0.5, activity.expected_intensity / 6);
    return total + (multiplier * 60 * durationHours * intensityFactor);
  }, 0));
}

export function estimateLeanMassKg(bodyweightLbs: number): number {
  const weightKg = bodyweightLbs * 0.453592;
  return Math.max(40, Math.round(weightKg * 0.85 * 10) / 10);
}

export function calculateEnergyAvailability(
  targetCalories: number,
  estimatedExpenditure: number,
  leanMassKg: number,
): number {
  if (leanMassKg <= 0) return 0;
  return Math.round((((targetCalories - estimatedExpenditure) / leanMassKg) * 10)) / 10;
}

export function getNutritionSafetyWarning(
  energyAvailability: number,
  isTrainingDay: boolean,
  daysToWeighIn: number | null,
): NutritionSafetyWarning {
  if (energyAvailability < 20) return 'critical_energy_availability';
  if (isTrainingDay && daysToWeighIn != null && daysToWeighIn <= 7 && energyAvailability < 25) {
    return 'low_energy_availability';
  }
  if (isTrainingDay && energyAvailability < 30) return 'fueling_floor_applied';
  return 'none';
}

function getEnergyAvailabilityFloor(input: {
  isTrainingDay: boolean;
  daysToWeighIn: number | null;
}): number {
  // 20 kcal/kg FFM is reserved for the final cut window; everyday training floors stay higher.
  if (!input.isTrainingDay) return 20;
  if (input.daysToWeighIn != null && input.daysToWeighIn <= 3) return 20;
  if (input.daysToWeighIn != null && input.daysToWeighIn <= 7) return 23;
  return 25;
}

export function applyFuelingFloor(input: {
  targetCalories: number;
  estimatedExpenditure: number;
  leanMassKg: number;
  isTrainingDay: boolean;
  daysToWeighIn?: number | null;
  minimumEnergyAvailability?: number | null;
  floorSource?: 'fueling_floor' | 'cut_readiness_floor';
}): {
  adjustedCalories: number;
  energyAvailability: number;
  fuelingFloorTriggered: boolean;
  deficitBankDelta: number;
  safetyWarning: NutritionSafetyWarning;
  safetyEvents: NutritionSafetyEvent[];
  traceLines: string[];
} {
  const {
    targetCalories,
    estimatedExpenditure,
    leanMassKg,
    isTrainingDay,
    daysToWeighIn = null,
    minimumEnergyAvailability = null,
    floorSource = 'fueling_floor',
  } = input;
  const energyAvailability = calculateEnergyAvailability(targetCalories, estimatedExpenditure, leanMassKg);
  const traceLines: string[] = [];
  const safetyEvents: NutritionSafetyEvent[] = [];

  if (!isTrainingDay) {
    return {
      adjustedCalories: targetCalories,
      energyAvailability,
      fuelingFloorTriggered: false,
      deficitBankDelta: 0,
      safetyWarning: getNutritionSafetyWarning(energyAvailability, false, daysToWeighIn),
      safetyEvents,
      traceLines,
    };
  }

  const energyAvailabilityFloor = Math.max(
    getEnergyAvailabilityFloor({ isTrainingDay, daysToWeighIn }),
    minimumEnergyAvailability ?? 0,
  );
  const hardFloor = (20 * leanMassKg) + estimatedExpenditure;
  const trainingFloor = (energyAvailabilityFloor * leanMassKg) + estimatedExpenditure;
  const safeCalories = Math.max(targetCalories, hardFloor, trainingFloor);
  const adjustedEA = calculateEnergyAvailability(safeCalories, estimatedExpenditure, leanMassKg);
  const triggered = safeCalories > targetCalories;

  if (triggered) {
    traceLines.push(`Fueling floor activated: EA protected from ${energyAvailability.toFixed(1)} to ${adjustedEA.toFixed(1)} kcal/kg FFM.`);
    safetyEvents.push({
      code: floorSource === 'cut_readiness_floor' ? 'cut_readiness_floor_applied' : 'fueling_floor_applied',
      source: floorSource,
      priorValue: targetCalories,
      adjustedValue: safeCalories,
      reason: `Energy availability floor of ${energyAvailabilityFloor} kcal/kg FFM was enforced.`,
    });
  }

  return {
    adjustedCalories: safeCalories,
    energyAvailability: adjustedEA,
    fuelingFloorTriggered: triggered,
    deficitBankDelta: triggered ? Math.round(safeCalories - targetCalories) : 0,
    safetyWarning: floorSource === 'cut_readiness_floor' && triggered
      ? 'cut_readiness_floor_applied'
      : getNutritionSafetyWarning(adjustedEA, true, daysToWeighIn),
    safetyEvents,
    traceLines,
  };
}
