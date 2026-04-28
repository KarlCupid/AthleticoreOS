import type {
  ACWRResult,
  DailyAthleteSummary,
  ReadinessFlag,
  ReadinessState,
  WeightTrendResult,
  WeeklyComplianceReport,
} from '../types.ts';
import { humanizeCoachSentence } from './coachCopy.ts';

export type MissionDashboardTone = 'positive' | 'caution' | 'danger' | 'neutral';

export type MissionDashboardStatus =
  | 'good_to_push'
  | 'train_smart'
  | 'pull_back'
  | 'not_enough_data';

export type MissionSupportCardKind =
  | 'training_trend'
  | 'risk_alert'
  | 'consistency'
  | 'bodyweight'
  | 'performance_pulse'
  | 'fight_camp';

export interface RecentTrainingSessionSummary {
  date: string;
  total_volume: number | null;
  session_rpe: number | null;
  duration_minutes: number | null;
  workout_type?: string | null;
}

export interface MissionSupportCardViewModel {
  kind: MissionSupportCardKind;
  title: string;
  status: string;
  subtext: string;
  tone: MissionDashboardTone;
  action?: string;
}

export interface MissionDashboardViewModel {
  status: MissionDashboardStatus;
  statusLabel: string;
  mission: string;
  why: string[];
  tone: MissionDashboardTone;
  supportCards: MissionSupportCardViewModel[];
}

interface MissionDashboardInput {
  mission: DailyAthleteSummary | null;
  acwr: ACWRResult | null;
  readinessState: ReadinessState | null;
  checkinDone: boolean;
  sessionDone: boolean;
  hasActiveFightCamp: boolean;
  hasActiveWeightClassPlan: boolean;
  todayPlanEntryIsDeload: boolean;
  weightTrend: WeightTrendResult | null;
  weeklyReview: WeeklyComplianceReport | null;
  recentTrainingSessions: RecentTrainingSessionSummary[];
  bodyMassSafetyFlags: Array<{
    severity: 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    recommendation: string;
  }>;
}

const NOT_ENOUGH_DATA = 'Not enough data yet - keep logging';

const STATUS_LABELS: Record<MissionDashboardStatus, string> = {
  good_to_push: 'Good to push',
  train_smart: 'Train smart',
  pull_back: 'Pull back',
  not_enough_data: 'Keep logging',
};

const STATUS_TONES: Record<MissionDashboardStatus, MissionDashboardTone> = {
  good_to_push: 'positive',
  train_smart: 'caution',
  pull_back: 'danger',
  not_enough_data: 'neutral',
};

function isHighRisk(level: DailyAthleteSummary['riskState']['level'] | undefined): boolean {
  return level === 'high' || level === 'critical';
}

function hasFlagLevel(flags: ReadinessFlag[] | undefined, level: 'yellow' | 'red'): boolean {
  return Boolean(flags?.some((flag) => flag.level === level));
}

function isFightCamp(input: MissionDashboardInput): boolean {
  return input.hasActiveFightCamp || input.mission?.macrocycleContext.goalMode === 'fight_camp';
}

function isFightWeek(input: MissionDashboardInput): boolean {
  const daysOut = input.mission?.macrocycleContext.daysOut;

  return (
    typeof daysOut === 'number' && daysOut <= 7
  );
}

function hasDangerFlag(input: MissionDashboardInput): boolean {
  return input.bodyMassSafetyFlags.some((flag) => flag.severity === 'danger');
}

function hasWarningFlag(input: MissionDashboardInput): boolean {
  return input.bodyMassSafetyFlags.some((flag) => flag.severity === 'warning');
}

function isDeload(input: MissionDashboardInput): boolean {
  return input.todayPlanEntryIsDeload || Boolean(input.mission?.trainingDirective.prescription?.isDeloadWorkout);
}

function getStatus(input: MissionDashboardInput): MissionDashboardStatus {
  const { mission } = input;
  if (!mission) return 'not_enough_data';

  const directive = mission.trainingDirective;
  const riskLevel = mission.riskState?.level;
  const readinessFlags = mission.readinessProfile?.flags;

  if (
    hasDangerFlag(input) ||
    riskLevel === 'critical' ||
    directive.interventionState === 'hard' ||
    directive.isMandatoryRecovery ||
    hasFlagLevel(readinessFlags, 'red')
  ) {
    return 'pull_back';
  }

  if (directive.sessionRole === 'rest' || directive.sessionRole === 'recover') {
    return 'pull_back';
  }

  if (
    isDeload(input) ||
    isFightWeek(input) ||
    hasWarningFlag(input) ||
    riskLevel === 'high' ||
    riskLevel === 'moderate' ||
    directive.interventionState === 'soft' ||
    input.acwr?.status === 'redline' ||
    input.acwr?.status === 'caution' ||
    input.readinessState === 'Caution' ||
    input.readinessState === 'Depleted' ||
    hasFlagLevel(readinessFlags, 'yellow')
  ) {
    return 'train_smart';
  }

  return 'good_to_push';
}

function getMissionText(input: MissionDashboardInput, status: MissionDashboardStatus): string {
  const role = input.mission?.trainingDirective.sessionRole;

  if (status === 'not_enough_data') return 'Keep logging';
  if (status === 'pull_back') return 'Focus on recovery';
  if (isFightWeek(input)) return 'Fight week: stay fresh';
  if (isDeload(input)) return 'Focus on recovery';
  if (role === 'body_mass_protect' || role === 'taper_sharpen') return 'Stay sharp, reduce volume';
  if (status === 'train_smart') return 'Train, but keep it controlled';
  return 'Push hard today';
}

function cleanSentence(text: string | null | undefined, fallback: string): string {
  const sentence = humanizeCoachSentence(text, fallback)
    .replace(/\bACWR\b/gi, 'workload')
    .replace(/\bHRV\b/gi, 'recovery')
    .replace(/\breadiness score\b/gi, 'recovery')
    .replace(/\s+/g, ' ')
    .trim();

  return sentence || fallback;
}

function pushReason(reasons: string[], sentence: string) {
  const clean = cleanSentence(sentence, sentence);
  if (clean && !reasons.includes(clean) && reasons.length < 2) {
    reasons.push(clean);
  }
}

function buildWhy(input: MissionDashboardInput, status: MissionDashboardStatus): string[] {
  const reasons: string[] = [];
  const { mission, acwr, weightTrend } = input;

  if (!mission) {
    return [NOT_ENOUGH_DATA];
  }

  const danger = input.bodyMassSafetyFlags.find((flag) => flag.severity === 'danger');
  if (danger) {
    pushReason(reasons, danger.message || 'A safety flag is active today.');
    pushReason(reasons, danger.recommendation || 'Adjust today or prioritize recovery.');
    return reasons;
  }

  if (!input.checkinDone) {
    pushReason(reasons, "Check in so today's guidance can sharpen.");
  }

  if (isFightWeek(input)) {
    pushReason(reasons, 'The fight is close, so freshness matters more than extra work.');
    if (input.hasActiveWeightClassPlan) {
      pushReason(reasons, 'Weight-class context is active, so keep decisions simple today.');
    } else {
      pushReason(reasons, 'Fatigue is expected at this stage of camp.');
    }
    return reasons;
  }

  if (isDeload(input)) {
    pushReason(reasons, 'This is a lighter week on purpose.');
    pushReason(reasons, 'Let recovery catch up before the next push.');
    return reasons;
  }

  if (status === 'pull_back') {
    pushReason(reasons, 'Recovery is falling behind.');
    pushReason(reasons, 'Keep the work easy today and avoid extra volume.');
    return reasons;
  }

  if (isFightCamp(input) && status === 'train_smart') {
    pushReason(reasons, 'Fatigue is expected at this stage of camp.');
    pushReason(reasons, 'Do the planned work without chasing extra volume.');
    return reasons;
  }

  if (acwr?.status === 'redline' || acwr?.status === 'caution') {
    pushReason(reasons, 'Workload increased quickly this week.');
    pushReason(reasons, 'Adjust today or prioritize recovery.');
    return reasons;
  }

  if (weightTrend?.isRapidLoss) {
    pushReason(reasons, 'Weight is dropping faster than planned.');
    pushReason(reasons, 'Keep training controlled and protect recovery.');
    return reasons;
  }

  if (input.readinessState === 'Depleted') {
    pushReason(reasons, 'Recovery is falling behind.');
    pushReason(reasons, 'Today should stay controlled.');
    return reasons;
  }

  if (status === 'good_to_push') {
    pushReason(reasons, "You're well recovered and ready to push.");
    if (mission.macrocycleContext.goalMode === 'build_phase') {
      pushReason(reasons, 'Build phase is for progress, so make the quality work count.');
    }
    return reasons;
  }

  pushReason(reasons, mission.trainingDirective.reason || mission.summary);
  pushReason(reasons, 'Do the planned work and skip optional extras.');
  return reasons.length > 0 ? reasons : ['Today matches your plan and current recovery.'];
}

function buildTrainingTrendCard(acwr: ACWRResult | null): MissionSupportCardViewModel {
  if (!acwr || acwr.daysOfData < 7 || acwr.thresholds.confidence === 'low') {
    return {
      kind: 'training_trend',
      title: 'Training trend',
      status: 'Keep logging',
      subtext: NOT_ENOUGH_DATA,
      tone: 'neutral',
    };
  }

  if (acwr.status === 'redline' || acwr.status === 'caution') {
    return {
      kind: 'training_trend',
      title: 'Training trend',
      status: 'Ramping up',
      subtext: 'Workload has increased quickly.',
      tone: acwr.status === 'redline' ? 'danger' : 'caution',
    };
  }

  if (acwr.ratio > 0 && acwr.ratio < acwr.thresholds.detrained) {
    return {
      kind: 'training_trend',
      title: 'Training trend',
      status: 'Dropping off',
      subtext: 'Training has been lighter than normal.',
      tone: 'neutral',
    };
  }

  return {
    kind: 'training_trend',
    title: 'Training trend',
    status: 'Staying steady',
    subtext: 'Workload looks controlled.',
    tone: 'positive',
  };
}

function buildRiskCard(input: MissionDashboardInput): MissionSupportCardViewModel | null {
  const danger = input.bodyMassSafetyFlags.find((flag) => flag.severity === 'danger');
  if (danger) {
    return {
      kind: 'risk_alert',
      title: 'Risk alert',
      status: danger.title || 'Safety flag active',
      subtext: danger.message || 'Adjust today before pushing.',
      action: danger.recommendation || 'Adjust today or prioritize recovery.',
      tone: 'danger',
    };
  }

  const warning = input.bodyMassSafetyFlags.find((flag) => flag.severity === 'warning');
  if (warning) {
    return {
      kind: 'risk_alert',
      title: 'Risk alert',
      status: warning.title || 'Recovery needs attention',
      subtext: warning.message || 'Keep today controlled.',
      action: warning.recommendation || 'Adjust today or prioritize recovery.',
      tone: 'caution',
    };
  }

  if (input.weightTrend?.isRapidLoss) {
    return {
      kind: 'risk_alert',
      title: 'Risk alert',
      status: 'Weight dropping too fast',
      subtext: 'You are losing weight faster than planned.',
      action: 'Adjust today or prioritize recovery.',
      tone: 'caution',
    };
  }

  const riskLevel = input.mission?.riskState?.level;
  if (isHighRisk(riskLevel)) {
    const isWorkloadDriven = input.acwr?.status === 'redline' || input.acwr?.status === 'caution';
    return {
      kind: 'risk_alert',
      title: 'Risk alert',
      status: isWorkloadDriven ? 'Workload spike detected' : 'Recovery is falling behind',
      subtext: isFightCamp(input)
        ? 'Stay disciplined, but do not add extra work.'
        : 'Today should be adjusted.',
      action: 'Adjust today or prioritize recovery.',
      tone: riskLevel === 'critical' ? 'danger' : 'caution',
    };
  }

  if (!isFightCamp(input) && input.acwr?.status === 'redline') {
    return {
      kind: 'risk_alert',
      title: 'Risk alert',
      status: 'Workload spike detected',
      subtext: 'Recent work is above your normal base.',
      action: 'Adjust today or prioritize recovery.',
      tone: 'danger',
    };
  }

  return null;
}

function buildConsistencyCard(report: WeeklyComplianceReport | null): MissionSupportCardViewModel {
  if (!report) {
    return {
      kind: 'consistency',
      title: 'Consistency',
      status: 'Keep logging',
      subtext: NOT_ENOUGH_DATA,
      tone: 'neutral',
    };
  }

  const planned = report.sc.planned + report.boxing.planned + report.running.planned + report.conditioning.planned + report.recovery.planned;
  const actual = report.sc.actual + report.boxing.actual + report.running.actual + report.conditioning.actual + report.recovery.actual;

  if (planned > 0) {
    return {
      kind: 'consistency',
      title: 'Consistency',
      status: `${actual} of ${planned} sessions completed this week`,
      subtext: actual >= planned ? 'Strong follow-through.' : actual > 0 ? 'Rhythm is building.' : 'Start with the next session.',
      tone: actual > 0 ? 'positive' : 'neutral',
    };
  }

  if (report.streak > 0) {
    return {
      kind: 'consistency',
      title: 'Consistency',
      status: `${report.streak}-day streak`,
      subtext: 'Keep the rhythm going.',
      tone: 'positive',
    };
  }

  return {
    kind: 'consistency',
    title: 'Consistency',
    status: 'Keep logging',
    subtext: NOT_ENOUGH_DATA,
    tone: 'neutral',
  };
}

function buildBodyweightCard(
  trend: WeightTrendResult | null,
  hasActiveWeightClassPlan: boolean,
): MissionSupportCardViewModel {
  if (!trend) {
    return {
      kind: 'bodyweight',
      title: 'Bodyweight',
      status: 'Keep logging',
      subtext: hasActiveWeightClassPlan ? NOT_ENOUGH_DATA : 'Add weigh-ins when bodyweight matters.',
      tone: 'neutral',
    };
  }

  if (trend.isRapidLoss) {
    return {
      kind: 'bodyweight',
      title: 'Bodyweight',
      status: 'Dropping fast',
      subtext: 'You are losing weight faster than planned.',
      tone: 'caution',
    };
  }

  if (trend.status === 'on_track' || trend.status === 'ahead') {
    return {
      kind: 'bodyweight',
      title: 'Bodyweight',
      status: 'On track',
      subtext: 'Bodyweight is moving as planned.',
      tone: 'positive',
    };
  }

  if (trend.status === 'behind' || trend.status === 'stalled' || trend.status === 'gaining') {
    return {
      kind: 'bodyweight',
      title: 'Bodyweight',
      status: trend.status === 'stalled' ? 'Holding steady' : 'Needs attention',
      subtext: 'Bodyweight is not moving as planned.',
      tone: 'caution',
    };
  }

  return {
    kind: 'bodyweight',
    title: 'Bodyweight',
    status: 'Holding steady',
    subtext: 'No urgent bodyweight action today.',
    tone: 'neutral',
  };
}

function sessionLoad(session: RecentTrainingSessionSummary): number {
  const volume = Number(session.total_volume ?? 0);
  if (Number.isFinite(volume) && volume > 0) return volume;

  const duration = Number(session.duration_minutes ?? 0);
  const rpe = Number(session.session_rpe ?? 0);
  if (Number.isFinite(duration) && duration > 0 && Number.isFinite(rpe) && rpe > 0) {
    return duration * rpe;
  }

  return 0;
}

function average(values: number[]): number {
  const usable = values.filter((value) => Number.isFinite(value) && value > 0);
  if (usable.length === 0) return 0;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function buildPerformanceCard(sessions: RecentTrainingSessionSummary[]): MissionSupportCardViewModel {
  const ordered = [...sessions]
    .filter((session) => Boolean(session.date))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-8);

  if (ordered.length < 4) {
    return {
      kind: 'performance_pulse',
      title: 'Performance pulse',
      status: 'Keep logging',
      subtext: NOT_ENOUGH_DATA,
      tone: 'neutral',
    };
  }

  const midpoint = Math.floor(ordered.length / 2);
  const olderAverage = average(ordered.slice(0, midpoint).map(sessionLoad));
  const recentAverage = average(ordered.slice(midpoint).map(sessionLoad));

  if (olderAverage <= 0 || recentAverage <= 0) {
    return {
      kind: 'performance_pulse',
      title: 'Performance pulse',
      status: 'Keep logging',
      subtext: NOT_ENOUGH_DATA,
      tone: 'neutral',
    };
  }

  const change = (recentAverage - olderAverage) / olderAverage;
  if (change > 0.1) {
    return {
      kind: 'performance_pulse',
      title: 'Performance pulse',
      status: 'Improving',
      subtext: 'Training output is trending up.',
      tone: 'positive',
    };
  }

  if (change < -0.15) {
    return {
      kind: 'performance_pulse',
      title: 'Performance pulse',
      status: 'Stalling',
      subtext: 'Recent sessions are down.',
      tone: 'caution',
    };
  }

  return {
    kind: 'performance_pulse',
    title: 'Performance pulse',
    status: 'Holding',
    subtext: 'Recent sessions look stable.',
    tone: 'neutral',
  };
}

function titleize(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function buildFightCampCard(input: MissionDashboardInput): MissionSupportCardViewModel | null {
  if (!isFightCamp(input)) return null;

  const daysOut = input.mission?.macrocycleContext.daysOut;
  const phase = titleize(input.mission?.macrocycleContext.campPhase ?? input.mission?.macrocycleContext.phase);
  const status = typeof daysOut === 'number' ? `${daysOut} days to fight` : 'Fight camp active';
  const details = [
    phase ? `${phase} phase` : null,
    input.hasActiveWeightClassPlan ? 'Weight-class management active' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    kind: 'fight_camp',
    title: 'Fight camp',
    status,
    subtext: `${details.join(' - ') || 'Camp context active'}. Fatigue is expected right now.`,
    tone: 'neutral',
  };
}

export function buildMissionDashboardViewModel(
  input: MissionDashboardInput,
): MissionDashboardViewModel {
  const status = getStatus(input);
  const riskCard = buildRiskCard(input);
  const fightCampCard = buildFightCampCard(input);

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    mission: getMissionText(input, status),
    why: buildWhy(input, status).slice(0, 2),
    tone: STATUS_TONES[status],
    supportCards: [
      fightCampCard,
      riskCard,
      buildTrainingTrendCard(input.acwr),
      buildConsistencyCard(input.weeklyReview),
      buildBodyweightCard(input.weightTrend, input.hasActiveWeightClassPlan),
      buildPerformanceCard(input.recentTrainingSessions),
    ].filter((card): card is MissionSupportCardViewModel => Boolean(card)),
  };
}
