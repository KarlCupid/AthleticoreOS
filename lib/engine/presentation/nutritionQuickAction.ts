import type { DailyMission } from '../types/mission.ts';
import type { NutritionSafetyWarning } from '../types/nutrition.ts';
import type { NutritionQuickActionViewModel, QuickFuelIntent } from './types.ts';
import { humanizeCoachCopy } from './coachCopy.ts';

const SAFETY_WARNING_MESSAGES: Record<NutritionSafetyWarning, string | null> = {
  none: null,
  fueling_floor_applied:
    "We bumped calories up so you have enough for today's workload.",
  cut_readiness_floor_applied:
    'We raised calories to protect recovery while your cut and readiness are under strain.',
  low_energy_availability:
    'Your calories are too low for the work you are doing right now.',
  critical_energy_availability:
    'You are under-fueled right now. Eat enough before you train.',
  cumulative_ea_deficit_red_flag:
    'Your recent fueling deficit is adding up. Eat enough today before pushing training.',
};

function buildPreSessionCue(carbsG: number): string | null {
  if (!carbsG) return null;
  return `Have ${carbsG}g of carbs 60-90 min before training.`;
}

function buildIntraSessionCue(carbsG: number): string | null {
  if (!carbsG) return null;
  return `Have ${carbsG}g of carbs during training if it runs longer than 60 min.`;
}

function buildPostSessionCue(proteinG: number): string | null {
  if (!proteinG) return null;
  return `Get ${proteinG}g of protein within 30 min after training.`;
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
      fuelDirectiveHeadline: 'Stay on top of your food today.',
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
    trainingDirective.sessionRole !== 'recover' && trainingDirective.sessionRole !== 'rest';

  return {
    fuelDirectiveHeadline: humanizeCoachCopy(
      fuelDirective.message || 'Stay on top of your food today.',
    ),
    preSessionCue: buildPreSessionCue(fuelDirective.preSessionCarbsG),
    intraSessionCue: buildIntraSessionCue(fuelDirective.intraSessionCarbsG),
    postSessionCue: buildPostSessionCue(fuelDirective.postSessionProteinG),
    quickIntentOptions: buildQuickIntents(mission, totals, isTrainingDay),
    isTrainingDay,
    safetyWarning: SAFETY_WARNING_MESSAGES[fuelDirective.safetyWarning] ?? null,
  };
}
