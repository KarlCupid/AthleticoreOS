import type { HydrationInput, HydrationResult } from './types.ts';
import type { CutHydrationInput, CutHydrationResult } from './types.ts';

function round(value: number): number {
  return Math.round(value);
}

function baselineFluidOz(weightLbs: number): number {
  return round(weightLbs * 0.67);
}

/**
 * Hydration guidance is now baseline support only. Weight-class decisions are
 * owned by the Body Mass and Weight-Class Management Engine.
 */
export function getHydrationProtocol(input: HydrationInput): HydrationResult {
  if (input.currentWeightLbs <= 0) {
    throw new Error('currentWeightLbs must be a positive number');
  }

  const baseFluidOz = baselineFluidOz(input.currentWeightLbs);
  const phaseMultiplier = input.phase === 'fight-camp' || input.phase.startsWith('camp-')
    ? 1.1
    : input.phase === 'pre-camp'
      ? 1.05
      : 1;
  const velocityBoostOz =
    input.weeklyVelocityLbs != null && input.weeklyVelocityLbs < -2
      ? Math.min(12, round((Math.abs(input.weeklyVelocityLbs) - 2) * 6 + 6))
      : 0;
  const dailyFluidOz = round(baseFluidOz * phaseMultiplier) + velocityBoostOz;

  return {
    dailyWaterOz: dailyFluidOz,
    waterLoadOz: null,
    shedCapPercent: 0,
    shedCapLbs: 0,
    message: velocityBoostOz > 0
      ? `Baseline fluid target: ${dailyFluidOz} oz. Rapid body-mass change is present, so keep intake steady and review the trend.`
      : `Baseline fluid target: ${dailyFluidOz} oz. Keep intake steady and familiar.`,
  };
}

export function getCutHydrationProtocol(input: CutHydrationInput): CutHydrationResult {
  const dailyFluidOz = input.baseHydrationOz > 0
    ? round(input.baseHydrationOz)
    : baselineFluidOz(input.currentWeightLbs);

  return {
    dailyWaterOz: dailyFluidOz,
    instruction: `${dailyFluidOz} oz baseline support. The app does not generate acute scale-based fluid tactics.`,
    sodiumInstruction: 'Keep sodium and electrolytes familiar and predictable.',
    isRestricting: false,
  };
}
