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
import {
  confidenceFromLevel,
  createTrackingEntry,
  resolveReadinessState,
  type ComposedSession,
  type TrackingEntry,
} from '../../performance-engine/index.ts';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function confidenceLevel(level: 'unknown' | 'low' | 'medium' | 'high'): ReadinessProfile['dataConfidence'] {
  return level === 'unknown' ? 'low' : level;
}

function dataSufficiency(daysOfData: number): ReadinessProfile['dataSufficiency'] {
  if (daysOfData >= 7) return 'established';
  if (daysOfData > 0) return 'limited';
  return 'insufficient';
}

function readinessPercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return clamp(Math.round(((value - 1) / 4) * 100), 0, 100);
}

function makeEntry(input: {
  id: string;
  type: TrackingEntry['type'];
  value: number | boolean | string | null | undefined;
  unit?: string | null;
  date: string;
  confidence?: ReturnType<typeof confidenceFromLevel>;
}): TrackingEntry | null {
  if (input.value == null) return null;
  return createTrackingEntry({
    id: input.id,
    athleteId: 'legacy-readiness-athlete',
    timestamp: `${input.date}T08:00:00.000Z`,
    timezone: 'UTC',
    type: input.type,
    source: 'system_inferred',
    value: input.value,
    unit: input.unit ?? (typeof input.value === 'number' ? 'score_1_5' : null),
    confidence: input.confidence ?? confidenceFromLevel('low', [
      'Legacy readiness input was projected into canonical tracking data.',
    ]),
    context: { source: 'legacy_readiness_profile' },
  });
}

function sessionStub(input: {
  id: string;
  date: string;
  family: ComposedSession['family'];
  intensity: number;
  duration: number;
}): ComposedSession {
  const confidence = confidenceFromLevel('low', ['Legacy recent-session count was projected into readiness context.']);
  return {
    id: input.id,
    family: input.family,
    title: input.family.replace(/_/g, ' '),
    date: input.date,
    source: 'engine_generated',
    protectedAnchor: input.family === 'sparring',
    anchorId: null,
    startsAt: null,
    durationMinutes: { min: input.duration, target: input.duration, max: input.duration, unit: 'minute', confidence, precision: 'estimated' },
    intensityRpe: { min: input.intensity, target: input.intensity, max: input.intensity, unit: 'rpe', confidence, precision: 'estimated' },
    mergeDecisionId: null,
    stressScore: Math.round((input.duration * input.intensity) / 10),
    tissueLoads: input.family === 'sparring' ? ['combat', 'neural'] : ['full_body'],
    explanation: null,
    confidence,
  };
}

function entriesFromInput(input: ReadinessProfileInput, date: string): TrackingEntry[] {
  return [
    makeEntry({ id: 'legacy-readiness', type: 'readiness', value: input.subjectiveReadiness ?? input.energyLevel, date }),
    makeEntry({ id: 'legacy-sleep-quality', type: 'sleep_quality', value: input.sleepQuality, date }),
    makeEntry({ id: 'legacy-soreness', type: 'soreness', value: input.sorenessLevel, date }),
    makeEntry({ id: 'legacy-stress', type: 'stress', value: input.stressLevel, date }),
    makeEntry({ id: 'legacy-fatigue', type: 'fatigue', value: input.energyLevel == null ? null : 6 - input.energyLevel, date }),
    makeEntry({ id: 'legacy-pain', type: 'pain', value: input.painLevel, date }),
    makeEntry({ id: 'legacy-nutrition', type: 'nutrition_adherence', value: input.fuelHydrationStatus, date }),
    makeEntry({ id: 'legacy-hydration', type: 'hydration', value: input.urineColor != null ? Math.max(1, 8 - input.urineColor) : null, date }),
    makeEntry({ id: 'legacy-illness', type: 'illness', value: input.bodyTempF != null ? input.bodyTempF >= 100.4 : null, unit: null, date }),
  ].filter((entry): entry is TrackingEntry => entry !== null);
}

function sessionsFromInput(input: ReadinessProfileInput, date: string): ComposedSession[] {
  const sessions: ComposedSession[] = [];
  const sparringCount = input.recentSparringCount48h ?? 0;
  const impactCount = input.recentHighImpactCount48h ?? 0;
  const strengthCount = input.recentHeavyStrengthCount48h ?? 0;

  for (let index = 0; index < sparringCount; index += 1) {
    sessions.push(sessionStub({ id: `legacy-sparring-${index}`, date, family: 'sparring', intensity: 8, duration: 75 }));
  }
  for (let index = 0; index < impactCount; index += 1) {
    sessions.push(sessionStub({ id: `legacy-impact-${index}`, date, family: 'conditioning', intensity: 7, duration: 30 }));
  }
  for (let index = 0; index < strengthCount; index += 1) {
    sessions.push(sessionStub({ id: `legacy-strength-${index}`, date, family: 'strength', intensity: 7, duration: 50 }));
  }

  return sessions;
}

function getCognitiveAnchor(input: ReadinessProfileInput): PerformanceAnchor | null {
  const baseline = input.baselineCognitiveScore ?? null;
  const latest = input.latestCognitiveScore ?? null;
  if (baseline == null && latest == null) return null;

  if (baseline == null || latest == null || baseline <= 0) {
    return {
      key: 'cognitive_score',
      label: 'Reaction time',
      dimension: 'neural',
      status: 'unknown',
      value: latest,
      baseline,
      detail: 'Reaction-time anchor is incomplete, so it informs context but does not gate progression.',
    };
  }

  const ratio = latest / baseline;
  const status = ratio >= 1.25 ? 'below_baseline' : ratio <= 0.92 ? 'above_baseline' : 'normal';
  return {
    key: 'cognitive_score',
    label: 'Reaction time',
    dimension: 'neural',
    status,
    value: latest,
    baseline,
    detail: status === 'below_baseline'
      ? 'Reaction time is slower than baseline and points to neural fatigue or hydration strain.'
      : status === 'above_baseline'
        ? 'Reaction time is better than baseline and supports higher-quality expression.'
        : 'Reaction time is near baseline.',
  };
}

export function deriveLegacyReadinessState(profile: Pick<ReadinessProfile, 'overallReadiness' | 'flags'>): ReadinessState {
  const redFlags = profile.flags.filter((flag) => flag.level === 'red').length;
  const yellowFlags = profile.flags.filter((flag) => flag.level === 'yellow').length;

  if (redFlags > 0 || profile.overallReadiness < 38) return 'Depleted';
  if (yellowFlags >= 2 || profile.overallReadiness < 68) return 'Caution';
  return 'Prime';
}

export function deriveReadinessProfile(input: ReadinessProfileInput): ReadinessProfile {
  const date = '2026-01-01';
  const daysOfData = input.readinessHistory?.length ?? 0;
  const biology = input.cycleDay != null && input.cycleDay >= 1 && input.cycleDay <= 28
    ? adjustForBiology({ cycleDay: input.cycleDay, energyDeficitPercent: input.energyDeficitPercent ?? 0 })
    : null;
  const entries = entriesFromInput(input, date);
  const sessions = sessionsFromInput(input, date);
  const canonical = resolveReadinessState({
    athleteId: 'legacy-readiness-athlete',
    date,
    entries,
    completedSessions: sessions,
    acuteChronicWorkloadRatio: input.acwrRatio,
  }).readiness;
  const flags: ReadinessFlag[] = [];
  const sleepPercent = readinessPercent(input.sleepQuality);
  const stressPercent = readinessPercent(input.stressLevel);
  const sorenessPercent = readinessPercent(input.sorenessLevel);
  const painPercent = readinessPercent(input.painLevel);
  const nutritionPercent = readinessPercent(input.fuelHydrationStatus);
  const activationDelta = input.activationRPE != null
    ? input.activationRPE - (input.expectedActivationRPE ?? 4)
    : 0;

  if ((sleepPercent ?? 100) <= 25) addFlag(flags, { code: 'poor_sleep', level: 'yellow', dimension: 'neural', reason: 'Sleep quality is low enough to blunt sharpness and recovery.' });
  if ((stressPercent ?? 0) >= 75) addFlag(flags, { code: 'high_stress', level: 'yellow', dimension: 'neural', reason: 'Stress is elevated and should trigger cleaner, simpler loading.' });
  if ((sorenessPercent ?? 0) >= 75) addFlag(flags, { code: 'high_soreness', level: 'yellow', dimension: 'structural', reason: 'Soreness is elevated and tissue-heavy work should be substituted.' });
  if ((painPercent ?? 0) >= 75) addFlag(flags, { code: 'pain_restriction', level: (painPercent ?? 0) >= 100 ? 'red' : 'yellow', dimension: 'structural', reason: 'Pain is high enough to restrict loading, contact, or range today.' });
  if ((nutritionPercent ?? 100) <= 25) addFlag(flags, { code: 'fuel_hydration_limiter', level: 'yellow', dimension: 'metabolic', reason: 'Food or fluids feel behind, so training support should increase before hard work.' });
  if (input.acwrRatio >= 1.55) addFlag(flags, { code: 'acwr_redline', level: 'red', dimension: 'structural', reason: `ACWR is redlining at ${input.acwrRatio.toFixed(2)}.` });
  else if (input.acwrRatio >= 1.32) addFlag(flags, { code: 'acwr_elevated', level: 'yellow', dimension: 'structural', reason: `ACWR is elevated at ${input.acwrRatio.toFixed(2)}.` });
  if ((input.loadMetrics?.rollingFatigueScore ?? 0) >= 80) addFlag(flags, { code: 'fatigue_spike', level: 'red', dimension: 'metabolic', reason: 'Rolling fatigue is high enough to require protection.' });
  else if ((input.loadMetrics?.rollingFatigueScore ?? 0) >= 60) addFlag(flags, { code: 'fatigue_hot', level: 'yellow', dimension: 'metabolic', reason: 'Rolling fatigue is running hot and volume should be trimmed.' });
  if (activationDelta >= 3) addFlag(flags, { code: 'activation_flat', level: 'red', dimension: 'neural', reason: 'Activation RPE is far above plan and points to a bad neural window.' });
  else if (activationDelta >= 2) addFlag(flags, { code: 'activation_off', level: 'yellow', dimension: 'neural', reason: 'Activation RPE is above plan and max-speed work should be substituted.' });
  if ((input.urineColor ?? 0) >= 7) addFlag(flags, { code: 'severe_dehydration', level: 'red', dimension: 'metabolic', reason: 'Hydration symptoms indicate severe risk.' });
  else if ((input.urineColor ?? 0) >= 5) addFlag(flags, { code: 'dehydration_risk', level: 'yellow', dimension: 'metabolic', reason: 'Hydration markers are trending in the wrong direction.' });
  if ((input.bodyTempF ?? 98.6) >= 100.4) addFlag(flags, { code: 'illness_signal', level: 'red', dimension: 'global', reason: 'Body temperature is high enough to treat as an illness red flag.' });
  if (input.isOnActiveCut && (input.weightCutIntensityCap ?? 10) <= 4) addFlag(flags, { code: 'body_mass_pressure', level: (input.weightCutIntensityCap ?? 10) <= 2 ? 'red' : 'yellow', dimension: 'metabolic', reason: 'Body-mass context is materially constraining training output.' });
  if (canonical.missingData.length > 0 || daysOfData < 7) addFlag(flags, { code: 'insufficient_data', level: 'yellow', dimension: 'global', reason: 'Readiness data is sparse, so today should be treated with lower confidence.' });
  if (canonical.trendFlags.includes('wearable_conflict_subjective_concern')) addFlag(flags, { code: 'subjective_concern', level: 'yellow', dimension: 'global', reason: 'Subjective concern is respected even when wearable markers look normal.' });

  const cognitiveAnchor = getCognitiveAnchor(input);
  if (cognitiveAnchor?.status === 'below_baseline') {
    addFlag(flags, {
      code: 'cognitive_decline',
      level: cognitiveAnchor.value != null && cognitiveAnchor.baseline != null && cognitiveAnchor.value / cognitiveAnchor.baseline >= 1.35 ? 'red' : 'yellow',
      dimension: 'neural',
      reason: 'Reaction time is below baseline and likely reflects hydration strain or neural fatigue.',
    });
  }

  const neuralBase = average([
    canonical.subjectiveScore ?? 50,
    canonical.sleepScore ?? 50,
    canonical.stressScore ?? 50,
  ]);
  const structuralBase = average([
    canonical.sorenessScore ?? 50,
    painPercent == null ? 80 : 100 - painPercent,
    100 - Math.min(34, Math.round((input.recentSparringDecayLoad5d ?? (input.recentSparringCount48h ?? 0) * 0.8) * 12)),
    100 - Math.min(18, (input.recentHighImpactCount48h ?? 0) * 8),
  ]);
  const metabolicBase = average([
    canonical.sleepScore ?? 50,
    canonical.nutritionSupportScore ?? 50,
    canonical.recoveryScore ?? 50,
    100 - Math.min(22, (input.externalHeartRateLoad ?? 0) / 4),
  ]);
  const neuralReadiness = clamp(Math.round(neuralBase - (activationDelta > 0 ? activationDelta * 8 : 0)), 8, 100);
  const structuralReadiness = clamp(Math.round(structuralBase - canonical.injuryPenalty), 8, 100);
  const metabolicReadiness = clamp(Math.round(metabolicBase - canonical.illnessPenalty), 8, 100);
  const overallReadiness = clamp(canonical.overallReadiness ?? Math.round(average([neuralReadiness, structuralReadiness, metabolicReadiness])), 8, 100);
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
  if (cognitiveAnchor) anchors.push(cognitiveAnchor);

  return {
    neuralReadiness,
    structuralReadiness,
    metabolicReadiness,
    overallReadiness,
    trend: getTrend(input.readinessHistory ?? []),
    dataConfidence: confidenceLevel(canonical.confidence.level),
    dataSufficiency: dataSufficiency(daysOfData),
    cardioModifier: biology?.cardioModifier ?? 1,
    proteinModifier: biology?.proteinModifier ?? 1,
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
  const globalRedFlags = profile.flags.filter((flag) => flag.dimension === 'global' && flag.level === 'red').length;

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

  explosiveBudget -= (neuralYellowFlags * 6) + (neuralRedFlags * 14);
  impactBudget -= (structuralYellowFlags * 12) + (structuralRedFlags * 18);
  strengthBudget -= (structuralYellowFlags * 6) + (structuralRedFlags * 10);
  aerobicBudget -= Math.min(18, (metabolicYellowFlags * 7) + (metabolicRedFlags * 14));

  if (taperWindow || protectWindow) {
    explosiveBudget -= 4;
    impactBudget -= 6;
  }

  explosiveBudget = clamp(explosiveBudget, 8, 100);
  impactBudget = clamp(impactBudget, 8, 100);
  strengthBudget = clamp(strengthBudget, 8, 100);
  aerobicBudget = clamp(aerobicBudget, 8, 100);

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
  const blocked: StimulusType[] = [];

  if (explosiveBudget < 60 || neuralYellowFlags > 0 || neuralRedFlags > 0 || globalRedFlags > 0) blocked.push('max_velocity');
  if (explosiveBudget < 45 || impactBudget < 58 || structuralRedFlags > 0) blocked.push('plyometric');
  if (impactBudget < 68 || structuralYellowFlags > 0 || structuralRedFlags > 0) blocked.push('high_impact');
  if (impactBudget < 62 || protectWindow || structuralYellowFlags > 0 || structuralRedFlags > 0) blocked.push('hard_sparring');
  if (strengthBudget < 48 || structuralRedFlags > 0) blocked.push('heavy_strength');
  if (aerobicBudget < 62 || metabolicRedFlags > 0 || globalRedFlags > 0) blocked.push('glycolytic_conditioning');
  if ((aerobicBudget < 55 && (metabolicYellowFlags > 0 || metabolicRedFlags > 0)) || (aerobicBudget < 38 && profile.readinessState === 'Depleted')) {
    blocked.push('tempo_conditioning');
  }
  if (context.hasTechnicalSession) blocked.push('recovery');

  const blockedStimuli = uniqueStimuli(blocked);
  const allowedStimuli = uniqueStimuli(allowed.filter((stimulus) => !blockedStimuli.includes(stimulus)));
  let intensityCap = redFlags > 0 ? 4 : yellowFlags >= 2 ? 6 : 8;
  if (explosiveBudget < 45 && strengthBudget >= 55) intensityCap = Math.min(intensityCap, 7);
  if (aerobicBudget < 45) intensityCap = Math.min(intensityCap, 6);
  if (protectWindow || taperWindow) intensityCap = Math.min(intensityCap, 6);
  if (context.trainingIntensityCap != null) intensityCap = Math.min(intensityCap, context.trainingIntensityCap);

  const maxConditioningRounds = aerobicBudget < 40 ? 4 : aerobicBudget < 55 ? 6 : null;

  return {
    explosiveBudget,
    impactBudget,
    strengthBudget,
    aerobicBudget,
    volumeMultiplier: Math.round(clamp(profile.overallReadiness / 100 - (redFlags > 0 ? 0.15 : yellowFlags >= 2 ? 0.08 : 0), 0.35, 1.05) * 100) / 100,
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
