import { calculateCaloriesFromMacros } from '../../utils/nutrition.ts';

export function getProteinTarget(input: {
  bodyweightLbs: number;
  deficitPercent: number;
  proteinModifier?: number;
}): number {
  const { bodyweightLbs, deficitPercent, proteinModifier = 1 } = input;
  const baseProtein = 1.0;
  const deficitScaler = Math.min(Math.max(0, deficitPercent) * 2.0, 0.4);
  return Math.round(bodyweightLbs * (baseProtein + deficitScaler) * proteinModifier);
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
