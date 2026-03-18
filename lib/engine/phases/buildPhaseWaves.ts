import type { TrainingBlockContext } from '../types/training.ts';

export function getBuildPhaseWave(weekInCycle: number): TrainingBlockContext {
  const normalizedWeek = (((weekInCycle - 1) % 4) + 4) % 4 + 1;

  if (normalizedWeek === 4) {
    return {
      weekInBlock: 4,
      phase: 'pivot',
      volumeMultiplier: 0.72,
      intensityOffset: -1,
      focusBias: 'recovery',
      note: 'Deload wave to consolidate adaptation before the next build cycle.',
    };
  }

  return {
    weekInBlock: normalizedWeek as 1 | 2 | 3,
    phase: normalizedWeek === 1 ? 'accumulate' : normalizedWeek === 2 ? 'intensify' : 'realize',
    volumeMultiplier: normalizedWeek === 1 ? 1.0 : normalizedWeek === 2 ? 1.05 : 0.92,
    intensityOffset: normalizedWeek === 1 ? 0 : normalizedWeek === 2 ? 1 : 2,
    focusBias: normalizedWeek === 3 ? 'sport_specific' : 'full_body',
    note: normalizedWeek === 3
      ? 'Sharpen intensity while trimming volume before the deload week.'
      : 'Build-phase load wave is active.',
  };
}
