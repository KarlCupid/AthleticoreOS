import type { ActivityType } from '../types/schedule.ts';
import type { NutritionSafetyWarning } from '../types/nutrition.ts';

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
    const multiplier = ACTIVITY_MULTIPLIERS[activity.activity_type] ?? ACTIVITY_MULTIPLIERS.other;
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

export function applyFuelingFloor(input: {
  targetCalories: number;
  estimatedExpenditure: number;
  leanMassKg: number;
  isTrainingDay: boolean;
  daysToWeighIn?: number | null;
}): {
  adjustedCalories: number;
  energyAvailability: number;
  fuelingFloorTriggered: boolean;
  deficitBankDelta: number;
  safetyWarning: NutritionSafetyWarning;
  traceLines: string[];
} {
  const { targetCalories, estimatedExpenditure, leanMassKg, isTrainingDay, daysToWeighIn = null } = input;
  const energyAvailability = calculateEnergyAvailability(targetCalories, estimatedExpenditure, leanMassKg);
  const traceLines: string[] = [];

  if (!isTrainingDay) {
    return {
      adjustedCalories: targetCalories,
      energyAvailability,
      fuelingFloorTriggered: false,
      deficitBankDelta: 0,
      safetyWarning: getNutritionSafetyWarning(energyAvailability, false, daysToWeighIn),
      traceLines,
    };
  }

  const hardFloor = (20 * leanMassKg) + estimatedExpenditure;
  const trainingFloor = (30 * leanMassKg) + estimatedExpenditure;
  const safeCalories = Math.max(targetCalories, hardFloor, trainingFloor);
  const adjustedEA = calculateEnergyAvailability(safeCalories, estimatedExpenditure, leanMassKg);
  const triggered = safeCalories > targetCalories;

  if (triggered) {
    traceLines.push(`Fueling floor activated: EA protected from ${energyAvailability.toFixed(1)} to ${adjustedEA.toFixed(1)} kcal/kg FFM.`);
  }

  return {
    adjustedCalories: safeCalories,
    energyAvailability: adjustedEA,
    fuelingFloorTriggered: triggered,
    deficitBankDelta: triggered ? Math.round(safeCalories - targetCalories) : 0,
    safetyWarning: getNutritionSafetyWarning(adjustedEA, true, daysToWeighIn),
    traceLines,
  };
}
