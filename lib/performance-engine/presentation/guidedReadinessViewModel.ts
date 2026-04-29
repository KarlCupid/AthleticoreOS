import type {
  AthleticorePhase,
  ConfidenceLevel,
  ConfidenceValue,
  ISODateString,
  ReadinessState,
  RiskFlag,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export type GuidedReadinessStatus =
  | 'ready'
  | 'train_smart'
  | 'protect_recovery'
  | 'adjust_first'
  | 'needs_context';

export interface GuidedReadinessConfidence {
  level: ConfidenceLevel;
  label: string;
  summary: string;
  missingData: string[];
}

export interface GuidedReadinessQuickInput {
  id:
    | 'recovery_feeling'
    | 'soreness'
    | 'sleep_quality'
    | 'fatigue'
    | 'mood_stress'
    | 'pain_injury'
    | 'fueling_confidence';
  label: string;
  prompt: string;
  priority: 'core' | 'supporting';
}

export interface GuidedReadinessViewModel {
  source: 'unified_performance_engine';
  available: boolean;
  date: ISODateString | null;
  athleteId: string | null;
  phase: AthleticorePhase | 'unknown';
  phaseLabel: string;
  status: GuidedReadinessStatus;
  readinessLabel: string;
  title: 'Readiness guidance';
  primaryMessage: string;
  whyItChanged: string;
  confidence: GuidedReadinessConfidence;
  trainingAdjustment: string;
  fuelingOrRecoveryAdjustment: string;
  riskHighlights: string[];
  quickInputs: GuidedReadinessQuickInput[];
  nextActionLabel: string;
  sourcePerformanceStateId: string | null;
}

const QUICK_INPUTS: GuidedReadinessQuickInput[] = [
  {
    id: 'recovery_feeling',
    label: 'Recovery feeling',
    prompt: 'How ready does your body feel to train with control?',
    priority: 'core',
  },
  {
    id: 'soreness',
    label: 'Soreness',
    prompt: 'How much soreness is changing movement today?',
    priority: 'core',
  },
  {
    id: 'sleep_quality',
    label: 'Sleep',
    prompt: 'How was sleep last night?',
    priority: 'core',
  },
  {
    id: 'fatigue',
    label: 'Fatigue',
    prompt: 'How much fatigue are you carrying right now?',
    priority: 'core',
  },
  {
    id: 'mood_stress',
    label: 'Mood / stress',
    prompt: 'How much stress or mental load is on the day?',
    priority: 'supporting',
  },
  {
    id: 'pain_injury',
    label: 'Pain or injury',
    prompt: 'Is pain changing range, loading, contact, or movement?',
    priority: 'core',
  },
  {
    id: 'fueling_confidence',
    label: 'Fueling confidence',
    prompt: 'Does recent food and hydration feel reliable enough for the work?',
    priority: 'supporting',
  },
];

const UNAVAILABLE_GUIDED_READINESS: GuidedReadinessViewModel = {
  source: 'unified_performance_engine',
  available: false,
  date: null,
  athleteId: null,
  phase: 'unknown',
  phaseLabel: 'Unknown',
  status: 'needs_context',
  readinessLabel: 'Needs context',
  title: 'Readiness guidance',
  primaryMessage: 'Athleticore needs today\'s performance state before it can guide readiness.',
  whyItChanged: 'Missing performance state is unknown, not safe. A quick check-in helps Athleticore guide the plan with more care.',
  confidence: {
    level: 'unknown',
    label: 'Unknown confidence',
    summary: 'Confidence is unknown because the Unified Performance Engine output is unavailable.',
    missingData: ['Unified performance state'],
  },
  trainingAdjustment: 'Training adjustment is pending until the unified performance state is available.',
  fuelingOrRecoveryAdjustment: 'Fueling and recovery guidance will appear once readiness context is available.',
  riskHighlights: [],
  quickInputs: QUICK_INPUTS,
  nextActionLabel: 'Log your check-in',
  sourcePerformanceStateId: null,
};

export function buildGuidedReadinessViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
): GuidedReadinessViewModel {
  if (!result) return UNAVAILABLE_GUIDED_READINESS;

  const performanceState = result.canonicalOutputs.performanceState;
  const readiness = result.canonicalOutputs.readiness;
  const risks = activeReadinessRisks([
    ...result.riskFlags,
    ...readiness.riskFlags,
  ]);
  const missingData = readiness.missingData.map((field) => humanize(field.field));
  const status = guidedStatus(readiness, risks);

  return {
    source: 'unified_performance_engine',
    available: true,
    date: readiness.date ?? performanceState.asOfDate,
    athleteId: performanceState.athlete.athleteId,
    phase: performanceState.phase.current,
    phaseLabel: humanize(performanceState.phase.current),
    status,
    readinessLabel: statusLabel(status),
    title: 'Readiness guidance',
    primaryMessage: buildPrimaryMessage(readiness, status, risks),
    whyItChanged: buildWhyItChanged(readiness, status, missingData),
    confidence: buildConfidence(readiness.confidence, missingData),
    trainingAdjustment: buildTrainingAdjustment(readiness),
    fuelingOrRecoveryAdjustment: buildFuelingOrRecoveryAdjustment(readiness),
    riskHighlights: risks.map(riskCopy).slice(0, 3),
    quickInputs: QUICK_INPUTS,
    nextActionLabel: nextActionLabel(status, readiness),
    sourcePerformanceStateId: sourcePerformanceStateId(performanceState),
  };
}

function guidedStatus(readiness: ReadinessState, risks: RiskFlag[]): GuidedReadinessStatus {
  if (readiness.readinessBand === 'unknown' || readiness.missingData.length >= 3) return 'needs_context';
  if (hasInjuryConcern(readiness, risks)) return 'adjust_first';
  if (readiness.readinessBand === 'red' || readiness.readinessBand === 'orange') return 'protect_recovery';
  if (readiness.readinessBand === 'yellow') return 'train_smart';
  return 'ready';
}

function statusLabel(status: GuidedReadinessStatus): string {
  if (status === 'ready') return 'Ready';
  if (status === 'train_smart') return 'Train smart';
  if (status === 'protect_recovery') return 'Recovery first';
  if (status === 'adjust_first') return 'Adjust first';
  return 'Needs context';
}

function buildPrimaryMessage(
  readiness: ReadinessState,
  status: GuidedReadinessStatus,
  risks: RiskFlag[],
): string {
  const missing = readiness.missingData.map((field) => humanize(field.field).toLowerCase());
  if (status === 'needs_context') {
    const missingText = missing.length > 0 ? joinList(missing.slice(0, 3)) : 'sleep, soreness, and readiness';
    return `Your readiness is hard to judge today because ${missingText} ${missing.length === 1 ? 'has not' : 'have not'} been logged. A quick check-in will help Athleticore guide the plan.`;
  }
  if (hasInjuryConcern(readiness, risks)) {
    return 'Pain or injury concern is present, so Athleticore is protecting safety before hard work.';
  }
  if (readiness.trendFlags.includes('post_sparring_soreness')) {
    return 'Your soreness is high after sparring, so Athleticore is protecting recovery and avoiding extra lower-body stress.';
  }
  if (status === 'protect_recovery') {
    if (isSleepLow(readiness) && isSorenessHigh(readiness)) {
      return "You're a little under-recovered today. Sleep was short and soreness is up, so Athleticore is keeping the main work but cutting the extra volume.";
    }
    return "You're under-recovered today, so Athleticore is protecting recovery and keeping the plan controlled.";
  }
  if (status === 'train_smart') {
    return "You're carrying a bit more fatigue today, so keep the main work sharp and trim the extras.";
  }
  return 'Readiness looks steady today. Follow the plan, keep the work clean, and log anything that changes.';
}

function buildWhyItChanged(
  readiness: ReadinessState,
  status: GuidedReadinessStatus,
  missingData: string[],
): string {
  if (status === 'needs_context') {
    return 'Athleticore treats missing readiness data as unknown instead of assuming the day is safe to push.';
  }
  if (readiness.trendFlags.includes('subjective_concern')) {
    return 'Your subjective check-in is being respected because how you feel can change the right training call.';
  }
  if (readiness.trendFlags.includes('wearable_conflict_subjective_concern')) {
    return 'Even with good device signals, your low readiness check-in is being respected.';
  }
  if (readiness.trendFlags.includes('post_sparring_soreness')) {
    return 'Recent sparring and higher soreness are changing the cost of extra work today.';
  }
  if (readiness.trendFlags.includes('low_nutrition_support')) {
    return 'Fuel has been light for the work, so readiness guidance is more cautious.';
  }
  if (readiness.trendFlags.includes('injury_reported')) {
    return 'Pain or injury context changes the plan before intensity does.';
  }
  if (readiness.explanation?.reasons[0]) {
    return humanizeSentence(readiness.explanation.reasons[0]);
  }
  if (missingData.length > 0) {
    return `Confidence is lower because ${joinList(missingData.map((item) => item.toLowerCase()).slice(0, 3))} is still missing.`;
  }
  return 'Readiness is being resolved from check-in, sleep, soreness, stress, fueling, recent training, and risk context together.';
}

function buildConfidence(
  confidence: ConfidenceValue,
  missingData: string[],
): GuidedReadinessConfidence {
  if (confidence.level === 'unknown' || confidence.level === 'low') {
    return {
      level: confidence.level,
      label: confidenceLabel(confidence),
      summary: missingData.length > 0
        ? `Confidence is limited because ${joinList(missingData.map((item) => item.toLowerCase()).slice(0, 3))} is missing. That is not a problem, but Athleticore will be more cautious.`
        : 'Confidence is limited because the readiness trend is not established yet.',
      missingData,
    };
  }
  return {
    level: confidence.level,
    label: confidenceLabel(confidence),
    summary: 'Confidence is strong enough for Athleticore to guide today from the unified performance state.',
    missingData,
  };
}

function buildTrainingAdjustment(readiness: ReadinessState): string {
  const adjustment = readiness.recommendedTrainingAdjustment;
  if (adjustment.professionalReviewRecommended) {
    return 'Training should adjust around the pain or illness concern before hard work is added.';
  }
  if (adjustment.replaceWithMobility) {
    return 'Training should shift toward mobility or easy work today.';
  }
  if (adjustment.moveHeavySession) {
    return 'Heavy work should move away from today so recovery and key sport work are protected.';
  }
  if (adjustment.type === 'reduce_intensity') {
    return 'Intensity should come down today so the main work stays controlled.';
  }
  if (adjustment.type === 'reduce_volume') {
    return 'Keep the main session sharp and trim extra volume.';
  }
  if (adjustment.type === 'avoid_harmful_merge') {
    return 'Avoid stacking hard work until the missing readiness context is filled in.';
  }
  return 'No protective training change is needed from the available readiness data.';
}

function buildFuelingOrRecoveryAdjustment(readiness: ReadinessState): string {
  const adjustment = readiness.recommendedNutritionAdjustment;
  if (adjustment.holdWeightLossPressure) {
    return 'Fueling and recovery come first today. Athleticore should not add body-mass pressure around low readiness.';
  }
  if (adjustment.type === 'increase_fueling') {
    return 'Fueling support should increase before and after training.';
  }
  if (adjustment.type === 'increase_recovery_nutrition') {
    return 'Recovery nutrition matters today: enough food, fluids, and sleep.';
  }
  if (adjustment.type === 'improve_tracking_confidence') {
    return 'Fueling impact is unknown until recent food or hydration context is clearer.';
  }
  if (readiness.readinessBand === 'red' || readiness.readinessBand === 'orange') {
    return 'Recovery priority: easy movement, food, hydration, and sleep.';
  }
  return 'Keep food, hydration, and sleep steady so the next session has room to land.';
}

function nextActionLabel(status: GuidedReadinessStatus, readiness: ReadinessState): string {
  if (status === 'needs_context' || readiness.readinessBand === 'unknown') return 'Log your check-in';
  if (status === 'adjust_first') return 'Review today\'s adjustment';
  if (status === 'protect_recovery') return 'Protect recovery';
  return 'Save check-in';
}

function activeReadinessRisks(risks: RiskFlag[]): RiskFlag[] {
  const readinessRisks = risks.filter((risk) =>
    risk.status === 'active'
    && (
      risk.domain === 'readiness'
      || risk.code === 'poor_readiness'
      || risk.code === 'injury_conflict'
      || risk.code === 'illness_conflict'
      || risk.code === 'under_fueling_risk'
      || risk.code === 'missing_data'
      || risk.code === 'excessive_training_load'
    ),
  );
  return Array.from(new Map(readinessRisks.map((risk) => [risk.id || `${risk.code}:${risk.message}`, risk])).values());
}

function riskCopy(risk: RiskFlag): string {
  if (risk.code === 'injury_conflict') {
    return 'Pain or injury concern is active, so Athleticore should adjust before hard work.';
  }
  if (risk.code === 'illness_conflict') {
    return 'Illness concern is active, so recovery and safety lead the day.';
  }
  if (risk.code === 'poor_readiness') {
    return 'Readiness is low enough that recovery should shape training today.';
  }
  if (risk.code === 'under_fueling_risk') {
    return 'Fuel has been light for the work, so Athleticore is protecting energy availability.';
  }
  if (risk.code === 'missing_data') {
    return 'Important readiness data is missing, so confidence is lower instead of assumed safe.';
  }
  return humanizeSentence(risk.message);
}

function hasInjuryConcern(readiness: ReadinessState, risks: RiskFlag[]): boolean {
  return readiness.trendFlags.includes('injury_reported')
    || readiness.injuryPenalty > 0
    || risks.some((risk) => risk.code === 'injury_conflict');
}

function isSleepLow(readiness: ReadinessState): boolean {
  return readiness.sleepScore !== null && readiness.sleepScore < 55;
}

function isSorenessHigh(readiness: ReadinessState): boolean {
  return readiness.sorenessScore !== null && readiness.sorenessScore < 45;
}

function sourcePerformanceStateId(performanceState: unknown): string | null {
  const maybe = performanceState as { id?: unknown; performanceStateId?: unknown };
  if (typeof maybe.id === 'string') return maybe.id;
  if (typeof maybe.performanceStateId === 'string') return maybe.performanceStateId;
  return null;
}

function confidenceLabel(confidence: ConfidenceValue): string {
  if (confidence.level === 'unknown') return 'Unknown confidence';
  return `${humanize(confidence.level)} confidence`;
}

function joinList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function humanizeSentence(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return cleaned;
  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`;
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
