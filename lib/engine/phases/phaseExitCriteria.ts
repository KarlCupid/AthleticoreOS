import type { ReadinessState } from '../types/foundational.ts';

export interface PhaseExitCriteria {
  minACWR: number;
  maxACWR: number;
  minReadiness: ReadinessState;
}

export const PHASE_EXIT_CRITERIA: Record<'base' | 'build' | 'peak', PhaseExitCriteria> = {
  base: { minACWR: 0.8, maxACWR: 1.2, minReadiness: 'Caution' },
  build: { minACWR: 0.8, maxACWR: 1.3, minReadiness: 'Caution' },
  peak: { minACWR: 0.7, maxACWR: 1.1, minReadiness: 'Prime' },
};

export function getPhaseExtensionDays(input: {
  phase: keyof typeof PHASE_EXIT_CRITERIA;
  acwr: number;
  readinessState: ReadinessState;
}): number {
  const criteria = PHASE_EXIT_CRITERIA[input.phase];
  const readinessOrder: Record<ReadinessState, number> = { Depleted: 0, Caution: 1, Prime: 2 };

  let misses = 0;
  if (input.acwr < criteria.minACWR || input.acwr > criteria.maxACWR) misses += 1;
  if (readinessOrder[input.readinessState] < readinessOrder[criteria.minReadiness]) misses += 1;

  return Math.min(3, misses);
}
