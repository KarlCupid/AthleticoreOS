import {
  createFightOpportunity,
} from '../fight-opportunity/fightOpportunityEngine.ts';
import type {
  AthleticorePhase,
  FightOpponentMetadata,
  FightOpportunity,
  FightOpportunityStatus,
  ISODateString,
  ISODateTimeString,
} from '../types/index.ts';

export interface GuidedFightOpportunityViewModel {
  source: 'fight_opportunity_engine';
  available: boolean;
  status: FightOpportunityStatus;
  statusLabel: string;
  title: string;
  summary: string;
  timeAvailable: string;
  currentPhaseLabel: string;
  recommendedTransition: string;
  trainingAdjustment: string;
  fuelingAdjustment: string;
  bodyMassFeasibility: string;
  readinessEvaluation: string;
  protectedWorkoutSummary: string;
  fightDetailsSummary: string | null;
  riskHighlights: string[];
  whatHappensNext: string[];
  ctaLabel: string;
  opportunity: FightOpportunity | null;
}

export interface BuildGuidedFightOpportunityInput {
  athleteId: string;
  status: FightOpportunityStatus;
  asOfDate: ISODateString;
  generatedAt: ISODateTimeString;
  currentPhase: AthleticorePhase;
  competitionDate: ISODateString | null;
  competitionTime?: string | null;
  weighInDate?: ISODateString | null;
  weighInTime?: string | null;
  timeZone?: string | null;
  targetWeightClassName?: string | null;
  targetWeightLbs?: number | null;
  currentBodyMassLbs?: number | null;
  opponentName?: string | null;
  opponentStance?: FightOpponentMetadata['stance'];
  eventName?: string | null;
  eventLocation?: string | null;
  weightClassChanged?: boolean;
  protectedWorkoutLabels?: string[];
  readinessLabel?: string | null | undefined;
}

const UNAVAILABLE_FIGHT_OPPORTUNITY: GuidedFightOpportunityViewModel = {
  source: 'fight_opportunity_engine',
  available: false,
  status: 'tentative',
  statusLabel: 'Fight opportunity',
  title: 'Fight opportunity',
  summary: 'Add the fight details Athleticore needs, then evaluate the opportunity.',
  timeAvailable: 'Time available unknown',
  currentPhaseLabel: 'Unknown phase',
  recommendedTransition: 'Athleticore needs fight timing before it recommends a phase change.',
  trainingAdjustment: 'Training guidance is pending.',
  fuelingAdjustment: 'Fueling guidance is pending.',
  bodyMassFeasibility: 'Weight-class context is pending.',
  readinessEvaluation: 'Readiness needs today\'s check-in before Athleticore pushes the plan.',
  protectedWorkoutSummary: 'Protected boxing sessions stay as anchors when they are available.',
  fightDetailsSummary: null,
  riskHighlights: [],
  whatHappensNext: ['Add fight status', 'Add fight timing if you have it', 'Ask Athleticore to evaluate'],
  ctaLabel: 'Evaluate opportunity',
  opportunity: null,
};

export function buildGuidedFightOpportunityViewModel(
  input: BuildGuidedFightOpportunityInput | null | undefined,
): GuidedFightOpportunityViewModel {
  if (!input) return UNAVAILABLE_FIGHT_OPPORTUNITY;

  const status = resolveStatus(input);
  const opportunity = createFightOpportunity({
    id: `${input.athleteId}:fight-opportunity:${input.competitionDate ?? input.asOfDate}:${status}`,
    athleteId: input.athleteId,
    status,
    asOfDate: input.asOfDate,
    createdAt: input.generatedAt,
    currentPhase: input.currentPhase,
    competitionDate: input.competitionDate,
    competitionTime: input.competitionTime ?? null,
    weighInDate: input.weighInDate ?? null,
    weighInTime: input.weighInTime ?? null,
    timeZone: input.timeZone ?? null,
    targetWeightClassName: clean(input.targetWeightClassName),
    targetWeightLbs: input.targetWeightLbs ?? null,
    opponent: {
      name: clean(input.opponentName),
      stance: input.opponentStance ?? null,
      notes: [],
    },
    event: {
      eventName: clean(input.eventName),
      location: clean(input.eventLocation),
    },
  });
  const daysOut = input.competitionDate ? Math.max(0, daysBetween(input.asOfDate, input.competitionDate)) : null;
  const weightClass = evaluateWeightClassContext({
    status,
    daysOut,
    currentBodyMassLbs: input.currentBodyMassLbs ?? null,
    targetWeightLbs: input.targetWeightLbs ?? null,
    targetWeightClassName: clean(input.targetWeightClassName),
    weightClassChanged: Boolean(input.weightClassChanged),
  });
  const riskHighlights = buildRiskHighlights({
    status,
    daysOut,
    hasCompetitionDate: Boolean(input.competitionDate),
    readinessLabel: input.readinessLabel,
    weightClass,
  });

  return {
    source: 'fight_opportunity_engine',
    available: true,
    status,
    statusLabel: statusLabel(status),
    title: titleForStatus(status),
    summary: summaryForStatus(status),
    timeAvailable: timeAvailableLabel(daysOut),
    currentPhaseLabel: humanize(input.currentPhase),
    recommendedTransition: transitionCopy(opportunity),
    trainingAdjustment: trainingAdjustmentCopy(status),
    fuelingAdjustment: fuelingAdjustmentCopy(status, weightClass.level),
    bodyMassFeasibility: weightClass.copy,
    readinessEvaluation: readinessCopy(input.readinessLabel),
    protectedWorkoutSummary: protectedWorkoutCopy(input.protectedWorkoutLabels ?? []),
    fightDetailsSummary: fightDetailsSummary({
      competitionDate: input.competitionDate,
      competitionTime: input.competitionTime ?? null,
      weighInDate: input.weighInDate ?? null,
      weighInTime: input.weighInTime ?? null,
      targetWeightClassName: clean(input.targetWeightClassName),
      targetWeightLbs: input.targetWeightLbs ?? null,
      opponentName: clean(input.opponentName),
      eventName: clean(input.eventName),
      eventLocation: clean(input.eventLocation),
    }),
    riskHighlights,
    whatHappensNext: nextSteps(status, weightClass.level, opportunity.phaseRecommendation.shouldTransition),
    ctaLabel: 'Ask Athleticore to evaluate',
    opportunity,
  };
}

function resolveStatus(input: BuildGuidedFightOpportunityInput): FightOpportunityStatus {
  if (input.status === 'confirmed' && input.competitionDate) {
    const daysOut = daysBetween(input.asOfDate, input.competitionDate);
    if (daysOut <= 28) return 'short_notice';
  }
  return input.status;
}

function evaluateWeightClassContext(input: {
  status: FightOpportunityStatus;
  daysOut: number | null;
  currentBodyMassLbs: number | null;
  targetWeightLbs: number | null;
  targetWeightClassName: string | null;
  weightClassChanged: boolean;
}): { level: 'none' | 'handoff' | 'watch' | 'aggressive'; copy: string } {
  if (input.status === 'canceled') {
    return {
      level: 'none',
      copy: 'No new body-mass push is needed from a canceled fight. Athleticore should keep existing body-mass context attached to the journey.',
    };
  }

  if (input.targetWeightLbs == null && !input.targetWeightClassName) {
    return {
      level: 'handoff',
      copy: 'No target weight class is set yet. Athleticore will treat body-mass feasibility as unknown, not safe by default.',
    };
  }

  const targetLabel = [
    input.targetWeightClassName,
    input.targetWeightLbs == null ? null : `${roundOne(input.targetWeightLbs)} lb`,
  ].filter(Boolean).join(' / ');
  const changedPrefix = input.weightClassChanged
    ? 'The weight class changed, so Athleticore needs to re-check feasibility. '
    : '';

  if (input.currentBodyMassLbs == null || input.targetWeightLbs == null || input.daysOut == null) {
    return {
      level: 'handoff',
      copy: `${changedPrefix}${targetLabel || 'This target'} needs a body-mass and weight-class feasibility check before Athleticore builds around it.`,
    };
  }

  const requiredChange = input.currentBodyMassLbs - input.targetWeightLbs;
  if (requiredChange <= 0) {
    return {
      level: 'watch',
      copy: `${changedPrefix}${targetLabel} does not require a lower scale target from the current body-mass estimate. Athleticore should still connect fuel, recovery, and weigh-in timing.`,
    };
  }

  const weeks = Math.max(0.5, input.daysOut / 7);
  const weeklyChange = requiredChange / weeks;
  const percentPerWeek = input.currentBodyMassLbs > 0 ? weeklyChange / input.currentBodyMassLbs : 0;
  const sameWeekPressure = input.daysOut <= 7 && requiredChange > 2;
  const aggressive = percentPerWeek > 0.01 || sameWeekPressure;

  if (aggressive) {
    return {
      level: 'aggressive',
      copy: `${changedPrefix}This target looks aggressive for the time available. Athleticore won't build a risky plan around it; safer options need to stay on the table.`,
    };
  }

  return {
    level: 'watch',
    copy: `${changedPrefix}${targetLabel} needs a body-mass and weight-class handoff so fueling, recovery, and safety stay connected.`,
  };
}

function buildRiskHighlights(input: {
  status: FightOpportunityStatus;
  daysOut: number | null;
  hasCompetitionDate: boolean;
  readinessLabel?: string | null | undefined;
  weightClass: { level: 'none' | 'handoff' | 'watch' | 'aggressive'; copy: string };
}): string[] {
  const risks: string[] = [];
  if (!input.hasCompetitionDate && input.status !== 'tentative' && input.status !== 'canceled') {
    risks.push('Fight timing is missing, so Athleticore cannot safely recommend a camp transition yet.');
  }
  if (input.status === 'short_notice' || (input.daysOut != null && input.daysOut <= 28 && input.status !== 'canceled')) {
    risks.push('This is short notice, so freshness and protected sport work need to lead.');
  }
  if (input.weightClass.level === 'aggressive') {
    risks.push(input.weightClass.copy);
  }
  if (!input.readinessLabel) {
    risks.push('Readiness needs a current check-in before Athleticore pushes intensity.');
  }
  return unique(risks).slice(0, 3);
}

function statusLabel(status: FightOpportunityStatus): string {
  if (status === 'short_notice') return 'Short notice';
  return humanize(status);
}

function titleForStatus(status: FightOpportunityStatus): string {
  if (status === 'tentative') return 'Tentative fight opportunity';
  if (status === 'short_notice') return 'Short-notice fight opportunity';
  if (status === 'canceled') return 'Canceled fight update';
  if (status === 'rescheduled') return 'Rescheduled fight opportunity';
  return 'Confirmed fight opportunity';
}

function summaryForStatus(status: FightOpportunityStatus): string {
  if (status === 'tentative') {
    return "This fight is still tentative, so Athleticore can prepare without fully overriding your current build.";
  }
  if (status === 'short_notice') {
    return 'This looks like a short-notice opportunity. Athleticore can shift toward a tighter camp without wiping out your current progress.';
  }
  if (status === 'canceled') {
    return 'The fight changed. Athleticore should guide the journey back toward useful build work without erasing what happened.';
  }
  if (status === 'rescheduled') {
    return 'The fight timing changed. Athleticore should keep the journey intact and reshape the plan around the new date.';
  }
  return 'This fight is confirmed, so Athleticore can move the journey toward camp while preserving your recent training, readiness, and body-mass context.';
}

function transitionCopy(opportunity: FightOpportunity): string {
  const recommendation = opportunity.phaseRecommendation;
  if (!recommendation.shouldTransition) {
    if (opportunity.status === 'tentative') {
      return 'Stay in the current phase while the opportunity stays on the radar.';
    }
    return `Stay in ${humanize(recommendation.recommendedPhase)} for now.`;
  }
  if (recommendation.recommendedPhase === 'short_notice_camp') {
    return 'Athleticore recommends tightening into short-notice camp.';
  }
  if (recommendation.recommendedPhase === 'camp') {
    return 'Athleticore recommends moving into camp.';
  }
  if (recommendation.recommendedPhase === 'competition_week') {
    return 'Athleticore recommends moving into competition week.';
  }
  if (recommendation.recommendedPhase === 'build') {
    return 'Athleticore recommends a return to build while keeping the work already logged.';
  }
  return `Athleticore recommends ${humanize(recommendation.recommendedPhase).toLowerCase()}.`;
}

function trainingAdjustmentCopy(status: FightOpportunityStatus): string {
  if (status === 'tentative') {
    return 'Training can keep building while nudging sport specificity up. Athleticore should not fully override the current block yet.';
  }
  if (status === 'short_notice') {
    return 'Training tightens around the time available. Key boxing work stays protected and lower-value extras come out.';
  }
  if (status === 'canceled') {
    return 'Training can return toward useful build work while preserving the camp history and recent load.';
  }
  if (status === 'rescheduled') {
    return 'Training should reshape around the new date while keeping the journey attached to recent work.';
  }
  return 'Training shifts toward fight-specific work while keeping protected sparring and coach-led sessions as anchors.';
}

function fuelingAdjustmentCopy(status: FightOpportunityStatus, bodyMassLevel: 'none' | 'handoff' | 'watch' | 'aggressive'): string {
  if (bodyMassLevel === 'aggressive') {
    return 'Fueling stays safety-first. Scale pressure does not override training demand, readiness, hydration, or recovery.';
  }
  if (status === 'canceled') {
    return 'Fueling can return to supporting the next build block instead of fight-week pressure.';
  }
  if (status === 'short_notice') {
    return 'Fueling needs to support high-output work and recovery quickly. Carbs matter around the key sessions.';
  }
  if (status === 'tentative') {
    return 'Fueling stays steady while the opportunity is uncertain. Athleticore should not chase aggressive body-mass changes.';
  }
  return 'Fueling should follow the fight timeline, session demand, readiness, and any weight-class feasibility handoff.';
}

function readinessCopy(readinessLabel?: string | null | undefined): string {
  if (!readinessLabel) {
    return "Readiness is unknown until today's check-in. Athleticore should not treat missing readiness as safe to push.";
  }
  return `Readiness: ${readinessLabel}. Athleticore should let this shape training, fuel, and recovery around the fight.`;
}

function protectedWorkoutCopy(labels: string[]): string {
  const cleanLabels = labels.map((label) => label.trim()).filter(Boolean);
  if (cleanLabels.length === 0) {
    return 'Protected sparring and coach-led sessions should stay at the center of the plan once they are added.';
  }
  return `${formatList(cleanLabels.slice(0, 2))}${cleanLabels.length > 2 ? ` and ${cleanLabels.length - 2} more` : ''} ${cleanLabels.length === 1 ? 'stays' : 'stay'} protected. Athleticore adapts support work around ${cleanLabels.length === 1 ? 'it' : 'them'}.`;
}

function fightDetailsSummary(input: {
  competitionDate: string | null;
  competitionTime: string | null;
  weighInDate: string | null;
  weighInTime: string | null;
  targetWeightClassName: string | null;
  targetWeightLbs: number | null;
  opponentName: string | null;
  eventName: string | null;
  eventLocation: string | null;
}): string | null {
  const details = [
    input.competitionDate ? `Fight: ${input.competitionDate}${input.competitionTime ? ` at ${input.competitionTime}` : ''}` : null,
    input.weighInDate ? `Weigh-in: ${input.weighInDate}${input.weighInTime ? ` at ${input.weighInTime}` : ''}` : null,
    input.targetWeightClassName || input.targetWeightLbs != null
      ? `Target: ${[input.targetWeightClassName, input.targetWeightLbs == null ? null : `${roundOne(input.targetWeightLbs)} lb`].filter(Boolean).join(' / ')}`
      : null,
    input.opponentName ? `Opponent: ${input.opponentName}` : null,
    input.eventName || input.eventLocation ? `Event: ${[input.eventName, input.eventLocation].filter(Boolean).join(' / ')}` : null,
  ].filter((item): item is string => Boolean(item));

  return details.length > 0 ? details.join(' | ') : null;
}

function nextSteps(
  status: FightOpportunityStatus,
  bodyMassLevel: 'none' | 'handoff' | 'watch' | 'aggressive',
  shouldTransition: boolean,
): string[] {
  if (status === 'canceled') {
    return ['Return the plan toward build', 'Keep training history attached', 'Review the next useful block'];
  }
  if (bodyMassLevel === 'aggressive') {
    return ['Review safer options', 'Keep fueling connected to training', 'Confirm fight details'];
  }
  if (status === 'tentative') {
    return ['Keep the opportunity on the radar', 'Protect key boxing sessions', 'Update details if the fight is confirmed'];
  }
  if (shouldTransition) {
    return ['Review the transition', 'Protect sparring anchors', 'Check body-mass feasibility'];
  }
  return ['Confirm fight details', 'Log readiness', 'Review plan'];
}

function timeAvailableLabel(daysOut: number | null): string {
  if (daysOut == null) return 'Time available unknown';
  if (daysOut === 0) return 'Fight is today';
  if (daysOut === 1) return '1 day available';
  return `${daysOut} days available`;
}

function daysBetween(start: string, end: string): number {
  const startTime = new Date(`${start}T00:00:00Z`).getTime();
  const endTime = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((endTime - startTime) / 86400000);
}

function clean(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function formatList(values: string[]): string {
  if (values.length === 0) return 'Protected work';
  if (values.length === 1) return values[0] ?? 'Protected work';
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
