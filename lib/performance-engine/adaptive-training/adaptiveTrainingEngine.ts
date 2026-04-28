import type {
  AthleteJourneyState,
  AthleticorePhase,
  ComposedSession,
  ConfidenceValue,
  Explanation,
  ISODateString,
  ISODateTimeString,
  MeasurementRange,
  PerformanceState,
  SessionFamily,
  SessionSource,
  TrainingBlock,
  TrainingBlockGoal,
} from '../types/index.ts';
import { createComposedSession } from '../types/index.ts';
import { confidenceFromLevel } from '../utils/confidence.ts';
import { addDays } from '../utils/dates.ts';
import { createMeasurementRange } from '../utils/units.ts';
import { createExplanation, explainPlanAdjustment } from '../explanation-engine/explanationEngine.ts';
import { createRiskFlag } from '../risk-safety/riskSafetyEngine.ts';

export type AdaptiveSessionKind =
  | 'mobility'
  | 'prehab'
  | 'core'
  | 'zone2'
  | 'easy_aerobic'
  | 'strength'
  | 'heavy_lower_strength'
  | 'heavy_upper_strength'
  | 'hard_intervals'
  | 'power'
  | 'plyo'
  | 'speed'
  | 'long_endurance'
  | 'threshold'
  | 'conditioning'
  | 'sparring'
  | 'boxing_skill'
  | 'competition'
  | 'recovery'
  | 'breathwork'
  | 'rest';

export type AdaptationPriority =
  | 'strength'
  | 'power'
  | 'speed'
  | 'conditioning'
  | 'aerobic_base'
  | 'boxing_skill'
  | 'mobility'
  | 'prehab'
  | 'core'
  | 'recovery';

export type MergeDecisionType =
  | 'merge_single_session'
  | 'same_day_split'
  | 'embedded_microdose'
  | 'keep_separate'
  | 'defer'
  | 'reject';

export type StressLabel = 'recovery' | 'low' | 'medium' | 'hard' | 'competition';

export interface TissueLoad {
  tissue: 'lower' | 'upper' | 'core' | 'full_body' | 'neural' | 'combat' | 'aerobic';
  load: number;
}

export interface AdaptiveSessionCandidate {
  id: string;
  title: string;
  kind: AdaptiveSessionKind;
  family: SessionFamily;
  priority: AdaptationPriority;
  durationMinutes: number;
  intensityRpe: number;
  earliestDayOfWeek?: number | null;
  preferredDayOfWeek?: number | null;
  fixedDate?: ISODateString | null;
  protectedAnchor?: boolean;
  anchorId?: string | null;
  source?: SessionSource;
  canMerge?: boolean;
  tissueLoads?: TissueLoad[];
  explanation?: Explanation | null;
}

export interface ProtectedAnchorInput {
  id: string;
  label: string;
  kind: AdaptiveSessionKind;
  family?: SessionFamily;
  dayOfWeek: number;
  date?: ISODateString | null;
  startTime?: string | null;
  durationMinutes: number;
  intensityRpe: number;
  source?: SessionSource;
  canMerge?: boolean;
  reason?: string;
}

export interface MergeScoreBreakdown {
  efficiencyGain: number;
  recoveryDayPreservation: number;
  adaptationSynergy: number;
  warmupCooldownReuse: number;
  availabilityFit: number;
  phaseCompatibility: number;
  nutritionCompatibility: number;
  interferencePenalty: number;
  loadSpikePenalty: number;
  priorityQualityLoss: number;
  sameTissueOverload: number;
  athleteReadinessPenalty: number;
  underFuelingPenalty: number;
  protectedAnchorConflictPenalty: number;
  competitionProximityPenalty: number;
}

export interface MergeScore {
  id: string;
  decision: MergeDecisionType;
  score: number;
  positiveFactors: string[];
  negativeFactors: string[];
  breakdown: MergeScoreBreakdown;
  order: string[];
  explanation: Explanation;
}

export interface WeeklyStressDay {
  date: ISODateString;
  dayOfWeek: number;
  sessions: ComposedSession[];
  totalStress: number;
  label: StressLabel;
  hardDayAnchor: boolean;
  recoveryPreserved: boolean;
}

export interface WeeklyStressTopology {
  weekStartDate: ISODateString;
  days: WeeklyStressDay[];
  hardDayCount: number;
  recoveryDayCount: number;
  mediumSpreadWarning: boolean;
  explanation: Explanation;
}

export interface TrainingConflict {
  id: string;
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  blocksPlan: boolean;
  sessionIds: string[];
  message: string;
  explanation: Explanation;
}

export interface AdaptiveTrainingWeekInput {
  performanceState: PerformanceState;
  weekStartDate: ISODateString;
  protectedAnchors?: ProtectedAnchorInput[];
  existingSessions?: AdaptiveSessionCandidate[];
  candidateSessions?: AdaptiveSessionCandidate[];
  generatedAt?: ISODateTimeString | null;
}

export interface AdaptiveTrainingWeekResult {
  trainingBlock: TrainingBlock;
  composedSessions: ComposedSession[];
  topology: WeeklyStressTopology;
  mergeScores: MergeScore[];
  conflicts: TrainingConflict[];
  explanations: Explanation[];
}

const ENGINE_CONFIDENCE = confidenceFromLevel('medium', ['Adaptive Training Engine resolved the weekly structure.']);

function range<TUnit extends 'minute' | 'rpe'>(
  target: number,
  unit: TUnit,
  confidence: ConfidenceValue = ENGINE_CONFIDENCE,
): MeasurementRange<TUnit> {
  return createMeasurementRange({
    min: target,
    target,
    max: target,
    unit,
    confidence,
  });
}

function dayOfWeekFromDate(date: ISODateString): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function dateForDay(weekStartDate: ISODateString, dayOfWeek: number): ISODateString {
  const weekStartDay = dayOfWeekFromDate(weekStartDate);
  const offset = (dayOfWeek - weekStartDay + 7) % 7;
  return addDays(weekStartDate, offset);
}

function normalizeDay(day: number | null | undefined): number | null {
  if (day == null) return null;
  if (day === 7) return 0;
  if (day < 0 || day > 6) return null;
  return day;
}

function kindToFamily(kind: AdaptiveSessionKind): SessionFamily {
  switch (kind) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
      return 'boxing_skill';
    case 'strength':
    case 'heavy_lower_strength':
    case 'heavy_upper_strength':
    case 'power':
    case 'plyo':
    case 'speed':
      return 'strength';
    case 'conditioning':
    case 'hard_intervals':
    case 'threshold':
      return 'conditioning';
    case 'zone2':
    case 'easy_aerobic':
    case 'long_endurance':
      return 'roadwork';
    case 'mobility':
    case 'prehab':
    case 'core':
    case 'recovery':
    case 'breathwork':
      return 'recovery';
    case 'competition':
      return 'assessment';
    case 'rest':
      return 'rest';
    default:
      return 'other';
  }
}

function defaultTissueLoads(kind: AdaptiveSessionKind): TissueLoad[] {
  switch (kind) {
    case 'heavy_lower_strength':
      return [{ tissue: 'lower', load: 8 }, { tissue: 'neural', load: 7 }];
    case 'heavy_upper_strength':
    case 'strength':
      return [{ tissue: 'upper', load: 6 }, { tissue: 'neural', load: 5 }];
    case 'speed':
    case 'power':
    case 'plyo':
      return [{ tissue: 'neural', load: 7 }, { tissue: 'lower', load: 5 }];
    case 'hard_intervals':
    case 'threshold':
    case 'conditioning':
      return [{ tissue: 'aerobic', load: 7 }, { tissue: 'full_body', load: 5 }];
    case 'long_endurance':
      return [{ tissue: 'aerobic', load: 8 }, { tissue: 'lower', load: 5 }];
    case 'sparring':
      return [{ tissue: 'combat', load: 9 }, { tissue: 'neural', load: 8 }];
    case 'boxing_skill':
      return [{ tissue: 'combat', load: 5 }, { tissue: 'neural', load: 4 }];
    case 'competition':
      return [{ tissue: 'combat', load: 10 }, { tissue: 'neural', load: 10 }, { tissue: 'full_body', load: 10 }];
    case 'core':
      return [{ tissue: 'core', load: 3 }];
    case 'zone2':
    case 'easy_aerobic':
      return [{ tissue: 'aerobic', load: 3 }];
    case 'mobility':
    case 'prehab':
    case 'breathwork':
    case 'recovery':
      return [{ tissue: 'full_body', load: 1 }];
    default:
      return [];
  }
}

function candidateStress(candidate: Pick<AdaptiveSessionCandidate, 'durationMinutes' | 'intensityRpe'>): number {
  return Math.round((candidate.durationMinutes * candidate.intensityRpe) / 10);
}

function sessionStress(session: ComposedSession): number {
  return session.stressScore ?? Math.round(((session.durationMinutes.target ?? 0) * (session.intensityRpe.target ?? 0)) / 10);
}

function isHardKind(kind: AdaptiveSessionKind): boolean {
  return [
    'sparring',
    'competition',
    'heavy_lower_strength',
    'heavy_upper_strength',
    'hard_intervals',
    'threshold',
    'power',
    'plyo',
    'speed',
  ].includes(kind);
}

function isRecoveryKind(kind: AdaptiveSessionKind): boolean {
  return ['mobility', 'prehab', 'breathwork', 'recovery', 'rest'].includes(kind);
}

function isStrengthKind(kind: AdaptiveSessionKind): boolean {
  return ['strength', 'heavy_lower_strength', 'heavy_upper_strength'].includes(kind);
}

function isEasyAerobicKind(kind: AdaptiveSessionKind): boolean {
  return ['zone2', 'easy_aerobic'].includes(kind);
}

function sameTissueLoad(a: AdaptiveSessionCandidate, b: AdaptiveSessionCandidate): boolean {
  const aLoads = new Set((a.tissueLoads ?? defaultTissueLoads(a.kind)).filter((load) => load.load >= 5).map((load) => load.tissue));
  return (b.tissueLoads ?? defaultTissueLoads(b.kind)).some((load) => load.load >= 5 && aLoads.has(load.tissue));
}

function mergeScoreId(a: Pick<AdaptiveSessionCandidate, 'id'>, b: Pick<AdaptiveSessionCandidate, 'id'>): string {
  return `${a.id}::${b.id}`;
}

function emptyBreakdown(): MergeScoreBreakdown {
  return {
    efficiencyGain: 0,
    recoveryDayPreservation: 0,
    adaptationSynergy: 0,
    warmupCooldownReuse: 0,
    availabilityFit: 0,
    phaseCompatibility: 0,
    nutritionCompatibility: 0,
    interferencePenalty: 0,
    loadSpikePenalty: 0,
    priorityQualityLoss: 0,
    sameTissueOverload: 0,
    athleteReadinessPenalty: 0,
    underFuelingPenalty: 0,
    protectedAnchorConflictPenalty: 0,
    competitionProximityPenalty: 0,
  };
}

function scoreFromBreakdown(breakdown: MergeScoreBreakdown): number {
  return breakdown.efficiencyGain
    + breakdown.recoveryDayPreservation
    + breakdown.adaptationSynergy
    + breakdown.warmupCooldownReuse
    + breakdown.availabilityFit
    + breakdown.phaseCompatibility
    + breakdown.nutritionCompatibility
    - breakdown.interferencePenalty
    - breakdown.loadSpikePenalty
    - breakdown.priorityQualityLoss
    - breakdown.sameTissueOverload
    - breakdown.athleteReadinessPenalty
    - breakdown.underFuelingPenalty
    - breakdown.protectedAnchorConflictPenalty
    - breakdown.competitionProximityPenalty;
}

function mergeExplanation(input: {
  decision: MergeDecisionType;
  a: AdaptiveSessionCandidate;
  b: AdaptiveSessionCandidate;
  positive: string[];
  negative: string[];
  score: number;
}): Explanation {
  return explainPlanAdjustment({
    summary: `Merge decision: ${input.decision.replace(/_/g, ' ')} for ${input.a.title} and ${input.b.title}.`,
    reasons: [
      ...input.positive,
      ...input.negative.map((factor) => `Constraint: ${factor}.`),
      `Merge score ${Math.round(input.score)} favors ${input.decision.replace(/_/g, ' ')}.`,
    ],
    blocked: input.decision === 'reject',
    confidence: ENGINE_CONFIDENCE,
  });
}

function asCandidateFromSession(session: ComposedSession): AdaptiveSessionCandidate {
  return {
    id: session.id,
    title: session.title,
    kind: session.family === 'sparring'
      ? 'sparring'
      : session.family === 'boxing_skill'
        ? 'boxing_skill'
        : session.family === 'strength'
          ? (session.intensityRpe.target ?? 0) >= 7 ? 'heavy_lower_strength' : 'strength'
          : session.family === 'conditioning'
            ? (session.intensityRpe.target ?? 0) >= 7 ? 'hard_intervals' : 'conditioning'
            : session.family === 'roadwork'
              ? (session.intensityRpe.target ?? 0) >= 7 ? 'threshold' : 'zone2'
              : session.family === 'assessment'
                ? 'competition'
                : 'mobility',
    family: session.family,
    priority: session.family === 'strength' ? 'strength' : session.family === 'conditioning' ? 'conditioning' : 'recovery',
    durationMinutes: session.durationMinutes.target ?? 0,
    intensityRpe: session.intensityRpe.target ?? 0,
    fixedDate: session.date,
    preferredDayOfWeek: session.date ? dayOfWeekFromDate(session.date) : null,
    protectedAnchor: session.protectedAnchor,
    anchorId: session.anchorId,
    source: session.source,
    canMerge: session.source === 'engine_generated',
    tissueLoads: (session.tissueLoads ?? []).map((tissue) => ({ tissue: tissue as TissueLoad['tissue'], load: 5 })),
  };
}

export function scoreTrainingMerge(input: {
  primary: AdaptiveSessionCandidate;
  secondary: AdaptiveSessionCandidate;
  phase?: AthleticorePhase;
  readinessBand?: string;
  underFueled?: boolean;
  nearCompetition?: boolean;
  availabilityMinutes?: number | null;
}): MergeScore {
  const { primary, secondary } = input;
  const breakdown = emptyBreakdown();
  const positive: string[] = [];
  const negative: string[] = [];
  let decision: MergeDecisionType = 'keep_separate';
  let order = [primary.id, secondary.id];

  const protectedConflict = (primary.protectedAnchor || secondary.protectedAnchor)
    && !(primary.canMerge || secondary.canMerge)
    && !isRecoveryKind(primary.kind)
    && !isRecoveryKind(secondary.kind);
  const competitionInvolved = primary.kind === 'competition' || secondary.kind === 'competition';
  const intenseInvolved = isHardKind(primary.kind) || isHardKind(secondary.kind);

  if (competitionInvolved && intenseInvolved) {
    breakdown.competitionProximityPenalty += 90;
    negative.push('Competition proximity rejects intense work.');
    decision = 'reject';
  } else if (competitionInvolved && (isRecoveryKind(primary.kind) || isRecoveryKind(secondary.kind))) {
    breakdown.recoveryDayPreservation += 10;
    breakdown.phaseCompatibility += 8;
    positive.push('Very light recovery support can sit adjacent to competition when appropriate.');
    decision = 'embedded_microdose';
  } else if (
    (primary.kind === 'sparring' && ['heavy_lower_strength', 'speed', 'power', 'plyo'].includes(secondary.kind))
    || (secondary.kind === 'sparring' && ['heavy_lower_strength', 'speed', 'power', 'plyo'].includes(primary.kind))
  ) {
    breakdown.protectedAnchorConflictPenalty += 80;
    breakdown.interferencePenalty += 30;
    negative.push('Team sparring is a hard-day anchor and must not merge with lower strength, speed, or power.');
    decision = 'reject';
  } else if (
    (primary.kind === 'sparring' && ['mobility', 'breathwork', 'recovery', 'prehab'].includes(secondary.kind))
    || (secondary.kind === 'sparring' && ['mobility', 'breathwork', 'recovery', 'prehab'].includes(primary.kind))
  ) {
    breakdown.recoveryDayPreservation += 18;
    breakdown.adaptationSynergy += 12;
    positive.push('Very light support can sit adjacent to sparring without changing the protected anchor.');
    decision = 'embedded_microdose';
  } else if (
    (primary.kind === 'boxing_skill' && ['mobility', 'breathwork', 'recovery', 'prehab'].includes(secondary.kind))
    || (secondary.kind === 'boxing_skill' && ['mobility', 'breathwork', 'recovery', 'prehab'].includes(primary.kind))
  ) {
    breakdown.recoveryDayPreservation += 14;
    breakdown.adaptationSynergy += 8;
    positive.push('Very light support can sit adjacent to protected practice without changing the anchor.');
    decision = 'embedded_microdose';
  } else if (
    (isStrengthKind(primary.kind) && ['mobility', 'prehab', 'core'].includes(secondary.kind))
    || (isStrengthKind(secondary.kind) && ['mobility', 'prehab', 'core'].includes(primary.kind))
  ) {
    breakdown.efficiencyGain += 14;
    breakdown.warmupCooldownReuse += 12;
    breakdown.adaptationSynergy += 12;
    breakdown.recoveryDayPreservation += 14;
    positive.push('Accessory work supports the strength session and preserves a recovery day.');
    decision = 'merge_single_session';
  } else if (
    (primary.kind === 'core' && isEasyAerobicKind(secondary.kind))
    || (secondary.kind === 'core' && isEasyAerobicKind(primary.kind))
  ) {
    breakdown.efficiencyGain += 10;
    breakdown.recoveryDayPreservation += 14;
    breakdown.adaptationSynergy += 8;
    positive.push('Core and easy aerobic work are compatible at low intensity.');
    decision = 'embedded_microdose';
  } else if (
    (primary.kind === 'heavy_lower_strength' && isEasyAerobicKind(secondary.kind))
    || (secondary.kind === 'heavy_lower_strength' && isEasyAerobicKind(primary.kind))
  ) {
    breakdown.recoveryDayPreservation += 12;
    breakdown.phaseCompatibility += 8;
    positive.push('Heavy lower strength can pair with truly easy aerobic work when strength goes first.');
    order = primary.kind === 'heavy_lower_strength' ? [primary.id, secondary.id] : [secondary.id, primary.id];
    decision = 'merge_single_session';
  } else if (
    (primary.kind === 'heavy_lower_strength' && secondary.kind === 'hard_intervals')
    || (secondary.kind === 'heavy_lower_strength' && primary.kind === 'hard_intervals')
  ) {
    breakdown.interferencePenalty += 28;
    breakdown.loadSpikePenalty += 20;
    breakdown.sameTissueOverload += 18;
    negative.push('Hard intervals and heavy lower strength create a load spike.');
    decision = 'same_day_split';
  } else if (
    (['power', 'plyo'].includes(primary.kind) && secondary.kind === 'conditioning')
    || (['power', 'plyo'].includes(secondary.kind) && primary.kind === 'conditioning')
  ) {
    breakdown.interferencePenalty += 40;
    breakdown.priorityQualityLoss += 24;
    negative.push('Power or plyometric quality is degraded by conditioning in the same merged session.');
    decision = 'reject';
  } else if (
    (primary.kind === 'speed' && secondary.kind === 'heavy_lower_strength')
    || (secondary.kind === 'speed' && primary.kind === 'heavy_lower_strength')
  ) {
    breakdown.adaptationSynergy += 6;
    breakdown.loadSpikePenalty += 14;
    positive.push('Speed can share the day with lower strength when speed is first and load is controlled.');
    negative.push('Lower-body neural load must be controlled.');
    order = primary.kind === 'speed' ? [primary.id, secondary.id] : [secondary.id, primary.id];
    decision = 'same_day_split';
  } else if (
    (primary.kind === 'long_endurance' && secondary.kind === 'heavy_lower_strength')
    || (secondary.kind === 'long_endurance' && primary.kind === 'heavy_lower_strength')
  ) {
    breakdown.interferencePenalty += 34;
    breakdown.sameTissueOverload += 18;
    negative.push('Long endurance and lower strength should usually remain separate.');
    decision = 'keep_separate';
  } else if (
    (primary.kind === 'threshold' && isStrengthKind(secondary.kind))
    || (secondary.kind === 'threshold' && isStrengthKind(primary.kind))
  ) {
    breakdown.interferencePenalty += 18;
    breakdown.loadSpikePenalty += 12;
    negative.push('Threshold work plus strength is better split than merged.');
    decision = 'same_day_split';
  }

  if (protectedConflict) {
    breakdown.protectedAnchorConflictPenalty += 35;
    negative.push('Protected anchor metadata does not allow merging.');
  }
  if (sameTissueLoad(primary, secondary)) {
    breakdown.sameTissueOverload += 8;
    negative.push('Both sessions stress the same tissue system.');
  }
  if ((candidateStress(primary) + candidateStress(secondary)) > 120) {
    breakdown.loadSpikePenalty += 10;
    negative.push('Combined session stress is high.');
  }
  const readinessPenaltyApplies = ['red', 'orange', 'protect', 'Depleted'].includes(input.readinessBand ?? '')
    || (input.readinessBand === 'unknown' && intenseInvolved);
  if (readinessPenaltyApplies) {
    breakdown.athleteReadinessPenalty += input.readinessBand === 'red' || input.readinessBand === 'Depleted' ? 24 : 18;
    negative.push('Readiness state discourages stacking stress.');
  }
  if (input.underFueled) {
    breakdown.underFuelingPenalty += 30;
    negative.push('Under-fueling risk discourages merged training stress.');
  }
  if (input.nearCompetition && intenseInvolved) {
    breakdown.competitionProximityPenalty += 30;
    negative.push('Competition proximity discourages hard merged work.');
  }
  if (input.availabilityMinutes != null && (primary.durationMinutes + secondary.durationMinutes) <= input.availabilityMinutes) {
    breakdown.availabilityFit += 8;
    positive.push('Combined duration fits the available window.');
  }
  if (['camp', 'short_notice_camp', 'competition_week', 'taper'].includes(input.phase ?? 'unknown')) {
    breakdown.phaseCompatibility += isRecoveryKind(primary.kind) || isRecoveryKind(secondary.kind) ? 6 : 0;
  }

  const score = scoreFromBreakdown(breakdown);
  if (decision === 'keep_separate' && score >= 28) {
    decision = 'merge_single_session';
  }
  if (decision === 'keep_separate' && score < -25) {
    decision = 'defer';
  }
  if (decision !== 'reject' && (breakdown.protectedAnchorConflictPenalty >= 80 || breakdown.competitionProximityPenalty >= 90)) {
    decision = 'reject';
  }

  return {
    id: mergeScoreId(primary, secondary),
    decision,
    score,
    positiveFactors: positive,
    negativeFactors: negative,
    breakdown,
    order,
    explanation: mergeExplanation({ decision, a: primary, b: secondary, positive, negative, score }),
  };
}

function protectedAnchorToCandidate(anchor: ProtectedAnchorInput, weekStartDate: ISODateString): AdaptiveSessionCandidate {
  const day = normalizeDay(anchor.dayOfWeek) ?? dayOfWeekFromDate(weekStartDate);
  return {
    id: anchor.id,
    title: anchor.label,
    kind: anchor.kind,
    family: anchor.family ?? kindToFamily(anchor.kind),
    priority: anchor.kind === 'sparring' ? 'boxing_skill' : anchor.kind === 'competition' ? 'boxing_skill' : 'recovery',
    durationMinutes: anchor.durationMinutes,
    intensityRpe: anchor.intensityRpe,
    preferredDayOfWeek: day,
    fixedDate: anchor.date ?? dateForDay(weekStartDate, day),
    protectedAnchor: true,
    anchorId: anchor.id,
    source: anchor.source ?? 'protected_anchor',
    canMerge: anchor.canMerge ?? false,
    tissueLoads: defaultTissueLoads(anchor.kind),
    explanation: createExplanation({
      kind: 'decision',
      summary: `${anchor.label} was preserved as a protected anchor.`,
      reasons: [
        'Protected workouts cannot be moved, deleted, shortened, replaced, or merged unless metadata explicitly allows it.',
        anchor.reason ?? 'This session was supplied as fixed athlete context.',
      ],
      impact: 'kept',
      confidence: ENGINE_CONFIDENCE,
    }),
  };
}

export function loadProtectedAnchors(input: {
  journey: AthleteJourneyState;
  weekStartDate: ISODateString;
  protectedAnchors?: ProtectedAnchorInput[];
}): AdaptiveSessionCandidate[] {
  const explicit = input.protectedAnchors ?? [];
  const fromJourney = input.journey.protectedWorkoutAnchors
    .map<ProtectedAnchorInput | null>((anchor) => {
      const day = normalizeDay(anchor.dayOfWeek);
      if (day == null) return null;
      const kind: AdaptiveSessionKind = anchor.sessionFamily === 'sparring'
        ? 'sparring'
        : anchor.sessionFamily === 'boxing_skill'
          ? 'boxing_skill'
          : anchor.sessionFamily === 'strength'
            ? 'strength'
            : anchor.sessionFamily === 'conditioning'
              ? 'conditioning'
              : 'recovery';
      return {
        id: anchor.id,
        label: anchor.label,
        kind,
        family: anchor.sessionFamily,
        dayOfWeek: day,
        date: anchor.date ?? null,
        startTime: anchor.startTime,
        durationMinutes: anchor.expectedDurationMinutes.target ?? 60,
        intensityRpe: anchor.expectedIntensityRpe?.target ?? (kind === 'sparring' ? 8 : 5),
        source: anchor.source ?? 'protected_anchor',
        canMerge: anchor.canMerge ?? false,
        reason: anchor.reason,
      };
    })
    .filter((anchor): anchor is ProtectedAnchorInput => anchor !== null);

  const byId = new Map<string, ProtectedAnchorInput>();
  for (const anchor of [...fromJourney, ...explicit]) {
    byId.set(anchor.id, anchor);
  }

  return Array.from(byId.values()).map((anchor) => protectedAnchorToCandidate(anchor, input.weekStartDate));
}

function createSession(candidate: AdaptiveSessionCandidate, input: {
  date: ISODateString | null;
  mergeDecisionId?: string | null;
  generatedAt?: ISODateTimeString | null;
  explanation?: Explanation | null;
}): ComposedSession {
  const explanation = input.explanation ?? candidate.explanation ?? createExplanation({
    kind: 'decision',
    summary: `${candidate.title} placed by the Adaptive Training Engine.`,
    reasons: ['The session was placed around protected anchors, recovery preservation, and weekly stress topology.'],
    impact: candidate.protectedAnchor ? 'kept' : 'adjusted',
    confidence: ENGINE_CONFIDENCE,
    generatedAt: input.generatedAt,
  });

  return createComposedSession({
    id: candidate.id,
    family: candidate.family,
    title: candidate.title,
    date: input.date,
    source: candidate.protectedAnchor ? candidate.source ?? 'protected_anchor' : 'engine_generated',
    protectedAnchor: candidate.protectedAnchor ?? false,
    anchorId: candidate.anchorId ?? null,
    durationMinutes: range(candidate.durationMinutes, 'minute'),
    intensityRpe: range(candidate.intensityRpe, 'rpe'),
    startsAt: input.date && candidate.fixedDate === input.date ? null : null,
    mergeDecisionId: input.mergeDecisionId ?? null,
    stressScore: candidateStress(candidate),
    tissueLoads: (candidate.tissueLoads ?? defaultTissueLoads(candidate.kind)).map((load) => load.tissue),
    explanation,
    confidence: ENGINE_CONFIDENCE,
  });
}

function phaseGoal(performanceState: PerformanceState): TrainingBlockGoal {
  const current = performanceState.phase.current;
  if (current === 'recovery' || current === 'deload') return 'recovery';
  if (['camp', 'short_notice_camp', 'competition_week', 'taper'].includes(current)) return 'fight_camp';
  return performanceState.journey.goals[0]?.type as TrainingBlockGoal ?? 'general_build';
}

function defaultCandidates(input: {
  performanceState: PerformanceState;
  hardProtectedCount: number;
}): AdaptiveSessionCandidate[] {
  const phase = input.performanceState.phase.current;
  const goal = phaseGoal(input.performanceState);
  const readiness = input.performanceState.readiness;
  const readinessBand = readiness.readinessBand;
  const readinessAdjustment = readiness.recommendedTrainingAdjustment;
  const readinessRestrictsHardWork = ['red', 'orange'].includes(readinessBand)
    || readinessAdjustment.replaceWithMobility
    || readinessAdjustment.moveHeavySession;
  const readinessHighBudgetPenalty = readinessBand === 'unknown' ? 1 : readinessRestrictsHardWork ? 3 : 0;
  const highBudget = Math.max(0, (phase === 'camp' || phase === 'short_notice_camp' ? 2 : 3) - input.hardProtectedCount - readinessHighBudgetPenalty);
  const candidates: AdaptiveSessionCandidate[] = [];
  let highUsed = 0;
  const add = (candidate: AdaptiveSessionCandidate) => {
    if (isHardKind(candidate.kind)) {
      if (highUsed >= highBudget) return;
      highUsed += 1;
    }
    candidates.push({ ...candidate, tissueLoads: candidate.tissueLoads ?? defaultTissueLoads(candidate.kind) });
  };

  if (phase === 'competition_week' || phase === 'taper') {
    add({
      id: 'generated-mobility-support',
      title: 'Mobility and breathwork support',
      kind: 'mobility',
      family: 'recovery',
      priority: 'recovery',
      durationMinutes: 20,
      intensityRpe: 2,
    });
    return candidates;
  }

  if (phase === 'recovery' || phase === 'deload') {
    add({
      id: 'generated-recovery',
      title: 'Recovery circuit',
      kind: 'recovery',
      family: 'recovery',
      priority: 'recovery',
      durationMinutes: 30,
      intensityRpe: 2,
    });
    add({
      id: 'generated-zone2-easy',
      title: 'Easy aerobic flush',
      kind: 'zone2',
      family: 'roadwork',
      priority: 'aerobic_base',
      durationMinutes: 35,
      intensityRpe: 3,
    });
    return candidates;
  }

  if (readinessAdjustment.replaceWithMobility || readinessBand === 'red') {
    add({
      id: 'generated-readiness-mobility',
      title: 'Readiness mobility reset',
      kind: 'mobility',
      family: 'recovery',
      priority: 'recovery',
      durationMinutes: 25,
      intensityRpe: 2,
      explanation: createExplanation({
        kind: 'plan_adjustment',
        summary: 'Poor readiness replaced generated hard training with mobility support.',
        reasons: readinessAdjustment.reasons.length
          ? readinessAdjustment.reasons
          : ['The Tracking and Readiness Engine recommended replacing hard work today.'],
        impact: 'restricted',
        confidence: readiness.confidence,
      }),
    });
    return candidates;
  }

  add({
    id: 'generated-strength-main',
    title: goal === 'strength' ? 'Primary strength' : 'Full-body strength',
    kind: goal === 'strength' ? 'heavy_lower_strength' : 'strength',
    family: 'strength',
    priority: 'strength',
    durationMinutes: 55,
    intensityRpe: goal === 'strength' ? 7 : 6,
  });
  add({
    id: 'generated-conditioning',
    title: goal === 'conditioning' || phase === 'camp' ? 'Conditioning intervals' : 'Aerobic conditioning',
    kind: goal === 'conditioning' || phase === 'camp' ? 'hard_intervals' : 'zone2',
    family: goal === 'conditioning' || phase === 'camp' ? 'conditioning' : 'roadwork',
    priority: goal === 'conditioning' || phase === 'camp' ? 'conditioning' : 'aerobic_base',
    durationMinutes: goal === 'conditioning' || phase === 'camp' ? 35 : 40,
    intensityRpe: goal === 'conditioning' || phase === 'camp' ? 7 : 4,
  });
  add({
    id: 'generated-mobility',
    title: 'Mobility and prehab',
    kind: 'mobility',
    family: 'recovery',
    priority: 'mobility',
    durationMinutes: 20,
    intensityRpe: 2,
  });
  add({
    id: 'generated-core',
    title: 'Core durability',
    kind: 'core',
    family: 'recovery',
    priority: 'core',
    durationMinutes: 20,
    intensityRpe: 3,
  });

  return candidates;
}

function allowedDays(performanceState: PerformanceState, weekStartDate: ISODateString): number[] {
  const availableDays = performanceState.trainingAvailability?.availableDays ?? [1, 2, 3, 4, 5];
  const normalized = availableDays.map(normalizeDay).filter((day): day is number => day !== null);
  if (normalized.length > 0) return normalized;
  return [dayOfWeekFromDate(weekStartDate)];
}

function dayLabel(totalStress: number, hasCompetition: boolean): StressLabel {
  if (hasCompetition) return 'competition';
  if (totalStress >= 95) return 'hard';
  if (totalStress >= 45) return 'medium';
  if (totalStress > 0) return 'low';
  return 'recovery';
}

export function buildWeeklyStressTopology(input: {
  weekStartDate: ISODateString;
  sessions: ComposedSession[];
}): WeeklyStressTopology {
  const days: WeeklyStressDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(input.weekStartDate, index);
    const sessions = input.sessions.filter((session) => session.date === date);
    const totalStress = sessions.reduce((sum, session) => sum + sessionStress(session), 0);
    const hasCompetition = sessions.some((session) => session.source === 'competition' || session.family === 'assessment');
    const label = dayLabel(totalStress, hasCompetition);
    return {
      date,
      dayOfWeek: dayOfWeekFromDate(date),
      sessions,
      totalStress,
      label,
      hardDayAnchor: sessions.some((session) => (session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring' || session.family === 'assessment'),
      recoveryPreserved: sessions.length === 0 || sessions.every((session) => (session.intensityRpe.target ?? 0) <= 3),
    };
  });
  const hardDayCount = days.filter((day) => day.label === 'hard' || day.label === 'competition').length;
  const recoveryDayCount = days.filter((day) => day.recoveryPreserved).length;
  const mediumDays = days.filter((day) => day.label === 'medium').length;
  const explanation = createExplanation({
    kind: 'decision',
    summary: 'Weekly stress topology resolved by the Adaptive Training Engine.',
    reasons: [
      `${hardDayCount} hard/competition day(s), ${mediumDays} medium day(s), and ${recoveryDayCount} recovery-preserved day(s) were identified.`,
      'The engine avoids spreading medium stress across every day and treats high-intensity protected sessions as hard-day anchors.',
    ],
    impact: 'adjusted',
    confidence: ENGINE_CONFIDENCE,
  });

  return {
    weekStartDate: input.weekStartDate,
    days,
    hardDayCount,
    recoveryDayCount,
    mediumSpreadWarning: mediumDays >= 4,
    explanation,
  };
}

function findPlacement(input: {
  candidate: AdaptiveSessionCandidate;
  sessions: ComposedSession[];
  weekStartDate: ISODateString;
  allowedDays: number[];
  phase: AthleticorePhase;
  readinessBand?: string;
  underFueled: boolean;
  nearCompetition: boolean;
}): { date: ISODateString | null; mergeScore: MergeScore | null; explanation: Explanation | null } {
  const preferred = normalizeDay(input.candidate.preferredDayOfWeek);
  const candidateDays = preferred != null
    ? [preferred, ...input.allowedDays.filter((day) => day !== preferred)]
    : input.allowedDays;
  let fallbackEmptyDate: ISODateString | null = null;
  let best: { date: ISODateString; mergeScore: MergeScore | null; score: number; explanation: Explanation | null } | null = null;

  for (const day of candidateDays) {
    const date = input.candidate.fixedDate ?? dateForDay(input.weekStartDate, day);
    const sameDay = input.sessions.filter((session) => session.date === date);
    const sameDayStress = sameDay.reduce((sum, session) => sum + sessionStress(session), 0);
    const hardDay = sameDay.some((session) => (session.intensityRpe.target ?? 0) >= 7 || session.family === 'sparring');

    if (sameDay.length === 0) {
      if (!fallbackEmptyDate) fallbackEmptyDate = date;
      const spacingScore = input.candidate.intensityRpe >= 7 && hardDay ? -20 : 20;
      if (!best || spacingScore > best.score) {
        best = { date, mergeScore: null, score: spacingScore, explanation: null };
      }
      continue;
    }

    const dayScores = sameDay.map((session) => scoreTrainingMerge({
      primary: asCandidateFromSession(session),
      secondary: input.candidate,
      phase: input.phase,
      readinessBand: input.readinessBand,
      underFueled: input.underFueled,
      nearCompetition: input.nearCompetition,
      availabilityMinutes: 120,
    }));
    const accepted = dayScores
      .filter((score) => ['merge_single_session', 'same_day_split', 'embedded_microdose'].includes(score.decision))
      .sort((a, b) => b.score - a.score)[0] ?? null;

    if (accepted) {
      const score = accepted.score - Math.max(0, sameDayStress - 90);
      if (!best || score > best.score) {
        best = { date, mergeScore: accepted, score, explanation: accepted.explanation };
      }
    }
  }

  if (best && best.score >= 0) {
    return { date: best.date, mergeScore: best.mergeScore, explanation: best.explanation };
  }

  return {
    date: fallbackEmptyDate,
    mergeScore: null,
    explanation: fallbackEmptyDate
      ? createExplanation({
        kind: 'plan_adjustment',
        summary: `${input.candidate.title} was kept separate to avoid a harmful merge.`,
        reasons: ['Merge for synergy or recovery preservation only; crowded calendars are not enough.'],
        impact: 'adjusted',
        confidence: ENGINE_CONFIDENCE,
      })
      : null,
  };
}

export function validateTrainingConflicts(input: {
  sessions: ComposedSession[];
  topology: WeeklyStressTopology;
}): TrainingConflict[] {
  const conflicts: TrainingConflict[] = [];

  for (const day of input.topology.days) {
    const competition = day.sessions.find((session) => session.family === 'assessment' || session.source === 'competition');
    if (competition) {
      const intense = day.sessions.filter((session) => session.id !== competition.id && (session.intensityRpe.target ?? 0) >= 6);
      if (intense.length > 0) {
        const explanation = explainPlanAdjustment({
          summary: 'Competition blocks high-intensity merged work.',
          reasons: ['Competition is a protected performance event and intense support work must be rejected or deferred.'],
          blocked: true,
          confidence: ENGINE_CONFIDENCE,
        });
        conflicts.push({
          id: `${day.date}:competition-conflict`,
          severity: 'critical',
          blocksPlan: true,
          sessionIds: [competition.id, ...intense.map((session) => session.id)],
          message: 'Competition plus intense work is not allowed.',
          explanation,
        });
      }
    }
  }

  if (input.topology.mediumSpreadWarning) {
    const explanation = explainPlanAdjustment({
      summary: 'Weekly stress is spread too evenly across medium days.',
      reasons: ['The engine should preserve true recovery days instead of spreading medium stress across every day.'],
      blocked: false,
      confidence: ENGINE_CONFIDENCE,
    });
    conflicts.push({
      id: `${input.topology.weekStartDate}:medium-spread`,
      severity: 'moderate',
      blocksPlan: false,
      sessionIds: input.sessions.map((session) => session.id),
      message: 'Medium-stress spread should be reduced.',
      explanation,
    });
  }

  return conflicts;
}

export function generateAdaptiveTrainingWeek(input: AdaptiveTrainingWeekInput): AdaptiveTrainingWeekResult {
  const performanceState = input.performanceState;
  const protectedCandidates = loadProtectedAnchors({
    journey: performanceState.journey,
    weekStartDate: input.weekStartDate,
    protectedAnchors: input.protectedAnchors,
  });
  const protectedSessions = protectedCandidates.map((candidate) => createSession(candidate, {
    date: candidate.fixedDate ?? null,
    generatedAt: input.generatedAt,
  }));
  const hardProtectedCount = protectedCandidates.filter((candidate) => candidate.intensityRpe >= 7 || candidate.kind === 'competition').length;
  const candidates = input.candidateSessions ?? defaultCandidates({ performanceState, hardProtectedCount });
  const orderedCandidates = [...candidates]
    .filter((candidate) => !candidate.protectedAnchor)
    .sort((a, b) => {
      const priority = (candidate: AdaptiveSessionCandidate) => isHardKind(candidate.kind) ? 0 : isRecoveryKind(candidate.kind) ? 2 : 1;
      return priority(a) - priority(b);
    });
  const allowed = allowedDays(performanceState, input.weekStartDate);
  const sessions: ComposedSession[] = [...protectedSessions];
  const mergeScores: MergeScore[] = [];
  const explanations: Explanation[] = protectedSessions
    .map((session) => session.explanation)
    .filter((explanation): explanation is Explanation => explanation !== null);
  const nearCompetition = performanceState.phase.current === 'competition_week'
    || protectedCandidates.some((candidate) => candidate.kind === 'competition');
  const underFueled = performanceState.riskFlags.some((flag) => flag.code === 'under_fueling_risk' && flag.status === 'active');

  for (const candidate of orderedCandidates) {
    if (nearCompetition && isHardKind(candidate.kind)) {
      const explanation = explainPlanAdjustment({
        summary: `${candidate.title} was rejected because competition proximity blocks intense generated work.`,
        reasons: ['Competition plus intense work is rejected by the Adaptive Training Engine.'],
        blocked: true,
        confidence: ENGINE_CONFIDENCE,
      });
      mergeScores.push({
        id: `${candidate.id}:competition-reject`,
        decision: 'reject',
        score: -100,
        positiveFactors: [],
        negativeFactors: ['Competition proximity blocks intense generated work.'],
        breakdown: { ...emptyBreakdown(), competitionProximityPenalty: 100 },
        order: [candidate.id],
        explanation,
      });
      explanations.push(explanation);
      continue;
    }

    const placement = findPlacement({
      candidate,
      sessions,
      weekStartDate: input.weekStartDate,
      allowedDays: allowed,
      phase: performanceState.phase.current,
      readinessBand: performanceState.readiness.readinessBand,
      underFueled,
      nearCompetition,
    });

    if (!placement.date) {
      const explanation = explainPlanAdjustment({
        summary: `${candidate.title} was deferred because no safe weekly placement remained.`,
        reasons: ['No day preserved protected anchors, recovery, and load compatibility.'],
        blocked: false,
        confidence: ENGINE_CONFIDENCE,
      });
      mergeScores.push({
        id: `${candidate.id}:defer`,
        decision: 'defer',
        score: -50,
        positiveFactors: [],
        negativeFactors: ['No safe placement remained.'],
        breakdown: emptyBreakdown(),
        order: [candidate.id],
        explanation,
      });
      explanations.push(explanation);
      continue;
    }

    if (placement.mergeScore) {
      mergeScores.push(placement.mergeScore);
      explanations.push(placement.mergeScore.explanation);
    }
    if (placement.explanation && !placement.mergeScore) {
      explanations.push(placement.explanation);
    }

    sessions.push(createSession(candidate, {
      date: placement.date,
      mergeDecisionId: placement.mergeScore?.id ?? null,
      generatedAt: input.generatedAt,
      explanation: placement.explanation,
    }));
  }

  const topology = buildWeeklyStressTopology({ weekStartDate: input.weekStartDate, sessions });
  const conflicts = validateTrainingConflicts({ sessions, topology });
  const conflictFlags = conflicts
    .filter((conflict) => conflict.blocksPlan)
    .map((conflict) => createRiskFlag({
      id: conflict.id,
      code: conflict.message.includes('Competition')
        ? 'competition_proximity_conflict'
        : 'duplicate_or_conflicting_plan',
      severity: conflict.severity,
      message: conflict.message,
      blocksPlan: conflict.blocksPlan,
      explanation: conflict.explanation,
    }));
  const trainingBlock: TrainingBlock = {
    id: `${performanceState.athlete.athleteId}:${input.weekStartDate}:adaptive-training-block`,
    phase: performanceState.phase.current,
    goal: phaseGoal(performanceState),
    status: conflicts.some((conflict) => conflict.blocksPlan) ? 'planned' : 'active',
    startDate: input.weekStartDate,
    endDate: addDays(input.weekStartDate, 6),
    protectedAnchors: performanceState.journey.protectedWorkoutAnchors,
    sessions,
    explanation: createExplanation({
      kind: 'decision',
      summary: 'Adaptive Training Engine generated the weekly training block.',
      reasons: [
        'Protected workouts were preserved as anchors.',
        'Generated workouts were placed around weekly stress topology, merge compatibility, and recovery preservation.',
        conflictFlags.length > 0 ? 'Blocking conflicts were surfaced instead of forcing unsafe training.' : 'No blocking schedule conflicts were detected.',
      ],
      impact: conflictFlags.length > 0 ? 'restricted' : 'adjusted',
      confidence: ENGINE_CONFIDENCE,
      generatedAt: input.generatedAt,
    }),
    confidence: ENGINE_CONFIDENCE,
  };

  return {
    trainingBlock,
    composedSessions: sessions,
    topology,
    mergeScores,
    conflicts,
    explanations: [
      trainingBlock.explanation,
      topology.explanation,
      ...explanations,
      ...conflicts.map((conflict) => conflict.explanation),
    ].filter((explanation): explanation is Explanation => explanation !== null),
  };
}

export function convertSessionsToTrainingBlock(input: {
  performanceState: PerformanceState;
  sessions: ComposedSession[];
  weekStartDate: ISODateString;
  explanation?: Explanation | null;
}): TrainingBlock {
  return {
    id: `${input.performanceState.athlete.athleteId}:${input.weekStartDate}:converted-training-block`,
    phase: input.performanceState.phase.current,
    goal: phaseGoal(input.performanceState),
    status: 'active',
    startDate: input.weekStartDate,
    endDate: addDays(input.weekStartDate, 6),
    protectedAnchors: input.performanceState.journey.protectedWorkoutAnchors,
    sessions: input.sessions,
    explanation: input.explanation ?? createExplanation({
      kind: 'decision',
      summary: 'Existing workouts and events were converted into a canonical TrainingBlock.',
      reasons: ['Conversion preserves anchors and exposes sessions through the Adaptive Training Engine model.'],
      impact: 'kept',
      confidence: ENGINE_CONFIDENCE,
    }),
    confidence: ENGINE_CONFIDENCE,
  };
}
