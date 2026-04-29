import { useState, useEffect, useCallback } from 'react';
import { BodyMassDashboardData } from '../../lib/engine/types';
import {
  getBodyMassDashboardData,
  abandonWeightClassPlan,
  completeWeightClassPlan,
  upsertBodyMassSafetyCheck,
  setBaselineCognitiveScore,
} from '../../lib/api/weightClassPlanService';
import { getDailyEngineState } from '../../lib/api/dailyPerformanceService';
import {
  buildGuidedBodyMassViewModel,
  buildUnifiedPerformanceViewModel,
  type GuidedBodyMassViewModel,
  type UnifiedPerformanceViewModel,
} from '../../lib/performance-engine';
import { todayLocalDate } from '../../lib/utils/date';

interface BodyMassPlanState {
  loading: boolean;
  error: string | null;
  data: BodyMassDashboardData | null;
  performanceContext: UnifiedPerformanceViewModel;
  guidedBodyMass: GuidedBodyMassViewModel;
}

export function useBodyMassPlanData(userId: string | null) {
  const [state, setState] = useState<BodyMassPlanState>({
    loading: false,
    error: null,
    data: null,
    performanceContext: buildUnifiedPerformanceViewModel(null),
    guidedBodyMass: buildGuidedBodyMassViewModel(null),
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const dashboardData = await getBodyMassDashboardData(userId);
      const todayStr = todayLocalDate();
      const forceRefresh = Boolean(dashboardData.activePlan);
      let performanceContext = buildUnifiedPerformanceViewModel(null);
      let guidedBodyMass = buildGuidedBodyMassViewModel(null);

      try {
        const engineState = await getDailyEngineState(userId, todayStr, { forceRefresh });
        performanceContext = buildUnifiedPerformanceViewModel(engineState.unifiedPerformance);
        guidedBodyMass = buildGuidedBodyMassViewModel(engineState.unifiedPerformance);
      } catch {
        performanceContext = buildUnifiedPerformanceViewModel(null);
        guidedBodyMass = buildGuidedBodyMassViewModel(null);
      }

      const refreshedDashboardData = forceRefresh
        ? await getBodyMassDashboardData(userId)
        : dashboardData;

      setState({ loading: false, error: null, data: refreshedDashboardData, performanceContext, guidedBodyMass });
    } catch (err: any) {
      setState({
        loading: false,
        error: err.message ?? 'Failed to load weight-class data',
        data: null,
        performanceContext: buildUnifiedPerformanceViewModel(null),
        guidedBodyMass: buildGuidedBodyMassViewModel(null),
      });
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const abandon = useCallback(async (reason: 'fight_fell_through' | 'made_weight' | 'other' = 'other') => {
    if (!userId || !state.data?.activePlan) return;
    const planId = state.data.activePlan.id;
    setState((prev) => ({
      ...prev,
      data: prev.data ? { ...prev.data, activePlan: null } : null,
    }));
    try {
      await abandonWeightClassPlan(userId, planId, reason);
    } finally {
      await refresh();
    }
  }, [userId, state.data?.activePlan, refresh]);

  const complete = useCallback(async (outcome: {
    finalWeighInWeight?: number;
    madeWeight?: boolean;
    fightDayWeight?: number;
    rehydrationWeightRegained?: number;
  }) => {
    if (!userId || !state.data?.activePlan) return;
    await completeWeightClassPlan(userId, state.data.activePlan.id, outcome);
    await refresh();
  }, [userId, state.data?.activePlan, refresh]);

  const logSafetyCheck = useCallback(async (fields: {
    urineColor?: number;
    bodyTempF?: number;
    cognitiveScore?: number;
    moodRating?: number;
    dizziness?: boolean;
    headache?: boolean;
    muscleCramps?: boolean;
    postWeighInWeight?: number;
    rehydrationWeightRegained?: number;
  }) => {
    if (!userId || !state.data?.activePlan) return;
    const planId = state.data.activePlan.id;
    const date = todayLocalDate();
    await upsertBodyMassSafetyCheck(userId, planId, date, {
      urine_color: fields.urineColor,
      body_temp_f: fields.bodyTempF,
      cognitive_score: fields.cognitiveScore,
      mood_rating: fields.moodRating,
      dizziness: fields.dizziness,
      headache: fields.headache,
      muscle_cramps: fields.muscleCramps,
      post_weigh_in_weight: fields.postWeighInWeight,
      rehydration_weight_regained: fields.rehydrationWeightRegained,
    });
    if (fields.cognitiveScore && !state.data.activePlan.baseline_cognitive_score) {
      await setBaselineCognitiveScore(planId, fields.cognitiveScore);
    }
    await refresh();
  }, [userId, state.data?.activePlan, refresh]);

  return {
    loading: state.loading,
    error: state.error,
    activePlan: state.data?.activePlan ?? null,
    weightHistory: state.data?.weightHistory ?? [],
    safetyChecks: state.data?.safetyChecks ?? [],
    weightClassHistory: state.data?.weightClassHistory ?? [],
    projectedWeightByWeighIn: state.data?.projectedWeightByWeighIn ?? null,
    adherenceLast7Days: state.data?.adherenceLast7Days ?? 0,
    performanceContext: state.performanceContext,
    guidedBodyMass: state.guidedBodyMass,
    refresh,
    abandon,
    complete,
    logSafetyCheck,
  };
}
