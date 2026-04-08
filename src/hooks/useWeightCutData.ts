import { useState, useEffect, useCallback } from 'react';
import { WeightCutDashboardData } from '../../lib/engine/types';
import {
  getWeightCutDashboardData,
  abandonWeightCutPlan,
  completeCutPlan,
  updateProtocolCompliance,
  upsertCutSafetyCheck,
  setBaselineCognitiveScore,
} from '../../lib/api/weightCutService';
import { getDailyEngineState } from '../../lib/api/dailyMissionService';
import { todayLocalDate } from '../../lib/utils/date';

interface WeightCutState {
  loading: boolean;
  error: string | null;
  data: WeightCutDashboardData | null;
}

export function useWeightCutData(userId: string | null) {
  const [state, setState] = useState<WeightCutState>({
    loading: false,
    error: null,
    data: null,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const dashboardData = await getWeightCutDashboardData(userId);
      const todayStr = todayLocalDate();

      if (dashboardData.activePlan && !dashboardData.todayProtocol) {
        try {
          await getDailyEngineState(userId, todayStr, { forceRefresh: true });
          const refreshed = await getWeightCutDashboardData(userId);
          setState({ loading: false, error: null, data: refreshed });
          return;
        } catch {
          setState({ loading: false, error: null, data: dashboardData });
          return;
        }
      }

      setState({ loading: false, error: null, data: dashboardData });
    } catch (err: any) {
      setState({ loading: false, error: err.message ?? 'Failed to load weight cut data', data: null });
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
      data: prev.data ? { ...prev.data, activePlan: null, todayProtocol: null } : null,
    }));
    try {
      await abandonWeightCutPlan(userId, planId, reason);
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
    await completeCutPlan(userId, state.data.activePlan.id, outcome);
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
    await upsertCutSafetyCheck(userId, planId, date, {
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

  const logCompliance = useCallback(async (adherence: 'followed' | 'partial' | 'missed', date: string = todayLocalDate()) => {
    if (!userId) return;
    await updateProtocolCompliance(userId, date, { adherence });
    await refresh();
  }, [userId, refresh]);

  return {
    loading: state.loading,
    error: state.error,
    activePlan: state.data?.activePlan ?? null,
    todayProtocol: state.data?.todayProtocol ?? null,
    weightHistory: state.data?.weightHistory ?? [],
    safetyChecks: state.data?.safetyChecks ?? [],
    cutHistory: state.data?.cutHistory ?? [],
    projectedWeightByWeighIn: state.data?.projectedWeightByWeighIn ?? null,
    adherenceLast7Days: state.data?.adherenceLast7Days ?? 0,
    refresh,
    abandon,
    complete,
    logSafetyCheck,
    logCompliance,
  };
}
