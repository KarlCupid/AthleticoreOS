import type { HydrationInput, HydrationResult } from './types.ts';
import type { CutHydrationInput, CutHydrationResult } from './types.ts';

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - phase: 'off-season' | 'pre-camp' | 'fight-camp' (from athlete_profiles.phase)
 *   - fightStatus: 'amateur' | 'pro' (from athlete_profiles.fight_status)
 *   - currentWeightLbs: number (from today's morning_weight in Daily_Checkins)
 *   - targetWeightLbs: number (from athlete_profiles.target_weight)
 *
 * Returns: HydrationResult
 *   - dailyWaterOz: number (recommended daily intake in fl oz)
 *   - waterLoadOz: number | null (extra water-load amount for fight-camp, null otherwise)
 *   - shedCapPercent: number (max water-weight shed as % of body weight)
 *   - shedCapLbs: number (max shed in absolute lbs)
 *   - message: string (coaching guidance)
 *
 * Amateur athletes are capped at 3% body weight water shed.
 * Pro athletes may shed up to 5% during fight-camp.
 *
 * Pure synchronous function. No database queries.
 */
export function getHydrationProtocol(input: HydrationInput): HydrationResult {
  if (input.currentWeightLbs <= 0) {
    throw new Error('currentWeightLbs must be a positive number');
  }

  const baseWaterOz = input.currentWeightLbs * 0.67;

  let phaseMultiplier: number;
  let waterLoadOz: number | null = null;

  switch (input.phase) {
    case 'off-season':
      phaseMultiplier = 1.0;
      break;
    case 'pre-camp':
      phaseMultiplier = 1.15;
      break;
    case 'fight-camp':
    case 'camp-base':
    case 'camp-build':
    case 'camp-peak':
    case 'camp-taper':
      phaseMultiplier = 1.3;
      waterLoadOz = Math.round(baseWaterOz * 0.5);
      break;
    default:
      phaseMultiplier = 1.0;
      break;
  }

  const dailyWaterOz = Math.round(baseWaterOz * phaseMultiplier);

  // Velocity-aware hydration boost for rapid weight loss
  let velocityBoostOz = 0;
  if (input.weeklyVelocityLbs != null && input.weeklyVelocityLbs < -2.0) {
    // Scale boost: -2.0 → +8oz, -3.0 → +16oz, capped at 16
    const lossRate = Math.abs(input.weeklyVelocityLbs);
    velocityBoostOz = Math.min(16, Math.round((lossRate - 2.0) * 8 + 8));
  }

  const totalDailyWaterOz = dailyWaterOz + velocityBoostOz;

  const shedCapPercent = input.fightStatus === 'amateur' ? 3 : 5;
  const shedCapLbs =
    Math.round((input.currentWeightLbs * shedCapPercent) / 100 * 10) / 10;

  const weightGapLbs = input.currentWeightLbs - input.targetWeightLbs;
  const waterCutNeeded = Math.max(0, weightGapLbs);

  let message: string;

  if (input.phase === 'fight-camp' || input.phase.startsWith('camp-')) {
    if (waterCutNeeded > shedCapLbs) {
      message = `You need to drop ${waterCutNeeded.toFixed(1)} lbs but your safe water cut cap is ${shedCapLbs.toFixed(1)} lbs. The rest must come from diet over the camp. Talk to your coach.`;
    } else {
      message = `Fight camp hydration: drink ${totalDailyWaterOz} oz daily. Water load with an additional ${waterLoadOz} oz. Your safe water shed limit is ${shedCapLbs.toFixed(1)} lbs.`;
    }
  } else if (input.phase === 'pre-camp') {
    message = `Pre-camp hydration: ${totalDailyWaterOz} oz daily. Building your hydration base for camp.`;
  } else {
    message = `Off-season target: ${totalDailyWaterOz} oz daily. Stay consistent.`;
  }

  if (velocityBoostOz > 0) {
    message += ` Added ${velocityBoostOz} oz for aggressive cut recovery.`;
  }

  return {
    dailyWaterOz: totalDailyWaterOz,
    waterLoadOz,
    shedCapPercent,
    shedCapLbs,
    message,
  };
}

// ─── getCutHydrationProtocol ───────────────────────────────────

/**
 * Overrides standard hydration during an active weight cut.
 * Called when athlete has an active_cut_plan_id and the cut phase
 * requires phase-specific water targets.
 *
 * @ANTI-WIRING:
 *   - cutPhase: CutPhase (from computeDailyCutProtocol)
 *   - daysToWeighIn: number
 *   - currentWeightLbs: number
 *   - baseHydrationOz: number (from getHydrationProtocol().dailyWaterOz)
 *   - fightStatus: FightStatus
 */
export function getCutHydrationProtocol(input: CutHydrationInput): CutHydrationResult {
  const { cutPhase, daysToWeighIn, currentWeightLbs, baseHydrationOz, fightStatus } = input;
  const shedCapPct = fightStatus === 'amateur' ? 3 : 5;

  switch (cutPhase) {
    case 'chronic':
    case 'intensified': {
      const oz = Math.round(baseHydrationOz * (cutPhase === 'intensified' ? 1.15 : 1.05));
      return {
        dailyWaterOz: oz,
        instruction: `${oz} oz — stay well hydrated. Dehydration slows fat metabolism.`,
        sodiumInstruction: 'Normal sodium intake.',
        isRestricting: false,
      };
    }

    case 'fight_week_load': {
      const multiplier = daysToWeighIn >= 6 ? 2.0 : 1.5;
      const oz = Math.round(baseHydrationOz * multiplier);
      return {
        dailyWaterOz: oz,
        instruction: `${oz} oz — SUPERHYDRATION PHASE. Drink aggressively. This loads your body with water so you can shed it quickly later.`,
        sodiumInstruction: daysToWeighIn >= 6 ? 'Normal to slightly elevated — sodium helps water retention during loading.' : 'Normal.',
        isRestricting: false,
      };
    }

    case 'fight_week_cut': {
      const ozByDay: Record<number, number> = { 3: 64, 2: 32, 1: 16 };
      const oz = ozByDay[daysToWeighIn] ?? 64;
      return {
        dailyWaterOz: oz,
        instruction: `${oz} oz maximum — WATER RESTRICTION PHASE. Sip slowly throughout the day. Do not gulp.`,
        sodiumInstruction: daysToWeighIn === 3 ? 'Minimal sodium — under 500mg.' : 'Zero added sodium. Avoid all processed foods.',
        isRestricting: true,
      };
    }

    case 'weigh_in': {
      return {
        dailyWaterOz: 8,
        instruction: 'Sips only (8 oz max) until after weigh-in.',
        sodiumInstruction: 'Zero sodium until after weigh-in.',
        isRestricting: true,
      };
    }

    case 'rehydration': {
      const oz = Math.round(currentWeightLbs * 0.7);
      const shedCapLbs = Math.round((currentWeightLbs * shedCapPct) / 100 * 10) / 10;
      return {
        dailyWaterOz: oz,
        instruction: `${oz} oz — REHYDRATION PHASE. Sip steadily every 15-20 minutes. Do not chug.`,
        sodiumInstruction: `Elevated sodium — use ORS or electrolyte drinks for first 2 hours. Max safe water regain: ~${shedCapLbs} lbs.`,
        isRestricting: false,
      };
    }
  }
}
