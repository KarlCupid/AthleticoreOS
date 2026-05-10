import type {
  BoxingQualityGap,
  BoxingVariancePlan,
  GeneratedProgram,
  GeneratedProgramWeek,
} from '../workout-programming/types.ts';

export interface BoxingWorkoutPlanViewModel {
  headline: string;
  summary: string;
  primaryFocus: string;
  hardDaySummary: string;
  protectedLoadSummary: string;
  generatedSupportSummary: string;
  nextBestAction: string;
  coachSummaryBullets: string[];
  qualityGaps: BoxingQualityGap[];
  variancePlan: BoxingVariancePlan | null;
  whyNotExplanations: string[];
}

function clean(value: string | null | undefined): string | null {
  const next = value?.trim();
  return next && next.length > 0 ? next : null;
}

function fallbackHeadline(week: GeneratedProgramWeek): string {
  const track = week.rulesetTrack ?? week.weeklyDose?.track ?? 'boxing';
  return `${track.replace(/_/g, ' ')} plan`;
}

function fallbackSummary(week: GeneratedProgramWeek): string {
  const protectedCount = week.weeklyVolumeSummary.protectedBoxingSessionCount ?? 0;
  return protectedCount > 0
    ? `Athleticore built support around ${protectedCount} protected boxing anchor(s).`
    : 'Athleticore built boxing support from the weekly dose plan.';
}

function traceText(week: GeneratedProgramWeek): string[] {
  return week.sessions
    .filter((session) => !session.protectedAnchor)
    .flatMap((session) => [
      ...(session.rationale ?? []),
      ...(session.workout?.explanations ?? []),
      ...(session.workout?.decisionTrace?.map((entry) => entry.reason) ?? []),
    ]);
}

export function buildBoxingWhyNotExplanations(week: GeneratedProgramWeek): string[] {
  const text = [
    ...traceText(week),
    ...(week.userFacingWarnings ?? []),
    ...(week.coachRationale ?? []),
  ].join(' \n ');
  const explanations: string[] = [];

  if (/interval|roadwork_intervals/i.test(text) && /fallback|downgrad|removed|converted|could not be used|reduced/i.test(text)) {
    explanations.push('Intervals were removed or reduced because readiness, safety flags, or the hard-day budget made a lower-load boxing support session the better choice.');
  }
  if (/roadwork/i.test(text) && /no_running|stationary_bike|fallback|covered|replaced/i.test(text)) {
    explanations.push('Roadwork was replaced when running was not appropriate or already covered, while preserving the aerobic support target through a safer option.');
  }
  if (/stack|same day|protected anchor/i.test(text)) {
    explanations.push('Mobility, recovery, or technical microdose work can stack on a boxing day when it is short, low-load, and fits the day capacity.');
  }
  const protectedSparring = week.weeklyVolumeSummary.protectedSparringCount ?? week.boxingLoadLedger?.protectedSparringRounds ?? 0;
  if ((/sparring/i.test(text) || protectedSparring > 0) && /hard.*budget|hard.*cap|capped|supportive|reduced/i.test(text)) {
    explanations.push('Hard work was capped because sparring already owns the high-stress boxing exposure for the week.');
  }
  if (/red readiness|orange readiness|poor_readiness|downgrad|recovery/i.test(text)) {
    explanations.push('Readiness downgraded the week so useful low-load frequency stayed in place without adding hard work.');
  }

  return [...new Set(explanations)];
}

export function buildBoxingWorkoutPlanViewModel(
  input: GeneratedProgram | GeneratedProgramWeek,
): BoxingWorkoutPlanViewModel | null {
  const week = 'weeks' in input ? input.weeks[0] : input;
  if (!week) return null;
  const hasBoxingSignals = Boolean(
    week.weeklyDose
    || week.boxingLoadLedger
    || week.weeklyBoxingHeadline
    || week.qualityGaps?.length
    || week.variancePlan,
  );
  if (!hasBoxingSignals) return null;

  return {
    headline: clean(week.weeklyBoxingHeadline) ?? fallbackHeadline(week),
    summary: clean(week.weeklyBoxingSummary) ?? fallbackSummary(week),
    primaryFocus: clean(week.primaryBoxingFocus) ?? 'boxing support',
    hardDaySummary: clean(week.hardDaySummary) ?? `Hard days: ${week.hardDayCount}/${week.weeklyDose?.hardDayCap ?? 0}.`,
    protectedLoadSummary: clean(week.protectedLoadSummary) ?? `${week.weeklyVolumeSummary.protectedBoxingSessionCount ?? 0} protected boxing anchor(s).`,
    generatedSupportSummary: clean(week.generatedSupportSummary) ?? `${week.weeklyVolumeSummary.generatedSessionCount} support session(s).`,
    nextBestAction: clean(week.nextBestAction) ?? 'Complete the next support session and log RPE, pain, and completion.',
    coachSummaryBullets: week.coachSummaryBullets?.length ? week.coachSummaryBullets : [],
    qualityGaps: week.qualityGaps ?? [],
    variancePlan: week.variancePlan ?? null,
    whyNotExplanations: buildBoxingWhyNotExplanations(week),
  };
}
