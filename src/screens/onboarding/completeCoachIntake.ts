import { supabase } from '../../../lib/supabase';
import { getDefaultGymProfile } from '../../../lib/api/gymProfileService';
import { getActiveUserId } from '../../../lib/api/athleteContextService';
import { setupBuildPhaseGoal } from '../../../lib/api/buildPhaseService';
import { setupFightCamp } from '../../../lib/api/fightCampService';
import { invalidateEngineDataCache } from '../../../lib/api/dailyPerformanceService';
import {
  completeFirstRunWalkthrough,
  createFirstRunWalkthroughState,
  markFirstRunWalkthroughStepCompleted,
  persistFirstRunWalkthroughState,
  skipFirstRunWalkthroughStep,
  type FirstRunWalkthroughState,
} from '../../../lib/api/firstRunWalkthroughService';
import { replaceRecurringActivities } from '../../../lib/api/scheduleService';
import { saveWeeklyPlanConfig } from '../../../lib/api/weeklyPlanService';
import {
  initializeJourneyFromOnboarding,
  type AthleteJourneyState,
  type PerformanceState,
} from '../../../lib/performance-engine';
import type {
  ActivityLevel,
  AthleteGoalMode,
  BuildPhaseGoalType,
  TrainingAge,
} from '../../../lib/engine/types';
import { todayLocalDate } from '../../../lib/utils/date';
import { logWarn } from '../../../lib/utils/logger';
import { generateAndSaveWeeklyPlan } from '../../hooks/useWeeklyPlan';
import { createBuildPhaseRecommendation, sortDays } from '../weeklyPlanSetup/utils';
import { DEFAULT_WINDOW } from '../weeklyPlanSetup/constants';

export type IntakeTrainingBackground = 'new' | 'some' | 'advanced';
export type IntakeFixedSessionType = 'boxing_practice' | 'sparring' | 'conditioning' | 'sc' | 'other';
export type IntakeTrainingStatus = 'new_rhythm' | 'inconsistent' | 'consistent' | 'returning';
export type IntakeJourneyState = 'building' | 'in_camp' | 'fight_coming' | 'recovering' | 'not_sure';
export type IntakeFightStatus = 'none' | 'tentative' | 'confirmed';
export type IntakeFuelingPreference = 'simple' | 'detailed' | 'later';
export type IntakePainConcern = 'none' | 'some' | 'unknown';

export type IntakeReadinessBaseline = {
  sleepQuality: number | null;
  recovery: number | null;
  soreness: number | null;
  fatigue: number | null;
  painConcern: IntakePainConcern;
  injuryNotes: string | null;
};

export type IntakeFixedSession = {
  id: string;
  activityType: IntakeFixedSessionType;
  dayOfWeek: number;
  startTime: string;
  durationMin: number;
  expectedIntensity: number;
  label: string;
};

export type CoachIntakeInput = {
  age: number | null;
  currentWeightLbs: number | null;
  biologicalSex: 'male' | 'female';
  trainingBackground: IntakeTrainingBackground;
  sport: 'boxing';
  currentTrainingStatus: IntakeTrainingStatus;
  journeyState: IntakeJourneyState;
  fightStatus: IntakeFightStatus;
  goalMode: AthleteGoalMode;
  buildGoalType: BuildPhaseGoalType;
  fightDate: string | null;
  weighInDate: string | null;
  weighInTime: string | null;
  targetWeightClassName: string | null;
  opponentName: string | null;
  eventName: string | null;
  targetWeightLbs: number | null;
  availableDays: number[];
  fixedSessions: IntakeFixedSession[];
  dietaryNotes: string[];
  fuelingPreference: IntakeFuelingPreference;
  readinessBaseline: IntakeReadinessBaseline;
};

export type CoachIntakeResult = {
  generatedPlan: boolean;
  journey: AthleteJourneyState;
  performanceState: PerformanceState;
};

function resolveTrainingBackground(background: IntakeTrainingBackground): {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  trainingAge: TrainingAge;
} {
  switch (background) {
    case 'advanced':
      return { fitnessLevel: 'advanced', trainingAge: 'advanced' };
    case 'some':
      return { fitnessLevel: 'intermediate', trainingAge: 'intermediate' };
    case 'new':
    default:
      return { fitnessLevel: 'beginner', trainingAge: 'novice' };
  }
}

function deriveActivityLevel(dayCount: number): ActivityLevel {
  if (dayCount <= 2) return 'light';
  if (dayCount <= 4) return 'moderate';
  if (dayCount <= 5) return 'very_active';
  return 'extra_active';
}

function deriveNutritionGoal(input: CoachIntakeInput): 'maintain' | 'cut' | 'bulk' | 'unknown' {
  if (input.targetWeightLbs == null || input.currentWeightLbs == null) return 'unknown';
  if (input.targetWeightLbs < input.currentWeightLbs - 1) return 'cut';
  if (input.targetWeightLbs > input.currentWeightLbs + 1) return 'bulk';
  return 'maintain';
}

function profileNutritionGoal(goal: ReturnType<typeof deriveNutritionGoal>): 'maintain' | 'cut' | 'bulk' | null {
  return goal === 'unknown' ? null : goal;
}

function assertValidTime(value: string): void {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error('Fixed sessions need a start time like 18:30.');
  }
}

async function ensureCurrentUserMirror(): Promise<void> {
  const { error } = await supabase.rpc('ensure_current_user');
  if (error) {
    throw error;
  }
}

function hasReadinessBaseline(input: IntakeReadinessBaseline): boolean {
  return input.sleepQuality != null
    || input.recovery != null
    || input.soreness != null
    || input.fatigue != null
    || input.painConcern !== 'unknown'
    || Boolean(input.injuryNotes?.trim());
}

function buildLimitationNotes(input: CoachIntakeInput): string[] {
  const notes: string[] = [];
  if (input.currentTrainingStatus === 'returning') {
    notes.push('Athlete is returning to training rhythm.');
  }
  if (input.journeyState === 'recovering') {
    notes.push('Athlete is currently prioritizing recovery.');
  }
  if (input.readinessBaseline.painConcern === 'some') {
    notes.push('Pain or injury concern reported during first-run setup.');
  }
  if (input.readinessBaseline.injuryNotes?.trim()) {
    notes.push(input.readinessBaseline.injuryNotes.trim());
  }
  return notes;
}

async function saveReadinessBaseline(userId: string, input: IntakeReadinessBaseline, date: string): Promise<void> {
  if (!hasReadinessBaseline(input)) return;

  const painLevel = input.painConcern === 'some'
    ? 3
    : input.painConcern === 'none'
      ? 1
      : null;
  const energyLevel = input.fatigue == null ? null : Math.max(1, Math.min(5, 6 - input.fatigue));

  const { error } = await supabase
    .from('daily_checkins')
    .upsert(
      {
        user_id: userId,
        date,
        sleep_quality: input.sleepQuality,
        readiness: input.recovery,
        soreness_level: input.soreness,
        energy_level: energyLevel,
        pain_level: painLevel,
        checkin_version: 2,
      },
      { onConflict: 'user_id,date' },
    );

  if (error) throw error;
}

function buildCompletedWalkthroughState(input: {
  userId: string;
  athleteId: string;
  capturedAt: string;
  intake: CoachIntakeInput;
}): FirstRunWalkthroughState {
  const { userId, athleteId, capturedAt, intake } = input;
  let state = createFirstRunWalkthroughState({
    userId,
    athleteId,
    appliesTo: 'new_signup',
    source: 'onboarding',
    now: capturedAt,
  });

  state = markFirstRunWalkthroughStepCompleted({ state, step: 'welcome', now: capturedAt });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'journey_setup', now: capturedAt });

  state = intake.fixedSessions.length > 0
    ? markFirstRunWalkthroughStepCompleted({ state, step: 'protected_workout_setup', now: capturedAt })
    : skipFirstRunWalkthroughStep({ state, step: 'protected_workout_setup', now: capturedAt });

  state = intake.fightStatus !== 'none'
    ? markFirstRunWalkthroughStepCompleted({ state, step: 'fight_context_setup', now: capturedAt })
    : skipFirstRunWalkthroughStep({ state, step: 'fight_context_setup', now: capturedAt });

  state = intake.fuelingPreference === 'later' && intake.dietaryNotes.length === 0
    ? skipFirstRunWalkthroughStep({ state, step: 'fueling_setup', now: capturedAt })
    : markFirstRunWalkthroughStepCompleted({ state, step: 'fueling_setup', now: capturedAt });

  state = hasReadinessBaseline(intake.readinessBaseline)
    ? markFirstRunWalkthroughStepCompleted({ state, step: 'readiness_baseline', now: capturedAt })
    : skipFirstRunWalkthroughStep({ state, step: 'readiness_baseline', now: capturedAt });

  state = markFirstRunWalkthroughStepCompleted({ state, step: 'today_mission_intro', now: capturedAt });
  return completeFirstRunWalkthrough({ state, now: capturedAt });
}

export async function completeCoachIntake(input: CoachIntakeInput): Promise<CoachIntakeResult> {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  await ensureCurrentUserMirror();

  const availableDays = sortDays(input.availableDays);
  if (availableDays.length === 0) {
    throw new Error('Choose at least one day you can train.');
  }

  if (input.goalMode === 'fight_camp' && !input.fightDate) {
    throw new Error('Fight Camp needs a fight date.');
  }

  input.fixedSessions.forEach((session) => assertValidTime(session.startTime));

  const { fitnessLevel, trainingAge } = resolveTrainingBackground(input.trainingBackground);
  const activityLevel = deriveActivityLevel(availableDays.length);
  const nutritionGoal = deriveNutritionGoal(input);
  const legacyNutritionGoal = profileNutritionGoal(nutritionGoal);
  const capturedAt = new Date().toISOString();
  const asOfDate = todayLocalDate();
  const journeyInitialization = initializeJourneyFromOnboarding({
    userId,
    capturedAt,
    asOfDate,
    age: input.age,
    currentWeightLbs: input.currentWeightLbs,
    biologicalSex: input.biologicalSex,
    trainingBackground: input.trainingBackground,
    goalMode: input.goalMode,
    buildGoalType: input.buildGoalType,
    fightDate: input.fightDate,
    targetWeightLbs: input.targetWeightLbs,
    availableDays,
    fixedSessions: input.fixedSessions,
    injuryOrLimitationNotes: buildLimitationNotes(input),
    nutritionPreferences: {
      goal: nutritionGoal,
      dietaryNotes: input.dietaryNotes,
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: true,
      nutrition: true,
      cycle: false,
    },
  });

  try {
    const { error: profileError } = await supabase
      .from('athlete_profiles')
      .upsert(
        {
          user_id: userId,
          biological_sex: input.biologicalSex,
          fight_status: 'amateur',
          phase: input.goalMode === 'fight_camp' ? 'fight-camp' : 'off-season',
          target_weight: input.targetWeightLbs,
          base_weight: input.currentWeightLbs,
          cycle_tracking: false,
          height_inches: null,
          age: input.age,
          activity_level: activityLevel,
          nutrition_goal: legacyNutritionGoal,
          athlete_goal_mode: input.goalMode,
          performance_goal_type: input.buildGoalType,
          planning_setup_version: 0,
          fight_date: input.fightStatus === 'none' ? null : input.fightDate,
          fitness_level: fitnessLevel,
          training_age: trainingAge,
          first_run_guidance_status: 'pending',
          first_run_guidance_intro_seen_at: null,
        },
        { onConflict: 'user_id' },
      );

    if (profileError) throw profileError;

    const config = await saveWeeklyPlanConfig(userId, {
      available_days: availableDays,
      availability_windows: availableDays.map((dayOfWeek) => ({ dayOfWeek, ...DEFAULT_WINDOW })),
      session_duration_min: 75,
      allow_two_a_days: false,
      two_a_day_days: [],
      am_session_type: 'sc',
      pm_session_type: 'boxing_practice',
      preferred_gym_profile_id: null,
      auto_deload_interval_weeks: 5,
    } as never);

    await replaceRecurringActivities(
      userId,
      input.fixedSessions.map((session) => ({
        activity_type: session.activityType,
        custom_label: session.label.trim() || (session.activityType === 'sparring' ? 'Sparring' : 'Fixed session'),
        start_time: `${session.startTime}:00`,
        estimated_duration_min: session.durationMin,
        expected_intensity: session.expectedIntensity,
        recurrence: {
          frequency: 'weekly' as const,
          interval: 1,
          days_of_week: [session.dayOfWeek],
        },
        session_kind: session.activityType,
        constraint_tier: 'mandatory',
      })),
    );

    await saveReadinessBaseline(userId, input.readinessBaseline, asOfDate);

    if (input.goalMode === 'fight_camp') {
      await setupFightCamp(userId, {
        goalMode: 'fight_camp',
        performanceGoalType: input.buildGoalType,
        fightDate: input.fightDate ?? undefined,
        fightOpportunityStatus: 'confirmed',
        weighInDate: input.weighInDate,
        weighInTime: input.weighInTime,
        targetWeightClassName: input.targetWeightClassName,
        opponentName: input.opponentName,
        eventName: input.eventName,
        weighInTiming: 'next_day',
        targetWeight: input.targetWeightLbs,
        roundCount: 3,
        roundDurationSec: 180,
        restDurationSec: 60,
        travelStartDate: null,
        travelEndDate: null,
      });
    } else {
      const recommendation = createBuildPhaseRecommendation(input.buildGoalType, input.targetWeightLbs);
      await setupBuildPhaseGoal(userId, {
        goalType: input.buildGoalType,
        goalLabel: null,
        goalStatement: recommendation.goalStatement,
        primaryOutcome: recommendation.goalStatement,
        secondaryConstraint: recommendation.secondaryConstraint,
        successWindow: null,
        targetMetric: recommendation.metric.value,
        targetValue: recommendation.targetValue,
        targetUnit: recommendation.metric.unit,
        targetDate: null,
        targetHorizonWeeks: recommendation.targetHorizonWeeks,
      });
    }

    try {
      await persistFirstRunWalkthroughState(buildCompletedWalkthroughState({
        userId,
        athleteId: journeyInitialization.athlete.athleteId,
        capturedAt,
        intake: input,
      }));
    } catch (walkthroughError) {
      logWarn('completeCoachIntake.persistFirstRunWalkthroughState', walkthroughError);
    }

    const gym = await getDefaultGymProfile(userId);
    if (!gym) {
      invalidateEngineDataCache({ userId });
      return {
        generatedPlan: false,
        journey: journeyInitialization.journey,
        performanceState: journeyInitialization.performanceState,
      };
    }

    const generatedWeek = await generateAndSaveWeeklyPlan(userId, config as never, gym, todayLocalDate());
    if (generatedWeek.entries.length === 0) {
      throw new Error('Your first week could not be built. Try choosing more training days.');
    }

    invalidateEngineDataCache({ userId });
    return {
      generatedPlan: true,
      journey: journeyInitialization.journey,
      performanceState: journeyInitialization.performanceState,
    };
  } catch (error) {
    await supabase
      .from('athlete_profiles')
      .update({ planning_setup_version: 0 })
      .eq('user_id', userId);
    throw error;
  }
}
