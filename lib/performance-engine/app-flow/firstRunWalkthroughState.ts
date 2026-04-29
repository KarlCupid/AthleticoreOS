import type { AthleteJourneyState, PerformanceState } from '../types/index.ts';

export const FIRST_RUN_WALKTHROUGH_KEY = 'first_run_walkthrough';
export const CURRENT_FIRST_RUN_WALKTHROUGH_VERSION = 1;

export type FirstRunWalkthroughStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'dismissed'
  | 'needs_update';

export type FirstRunWalkthroughAppliesTo =
  | 'new_signup'
  | 'first_sign_in'
  | 'existing_user_overhaul_intro';

export type FirstRunWalkthroughStep =
  | 'welcome'
  | 'journey_setup'
  | 'protected_workout_setup'
  | 'fight_context_setup'
  | 'fueling_setup'
  | 'readiness_baseline'
  | 'today_mission_intro'
  | 'app_tour';

export type FirstRunWalkthroughSource =
  | 'auth_signup'
  | 'auth_sign_in'
  | 'app_entry'
  | 'onboarding'
  | 'existing_user_migration'
  | 'manual';

export interface FirstRunWalkthroughExplanation {
  code: string;
  message: string;
}

export interface FirstRunWalkthroughState {
  userId: string;
  athleteId: string;
  status: FirstRunWalkthroughStatus;
  currentStep: FirstRunWalkthroughStep | null;
  completedSteps: FirstRunWalkthroughStep[];
  skippedSteps: FirstRunWalkthroughStep[];
  startedAt: string | null;
  completedAt: string | null;
  lastSeenAt: string | null;
  walkthroughVersion: number;
  appliesTo: FirstRunWalkthroughAppliesTo;
  isNewUser: boolean;
  isExistingUserMigration: boolean;
  hasSeenTodayMissionIntro: boolean;
  hasSeenAppTour: boolean;
  hasCompletedJourneySetup: boolean;
  hasCompletedProtectedWorkoutSetup: boolean;
  hasCompletedFightContextSetup: boolean;
  hasCompletedFuelingSetup: boolean;
  hasCompletedReadinessBaseline: boolean;
  canResume: boolean;
  source: FirstRunWalkthroughSource;
  explanations: FirstRunWalkthroughExplanation[];
}

export interface FirstRunWalkthroughEvidence {
  userId: string;
  athleteId?: string | null;
  hasProfile: boolean;
  hasCompletedJourneySetup?: boolean;
  hasCompletedProtectedWorkoutSetup?: boolean;
  hasCompletedFightContextSetup?: boolean;
  hasCompletedFuelingSetup?: boolean;
  hasCompletedReadinessBaseline?: boolean;
  hasSeenTodayMissionIntro?: boolean;
  hasSeenAppTour?: boolean;
  hasHistoricalTrainingData?: boolean;
  hasHistoricalNutritionData?: boolean;
  hasHistoricalReadinessData?: boolean;
  hasHistoricalBodyMassData?: boolean;
  hasHistoricalScheduleData?: boolean;
  hasActiveBuildGoal?: boolean;
  hasActiveFightCamp?: boolean;
  hasActiveWeightClassPlan?: boolean;
  existingState?: FirstRunWalkthroughState | null;
  source?: FirstRunWalkthroughSource;
  requiredVersion?: number;
  now?: string;
}

export interface FirstRunWalkthroughResolution {
  needsWalkthrough: boolean;
  appliesTo: FirstRunWalkthroughAppliesTo;
  state: FirstRunWalkthroughState;
  explanations: FirstRunWalkthroughExplanation[];
}

export interface WalkthroughContinuityCheck {
  journeyPreserved: boolean;
  performanceStatePreserved: boolean;
  explanations: FirstRunWalkthroughExplanation[];
}

export interface FirstRunWalkthroughStateRepository {
  load: (userId: string) => Promise<FirstRunWalkthroughState | null>;
  save: (state: FirstRunWalkthroughState) => Promise<FirstRunWalkthroughState>;
}

export const FIRST_RUN_WALKTHROUGH_STEPS: readonly FirstRunWalkthroughStep[] = [
  'welcome',
  'journey_setup',
  'protected_workout_setup',
  'fight_context_setup',
  'fueling_setup',
  'readiness_baseline',
  'today_mission_intro',
  'app_tour',
];

const EXISTING_USER_INTRO_STEPS: readonly FirstRunWalkthroughStep[] = [
  'today_mission_intro',
  'app_tour',
];

function nowIso(override?: string): string {
  return override ?? new Date().toISOString();
}

function uniqueSteps(steps: FirstRunWalkthroughStep[]): FirstRunWalkthroughStep[] {
  return [...new Set(steps)].filter((step) => FIRST_RUN_WALKTHROUGH_STEPS.includes(step));
}

function stepsForAppliesTo(appliesTo: FirstRunWalkthroughAppliesTo): readonly FirstRunWalkthroughStep[] {
  return appliesTo === 'existing_user_overhaul_intro'
    ? EXISTING_USER_INTRO_STEPS
    : FIRST_RUN_WALKTHROUGH_STEPS;
}

function firstIncompleteStep(
  appliesTo: FirstRunWalkthroughAppliesTo,
  completedSteps: FirstRunWalkthroughStep[],
  skippedSteps: FirstRunWalkthroughStep[] = [],
): FirstRunWalkthroughStep | null {
  const completed = new Set(completedSteps);
  const skipped = new Set(skippedSteps);
  return stepsForAppliesTo(appliesTo).find((step) => !completed.has(step) && !skipped.has(step)) ?? null;
}

function canResume(state: Pick<FirstRunWalkthroughState, 'status' | 'currentStep'>): boolean {
  return state.currentStep != null && (
    state.status === 'not_started'
    || state.status === 'in_progress'
    || state.status === 'skipped'
    || state.status === 'needs_update'
  );
}

function completedStepsFromEvidence(evidence: FirstRunWalkthroughEvidence): FirstRunWalkthroughStep[] {
  const steps: FirstRunWalkthroughStep[] = [];

  if (evidence.hasCompletedJourneySetup) steps.push('journey_setup');
  if (evidence.hasCompletedProtectedWorkoutSetup) steps.push('protected_workout_setup');
  if (evidence.hasCompletedFightContextSetup) steps.push('fight_context_setup');
  if (evidence.hasCompletedFuelingSetup) steps.push('fueling_setup');
  if (evidence.hasCompletedReadinessBaseline) steps.push('readiness_baseline');
  if (evidence.hasSeenTodayMissionIntro) steps.push('today_mission_intro');
  if (evidence.hasSeenAppTour) steps.push('app_tour');

  return uniqueSteps(steps);
}

function hasExistingUserSignals(evidence: FirstRunWalkthroughEvidence): boolean {
  return Boolean(
    evidence.hasProfile && (
      evidence.hasHistoricalTrainingData
      || evidence.hasHistoricalNutritionData
      || evidence.hasHistoricalReadinessData
      || evidence.hasHistoricalBodyMassData
      || evidence.hasHistoricalScheduleData
      || evidence.hasActiveBuildGoal
      || evidence.hasActiveFightCamp
      || evidence.hasActiveWeightClassPlan
      || evidence.hasCompletedJourneySetup
      || evidence.hasCompletedProtectedWorkoutSetup
    ),
  );
}

export function detectExistingUserNeedsOverhaulIntro(evidence: FirstRunWalkthroughEvidence): boolean {
  const requiredVersion = evidence.requiredVersion ?? CURRENT_FIRST_RUN_WALKTHROUGH_VERSION;
  const existing = evidence.existingState;

  if (!hasExistingUserSignals(evidence)) {
    return false;
  }

  if (!existing) {
    return true;
  }

  if (existing.walkthroughVersion < requiredVersion) {
    return true;
  }

  return existing.appliesTo === 'existing_user_overhaul_intro'
    && existing.status !== 'completed'
    && existing.status !== 'dismissed';
}

export function determineFirstRunWalkthroughAppliesTo(
  evidence: FirstRunWalkthroughEvidence,
): FirstRunWalkthroughAppliesTo {
  if (detectExistingUserNeedsOverhaulIntro(evidence)) {
    return 'existing_user_overhaul_intro';
  }

  if (!evidence.hasProfile && evidence.source === 'auth_sign_in') {
    return 'first_sign_in';
  }

  return evidence.hasProfile ? 'first_sign_in' : 'new_signup';
}

export function createFirstRunWalkthroughState(input: {
  userId: string;
  athleteId?: string | null;
  appliesTo: FirstRunWalkthroughAppliesTo;
  source?: FirstRunWalkthroughSource;
  walkthroughVersion?: number;
  now?: string;
  completedSteps?: FirstRunWalkthroughStep[];
  skippedSteps?: FirstRunWalkthroughStep[];
  explanations?: FirstRunWalkthroughExplanation[];
}): FirstRunWalkthroughState {
  const completedSteps = uniqueSteps(input.completedSteps ?? []);
  const skippedSteps = uniqueSteps(input.skippedSteps ?? []);
  const currentStep = firstIncompleteStep(input.appliesTo, completedSteps, skippedSteps);
  const status: FirstRunWalkthroughStatus = currentStep ? 'not_started' : 'completed';
  const timestamp = nowIso(input.now);

  return {
    userId: input.userId,
    athleteId: input.athleteId ?? input.userId,
    status,
    currentStep,
    completedSteps,
    skippedSteps,
    startedAt: null,
    completedAt: status === 'completed' ? timestamp : null,
    lastSeenAt: null,
    walkthroughVersion: input.walkthroughVersion ?? CURRENT_FIRST_RUN_WALKTHROUGH_VERSION,
    appliesTo: input.appliesTo,
    isNewUser: input.appliesTo === 'new_signup' || input.appliesTo === 'first_sign_in',
    isExistingUserMigration: input.appliesTo === 'existing_user_overhaul_intro',
    hasSeenTodayMissionIntro: completedSteps.includes('today_mission_intro'),
    hasSeenAppTour: completedSteps.includes('app_tour'),
    hasCompletedJourneySetup: completedSteps.includes('journey_setup'),
    hasCompletedProtectedWorkoutSetup: completedSteps.includes('protected_workout_setup'),
    hasCompletedFightContextSetup: completedSteps.includes('fight_context_setup'),
    hasCompletedFuelingSetup: completedSteps.includes('fueling_setup'),
    hasCompletedReadinessBaseline: completedSteps.includes('readiness_baseline'),
    canResume: currentStep !== null,
    source: input.source ?? 'app_entry',
    explanations: input.explanations ?? [],
  };
}

function withDerivedFlags(state: FirstRunWalkthroughState): FirstRunWalkthroughState {
  const completedSteps = uniqueSteps(state.completedSteps);
  const skippedSteps = uniqueSteps(state.skippedSteps);
  const currentStep = state.status === 'completed' || state.status === 'dismissed'
    ? null
    : state.currentStep ?? firstIncompleteStep(state.appliesTo, completedSteps, skippedSteps);

  return {
    ...state,
    currentStep,
    completedSteps,
    skippedSteps,
    isNewUser: state.appliesTo === 'new_signup' || state.appliesTo === 'first_sign_in',
    isExistingUserMigration: state.appliesTo === 'existing_user_overhaul_intro',
    hasSeenTodayMissionIntro: completedSteps.includes('today_mission_intro'),
    hasSeenAppTour: completedSteps.includes('app_tour'),
    hasCompletedJourneySetup: completedSteps.includes('journey_setup'),
    hasCompletedProtectedWorkoutSetup: completedSteps.includes('protected_workout_setup'),
    hasCompletedFightContextSetup: completedSteps.includes('fight_context_setup'),
    hasCompletedFuelingSetup: completedSteps.includes('fueling_setup'),
    hasCompletedReadinessBaseline: completedSteps.includes('readiness_baseline'),
    canResume: canResume({ status: state.status, currentStep }),
  };
}

export function resolveFirstRunWalkthroughState(
  evidence: FirstRunWalkthroughEvidence,
): FirstRunWalkthroughResolution {
  const requiredVersion = evidence.requiredVersion ?? CURRENT_FIRST_RUN_WALKTHROUGH_VERSION;
  const appliesTo = determineFirstRunWalkthroughAppliesTo(evidence);
  const explanations: FirstRunWalkthroughExplanation[] = [];

  const existing = evidence.existingState;
  if (existing && existing.walkthroughVersion >= requiredVersion) {
    const state = withDerivedFlags({
      ...existing,
      lastSeenAt: existing.lastSeenAt,
    });

    explanations.push({
      code: state.status === 'completed' || state.status === 'dismissed'
        ? 'walkthrough_already_resolved'
        : 'walkthrough_can_continue',
      message: state.status === 'completed' || state.status === 'dismissed'
        ? 'The current walkthrough version is already resolved and should not repeat.'
        : 'The current walkthrough can continue while preserving athlete journey state.',
    });

    return {
      needsWalkthrough: state.status !== 'completed' && state.status !== 'dismissed',
      appliesTo: state.appliesTo,
      state,
      explanations,
    };
  }

  const completedSteps = completedStepsFromEvidence(evidence);
  const isUpdate = Boolean(existing && existing.walkthroughVersion < requiredVersion);
  const state = createFirstRunWalkthroughState({
    userId: evidence.userId,
    athleteId: evidence.athleteId,
    appliesTo,
    source: evidence.source,
    walkthroughVersion: requiredVersion,
    now: evidence.now,
    completedSteps,
    explanations,
  });

  const resolvedState = withDerivedFlags({
    ...state,
    status: isUpdate ? 'needs_update' : state.status,
    startedAt: existing?.startedAt ?? state.startedAt,
    lastSeenAt: existing?.lastSeenAt ?? state.lastSeenAt,
  });

  explanations.push({
    code: isUpdate ? 'walkthrough_version_update' : 'walkthrough_required',
    message: isUpdate
      ? 'A newer first-run walkthrough version should be introduced while preserving existing athlete context.'
      : 'First-run walkthrough state should guide the UX while canonical athlete data remains in AthleteJourneyState and PerformanceState.',
  });

  if (!evidence.hasProfile) {
    explanations.push({
      code: 'missing_profile_unknown_baseline',
      message: 'The athlete profile is missing, so setup context is unknown rather than assumed safe.',
    });
  }

  if (appliesTo === 'existing_user_overhaul_intro') {
    explanations.push({
      code: 'existing_user_preserve_context',
      message: 'Existing users should see the guided journey intro while preserving onboarding, phase, and performance state.',
    });
  }

  return {
    needsWalkthrough: resolvedState.status !== 'completed' && resolvedState.status !== 'dismissed',
    appliesTo,
    state: {
      ...resolvedState,
      explanations,
    },
    explanations,
  };
}

export function markFirstRunWalkthroughStepCompleted(input: {
  state: FirstRunWalkthroughState;
  step: FirstRunWalkthroughStep;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);
  const completedSteps = uniqueSteps([...input.state.completedSteps, input.step]);
  const skippedSteps = input.state.skippedSteps.filter((step) => step !== input.step);
  const currentStep = firstIncompleteStep(input.state.appliesTo, completedSteps, skippedSteps);

  return withDerivedFlags({
    ...input.state,
    status: currentStep ? 'in_progress' : 'completed',
    currentStep,
    completedSteps,
    skippedSteps,
    startedAt: input.state.startedAt ?? timestamp,
    completedAt: currentStep ? input.state.completedAt : timestamp,
    lastSeenAt: timestamp,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_step_completed',
        message: `${input.step} was completed for UX guidance only; athlete journey state was preserved.`,
      },
    ],
  });
}

export function skipFirstRunWalkthroughStep(input: {
  state: FirstRunWalkthroughState;
  step: FirstRunWalkthroughStep;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);
  const skippedSteps = uniqueSteps([...input.state.skippedSteps, input.step]);
  const currentStep = firstIncompleteStep(input.state.appliesTo, input.state.completedSteps, skippedSteps);

  return withDerivedFlags({
    ...input.state,
    status: currentStep ? 'skipped' : 'dismissed',
    currentStep,
    skippedSteps,
    startedAt: input.state.startedAt ?? timestamp,
    completedAt: input.state.completedAt,
    lastSeenAt: timestamp,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_step_skipped',
        message: `${input.step} was skipped; Athleticore should keep safe defaults and guide the athlete later.`,
      },
    ],
  });
}

export function resumeFirstRunWalkthrough(input: {
  state: FirstRunWalkthroughState;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);
  const currentStep = input.state.currentStep
    ?? firstIncompleteStep(input.state.appliesTo, input.state.completedSteps, input.state.skippedSteps);

  return withDerivedFlags({
    ...input.state,
    status: currentStep ? 'in_progress' : 'completed',
    currentStep,
    startedAt: input.state.startedAt ?? timestamp,
    completedAt: currentStep ? input.state.completedAt : timestamp,
    lastSeenAt: timestamp,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_resumed',
        message: 'The walkthrough resumed from saved UX state without changing canonical athlete data.',
      },
    ],
  });
}

export function pauseFirstRunWalkthrough(input: {
  state: FirstRunWalkthroughState;
  currentStep?: FirstRunWalkthroughStep;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);
  const currentStep = input.currentStep
    ?? input.state.currentStep
    ?? firstIncompleteStep(input.state.appliesTo, input.state.completedSteps, input.state.skippedSteps);

  return withDerivedFlags({
    ...input.state,
    status: currentStep ? 'skipped' : input.state.status,
    currentStep,
    startedAt: input.state.startedAt ?? timestamp,
    lastSeenAt: timestamp,
    canResume: currentStep !== null,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_paused',
        message: 'The walkthrough was paused and can resume later without blocking primary app actions.',
      },
    ],
  });
}

export function completeFirstRunWalkthrough(input: {
  state: FirstRunWalkthroughState;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);

  return withDerivedFlags({
    ...input.state,
    status: 'completed',
    currentStep: null,
    completedAt: input.state.completedAt ?? timestamp,
    lastSeenAt: timestamp,
    canResume: false,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_completed',
        message: 'First-run walkthrough completion was recorded as UX state only.',
      },
    ],
  });
}

export async function completeFirstRunWalkthroughWithRepository(input: {
  state: FirstRunWalkthroughState;
  repository: FirstRunWalkthroughStateRepository;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const completed = completeFirstRunWalkthrough({
    state: input.state,
    now: input.now,
  });

  return input.repository.save(completed);
}

export function dismissFirstRunWalkthrough(input: {
  state: FirstRunWalkthroughState;
  now?: string;
}): FirstRunWalkthroughState {
  const timestamp = nowIso(input.now);

  return withDerivedFlags({
    ...input.state,
    status: 'dismissed',
    currentStep: null,
    lastSeenAt: timestamp,
    canResume: false,
    explanations: [
      ...input.state.explanations,
      {
        code: 'walkthrough_dismissed',
        message: 'The walkthrough was dismissed; Athleticore should continue safe guidance through Today and contextual prompts.',
      },
    ],
  });
}

export function verifyFirstRunWalkthroughDoesNotResetAthleteJourneyState(input: {
  beforeJourney: AthleteJourneyState | null;
  afterJourney: AthleteJourneyState | null;
  beforePerformanceState: PerformanceState | null;
  afterPerformanceState: PerformanceState | null;
}): WalkthroughContinuityCheck {
  const beforeJourneyId = input.beforeJourney?.journeyId ?? null;
  const afterJourneyId = input.afterJourney?.journeyId ?? null;
  const beforePerformanceJourneyId = input.beforePerformanceState?.journey?.journeyId ?? null;
  const afterPerformanceJourneyId = input.afterPerformanceState?.journey?.journeyId ?? null;
  const journeyPreserved = beforeJourneyId !== null && beforeJourneyId === afterJourneyId;
  const performanceStatePreserved = beforePerformanceJourneyId !== null
    && beforePerformanceJourneyId === afterPerformanceJourneyId;
  const explanations: FirstRunWalkthroughExplanation[] = [];

  explanations.push({
    code: journeyPreserved ? 'journey_preserved' : 'journey_changed',
    message: journeyPreserved
      ? 'AthleteJourneyState identity was preserved across walkthrough state changes.'
      : 'AthleteJourneyState identity changed; walkthrough logic must preserve the athlete journey.',
  });
  explanations.push({
    code: performanceStatePreserved ? 'performance_state_preserved' : 'performance_state_changed',
    message: performanceStatePreserved
      ? 'PerformanceState remains attached to the same athlete journey.'
      : 'PerformanceState changed journey identity; walkthrough logic must stay UX-only.',
  });

  return {
    journeyPreserved,
    performanceStatePreserved,
    explanations,
  };
}
