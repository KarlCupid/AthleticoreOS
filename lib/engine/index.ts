export { calculateACWR } from './calculateACWR.ts';
export { getHydrationProtocol, getCutHydrationProtocol } from './getHydrationProtocol.ts';
export { adjustForBiology } from './adjustForBiology.ts';
export { getGlobalReadinessState } from './getGlobalReadinessState.ts';
export { handleTimelineShift, autoRegulateSC } from './adaptive.ts';
export { initFatigueState, processSetCompletion, findSubstituteExercise, getRestTimerDefaults, getRestDuration } from './adaptiveWorkout.ts';
export { calculateNutritionTargets, computeMacroAdherence, resolveDailyNutritionTargets, resolveDailyMacros } from './calculateNutrition.ts';
export { calculateWeightTrend, calculateWeightCorrection, calculateWeightReadinessPenalty } from './calculateWeight.ts';
export { calculateCampRisk } from './calculateCampRisk.ts';
export { DAILY_ENGINE_VERSION, buildDailyMission, buildMicrocyclePlan, deriveProtectWindowFromRecentMissions } from './calculateMission.ts';
export * from './calculateCamp.ts';
export * from './calculateConditioning.ts';
export * from './calculateDailyCoachDebrief.ts';
export * from './calculateFitness.ts';
export * from './calculateOverload.ts';
export * from './calculateRoadWork.ts';
export {
  determineFocus,
  scoreExerciseForUser,
  generateWorkout,
  generateWorkoutV2,
  calculateVolumeLoad,
  calculateWeeklyVolume,
  getWorkoutCompliance,
} from './calculateSC.ts';
export {
  getRecoveryWindow,
  validateDayLoad,
  suggestAlternative,
  detectOvertrainingRisk,
  generateWeekPlan,
  generateBlockPlan,
  getBoxingIntensityScalar,
  calculateWeeklyCompliance,
  getTrainingStreak,
} from './calculateSchedule.ts';
export {
  generateAdaptiveSmartWeekPlan,
  generateAdaptiveSmartWeekPlan as generateSmartWeekPlan,
} from './adaptiveTrainingAdapter.ts';
export * from './performancePlanner.ts';
export * from './resources/scProgrammingResources.ts';
export * from './readiness/profile.ts';
export * from './safety/policy.ts';
export * from './sessionOwnership.ts';
export * from './sessionLabels.ts';
export { 
  generateCutPlan, 
  determineCutPhase, 
  computeDailyCutProtocol,
  getDailyCutIntensityCap
} from './calculateWeightCut.ts';

export * from './types.ts';

export type { CampRiskInput, CampRiskAssessment, CampRiskLevel } from './calculateCampRisk.ts';
export { formatLocalDate, todayLocalDate } from '../utils/date.ts';
