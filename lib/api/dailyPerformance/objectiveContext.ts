import {
  calculateWeightTrend,
  type MacrocycleContext,
  type PerformanceObjective,
  type Phase,
} from '../../engine/index.ts';
import { determineCampPhase, toCampEnginePhase } from '../../engine/calculateCamp';
import type { getAthleteContext } from '../athleteContextService';
import type { getActiveBuildPhaseGoal } from '../buildPhaseService';
import type { getActiveFightCamp } from '../fightCampService';
import type { getWeightHistory } from '../weightService';
import { daysBetween } from './dateWindow';

export type AthleteContextSnapshot = Awaited<ReturnType<typeof getAthleteContext>>;
export type BuildPhaseGoalSnapshot = Awaited<ReturnType<typeof getActiveBuildPhaseGoal>>;
export type FightCampSnapshot = Awaited<ReturnType<typeof getActiveFightCamp>>;

export interface ObjectiveContextDependencies {
  getAthleteContext: (userId: string) => Promise<AthleteContextSnapshot>;
  getActiveBuildPhaseGoal: (userId: string) => Promise<BuildPhaseGoalSnapshot>;
  getActiveFightCamp: (userId: string) => Promise<FightCampSnapshot>;
  getEffectiveWeight: (userId: string, baseWeightLbs: number) => Promise<number | null>;
  getWeightHistory: (userId: string, days: number) => Promise<Awaited<ReturnType<typeof getWeightHistory>>>;
}

export const defaultObjectiveContextDependencies: ObjectiveContextDependencies = {
  getAthleteContext: async (userId) => {
    const module = await import('../athleteContextService');
    return module.getAthleteContext(userId);
  },
  getActiveBuildPhaseGoal: async (userId) => {
    const module = await import('../buildPhaseService');
    return module.getActiveBuildPhaseGoal(userId);
  },
  getActiveFightCamp: async (userId) => {
    const module = await import('../fightCampService');
    return module.getActiveFightCamp(userId);
  },
  getEffectiveWeight: async (userId, baseWeightLbs) => {
    const module = await import('../weightService');
    return module.getEffectiveWeight(userId, baseWeightLbs);
  },
  getWeightHistory: async (userId, days) => {
    const module = await import('../weightService');
    return module.getWeightHistory(userId, days);
  },
};

export function buildPerformanceObjective(input: {
  goalMode: MacrocycleContext['goalMode'];
  performanceGoalType: MacrocycleContext['performanceGoalType'];
  buildGoal: MacrocycleContext['buildGoal'];
  phase: Phase;
  camp: MacrocycleContext['camp'];
  weightClassState: MacrocycleContext['weightClassState'];
  targetWeightLbs: number | null;
}): PerformanceObjective {
  const { goalMode, performanceGoalType, buildGoal, phase, camp, weightClassState, targetWeightLbs } = input;

  if (goalMode === 'fight_camp') {
    const primaryOutcome = weightClassState === 'driving'
      ? 'Arrive sharp and on weight for the fight'
      : 'Peak performance for the target fight';

    return {
      mode: 'fight_camp',
      goalType: performanceGoalType,
      primaryOutcome,
      secondaryConstraint: weightClassState === 'driving' ? 'weight_trajectory' : 'protect_recovery',
      goalLabel: camp ? `Fight camp ending ${camp.fightDate}` : 'Fight camp',
      targetMetric: targetWeightLbs != null ? 'body_weight_lbs' : 'fight_readiness',
      targetValue: targetWeightLbs,
      targetUnit: targetWeightLbs != null ? 'lbs' : null,
      deadline: camp?.fightDate ?? null,
      horizonWeeks: camp?.totalWeeks ?? null,
      successWindow: camp?.fightDate ?? null,
    };
  }

  return {
    mode: 'build_phase',
    goalType: buildGoal?.goal_type ?? performanceGoalType,
    primaryOutcome: buildGoal?.primary_outcome ?? buildGoal?.goal_statement ?? `Build ${phase.replace(/-/g, ' ')} capacity`,
    secondaryConstraint: buildGoal?.secondary_constraint ?? 'protect_recovery',
    goalLabel: buildGoal?.goal_label ?? null,
    targetMetric: buildGoal?.target_metric ?? 'training_consistency',
    targetValue: buildGoal?.target_value ?? null,
    targetUnit: buildGoal?.target_unit ?? null,
    deadline: buildGoal?.target_date ?? null,
    horizonWeeks: buildGoal?.target_horizon_weeks ?? null,
    successWindow: buildGoal?.success_window ?? null,
  };
}

export async function resolveObjectiveContextWithDependencies(
  userId: string,
  date: string,
  dependencies: ObjectiveContextDependencies = defaultObjectiveContextDependencies,
): Promise<MacrocycleContext> {
  const [athleteContext, buildGoal, camp] = await Promise.all([
    dependencies.getAthleteContext(userId),
    dependencies.getActiveBuildPhaseGoal(userId),
    dependencies.getActiveFightCamp(userId),
  ]);

  const profile = athleteContext.profile;
  const effectiveWeight = profile?.base_weight != null
    ? await dependencies.getEffectiveWeight(userId, profile.base_weight)
    : null;
  const weightHistory = await dependencies.getWeightHistory(userId, 30);

  const campPhase = camp ? determineCampPhase(camp, date) : null;
  const phase = campPhase ? toCampEnginePhase(campPhase) : athleteContext.phase;
  const targetWeightLbs = camp?.targetWeight ?? profile?.target_weight ?? null;

  const weightTrend = profile && effectiveWeight != null
    ? calculateWeightTrend({
      weightHistory,
      targetWeightLbs,
      baseWeightLbs: profile.base_weight ?? effectiveWeight,
      phase,
      deadlineDate: camp?.fightDate ?? profile.fight_date ?? null,
    })
    : null;

  const weightClassState = camp?.weightClassState
    ?? (athleteContext.hasActiveWeightClassPlan ? 'driving' : 'none');
  const daysOut = camp?.fightDate ? Math.max(0, daysBetween(date, camp.fightDate)) : null;
  const isTravelWindow = Boolean(
    camp?.travelStartDate
    && camp.travelStartDate <= date
    && (!camp.travelEndDate || date <= camp.travelEndDate),
  );

  const performanceObjective = buildPerformanceObjective({
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    buildGoal,
    phase,
    camp,
    weightClassState,
    targetWeightLbs,
  });

  return {
    date,
    phase,
    goalMode: athleteContext.goalMode,
    performanceGoalType: athleteContext.performanceGoalType,
    performanceObjective,
    buildGoal,
    camp,
    campPhase,
    weightClassState,
    hasActiveWeightClassPlan: athleteContext.hasActiveWeightClassPlan,
    weighInTiming: camp?.weighInTiming ?? null,
    daysOut,
    isTravelWindow,
    currentWeightLbs: weightTrend?.currentWeight ?? effectiveWeight,
    targetWeightLbs,
    remainingWeightLbs: weightTrend?.remainingLbs ?? (effectiveWeight != null && targetWeightLbs != null ? Math.max(0, effectiveWeight - targetWeightLbs) : null),
    weightTrend,
  };
}
