import type { GuidedBodyMassViewModel } from './guidedBodyMassViewModel.ts';
import type { GuidedFuelingViewModel } from './guidedFuelingViewModel.ts';
import type { TodayMissionViewModel } from './todaysMissionViewModel.ts';
import type {
  BoxingGeneratedPlanEntrySnapshot,
  GeneratedWorkout,
} from '../workout-programming/index.ts';

export interface CoachCopyViewModel {
  headline: string;
  body: string;
  primaryAction: string;
  secondaryAction: string;
  detailLines: string[];
  safetyLines: string[];
  debugLines?: string[];
}

const TERM_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bGeneratedWorkout\b/g, 'support session'],
  [/\bworkout generation\b/gi, 'support session'],
  [/\bgenerated workout\b/gi, 'support session'],
  [/\bcompatibility view\b/gi, 'older session'],
  [/\blegacy\b/gi, 'older'],
  [/\bsnapshot\b/gi, 'saved context'],
  [/\bpayload\b/gi, 'how to do it'],
  [/\bvalidation\b/gi, 'review notes'],
  [/\bprotocol\b/gi, 'plan'],
  [/\bcompliance\b/gi, 'consistency'],
  [/\badherence\b/gi, 'logging consistency'],
  [/\bclassification\b/gi, 'call'],
  [/\bdirective\b/gi, 'guidance'],
  [/\bintervention\b/gi, 'adjustment'],
  [/\bredline\b/gi, 'overreach'],
  [/\binvalid\b/gi, 'needs review'],
  [/\bfailure\b/gi, 'could not complete'],
  [/\bfailed\b/gi, 'could not complete'],
  [/\bConfidence is unknown\b/gi, 'Athleticore needs more context'],
  [/\bUnknown confidence\b/gi, 'Context unknown'],
  [/\bLow confidence\b/gi, 'Limited context'],
  [/\bFood log confidence\b/gi, 'How much Athleticore knows'],
  [/\bmission unavailable\b/gi, 'mission needs context'],
  [/\binsufficient data\b/gi, 'needs more context'],
  [/\bdata quality\b/gi, 'context'],
  [/\bNutrition and Fueling Engine\b/g, 'Athleticore fueling'],
  [/\bengine generated\b/gi, 'Athleticore built'],
  [/\bgenerated session\b/gi, 'support session'],
  [/\bunavailable\b/gi, 'needs a refresh'],
  [/\bconfidence\b/gi, 'context'],
];

export function sanitizeAthleteFacingCopy(value: string | null | undefined): string {
  let copy = normalizeWhitespace(value ?? '');
  for (const [pattern, replacement] of TERM_REPLACEMENTS) {
    copy = copy.replace(pattern, replacement);
  }
  return normalizeWhitespace(copy);
}

export function buildTodayCoachCopy(mission: TodayMissionViewModel): CoachCopyViewModel {
  const primary = mission.nextActions[0]?.label ?? 'Review plan';
  const secondary = mission.nextActions[1]?.label ?? 'Show details';
  const detailLines = unique([
    mission.trainingSummary,
    mission.fuelingFocus,
    mission.readinessSummary,
    mission.recoveryPriority,
    mission.bodyMassContext,
    mission.fightOrCompetitionContext,
    ...mission.planAdjustments.slice(0, 2),
  ].map(sanitizeAthleteFacingCopy)).slice(0, 6);
  const safetyLines = unique([
    ...mission.riskHighlights,
    mission.confidence.level === 'low' || mission.confidence.level === 'unknown'
      ? contextSummary(mission.confidence.summary)
      : null,
  ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy));

  return {
    headline: sanitizeAthleteFacingCopy(mission.primaryFocus),
    body: sanitizeAthleteFacingCopy(mission.whyTodayMatters),
    primaryAction: sanitizeAthleteFacingCopy(primary),
    secondaryAction: sanitizeAthleteFacingCopy(secondary),
    detailLines,
    safetyLines,
  };
}

export function buildSupportSessionCoachCopy(input: {
  snapshot: BoxingGeneratedPlanEntrySnapshot;
  durationMinutes?: number | null | undefined;
  sourceLabel?: string | null | undefined;
}): CoachCopyViewModel {
  const { snapshot } = input;
  const headline = snapshot.supportDomainLabel
    ?? input.sourceLabel
    ?? snapshot.label
    ?? 'Athleticore support session';
  const body = snapshot.sAndCRationale
    ?? snapshot.athleticDevelopmentRationale
    ?? snapshot.boxingRelevance
    ?? snapshot.rationale[0]
    ?? snapshot.weekSummary.nextBestAction
    ?? 'Do the support work that helps today without replacing boxing practice.';
  const duration = snapshot.estimatedDurationMinutes ?? input.durationMinutes ?? null;
  const detailLines = unique([
    snapshot.label,
    snapshot.sessionDoseCategory ? labelize(snapshot.sessionDoseCategory) : null,
    snapshot.plannedIntensity ? `${labelize(snapshot.plannedIntensity)} effort` : null,
    duration ? `${duration} min` : null,
    snapshot.expectedFuelPriority ? fuelPriorityLabel(snapshot.expectedFuelPriority) : null,
  ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy));
  const safetyLines = snapshot.athleticDevelopmentDomain === 'boxing_skill_support'
    ? ['This supports boxing rhythm. It is not coach-led boxing, sparring, or a replacement for practice.']
    : [];

  return {
    headline: sanitizeAthleteFacingCopy(headline),
    body: sanitizeAthleteFacingCopy(body),
    primaryAction: 'Open support session',
    secondaryAction: snapshot.generatedWorkout ? 'Workout details are ready' : "Open to build today's session",
    detailLines,
    safetyLines,
  };
}

export function buildGeneratedWorkoutPreviewCopy(workout: GeneratedWorkout): CoachCopyViewModel {
  const description = workout.description;
  const safetyLines = unique([
    ...(workout.safetyNotes ?? []),
    ...(description?.safetyNotes ?? []),
  ].map(sanitizeAthleteFacingCopy));
  const detailLines = unique([
    workout.athleticDevelopmentDomain ? labelize(workout.athleticDevelopmentDomain) : null,
    workout.trainingGoalLabel ?? labelize(workout.goalId),
    `${workout.estimatedDurationMinutes} min`,
    `${workout.blocks.length} part${workout.blocks.length === 1 ? '' : 's'}`,
  ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy));

  return {
    headline: sanitizeAthleteFacingCopy(workout.sessionIntent ?? description?.sessionIntent ?? 'Train with intent.'),
    body: sanitizeAthleteFacingCopy(workout.userFacingSummary ?? description?.plainLanguageSummary ?? 'Move well and keep the work controlled.'),
    primaryAction: workout.blocked ? 'Review safer options' : 'Start session',
    secondaryAction: 'Show details',
    detailLines,
    safetyLines,
    debugLines: [
      `workoutTypeId=${workout.workoutTypeId}`,
      `goalId=${workout.goalId}`,
    ],
  };
}

export function buildFuelCoachCopy(viewModel: GuidedFuelingViewModel): CoachCopyViewModel {
  return {
    headline: sanitizeAthleteFacingCopy(viewModel.primaryFocus),
    body: sanitizeAthleteFacingCopy(viewModel.whyItMatters),
    primaryAction: 'Log fuel',
    secondaryAction: 'Open full tracker',
    detailLines: unique([
      viewModel.phaseContext,
      ...viewModel.sessionGuidance.slice(0, 2),
      viewModel.recoveryNutritionFocus,
      ...viewModel.detailLines.slice(0, 2),
    ].map(sanitizeAthleteFacingCopy)).slice(0, 5),
    safetyLines: unique([
      viewModel.bodyMassContext,
      ...viewModel.riskHighlights,
    ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy)),
  };
}

export function buildWeightClassCoachCopy(viewModel: GuidedBodyMassViewModel): CoachCopyViewModel {
  const safetyFirst = viewModel.planBlocked || viewModel.statusTone === 'blocked';
  return {
    headline: sanitizeAthleteFacingCopy(safetyFirst ? viewModel.primaryMessage : viewModel.statusLabel),
    body: sanitizeAthleteFacingCopy(safetyFirst ? 'Review safer options before chasing the scale.' : viewModel.primaryMessage),
    primaryAction: safetyFirst ? 'Review safer options' : sanitizeAthleteFacingCopy(viewModel.nextActions[0] ?? 'Log body mass'),
    secondaryAction: sanitizeAthleteFacingCopy(viewModel.nextActions[1] ?? 'Open weight-class context'),
    detailLines: viewModel.detailRows.map((row) =>
      sanitizeAthleteFacingCopy(`${coachDetailLabel(row.label)}: ${row.value}`),
    ),
    safetyLines: unique([
      viewModel.professionalReviewRecommendation,
      ...viewModel.riskHighlights,
      ...viewModel.saferAlternatives.slice(0, 2),
    ].filter((item): item is string => Boolean(item)).map(sanitizeAthleteFacingCopy)),
  };
}

export function buildCompatibilityCopy(input?: {
  reason?: string | null | undefined;
}): CoachCopyViewModel {
  return {
    headline: 'Older session',
    body: sanitizeAthleteFacingCopy(input?.reason ?? 'This older session can still be reviewed. Build a current support session if you want today-ready details.'),
    primaryAction: 'Build support session',
    secondaryAction: 'Review older session',
    detailLines: ['Older session context is readable, but current support work should be rebuilt from today.'],
    safetyLines: [],
  };
}

export function buildErrorStateCoachCopy(input: {
  title?: string | null | undefined;
  body?: string | null | undefined;
  action?: string | null | undefined;
}): CoachCopyViewModel {
  return {
    headline: sanitizeAthleteFacingCopy(input.title ?? 'This needs a fresh look.'),
    body: sanitizeAthleteFacingCopy(input.body ?? 'Try again or open the session from the main screen.'),
    primaryAction: sanitizeAthleteFacingCopy(input.action ?? 'Try again'),
    secondaryAction: 'Go back',
    detailLines: [],
    safetyLines: [],
  };
}

function contextSummary(value: string): string {
  const sanitized = sanitizeAthleteFacingCopy(value);
  return sanitized
    .replace(/\bconfidence\b/gi, 'context')
    .replace(/\blimited context is limited\b/gi, 'context is limited');
}

function coachDetailLabel(label: string): string {
  if (/required/i.test(label)) return label.replace(/Required change/i, 'To target');
  if (/feasibility/i.test(label)) return 'Status';
  return label;
}

function fuelPriorityLabel(value: string): string {
  if (value === 'strength_power') return 'Strength & power fuel';
  if (value === 'roadwork_aerobic' || value === 'roadwork_tempo') return 'Roadwork fuel';
  if (value === 'conditioning_intervals') return 'Conditioning fuel';
  if (value === 'durability') return 'Durability fuel';
  if (value === 'boxing_practice') return 'Boxing practice fuel';
  return labelize(value);
}

function labelize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeWhitespace).filter(Boolean)));
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
