import { supabase } from '../supabase';
import {
  CURRENT_FIRST_RUN_WALKTHROUGH_VERSION,
  FIRST_RUN_WALKTHROUGH_KEY,
  completeFirstRunWalkthrough,
  createFirstRunWalkthroughState,
  determineFirstRunWalkthroughAppliesTo,
  dismissFirstRunWalkthrough,
  markFirstRunWalkthroughStepCompleted,
  pauseFirstRunWalkthrough,
  resolveFirstRunWalkthroughState,
  resumeFirstRunWalkthrough,
  skipFirstRunWalkthroughStep,
  type FirstRunWalkthroughAppliesTo,
  type FirstRunWalkthroughEvidence,
  type FirstRunWalkthroughExplanation,
  type FirstRunWalkthroughSource,
  type FirstRunWalkthroughState,
  type FirstRunWalkthroughStatus,
  type FirstRunWalkthroughStep,
} from '../performance-engine/app-flow/firstRunWalkthroughState.ts';
import { getActiveBuildPhaseGoal } from './buildPhaseService';
import { getActiveFightCamp } from './fightCampService';
import { getRecurringActivities } from './scheduleService';
import { getWeeklyPlanConfig } from './weeklyPlanService';

export {
  CURRENT_FIRST_RUN_WALKTHROUGH_VERSION,
  FIRST_RUN_WALKTHROUGH_KEY,
  completeFirstRunWalkthrough,
  createFirstRunWalkthroughState,
  determineFirstRunWalkthroughAppliesTo,
  dismissFirstRunWalkthrough,
  markFirstRunWalkthroughStepCompleted,
  pauseFirstRunWalkthrough,
  resolveFirstRunWalkthroughState,
  resumeFirstRunWalkthrough,
  skipFirstRunWalkthroughStep,
  type FirstRunWalkthroughAppliesTo,
  type FirstRunWalkthroughEvidence,
  type FirstRunWalkthroughExplanation,
  type FirstRunWalkthroughSource,
  type FirstRunWalkthroughState,
  type FirstRunWalkthroughStatus,
  type FirstRunWalkthroughStep,
};

interface WalkthroughStateRow {
  user_id: string;
  athlete_id: string | null;
  walkthrough_key: string;
  status: string;
  current_step: string | null;
  completed_steps: string[] | null;
  skipped_steps: string[] | null;
  started_at: string | null;
  completed_at: string | null;
  last_seen_at: string | null;
  walkthrough_version: number | null;
  applies_to: string;
  is_new_user: boolean | null;
  is_existing_user_migration: boolean | null;
  has_seen_today_mission_intro: boolean | null;
  has_seen_app_tour: boolean | null;
  has_completed_journey_setup: boolean | null;
  has_completed_protected_workout_setup: boolean | null;
  has_completed_fight_context_setup: boolean | null;
  has_completed_fueling_setup: boolean | null;
  has_completed_readiness_baseline: boolean | null;
  can_resume: boolean | null;
  source: string | null;
  explanations: FirstRunWalkthroughExplanation[] | null;
}

interface AthleteProfileWalkthroughRow {
  user_id: string;
  first_run_guidance_status?: string | null;
  first_run_guidance_intro_seen_at?: string | null;
  planning_setup_version?: number | null;
  athlete_goal_mode?: string | null;
  performance_goal_type?: string | null;
  fight_date?: string | null;
  target_weight?: number | null;
  base_weight?: number | null;
}

function isWalkthroughStatus(value: string): value is FirstRunWalkthroughStatus {
  return ['not_started', 'in_progress', 'completed', 'skipped', 'dismissed', 'needs_update'].includes(value);
}

function isWalkthroughStep(value: string): value is FirstRunWalkthroughStep {
  return [
    'welcome',
    'journey_setup',
    'protected_workout_setup',
    'fight_context_setup',
    'fueling_setup',
    'readiness_baseline',
    'today_mission_intro',
    'app_tour',
  ].includes(value);
}

function isWalkthroughAppliesTo(value: string): value is FirstRunWalkthroughAppliesTo {
  return ['new_signup', 'first_sign_in', 'existing_user_overhaul_intro'].includes(value);
}

function isWalkthroughSource(value: string): value is FirstRunWalkthroughSource {
  return ['auth_signup', 'auth_sign_in', 'app_entry', 'onboarding', 'existing_user_migration', 'manual'].includes(value);
}

function stepsFromRow(value: string[] | null): FirstRunWalkthroughStep[] {
  return (value ?? []).filter(isWalkthroughStep);
}

export function deserializeFirstRunWalkthroughState(row: WalkthroughStateRow): FirstRunWalkthroughState {
  const appliesTo = isWalkthroughAppliesTo(row.applies_to) ? row.applies_to : 'first_sign_in';
  const completedSteps = stepsFromRow(row.completed_steps);

  return {
    userId: row.user_id,
    athleteId: row.athlete_id ?? row.user_id,
    status: isWalkthroughStatus(row.status) ? row.status : 'not_started',
    currentStep: row.current_step && isWalkthroughStep(row.current_step) ? row.current_step : null,
    completedSteps,
    skippedSteps: stepsFromRow(row.skipped_steps),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastSeenAt: row.last_seen_at,
    walkthroughVersion: row.walkthrough_version ?? CURRENT_FIRST_RUN_WALKTHROUGH_VERSION,
    appliesTo,
    isNewUser: row.is_new_user ?? (appliesTo === 'new_signup' || appliesTo === 'first_sign_in'),
    isExistingUserMigration: row.is_existing_user_migration ?? appliesTo === 'existing_user_overhaul_intro',
    hasSeenTodayMissionIntro: row.has_seen_today_mission_intro ?? completedSteps.includes('today_mission_intro'),
    hasSeenAppTour: row.has_seen_app_tour ?? completedSteps.includes('app_tour'),
    hasCompletedJourneySetup: row.has_completed_journey_setup ?? completedSteps.includes('journey_setup'),
    hasCompletedProtectedWorkoutSetup: row.has_completed_protected_workout_setup ?? completedSteps.includes('protected_workout_setup'),
    hasCompletedFightContextSetup: row.has_completed_fight_context_setup ?? completedSteps.includes('fight_context_setup'),
    hasCompletedFuelingSetup: row.has_completed_fueling_setup ?? completedSteps.includes('fueling_setup'),
    hasCompletedReadinessBaseline: row.has_completed_readiness_baseline ?? completedSteps.includes('readiness_baseline'),
    canResume: row.can_resume ?? true,
    source: row.source && isWalkthroughSource(row.source) ? row.source : 'app_entry',
    explanations: row.explanations ?? [],
  };
}

export function serializeFirstRunWalkthroughState(state: FirstRunWalkthroughState): Record<string, unknown> {
  return {
    user_id: state.userId,
    athlete_id: state.athleteId,
    walkthrough_key: FIRST_RUN_WALKTHROUGH_KEY,
    status: state.status,
    current_step: state.currentStep,
    completed_steps: state.completedSteps,
    skipped_steps: state.skippedSteps,
    started_at: state.startedAt,
    completed_at: state.completedAt,
    last_seen_at: state.lastSeenAt,
    walkthrough_version: state.walkthroughVersion,
    applies_to: state.appliesTo,
    is_new_user: state.isNewUser,
    is_existing_user_migration: state.isExistingUserMigration,
    has_seen_today_mission_intro: state.hasSeenTodayMissionIntro,
    has_seen_app_tour: state.hasSeenAppTour,
    has_completed_journey_setup: state.hasCompletedJourneySetup,
    has_completed_protected_workout_setup: state.hasCompletedProtectedWorkoutSetup,
    has_completed_fight_context_setup: state.hasCompletedFightContextSetup,
    has_completed_fueling_setup: state.hasCompletedFuelingSetup,
    has_completed_readiness_baseline: state.hasCompletedReadinessBaseline,
    can_resume: state.canResume,
    source: state.source,
    explanations: state.explanations,
    updated_at: new Date().toISOString(),
  };
}

async function countRows(table: 'daily_checkins' | 'training_sessions' | 'food_log' | 'macro_ledger' | 'scheduled_activities', userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .limit(1);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getPersistedFirstRunWalkthroughState(userId: string): Promise<FirstRunWalkthroughState | null> {
  const { data, error } = await supabase
    .from('user_walkthrough_state')
    .select('*')
    .eq('user_id', userId)
    .eq('walkthrough_key', FIRST_RUN_WALKTHROUGH_KEY)
    .maybeSingle();

  if (error) throw error;
  return data ? deserializeFirstRunWalkthroughState(data as WalkthroughStateRow) : null;
}

export async function persistFirstRunWalkthroughState(state: FirstRunWalkthroughState): Promise<FirstRunWalkthroughState> {
  const { data, error } = await supabase
    .from('user_walkthrough_state')
    .upsert(serializeFirstRunWalkthroughState(state), {
      onConflict: 'user_id,walkthrough_key',
    })
    .select('*')
    .single();

  if (error) throw error;
  return deserializeFirstRunWalkthroughState(data as WalkthroughStateRow);
}

export async function buildFirstRunWalkthroughEvidence(input: {
  userId: string;
  source?: FirstRunWalkthroughSource;
  requiredVersion?: number;
}): Promise<FirstRunWalkthroughEvidence> {
  const { userId } = input;
  const [profileResult, existingState] = await Promise.all([
    supabase
      .from('athlete_profiles')
      .select('user_id, first_run_guidance_status, first_run_guidance_intro_seen_at, planning_setup_version, athlete_goal_mode, performance_goal_type, fight_date, target_weight, base_weight')
      .eq('user_id', userId)
      .maybeSingle(),
    getPersistedFirstRunWalkthroughState(userId).catch(() => null),
  ]);

  if (profileResult.error) throw profileResult.error;

  const profile = (profileResult.data as AthleteProfileWalkthroughRow | null) ?? null;
  const [
    config,
    activeBuildGoal,
    activeFightCamp,
    recurringActivities,
    hasHistoricalTrainingData,
    hasHistoricalNutritionData,
    hasHistoricalReadinessData,
    hasMacroLedgerData,
    hasHistoricalScheduleData,
  ] = await Promise.all([
    getWeeklyPlanConfig(userId).catch(() => null),
    getActiveBuildPhaseGoal(userId).catch(() => null),
    getActiveFightCamp(userId).catch(() => null),
    getRecurringActivities(userId).catch(() => []),
    countRows('training_sessions', userId).catch(() => false),
    countRows('food_log', userId).catch(() => false),
    countRows('daily_checkins', userId).catch(() => false),
    countRows('macro_ledger', userId).catch(() => false),
    countRows('scheduled_activities', userId).catch(() => false),
  ]);
  const protectedWorkoutCount = recurringActivities.filter((activity) => (
    activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring'
  )).length;
  const hasAvailability = Boolean(config?.available_days?.length || config?.availability_windows?.length);

  return {
    userId,
    athleteId: profile?.user_id ?? userId,
    hasProfile: Boolean(profile),
    hasCompletedJourneySetup: Boolean(profile && hasAvailability && (activeBuildGoal || activeFightCamp)),
    hasCompletedProtectedWorkoutSetup: protectedWorkoutCount > 0,
    hasCompletedFightContextSetup: Boolean(activeFightCamp || profile?.fight_date),
    hasCompletedFuelingSetup: Boolean(profile?.target_weight != null || hasHistoricalNutritionData || hasMacroLedgerData),
    hasCompletedReadinessBaseline: hasHistoricalReadinessData,
    hasSeenTodayMissionIntro: Boolean(existingState?.hasSeenTodayMissionIntro || profile?.first_run_guidance_intro_seen_at),
    hasSeenAppTour: Boolean(existingState?.hasSeenAppTour),
    hasHistoricalTrainingData,
    hasHistoricalNutritionData: hasHistoricalNutritionData || hasMacroLedgerData,
    hasHistoricalReadinessData,
    hasHistoricalBodyMassData: Boolean(profile?.base_weight != null),
    hasHistoricalScheduleData: hasHistoricalScheduleData || protectedWorkoutCount > 0,
    hasActiveBuildGoal: Boolean(activeBuildGoal),
    hasActiveFightCamp: Boolean(activeFightCamp),
    hasActiveWeightClassPlan: Boolean(profile?.target_weight != null),
    existingState,
    source: input.source ?? 'app_entry',
    requiredVersion: input.requiredVersion ?? CURRENT_FIRST_RUN_WALKTHROUGH_VERSION,
  };
}

export async function getFirstRunWalkthroughStateForUser(input: {
  userId: string;
  source?: FirstRunWalkthroughSource;
  requiredVersion?: number;
}): Promise<FirstRunWalkthroughState> {
  const evidence = await buildFirstRunWalkthroughEvidence(input);
  const resolution = resolveFirstRunWalkthroughState(evidence);
  return resolution.state;
}

export async function ensureFirstRunWalkthroughState(input: {
  userId: string;
  source?: FirstRunWalkthroughSource;
  requiredVersion?: number;
}): Promise<FirstRunWalkthroughState> {
  const state = await getFirstRunWalkthroughStateForUser(input);
  return persistFirstRunWalkthroughState(state);
}

export async function completeAndPersistFirstRunWalkthroughStep(input: {
  userId: string;
  step: FirstRunWalkthroughStep;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(markFirstRunWalkthroughStepCompleted({
    state,
    step: input.step,
    now: input.now,
  }));
}

export async function skipAndPersistFirstRunWalkthroughStep(input: {
  userId: string;
  step: FirstRunWalkthroughStep;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(skipFirstRunWalkthroughStep({
    state,
    step: input.step,
    now: input.now,
  }));
}

export async function resumeAndPersistFirstRunWalkthrough(input: {
  userId: string;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(resumeFirstRunWalkthrough({
    state,
    now: input.now,
  }));
}

export async function pauseAndPersistFirstRunWalkthrough(input: {
  userId: string;
  currentStep?: FirstRunWalkthroughStep;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(pauseFirstRunWalkthrough({
    state,
    currentStep: input.currentStep,
    now: input.now,
  }));
}

export async function completeAndPersistFirstRunWalkthrough(input: {
  userId: string;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(completeFirstRunWalkthrough({
    state,
    now: input.now,
  }));
}

export async function dismissAndPersistFirstRunWalkthrough(input: {
  userId: string;
  now?: string;
}): Promise<FirstRunWalkthroughState> {
  const state = await ensureFirstRunWalkthroughState({ userId: input.userId });
  return persistFirstRunWalkthroughState(dismissFirstRunWalkthrough({
    state,
    now: input.now,
  }));
}
