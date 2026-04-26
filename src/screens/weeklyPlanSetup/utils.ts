import { formatLocalDate } from '../../../lib/utils/date';
import type {
  AvailabilityWindow,
  BuildPhaseGoalRow,
  BuildPhaseGoalType,
} from '../../../lib/engine/types';
import {
  BUILD_METRIC_OPTIONS,
  DAY_ORDER,
  DEFAULT_WINDOW,
  SETUP_PHASES,
} from './constants';
import type {
  BuildMetricOption,
  BuildPhaseRecommendation,
  EditableCommitment,
  SetupPhaseKey,
} from './types';

export function sortDays(days: number[]): number[] {
  return Array.from(new Set(days)).sort((a, b) => (DAY_ORDER[a] ?? 99) - (DAY_ORDER[b] ?? 99));
}

export function sortWindows(windows: AvailabilityWindow[]): AvailabilityWindow[] {
  return [...windows].sort((a, b) => (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99));
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function daysBetween(start: string, end: string): number {
  const startTs = new Date(`${start}T00:00:00`).getTime();
  const endTs = new Date(`${end}T00:00:00`).getTime();
  return Math.round((endTs - startTs) / 86400000);
}

export function parseNumberInput(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function createCommitment(dayOfWeek: number = 1): EditableCommitment {
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

export function getSetupPhaseIndex(phaseKey: SetupPhaseKey | undefined): number {
  if (!phaseKey) return 0;
  const matchedIndex = SETUP_PHASES.findIndex((phase) => phase.key === phaseKey);
  return matchedIndex >= 0 ? matchedIndex : 0;
}

export function getBuildMetricOptions(goalType: BuildPhaseGoalType): BuildMetricOption[] {
  return BUILD_METRIC_OPTIONS[goalType];
}

export function getBuildMetricOption(goalType: BuildPhaseGoalType, metricValue: string): BuildMetricOption | undefined {
  return getBuildMetricOptions(goalType).find((option) => option.value === metricValue);
}

export function getDefaultBuildMetricOption(goalType: BuildPhaseGoalType): BuildMetricOption {
  return getBuildMetricOptions(goalType)[0];
}

export function resolveBuildMetricValue(goalType: BuildPhaseGoalType, metricValue: string | null | undefined): string {
  const matchedMetric = metricValue ? getBuildMetricOption(goalType, metricValue) : undefined;
  return matchedMetric?.value ?? getDefaultBuildMetricOption(goalType).value;
}

export function createGuidedGoalStatement(goalType: BuildPhaseGoalType, metric: BuildMetricOption, targetValue: number, targetHorizonWeeks: number): string {
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

export function createBuildPhaseRecommendation(goalType: BuildPhaseGoalType, profileTargetWeight: number | null): BuildPhaseRecommendation {
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
        secondaryConstraint: 'protect_recovery',
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
        secondaryConstraint: 'skill_frequency',
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
          secondaryConstraint: 'weight_trajectory',
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
        secondaryConstraint: 'weight_trajectory',
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
        secondaryConstraint: 'protect_recovery',
      };
    }
  }
}

export function isGuidedBuildGoal(buildGoal: BuildPhaseGoalRow, recommendation: BuildPhaseRecommendation): boolean {
  return buildGoal.goal_label == null
    && buildGoal.goal_statement === recommendation.goalStatement
    && (buildGoal.primary_outcome ?? buildGoal.goal_statement) === recommendation.goalStatement
    && (buildGoal.secondary_constraint ?? 'protect_recovery') === recommendation.secondaryConstraint
    && buildGoal.target_metric === recommendation.metric.value
    && buildGoal.target_value === recommendation.targetValue
    && buildGoal.target_unit === recommendation.metric.unit
    && buildGoal.target_date == null
    && buildGoal.target_horizon_weeks === recommendation.targetHorizonWeeks;
}

export function createDefaultAvailabilityWindows(): AvailabilityWindow[] {
  return [
    { dayOfWeek: 1, ...DEFAULT_WINDOW },
    { dayOfWeek: 3, ...DEFAULT_WINDOW },
    { dayOfWeek: 5, ...DEFAULT_WINDOW },
  ];
}
