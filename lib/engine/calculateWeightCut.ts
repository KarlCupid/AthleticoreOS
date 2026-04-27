import type {
  CutPlanInput,
  CutPlanResult,
  CutPhaseDates,
  CutPhase,
  CutSafetyFlag,
  DailyCutProtocolInput,
  DailyCutProtocolResult,
  StallDetectionInput,
  StallDetectionResult,
  CarbCycleInput,
  CarbCycleResult,
  CutSafetyInput,
  RehydrationInput,
  RehydrationProtocolResult,
  RehydrationPhase,
  WeightCutPlanRow,
} from './types/weight_cut.ts';
import type { FightStatus } from './types/foundational.ts';
import { getHydrationProtocol, getCutHydrationProtocol } from './getHydrationProtocol.ts';
import { formatLocalDate } from '../utils/date.ts';
import {
  computeRehydrationFluidTargetLiters,
  evaluateCutPlanSafety,
  getPolicyWaterCutPct,
  isAgeUnknown,
  isTeenAthlete,
  toCutPlanWarning,
} from './safety/policy.ts';

/**
 * @ANTI-WIRING:
 * All functions in this file are pure synchronous. No database queries.
 * Service layer (lib/api/weightCutService.ts) handles persistence.
 *
 * Data flow:
 *   1. generateCutPlan() â€” called once when athlete starts a cut
 *   2. computeDailyCutProtocol() â€” called every day by useDashboardData
 *   3. detectStall() â€” called during chronic/intensified phases
 *   4. computeCarbCycle() â€” called inside computeDailyCutProtocol
 *   5. validateCutSafety() â€” called inside computeDailyCutProtocol
 *   6. computeRehydrationProtocol() â€” called when cut_phase === 'rehydration'
 */

// â”€â”€â”€ Date Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86400000
  );
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function getWaterCutShare(totalCutPct: number): number {
  if (totalCutPct >= 12) return 0.35;
  if (totalCutPct >= 10) return 0.32;
  if (totalCutPct >= 7) return 0.28;
  if (totalCutPct >= 4) return 0.22;
  return 0.15;
}

function computeDailyTargetOnCurve(plan: WeightCutPlanRow, dateStr: string): number {
  const totalDays = Math.max(0, daysBetween(plan.plan_created_date, plan.weigh_in_date));
  if (totalDays === 0) return roundToTenth(plan.target_weight);

  const finalCutDays = 3;
  const finalCutStart = addDays(plan.weigh_in_date, -finalCutDays);
  const preFinalCutTarget = roundToTenth(plan.target_weight + Math.max(0, plan.water_cut_allocation_lbs));

  if (dateStr < finalCutStart) {
    const dietDays = Math.max(1, daysBetween(plan.plan_created_date, finalCutStart));
    const elapsedDietDays = Math.max(0, Math.min(dietDays, daysBetween(plan.plan_created_date, dateStr)));
    const progress = elapsedDietDays / dietDays;
    const interpolatedWeight = plan.start_weight + ((preFinalCutTarget - plan.start_weight) * progress);

    return roundToTenth(interpolatedWeight);
  }

  const finalDays = Math.max(1, daysBetween(finalCutStart, plan.weigh_in_date));
  const elapsedFinalDays = Math.max(0, Math.min(finalDays, daysBetween(finalCutStart, dateStr)));
  const progress = elapsedFinalDays / finalDays;
  const interpolatedWeight = preFinalCutTarget + ((plan.target_weight - preFinalCutTarget) * progress);

  return roundToTenth(interpolatedWeight);
}

// â”€â”€â”€ generateCutPlan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Validates the proposed cut and computes all phase boundaries.
 * Called once when the athlete activates a weight cut plan.
 *
 * @ANTI-WIRING UI Parameters:
 *   - startWeight: number (getEffectiveWeight())
 *   - targetWeight: number (athlete-entered target or weight class max)
 *   - fightDate: string (athlete_profiles.fight_date)
 *   - weighInDate: string (athlete-entered, often fight_date - 1)
 *   - fightStatus: FightStatus (athlete_profiles.fight_status)
 *   - biologicalSex: 'male' | 'female' (athlete_profiles.biological_sex)
 *   - sport: CutSport
 */
export function generateCutPlan(input: CutPlanInput): CutPlanResult {
  const {
    asOfDate,
    startWeight,
    targetWeight,
    fightDate,
    weighInDate,
    fightStatus,
    biologicalSex,
    athleteAge = null,
    weighInTiming = daysBetween(weighInDate, fightDate) === 0 ? 'same_day' : 'next_day',
  } = input;
  const todayStr = asOfDate;

  const validationErrors: string[] = [];
  const safetyWarnings: string[] = [];
  let safetyWarningDetails: CutPlanResult['safetyWarningDetails'] = [];

  // Basic validation
  if (targetWeight >= startWeight) {
    validationErrors.push('Target weight must be less than your current weight.');
  }
  if (daysBetween(todayStr, weighInDate) < 1) {
    validationErrors.push('Weigh-in date must be in the future.');
  }
  if (daysBetween(weighInDate, fightDate) < 0) {
    validationErrors.push('Fight date must be on or after weigh-in date.');
  }

  const totalCutLbs = Math.round((startWeight - targetWeight) * 10) / 10;
  const totalCutPct = Math.round((totalCutLbs / startWeight) * 1000) / 10;
  const daysToWeighIn = Math.max(0, daysBetween(todayStr, weighInDate));

  // Water cut allocation
  const maxWaterCutPct = getPolicyWaterCutPct({ fightStatus, athleteAge, weighInTiming });
  const maxWaterCutLbs = Math.round((startWeight * maxWaterCutPct) / 100 * 10) / 10;
  const waterCutAllocationLbs = roundToTenth(Math.min(
    maxWaterCutLbs,
    Math.max(0, totalCutLbs - 1),
    Math.max(0, totalCutLbs * getWaterCutShare(totalCutPct)),
  ));
  const dietPhaseTargetLbs = Math.round((totalCutLbs - waterCutAllocationLbs) * 10) / 10;

  // Timeline breakdown
  const totalDays = daysBetween(todayStr, weighInDate);
  const fightWeekDays = 7;
  const dietPhaseDays = Math.max(0, totalDays - fightWeekDays);
  const weeksAvailable = dietPhaseDays / 7;
  safetyWarningDetails = evaluateCutPlanSafety({
    startWeight,
    targetWeight,
    totalCutLbs,
    totalCutPct,
    daysToWeighIn,
    fightStatus,
    athleteAge,
    weighInTiming,
    waterCutAllocationLbs,
    dietPhaseTargetLbs,
    dietPhaseDays,
  });
  const primaryCutWarning = safetyWarningDetails.find((warning) =>
    warning.code === 'extreme_cut' || warning.code === 'cut_pct_over_7'
  ) ?? safetyWarningDetails[0] ?? null;
  const cutWarning = primaryCutWarning
    ? toCutPlanWarning({
      warning: primaryCutWarning,
      fightStatus,
      athleteAge,
      daysToWeighIn,
      cutPct: totalCutPct,
    })
    : null;

  for (const warning of safetyWarningDetails) {
    safetyWarnings.push(`${warning.tier.toUpperCase()} CUT WARNING: ${warning.message}`);
  }

  if (validationErrors.length > 0) {
    return {
      valid: false,
      asOfDate,
      cutWarning,
      validationErrors,
      safetyWarnings,
      safetyWarningDetails,
      totalCutLbs,
      totalCutPct,
      dietPhaseTargetLbs: 0,
      waterCutAllocationLbs: 0,
      chronicPhaseWeeks: 0,
      intensifiedPhaseWeeks: 0,
      chronicPhaseDates: null,
      intensifiedPhaseDates: { start: todayStr, end: addDays(weighInDate, -7) },
      fightWeekDates: { start: addDays(weighInDate, -7), end: weighInDate },
      weighInDate,
      safeWeeklyLossRateLbs: 0,
      calorieFloor: biologicalSex === 'female' ? 1200 : 1500,
      maxWaterCutPct,
      estimatedDailyDeficitChronic: 0,
      estimatedDailyDeficitIntensified: 0,
    };
  }

  let chronicPhaseWeeks = 0;
  let intensifiedPhaseWeeks = 0;

  if (weeksAvailable >= 10) {
    intensifiedPhaseWeeks = Math.min(6, Math.round(weeksAvailable * 0.45));
    chronicPhaseWeeks = weeksAvailable - intensifiedPhaseWeeks;
  } else if (weeksAvailable >= 4) {
    intensifiedPhaseWeeks = Math.min(4, Math.round(weeksAvailable * 0.5));
    chronicPhaseWeeks = weeksAvailable - intensifiedPhaseWeeks;
  } else {
    intensifiedPhaseWeeks = weeksAvailable;
    chronicPhaseWeeks = 0;
  }

  // Safety rates: 0.75% BW/wk chronic, 1.25% BW/wk intensified
  const chronicRatePerWeek = Math.round(startWeight * 0.0075 * 10) / 10;
  const intensifiedRatePerWeek = Math.round(startWeight * 0.0125 * 10) / 10;
  const safeWeeklyLossRateLbs = intensifiedRatePerWeek;

  // Estimated total diet loss at safe rates
  const estimatedDietLoss =
    chronicRatePerWeek * chronicPhaseWeeks +
    intensifiedRatePerWeek * intensifiedPhaseWeeks;

  if (dietPhaseTargetLbs > estimatedDietLoss * 1.25) {
    safetyWarnings.push(
      `Your diet phase needs to drop ${dietPhaseTargetLbs.toFixed(1)} lbs, ` +
      `but the safe rate supports ~${estimatedDietLoss.toFixed(1)} lbs. ` +
      `You may need to accept a larger water cut or choose a higher weight class.`
    );
  }

  if (totalCutPct > 7) {
    safetyWarnings.push(
      `This is an aggressive cut (${totalCutPct.toFixed(1)}% body weight). ` +
      `Maintain close monitoring of energy levels and training performance throughout.`
    );
  }

  // Compute phase date boundaries
  const fightWeekStart = addDays(weighInDate, -7);

  const intensifiedPhaseEnd = addDays(fightWeekStart, -1);
  const intensifiedPhaseStart =
    intensifiedPhaseWeeks > 0
      ? addDays(fightWeekStart, -Math.round(intensifiedPhaseWeeks * 7))
      : fightWeekStart;

  const chronicPhaseDates: CutPhaseDates | null =
    chronicPhaseWeeks > 0
      ? { start: todayStr, end: addDays(intensifiedPhaseStart, -1) }
      : null;

  const intensifiedPhaseDates: CutPhaseDates = {
    start: intensifiedPhaseStart,
    end: intensifiedPhaseEnd,
  };
  const fightWeekDates: CutPhaseDates = { start: fightWeekStart, end: weighInDate };

  // Calorie deficit estimates
  // 1 lb fat â‰ˆ 3500 cal; accounting for some water + glycogen loss factor of ~3000 effective
  const effectiveCalPerLb = 3000;
  const estimatedDailyDeficitChronic =
    chronicPhaseWeeks > 0
      ? Math.round((chronicRatePerWeek * effectiveCalPerLb) / 7)
      : 0;
  const estimatedDailyDeficitIntensified = Math.round(
    (intensifiedRatePerWeek * effectiveCalPerLb) / 7
  );

  const calorieFloor = biologicalSex === 'female' ? 1200 : 1500;

  return {
    valid: true,
    asOfDate,
    cutWarning,
    validationErrors: [],
    safetyWarnings,
    safetyWarningDetails,
    totalCutLbs,
    totalCutPct,
    dietPhaseTargetLbs,
    waterCutAllocationLbs,
    chronicPhaseWeeks,
    intensifiedPhaseWeeks,
    chronicPhaseDates,
    intensifiedPhaseDates,
    fightWeekDates,
    weighInDate,
    safeWeeklyLossRateLbs,
    calorieFloor,
    maxWaterCutPct,
    estimatedDailyDeficitChronic,
    estimatedDailyDeficitIntensified,
  };
}

// â”€â”€â”€ determineCutPhase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function determineCutPhase(plan: WeightCutPlanRow, dateStr: string): CutPhase {
  const d = daysBetween(dateStr, plan.weigh_in_date);  // positive = future

  if (d < 0) return 'rehydration';                         // past weigh-in
  if (d === 0) return 'weigh_in';                          // weigh-in day
  if (d <= 3) return 'fight_week_cut';                     // days 1-3 out
  if (d <= 7) return 'fight_week_load';                    // days 4-7 out

  if (plan.intensified_phase_start && dateStr >= plan.intensified_phase_start) {
    return 'intensified';
  }
  return 'chronic';
}

export function getDailyCutIntensityCap(plan: WeightCutPlanRow | null | undefined, dateStr: string): number | null {
  if (!plan) return null;
  const phase = determineCutPhase(plan, dateStr);
  switch (phase) {
    case 'weigh_in': return 2;
    case 'fight_week_cut': return 3;
    case 'fight_week_load': return 4;
    case 'intensified': return 8;
    default: return null;
  }
}

// â”€â”€â”€ computeCarbCycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING UI Parameters:
 *   - baseCalories/Protein/Carbs/Fat: from calculateNutritionTargets or cut deficit logic
 *   - isTrainingDay: any scheduled_activities for today
 *   - hasHighIntensitySession: any session with expected_intensity >= 7
 *   - cutPhase: from determineCutPhase
 */
export function computeCarbCycle(input: CarbCycleInput): CarbCycleResult {
  const { baseCalories, baseProtein, baseCarbs, baseFat, isTrainingDay, hasHighIntensitySession, cutPhase } = input;

  // Only carb cycle during intensified phase
  if (cutPhase !== 'intensified') {
    return {
      adjustedCalories: baseCalories,
      adjustedCarbs: baseCarbs,
      adjustedFat: baseFat,
      adjustedProtein: baseProtein,
      cycleType: 'moderate',
      message: 'Carb cycling not active in this phase.',
    };
  }

  let carbMultiplier: number;
  let cycleType: 'high' | 'moderate' | 'low';

  if (hasHighIntensitySession) {
    carbMultiplier = 1.15;
    cycleType = 'high';
  } else if (isTrainingDay) {
    carbMultiplier = 1.0;
    cycleType = 'moderate';
  } else {
    carbMultiplier = 0.70;
    cycleType = 'low';
  }

  const adjustedCarbs = Math.round(baseCarbs * carbMultiplier);
  const carbCalDelta = (adjustedCarbs - baseCarbs) * 4;

  // On low days, add a touch of fat for satiety
  const fatBonus = cycleType === 'low' ? Math.round(Math.abs(carbCalDelta) * 0.15 / 9) : 0;
  const adjustedFat = baseFat + fatBonus;

  const adjustedCalories = baseCalories + carbCalDelta + fatBonus * 9;

  const messages: Record<'high' | 'moderate' | 'low', string> = {
    high: 'High-carb day - hard training today fuels performance.',
    moderate: 'Moderate-carb day - matched to training load.',
    low: 'Low-carb rest day - deficit deepened, fat slightly elevated for satiety.',
  };

  return {
    adjustedCalories: Math.round(adjustedCalories),
    adjustedCarbs,
    adjustedFat,
    adjustedProtein: baseProtein,
    cycleType,
    message: messages[cycleType],
  };
}

// â”€â”€â”€ detectStall â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * @ANTI-WIRING UI Parameters:
 *   - weightHistory: from weightService.getWeightHistory()
 *   - daysAtDeficit: daysBetween(plan.plan_created_date, today)
 *   - lastRefeedDate, lastDietBreakDate: from daily_cut_protocols where is_refeed_day = true
 */
export function detectStall(input: StallDetectionInput): StallDetectionResult {
  const { weightHistory, daysAtDeficit, lastRefeedDate, lastDietBreakDate } = input;

  if (weightHistory.length < 7) {
    return { stalled: false, stallDurationDays: 0, recommendation: 'none', refeedDurationDays: 0, message: 'Not enough data to assess stall yet.' };
  }

  // Compute velocity over the last 14 days (or however many we have)
  const recent = weightHistory.slice(-14);
  const oldAvg = recent.slice(0, Math.floor(recent.length / 2)).reduce((s, p) => s + p.weight, 0) / Math.floor(recent.length / 2);
  const newAvg = recent.slice(Math.floor(recent.length / 2)).reduce((s, p) => s + p.weight, 0) / Math.ceil(recent.length / 2);
  const velocityLbsPerWeek = ((newAvg - oldAvg) / (recent.length / 2)) * 7;

  const stalled = Math.abs(velocityLbsPerWeek) < 0.3 && daysAtDeficit >= 14;
  if (!stalled) {
    return { stalled: false, stallDurationDays: 0, recommendation: 'none', refeedDurationDays: 0, message: 'Weight is still moving.' };
  }

  // Anchor "today" to the latest recorded weigh-in date so historical scenarios
  // and deterministic simulations do not drift based on the machine clock.
  const todayStr = weightHistory.reduce(
    (latest, point) => (point.date > latest ? point.date : latest),
    weightHistory[0].date,
  );
  const daysSinceRefeed = lastRefeedDate ? daysBetween(lastRefeedDate, todayStr) : daysAtDeficit;
  const daysSinceDietBreak = lastDietBreakDate ? daysBetween(lastDietBreakDate, todayStr) : daysAtDeficit;

  // Prolonged stall â†’ diet break
  if (daysAtDeficit >= 28 && daysSinceDietBreak >= 21) {
    return {
      stalled: true,
      stallDurationDays: 14,
      recommendation: 'diet_break',
      refeedDurationDays: 7,
      message: 'You have been in a deficit for 4+ weeks with minimal progress. A 7-day maintenance break will reset your metabolism and restore performance.',
    };
  }

  // Moderate stall â†’ refeed
  if (daysSinceRefeed >= 10) {
    return {
      stalled: true,
      stallDurationDays: 14,
      recommendation: 'refeed',
      refeedDurationDays: 2,
      message: 'Weight has stalled for 2+ weeks. A 2-day refeed at maintenance calories (high-carb) will help reset hormones and restart fat loss.',
    };
  }

  return {
    stalled: true,
    stallDurationDays: 14,
    recommendation: 'none',
    refeedDurationDays: 0,
    message: 'Weight stalled, but a refeed was recent. Stay consistent - progress may resume shortly.',
  };
}

// â”€â”€â”€ validateCutSafety â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Runs all safety checks for the current day. Returns an array of flags.
 * Danger flags should be surfaced prominently in the UI.
 */
export function validateCutSafety(input: CutSafetyInput): CutSafetyFlag[] {
  const {
    cutPhase,
    startWeightLbs,
    currentWeightLbs,
    weeklyVelocityLbs,
    prescribedCalories,
    calorieFloor,
    consecutiveDepletedDays,
    acwr,
    urineColor,
    bodyTempF,
    baselineCognitiveScore,
    latestCognitiveScore,
    waterCutAllocationLbs,
    remainingLbsToTarget,
    daysToWeighIn,
    safetyContext,
    projectedWeightByWeighIn,
  } = input;

  const flags: CutSafetyFlag[] = [];
  const isFightWeek = cutPhase === 'fight_week_load' || cutPhase === 'fight_week_cut' || cutPhase === 'weigh_in';
  const isDietPhase = cutPhase === 'chronic' || cutPhase === 'intensified';

  // 1. Loss rate too fast (diet phases only)
  if (isDietPhase && weeklyVelocityLbs < -(startWeightLbs * 0.015)) {
    const rate = Math.abs(weeklyVelocityLbs).toFixed(1);
    flags.push({
      severity: 'danger', code: 'RAPID_LOSS',
      title: 'Loss Rate Too Fast',
      message: `You are losing ${rate} lbs/week, exceeding the safe maximum of ${(startWeightLbs * 0.015).toFixed(1)} lbs/week.`,
      recommendation: 'Increase calories by 200-300/day. Rapid weight loss causes muscle loss and performance decline.',
    });
  }

  if ((isTeenAthlete(safetyContext?.age) || isAgeUnknown(safetyContext?.age)) && isFightWeek) {
    const teen = isTeenAthlete(safetyContext?.age);
    flags.push({
      severity: 'danger', code: teen ? 'TEEN_FIGHT_WEEK_CUT' : 'UNKNOWN_AGE_FIGHT_WEEK_CUT',
      title: teen ? 'Teen Fight-Week Cut' : 'Age Missing for Fight-Week Cut',
      message: 'The app will allow this plan, but fight-week dehydration guidance is not appropriate without qualified supervision.',
      recommendation: 'Avoid heat-based sweating, fluid restriction, and extra conditioning. Escalate decisions to a qualified support team and medical professional.',
    });
  }

  // 2. Total cut exceeded 10% (shouldn't happen if plan validated, but safety net)
  const currentCutPct = ((startWeightLbs - currentWeightLbs) / startWeightLbs) * 100;
  if (currentCutPct > 10) {
    flags.push({
      severity: 'danger', code: 'EXCEEDED_10PCT',
      title: 'Exceeded 10% Body Weight',
      message: `You have cut ${currentCutPct.toFixed(1)}% of your starting body weight. This is medically unsafe.`,
      recommendation: 'Stop cutting immediately and consult your coach and a sports dietitian.',
    });
  }

  // 3. Calorie floor (diet phases only)
  if (isDietPhase && prescribedCalories < calorieFloor) {
    flags.push({
      severity: 'danger', code: 'BELOW_CALORIE_FLOOR',
      title: 'Below Minimum Calories',
      message: `Today's target of ${prescribedCalories} cal is below the minimum safe floor of ${calorieFloor} cal.`,
      recommendation: 'Calorie floor has been applied. Do not go lower than this amount.',
    });
  }

  // 4. Readiness Depleted 3+ consecutive days (diet phases)
  if (isDietPhase && consecutiveDepletedDays >= 3) {
    flags.push({
      severity: consecutiveDepletedDays >= 5 ? 'danger' : 'warning',
      code: 'DEPLETED_SUSTAINED',
      title: `${consecutiveDepletedDays} Consecutive Depleted Days`,
      message: `Your readiness has been Depleted for ${consecutiveDepletedDays} days. The deficit may be too aggressive for your current training load.`,
      recommendation: 'Consider a 1-2 day refeed at maintenance calories, or reduce training volume temporarily.',
    });
  }

  // 5. ACWR redline during diet phases
  if (isDietPhase && acwr > 1.4) {
    flags.push({
      severity: 'danger', code: 'ACWR_REDLINE_DURING_CUT',
      title: 'Load Spike During Cut',
      message: `Your workload ratio is ${acwr.toFixed(2)} - in the redline zone. Treat this as a load-management signal, not a diagnosis or injury prediction.`,
      recommendation: 'Reduce training volume this week. Maintain intensity but cut session count or duration.',
    });
  } else if (isDietPhase && acwr > 1.2) {
    flags.push({
      severity: 'warning', code: 'ACWR_CAUTION_DURING_CUT',
      title: 'Elevated Workload During Cut',
      message: `Workload ratio ${acwr.toFixed(2)} is in the caution zone. Use it as one recovery signal while in a calorie deficit.`,
      recommendation: 'Prioritize sleep and protein intake. One additional recovery session this week is advisable.',
    });
  }

  // 6. Fight week: urine color
  if (isFightWeek && urineColor !== null && urineColor >= 6) {
    flags.push({
      severity: 'danger', code: 'SEVERE_DEHYDRATION',
      title: 'Severe Dehydration Detected',
      message: `Urine color score of ${urineColor}/8 indicates severe dehydration. This is dangerous and can cause kidney damage and cognitive impairment.`,
      recommendation: cutPhase === 'fight_week_cut'
        ? 'Sip small amounts of water. Do not attempt a sauna or hot bath today.'
        : 'Drink water immediately. If symptoms persist, seek medical attention.',
    });
  } else if (isFightWeek && urineColor !== null && urineColor >= 4) {
    flags.push({
      severity: 'warning', code: 'MODERATE_DEHYDRATION',
      title: 'Moderate Dehydration',
      message: `Urine color score ${urineColor}/8 indicates moderate dehydration.`,
      recommendation: cutPhase === 'fight_week_load'
        ? 'Increase water intake. You are in the loading phase - stay well hydrated.'
        : 'Do not add restriction. Use conservative fluids/electrolytes and contact qualified support if symptoms appear.',
    });
  }

  // 7. Fight week: cognitive decline
  if (isFightWeek && baselineCognitiveScore !== null && latestCognitiveScore !== null) {
    const declinePct = ((latestCognitiveScore - baselineCognitiveScore) / baselineCognitiveScore) * 100;
    if (declinePct > 30) {
      flags.push({
        severity: 'danger', code: 'SEVERE_COGNITIVE_DECLINE',
        title: 'Severe Cognitive Decline',
        message: `Your reaction time has declined ${declinePct.toFixed(0)}% from baseline - indicating severe dehydration affecting brain function.`,
        recommendation: 'This is a medical emergency. Rehydrate immediately and contact your coach and a medical professional.',
      });
    } else if (declinePct > 20) {
      flags.push({
        severity: 'danger', code: 'COGNITIVE_DECLINE',
        title: 'Cognitive Decline Detected',
        message: `Reaction time declined ${declinePct.toFixed(0)}% from baseline. Dehydration is impairing brain function.`,
        recommendation: 'Stop additional restriction, rehydrate conservatively, and do not drive or spar.',
      });
    }
  }

  // 8. Fight week: body temperature
  if (isFightWeek && bodyTempF !== null && bodyTempF > 100.4) {
    flags.push({
      severity: 'danger', code: 'ELEVATED_TEMP',
      title: 'Elevated Body Temperature',
      message: `Body temperature of ${bodyTempF.toFixed(1)}F exceeds safe threshold (100.4F). Combined with dehydration, this is dangerous.`,
      recommendation: 'Stop any heat-based cutting (sauna, hot bath). Move to a cool environment and seek medical attention if temp rises further.',
    });
  }

  // 9. Water cut may exceed safe allocation (approaching fight week)
  if (cutPhase === 'fight_week_load' || cutPhase === 'intensified') {
    if (remainingLbsToTarget > waterCutAllocationLbs * 1.3 && daysToWeighIn <= 7) {
      const overage = (remainingLbsToTarget - waterCutAllocationLbs).toFixed(1);
      flags.push({
        severity: 'warning', code: 'WATER_CUT_EXCEEDS_PLAN',
        title: 'Water Cut May Exceed Safe Limit',
        message: `${overage} lbs more than your planned water cut allocation remain ${daysToWeighIn} days from weigh-in.`,
        recommendation: `Do not add dehydration tactics. Reassess the target and use coach/medical guidance before attempting the final drop.`,
      });
    }
  }

  if (projectedWeightByWeighIn != null && projectedWeightByWeighIn < (startWeightLbs * 0.9)) {
    flags.push({
      severity: 'warning', code: 'PROJECTED_TOTAL_CUT_OVER_10PCT',
      title: 'Projected Cut Exceeds 10%',
      message: `Current trend projects ${projectedWeightByWeighIn.toFixed(1)} lbs by weigh-in, which would move total loss beyond 10% of start weight.`,
      recommendation: 'Raise intake and reduce optional training load. Do not add dehydration tactics.',
    });
  }

  return flags;
}

// â”€â”€â”€ computeDailyCutProtocol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * The heart of the weight cut engine. Computes the full daily protocol
 * for an athlete on an active weight cut.
 *
 * @ANTI-WIRING UI Parameters:
 *   - plan: WeightCutPlanRow (from weightCutService.getActiveWeightCutPlan)
 *   - date: string (today's ISO date)
 *   - currentWeight: number (getEffectiveWeight())
 *   - weightHistory: WeightDataPoint[] (weightService.getWeightHistory 14d)
 *   - baseNutritionTargets: NutritionTargets (from calculateNutritionTargets)
 *   - dayActivities: scheduled activities for today (from scheduleService)
 *   - readinessState, acwr, biologicalSex, cycleDay, weeklyVelocityLbs
 *   - lastRefeedDate, lastDietBreakDate: from daily_cut_protocols query
 *   - consecutiveDepletedDays: from recent daily_checkins readiness
 *   - baselineCognitiveScore, latestCognitiveScore: from cut_safety_checks
 *   - urineColor, bodyTempF: from today's daily_checkins or cut_safety_checks
 */
export function computeDailyCutProtocol(input: DailyCutProtocolInput): DailyCutProtocolResult {
  const {
    plan,
    date,
    currentWeight,
    weightHistory,
    baseNutritionTargets,
    dayActivities,
    readinessState,
    acwr,
    cycleDay,
    weeklyVelocityLbs,
    lastRefeedDate,
    lastDietBreakDate,
    baselineCognitiveScore,
    latestCognitiveScore,
    urineColor,
    bodyTempF,
    consecutiveDepletedDays,
    safetyContext,
  } = input;

  const cutPhase = determineCutPhase(plan, date);
  const daysToWeighIn = Math.max(0, daysBetween(date, plan.weigh_in_date));
  const totalCutLbs = Math.round((plan.start_weight - plan.target_weight) * 10) / 10;
  const totalCutPct = Math.round(((totalCutLbs / plan.start_weight) * 1000)) / 10;
  const dietPhaseDays = Math.max(0, daysBetween(plan.plan_created_date, plan.weigh_in_date) - 7);
  const warningDetails = evaluateCutPlanSafety({
    startWeight: plan.start_weight,
    targetWeight: plan.target_weight,
    totalCutLbs,
    totalCutPct,
    daysToWeighIn,
    fightStatus: plan.fight_status as FightStatus,
    athleteAge: safetyContext.age,
    weighInTiming: safetyContext.weighInTiming,
    waterCutAllocationLbs: plan.water_cut_allocation_lbs,
    dietPhaseTargetLbs: plan.diet_phase_target_lbs,
    dietPhaseDays,
  });
  const primaryDailyWarning = warningDetails.find((warning) =>
    warning.code === 'extreme_cut' || warning.code === 'cut_pct_over_7'
  ) ?? warningDetails[0] ?? null;
  const activeCutWarning = primaryDailyWarning
    ? toCutPlanWarning({
      warning: primaryDailyWarning,
      fightStatus: plan.fight_status as FightStatus,
      athleteAge: safetyContext.age,
      daysToWeighIn,
      cutPct: totalCutPct,
    })
    : null;
  const conservativeCutProtocol = isTeenAthlete(safetyContext.age)
    || isAgeUnknown(safetyContext.age)
    || activeCutWarning?.severity === 'severe'
    || activeCutWarning?.severity === 'medical';
  const calorieFloor = plan.calorie_floor;
  const isTrainingDay = dayActivities.some(a =>
    a.activity_type !== 'rest' && a.activity_type !== 'active_recovery'
  );
  const hasHighIntensitySession = dayActivities.some(a => a.expected_intensity >= 7);
  const remainingLbsToTarget = Math.max(0, currentWeight - plan.target_weight);
  const dailyTargetOnCurve = computeDailyTargetOnCurve(plan, date);
  const weightDriftLbs = roundToTenth(currentWeight - dailyTargetOnCurve);
  const finalCutHoldBufferLbs = Math.max(0.5, roundToTenth(plan.target_weight * 0.005));
  const targetReachedHold = currentWeight <= plan.target_weight + finalCutHoldBufferLbs || weightDriftLbs < -1.5;
  const finalDropWithinPlan = remainingLbsToTarget <= plan.water_cut_allocation_lbs + finalCutHoldBufferLbs;
  const useConservativeFinalCut = (cutPhase === 'fight_week_cut' || cutPhase === 'weigh_in')
    && (targetReachedHold || finalDropWithinPlan);

  // â”€â”€ Stall detection (diet phases only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let isRefeedDay = false;
  if (cutPhase === 'chronic' || cutPhase === 'intensified') {
    const stallResult = detectStall({
      weightHistory,
      daysAtDeficit: daysBetween(plan.plan_created_date, date),
      lastRefeedDate,
      lastDietBreakDate,
    });
    if (stallResult.recommendation === 'refeed' || stallResult.recommendation === 'diet_break') {
      isRefeedDay = true;
    }
  }

  // â”€â”€ Biology adjustments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isLateLuteal = cycleDay !== null && cycleDay >= 20 && cycleDay <= 28;
  const isMenstrual = cycleDay !== null && cycleDay >= 1 && cycleDay <= 5;

  // â”€â”€ Phase-specific nutrition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let prescribedCalories: number;
  let prescribedProtein: number;
  let prescribedCarbs: number;
  let prescribedFat: number;
  let isCarbCycleHigh = false;
  let waterTargetOz: number;
  let sodiumTargetMg: number | null = null;
  let sodiumInstruction: string;
  let fiberInstruction: string;
  let trainingIntensityCap: number | null = getDailyCutIntensityCap(plan, date);
  let trainingRecommendation: string;
  let morningProtocol: string;
  let afternoonProtocol: string;
  let eveningProtocol: string;
  let interventionReason: string | null = null;

  const baseTDEE = baseNutritionTargets.tdee;

  // Phase out custom hydration logic by delegating to the hydration engine
  const baseHydration = getHydrationProtocol({
    phase: 'fight-camp',
    fightStatus: plan.fight_status as FightStatus,
    currentWeightLbs: currentWeight,
    targetWeightLbs: plan.target_weight,
    weeklyVelocityLbs,
  });

  const cutHydration = getCutHydrationProtocol({
    cutPhase,
    daysToWeighIn,
    currentWeightLbs: currentWeight,
    baseHydrationOz: baseHydration.dailyWaterOz,
    fightStatus: plan.fight_status as FightStatus,
  });

  waterTargetOz = cutHydration.dailyWaterOz;

  if (cutPhase === 'rehydration') {
    // Post-weigh-in: maintenance + electrolytes, aggressive rehydration
    prescribedCalories = Math.round(baseTDEE * 1.1);
    prescribedProtein = Math.round(currentWeight * 1.0);
    const proteinCal = prescribedProtein * 4;
    prescribedFat = Math.round((prescribedCalories * 0.25) / 9);
    prescribedCarbs = Math.round(Math.max(0, prescribedCalories - proteinCal - prescribedFat * 9) / 4);

    sodiumInstruction = 'Elevated - include electrolytes every 30-60 min';
    fiberInstruction = 'Low - avoid high-fiber foods for 4+ hours post-weigh-in';
    trainingRecommendation = 'Rest - no training until fight';
    morningProtocol = 'Immediately drink ORS (500 ml with electrolytes). Do not gulp - sip steadily over 20 min.';
    afternoonProtocol = 'Eat structured meals every 1-2 hours. Focus: rice/pasta + lean protein. Sip fluids continuously.';
    eveningProtocol = 'Monitor urine color (target pale yellow). Weigh yourself - aim for 5-7% weight regain by fight time.';

  } else if (cutPhase === 'weigh_in') {
    if (useConservativeFinalCut && targetReachedHold) {
      prescribedCalories = Math.max(calorieFloor, Math.round(baseTDEE * 0.7));
      prescribedProtein = Math.round(currentWeight * 0.8);
      const proteinCal = prescribedProtein * 4;
      prescribedFat = Math.round((prescribedCalories * 0.22) / 9);
      prescribedCarbs = Math.max(0, Math.round((prescribedCalories - proteinCal - prescribedFat * 9) / 4));

      sodiumInstruction = 'Normal and predictable - do not chase a lower number';
      sodiumTargetMg = null;
      fiberInstruction = 'Low - keep foods simple until the scale check is complete';
      trainingRecommendation = 'Rest - protect recovery and do not add weight-loss activity';
      morningProtocol = 'You are already inside the target band. Hold steady with simple food and fluids; do not add dehydration, heat, or extra conditioning to chase a lower number.';
      afternoonProtocol = 'After weigh-in: start ORS immediately. See Rehydration Protocol screen for full post-weigh-in plan.';
      eveningProtocol = 'Structured refueling meals. Sip fluids continuously. Aim for pale yellow urine by fight time.';
      interventionReason = 'Scale is inside the target band; final-drop tactics removed to avoid overshooting the cut.';
    } else {
      // Weigh-in day: conservative intake before weigh-in, structured rehydration after.
      prescribedCalories = 400;
      prescribedProtein = 30;
      prescribedCarbs = 40;
      prescribedFat = 10;

      sodiumInstruction = conservativeCutProtocol
        ? 'Medical-supervision only - do not chase sodium/fluid manipulation alone'
        : 'Reduced - keep choices simple until after weigh-in';
      sodiumTargetMg = conservativeCutProtocol ? null : 500;
      fiberInstruction = 'Very low - keep foods simple and low residue';
      trainingRecommendation = 'Rest - no physical activity until after weigh-in';
      morningProtocol = conservativeCutProtocol
        ? 'Do not use heat-based sweating, fluid restriction, or extra training to force the final drop. If still over target, contact qualified medical support and your coach before taking action.'
        : 'Keep the morning calm and low-residue. Do not use hot baths, saunas, or extra training to force sweat without qualified supervision.';
      afternoonProtocol = 'After weigh-in: start ORS immediately. See Rehydration Protocol screen for full post-weigh-in plan.';
      eveningProtocol = 'Structured refueling meals. Sip fluids continuously. Aim for pale yellow urine by fight time.';
    }

  } else if (cutPhase === 'fight_week_cut') {
    // Days 1-3 before weigh-in: low-residue taper with conservative hydration safeguards.

    if (useConservativeFinalCut) {
      prescribedCalories = Math.max(calorieFloor, Math.round(baseTDEE * (targetReachedHold ? 0.9 : 0.8)));
      prescribedProtein = Math.round(currentWeight * 0.9);
      const proteinCal = prescribedProtein * 4;
      prescribedFat = Math.round((prescribedCalories * 0.24) / 9);
      prescribedCarbs = Math.max(0, Math.round((prescribedCalories - proteinCal - prescribedFat * 9) / 4));
      sodiumInstruction = conservativeCutProtocol
        ? 'Medical-supervision only - avoid unsupervised sodium restriction'
        : 'Normal and predictable - do not chase zero sodium';
      sodiumTargetMg = null;
      fiberInstruction = 'Low to moderate - keep foods simple without starving the day';
      trainingRecommendation = 'Active recovery only - no extra conditioning to move the scale';
      morningProtocol = targetReachedHold
        ? 'You are already inside the target band. Hold steady with simple meals and fluids; do not add dehydration, heat, or extra conditioning.'
        : 'You are inside the planned final-drop range. Keep the final cut conservative, weigh after first void, and use coach/medical guidance before any hydration changes.';
      afternoonProtocol = 'Use small, predictable meals. Keep energy stable and stop adding restriction once morning weight is on target.';
      eveningProtocol = 'Keep the evening calm. Do not add sauna, hot bath, warm-room sweating, or extra conditioning to chase weight.';
      interventionReason = targetReachedHold
        ? 'Scale is inside the target band; final-drop tactics removed to avoid overshooting the cut.'
        : 'Remaining scale change is inside the planned final-drop budget; extra restriction removed.';
    } else {
      // Minimal low-residue calories
      const dailyCalByDay: Record<number, number> = { 1: 400, 2: 600, 3: 800 };
      prescribedCalories = Math.max(calorieFloor * 0.4, dailyCalByDay[daysToWeighIn] ?? 800);
      prescribedProtein = Math.round(currentWeight * 0.5);  // minimal, gut-emptying
      prescribedFat = 10;
      prescribedCarbs = Math.max(0, Math.round((prescribedCalories - prescribedProtein * 4 - prescribedFat * 9) / 4));
      sodiumInstruction = conservativeCutProtocol
        ? 'Medical-supervision only - avoid unsupervised sodium restriction'
        : 'Reduced - keep sodium predictable, not zero-chasing';
      sodiumTargetMg = conservativeCutProtocol ? null : 500;
      fiberInstruction = 'Very low - simple low-residue foods only';
      trainingRecommendation = 'Active recovery only - stretching, shadow boxing (5 min max)';
      morningProtocol = conservativeCutProtocol
        ? `Weigh yourself after first void. Follow the visible safety warning and avoid heat-based or fluid-restriction tactics. Hydration changes should be supervised.`
        : `Water target: ${waterTargetOz} oz. Weigh yourself after first void. If over target, use coach/medical guidance instead of heat-based shortcuts.`;
      afternoonProtocol = 'Small low-residue meals only. Avoid: vegetables, beans, whole grains, dairy. OK: white rice, grilled chicken, egg whites.';
      eveningProtocol = 'Keep the evening calm. Do not add sauna, hot bath, warm-room sweating, or extra conditioning to chase weight.';
    }

  } else if (cutPhase === 'fight_week_load') {
    // Days 4-7 before weigh-in: water superhydration

    // Near maintenance calories, reduce fiber
    prescribedCalories = Math.round(baseTDEE * 0.95);
    prescribedProtein = Math.round(currentWeight * 1.0);
    const proteinCal = prescribedProtein * 4;
    prescribedFat = Math.round((prescribedCalories * 0.28) / 9);
    prescribedCarbs = Math.max(0, Math.round((prescribedCalories - proteinCal - prescribedFat * 9) / 4));
    sodiumInstruction = daysToWeighIn >= 6 ? 'Normal to slightly elevated' : 'Normal';
    fiberInstruction = daysToWeighIn <= 5 ? 'Reduce to under 15g - minimize vegetables and legumes' : 'Normal - slight reduction from usual';
    trainingRecommendation = 'Shadow boxing, technique work, light pad work only - no sparring, no heavy S&C';
    morningProtocol = `Start drinking water immediately upon waking. Target ${waterTargetOz} oz today. Weigh after first void.`;
    afternoonProtocol = 'Continue hydrating. Light technique session if scheduled. Keep meals consistent and easily digestible.';
    eveningProtocol = 'Finish your water target before 7pm. Avoid heavy meals late. Good sleep is critical - 9+ hours.';

  } else if (isRefeedDay) {
    // Refeed: maintenance calories, high carb
    prescribedCalories = baseTDEE;
    prescribedProtein = Math.round(currentWeight * 1.0);
    const proteinCal = prescribedProtein * 4;
    prescribedFat = Math.round((prescribedCalories * 0.20) / 9);  // lower fat on refeed
    prescribedCarbs = Math.max(0, Math.round((prescribedCalories - proteinCal - prescribedFat * 9) / 4));
    sodiumInstruction = 'Normal';
    fiberInstruction = 'Normal';
    trainingRecommendation = 'Normal training - high carbs support good performance today';
    morningProtocol = 'Refeed day - eat at maintenance calories. High carbs, lower fat. This is intentional - your metabolism needs a reset.';
    afternoonProtocol = 'Enjoy your carbs. Rice, pasta, fruit, potatoes. Keep protein high. This is not a cheat day - it is structured recovery eating.';
    eveningProtocol = 'Do not stress about the scale. You will see a 1-2 lb increase from glycogen/water - this is expected and temporary.';

  } else if (cutPhase === 'intensified') {
    // Intensified: moderate deficit + carb cycling
    const baseDeficit = Math.round(baseTDEE * 0.13);
    let baseCalories = Math.max(calorieFloor, baseTDEE - baseDeficit);
    let baseProtein = Math.round(currentWeight * 1.4);  // elevated for lean mass
    const proteinCal = baseProtein * 4;
    let baseFat = Math.round((baseCalories * 0.28) / 9);
    let baseCarbs = Math.max(0, Math.round((baseCalories - proteinCal - baseFat * 9) / 4));

    // Biology: late luteal â€” ease deficit by 175 cal
    if (isLateLuteal) {
      baseCalories = Math.min(baseTDEE, baseCalories + 175);
    }
    if (isMenstrual) {
      baseProtein = Math.round(currentWeight * 1.5);
    }

    // Carb cycle
    const cycleResult = computeCarbCycle({
      baseCalories, baseProtein, baseCarbs, baseFat,
      isTrainingDay, hasHighIntensitySession, cutPhase,
    });

    prescribedCalories = Math.max(calorieFloor, cycleResult.adjustedCalories);
    prescribedProtein = cycleResult.adjustedProtein;
    prescribedCarbs = cycleResult.adjustedCarbs;
    prescribedFat = cycleResult.adjustedFat;
    isCarbCycleHigh = cycleResult.cycleType === 'high';
    sodiumInstruction = 'Normal';
    fiberInstruction = 'Normal - prioritize vegetables and whole grains';
    trainingIntensityCap = 8;
    trainingRecommendation = 'Maintain intensity, manage volume - if feeling depleted, cut a set, not the RPE';
    morningProtocol = `${cycleResult.cycleType === 'low' ? 'Low-carb rest day' : cycleResult.cycleType === 'high' ? 'High-carb training day' : 'Moderate-carb day'}. Weigh yourself after first void. Log your weight.`;
    afternoonProtocol = cycleResult.message;
    eveningProtocol = 'Log all food. Check macro compliance. Prioritize protein at every meal. 8-9 hours sleep.';

  } else {
    // Chronic: gradual deficit
    const baseDeficit = Math.round(baseTDEE * 0.07);
    prescribedCalories = Math.max(calorieFloor, baseTDEE - baseDeficit);

    // Biology: late luteal ease
    if (isLateLuteal) {
      prescribedCalories = Math.min(baseTDEE, prescribedCalories + 150);
    }

    prescribedProtein = Math.round(currentWeight * (isMenstrual ? 1.3 : 1.2));
    const proteinCal = prescribedProtein * 4;
    prescribedFat = Math.round((prescribedCalories * 0.30) / 9);
    prescribedCarbs = Math.max(0, Math.round((prescribedCalories - proteinCal - prescribedFat * 9) / 4));
    sodiumInstruction = 'Normal';
    fiberInstruction = 'Normal - prioritize fiber-rich vegetables and legumes';
    trainingIntensityCap = null;
    trainingRecommendation = 'Full training - deficit is moderate, performance should be maintained';
    morningProtocol = 'Weigh yourself after first void. Log your weight. Consistent morning weigh-ins are the most important data you produce.';
    afternoonProtocol = 'Eat consistently. Hitting protein and staying in your calorie window is the job. No dramatic changes needed.';
    eveningProtocol = 'Review the day. Check food log. Aim for 8-9 hours sleep - cortisol from poor sleep slows fat loss.';
  }

  // â”€â”€ Safety validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isDietDriftPhase = cutPhase === 'chronic' || cutPhase === 'intensified' || cutPhase === 'fight_week_load';
  if (isDietDriftPhase && weightDriftLbs > 0.5) {
    const driftCorrectionCalories = Math.round(weightDriftLbs * 500);
    const correctedCalories = Math.max(calorieFloor, prescribedCalories - driftCorrectionCalories);
    if (correctedCalories < prescribedCalories) {
      prescribedCalories = correctedCalories;
      interventionReason = `Weight drift +${weightDriftLbs.toFixed(1)} lb above curve; calories reduced to restore trajectory.`;
    }
  }

  const projectedWeightByWeighIn = weeklyVelocityLbs !== 0
    ? roundToTenth(currentWeight + (weeklyVelocityLbs * (daysToWeighIn / 7)))
    : null;
  const projectedUndershootLbs = projectedWeightByWeighIn == null
    ? 0
    : roundToTenth(plan.target_weight - projectedWeightByWeighIn);
  const undershootToleranceLbs = Math.max(1, roundToTenth(plan.target_weight * 0.01));
  const isUndershootCorrectionPhase = isDietDriftPhase || cutPhase === 'fight_week_cut' || cutPhase === 'weigh_in';
  if (isUndershootCorrectionPhase && (weightDriftLbs < -1.5 || projectedUndershootLbs > undershootToleranceLbs)) {
    const addedCalories = cutPhase === 'fight_week_load' ? 150 : 250;
    prescribedCalories = Math.min(baseTDEE, prescribedCalories + addedCalories);
    trainingIntensityCap = trainingIntensityCap == null ? null : Math.min(trainingIntensityCap, 6);
    interventionReason = projectedUndershootLbs > undershootToleranceLbs
      ? `Projected weigh-in weight is ${projectedUndershootLbs.toFixed(1)} lb below target; calories raised to avoid overshooting the cut.`
      : `Weight is ${Math.abs(weightDriftLbs).toFixed(1)} lb below curve; calories raised to protect performance.`;
  }

  // Normalize macros so they are internally consistent with prescribed calories.
  prescribedCalories = Math.max(0, Math.round(prescribedCalories));
  prescribedProtein = Math.max(0, Math.round(prescribedProtein));
  prescribedFat = Math.max(0, Math.round(prescribedFat));

  const proteinCaloriesFinal = prescribedProtein * 4;
  const maxFatCalories = Math.max(0, prescribedCalories - proteinCaloriesFinal);
  const maxFatGrams = Math.floor(maxFatCalories / 9);
  prescribedFat = Math.min(prescribedFat, maxFatGrams);

  const remainingCarbCalories = Math.max(0, prescribedCalories - (prescribedProtein * 4) - (prescribedFat * 9));
  prescribedCarbs = Math.max(0, Math.round(remainingCarbCalories / 4));

  const safetyFlags = validateCutSafety({
    cutPhase,
    startWeightLbs: plan.start_weight,
    currentWeightLbs: currentWeight,
    weeklyVelocityLbs,
    prescribedCalories,
    calorieFloor,
    readinessState,
    consecutiveDepletedDays,
    acwr,
    urineColor,
    bodyTempF,
    baselineCognitiveScore,
    latestCognitiveScore,
    waterCutAllocationLbs: plan.water_cut_allocation_lbs,
    remainingLbsToTarget,
    daysToWeighIn,
    fightStatus: plan.fight_status as FightStatus,
    safetyContext,
    projectedWeightByWeighIn,
  });
  if (useConservativeFinalCut) {
    safetyFlags.unshift({
      severity: targetReachedHold ? 'warning' : 'info',
      code: targetReachedHold ? 'TARGET_REACHED_HOLD' : 'FINAL_DROP_WITHIN_PLAN',
      title: targetReachedHold ? 'Hold Target Weight' : 'Final Drop Within Plan',
      message: targetReachedHold
        ? 'Current weight is already inside the target band, so the protocol removed extra final-drop tactics.'
        : 'Remaining scale change is inside the planned final-drop budget, so the protocol is avoiding extra restriction.',
      recommendation: targetReachedHold
        ? 'Hold steady, keep fluids predictable, and do not try to weigh in farther below the class limit.'
        : 'Use conservative supervision and stop escalating once the morning scale is on target.',
    });
  }
  if (projectedUndershootLbs > undershootToleranceLbs) {
    safetyFlags.unshift({
      severity: 'warning',
      code: 'PROJECTED_UNDERSHOOT',
      title: 'Projected Below Target',
      message: `Current trend projects ${projectedWeightByWeighIn?.toFixed(1)} lbs by weigh-in, about ${projectedUndershootLbs.toFixed(1)} lbs below target.`,
      recommendation: 'Raise calories and do not add extra dehydration or conditioning work to chase a lower number.',
    });
  }
  for (const warning of warningDetails) {
    if (safetyFlags.some((flag) => flag.code === warning.code)) continue;
    safetyFlags.unshift({
      severity: warning.tier === 'medical' || warning.tier === 'severe' ? 'danger' : warning.tier === 'caution' ? 'warning' : 'info',
      code: warning.code,
      title: `${warning.tier.toUpperCase()} safety warning`,
      message: warning.message,
      recommendation: warning.requiresAcknowledgement
        ? 'Keep this warning visible and require acknowledgement before relying on this cut plan.'
        : 'Keep monitoring this risk while the plan remains active.',
    });
  }
  // Rehydration protocol (if applicable)
  let rehydrationProtocol: RehydrationProtocolResult | null = null;
  if (cutPhase === 'rehydration' || cutPhase === 'weigh_in') {
    rehydrationProtocol = computeRehydrationProtocol({
      currentWeight,
      targetWeight: plan.target_weight,
      biologicalSex: plan.biological_sex ?? 'male',
      weighInTime: plan.weigh_in_date + 'T09:00:00', // Estimate 9am if not stored
      fightTime: plan.fight_date + 'T19:00:00',    // Estimate 7pm if not stored
    });
  }

  return {
    date,
    cutPhase,
    daysToWeighIn,
    activeCutWarning,
    weightDriftLbs,
    prescribedCalories,
    prescribedProtein,
    prescribedCarbs,
    prescribedFat,
    isCarbCycleHigh,
    isRefeedDay,
    waterTargetOz,
    sodiumTargetMg,
    sodiumInstruction,
    fiberInstruction,
    trainingRecommendation,
    trainingIntensityCap,
    interventionReason,
    morningProtocol,
    afternoonProtocol,
    eveningProtocol,
    safetyFlags,
    rehydrationProtocol,
  };
}

// â”€â”€â”€ computeRehydrationProtocol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Computes a detailed step-by-step rehydration timeline after weigh-in.
 */
export function computeRehydrationProtocol(input: RehydrationInput): RehydrationProtocolResult {
  const currentWeight = input.currentWeight ?? input.weighInWeightLbs ?? 0;
  const targetWeight = input.targetWeight ?? input.targetWeightLbs ?? currentWeight;
  const weighInTime = input.weighInTime ?? new Date().toISOString();
  const fightTime = input.fightTime ?? addHours(weighInTime, input.hoursToFight ?? 0);
  const { biologicalSex } = input;

  const targetRegainLbs = Math.round((targetWeight * (biologicalSex === 'female' ? 0.05 : 0.07)) * 10) / 10;
  const totalFluidTargetLiters = computeRehydrationFluidTargetLiters({
    currentWeight,
    targetWeight,
  });

  const hoursAvailable = (new Date(fightTime).getTime() - new Date(weighInTime).getTime()) / 3600000;
  const totalFluidOz = Math.round(totalFluidTargetLiters * 33.814);
  const targetWeightByFight = roundToTenth(currentWeight + targetRegainLbs);

  const phases: RehydrationPhase[] = [
    {
      name: 'Immediate Recovery (0-2h)',
      startTime: weighInTime,
      fluidTargetLiters: Math.round(totalFluidTargetLiters * 0.3 * 10) / 10,
      sodiumTargetMg: 1500,
      protocol: 'ORS/Electrolytes only. Sip 250ml every 15 min. Avoid solid food for first 45 min.',
      timeWindow: '0-2h',
      fluidInstruction: 'Use ORS or electrolytes only. Sip steadily every 15 minutes.',
      foodInstruction: 'Avoid solid food for the first 45 minutes.',
      sodiumInstruction: 'Front-load sodium intake early in the window.',
      targetFluidOz: Math.round(totalFluidTargetLiters * 0.3 * 33.814),
    },
    {
      name: 'Restoration (2-6h)',
      startTime: addHours(weighInTime, 2),
      fluidTargetLiters: Math.round(totalFluidTargetLiters * 0.4 * 10) / 10,
      sodiumTargetMg: 2000,
      protocol: 'High-carb/moderate-protein meals. Continue structured sipping. Salting all food heavily.',
      timeWindow: '2-6h',
      fluidInstruction: 'Continue steady sipping alongside meals.',
      foodInstruction: 'Prioritize high-carb, moderate-protein meals.',
      sodiumInstruction: 'Salt all food aggressively to accelerate rehydration.',
      targetFluidOz: Math.round(totalFluidTargetLiters * 0.4 * 33.814),
    },
    {
      name: 'Maintenance (6h-Fight)',
      startTime: addHours(weighInTime, 6),
      fluidTargetLiters: Math.round(totalFluidTargetLiters * 0.3 * 10) / 10,
      sodiumTargetMg: 1000,
      protocol: 'Small digestible snacks. Water to thirst. Aim for pale yellow urine.',
      timeWindow: '6h-fight',
      fluidInstruction: 'Drink to thirst and stay ahead of thirst spikes.',
      foodInstruction: 'Use small digestible snacks to top off glycogen.',
      sodiumInstruction: 'Keep sodium steady without forcing large boluses.',
      targetFluidOz: Math.round(totalFluidTargetLiters * 0.3 * 33.814),
    },
  ];

  return {
    phases,
    targetRegainLbs,
    totalFluidTargetLiters,
    totalSodiumTargetMg: 4500,
    hoursAvailable,
    targetWeightByFight,
    weightToRegainLbs: targetRegainLbs,
    totalFluidOz,
    monitorMetrics: [
      'Body weight regain every 1-2 hours',
      'Urine trending toward pale yellow',
      'No major stomach slosh or nausea',
      'Energy and mental sharpness improving',
    ],
    message: 'Rehydrate in phases, keep sodium high early, and use weight regain plus urine color to guide the pace.',
  };
}

function addHours(iso: string, h: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

