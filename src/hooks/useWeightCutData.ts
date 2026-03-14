import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  WeightCutDashboardData,
  DailyCutProtocolInput,
} from '../../lib/engine/types';
import {
  getWeightCutDashboardData,
  upsertDailyCutProtocol,
  getLastRefeedDate,
  getConsecutiveDepletedDays,
  abandonWeightCutPlan,
  completeCutPlan,
  updateProtocolCompliance,
  upsertCutSafetyCheck,
  setBaselineCognitiveScore,
} from '../../lib/api/weightCutService';
import { computeDailyCutProtocol } from '../../lib/engine/calculateWeightCut';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { calculateNutritionTargets } from '../../lib/engine/calculateNutrition';
import { getEffectiveWeight, getWeightHistory } from '../../lib/api/weightService';
import { todayLocalDate } from '../../lib/utils/date';
import { logWarn } from '../../lib/utils/logger';

// ─── State Shape ───────────────────────────────────────────────

interface WeightCutState {
  loading: boolean;
  error: string | null;
  data: WeightCutDashboardData | null;
}

// ─── useWeightCutData ──────────────────────────────────────────

export function useWeightCutData(userId: string | null) {
  const [state, setState] = useState<WeightCutState>({
    loading: false,
    error: null,
    data: null,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const dashboardData = await getWeightCutDashboardData(userId);

      // If plan is active and no protocol yet today, compute and persist it.
      // This is done in a separate try/catch so a computation failure does NOT
      // hide the fact that an active plan exists.
      const todayStr = todayLocalDate();
      if (dashboardData.activePlan && !dashboardData.todayProtocol) {
        try {
          const plan = dashboardData.activePlan;

          const [effectiveWeight, weightHistory, lastRefeed, consecutiveDepleted, profileRes] = await Promise.all([
            getEffectiveWeight(userId, plan.start_weight),
            getWeightHistory(userId, 14),
            getLastRefeedDate(userId, plan.id),
            getConsecutiveDepletedDays(userId),
            supabase
              .from('athlete_profiles')
              .select('*')
              .eq('user_id', userId)
              .single(),
          ]);

          const profile = profileRes.data;
          if (!profile) throw new Error('Profile not found');

          const profileCycleDayRaw = (profile as any)?.cycle_day ?? null;
          const profileCycleDay = Number.isInteger(profileCycleDayRaw) && profileCycleDayRaw >= 1 && profileCycleDayRaw <= 28
            ? profileCycleDayRaw
            : null;

          const baseNutrition = calculateNutritionTargets({
            weightLbs: effectiveWeight,
            heightInches: profile.height_inches,
            age: profile.age,
            biologicalSex: profile.biological_sex ?? 'male',
            activityLevel: profile.activity_level ?? 'moderate',
            phase: profile.phase ?? 'off-season',
            nutritionGoal: profile.nutrition_goal ?? 'maintain',
            cycleDay: profileCycleDay,
            coachProteinOverride: profile.coach_protein_override ?? null,
            coachCarbsOverride: profile.coach_carbs_override ?? null,
            coachFatOverride: profile.coach_fat_override ?? null,
            coachCaloriesOverride: profile.coach_calories_override ?? null,
          });

          let weeklyVelocity = 0;
          if (weightHistory.length >= 7) {
            const recent7 = weightHistory.slice(-7).reduce((s, p) => s + p.weight, 0) / 7;
            const prev7Slice = weightHistory.length >= 14 ? weightHistory.slice(-14, -7) : weightHistory.slice(0, Math.max(1, weightHistory.length - 7));
            const prev7 = prev7Slice.reduce((s, p) => s + p.weight, 0) / prev7Slice.length;
            weeklyVelocity = Math.round((recent7 - prev7) * 10) / 10;
          }

          const { data: todayActivities } = await supabase
            .from('scheduled_activities')
            .select('activity_type, expected_intensity, estimated_duration_min')
            .eq('user_id', userId)
            .eq('date', todayStr)
            .eq('status', 'scheduled');

          const { data: todayCheckin } = await supabase
            .from('daily_checkins')
            .select('*')
            .eq('user_id', userId)
            .eq('date', todayStr)
            .maybeSingle();

          const acwrResult = await calculateACWR({
            userId,
            supabaseClient: supabase,
            asOfDate: todayStr,
            fitnessLevel: (profile?.fitness_level as any) ?? 'intermediate',
            phase: (profile?.phase as any) ?? 'off-season',
            isOnActiveCut: true,
          });
          const rawCycleDay = (todayCheckin as any)?.cycle_day ?? (profile as any)?.cycle_day ?? null;
          const cycleDay = Number.isInteger(rawCycleDay) && rawCycleDay >= 1 && rawCycleDay <= 28
            ? rawCycleDay
            : null;

          const protocolInput: DailyCutProtocolInput = {
            plan,
            date: todayStr,
            currentWeight: effectiveWeight,
            weightHistory,
            baseNutritionTargets: baseNutrition,
            dayActivities: todayActivities ?? [],
            readinessState: (todayCheckin?.readiness ?? 3) >= 4 ? 'Prime' : (todayCheckin?.readiness ?? 3) >= 3 ? 'Caution' : 'Depleted',
            acwr: acwrResult.ratio,
            biologicalSex: profile.biological_sex ?? 'male',
            cycleDay,
            weeklyVelocityLbs: weeklyVelocity,
            lastRefeedDate: lastRefeed,
            lastDietBreakDate: null,
            baselineCognitiveScore: plan.baseline_cognitive_score,
            latestCognitiveScore: todayCheckin?.cognitive_score ?? null,
            urineColor: todayCheckin?.urine_color ?? null,
            bodyTempF: todayCheckin?.body_temp_f ?? null,
            consecutiveDepletedDays: consecutiveDepleted,
          };

          const protocol = computeDailyCutProtocol(protocolInput);
          await upsertDailyCutProtocol(userId, plan.id, todayStr, protocol);

          // Re-fetch with the new protocol
          const refreshed = await getWeightCutDashboardData(userId);
          setState({ loading: false, error: null, data: refreshed });
          return;
        } catch (protocolErr: any) {
          // Protocol computation failed — show the plan anyway without today's protocol
          logWarn('useWeightCutData.computeDailyProtocol', protocolErr, { userId, date: todayStr });
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

  // ── Actions ──────────────────────────────────────────────────

  const abandon = useCallback(async (reason: 'fight_fell_through' | 'made_weight' | 'other' = 'other') => {
    if (!userId || !state.data?.activePlan) return;
    const planId = state.data.activePlan.id;
    // Optimistically clear so the screen transitions to "No Active Cut" immediately
    setState(prev => ({
      ...prev,
      data: prev.data ? { ...prev.data, activePlan: null, todayProtocol: null } : null,
    }));
    try {
      await abandonWeightCutPlan(userId, planId, reason);
    } finally {
      // Sync with DB state after the operation
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
    });
    // If first cognitive score, set as baseline
    if (fields.cognitiveScore && !state.data.activePlan.baseline_cognitive_score) {
      await setBaselineCognitiveScore(planId, fields.cognitiveScore);
    }
    await refresh();
  }, [userId, state.data?.activePlan, refresh]);

  const logCompliance = useCallback(async (adherence: 'followed' | 'partial' | 'missed') => {
    if (!userId) return;
    const date = todayLocalDate();
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



