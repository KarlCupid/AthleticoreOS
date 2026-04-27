import type {
  ConstraintContext,
  FatigueTrend,
  PerformanceAnchor,
  ReadinessFlag,
  ReadinessProfile,
  ReadinessProfileInput,
  ReadinessState,
  StimulusConstraintSet,
  StimulusType,
} from '../types.ts';
import { adjustForBiology } from '../adjustForBiology.ts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalize1to5(value: number | null | undefined, fallback = 3): number {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return clamp(Math.round(((safe - 1) / 4) * 100), 0, 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueStimuli(values: StimulusType[]): StimulusType[] {
  return Array.from(new Set(values));
}

function addFlag(flags: ReadinessFlag[], next: ReadinessFlag): void {
  if (!flags.some((flag) => flag.code === next.code)) {
    flags.push(next);
  }
}

function getTrend(history: number[]): FatigueTrend {
  if (history.length < 3) return 'stable';
  const first = average(history.slice(0, Math.min(3, history.length)));
  const last = average(history.slice(-Math.min(3, history.length)));
  const delta = last - first;
  if (delta <= -0.4) return 'dropping';
  if (delta >= 0.4) return 'rebounding';
  return 'stable';
}

function getCognitiveAnchor(input: ReadinessProfileInput): PerformanceAnchor | null {
  const baseline = input.baselineCognitiveScore ?? null;
  const latest = input.latestCognitiveScore ?? null;
  if (baseline == null && latest == null) {
    return null;
  }

  if (baseline == null || latest == null || baseline <= 0) {
    return {
      key: 'cognitive_score',
      label: 'Reaction time',
      dimension: 'neural',
      status: 'unknown',
      value: latest,
      baseline,
      detail: 'Reaction-time anchor is incomplete, so it will inform context but not gate progression.',
    };
  }

  const ratio = latest / baseline;
  const status = ratio >= 1.25
    ? 'below_baseline'
    : ratio <= 0.92
      ? 'above_baseline'
      : 'normal';

  return {
    key: 'cognitive_score',
    label: 'Reaction time',
    dimension: 'neural',
    status,
    value: latest,
    baseline,
    detail: status === 'below_baseline'
      ? 'Reaction time is slower than baseline and points to neural fatigue or dehydration.'
      : status === 'above_baseline'
        ? 'Reaction time is better than baseline and supports higher-quality expression.'
        : 'Reaction time is near baseline.',
  };
}

export function deriveLegacyReadinessState(profile: Pick<ReadinessProfile, 'overallReadiness' | 'flags'>): ReadinessState {
  const redFlags = profile.flags.filter((flag) => flag.level === 'red').length;
  const yellowFlags = profile.flags.filter((flag) => flag.level === 'yellow').length;

  if (redFlags > 0 || profile.overallReadiness < 38) {
    return 'Depleted';
  }

  if (yellowFlags >= 2 || profile.overallReadiness < 68) {
    return 'Caution';
  }

  return 'Prime';
}

export function deriveReadinessProfile(input: ReadinessProfileInput): ReadinessProfile {
  const flags: ReadinessFlag[] = [];
  const daysOfData = input.readinessHistory?.length ?? 0;
  const dataConfidence: ReadinessProfile['dataConfidence'] =
    daysOfData >= 14 ? 'high' : daysOfData >= 7 ? 'medium' : 'low';
  const dataSufficiency: ReadinessProfile['dataSufficiency'] =
    daysOfData >= 7 ? 'established' : daysOfData > 0 ? 'limited' : 'insufficient';
  const biology = input.cycleDay != null && input.cycleDay >= 1 && input.cycleDay <= 28
    ? adjustForBiology({ cycleDay: input.cycleDay, energyDeficitPercent: input.energyDeficitPercent ?? 0 })
    : null;
  const cardioModifier = biology?.cardioModifier ?? 1;
  const proteinModifier = biology?.proteinModifier ?? 1;

  const sleepScore = normalize1to5(input.sleepQuality, 3);
  const energyScore = normalize1to5(input.energyLevel ?? input.subjectiveReadiness, 3);
  const fuelHydrationScore = normalize1to5(input.fuelHydrationStatus, 3);
  const confidenceScore = normalize1to5(input.confidenceLevel, 3);
  const stressPenalty = normalize1to5(input.stressLevel, 3);
  const sorenessPenalty = normalize1to5(input.sorenessLevel, 3);
  const painPenalty = input.painLevel != null ? normalize1to5(input.painLevel, 1) : 0;
  const acwrPenalty = input.acwrRatio >= 1.55 ? 32 : input.acwrRatio >= 1.42 ? 22 : input.acwrRatio >= 1.28 ? 10 : 0;
  const rollingFatiguePenalty = clamp((input.loadMetrics?.rollingFatigueScore ?? 0) / 2, 0, 35);
  const externalLoadPenalty = clamp((input.externalHeartRateLoad ?? 0) / 4, 0, 22);
  const activationDelta = input.activationRPE != null
    ? input.activationRPE - (input.expectedActivationRPE ?? 4)
    : 0;

  const cognitiveAnchor = getCognitiveAnchor(input);
  const cognitiveDeclinePenalty = cognitiveAnchor?.status === 'below_baseline'
    && cognitiveAnchor.value != null
    && cognitiveAnchor.baseline != null
    && cognitiveAnchor.baseline > 0
    ? clamp(((cognitiveAnchor.value - cognitiveAnchor.baseline) / cognitiveAnchor.baseline) * 80, 0, 30)
    : 0;

  const dehydrationPenalty = input.urineColor != null
    ? input.urineColor >= 7
      ? 28
      : input.urineColor >= 5
        ? 14
        : 0
    : 0;
  const cutPenalty = input.isOnActiveCut
    ? input.weightCutIntensityCap != null && input.weightCutIntensityCap <= 2
      ? 20
      : input.weightCutIntensityCap != null && input.weightCutIntensityCap <= 4
        ? 12
        : 6
    : 0;

  const neuralReadiness = clamp(Math.round(average([
    sleepScore,
    energyScore,
    confidenceScore,
    100 - clamp(stressPenalty * 0.45, 0, 45),
  ]) - (activationDelta > 0 ? activationDelta * 8 : 0) - cognitiveDeclinePenalty), 8, 100);

  const structuralReadiness = clamp(Math.round(average([
    energyScore,
    100 - sorenessPenalty,
    100 - painPenalty,
    100 - acwrPenalty,
    100 - Math.min(34, Math.round((input.recentSparringDecayLoad5d ?? (input.recentSparringCount48h ?? 0) * 0.8) * 12)),
    100 - Math.min(18, (input.recentHighImpactCount48h ?? 0) * 8),
    100 - Math.min(12, (input.recentHeavyStrengthCount48h ?? 0) * 6),
  ])), 8, 100);

  const metabolicReadiness = clamp(Math.round(average([
    sleepScore,
    energyScore,
    fuelHydrationScore,
    100 - rollingFatiguePenalty,
    100 - externalLoadPenalty,
    100 - cutPenalty,
    100 - dehydrationPenalty,
  ]) - (cognitiveDeclinePenalty * 0.4)), 8, 100);

  if ((input.sleepQuality ?? 3) <= 2) {
    addFlag(flags, {
      code: 'poor_sleep',
      level: 'yellow',
      dimension: 'neural',
      reason: 'Sleep quality is low enough to blunt sharpness and recovery.',
    });
  }

  if ((input.stressLevel ?? 3) >= 4) {
    addFlag(flags, {
      code: 'high_stress',
      level: 'yellow',
      dimension: 'neural',
      reason: 'Stress is elevated and should trigger cleaner, simpler loading.',
    });
  }

  if ((input.sorenessLevel ?? 3) >= 4) {
    addFlag(flags, {
      code: 'high_soreness',
      level: 'yellow',
      dimension: 'structural',
      reason: 'Soreness is elevated and tissue-heavy work should be substituted.',
    });
  }

  if ((input.painLevel ?? 1) >= 4) {
    addFlag(flags, {
      code: 'pain_restriction',
      level: (input.painLevel ?? 1) >= 5 ? 'red' : 'yellow',
      dimension: 'structural',
      reason: 'Pain is high enough to restrict loading, contact, or range today.',
    });
  }

  if ((input.energyLevel ?? input.subjectiveReadiness ?? 3) <= 2) {
    addFlag(flags, {
      code: 'low_energy',
      level: 'yellow',
      dimension: 'neural',
      reason: 'Energy is low enough that quality and decision speed may drop.',
    });
  }

  if ((input.fuelHydrationStatus ?? 3) <= 2) {
    addFlag(flags, {
      code: 'fuel_hydration_limiter',
      level: 'yellow',
      dimension: 'metabolic',
      reason: 'Food or fluids feel behind, so training support should increase before hard work.',
    });
  }

  if (input.acwrRatio >= 1.55) {
    addFlag(flags, {
      code: 'acwr_redline',
      level: 'red',
      dimension: 'structural',
      reason: `ACWR is redlining at ${input.acwrRatio.toFixed(2)}.`,
    });
  } else if (input.acwrRatio >= 1.32) {
    addFlag(flags, {
      code: 'acwr_elevated',
      level: 'yellow',
      dimension: 'structural',
      reason: `ACWR is elevated at ${input.acwrRatio.toFixed(2)}.`,
    });
  }

  if ((input.loadMetrics?.rollingFatigueScore ?? 0) >= 80) {
    addFlag(flags, {
      code: 'fatigue_spike',
      level: 'red',
      dimension: 'metabolic',
      reason: 'Rolling fatigue is high enough to require protection.',
    });
  } else if ((input.loadMetrics?.rollingFatigueScore ?? 0) >= 60) {
    addFlag(flags, {
      code: 'fatigue_hot',
      level: 'yellow',
      dimension: 'metabolic',
      reason: 'Rolling fatigue is running hot and volume should be trimmed.',
    });
  }

  if (activationDelta >= 3) {
    addFlag(flags, {
      code: 'activation_flat',
      level: 'red',
      dimension: 'neural',
      reason: 'Activation RPE is far above plan and points to a bad neural window.',
    });
  } else if (activationDelta >= 2) {
    addFlag(flags, {
      code: 'activation_off',
      level: 'yellow',
      dimension: 'neural',
      reason: 'Activation RPE is above plan and max-speed work should be substituted.',
    });
  }

  if (cognitiveAnchor?.status === 'below_baseline') {
    addFlag(flags, {
      code: 'cognitive_decline',
      level: cognitiveDeclinePenalty >= 22 ? 'red' : 'yellow',
      dimension: 'neural',
      reason: 'Reaction time is below baseline and likely reflects dehydration or neural fatigue.',
    });
  }

  if ((input.urineColor ?? 0) >= 7) {
    addFlag(flags, {
      code: 'severe_dehydration',
      level: 'red',
      dimension: 'metabolic',
      reason: 'Urine color indicates severe dehydration risk.',
    });
  } else if ((input.urineColor ?? 0) >= 5) {
    addFlag(flags, {
      code: 'dehydration_risk',
      level: 'yellow',
      dimension: 'metabolic',
      reason: 'Hydration markers are trending in the wrong direction.',
    });
  }

  if ((input.bodyTempF ?? 98.6) >= 100.4) {
    addFlag(flags, {
      code: 'illness_signal',
      level: 'red',
      dimension: 'global',
      reason: 'Body temperature is high enough to treat as an illness red flag.',
    });
  }

  if (input.isOnActiveCut && (input.weightCutIntensityCap ?? 10) <= 4) {
    addFlag(flags, {
      code: 'cut_pressure',
      level: (input.weightCutIntensityCap ?? 10) <= 2 ? 'red' : 'yellow',
      dimension: 'metabolic',
      reason: 'The active cut is materially constraining training output.',
    });
  }

  if (daysOfData < 7) {
    addFlag(flags, {
      code: 'insufficient_data',
      level: 'yellow',
      dimension: 'global',
      reason: 'Less than 7 days of readiness data are available, so today\'s score should be treated with lower confidence.',
    });
  }

  const trend = getTrend(input.readinessHistory ?? []);
  const overallReadiness = clamp(Math.round(average([neuralReadiness, structuralReadiness, metabolicReadiness])), 8, 100);
  const readinessState = deriveLegacyReadinessState({ overallReadiness, flags });

  const anchors: PerformanceAnchor[] = [];
  if (input.activationRPE != null) {
    anchors.push({
      key: 'activation_rpe',
      label: 'Activation feel',
      dimension: 'neural',
      status: activationDelta >= 2 ? 'below_baseline' : activationDelta <= -1 ? 'above_baseline' : 'normal',
      value: input.activationRPE,
      baseline: input.expectedActivationRPE ?? 4,
      detail: activationDelta >= 2
        ? 'Activation felt harder than expected, so speed-sensitive work should be substituted.'
        : activationDelta <= -1
          ? 'Activation felt easy and supports quality expression.'
          : 'Activation matched the expected feel.',
    });
  } else {
    anchors.push({
      key: 'warmup_feel',
      label: 'Warm-up feel',
      dimension: 'neural',
      status: 'unknown',
      value: null,
      baseline: null,
      detail: 'No warm-up anchor was logged yet.',
    });
  }

  if (cognitiveAnchor) {
    anchors.push(cognitiveAnchor);
  }

  return {
    neuralReadiness,
    structuralReadiness,
    metabolicReadiness,
    overallReadiness,
    trend,
    dataConfidence,
    dataSufficiency,
    cardioModifier,
    proteinModifier,
    flags,
    performanceAnchors: anchors,
    readinessState,
  };
}

export function deriveStimulusConstraintSet(
  profile: ReadinessProfile,
  context: ConstraintContext = {},
): StimulusConstraintSet {
  const protectWindow = context.daysOut != null && context.daysOut <= 3;
  const taperWindow = context.phase === 'camp-taper';
  const redFlags = profile.flags.filter((flag) => flag.level === 'red').length;
  const yellowFlags = profile.flags.filter((flag) => flag.level === 'yellow').length;
  const neuralYellowFlags = profile.flags.filter((flag) => flag.dimension === 'neural' && flag.level === 'yellow').length;
  const neuralRedFlags = profile.flags.filter((flag) => flag.dimension === 'neural' && flag.level === 'red').length;
  const structuralYellowFlags = profile.flags.filter((flag) => flag.dimension === 'structural' && flag.level === 'yellow').length;
  const structuralRedFlags = profile.flags.filter((flag) => flag.dimension === 'structural' && flag.level === 'red').length;
  const metabolicYellowFlags = profile.flags.filter((flag) => flag.dimension === 'metabolic' && flag.level === 'yellow').length;
  const metabolicRedFlags = profile.flags.filter((flag) => flag.dimension === 'metabolic' && flag.level === 'red').length;

  let explosiveBudget = profile.neuralReadiness;
  let impactBudget = profile.structuralReadiness;
  let strengthBudget = Math.round((profile.structuralReadiness * 0.6) + (profile.neuralReadiness * 0.2) + (profile.metabolicReadiness * 0.2));
  let aerobicBudget = Math.round(profile.metabolicReadiness * profile.cardioModifier);

  if (profile.trend === 'dropping') {
    explosiveBudget -= 8;
    impactBudget -= 6;
    strengthBudget -= 5;
    aerobicBudget -= 6;
  } else if (profile.trend === 'rebounding') {
    explosiveBudget += 4;
    strengthBudget += 3;
    aerobicBudget += 2;
  }

  explosiveBudget -= (neuralYellowFlags * 5) + (neuralRedFlags * 12);
  impactBudget -= (structuralYellowFlags * 12) + (structuralRedFlags * 18);
  strengthBudget -= (structuralYellowFlags * 6) + (structuralRedFlags * 10);
  aerobicBudget -= Math.min(16, (metabolicYellowFlags * 6) + (metabolicRedFlags * 14));

  if (taperWindow || protectWindow) {
    explosiveBudget -= 4;
    impactBudget -= 6;
  }

  explosiveBudget = clamp(explosiveBudget, 8, 100);
  impactBudget = clamp(impactBudget, 8, 100);
  strengthBudget = clamp(strengthBudget, 8, 100);
  aerobicBudget = clamp(aerobicBudget, 8, 100);

  let volumeMultiplier = clamp(profile.overallReadiness / 100, 0.5, 1.05);
  if (profile.trend === 'dropping') volumeMultiplier = clamp(volumeMultiplier - 0.08, 0.45, 1);
  if (redFlags > 0) volumeMultiplier = clamp(volumeMultiplier - 0.15, 0.35, 0.9);
  if (yellowFlags >= 2) volumeMultiplier = clamp(volumeMultiplier - 0.08, 0.4, 1);
  if (context.isDeloadWeek) volumeMultiplier = Math.min(volumeMultiplier, 0.72);
  if (taperWindow) volumeMultiplier = Math.min(volumeMultiplier, 0.78);

  const blocked: StimulusType[] = [];
  const allowed: StimulusType[] = [
    'max_velocity',
    'plyometric',
    'high_impact',
    'heavy_strength',
    'controlled_strength',
    'machine_strength',
    'tempo_conditioning',
    'aerobic_conditioning',
    'glycolytic_conditioning',
    'hard_sparring',
    'technical_skill',
    'recovery',
  ];

  if (explosiveBudget < 50 || neuralRedFlags > 0) {
    blocked.push('max_velocity');
  }
  if (explosiveBudget < 42 || impactBudget < 58 || structuralRedFlags > 0) {
    blocked.push('plyometric');
  }
  if (impactBudget < 68 || structuralRedFlags > 0) {
    blocked.push('high_impact');
  }
  if (impactBudget < 62 || protectWindow || structuralRedFlags > 0 || structuralYellowFlags > 0) {
    blocked.push('hard_sparring');
  }
  if (strengthBudget < 48) {
    blocked.push('heavy_strength');
  }
  if (aerobicBudget < 70 || metabolicRedFlags > 0) {
    blocked.push('glycolytic_conditioning');
  }
  if ((aerobicBudget < 55 && (metabolicYellowFlags > 0 || metabolicRedFlags > 0)) || (aerobicBudget < 38 && profile.readinessState === 'Depleted')) {
    blocked.push('tempo_conditioning');
  }

  if (context.hasTechnicalSession) {
    blocked.push('recovery');
  }

  const blockedStimuli = uniqueStimuli(blocked);
  const allowedStimuli = uniqueStimuli(allowed.filter((stimulus) => !blockedStimuli.includes(stimulus)));

  let intensityCap = redFlags > 0
    ? 4
    : yellowFlags >= 2
      ? 6
      : 8;

  if (explosiveBudget < 45 && strengthBudget >= 55) {
    intensityCap = Math.min(intensityCap, 7);
  }
  if (aerobicBudget < 45) {
    intensityCap = Math.min(intensityCap, 6);
  }
  if (protectWindow || taperWindow) {
    intensityCap = Math.min(intensityCap, 6);
  }
  if (context.trainingIntensityCap != null) {
    intensityCap = Math.min(intensityCap, context.trainingIntensityCap);
  }

  const maxConditioningRounds = aerobicBudget < 40
    ? 4
    : aerobicBudget < 55
      ? 6
      : null;

  return {
    explosiveBudget,
    impactBudget,
    strengthBudget,
    aerobicBudget,
    volumeMultiplier: Math.round(volumeMultiplier * 100) / 100,
    hardCaps: {
      intensityCap,
      allowImpact: !blockedStimuli.includes('high_impact'),
      allowHardSparring: !blockedStimuli.includes('hard_sparring'),
      maxConditioningRounds,
    },
    allowedStimuli,
    blockedStimuli,
  };
}
