import type { ReadinessState, TrainingAge } from '../types.ts';
import { calibrateBudgetValue } from './calibration.ts';

const BASELINE_BUDGETS: Record<TrainingAge, { fresh: number; moderate: number; depleted: number }> = {
  novice: { fresh: 50, moderate: 30, depleted: 10 },
  intermediate: { fresh: 65, moderate: 40, depleted: 15 },
  advanced: { fresh: 80, moderate: 55, depleted: 25 },
};

const MAX_BUDGETS: Record<TrainingAge, number> = {
  novice: 62,
  intermediate: 78,
  advanced: 95,
};

export function getBaselineCNSBudget(trainingAge: TrainingAge): { fresh: number; moderate: number; depleted: number } {
  return BASELINE_BUDGETS[trainingAge];
}

export function getCalibratedCNSBudget(input: {
  readinessState: ReadinessState;
  trainingAge: TrainingAge;
  complianceHistory28d?: number[];
}): number {
  const { readinessState, trainingAge, complianceHistory28d = [] } = input;
  const baseline = BASELINE_BUDGETS[trainingAge];
  const current = readinessState === 'Prime'
    ? baseline.fresh
    : readinessState === 'Caution'
      ? baseline.moderate
      : baseline.depleted;

  const calibrated = calibrateBudgetValue(current, complianceHistory28d);
  return Math.max(8, Math.min(MAX_BUDGETS[trainingAge], calibrated));
}
