import type { BiologyInput, BiologyResult, CyclePhase } from './types.ts';

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - cycleDay: number (1–28, from athlete's cycle tracking input)
 *
 * Returns: BiologyResult
 *   - cyclePhase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal-early' | 'luteal-late'
 *   - cardioModifier: number (multiplier for cardio intensity, 1.0 = normal)
 *   - proteinModifier: number (multiplier for protein target, 1.0 = normal)
 *   - message: string (coaching guidance)
 *
 * If cycleDay is 20–28, message is exactly:
 *   'Your body is working harder internally this week. We are dialing back the cardio intensity today and bumping up your protein.'
 *
 * Pure synchronous function. No database queries.
 * Only call when athlete_profiles.cycle_tracking is TRUE
 * and athlete_profiles.biological_sex is 'female'.
 */
export function adjustForBiology({ cycleDay, energyDeficitPercent = null }: BiologyInput): BiologyResult {
  if (!Number.isInteger(cycleDay) || cycleDay < 1 || cycleDay > 28) {
    throw new Error('cycleDay must be an integer between 1 and 28');
  }

  let cyclePhase: CyclePhase;
  let cardioModifier: number;
  let proteinModifier: number;
  let message: string;

  if (cycleDay <= 5) {
    cyclePhase = 'menstrual';
    cardioModifier = 0.85;
    proteinModifier = 1.0;
    message =
      'Early cycle. Energy may be lower. We are keeping intensity moderate and focusing on technique work.';
  } else if (cycleDay <= 13) {
    cyclePhase = 'follicular';
    cardioModifier = 1.1;
    proteinModifier = 1.0;
    message =
      'Follicular phase. Your body is primed for hard work. Push the intensity today.';
  } else if (cycleDay <= 15) {
    cyclePhase = 'ovulatory';
    cardioModifier = 1.08;
    proteinModifier = 1.0;
    message =
      'Ovulation window. Strength is peaking but watch your joints. Warm up thoroughly.';
  } else if (cycleDay <= 19) {
    cyclePhase = 'luteal-early';
    cardioModifier = 0.95;
    proteinModifier = (energyDeficitPercent ?? 0) > 5 ? 1.1 : 1.05;
    message =
      'Early luteal phase. Metabolism is ramping up. Slight protein bump to match.';
  } else {
    cyclePhase = 'luteal-late';
    cardioModifier = 0.8;
    proteinModifier = (energyDeficitPercent ?? 0) > 5 ? 1.15 : 1.05;
    message =
      'Your body is working harder internally this week. We are dialing back the cardio intensity today and bumping up your protein.';
  }

  return { cyclePhase, cardioModifier, proteinModifier, message };
}
