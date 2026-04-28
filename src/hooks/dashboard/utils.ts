import { calculateCaloriesFromMacros } from '../../../lib/utils/nutrition';

export interface DashboardNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

interface LoggedMacroEntry {
  logged_calories?: number | null;
  logged_protein?: number | null;
  logged_carbs?: number | null;
  logged_fat?: number | null;
}

export function toFightPrepPhase(
  phase: string | null | undefined,
): 'off-season' | 'pre-camp' | 'fight-camp' {
  if (phase === 'pre-camp' || phase === 'fight-camp') {
    return phase;
  }

  if (phase?.startsWith('camp-')) {
    return 'fight-camp';
  }

  return 'off-season';
}

export function computeActualNutrition(
  foodLog: LoggedMacroEntry[],
  totalWaterOz: number | null | undefined,
): DashboardNutritionTotals {
  const totals = foodLog.reduce<Omit<DashboardNutritionTotals, 'water'>>(
    (acc, entry) => ({
      protein: acc.protein + (entry.logged_protein ?? 0),
      carbs: acc.carbs + (entry.logged_carbs ?? 0),
      fat: acc.fat + (entry.logged_fat ?? 0),
      calories: 0,
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  );

  return {
    ...totals,
    calories: calculateCaloriesFromMacros(totals.protein, totals.carbs, totals.fat),
    water: totalWaterOz ?? 0,
  };
}

export function composePrescriptionMessage(
  adaptationMessage: string | null | undefined,
  bodyMassRecommendation: string | null | undefined,
): string | null {
  if (adaptationMessage && bodyMassRecommendation) {
    return `${bodyMassRecommendation}\n\n${adaptationMessage}`;
  }

  return adaptationMessage ?? bodyMassRecommendation ?? null;
}
