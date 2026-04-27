import { supabase } from '../../../lib/supabase';
import { getDefaultGymProfile } from '../../../lib/api/gymProfileService';
import { getActiveUserId } from '../../../lib/api/athleteContextService';
import { setupBuildPhaseGoal } from '../../../lib/api/buildPhaseService';
import { setupFightCamp } from '../../../lib/api/fightCampService';
import { invalidateEngineDataCache } from '../../../lib/api/dailyMissionService';
import { replaceRecurringActivities } from '../../../lib/api/scheduleService';
import { saveWeeklyPlanConfig } from '../../../lib/api/weeklyPlanService';
import type {
  ActivityLevel,
  AthleteGoalMode,
  BuildPhaseGoalType,
  TrainingAge,
} from '../../../lib/engine/types';
import { todayLocalDate } from '../../../lib/utils/date';
import { generateAndSaveWeeklyPlan } from '../../hooks/useWeeklyPlan';
import { createBuildPhaseRecommendation, sortDays } from '../weeklyPlanSetup/utils';
import { DEFAULT_WINDOW } from '../weeklyPlanSetup/constants';

export type IntakeTrainingBackground = 'new' | 'some' | 'advanced';
export type IntakeFixedSessionType = 'boxing_practice' | 'sparring';

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
  age: number;
  currentWeightLbs: number;
  biologicalSex: 'male' | 'female';
  trainingBackground: IntakeTrainingBackground;
  goalMode: AthleteGoalMode;
  buildGoalType: BuildPhaseGoalType;
  fightDate: string | null;
  targetWeightLbs: number | null;
  availableDays: number[];
  fixedSessions: IntakeFixedSession[];
};

export type CoachIntakeResult = {
  generatedPlan: boolean;
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

function deriveNutritionGoal(input: CoachIntakeInput): 'maintain' | 'cut' | 'bulk' {
  if (input.targetWeightLbs == null) return 'maintain';
  if (input.targetWeightLbs < input.currentWeightLbs - 1) return 'cut';
  if (input.targetWeightLbs > input.currentWeightLbs + 1) return 'bulk';
  return 'maintain';
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
          nutrition_goal: nutritionGoal,
          athlete_goal_mode: input.goalMode,
          performance_goal_type: input.buildGoalType,
          planning_setup_version: 0,
          fight_date: input.goalMode === 'fight_camp' ? input.fightDate : null,
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
        custom_label: session.label.trim() || (session.activityType === 'sparring' ? 'Sparring' : 'Boxing'),
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

    if (input.goalMode === 'fight_camp') {
      await setupFightCamp(userId, {
        goalMode: 'fight_camp',
        performanceGoalType: input.buildGoalType,
        fightDate: input.fightDate ?? undefined,
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

    const gym = await getDefaultGymProfile(userId);
    if (!gym) {
      invalidateEngineDataCache({ userId });
      return { generatedPlan: false };
    }

    const generatedWeek = await generateAndSaveWeeklyPlan(userId, config as never, gym, todayLocalDate());
    if (generatedWeek.entries.length === 0) {
      throw new Error('Your first week could not be built. Try choosing more training days.');
    }

    invalidateEngineDataCache({ userId });
    return { generatedPlan: true };
  } catch (error) {
    await supabase
      .from('athlete_profiles')
      .update({ planning_setup_version: 0 })
      .eq('user_id', userId);
    throw error;
  }
}
