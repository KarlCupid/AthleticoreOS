import {
  calculateCampRisk,
  getHydrationProtocol,
  type MacrocycleContext,
} from '../../engine/index.ts';
import type { CampRiskAssessment } from '../../engine/calculateCampRisk';

export interface HydrationRiskDependencies {
  getHydrationProtocol: typeof getHydrationProtocol;
  calculateCampRisk: typeof calculateCampRisk;
}

export interface HydrationRiskResult {
  hydration: ReturnType<typeof getHydrationProtocol>;
  riskAssessment: CampRiskAssessment | null;
}

export const defaultHydrationRiskDependencies: HydrationRiskDependencies = {
  getHydrationProtocol,
  calculateCampRisk,
};

export function resolveHydrationAndRisk(
  input: {
    objectiveContext: MacrocycleContext;
    fightStatus: 'amateur' | 'pro';
    currentWeightLbs: number;
    targetWeightLbs: number;
    acwrRatio: number;
  },
  dependencies: HydrationRiskDependencies = defaultHydrationRiskDependencies,
): HydrationRiskResult {
  const hydration = dependencies.getHydrationProtocol({
    phase: input.objectiveContext.phase,
    fightStatus: input.fightStatus,
    currentWeightLbs: input.currentWeightLbs,
    targetWeightLbs: input.targetWeightLbs,
    weeklyVelocityLbs: input.objectiveContext.weightTrend?.weeklyVelocityLbs,
  });

  const riskAssessment = dependencies.calculateCampRisk({
    goalMode: input.objectiveContext.goalMode,
    weightClassState: input.objectiveContext.weightClassState,
    daysOut: input.objectiveContext.daysOut,
    remainingWeightLbs: input.objectiveContext.remainingWeightLbs,
    weighInTiming: input.objectiveContext.weighInTiming,
    acwrRatio: input.acwrRatio,
    isTravelWindow: input.objectiveContext.isTravelWindow,
  });

  return {
    hydration,
    riskAssessment: riskAssessment ?? null,
  };
}
