import type {
  ACWRResult,
  DailyAthleteSummary,
  MacrocycleContext,
  MEDStatus,
  NutritionFuelingTarget,
  ReadinessProfile,
  ScheduledActivityRow,
  StimulusConstraintSet,
} from '../../engine/index.ts';
import type { WorkoutPrescriptionV2 } from '../../engine/types';
import type { UnifiedPerformanceEngineResult } from '../../performance-engine/index.ts';
import type { DailyReadinessCheckinRow } from './trackingEntries';
import type { AthleteContextSnapshot } from './objectiveContext';
import type { getHydrationProtocol } from '../../engine/index.ts';

export interface UpeHandoffDependencies {
  resolveUnifiedDailyPerformance: (input: {
    userId: string;
    date: string;
    athleteContext: AthleteContextSnapshot;
    objectiveContext: MacrocycleContext;
    readinessProfile: ReadinessProfile;
    acwr: ACWRResult;
    todayCheckin?: DailyReadinessCheckinRow | null | undefined;
    scheduledActivities: ScheduledActivityRow[];
    currentWeight: number | null;
    targetWeight: number | null;
    weekStart: string;
  }) => UnifiedPerformanceEngineResult | null;
  buildDailyAthleteSummaryFromUnified: (input: {
    date: string;
    objectiveContext: MacrocycleContext;
    readinessProfile: ReadinessProfile;
    constraintSet: StimulusConstraintSet;
    medStatus: MEDStatus | null;
    hydration: ReturnType<typeof getHydrationProtocol>;
    workoutPrescription: WorkoutPrescriptionV2 | null;
    unifiedPerformance: UnifiedPerformanceEngineResult | null;
  }) => { summary: DailyAthleteSummary; nutritionTarget: NutritionFuelingTarget };
  addMonitoringBreadcrumb: (
    category: string,
    message: string,
    data?: Record<string, unknown>,
    level?: 'info' | 'warning' | 'error',
  ) => void;
}

export interface UpeHandoffResult {
  unifiedPerformance: UnifiedPerformanceEngineResult | null;
  mission: DailyAthleteSummary;
  nutritionTargets: NutritionFuelingTarget;
}

export function resolveUpeHandoff(
  input: {
    userId: string;
    date: string;
    athleteContext: AthleteContextSnapshot;
    objectiveContext: MacrocycleContext;
    readinessProfile: ReadinessProfile;
    constraintSet: StimulusConstraintSet;
    medStatus: MEDStatus | null;
    hydration: ReturnType<typeof getHydrationProtocol>;
    workoutPrescription: WorkoutPrescriptionV2 | null;
    acwr: ACWRResult;
    todayCheckin: DailyReadinessCheckinRow | null;
    scheduledActivities: ScheduledActivityRow[];
    currentWeight: number | null;
    targetWeight: number | null;
    weekStart: string;
  },
  dependencies: UpeHandoffDependencies,
): UpeHandoffResult {
  const unifiedPerformance = dependencies.resolveUnifiedDailyPerformance({
    userId: input.userId,
    date: input.date,
    athleteContext: input.athleteContext,
    objectiveContext: input.objectiveContext,
    readinessProfile: input.readinessProfile,
    acwr: input.acwr,
    todayCheckin: input.todayCheckin,
    scheduledActivities: input.scheduledActivities,
    currentWeight: input.currentWeight,
    targetWeight: input.targetWeight,
    weekStart: input.weekStart,
  });
  const { summary: mission, nutritionTarget: nutritionTargets } = dependencies.buildDailyAthleteSummaryFromUnified({
    date: input.date,
    objectiveContext: input.objectiveContext,
    readinessProfile: input.readinessProfile,
    constraintSet: input.constraintSet,
    medStatus: input.medStatus,
    hydration: input.hydration,
    workoutPrescription: input.workoutPrescription,
    unifiedPerformance,
  });

  for (const event of nutritionTargets.safetyEvents ?? []) {
    dependencies.addMonitoringBreadcrumb('daily_engine', 'nutrition_safety_event', {
      date: input.date,
      code: event.code,
      source: event.source,
      hasAdjustment: event.adjustedValue != null,
    });
  }

  return {
    unifiedPerformance,
    mission,
    nutritionTargets,
  };
}
