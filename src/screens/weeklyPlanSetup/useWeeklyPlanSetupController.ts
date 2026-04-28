import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { supabase } from '../../../lib/supabase';
import { getDefaultGymProfile } from '../../../lib/api/gymProfileService';
import { getWeeklyPlanConfig, saveWeeklyPlanConfig } from '../../../lib/api/weeklyPlanService';
import { generateAndSaveWeeklyPlan } from '../../hooks/useWeeklyPlan';
import { invalidateEngineDataCache } from '../../../lib/api/dailyPerformanceService';
import { getActiveFightCamp, setupFightCamp } from '../../../lib/api/fightCampService';
import { getActiveBuildPhaseGoal, setupBuildPhaseGoal } from '../../../lib/api/buildPhaseService';
import { getRecurringActivities, replaceRecurringActivities } from '../../../lib/api/scheduleService';
import { isGuidedEngineActivityType } from '../../../lib/engine/sessionOwnership';
import { logError } from '../../../lib/utils/logger';
import { todayLocalDate } from '../../../lib/utils/date';
import type {
  AthleteGoalMode,
  AvailabilityWindow,
  BuildPhaseGoalType,
  ObjectiveSecondaryConstraint,
  PerformanceGoalType,
  WeighInTiming,
} from '../../../lib/engine/types';
import {
  BUILD_GOAL_OPTIONS,
  DEFAULT_WINDOW,
  SETUP_PHASES,
} from './constants';
import type {
  EditableCommitment,
} from './types';
import {
  addDays,
  createBuildPhaseRecommendation,
  createCommitment,
  createDefaultAvailabilityWindows,
  daysBetween,
  getBuildMetricOption,
  getDefaultBuildMetricOption,
  isGuidedBuildGoal,
  isValidTime,
  parseNumberInput,
  resolveBuildMetricValue,
  sortDays,
  sortWindows,
} from './utils';

type NavigationLike = {
  canGoBack: () => boolean;
  goBack: () => void;
  getParent?: () => { navigate?: (route: string, params?: unknown) => void } | undefined;
  getState?: () => { routeNames?: string[] };
  navigate?: (route: string, params?: unknown) => void;
};

type UseWeeklyPlanSetupControllerArgs = {
  initialGoalMode?: AthleteGoalMode;
  initialPhaseIndex: number;
  navigation: NavigationLike;
  onComplete?: () => void;
};

export function useWeeklyPlanSetupController({
  initialGoalMode,
  initialPhaseIndex,
  navigation,
  onComplete,
}: UseWeeklyPlanSetupControllerArgs) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profileTargetWeight, setProfileTargetWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  const [startDate, setStartDate] = useState<string>(todayLocalDate());
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>(createDefaultAvailabilityWindows());
  const [autoDeloadInterval, setAutoDeloadInterval] = useState(5);
  const [commitments, setCommitments] = useState<EditableCommitment[]>([]);
  const [durationPickerCommitmentId, setDurationPickerCommitmentId] = useState<string | null>(null);

  const [goalMode, setGoalMode] = useState<AthleteGoalMode>('build_phase');
  const [buildGoalType, setBuildGoalType] = useState<BuildPhaseGoalType>('conditioning');
  const [goalLabel, setGoalLabel] = useState('');
  const [goalStatement, setGoalStatement] = useState('');
  const [primaryOutcome, setPrimaryOutcome] = useState('');
  const [secondaryConstraint, setSecondaryConstraint] = useState<ObjectiveSecondaryConstraint>('protect_recovery');
  const [targetMetric, setTargetMetric] = useState(() => getDefaultBuildMetricOption('conditioning').value);
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetHorizonWeeks, setTargetHorizonWeeks] = useState('');
  const [showAdvancedOverride, setShowAdvancedOverride] = useState(false);

  const [fightDate, setFightDate] = useState<string>(addDays(todayLocalDate(), 84));
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [weighInTiming, setWeighInTiming] = useState<WeighInTiming>('next_day');
  const [targetWeight, setTargetWeight] = useState('');
  const [roundCount, setRoundCount] = useState<number>(3);
  const [roundDurationSec, setRoundDurationSec] = useState<number>(180);
  const [restDurationSec, setRestDurationSec] = useState<number>(60);

  const currentPhase = SETUP_PHASES[phaseIndex];
  const availableDays = useMemo(
    () => sortDays(availabilityWindows.map((window) => window.dayOfWeek)),
    [availabilityWindows],
  );
  const buildGoalTypeLabel = useMemo(
    () => BUILD_GOAL_OPTIONS.find((option) => option.value === buildGoalType)?.label ?? 'Build Phase',
    [buildGoalType],
  );
  const buildRecommendation = useMemo(
    () => createBuildPhaseRecommendation(buildGoalType, profileTargetWeight),
    [buildGoalType, profileTargetWeight],
  );
  const selectedBuildMetric = useMemo(
    () => getBuildMetricOption(buildGoalType, targetMetric) ?? buildRecommendation.metric,
    [buildGoalType, buildRecommendation.metric, targetMetric],
  );
  const daysToFight = goalMode === 'fight_camp' && fightDate
    ? Math.max(0, daysBetween(todayLocalDate(), fightDate))
    : null;

  useEffect(() => {
    if (goalMode !== 'build_phase') return;

    if (showAdvancedOverride) {
      if (!getBuildMetricOption(buildGoalType, targetMetric)) {
        setTargetMetric(buildRecommendation.metric.value);
      }
      return;
    }

    setGoalLabel('');
    setGoalStatement(buildRecommendation.goalStatement);
    setPrimaryOutcome(buildRecommendation.goalStatement);
    setSecondaryConstraint(buildRecommendation.secondaryConstraint);
    setTargetMetric(buildRecommendation.metric.value);
    setTargetValue(String(buildRecommendation.targetValue));
    setTargetDate('');
    setTargetHorizonWeeks(String(buildRecommendation.targetHorizonWeeks));
  }, [buildGoalType, buildRecommendation, goalMode, showAdvancedOverride, targetMetric]);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);

      try {
        const [config, camp, buildGoal, profileResult, recurring] = await Promise.all([
          getWeeklyPlanConfig(currentUserId),
          getActiveFightCamp(currentUserId),
          getActiveBuildPhaseGoal(currentUserId),
          supabase
            .from('athlete_profiles')
            .select('athlete_goal_mode, performance_goal_type, fight_date, target_weight')
            .eq('user_id', currentUserId)
            .maybeSingle(),
          getRecurringActivities(currentUserId),
        ]);

        if (config) {
          const loadedWindows = config.availability_windows?.length > 0
            ? sortWindows(config.availability_windows)
            : sortDays(config.available_days ?? [1, 2, 3, 4, 5]).map((dayOfWeek) => ({ dayOfWeek, ...DEFAULT_WINDOW }));
          setAvailabilityWindows(loadedWindows);
          setAutoDeloadInterval(config.auto_deload_interval_weeks ?? 5);
        }

        const profile = profileResult.data;
        setProfileTargetWeight(profile?.target_weight ?? null);
        if (profile?.target_weight != null) setTargetWeight(String(profile.target_weight));
        if (profile?.fight_date) setFightDate(profile.fight_date);

        if (camp) {
          setFightDate(camp.fightDate);
          setTravelStartDate(camp.travelStartDate ?? '');
          setTravelEndDate(camp.travelEndDate ?? '');
          setWeighInTiming(camp.weighInTiming ?? 'next_day');
          setTargetWeight(camp.targetWeight != null ? String(camp.targetWeight) : '');
          setRoundCount(camp.roundCount ?? 3);
          setRoundDurationSec(camp.roundDurationSec ?? 180);
          setRestDurationSec(camp.restDurationSec ?? 60);
        }

        if (buildGoal) {
          const recommendedBuild = createBuildPhaseRecommendation(buildGoal.goal_type, profile?.target_weight ?? null);
          const useAdvancedOverride = !isGuidedBuildGoal(buildGoal, recommendedBuild);

          setShowAdvancedOverride(useAdvancedOverride);
          setBuildGoalType(buildGoal.goal_type);
          setGoalLabel(buildGoal.goal_label ?? '');
          setGoalStatement(buildGoal.goal_statement);
          setPrimaryOutcome(buildGoal.primary_outcome ?? buildGoal.goal_statement);
          setSecondaryConstraint(buildGoal.secondary_constraint ?? recommendedBuild.secondaryConstraint);
          setTargetMetric(resolveBuildMetricValue(buildGoal.goal_type, buildGoal.target_metric));
          setTargetValue(buildGoal.target_value != null ? String(buildGoal.target_value) : '');
          setTargetDate(buildGoal.target_date ?? '');
          setTargetHorizonWeeks(buildGoal.target_horizon_weeks != null ? String(buildGoal.target_horizon_weeks) : '');
        } else {
          setShowAdvancedOverride(false);
          if (profile?.performance_goal_type) {
            setBuildGoalType(profile.performance_goal_type as BuildPhaseGoalType);
          }
        }

        setGoalMode(profile?.athlete_goal_mode === 'fight_camp' || camp ? 'fight_camp' : 'build_phase');

        setCommitments(
          recurring
            .filter((entry) => (
              entry.recurrence.frequency === 'weekly'
              && entry.recurrence.days_of_week?.length
              && !isGuidedEngineActivityType(entry.activity_type)
            ))
            .map((entry) => ({
              id: entry.id,
              dayOfWeek: entry.recurrence.days_of_week?.[0] ?? 1,
              activityType: entry.activity_type === 'sparring' ? 'sparring' : 'boxing_practice',
              label: entry.custom_label ?? '',
              startTime: entry.start_time?.slice(0, 5) ?? '19:00',
              durationMin: String(entry.estimated_duration_min ?? 60),
              expectedIntensity: entry.expected_intensity ?? 6,
              tier: entry.constraint_tier ?? 'mandatory',
            })),
        );
      } catch (error) {
        logError('WeeklyPlanSetupScreen.loadSetup', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (initialGoalMode) {
      setGoalMode(initialGoalMode);
    }
    setPhaseIndex(initialPhaseIndex);
  }, [initialGoalMode, initialPhaseIndex, loading]);

  function toggleAvailabilityDay(dayOfWeek: number) {
    setAvailabilityWindows((prev) => {
      const exists = prev.some((window) => window.dayOfWeek === dayOfWeek);
      if (exists) {
        return prev.filter((window) => window.dayOfWeek !== dayOfWeek);
      }
      return sortWindows([...prev, { dayOfWeek, ...DEFAULT_WINDOW }]);
    });
  }

  function updateCommitment(id: string, patch: Partial<EditableCommitment>) {
    setCommitments((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function removeCommitment(id: string) {
    setCommitments((prev) => prev.filter((entry) => entry.id !== id));
  }

  function validateAvailabilityPhase(showAlerts: boolean): boolean {
    const normalizedWindows = sortWindows(availabilityWindows);
    if (normalizedWindows.length === 0) {
      if (showAlerts) {
        Alert.alert('Training days required', 'Select at least one day you can train.');
      }
      return false;
    }

    return true;
  }

  function validateCommitmentsPhase(showAlerts: boolean): boolean {
    for (const commitment of commitments) {
      if (!isValidTime(commitment.startTime)) {
        if (showAlerts) {
          Alert.alert('Invalid commitment', 'Each fixed session needs a valid HH:MM start time.');
        }
        return false;
      }

      const duration = parseNumberInput(commitment.durationMin);
      if (duration == null || duration <= 0) {
        if (showAlerts) {
          Alert.alert('Invalid commitment', 'Each fixed session needs a valid duration in minutes.');
        }
        return false;
      }
    }

    return true;
  }

  function validateObjectivePhase(showAlerts: boolean): boolean {
    if (goalMode === 'fight_camp') {
      if (!fightDate || !targetWeight.trim()) {
        if (showAlerts) {
          Alert.alert('Camp setup incomplete', 'Fight Camp needs a fight date and target weight.');
        }
        return false;
      }

      const parsedTargetWeight = parseNumberInput(targetWeight);
      if (parsedTargetWeight == null) {
        if (showAlerts) {
          Alert.alert('Invalid target weight', 'Enter a valid number for target weight.');
        }
        return false;
      }

      return true;
    }

    if (!showAdvancedOverride) {
      return true;
    }

    if (!goalStatement.trim() || !targetMetric.trim()) {
      if (showAlerts) {
        Alert.alert('Build Phase incomplete', 'Advanced override needs a clear objective and a measurable success metric.');
      }
      return false;
    }

    if (!primaryOutcome.trim()) {
      if (showAlerts) {
        Alert.alert('Build Phase incomplete', 'Add a clear primary objective so the daily athlete summary knows what this block is trying to achieve.');
      }
      return false;
    }

    const parsedTargetValue = parseNumberInput(targetValue);
    if (targetValue.trim() === '' || parsedTargetValue == null || parsedTargetValue <= 0) {
      if (showAlerts) {
        Alert.alert('Build Phase incomplete', 'Enter a concrete target number so the override is measurable.');
      }
      return false;
    }

    if (!targetDate.trim() && !targetHorizonWeeks.trim()) {
      if (showAlerts) {
        Alert.alert('Build Phase incomplete', 'Add either a target date or a target horizon in weeks so the override has a clear time frame.');
      }
      return false;
    }

    if (targetHorizonWeeks.trim() !== '') {
      const parsedWeeks = parseNumberInput(targetHorizonWeeks);
      if (parsedWeeks == null || parsedWeeks <= 0) {
        if (showAlerts) {
          Alert.alert('Invalid horizon', 'Enter a valid positive number of weeks.');
        }
        return false;
      }
    }

    return true;
  }

  function canProceedPhase(index: number): boolean {
    const phase = SETUP_PHASES[index]?.key;
    switch (phase) {
      case 'objective':
        return validateObjectivePhase(false);
      case 'availability':
        return validateAvailabilityPhase(false);
      case 'commitments':
        return validateCommitmentsPhase(false);
      default:
        return true;
    }
  }

  function handleNextPhase() {
    if (!canProceedPhase(phaseIndex)) {
      if (currentPhase.key === 'objective') validateObjectivePhase(true);
      if (currentPhase.key === 'availability') validateAvailabilityPhase(true);
      if (currentPhase.key === 'commitments') validateCommitmentsPhase(true);
      return;
    }

    if (phaseIndex < SETUP_PHASES.length - 1) {
      setPhaseIndex((current) => current + 1);
    }
  }

  function handleBackPhase() {
    if (phaseIndex > 0) {
      setPhaseIndex((current) => current - 1);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  function openGymProfiles() {
    const currentRouteNames = navigation.getState?.().routeNames ?? [];
    if (currentRouteNames.includes('GymProfiles')) {
      navigation.navigate?.('GymProfiles');
      return;
    }

    navigation.getParent?.()?.navigate?.('Train', { screen: 'GymProfiles' });
  }

  async function handleSave() {
    if (!userId) return;

    if (!validateObjectivePhase(true) || !validateAvailabilityPhase(true) || !validateCommitmentsPhase(true)) {
      return;
    }

    const normalizedWindows = sortWindows(availabilityWindows);
    const parsedTargetWeight = targetWeight.trim() === '' ? null : parseNumberInput(targetWeight);
    const parsedTargetValue = parseNumberInput(targetValue);
    const parsedTargetHorizonWeeks = targetHorizonWeeks.trim() === '' ? null : parseNumberInput(targetHorizonWeeks);

    setSaving(true);
    try {
      const configPayload = {
        available_days: availableDays,
        availability_windows: normalizedWindows,
        session_duration_min: 75,
        allow_two_a_days: false,
        two_a_day_days: [],
        am_session_type: 'sc',
        pm_session_type: 'boxing_practice',
        preferred_gym_profile_id: null,
        auto_deload_interval_weeks: autoDeloadInterval,
      };

      const savedConfig = await saveWeeklyPlanConfig(userId, configPayload as never);
      console.info('[WeeklyPlanSetupScreen.saveSetup] config saved', {
        userId,
        availableDays: savedConfig.available_days.length,
      });

      await replaceRecurringActivities(
        userId,
        commitments.map((commitment) => ({
          activity_type: commitment.activityType,
          custom_label: commitment.label.trim() || null,
          start_time: `${commitment.startTime}:00`,
          estimated_duration_min: Number(commitment.durationMin),
          expected_intensity: commitment.expectedIntensity,
          recurrence: {
            frequency: 'weekly' as const,
            interval: 1,
            days_of_week: [commitment.dayOfWeek],
          },
          session_kind: commitment.activityType,
          constraint_tier: commitment.tier,
        })),
      );

      if (goalMode === 'fight_camp') {
        await setupFightCamp(userId, {
          goalMode: 'fight_camp',
          performanceGoalType: buildGoalType as PerformanceGoalType,
          fightDate,
          weighInTiming,
          targetWeight: parsedTargetWeight,
          roundCount,
          roundDurationSec,
          restDurationSec,
          travelStartDate: travelStartDate.trim() || null,
          travelEndDate: travelEndDate.trim() || null,
        });
      } else {
        await setupBuildPhaseGoal(userId, {
          goalType: buildGoalType,
          goalLabel: showAdvancedOverride ? goalLabel.trim() || null : null,
          goalStatement: showAdvancedOverride ? goalStatement.trim() : buildRecommendation.goalStatement,
          primaryOutcome: showAdvancedOverride ? primaryOutcome.trim() : buildRecommendation.goalStatement,
          secondaryConstraint,
          successWindow: showAdvancedOverride ? targetDate.trim() || null : null,
          targetMetric: showAdvancedOverride ? selectedBuildMetric.value : buildRecommendation.metric.value,
          targetValue: showAdvancedOverride ? parsedTargetValue : buildRecommendation.targetValue,
          targetUnit: showAdvancedOverride ? selectedBuildMetric.unit : buildRecommendation.metric.unit,
          targetDate: showAdvancedOverride ? targetDate.trim() || null : null,
          targetHorizonWeeks: showAdvancedOverride ? parsedTargetHorizonWeeks : buildRecommendation.targetHorizonWeeks,
        });
      }
      console.info('[WeeklyPlanSetupScreen.saveSetup] goal/camp saved', {
        userId,
        goalMode,
      });

      const gym = await getDefaultGymProfile(userId);
      if (!gym) {
        Alert.alert(
          'Gym profile required',
          'Create a default gym profile so the workout plan can match your available equipment.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Create Gym Profile', onPress: openGymProfiles },
          ],
        );
        return;
      }

      const generatedWeek = await generateAndSaveWeeklyPlan(userId, savedConfig as never, gym, startDate);
      if (generatedWeek.entries.length === 0) {
        throw new Error('Weekly plan generation completed without entries.');
      }

      console.info('[WeeklyPlanSetupScreen.saveSetup] week generated', {
        userId,
        weekStart: generatedWeek.entries[0]?.week_start_date ?? startDate,
        entryCount: generatedWeek.entries.length,
      });

      invalidateEngineDataCache({ userId });

      onComplete?.();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      logError('WeeklyPlanSetupScreen.saveSetup', error);
      Alert.alert('Save failed', 'Could not save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return {
    loading,
    saving,
    phaseIndex,
    currentPhase,
    availableDays,
    buildGoalTypeLabel,
    buildRecommendation,
    selectedBuildMetric,
    daysToFight,
    startDate,
    setStartDate,
    goalMode,
    setGoalMode,
    buildGoalType,
    setBuildGoalType,
    goalLabel,
    setGoalLabel,
    goalStatement,
    setGoalStatement,
    primaryOutcome,
    setPrimaryOutcome,
    secondaryConstraint,
    setSecondaryConstraint,
    targetMetric,
    setTargetMetric,
    targetValue,
    setTargetValue,
    targetDate,
    setTargetDate,
    targetHorizonWeeks,
    setTargetHorizonWeeks,
    showAdvancedOverride,
    setShowAdvancedOverride,
    fightDate,
    setFightDate,
    travelStartDate,
    setTravelStartDate,
    travelEndDate,
    setTravelEndDate,
    weighInTiming,
    setWeighInTiming,
    targetWeight,
    setTargetWeight,
    roundCount,
    setRoundCount,
    roundDurationSec,
    setRoundDurationSec,
    restDurationSec,
    setRestDurationSec,
    toggleAvailabilityDay,
    commitments,
    updateCommitment,
    removeCommitment,
    autoDeloadInterval,
    setAutoDeloadInterval,
    durationPickerCommitmentId,
    setDurationPickerCommitmentId,
    canProceedPhase,
    handleNextPhase,
    handleBackPhase,
    handleSave,
    addCommitment: () => setCommitments((prev) => [...prev, createCommitment(availableDays[0] ?? 1)]),
  };
}
