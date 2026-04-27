import type { Phase, ProteinTargetPolicy } from '../types.ts';
import { calculateCaloriesFromMacros } from '../../utils/nutrition.ts';

function getProteinPolicy(phase?: Phase | null): ProteinTargetPolicy {
  if (phase === 'fight-camp' || phase === 'camp-build' || phase === 'camp-peak' || phase === 'camp-taper') {
    return {
      baseProteinPerKg: 2.0,
      maxProteinPerKg: 3.1,
      deficitScalerCapPerKg: 1.1,
    };
  }

  return {
    baseProteinPerKg: 1.8,
    maxProteinPerKg: 2.4,
    deficitScalerCapPerKg: 0.6,
  };
}

export function getProteinTarget(input: {
  bodyweightLbs: number;
  deficitPercent: number;
  proteinModifier?: number;
  phase?: Phase | null;
}): number {
  const { bodyweightLbs, deficitPercent, proteinModifier = 1, phase = null } = input;
  const policy = getProteinPolicy(phase);
  const bodyweightKg = Math.max(0, bodyweightLbs * 0.453592);
  const deficitScaler = Math.min(Math.max(0, deficitPercent) * 4.0, policy.deficitScalerCapPerKg);
  const gramsPerKg = Math.min(
    policy.maxProteinPerKg,
    (policy.baseProteinPerKg + deficitScaler) * proteinModifier,
  );
  return Math.round(bodyweightKg * gramsPerKg);
}

export function distributeMacros(input: {
  adjustedCalories: number;
  proteinTarget: number;
  preferredFatPct?: number;
  minFatGrams?: number;
}): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  const {
    adjustedCalories,
    proteinTarget,
    preferredFatPct = 0.30,
    minFatGrams = 40,
  } = input;

  const fat = Math.max(minFatGrams, Math.round((adjustedCalories * preferredFatPct) / 9));
  const proteinCalories = proteinTarget * 4;
  const fatCalories = fat * 9;
  const remainingCalories = Math.max(0, adjustedCalories - proteinCalories - fatCalories);
  const carbs = Math.round(remainingCalories / 4);

  return {
    calories: calculateCaloriesFromMacros(proteinTarget, carbs, fat),
    protein: proteinTarget,
    carbs,
    fat,
  };
}
