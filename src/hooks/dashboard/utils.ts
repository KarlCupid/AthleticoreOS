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
  return foodLog.reduce<DashboardNutritionTotals>(
    (acc, entry) => ({
      ...acc,
      calories: acc.calories + (entry.logged_calories ?? 0),
      protein: acc.protein + (entry.logged_protein ?? 0),
      carbs: acc.carbs + (entry.logged_carbs ?? 0),
      fat: acc.fat + (entry.logged_fat ?? 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water: totalWaterOz ?? 0,
    },
  );
}

export function composePrescriptionMessage(
  adaptationMessage: string | null | undefined,
  cutRecommendation: string | null | undefined,
): string | null {
  if (adaptationMessage && cutRecommendation) {
    return `${cutRecommendation}\n\n${adaptationMessage}`;
  }

  return adaptationMessage ?? cutRecommendation ?? null;
}
