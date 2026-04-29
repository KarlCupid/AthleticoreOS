import type {
  AthleticorePhase,
  ComposedSession,
  ConfidenceLevel,
  ConfidenceValue,
  Explanation,
  ISODateString,
  MeasurementRange,
  NutritionTarget,
  PerformanceState,
  ReadinessBand,
  ReadinessState,
  RiskFlag,
  SessionFuelingDirective,
  WeightClassPlan,
} from '../types/index.ts';
import type { UnifiedPerformanceEngineResult } from '../unified-performance/index.ts';

export type TodayMissionStatus =
  | 'good_to_push'
  | 'train_smart'
  | 'pull_back'
  | 'blocked'
  | 'needs_context';

export type TodayMissionActionIntent =
  | 'start_training'
  | 'log_checkin'
  | 'review_fueling'
  | 'confirm_fight'
  | 'log_body_mass'
  | 'review_body_mass'
  | 'take_recovery'
  | 'review_plan';

export interface TodayMissionAction {
  id: string;
  label: string;
  intent: TodayMissionActionIntent;
  priority: 'primary' | 'secondary';
}

export interface TodayMissionConfidence {
  level: ConfidenceLevel;
  label: string;
  summary: string;
  missingData: string[];
}

export interface TodayMissionExplanation {
  id: string;
  summary: string;
  reasons: string[];
  impact: Explanation['impact'];
}

export interface TodayMissionViewModel {
  source: 'unified_performance_engine';
  status: TodayMissionStatus;
  date: ISODateString | null;
  athleteId: string | null;
  currentPhase: AthleticorePhase | 'unknown';
  phaseLabel: string;
  missionTitle: string;
  primaryFocus: string;
  whyTodayMatters: string;
  trainingSummary: string;
  protectedWorkoutSummary: string | null;
  fuelingFocus: string;
  readinessSummary: string;
  recoveryPriority: string;
  bodyMassContext: string | null;
  fightOrCompetitionContext: string | null;
  riskHighlights: string[];
  planAdjustments: string[];
  nextActions: TodayMissionAction[];
  confidence: TodayMissionConfidence;
  explanations: TodayMissionExplanation[];
  sourcePerformanceStateId: string | null;
}

export interface BuildTodayMissionOptions {
  checkInLogged?: boolean;
  trainingCompleted?: boolean;
  fuelingStarted?: boolean;
  weeklyPlanAvailable?: boolean;
}

const UNAVAILABLE_TODAY_MISSION: TodayMissionViewModel = {
  source: 'unified_performance_engine',
  status: 'needs_context',
  date: null,
  athleteId: null,
  currentPhase: 'unknown',
  phaseLabel: 'Unknown',
  missionTitle: "Today's Mission",
  primaryFocus: "Athleticore needs today's performance state before it can guide the day.",
  whyTodayMatters: 'Missing performance state is unknown, not safe. Resolve the unified engine output before pushing training.',
  trainingSummary: 'Training context is pending.',
  protectedWorkoutSummary: null,
  fuelingFocus: 'Fueling context is pending.',
  readinessSummary: 'Readiness is unknown until the unified performance state is available.',
  recoveryPriority: 'Keep recovery steady while Athleticore gathers enough context.',
  bodyMassContext: null,
  fightOrCompetitionContext: null,
  riskHighlights: [],
  planAdjustments: ['Athleticore needs more context before changing the plan.'],
  nextActions: [action('review-plan', 'Review plan', 'review_plan', 'primary')],
  confidence: {
    level: 'unknown',
    label: 'Unknown confidence',
    summary: 'Confidence is unknown because the Unified Performance Engine output is unavailable.',
    missingData: ['Unified performance state'],
  },
  explanations: [],
  sourcePerformanceStateId: null,
};

export function buildTodaysMissionViewModel(
  result: UnifiedPerformanceEngineResult | null | undefined,
  options: BuildTodayMissionOptions = {},
): TodayMissionViewModel {
  if (!result) return UNAVAILABLE_TODAY_MISSION;

  const performanceState = result.canonicalOutputs.performanceState;
  const date = performanceState.asOfDate ?? result.canonicalOutputs.readiness.date ?? result.canonicalOutputs.nutritionTarget.date ?? null;
  const sessions = sessionsForDate(result.canonicalOutputs.composedSessions, date);
  const protectedSessions = sessions.filter((session) => session.protectedAnchor);
  const readiness = result.canonicalOutputs.readiness;
  const nutritionTarget = result.canonicalOutputs.nutritionTarget;
  const weightClassPlan = result.canonicalOutputs.weightClassPlan ?? performanceState.weightClassPlan;
  const fight = result.fightOpportunity ?? performanceState.journey.activeFightOpportunity;
  const blockingRisks = result.blockingRiskFlags;
  const allRisks = dedupeRiskFlags([
    ...result.riskFlags,
    ...readiness.riskFlags,
    ...nutritionTarget.riskFlags,
    ...(performanceState.bodyMass?.riskFlags ?? []),
    ...(weightClassPlan?.riskFlags ?? []),
  ]);
  const unsafeBodyMass = hasUnsafeBodyMassRisk(allRisks, weightClassPlan);
  const lowConfidence = isLowConfidence([
    performanceState.confidence,
    readiness.confidence,
    nutritionTarget.confidence,
    performanceState.bodyMass?.confidence,
    weightClassPlan?.confidence,
  ]);
  const missingData = missingDataLabels(performanceState, readiness, nutritionTarget, weightClassPlan);
  const safetyRelevantMissingData = safetyRelevantMissingDataLabels(performanceState, readiness, weightClassPlan);
  const highOutput = isHighOutputDay(sessions, nutritionTarget);
  const recoveryDay = isRecoveryDay(performanceState.phase.current, sessions, result.canonicalOutputs.trainingBlock.goal);
  const poorReadiness = readiness.readinessBand === 'orange' || readiness.readinessBand === 'red';
  const needsContext = readiness.readinessBand === 'unknown'
    || safetyRelevantMissingData.length > 0
    || (lowConfidence && (readiness.confidence.level === 'unknown' || readiness.confidence.level === 'low'));
  const status = missionStatus({
    blockingRisks,
    unsafeBodyMass,
    needsContext,
    recoveryDay,
    poorReadiness,
    readinessBand: readiness.readinessBand,
  });

  const trainingSummary = buildTrainingSummary(sessions, protectedSessions, recoveryDay);
  const protectedWorkoutSummary = buildProtectedWorkoutSummary(protectedSessions);
  const fuelingFocus = buildFuelingFocus({
    nutritionTarget,
    sessionFuelingDirectives: result.canonicalOutputs.sessionFuelingDirectives,
    highOutput,
    recoveryDay,
    unsafeBodyMass,
  });
  const readinessSummary = buildReadinessSummary(readiness);
  const bodyMassContext = buildBodyMassContext(weightClassPlan, performanceState, unsafeBodyMass);
  const fightContext = buildFightContext(fight, performanceState.phase.current);
  const riskHighlights = buildRiskHighlights(blockingRisks.length > 0 ? blockingRisks : allRisks);
  const planAdjustments = buildPlanAdjustments({
    performanceState,
    readiness,
    nutritionTarget,
    protectedSessions,
    weightClassPlan,
    unsafeBodyMass,
    fightContext,
    recoveryDay,
  });

  return {
    source: 'unified_performance_engine',
    status,
    date,
    athleteId: performanceState.athlete.athleteId,
    currentPhase: performanceState.phase.current,
    phaseLabel: humanize(performanceState.phase.current),
    missionTitle: "Today's Mission",
    primaryFocus: buildPrimaryFocus({
      status,
      sessions,
      protectedSessions,
      readiness,
      recoveryDay,
      highOutput,
      unsafeBodyMass,
    }),
    whyTodayMatters: buildWhyTodayMatters({
      phase: performanceState.phase.current,
      sessions,
      protectedSessions,
      readiness,
      fightContext,
      recoveryDay,
      needsContext,
    }),
    trainingSummary,
    protectedWorkoutSummary,
    fuelingFocus,
    readinessSummary,
    recoveryPriority: buildRecoveryPriority({ readiness, recoveryDay, highOutput, unsafeBodyMass }),
    bodyMassContext,
    fightOrCompetitionContext: fightContext,
    riskHighlights,
    planAdjustments,
    nextActions: buildNextActions({
      status,
      readiness,
      sessions,
      protectedSessions,
      hasFightContext: Boolean(fightContext),
      hasBodyMassContext: Boolean(bodyMassContext),
      unsafeBodyMass,
      recoveryDay,
      highOutput,
      options,
    }),
    confidence: buildConfidence({ lowConfidence, missingData, performanceState, readiness, nutritionTarget, weightClassPlan }),
    explanations: result.explanations.map(toMissionExplanation).slice(0, 8),
    sourcePerformanceStateId: sourcePerformanceStateId(performanceState),
  };
}

function missionStatus(input: {
  blockingRisks: RiskFlag[];
  unsafeBodyMass: boolean;
  needsContext: boolean;
  recoveryDay: boolean;
  poorReadiness: boolean;
  readinessBand: ReadinessBand;
}): TodayMissionStatus {
  if (input.blockingRisks.length > 0 || input.unsafeBodyMass) return 'blocked';
  if (input.needsContext) return 'needs_context';
  if (input.recoveryDay || input.readinessBand === 'red') return 'pull_back';
  if (input.poorReadiness || input.readinessBand === 'yellow') return 'train_smart';
  return 'good_to_push';
}

function buildPrimaryFocus(input: {
  status: TodayMissionStatus;
  sessions: ComposedSession[];
  protectedSessions: ComposedSession[];
  readiness: ReadinessState;
  recoveryDay: boolean;
  highOutput: boolean;
  unsafeBodyMass: boolean;
}): string {
  if (input.status === 'blocked' && input.unsafeBodyMass) {
    return "Review the safer body-mass options before Athleticore pushes today's plan.";
  }
  if (input.status === 'blocked') {
    return "Protect safety first and adjust today's plan before adding more stress.";
  }
  if (input.status === 'needs_context') {
    return "Start with today's check-in so Athleticore can make the next call safely.";
  }
  if (input.protectedSessions.some((session) => session.family === 'sparring')) {
    return 'Show up fresher for sparring and keep the support work controlled.';
  }
  if (input.recoveryDay || input.status === 'pull_back') {
    return 'Take recovery seriously today so the next training window improves.';
  }
  if (input.readiness.readinessBand === 'yellow' || input.readiness.readinessBand === 'orange') {
    return "Keep the main work sharp and trim the extra volume.";
  }
  if (input.highOutput) {
    return 'Do the main high-output work, fuel it well, and leave room to recover.';
  }
  if (input.sessions.length === 0) {
    return 'Use today to recover, fuel, and keep the journey moving.';
  }
  return "Follow today's main training touch and keep recovery steady.";
}

function buildWhyTodayMatters(input: {
  phase: AthleticorePhase;
  sessions: ComposedSession[];
  protectedSessions: ComposedSession[];
  readiness: ReadinessState;
  fightContext: string | null;
  recoveryDay: boolean;
  needsContext: boolean;
}): string {
  if (input.needsContext) {
    return "A few signals are still unknown, so Athleticore is asking for context before it treats today as safe to push.";
  }
  if (input.fightContext) {
    return `${input.fightContext} Today's work should support that timeline without adding unnecessary stress.`;
  }
  if (input.protectedSessions.length > 0) {
    return 'A protected workout is anchoring the day, so the rest of the plan should work around it.';
  }
  if (input.recoveryDay || input.phase === 'recovery') {
    return 'Recovery is the productive work today because it helps the next build window land better.';
  }
  if (input.phase === 'build') {
    return "You're in build phase, and today's work supports the quality this block is trying to grow.";
  }
  if (input.phase === 'camp' || input.phase === 'short_notice_camp') {
    return "You're in camp, so today should build fight readiness without stacking stress that does not help.";
  }
  if (input.phase === 'competition_week' || input.phase === 'taper') {
    return 'Competition context is close, so the mission is freshness, fueling, and execution support.';
  }
  if (input.readiness.readinessBand === 'green' && input.sessions.length > 0) {
    return 'Readiness supports the plan, so today can move the week forward.';
  }
  return 'Today matters because training, fuel, readiness, and recovery are being resolved from the same performance state.';
}

function buildTrainingSummary(
  sessions: ComposedSession[],
  protectedSessions: ComposedSession[],
  recoveryDay: boolean,
): string {
  if (sessions.length === 0) {
    return 'No training session is built for today. Use the day to recover, fuel, and keep the basics steady.';
  }
  if (recoveryDay) {
    return 'Today is a recovery day. Keep the work easy and let recovery do its job.';
  }
  if (protectedSessions.some((session) => session.family === 'sparring')) {
    const supportSessions = sessions.filter((session) => !session.protectedAnchor);
    return supportSessions.length > 0
      ? `Sparring is the anchor today. ${supportSessions.length} support session${supportSessions.length === 1 ? '' : 's'} should stay controlled around it.`
      : 'Sparring is the anchor today. Athleticore should protect freshness around it.';
  }
  const names = sessions.slice(0, 2).map((session) => session.title).join(' and ');
  const extra = sessions.length > 2 ? ` plus ${sessions.length - 2} more training touch${sessions.length - 2 === 1 ? '' : 'es'}` : '';
  const merged = sessions.some((session) => Boolean(session.mergeDecisionId))
    ? ' Sessions were combined where that made the day cleaner.'
    : '';
  return `Today's training: ${names}${extra}.${merged}`;
}

function buildProtectedWorkoutSummary(protectedSessions: ComposedSession[]): string | null {
  if (protectedSessions.length === 0) return null;
  const labels = protectedSessions.slice(0, 2).map((session) => session.title).join(' and ');
  const suffix = protectedSessions.length > 2 ? ` plus ${protectedSessions.length - 2} more anchor${protectedSessions.length - 2 === 1 ? '' : 's'}` : '';
  return `${labels}${suffix} ${protectedSessions.length === 1 ? 'is' : 'are'} protected. Athleticore should adapt around ${protectedSessions.length === 1 ? 'it' : 'them'}, not move ${protectedSessions.length === 1 ? 'it' : 'them'} silently.`;
}

function buildFuelingFocus(input: {
  nutritionTarget: NutritionTarget;
  sessionFuelingDirectives: SessionFuelingDirective[];
  highOutput: boolean;
  recoveryDay: boolean;
  unsafeBodyMass: boolean;
}): string {
  if (input.unsafeBodyMass) {
    return 'Fueling stays safety-first today. Athleticore is not chasing scale pressure when the target is too aggressive.';
  }
  if (input.highOutput || input.sessionFuelingDirectives.some((directive) => directive.priority === 'high')) {
    return "Today needs more fuel. You've got high-output work planned, so carbs matter more before and after training.";
  }
  if (input.recoveryDay) {
    return 'Keep fuel steady today. Recovery still needs food, hydration, and enough protein.';
  }
  const explanation = input.nutritionTarget.explanation?.summary;
  if (explanation) return humanizeSentence(explanation);
  return 'Fuel to support the work planned today, then keep hydration steady afterward.';
}

function buildReadinessSummary(readiness: ReadinessState): string {
  if (readiness.readinessBand === 'unknown') {
    return "Readiness is unknown until today's check-in. Athleticore will not treat missing data as safe.";
  }
  if (readiness.readinessBand === 'red') {
    return 'Readiness is low today, so recovery and safety should lead the plan.';
  }
  if (readiness.readinessBand === 'orange') {
    return "You're under-recovered today, so Athleticore should keep the main work and trim extra stress.";
  }
  if (readiness.readinessBand === 'yellow') {
    return "You're carrying some fatigue today, so keep the work controlled.";
  }
  return 'Readiness looks solid today. Follow the plan and keep the basics steady.';
}

function buildRecoveryPriority(input: {
  readiness: ReadinessState;
  recoveryDay: boolean;
  highOutput: boolean;
  unsafeBodyMass: boolean;
}): string {
  if (input.unsafeBodyMass) {
    return 'Protect hydration, food consistency, and recovery before making body-mass decisions.';
  }
  if (input.recoveryDay || input.readiness.readinessBand === 'red') {
    return 'Keep recovery simple: easy movement, fuel, hydration, and sleep.';
  }
  if (input.readiness.readinessBand === 'orange' || input.readiness.readinessBand === 'yellow') {
    return 'Trim the extras and protect sleep after the main work.';
  }
  if (input.highOutput) {
    return 'Cooldown, refuel, hydrate, and give sleep the same priority as the session.';
  }
  return 'Stay consistent with food, hydration, and sleep so the next session has room to land.';
}

function buildBodyMassContext(
  weightClassPlan: WeightClassPlan | null,
  performanceState: PerformanceState,
  unsafeBodyMass: boolean,
): string | null {
  if (unsafeBodyMass) {
    return "This target looks too aggressive for the time available. Athleticore won't build a risky plan around it. Review safer options.";
  }
  if (weightClassPlan) {
    if (weightClassPlan.feasibilityStatus === 'insufficient_data') {
      return 'Body-mass context needs more data before Athleticore changes weight-class guidance.';
    }
    return `Weight-class context is active and currently ${humanize(weightClassPlan.feasibilityStatus).toLowerCase()}. Keep fueling and recovery connected to the plan.`;
  }
  const bodyMass = performanceState.bodyMass;
  if (!bodyMass || bodyMass.trend.direction === 'unknown') return null;
  return `Body-mass trend is ${bodyMass.trend.direction}. Athleticore uses it as context, not as pressure to force the day.`;
}

function buildFightContext(
  fight: UnifiedPerformanceEngineResult['fightOpportunity'],
  phase: AthleticorePhase,
): string | null {
  if (!fight) return null;
  const dateText = fight.competitionDate ? ` on ${fight.competitionDate}` : '';
  if (fight.status === 'short_notice') {
    return `Short-notice fight context is active${dateText}; Athleticore is protecting freshness first.`;
  }
  if (fight.status === 'confirmed') {
    return `Confirmed fight context is active${dateText}; Athleticore is shaping training, fuel, and recovery around it.`;
  }
  if (fight.status === 'tentative') {
    return `Tentative fight context is on the radar${dateText}; Athleticore will adapt without treating the journey as restarted.`;
  }
  if (fight.status === 'rescheduled') {
    return `Fight timing changed${dateText}; Athleticore should preserve your history and reshape the plan.`;
  }
  if (fight.status === 'canceled') {
    return 'The fight is canceled, so Athleticore should guide the journey back toward the next useful phase.';
  }
  if (phase === 'competition_week') {
    return 'Competition week is active; freshness, fueling, and recovery matter most.';
  }
  return null;
}

function buildRiskHighlights(risks: RiskFlag[]): string[] {
  return risks
    .filter((risk) => risk.status === 'active')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 3)
    .map((risk) => safetyCopyForRisk(risk));
}

function buildPlanAdjustments(input: {
  performanceState: PerformanceState;
  readiness: ReadinessState;
  nutritionTarget: NutritionTarget;
  protectedSessions: ComposedSession[];
  weightClassPlan: WeightClassPlan | null;
  unsafeBodyMass: boolean;
  fightContext: string | null;
  recoveryDay: boolean;
}): string[] {
  const adjustments: string[] = [];
  const phaseChange = latestPhaseChange(input.performanceState);
  if (phaseChange) adjustments.push(phaseChange);
  if (input.protectedSessions.length > 0) {
    adjustments.push('Protected work is being treated as an anchor, so supporting work should move around it.');
  }
  if (input.readiness.recommendedTrainingAdjustment.type !== 'none') {
    adjustments.push(readinessAdjustmentCopy(input.readiness));
  }
  if (input.nutritionTarget.sessionFuelingDirectives.length > 0) {
    adjustments.push('Fueling is tied to the session demand today, not handled as a separate macro target.');
  }
  if (input.unsafeBodyMass || input.weightClassPlan?.safetyStatus === 'unsafe') {
    adjustments.push("Body-mass guidance is safety-gated, so Athleticore won't build around an aggressive target.");
  }
  if (input.fightContext && !adjustments.some((item) => item.toLowerCase().includes('fight'))) {
    adjustments.push('Fight context is included in training, fuel, body-mass, and recovery decisions.');
  }
  if (input.recoveryDay && adjustments.length === 0) {
    adjustments.push('Today is being kept lighter so recovery can move the next phase forward.');
  }
  return unique(adjustments).slice(0, 4);
}

function buildNextActions(input: {
  status: TodayMissionStatus;
  readiness: ReadinessState;
  sessions: ComposedSession[];
  protectedSessions: ComposedSession[];
  hasFightContext: boolean;
  hasBodyMassContext: boolean;
  unsafeBodyMass: boolean;
  recoveryDay: boolean;
  highOutput: boolean;
  options: BuildTodayMissionOptions;
}): TodayMissionAction[] {
  const actions: TodayMissionAction[] = [];
  if ((input.status === 'needs_context' || input.readiness.readinessBand === 'unknown') && input.options.checkInLogged !== true) {
    actions.push(action('log-checkin', 'Log your check-in', 'log_checkin', 'primary'));
  }
  if (input.unsafeBodyMass) {
    actions.push(action('review-body-mass', 'Review safer options', 'review_body_mass', actions.length === 0 ? 'primary' : 'secondary'));
  } else if (input.hasBodyMassContext) {
    actions.push(action('log-body-mass', 'Log body mass', 'log_body_mass', actions.length === 0 ? 'primary' : 'secondary'));
  }
  if (input.sessions.length > 0 && !input.recoveryDay && input.options.trainingCompleted !== true && input.status !== 'blocked') {
    actions.push(action('start-training', "Start today's training", 'start_training', actions.length === 0 ? 'primary' : 'secondary'));
  }
  if ((input.highOutput || input.options.fuelingStarted === false) && input.status !== 'blocked') {
    actions.push(action('review-fueling', 'Review fueling target', 'review_fueling', actions.length === 0 ? 'primary' : 'secondary'));
  }
  if (input.recoveryDay || input.status === 'pull_back') {
    actions.push(action('take-recovery', 'Take recovery day seriously', 'take_recovery', actions.length === 0 ? 'primary' : 'secondary'));
  }
  if (input.hasFightContext) {
    actions.push(action('confirm-fight', 'Confirm fight details', 'confirm_fight', actions.length === 0 ? 'primary' : 'secondary'));
  }
  if (input.options.weeklyPlanAvailable === false || actions.length === 0) {
    actions.push(action('review-plan', 'Review plan', 'review_plan', actions.length === 0 ? 'primary' : 'secondary'));
  }

  return dedupeActions(actions).slice(0, 3).map((item, index) => ({
    ...item,
    priority: index === 0 ? 'primary' : 'secondary',
  }));
}

function buildConfidence(input: {
  lowConfidence: boolean;
  missingData: string[];
  performanceState: PerformanceState;
  readiness: ReadinessState;
  nutritionTarget: NutritionTarget;
  weightClassPlan: WeightClassPlan | null;
}): TodayMissionConfidence {
  const confidence = lowestConfidence([
    input.performanceState.confidence,
    input.readiness.confidence,
    input.nutritionTarget.confidence,
    input.weightClassPlan?.confidence,
  ]);
  if (input.lowConfidence) {
    return {
      level: confidence.level,
      label: confidenceLabel(confidence),
      summary: input.missingData.length > 0
        ? 'Confidence is limited because some important context is still unknown.'
        : confidence.reasons[0] ?? 'Confidence is limited because the trend is not fully established.',
      missingData: input.missingData,
    };
  }
  return {
    level: confidence.level,
    label: confidenceLabel(confidence),
    summary: 'Confidence is strong enough to guide the day from the unified performance state.',
    missingData: [],
  };
}

function sessionsForDate(sessions: ComposedSession[], date: ISODateString | null): ComposedSession[] {
  if (!date) return sessions;
  const dated = sessions.filter((session) => session.date === date);
  return dated.length > 0 ? dated : [];
}

function isHighOutputDay(sessions: ComposedSession[], nutritionTarget: NutritionTarget): boolean {
  if (sessions.some((session) =>
    session.family === 'sparring'
    || session.family === 'conditioning'
    || rangeTarget(session.intensityRpe) >= 7
    || rangeTarget(session.durationMinutes) >= 75
  )) {
    return true;
  }
  return nutritionTarget.sessionFuelingDirectives.some((directive) =>
    directive.priority === 'high'
    || rangeTarget(directive.carbohydrateDemand) >= 45
    || rangeTarget(directive.durationMinutes) >= 75
    || rangeTarget(directive.intensity) >= 7
  );
}

function isRecoveryDay(phase: AthleticorePhase, sessions: ComposedSession[], blockGoal: string): boolean {
  if (phase === 'recovery' || blockGoal === 'recovery') return true;
  if (sessions.length === 0) return false;
  return sessions.every((session) =>
    session.family === 'recovery'
    || session.family === 'rest'
    || rangeTarget(session.intensityRpe) <= 3
  );
}

function hasUnsafeBodyMassRisk(risks: RiskFlag[], weightClassPlan: WeightClassPlan | null): boolean {
  return Boolean(
    weightClassPlan?.safetyStatus === 'unsafe'
    || weightClassPlan?.feasibilityStatus === 'unsafe'
    || weightClassPlan?.professionalReviewRequired
    || risks.some((risk) =>
      (risk.domain === 'body_mass' || risk.domain === 'weight_class')
      && (risk.blocksPlan || risk.hardStop || risk.severity === 'critical' || risk.code === 'unsafe_weight_class_target')
    ),
  );
}

function missingDataLabels(
  performanceState: PerformanceState,
  readiness: ReadinessState,
  nutritionTarget: NutritionTarget,
  weightClassPlan: WeightClassPlan | null,
): string[] {
  return unique([
    ...performanceState.unknowns.map((field) => humanize(field.field)),
    ...performanceState.journey.missingFields.map((field) => humanize(field.field)),
    ...readiness.missingData.map((field) => humanize(field.field)),
    ...nutritionTarget.dataQuality.missingFields.map((field) => humanize(field.field)),
    ...(weightClassPlan?.confidence.level === 'unknown' ? ['Weight-class confidence'] : []),
  ]).slice(0, 6);
}

function safetyRelevantMissingDataLabels(
  performanceState: PerformanceState,
  readiness: ReadinessState,
  weightClassPlan: WeightClassPlan | null,
): string[] {
  return unique([
    ...performanceState.unknowns.map((field) => humanize(field.field)),
    ...readiness.missingData.map((field) => humanize(field.field)),
    ...(weightClassPlan?.feasibilityStatus === 'insufficient_data' ? ['Weight-class feasibility'] : []),
    ...(weightClassPlan?.confidence.level === 'unknown' ? ['Weight-class confidence'] : []),
  ]).slice(0, 6);
}

function readinessAdjustmentCopy(readiness: ReadinessState): string {
  if (readiness.recommendedTrainingAdjustment.replaceWithMobility) {
    return 'Readiness is asking for mobility or easy work instead of a hard push.';
  }
  if (readiness.recommendedTrainingAdjustment.moveHeavySession) {
    return 'Heavy work should move away from the current readiness or anchor context.';
  }
  if (readiness.recommendedTrainingAdjustment.type === 'reduce_volume') {
    return "You're carrying fatigue, so Athleticore is trimming extra volume and keeping the main work cleaner.";
  }
  if (readiness.recommendedTrainingAdjustment.type === 'reduce_intensity') {
    return "You're under-recovered today, so intensity should come down.";
  }
  return readiness.recommendedTrainingAdjustment.reasons[0]
    ? humanizeSentence(readiness.recommendedTrainingAdjustment.reasons[0])
    : 'Readiness changed the shape of today.';
}

function latestPhaseChange(performanceState: PerformanceState): string | null {
  const latest = performanceState.phase.transitionHistory[performanceState.phase.transitionHistory.length - 1] ?? null;
  if (latest?.explanation?.summary) {
    return humanizeSentence(latest.explanation.summary);
  }
  if (performanceState.phase.previous && performanceState.phase.previous !== performanceState.phase.current) {
    return `Athleticore moved from ${humanize(performanceState.phase.previous).toLowerCase()} to ${humanize(performanceState.phase.current).toLowerCase()} while preserving your journey.`;
  }
  return performanceState.phase.explanation?.summary ? humanizeSentence(performanceState.phase.explanation.summary) : null;
}

function safetyCopyForRisk(risk: RiskFlag): string {
  if (risk.code === 'unsafe_weight_class_target') {
    return "This weight-class target looks too aggressive for the time available. Athleticore won't build a risky plan around it.";
  }
  if (risk.code === 'under_fueling_risk') {
    return 'Fueling is not keeping up with the work, so Athleticore is protecting energy availability.';
  }
  if (risk.code === 'poor_readiness') {
    return 'Readiness is low enough that recovery should lead the plan today.';
  }
  if (risk.code === 'missing_data') {
    return 'Important data is missing, so Athleticore is lowering confidence instead of assuming the day is safe.';
  }
  return humanizeSentence(risk.message);
}

function toMissionExplanation(explanation: Explanation): TodayMissionExplanation {
  return {
    id: explanation.id ?? `${explanation.kind}:${explanation.summary}`,
    summary: humanizeSentence(explanation.summary),
    reasons: explanation.reasons.map(humanizeSentence),
    impact: explanation.impact,
  };
}

function sourcePerformanceStateId(performanceState: PerformanceState): string | null {
  const maybe = performanceState as PerformanceState & { id?: unknown; performanceStateId?: unknown };
  if (typeof maybe.id === 'string') return maybe.id;
  if (typeof maybe.performanceStateId === 'string') return maybe.performanceStateId;
  return null;
}

function action(
  id: string,
  label: string,
  intent: TodayMissionActionIntent,
  priority: TodayMissionAction['priority'],
): TodayMissionAction {
  return { id, label, intent, priority };
}

function dedupeActions(actions: TodayMissionAction[]): TodayMissionAction[] {
  const seen = new Set<TodayMissionActionIntent>();
  const result: TodayMissionAction[] = [];
  for (const item of actions) {
    if (seen.has(item.intent)) continue;
    seen.add(item.intent);
    result.push(item);
  }
  return result;
}

function dedupeRiskFlags(risks: RiskFlag[]): RiskFlag[] {
  const seen = new Set<string>();
  const result: RiskFlag[] = [];
  for (const risk of risks) {
    const key = risk.id || `${risk.domain}:${risk.code}:${risk.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(risk);
  }
  return result;
}

function severityRank(severity: RiskFlag['severity']): number {
  switch (severity) {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'moderate':
      return 3;
    case 'low':
      return 2;
    case 'info':
      return 1;
    default:
      return 0;
  }
}

function isLowConfidence(confidences: Array<ConfidenceValue | null | undefined>): boolean {
  return confidences.some((confidence) =>
    !confidence || confidence.level === 'unknown' || confidence.level === 'low' || confidence.score == null || confidence.score < 0.45,
  );
}

function lowestConfidence(confidences: Array<ConfidenceValue | null | undefined>): ConfidenceValue {
  const normalized = confidences.filter((confidence): confidence is ConfidenceValue => Boolean(confidence));
  if (normalized.length === 0) {
    return { level: 'unknown', score: null, reasons: ['No reliable data has been provided yet.'] };
  }
  return [...normalized].sort((a, b) => confidenceScore(a) - confidenceScore(b))[0] ?? normalized[0];
}

function confidenceScore(confidence: ConfidenceValue): number {
  if (typeof confidence.score === 'number') return confidence.score;
  if (confidence.level === 'high') return 0.9;
  if (confidence.level === 'medium') return 0.6;
  if (confidence.level === 'low') return 0.25;
  return 0;
}

function confidenceLabel(confidence: ConfidenceValue): string {
  if (confidence.level === 'unknown') return 'Unknown confidence';
  return `${humanize(confidence.level)} confidence`;
}

function rangeTarget(range: MeasurementRange<string> | null | undefined): number {
  return typeof range?.target === 'number' && Number.isFinite(range.target) ? range.target : 0;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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
