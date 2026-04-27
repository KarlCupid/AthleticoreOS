import type { FightStatus, WeighInTiming } from '../types/foundational.ts';
import type { CutPlanWarning } from '../types/weight_cut.ts';
import {
  ENGINE_SAFETY_POLICY_VERSION,
  type EngineSafetyWarning,
  type EngineSafetyWarningSource,
  type EngineSafetyWarningTier,
} from '../types/safety.ts';

export const FIGHT_CAMP_SAFETY_POLICY = {
  riskScore: {
    moderate: 35,
    high: 55,
    critical: 75,
  },
  intervention: {
    hardIntensityCap: 3,
    softIntensityCap: 5,
    protectIntensityCap: 4,
    expressIntensityFloor: 8,
    constrainedMinDurationMin: 20,
    mandatoryRecoveryMaxDurationMin: 20,
    softMaxDurationMin: 30,
    cutProtectDefaultDurationMin: 25,
    cutProtectMaxDurationMin: 30,
  },
  scheduling: {
    minimumGuidedSessionMin: 20,
  },
  sodium: {
    restrictedTargetMg: 500,
    unsafeInstructionFragments: [
      'water dump',
      'zero sodium',
      'no sodium',
      'minimal sodium',
      'stay away from salt',
    ],
  },
  hydration: {
    fightWeekLoadHighDaysOutMin: 6,
    fightWeekLoadHighMultiplier: 2.0,
    fightWeekLoadLowMultiplier: 1.5,
    fightWeekCutTargetOzByDaysOut: {
      1: 16,
      2: 32,
      3: 64,
    } as Record<number, number>,
    fightWeekCutFallbackOz: 64,
    weighInWaterOz: 8,
    rehydrationOzPerLb: 0.7,
  },
  rehydration: {
    fluidLitersPerPoundDeficit: 0.7,
  },
} as const;

export function hasUnsafeFightCampSodiumLanguage(value: string | null | undefined): boolean {
  const text = value?.toLowerCase() ?? '';
  return FIGHT_CAMP_SAFETY_POLICY.sodium.unsafeInstructionFragments.some((fragment) =>
    text.includes(fragment),
  );
}

export function isFightCampSodiumRestricted(input: {
  sodiumTargetMg?: number | null;
  sodiumInstruction?: string | null;
}): boolean {
  const sodiumInstruction = input.sodiumInstruction?.toLowerCase() ?? '';
  return (input.sodiumTargetMg != null && input.sodiumTargetMg <= FIGHT_CAMP_SAFETY_POLICY.sodium.restrictedTargetMg)
    || sodiumInstruction.includes('zero')
    || sodiumInstruction.includes('minimal');
}

export function getSafeFightCampSodiumRestrictionDetail(sodiumInstruction: string | null | undefined): string {
  const trimmed = sodiumInstruction?.trim() ?? '';
  if (!trimmed || hasUnsafeFightCampSodiumLanguage(trimmed)) {
    return 'Sodium is being managed conservatively by the active cut protocol; avoid unsupervised restriction and monitor dehydration signs.';
  }
  return trimmed;
}

export function getFightCampSodiumRestrictionInterpretation(input: {
  sodiumTargetMg?: number | null;
  sodiumInstruction?: string | null;
}): string | null {
  if (!isFightCampSodiumRestricted(input)) return null;
  return 'Sodium is restricted in the plan. Keep it predictable, monitor dehydration signs, and do not escalate restriction without qualified support.';
}

export function getFightWeekLoadHydrationMultiplier(daysToWeighIn: number): number {
  return daysToWeighIn >= FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekLoadHighDaysOutMin
    ? FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekLoadHighMultiplier
    : FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekLoadLowMultiplier;
}

export function getFightWeekLoadHydrationInstruction(oz: number): string {
  return `${oz} oz - structured loading phase. Drink steadily across the day, avoid chugging, and stop escalating if nausea, sloshing, or dizziness shows up.`;
}

export function getFightWeekLoadSodiumInstruction(daysToWeighIn: number): string {
  return daysToWeighIn >= FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekLoadHighDaysOutMin
    ? 'Normal to slightly elevated - keep sodium predictable during loading.'
    : 'Normal and predictable.';
}

export function getFightWeekCutWaterTargetOz(daysToWeighIn: number): number {
  return FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekCutTargetOzByDaysOut[daysToWeighIn]
    ?? FIGHT_CAMP_SAFETY_POLICY.hydration.fightWeekCutFallbackOz;
}

export function getFightWeekCutHydrationInstruction(oz: number): string {
  return `${oz} oz planning cap - conservative final-cut phase. Sip slowly as needed and do not add heat, extra conditioning, or unsupervised restriction.`;
}

export function getFightWeekCutSodiumInstruction(daysToWeighIn: number): string {
  return daysToWeighIn === 3
    ? 'Reduced sodium only if prescribed - keep intake predictable and avoid zero-chasing.'
    : 'Reduced added sodium - avoid zero-chasing and use qualified support for any further restriction.';
}

export function getWeighInHydrationInstruction(): string {
  return 'Small sips as needed until after weigh-in. Do not force thirst or use heat-based tactics.';
}

export function getWeighInSodiumInstruction(): string {
  return 'Keep sodium predictable until after weigh-in; avoid unsupervised zero-sodium rules.';
}

export function computeRehydrationFluidTargetLiters(input: {
  currentWeight: number;
  targetWeight: number;
}): number {
  const weightDeficitLbs = Math.max(0, input.targetWeight - input.currentWeight);
  return Math.round((weightDeficitLbs * FIGHT_CAMP_SAFETY_POLICY.rehydration.fluidLitersPerPoundDeficit) * 10) / 10;
}

function makeWarning(input: {
  code: string;
  tier: EngineSafetyWarningTier;
  message: string;
  requiresAcknowledgement?: boolean;
  persistent?: boolean;
  source?: EngineSafetyWarningSource;
}): EngineSafetyWarning {
  return {
    code: input.code,
    tier: input.tier,
    message: input.message,
    requiresAcknowledgement:
      input.requiresAcknowledgement ?? (input.tier === 'severe' || input.tier === 'medical'),
    persistent:
      input.persistent ?? (input.tier === 'severe' || input.tier === 'medical'),
    allowProceed: true,
    policyVersion: ENGINE_SAFETY_POLICY_VERSION,
    source: input.source ?? 'weight_cut',
  };
}

function tierRank(tier: EngineSafetyWarningTier): number {
  switch (tier) {
    case 'medical': return 4;
    case 'severe': return 3;
    case 'caution': return 2;
    case 'info':
    default: return 1;
  }
}

export function isTeenAthlete(age: number | null | undefined): boolean {
  return typeof age === 'number' && age > 0 && age < 18;
}

export function isAgeUnknown(age: number | null | undefined): boolean {
  return typeof age !== 'number' || age <= 0;
}

export function getPolicyWaterCutPct(input: {
  fightStatus: FightStatus;
  athleteAge?: number | null;
  weighInTiming?: WeighInTiming | null;
}): number {
  const adultCap = input.fightStatus === 'amateur' ? 3 : 5;
  const timingCap = input.weighInTiming === 'same_day' ? 2 : adultCap;
  const ageCap = isTeenAthlete(input.athleteAge) || isAgeUnknown(input.athleteAge) ? 1.5 : timingCap;
  return Math.min(adultCap, timingCap, ageCap);
}

export function evaluateCutPlanSafety(input: {
  startWeight: number;
  targetWeight: number;
  totalCutLbs: number;
  totalCutPct: number;
  daysToWeighIn: number | null;
  fightStatus: FightStatus;
  athleteAge?: number | null;
  weighInTiming?: WeighInTiming | null;
  waterCutAllocationLbs: number;
  dietPhaseTargetLbs: number;
  dietPhaseDays: number;
}): EngineSafetyWarning[] {
  const warnings: EngineSafetyWarning[] = [];
  const {
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
  } = input;
  const ageUnknown = isAgeUnknown(athleteAge);
  const teen = isTeenAthlete(athleteAge);
  const waterCutPct = startWeight > 0 ? (waterCutAllocationLbs / startWeight) * 100 : 0;
  const requiredWeeklyDietPct = startWeight > 0 && dietPhaseDays > 0
    ? (dietPhaseTargetLbs / startWeight) / (dietPhaseDays / 7) * 100
    : 0;

  if (totalCutPct > 7 && totalCutPct < 10) {
    warnings.push(makeWarning({
      code: 'cut_pct_over_7',
      tier: daysToWeighIn != null && daysToWeighIn <= 14 ? 'severe' : 'caution',
      message:
        `This cut is ${totalCutPct.toFixed(1)}% (${totalCutLbs.toFixed(1)} lbs). ` +
        `That is above the conservative 7% caution band, but below the common 10% upper guidance band. ` +
        `${daysToWeighIn == null ? 'Timeline risk is unknown.' : `${daysToWeighIn} days remain until weigh-in.`}`,
      source: 'weight_cut',
    }));
  }

  if (totalCutPct >= 10) {
    warnings.push(makeWarning({
      code: 'extreme_cut',
      tier: totalCutPct >= 12 || (daysToWeighIn != null && daysToWeighIn <= 7) ? 'medical' : 'severe',
      message:
        `This cut is ${totalCutPct.toFixed(1)}% (${totalCutLbs.toFixed(1)} lbs), at or above the common 10% upper guidance band. ` +
        `From ${startWeight} lbs to ${targetWeight} lbs, qualified medical and sports-nutrition supervision is strongly recommended before proceeding. ` +
        `${daysToWeighIn == null ? 'Timeline risk is unknown.' : `${daysToWeighIn} days remain until weigh-in.`}`,
      source: 'weight_cut',
    }));
  }

  if (teen || ageUnknown) {
    const ageLabel = teen ? 'Teen athlete' : 'Age not provided';
    const tier: EngineSafetyWarningTier = totalCutPct >= 7 || waterCutPct > 0 ? 'severe' : 'caution';
    warnings.push(makeWarning({
      code: teen ? 'teen_weight_cut' : 'unknown_age_weight_cut',
      tier,
      message:
        `${ageLabel}: weight-class cuts need extra caution because growth, hydration, and energy availability risks are higher. ` +
        `The app will allow the plan but will keep conservative warnings visible and avoid prescriptive dehydration tactics.`,
      source: 'weight_cut',
      persistent: true,
      requiresAcknowledgement: tier !== 'caution',
    }));
  }

  if (weighInTiming === 'same_day' && totalCutPct > 5) {
    warnings.push(makeWarning({
      code: 'same_day_cut_recovery_window',
      tier: totalCutPct >= 7 ? 'severe' : 'caution',
      message:
        `Same-day weigh-in leaves limited time to restore fluid, sodium, and glycogen. ` +
        `A ${totalCutPct.toFixed(1)}% cut should be treated as a high-risk performance and hydration constraint.`,
      source: 'fight_week',
      persistent: true,
    }));
  }

  if (requiredWeeklyDietPct > 1.5) {
    warnings.push(makeWarning({
      code: 'weekly_loss_rate_over_1_5pct',
      tier: requiredWeeklyDietPct >= 2 ? 'severe' : 'caution',
      message:
        `The diet phase requires about ${requiredWeeklyDietPct.toFixed(1)}% body-weight loss per week. ` +
        `That exceeds the 1.5%/week descent guideline used in weight-class sport policies.`,
      source: 'nutrition',
      persistent: requiredWeeklyDietPct >= 2,
    }));
  }

  if (waterCutPct > 3 || (weighInTiming === 'same_day' && waterCutPct > 1.5)) {
    warnings.push(makeWarning({
      code: 'water_cut_allocation_high',
      tier: waterCutPct >= 5 ? 'medical' : 'severe',
      message:
        `The water-cut allocation is ${waterCutAllocationLbs.toFixed(1)} lbs (${waterCutPct.toFixed(1)}% of start weight). ` +
        `The engine will warn-and-allow, but daily guidance should avoid unsupervised dehydration tactics.`,
      source: 'hydration',
      persistent: true,
    }));
  }

  if (fightStatus === 'amateur' && totalCutPct >= 7) {
    warnings.push(makeWarning({
      code: 'amateur_cut_escalation',
      tier: 'caution',
      message:
        'Amateur status escalates this plan because recovery windows, support staff, and sanctioning rules are often less forgiving.',
      source: 'weight_cut',
    }));
  }

  return warnings.sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
}

export function toCutPlanWarning(input: {
  warning: EngineSafetyWarning;
  fightStatus: FightStatus;
  athleteAge?: number | null;
  daysToWeighIn: number | null;
  cutPct: number;
}): CutPlanWarning {
  return {
    severity: input.warning.tier,
    tier: input.warning.tier,
    code: input.warning.code,
    message: input.warning.message,
    requiresAcknowledgement: input.warning.requiresAcknowledgement,
    persistent: input.warning.persistent,
    allowProceed: input.warning.allowProceed,
    policyVersion: input.warning.policyVersion,
    source: input.warning.source,
    amateurAdjusted: input.fightStatus === 'amateur',
    teenSensitive: isTeenAthlete(input.athleteAge),
    ageUnknown: isAgeUnknown(input.athleteAge),
    daysToWeighIn: input.daysToWeighIn,
    cutPct: input.cutPct,
  };
}
