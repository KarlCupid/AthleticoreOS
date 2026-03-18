import type { DailyMission } from '../types/mission.ts';
import type { NutritionSafetyWarning } from '../types/nutrition.ts';
import type { NutritionQuickActionViewModel, QuickFuelIntent } from './types.ts';

const SAFETY_WARNING_MESSAGES: Record<NutritionSafetyWarning, string | null> = {
  none: null,
  fueling_floor_applied:
    'Your calorie target was raised to meet the minimum for your training load.',
  low_energy_availability:
    'Your calorie target is below the safe minimum for this training level.',
  critical_energy_availability:
    'Critical: energy availability is too low — fueling is required today.',
};

function buildPreSessionCue(carbsG: number): string | null {
  if (!carbsG) return null;
  return `Have ${carbsG}g carbs 60–90 min before your session.`;
}

function buildIntraSessionCue(carbsG: number): string | null {
  if (!carbsG) return null;
  return `${carbsG}g carbs during your session if it runs over 60 min.`;
}

function buildPostSessionCue(proteinG: number): string | null {
  if (!proteinG) return null;
  return `Get ${proteinG}g protein within 30 min of finishing.`;
}

function buildQuickIntents(
  mission: DailyMission,
  totals: { calories: number; protein: number; carbs: number; fat: number },
  isTrainingDay: boolean,
): QuickFuelIntent[] {
  const { fuelDirective } = mission;
  const remaining = {
    cal: Math.max(0, fuelDirective.calories - totals.calories),
    protein: Math.max(0, fuelDirective.protein - totals.protein),
    carbs: Math.max(0, fuelDirective.carbs - totals.carbs),
    fat: Math.max(0, fuelDirective.fat - totals.fat),
  };

  const intents: QuickFuelIntent[] = [];

  if (isTrainingDay && fuelDirective.preSessionCarbsG > 0) {
    const pct = 0.3;
    intents.push({
      id: 'pre_workout',
      label: 'Pre-workout snack',
      calTarget: Math.round(remaining.cal * pct),
      proteinTarget: Math.round(remaining.protein * 0.15),
      carbTarget: Math.round(remaining.carbs * pct),
      fatTarget: Math.round(remaining.fat * 0.1),
    });
  }

  intents.push({
    id: 'recovery_meal',
    label: isTrainingDay ? 'Recovery meal' : 'Main meal',
    calTarget: Math.round(remaining.cal * 0.4),
    proteinTarget: Math.round(remaining.protein * 0.4),
    carbTarget: Math.round(remaining.carbs * 0.35),
    fatTarget: Math.round(remaining.fat * 0.35),
  });

  intents.push({
    id: 'balanced_meal',
    label: 'Balanced meal',
    calTarget: Math.round(remaining.cal * 0.35),
    proteinTarget: Math.round(remaining.protein * 0.3),
    carbTarget: Math.round(remaining.carbs * 0.3),
    fatTarget: Math.round(remaining.fat * 0.3),
  });

  return intents;
}

export function buildNutritionQuickActionViewModel(
  mission: DailyMission | null,
  totals: { calories: number; protein: number; carbs: number; fat: number },
): NutritionQuickActionViewModel {
  if (!mission) {
    return {
      fuelDirectiveHeadline: 'Hit your targets today.',
      preSessionCue: null,
      postSessionCue: null,
      intraSessionCue: null,
      quickIntentOptions: [],
      isTrainingDay: false,
      safetyWarning: null,
    };
  }

  const { fuelDirective, trainingDirective } = mission;
  const isTrainingDay =
    trainingDirective.sessionRole !== 'recover';

  return {
    fuelDirectiveHeadline: fuelDirective.message || 'Hit your targets today.',
    preSessionCue: buildPreSessionCue(fuelDirective.preSessionCarbsG),
    intraSessionCue: buildIntraSessionCue(fuelDirective.intraSessionCarbsG),
    postSessionCue: buildPostSessionCue(fuelDirective.postSessionProteinG),
    quickIntentOptions: buildQuickIntents(mission, totals, isTrainingDay),
    isTrainingDay,
    safetyWarning: SAFETY_WARNING_MESSAGES[fuelDirective.safetyWarning] ?? null,
  };
}
