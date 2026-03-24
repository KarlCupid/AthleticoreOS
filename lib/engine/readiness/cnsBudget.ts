import type { ReadinessState, TrainingAge } from '../types.ts';
import { calibrateBudgetValue } from './calibration.ts';

const BASELINE_BUDGETS: Record<TrainingAge, { fresh: number; moderate: number; depleted: number }> = {
  novice: { fresh: 55, moderate: 35, depleted: 12 },
  intermediate: { fresh: 72, moderate: 48, depleted: 18 },
  advanced: { fresh: 88, moderate: 62, depleted: 28 },
};

const MAX_BUDGETS: Record<TrainingAge, number> = {
  novice: 68,
  intermediate: 86,
  advanced: 102,
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
  return Math.max(12, Math.min(MAX_BUDGETS[trainingAge], calibrated));
}
