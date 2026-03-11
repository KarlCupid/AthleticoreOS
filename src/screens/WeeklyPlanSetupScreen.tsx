import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONT_FAMILY, RADIUS, SHADOWS, SPACING } from '../theme/theme';
import { DatePickerField } from '../components/DatePickerField';
import { TimePickerField } from '../components/TimePickerField';
import { supabase } from '../../lib/supabase';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { getDefaultGymProfile } from '../../lib/api/gymProfileService';
import { getWeeklyPlanConfig, saveWeeklyPlanConfig } from '../../lib/api/weeklyPlanService';
import { generateAndSaveWeeklyPlan } from '../hooks/useWeeklyPlan';
import { getActiveFightCamp, setupFightCamp } from '../../lib/api/fightCampService';
import { getActiveBuildPhaseGoal, setupBuildPhaseGoal } from '../../lib/api/buildPhaseService';
import { getRecurringActivities, replaceRecurringActivities } from '../../lib/api/scheduleService';
import type {
  ActivityType,
  AthleteGoalMode,
  AvailabilityWindow,
  BuildPhaseGoalRow,
  BuildPhaseGoalType,
  ConstraintTier,
  PerformanceGoalType,
  WeighInTiming,
} from '../../lib/engine/types';

type SessionType = Extract<ActivityType, 'sc' | 'boxing_practice' | 'conditioning'>;
type CommitmentType = Extract<ActivityType, 'boxing_practice' | 'sparring' | 'conditioning' | 'sc'>;

type EditableCommitment = {
  id: string;
  dayOfWeek: number;
  activityType: CommitmentType;
  label: string;
  startTime: string;
  durationMin: string;
  expectedIntensity: number;
  tier: ConstraintTier;
};

type SetupPhaseKey = 'objective' | 'availability' | 'commitments' | 'planner';

type SetupPhase = {
  key: SetupPhaseKey;
  eyebrow: string;
  title: string;
  description: string;
};

type BuildMetricOption = {
  value: string;
  label: string;
  description: string;
  unit: string;
  placeholder: string;
};

type BuildPhaseRecommendation = {
  metric: BuildMetricOption;
  targetValue: number;
  targetHorizonWeeks: number;
  reason: string;
  goalStatement: string;
};

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

const DAY_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
const DURATION_OPTIONS = [30, 45, 60, 75, 90];
const DELOAD_OPTIONS = [4, 5, 6, 8];
const ROUND_OPTIONS = [3, 4, 5, 6, 8, 10, 12];
const ROUND_DURATION_OPTIONS = [120, 180, 240, 300];
const REST_DURATION_OPTIONS = [30, 45, 60, 90];
const BUILD_GOAL_OPTIONS: { value: BuildPhaseGoalType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'boxing_skill', label: 'Boxing Skill' },
  { value: 'weight_class_prep', label: 'Weight Class Prep' },
];
const COMMITMENT_OPTIONS: { value: CommitmentType; label: string }[] = [
  { value: 'boxing_practice', label: 'Boxing' },
  { value: 'sparring', label: 'Sparring' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'sc', label: 'S&C' },
];
const BUILD_METRIC_OPTIONS: Record<BuildPhaseGoalType, BuildMetricOption[]> = {
  strength: [
    { value: 'estimated_1rm_lbs', label: 'Estimated 1RM', description: 'Best single-rep strength estimate for the main lift you care about.', unit: 'lbs', placeholder: '275' },
    { value: 'top_working_weight_lbs', label: 'Top Working Weight', description: 'Heaviest high-quality working weight you want to own consistently.', unit: 'lbs', placeholder: '225' },
    { value: 'strength_sessions_per_week', label: 'Strength Sessions / Week', description: 'How many quality strength sessions you want to consistently complete each week.', unit: 'sessions / week', placeholder: '3' },
  ],
  conditioning: [
    { value: 'hard_conditioning_sessions_per_week', label: 'Hard Conditioning Sessions / Week', description: 'How many hard conditioning sessions you want to sustain each week.', unit: 'sessions / week', placeholder: '3' },
    { value: 'conditioning_minutes_per_week', label: 'Conditioning Minutes / Week', description: 'Total weekly conditioning volume you want to reach.', unit: 'minutes / week', placeholder: '90' },
    { value: 'quality_rounds_completed', label: 'Quality Rounds Completed', description: 'Number of strong, on-pace rounds you want to be able to complete.', unit: 'rounds', placeholder: '8' },
  ],
  boxing_skill: [
    { value: 'boxing_sessions_per_week', label: 'Technical Boxing Sessions / Week', description: 'How many focused boxing sessions you want to consistently hit each week.', unit: 'sessions / week', placeholder: '4' },
    { value: 'sparring_rounds_per_week', label: 'Sparring Rounds / Week', description: 'How many productive sparring rounds you want to handle in a week.', unit: 'rounds / week', placeholder: '12' },
    { value: 'pad_rounds_per_session', label: 'Pad Rounds Per Session', description: 'How many high-quality pad rounds you want to own in a single session.', unit: 'rounds / session', placeholder: '6' },
  ],
  weight_class_prep: [
    { value: 'body_weight_lbs', label: 'Body Weight', description: 'Target bodyweight you want to reach before camp pressure sets in.', unit: 'lbs', placeholder: '155' },
    { value: 'weekly_weight_change_lbs', label: 'Weekly Weight Change', description: 'How much weight you want to lose or gain each week on average.', unit: 'lbs / week', placeholder: '1.5' },
    { value: 'nutrition_compliance_days_per_week', label: 'Nutrition Compliance Days / Week', description: 'How many days per week you want to hit your nutrition plan on target.', unit: 'days / week', placeholder: '6' },
  ],
};
const BUILD_GOAL_OBJECTIVE_PLACEHOLDERS: Record<BuildPhaseGoalType, string> = {
  strength: 'Increase lower-body strength without giving up speed or freshness.',
  conditioning: 'Build the pace to hold strong output from the first round through the last.',
  boxing_skill: 'Sharpen technical execution so exchanges stay cleaner under pressure.',
  weight_class_prep: 'Move toward the target class steadily before the cut becomes urgent.',
};
const DEFAULT_WINDOW = { startTime: '18:00', endTime: '20:00' };
const SETUP_PHASES: SetupPhase[] = [
  {
    key: 'objective',
    eyebrow: 'Phase 1',
    title: 'Objective',
    description: 'Define what this plan is for, when it starts, and the target the engine should optimize around.',
  },
  {
    key: 'availability',
    eyebrow: 'Phase 2',
    title: 'Availability',
    description: 'Show us when training can happen so the engine only schedules work inside realistic windows.',
  },
  {
    key: 'commitments',
    eyebrow: 'Phase 3',
    title: 'Fixed Sessions',
    description: 'List classes, sparring, and coach-prescribed work that should be treated as fixed or preferred anchors.',
  },
  {
    key: 'planner',
    eyebrow: 'Phase 4',
    title: 'Planner Rules',
    description: 'Finish with scheduling preferences the engine should use after fixed work is placed.',
  },
];

function sortDays(days: number[]): number[] {
  return Array.from(new Set(days)).sort((a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99));
}

function sortWindows(windows: AvailabilityWindow[]): AvailabilityWindow[] {
  return [...windows].sort((a, b) => (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99));
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function daysBetween(start: string, end: string): number {
  const startTs = new Date(`${start}T00:00:00`).getTime();
  const endTs = new Date(`${end}T00:00:00`).getTime();
  return Math.round((endTs - startTs) / 86400000);
}

function parseNumberInput(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function createCommitment(dayOfWeek: number = 1): EditableCommitment {
  return {
    id: `${dayOfWeek}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dayOfWeek,
    activityType: 'boxing_practice',
    label: '',
    startTime: '19:00',
    durationMin: '90',
    expectedIntensity: 7,
    tier: 'mandatory',
  };
}

function getBuildMetricOptions(goalType: BuildPhaseGoalType): BuildMetricOption[] {
  return BUILD_METRIC_OPTIONS[goalType];
}

function getBuildMetricOption(goalType: BuildPhaseGoalType, metricValue: string): BuildMetricOption | undefined {
  return getBuildMetricOptions(goalType).find((option) => option.value === metricValue);
}

function getDefaultBuildMetricOption(goalType: BuildPhaseGoalType): BuildMetricOption {
  return getBuildMetricOptions(goalType)[0];
}

function resolveBuildMetricValue(goalType: BuildPhaseGoalType, metricValue: string | null | undefined): string {
  const matchedMetric = metricValue ? getBuildMetricOption(goalType, metricValue) : undefined;
  return matchedMetric?.value ?? getDefaultBuildMetricOption(goalType).value;
}

function createGuidedGoalStatement(goalType: BuildPhaseGoalType, metric: BuildMetricOption, targetValue: number, targetHorizonWeeks: number): string {
  const metricLabel = metric.label.toLowerCase();
  const targetText = `${String(targetValue)} ${metric.unit}`;

  switch (goalType) {
    case 'strength':
      return `Build a stronger base by driving ${metricLabel} to ${targetText} over the next ${targetHorizonWeeks} weeks.`;
    case 'boxing_skill':
      return `Sharpen technical work by driving ${metricLabel} to ${targetText} over the next ${targetHorizonWeeks} weeks.`;
    case 'weight_class_prep':
      return `Move body-composition prep forward by driving ${metricLabel} to ${targetText} over the next ${targetHorizonWeeks} weeks.`;
    case 'conditioning':
    default:
      return `Build sustainable pace by driving ${metricLabel} to ${targetText} over the next ${targetHorizonWeeks} weeks.`;
  }
}

function createBuildPhaseRecommendation(goalType: BuildPhaseGoalType, profileTargetWeight: number | null): BuildPhaseRecommendation {
  switch (goalType) {
    case 'strength': {
      const metric = getBuildMetricOption(goalType, 'strength_sessions_per_week') ?? getDefaultBuildMetricOption(goalType);
      const targetValue = 3;
      const targetHorizonWeeks = 8;
      return {
        metric,
        targetValue,
        targetHorizonWeeks,
        reason: 'We start with repeatable weekly strength exposure because most athletes need consistency before chasing load-specific numbers.',
        goalStatement: createGuidedGoalStatement(goalType, metric, targetValue, targetHorizonWeeks),
      };
    }
    case 'boxing_skill': {
      const metric = getBuildMetricOption(goalType, 'boxing_sessions_per_week') ?? getDefaultBuildMetricOption(goalType);
      const targetValue = 4;
      const targetHorizonWeeks = 8;
      return {
        metric,
        targetValue,
        targetHorizonWeeks,
        reason: 'We bias toward repeatable technical reps first so the engine can build cleaner skill exposure before it guesses sparring volume.',
        goalStatement: createGuidedGoalStatement(goalType, metric, targetValue, targetHorizonWeeks),
      };
    }
    case 'weight_class_prep': {
      if (profileTargetWeight != null) {
        const metric = getBuildMetricOption(goalType, 'body_weight_lbs') ?? getDefaultBuildMetricOption(goalType);
        const targetValue = profileTargetWeight;
        const targetHorizonWeeks = 6;
        return {
          metric,
          targetValue,
          targetHorizonWeeks,
          reason: 'You already have a target weight on file, so the engine can anchor this block to a clear bodyweight objective.',
          goalStatement: createGuidedGoalStatement(goalType, metric, targetValue, targetHorizonWeeks),
        };
      }

      const metric = getBuildMetricOption(goalType, 'nutrition_compliance_days_per_week') ?? getDefaultBuildMetricOption(goalType);
      const targetValue = 6;
      const targetHorizonWeeks = 6;
      return {
        metric,
        targetValue,
        targetHorizonWeeks,
        reason: 'Without a target weight on file, the engine starts with nutrition consistency instead of guessing a bodyweight deadline.',
        goalStatement: createGuidedGoalStatement(goalType, metric, targetValue, targetHorizonWeeks),
      };
    }
    case 'conditioning':
    default: {
      const metric = getBuildMetricOption(goalType, 'hard_conditioning_sessions_per_week') ?? getDefaultBuildMetricOption(goalType);
      const targetValue = 3;
      const targetHorizonWeeks = 8;
      return {
        metric,
        targetValue,
        targetHorizonWeeks,
        reason: 'We default to a sustainable conditioning dose first so the engine can progress workload without overcommitting the week.',
        goalStatement: createGuidedGoalStatement(goalType, metric, targetValue, targetHorizonWeeks),
      };
    }
  }
}

function isGuidedBuildGoal(buildGoal: BuildPhaseGoalRow, recommendation: BuildPhaseRecommendation): boolean {
  return buildGoal.goal_label == null
    && buildGoal.goal_statement === recommendation.goalStatement
    && buildGoal.target_metric === recommendation.metric.value
    && buildGoal.target_value === recommendation.targetValue
    && buildGoal.target_unit === recommendation.metric.unit
    && buildGoal.target_date == null
    && buildGoal.target_horizon_weeks === recommendation.targetHorizonWeeks;
}

function OptionPill({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.optionPill, selected && styles.optionPillSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.optionPillText, selected && styles.optionPillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}


function FieldNote({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldNote}>{children}</Text>;
}

function Section({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      {children}
    </View>
  );
}

interface WeeklyPlanSetupScreenProps {
  onComplete?: () => void;
}

export function WeeklyPlanSetupScreen({ onComplete }: WeeklyPlanSetupScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [userId, setUserId] = useState<string | null>(null);
  const [profileTargetWeight, setProfileTargetWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);

  const [startDate, setStartDate] = useState<string>(todayLocalDate());
  const [availabilityWindows, setAvailabilityWindows] = useState<AvailabilityWindow[]>([
    { dayOfWeek: 1, ...DEFAULT_WINDOW },
    { dayOfWeek: 3, ...DEFAULT_WINDOW },
    { dayOfWeek: 5, ...DEFAULT_WINDOW },
  ]);
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [allowTwoADays, setAllowTwoADays] = useState(false);
  const [twoADayDays, setTwoADayDays] = useState<number[]>([]);
  const [amSessionType, setAmSessionType] = useState<SessionType>('sc');
  const [pmSessionType, setPmSessionType] = useState<SessionType>('boxing_practice');
  const [autoDeloadInterval, setAutoDeloadInterval] = useState(5);
  const [commitments, setCommitments] = useState<EditableCommitment[]>([]);

  const [goalMode, setGoalMode] = useState<AthleteGoalMode>('build_phase');
  const [buildGoalType, setBuildGoalType] = useState<BuildPhaseGoalType>('conditioning');
  const [goalLabel, setGoalLabel] = useState('');
  const [goalStatement, setGoalStatement] = useState('');
  const [targetMetric, setTargetMetric] = useState(() => getDefaultBuildMetricOption('conditioning').value);
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [targetHorizonWeeks, setTargetHorizonWeeks] = useState('');
  const [showAdvancedOverride, setShowAdvancedOverride] = useState(false);

  const [fightDate, setFightDate] = useState<string>(addDays(todayLocalDate(), 84));
  const [travelStartDate, setTravelStartDate] = useState<string>('');
  const [travelEndDate, setTravelEndDate] = useState<string>('');
  const [weighInTiming, setWeighInTiming] = useState<WeighInTiming>('next_day');
  const [targetWeight, setTargetWeight] = useState<string>('');
  const [roundCount, setRoundCount] = useState<number>(3);
  const [roundDurationSec, setRoundDurationSec] = useState<number>(180);
  const [restDurationSec, setRestDurationSec] = useState<number>(60);

  const currentPhase = SETUP_PHASES[phaseIndex];
  const availableDays = useMemo(() => sortDays(availabilityWindows.map((window) => window.dayOfWeek)), [availabilityWindows]);
  const buildGoalTypeLabel = useMemo(() => BUILD_GOAL_OPTIONS.find((option) => option.value === buildGoalType)?.label ?? 'Build Phase', [buildGoalType]);
  const buildRecommendation = useMemo(() => createBuildPhaseRecommendation(buildGoalType, profileTargetWeight), [buildGoalType, profileTargetWeight]);
  const selectedBuildMetric = useMemo(() => getBuildMetricOption(buildGoalType, targetMetric) ?? buildRecommendation.metric, [buildGoalType, buildRecommendation.metric, targetMetric]);
  const weeklyLockedSlots = commitments.length;
  const estimatedRoundWorkMin = Math.round(((roundCount * roundDurationSec) + Math.max(0, roundCount - 1) * restDurationSec) / 6) / 10;
  const daysToFight = goalMode === 'fight_camp' && fightDate ? Math.max(0, daysBetween(todayLocalDate(), fightDate)) : null;

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
            : sortDays(config.available_days ?? [1, 3, 5]).map((dayOfWeek) => ({ dayOfWeek, ...DEFAULT_WINDOW }));
          setAvailabilityWindows(loadedWindows);
          setSessionDuration(config.session_duration_min ?? 60);
          setAllowTwoADays(config.allow_two_a_days ?? false);
          setTwoADayDays(sortDays(config.two_a_day_days ?? []));
          setAmSessionType((config.am_session_type as SessionType) ?? 'sc');
          setPmSessionType((config.pm_session_type as SessionType) ?? 'boxing_practice');
          setAutoDeloadInterval(config.auto_deload_interval_weeks ?? 5);
        }

        const profile = profileResult.data;
        setProfileTargetWeight(profile?.target_weight ?? null);
        if (profile?.target_weight != null) setTargetWeight(String(profile.target_weight));
        if (profile?.fight_date) setFightDate(profile.fight_date);
        if (profile?.athlete_goal_mode === 'fight_camp') {
          setGoalMode('fight_camp');
        }

        if (camp) {
          setGoalMode('fight_camp');
          setFightDate(camp.fightDate);
          setTravelStartDate(camp.travelStartDate ?? '');
          setTravelEndDate(camp.travelEndDate ?? '');
          setWeighInTiming(camp.weighInTiming ?? 'next_day');
          setTargetWeight(camp.targetWeight != null ? String(camp.targetWeight) : '');
          setRoundCount(camp.roundCount ?? 3);
          setRoundDurationSec(camp.roundDurationSec ?? 180);
          setRestDurationSec(camp.restDurationSec ?? 60);
        } else if (buildGoal) {
          const recommendedBuild = createBuildPhaseRecommendation(buildGoal.goal_type, profile?.target_weight ?? null);
          const useAdvancedOverride = !isGuidedBuildGoal(buildGoal, recommendedBuild);

          setGoalMode('build_phase');
          setShowAdvancedOverride(useAdvancedOverride);
          setBuildGoalType(buildGoal.goal_type);
          setGoalLabel(buildGoal.goal_label ?? '');
          setGoalStatement(buildGoal.goal_statement);
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

        setCommitments(
          recurring
            .filter((entry) => entry.recurrence.frequency === 'weekly' && entry.recurrence.days_of_week?.length)
            .map((entry) => ({
              id: entry.id,
              dayOfWeek: entry.recurrence.days_of_week?.[0] ?? 1,
              activityType: (entry.activity_type as CommitmentType) ?? 'boxing_practice',
              label: entry.custom_label ?? '',
              startTime: entry.start_time?.slice(0, 5) ?? '19:00',
              durationMin: String(entry.estimated_duration_min ?? 60),
              expectedIntensity: entry.expected_intensity ?? 6,
              tier: entry.constraint_tier ?? 'mandatory',
            })),
        );
      } catch (error) {
        console.error('[WeeklyPlanSetup] load error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleAvailabilityDay(dayOfWeek: number) {
    setAvailabilityWindows((prev) => {
      const exists = prev.some((window) => window.dayOfWeek === dayOfWeek);
      if (exists) {
        setTwoADayDays((current) => current.filter((day) => day !== dayOfWeek));
        return prev.filter((window) => window.dayOfWeek !== dayOfWeek);
      }
      return sortWindows([...prev, { dayOfWeek, ...DEFAULT_WINDOW }]);
    });
  }

  function updateAvailabilityWindow(dayOfWeek: number, field: 'startTime' | 'endTime', value: string) {
    setAvailabilityWindows((prev) => sortWindows(prev.map((window) => (
      window.dayOfWeek === dayOfWeek ? { ...window, [field]: value } : window
    ))));
  }

  function toggleTwoADay(day: number) {
    setTwoADayDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : sortDays([...prev, day])));
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
        Alert.alert('Availability required', 'Add at least one training availability window so the planner knows when work can be scheduled.');
      }
      return false;
    }

    for (const window of normalizedWindows) {
      if (!isValidTime(window.startTime) || !isValidTime(window.endTime) || window.endTime <= window.startTime) {
        if (showAlerts) {
          Alert.alert('Invalid availability', 'Each availability window needs valid HH:MM times, and the end time must be later than the start time.');
        }
        return false;
      }
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
          Alert.alert('Camp setup incomplete', 'Fight Camp needs a fight date and target weight because the planner cannot build camp timing without them.');
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
      case 'planner':
        return true;
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
        session_duration_min: sessionDuration,
        allow_two_a_days: allowTwoADays,
        two_a_day_days: sortDays(twoADayDays.filter((day) => availableDays.includes(day))),
        am_session_type: amSessionType,
        pm_session_type: pmSessionType,
        preferred_gym_profile_id: null,
        auto_deload_interval_weeks: autoDeloadInterval,
      };

      const savedConfig = await saveWeeklyPlanConfig(userId, configPayload as any);

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
          targetMetric: showAdvancedOverride ? selectedBuildMetric.value : buildRecommendation.metric.value,
          targetValue: showAdvancedOverride ? parsedTargetValue : buildRecommendation.targetValue,
          targetUnit: showAdvancedOverride ? selectedBuildMetric.unit : buildRecommendation.metric.unit,
          targetDate: showAdvancedOverride ? targetDate.trim() || null : null,
          targetHorizonWeeks: showAdvancedOverride ? parsedTargetHorizonWeeks : buildRecommendation.targetHorizonWeeks,
        });
      }

      const gym = await getDefaultGymProfile(userId);
      await generateAndSaveWeeklyPlan(userId, savedConfig as any, gym, startDate);

      onComplete?.();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('[WeeklyPlanSetup] save error:', error);
      Alert.alert('Save failed', 'Could not save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function renderObjectivePhase() {
    return (
      <>
        <Section label="Start Date" description="Pick the first day this plan should begin running.">
          <FieldNote>The planner builds the initial weekly cycle from this date.</FieldNote>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {Array.from({ length: 14 }).map((_, idx) => {
              const date = new Date();
              date.setDate(date.getDate() + idx);
              const dateStr = formatLocalDate(date);
              const selected = startDate === dateStr;
              const topLabel = idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
              const bottomLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.datePill, selected ? styles.datePillSelected : styles.datePillIdle]}
                  onPress={() => setStartDate(dateStr)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dateTopText, selected && styles.optionPillTextSelected]}>{topLabel}</Text>
                  <Text style={[styles.dateBottomText, selected && styles.optionPillTextSelected]}>{bottomLabel}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Section>

        <Section label="Plan Type" description="Choose the kind of block you want the engine to build.">
          <FieldNote>Every athlete should be in either Fight Camp or Build Phase so the planner can prioritize correctly.</FieldNote>
          <View style={styles.pillRow}>
            <OptionPill selected={goalMode === 'fight_camp'} label="Fight Camp" onPress={() => setGoalMode('fight_camp')} />
            <OptionPill selected={goalMode === 'build_phase'} label="Build Phase" onPress={() => setGoalMode('build_phase')} />
          </View>

          {goalMode === 'build_phase' ? (
            <>
              <Text style={styles.subLabel}>Primary Focus</Text>
              <FieldNote>Pick the area you want the engine to lead. We will recommend the scoreboard, target, and time frame for you.</FieldNote>
              <View style={styles.pillRow}>
                {BUILD_GOAL_OPTIONS.map((option) => (
                  <OptionPill key={option.value} selected={buildGoalType === option.value} label={option.label} onPress={() => setBuildGoalType(option.value)} />
                ))}
              </View>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Coach Recommendation</Text>
                <Text style={styles.previewLine}>Focus: {buildGoalTypeLabel}.</Text>
                <Text style={styles.previewLine}>The engine will optimize for {buildRecommendation.metric.label.toLowerCase()}.</Text>
                <Text style={styles.previewLine}>Recommended target: {String(buildRecommendation.targetValue)} {buildRecommendation.metric.unit}.</Text>
                <Text style={styles.previewLine}>Recommended time frame: {buildRecommendation.targetHorizonWeeks} weeks.</Text>
                <Text style={styles.previewLine}>{buildRecommendation.reason}</Text>
              </View>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Planned Objective</Text>
                <Text style={styles.previewLine}>{buildRecommendation.goalStatement}</Text>
              </View>
              <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvancedOverride((current) => !current)} activeOpacity={0.8}>
                <View style={styles.advancedToggleTextWrap}>
                  <Text style={styles.advancedToggleTitle}>Advanced Override</Text>
                  <Text style={styles.advancedToggleDescription}>Open this if you want to manually set the outcome, metric, target number, or deadline.</Text>
                </View>
                <Text style={styles.advancedToggleAction}>{showAdvancedOverride ? 'Hide' : 'Open'}</Text>
              </TouchableOpacity>
              {showAdvancedOverride ? (
                <>
                  <Text style={styles.subLabel}>Block Name (optional)</Text>
                  <FieldNote>Short label if you want to name this block for yourself.</FieldNote>
                  <TextInput style={styles.input} value={goalLabel} onChangeText={setGoalLabel} placeholder="Explosive strength block" placeholderTextColor={COLORS.text.tertiary} />
                  <Text style={styles.subLabel}>Specific Outcome</Text>
                  <FieldNote>Describe the outcome you want if the coach recommendation is not specific enough.</FieldNote>
                  <TextInput style={[styles.input, styles.multilineInput]} value={goalStatement} onChangeText={setGoalStatement} placeholder={BUILD_GOAL_OBJECTIVE_PLACEHOLDERS[buildGoalType]} placeholderTextColor={COLORS.text.tertiary} multiline />
                  <Text style={styles.subLabel}>Success Metric</Text>
                  <FieldNote>Choose the exact scoreboard the engine should optimize if you want to override the default.</FieldNote>
                  <View style={styles.pillRow}>
                    {getBuildMetricOptions(buildGoalType).map((option) => (
                      <OptionPill key={option.value} selected={selectedBuildMetric.value === option.value} label={option.label} onPress={() => setTargetMetric(option.value)} />
                    ))}
                  </View>
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>{selectedBuildMetric.label}</Text>
                    <Text style={styles.previewLine}>{selectedBuildMetric.description}</Text>
                    <Text style={styles.previewLine}>The engine will judge this override in {selectedBuildMetric.unit}.</Text>
                  </View>
                  <Text style={styles.subLabel}>Target {selectedBuildMetric.label}</Text>
                  <FieldNote>Enter the exact number you want the engine to build toward by the end of this block.</FieldNote>
                  <TextInput style={styles.input} value={targetValue} onChangeText={setTargetValue} keyboardType="decimal-pad" placeholder={selectedBuildMetric.placeholder} placeholderTextColor={COLORS.text.tertiary} />
                  <Text style={styles.subLabel}>Goal Deadline</Text>
                  <FieldNote>Use a calendar date if you need this done by a specific time.</FieldNote>
                  <DatePickerField label="Goal Deadline" value={targetDate} onChange={setTargetDate} />
                  <Text style={styles.subLabel}>Or Weeks To Work On This</Text>
                  <FieldNote>Use this when you know the length of the block but not the exact end date.</FieldNote>
                  <TextInput style={styles.input} value={targetHorizonWeeks} onChangeText={setTargetHorizonWeeks} keyboardType="number-pad" placeholder="8" placeholderTextColor={COLORS.text.tertiary} />
                  <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Override Preview</Text>
                    <Text style={styles.previewLine}>
                      {goalStatement.trim() || 'Add a specific outcome if you want the override to replace the guided objective.'}
                    </Text>
                    <Text style={styles.previewLine}>
                      {targetValue.trim()
                        ? `Manual target: ${targetValue.trim()} ${selectedBuildMetric.unit} for ${selectedBuildMetric.label.toLowerCase()}.`
                        : `Set the manual target for ${selectedBuildMetric.label.toLowerCase()}.`}
                    </Text>
                    <Text style={styles.previewLine}>
                      {targetDate.trim()
                        ? `Deadline: ${targetDate}.`
                        : targetHorizonWeeks.trim()
                          ? `Time frame: ${targetHorizonWeeks.trim()} weeks.`
                          : 'Add a date or number of weeks so the override has a finish line.'}
                    </Text>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.subLabel}>Fight Date</Text>
              <FieldNote>This is the deadline the camp will build backward from.</FieldNote>
              <DatePickerField label="Fight Date" value={fightDate} onChange={setFightDate} />
              <Text style={styles.subLabel}>Target Weight (lbs)</Text>
              <FieldNote>Enter the contracted or intended weigh-in weight.</FieldNote>
              <TextInput style={styles.input} value={targetWeight} onChangeText={setTargetWeight} keyboardType="decimal-pad" placeholder="155" placeholderTextColor={COLORS.text.tertiary} />
              <Text style={styles.subLabel}>Weigh-in Timing</Text>
              <FieldNote>This changes how aggressive weight-cut assumptions can be.</FieldNote>
              <View style={styles.pillRow}>
                <OptionPill selected={weighInTiming === 'same_day'} label="Same Day" onPress={() => setWeighInTiming('same_day')} />
                <OptionPill selected={weighInTiming === 'next_day'} label="Next Day" onPress={() => setWeighInTiming('next_day')} />
              </View>
              <Text style={styles.subLabel}>Travel Start (optional)</Text>
              <FieldNote>Add travel if camp should protect energy around those dates.</FieldNote>
              <DatePickerField label="Travel Start" value={travelStartDate} onChange={setTravelStartDate} />
              <Text style={styles.subLabel}>Travel End (optional)</Text>
              <DatePickerField label="Travel End" value={travelEndDate} onChange={setTravelEndDate} />
              <Text style={styles.subLabel}>Rounds</Text>
              <FieldNote>Use the actual fight format when you know it.</FieldNote>
              <View style={styles.pillRow}>
                {ROUND_OPTIONS.map((value) => (
                  <OptionPill key={value} selected={roundCount === value} label={String(value)} onPress={() => setRoundCount(value)} />
                ))}
              </View>
              <Text style={styles.subLabel}>Round Duration</Text>
              <View style={styles.pillRow}>
                {ROUND_DURATION_OPTIONS.map((value) => (
                  <OptionPill key={value} selected={roundDurationSec === value} label={`${Math.round(value / 60)}m`} onPress={() => setRoundDurationSec(value)} />
                ))}
              </View>
              <Text style={styles.subLabel}>Rest Duration</Text>
              <View style={styles.pillRow}>
                {REST_DURATION_OPTIONS.map((value) => (
                  <OptionPill key={value} selected={restDurationSec === value} label={`${value}s`} onPress={() => setRestDurationSec(value)} />
                ))}
              </View>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Camp Impact Preview</Text>
                <Text style={styles.previewLine}>Locked gym commitments: {weeklyLockedSlots} recurring sessions.</Text>
                <Text style={styles.previewLine}>Fight format load: {roundCount} x {Math.round(roundDurationSec / 60)}m rounds, {restDurationSec}s rest (~{estimatedRoundWorkMin} min total).</Text>
                <Text style={styles.previewLine}>Timeline: {daysToFight != null ? `${daysToFight} days to fight date.` : 'Set fight date to compute timeline impact.'}</Text>
              </View>
            </>
          )}
        </Section>
      </>
    );
  }

  function renderAvailabilityPhase() {
    return (
      <Section label="Availability Windows" description="Show when supplemental work is actually allowed to happen.">
        <FieldNote>Select only the days and time windows where the engine can safely place training.</FieldNote>
        <FieldNote>Tap each boundary and choose the earliest start and latest finish instead of typing times manually.</FieldNote>
        <View style={styles.dayRow}>
          {DAY_OPTIONS.map((day) => {
            const selected = availableDays.includes(day.value);
            return (
              <TouchableOpacity key={day.value} style={[styles.dayPill, selected && styles.dayPillSelected]} onPress={() => toggleAvailabilityDay(day.value)} activeOpacity={0.75}>
                <Text style={[styles.dayPillText, selected && styles.optionPillTextSelected]}>{day.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {sortWindows(availabilityWindows).map((window) => {
          const dayLabel = DAY_OPTIONS.find((day) => day.value === window.dayOfWeek)?.label ?? 'Day';
          return (
            <View key={window.dayOfWeek} style={styles.windowCard}>
              <Text style={styles.windowTitle}>{dayLabel}</Text>
              <FieldNote>Enter the earliest start and latest end time the planner can use on this day.</FieldNote>
              <View style={styles.inputRow}>
                <View style={[styles.inlineField, { marginRight: SPACING.sm }]}>
                  <Text style={styles.subLabel}>Start</Text>
                  <TimePickerField label={`${dayLabel} Start`} value={window.startTime} onChange={(value) => updateAvailabilityWindow(window.dayOfWeek, 'startTime', value)} />
                </View>
                <View style={styles.inlineField}>
                  <Text style={styles.subLabel}>End</Text>
                  <TimePickerField label={`${dayLabel} End`} value={window.endTime} onChange={(value) => updateAvailabilityWindow(window.dayOfWeek, 'endTime', value)} />
                </View>
              </View>
            </View>
          );
        })}
      </Section>
    );
  }

  function renderCommitmentsPhase() {
    return (
      <Section label="Recurring Gym Commitments" description="List coach-set or standing sessions that should anchor the week.">
        <FieldNote>Mandatory means the planner must work around it. Preferred means it should try to preserve it when possible.</FieldNote>
        {commitments.map((commitment) => (
          <View key={commitment.id} style={styles.commitmentCard}>
            <View style={styles.commitmentHeader}>
              <Text style={styles.commitmentTitle}>{commitment.label || 'Gym Session'}</Text>
              <TouchableOpacity onPress={() => removeCommitment(commitment.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subLabel}>Session Type</Text>
            <FieldNote>Choose what this session actually is so the engine can model load correctly.</FieldNote>
            <View style={styles.pillRow}>
              {COMMITMENT_OPTIONS.map((option) => (
                <OptionPill key={option.value} selected={commitment.activityType === option.value} label={option.label} onPress={() => updateCommitment(commitment.id, { activityType: option.value })} />
              ))}
            </View>
            <Text style={styles.subLabel}>Constraint Tier</Text>
            <View style={styles.pillRow}>
              <OptionPill selected={commitment.tier === 'mandatory'} label="Mandatory" onPress={() => updateCommitment(commitment.id, { tier: 'mandatory' })} />
              <OptionPill selected={commitment.tier === 'preferred'} label="Preferred" onPress={() => updateCommitment(commitment.id, { tier: 'preferred' })} />
            </View>
            <Text style={styles.subLabel}>Day</Text>
            <View style={styles.pillRow}>
              {DAY_OPTIONS.map((day) => (
                <OptionPill key={day.value} selected={commitment.dayOfWeek === day.value} label={day.label} onPress={() => updateCommitment(commitment.id, { dayOfWeek: day.value })} />
              ))}
            </View>
            <Text style={styles.subLabel}>Label</Text>
            <FieldNote>Use the real session name if you have one, such as Team Sparring or Technical Boxing.</FieldNote>
            <TextInput style={styles.input} value={commitment.label} onChangeText={(value) => updateCommitment(commitment.id, { label: value })} placeholder="Team sparring" placeholderTextColor={COLORS.text.tertiary} />
            <View style={styles.inputRow}>
              <View style={[styles.inlineField, { marginRight: SPACING.sm }]}>
                <Text style={styles.subLabel}>Start Time</Text>
                <TimePickerField label={`${commitment.label || 'Commitment'} Start`} value={commitment.startTime} onChange={(value) => updateCommitment(commitment.id, { startTime: value })} />
              </View>
              <View style={styles.inlineField}>
                <Text style={styles.subLabel}>Duration</Text>
                <TextInput style={styles.input} value={commitment.durationMin} onChangeText={(value) => updateCommitment(commitment.id, { durationMin: value })} keyboardType="number-pad" placeholder="90" placeholderTextColor={COLORS.text.tertiary} />
              </View>
            </View>
            <Text style={styles.subLabel}>Typical Intensity</Text>
            <FieldNote>This should reflect how hard the session usually is, not the best-case day.</FieldNote>
            <View style={styles.pillRow}>
              {[4, 5, 6, 7, 8, 9].map((value) => (
                <OptionPill key={value} selected={commitment.expectedIntensity === value} label={`RPE ${value}`} onPress={() => updateCommitment(commitment.id, { expectedIntensity: value })} />
              ))}
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setCommitments((prev) => [...prev, createCommitment(availableDays[0] ?? 1)])}>
          <Text style={styles.secondaryButtonText}>Add Recurring Commitment</Text>
        </TouchableOpacity>
      </Section>
    );
  }

  function renderPlannerPhase() {
    return (
      <Section label="Weekly Planner" description="These settings decide how the engine fills open space after it places fixed work.">
        <Text style={styles.subLabel}>Default Session Duration</Text>
        <FieldNote>Pick the standard duration for sessions the engine creates automatically.</FieldNote>
        <View style={styles.pillRow}>
          {DURATION_OPTIONS.map((minutes) => (
            <OptionPill key={minutes} selected={sessionDuration === minutes} label={`${minutes}m`} onPress={() => setSessionDuration(minutes)} />
          ))}
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Allow two-a-day sessions</Text>
          <Switch
            value={allowTwoADays}
            onValueChange={(value) => {
              setAllowTwoADays(value);
              if (!value) setTwoADayDays([]);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={COLORS.border}
          />
        </View>
        <FieldNote>Enable this only on days where doubling up is realistic and sustainable.</FieldNote>
        {allowTwoADays ? (
          <>
            <Text style={styles.subLabel}>Two-a-day days</Text>
            <FieldNote>Choose which available days are allowed to host two separate sessions.</FieldNote>
            <View style={styles.pillRow}>
              {availableDays.map((day) => {
                const label = DAY_OPTIONS.find((option) => option.value === day)?.label ?? 'Day';
                return <OptionPill key={day} selected={twoADayDays.includes(day)} label={label} onPress={() => toggleTwoADay(day)} />;
              })}
            </View>
            <Text style={styles.subLabel}>AM session type</Text>
            <FieldNote>Choose what the first session should usually be.</FieldNote>
            <View style={styles.pillRow}>
              <OptionPill selected={amSessionType === 'sc'} label="S&C" onPress={() => setAmSessionType('sc')} />
              <OptionPill selected={amSessionType === 'boxing_practice'} label="Boxing" onPress={() => setAmSessionType('boxing_practice')} />
              <OptionPill selected={amSessionType === 'conditioning'} label="Conditioning" onPress={() => setAmSessionType('conditioning')} />
            </View>
            <Text style={styles.subLabel}>PM session type</Text>
            <View style={styles.pillRow}>
              <OptionPill selected={pmSessionType === 'sc'} label="S&C" onPress={() => setPmSessionType('sc')} />
              <OptionPill selected={pmSessionType === 'boxing_practice'} label="Boxing" onPress={() => setPmSessionType('boxing_practice')} />
              <OptionPill selected={pmSessionType === 'conditioning'} label="Conditioning" onPress={() => setPmSessionType('conditioning')} />
            </View>
          </>
        ) : null}
        <Text style={styles.subLabel}>Auto Deload</Text>
        <FieldNote>Choose how often the planner should reduce loading to manage fatigue over time.</FieldNote>
        <View style={styles.pillRow}>
          {DELOAD_OPTIONS.map((weeks) => (
            <OptionPill key={weeks} selected={autoDeloadInterval === weeks} label={`Every ${weeks}w`} onPress={() => setAutoDeloadInterval(weeks)} />
          ))}
        </View>
      </Section>
    );
  }

  function renderCurrentPhase() {
    switch (currentPhase.key) {
      case 'objective':
        return renderObjectivePhase();
      case 'availability':
        return renderAvailabilityPhase();
      case 'commitments':
        return renderCommitmentsPhase();
      case 'planner':
        return renderPlannerPhase();
      default:
        return null;
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPhase} style={styles.backButton} activeOpacity={0.75}>
          <Text style={styles.backButtonText}>{phaseIndex > 0 || navigation.canGoBack() ? 'Back' : ''}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Planning Setup</Text>
        {navigation.canGoBack() ? (
          <View style={styles.headerRight} />
        ) : (
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.headerRight} activeOpacity={0.75}>
            <Text style={styles.backButtonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progressShell}>
        <View style={styles.progressHeaderRow}>
          <Text style={styles.progressEyebrow}>{currentPhase.eyebrow}</Text>
          <Text style={styles.progressCount}>{phaseIndex + 1} of {SETUP_PHASES.length}</Text>
        </View>
        <Text style={styles.phaseTitle}>{currentPhase.title}</Text>
        <Text style={styles.phaseDescription}>{currentPhase.description}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((phaseIndex + 1) / SETUP_PHASES.length) * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentPhase()}
      </ScrollView>

      <View style={[styles.saveBar, { paddingBottom: insets.bottom + SPACING.md }]}> 
        {phaseIndex < SETUP_PHASES.length - 1 ? (
          <TouchableOpacity style={[styles.saveButton, !canProceedPhase(phaseIndex) && styles.saveButtonDisabled]} onPress={handleNextPhase} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} activeOpacity={0.8} disabled={saving}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Planning Setup</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  backButton: { minWidth: 64, paddingVertical: SPACING.xs },
  backButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  headerTitle: { fontSize: 18, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  headerRight: { minWidth: 64, alignItems: 'flex-end' },
  progressShell: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOWS.card },
  progressHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  progressEyebrow: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
  progressCount: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
  phaseTitle: { fontSize: 24, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  phaseDescription: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 21, marginBottom: SPACING.md },
  progressTrack: { height: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: COLORS.accent },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs, gap: SPACING.sm },
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOWS.card },
  sectionLabel: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.xs },
  sectionDescription: { fontSize: 14, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20, marginBottom: SPACING.sm },
  subLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginTop: SPACING.md },
  fieldNote: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, lineHeight: 18, marginTop: SPACING.xs },
  dateRow: { paddingRight: SPACING.lg, paddingTop: SPACING.sm },
  datePill: { width: 72, height: 72, borderRadius: RADIUS.md, borderWidth: 1.5, marginRight: SPACING.sm, alignItems: 'center', justifyContent: 'center' },
  datePillSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  datePillIdle: { backgroundColor: COLORS.surfaceSecondary, borderColor: COLORS.border },
  dateTopText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 4 },
  dateBottomText: { fontSize: 13, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  dayPill: { minWidth: 58, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  dayPillSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  dayPillText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  optionPill: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  optionPillSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accent },
  optionPillText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  optionPillTextSelected: { color: '#FFFFFF' },
  advancedToggle: { marginTop: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  advancedToggleTextWrap: { flex: 1, paddingRight: SPACING.md },
  advancedToggleTitle: { fontSize: 14, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, marginBottom: 2 },
  advancedToggleDescription: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  advancedToggleAction: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },

  input: { marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 15, fontFamily: FONT_FAMILY.regular, color: COLORS.text.primary, backgroundColor: COLORS.surfaceSecondary },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start' },
  inlineField: { flex: 1 },
  windowCard: { marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary },
  windowTitle: { fontSize: 14, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  commitmentCard: { marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary },
  commitmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commitmentTitle: { fontSize: 14, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  removeText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.depleted },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.md },
  toggleLabel: { flex: 1, marginRight: SPACING.md, fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  previewCard: { marginTop: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md, gap: SPACING.xs },
  previewTitle: { fontSize: 13, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary, marginBottom: 2 },
  previewLine: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 17 },
  secondaryButton: { marginTop: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent, paddingVertical: SPACING.md, alignItems: 'center' },
  secondaryButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  saveButton: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, ...SHADOWS.card },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: '#FFFFFF' },
});



