import { supabase } from '../supabase';
import {
  WeightCutPlanRow,
  DailyCutProtocolRow,
  CutSafetyCheckRow,
  WeightCutHistoryRow,
  WeightCutDashboardData,
  CutPlanResult,
  DailyCutProtocolResult,
  CutPlanStatus,
  WeightDataPoint,
} from '../engine/types';
import { formatLocalDate, todayLocalDate } from '../utils/date';

// ─── Plan CRUD ─────────────────────────────────────────────────

export async function createWeightCutPlan(
  userId: string,
  input: {
    startWeight: number;
    targetWeight: number;
    weightClassName: string | null;
    sport: 'boxing' | 'mma';
    fightDate: string;
    weighInDate: string;
    fightStatus: 'amateur' | 'pro';
    biologicalSex: 'male' | 'female';
    planResult: CutPlanResult;
    coachNotes?: string;
  }
): Promise<WeightCutPlanRow> {
  const { planResult } = input;

  const row = {
    user_id: userId,
    start_weight: input.startWeight,
    target_weight: input.targetWeight,
    weight_class_name: input.weightClassName,
    sport: input.sport,
    fight_date: input.fightDate,
    weigh_in_date: input.weighInDate,
    plan_created_date: todayLocalDate(),
    fight_status: input.fightStatus,
    max_water_cut_pct: planResult.maxWaterCutPct,
    total_cut_lbs: planResult.totalCutLbs,
    diet_phase_target_lbs: planResult.dietPhaseTargetLbs,
    water_cut_allocation_lbs: planResult.waterCutAllocationLbs,
    chronic_phase_start: planResult.chronicPhaseDates?.start ?? null,
    chronic_phase_end: planResult.chronicPhaseDates?.end ?? null,
    intensified_phase_start: planResult.intensifiedPhaseDates.start,
    intensified_phase_end: planResult.intensifiedPhaseDates.end,
    fight_week_start: planResult.fightWeekDates.start,
    weigh_in_day: planResult.weighInDate,
    rehydration_start: planResult.weighInDate,
    status: 'active' as CutPlanStatus,
    safe_weekly_loss_rate: planResult.safeWeeklyLossRateLbs,
    calorie_floor: planResult.calorieFloor,
    coach_notes: input.coachNotes ?? null,
    baseline_cognitive_score: null,
  };

  const { data, error } = await supabase
    .from('weight_cut_plans')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  // Determine phase from days-to-fight
  const daysToFight = Math.round(
    (new Date(input.fightDate).getTime() - Date.now()) / 86400000
  );
  const newPhase = daysToFight <= 84 ? 'fight-camp' : daysToFight <= 168 ? 'pre-camp' : 'off-season';

  // Link plan to profile + override fight_date, sport, and phase
  await supabase
    .from('athlete_profiles')
    .update({
      active_cut_plan_id: data.id,
      fight_date: input.fightDate,
      sport: input.sport,
      phase: newPhase,
    })
    .eq('user_id', userId);

  return data as WeightCutPlanRow;
}

export async function getActiveWeightCutPlan(userId: string): Promise<WeightCutPlanRow | null> {
  const { data, error } = await supabase
    .from('weight_cut_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;  // PGRST116 = no rows
  return (data as WeightCutPlanRow) ?? null;
}

export async function updateWeightCutPlanStatus(
  planId: string,
  status: CutPlanStatus
): Promise<void> {
  const { error } = await supabase
    .from('weight_cut_plans')
    .update({ status, updated_at: new Date().toISOString(), completed_at: status === 'completed' || status === 'abandoned' ? new Date().toISOString() : null })
    .eq('id', planId);
  if (error) throw error;
}

export async function setBaselineCognitiveScore(planId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('weight_cut_plans')
    .update({ baseline_cognitive_score: score })
    .eq('id', planId);
  if (error) throw error;
}

export async function abandonWeightCutPlan(
  userId: string,
  planId: string,
  reason: 'fight_fell_through' | 'made_weight' | 'other' = 'other'
): Promise<void> {
  await updateWeightCutPlanStatus(planId, reason === 'made_weight' ? 'completed' : 'abandoned');
  // Clear the active cut and reset phase to off-season so other systems stop using cut targets
  await supabase
    .from('athlete_profiles')
    .update({ active_cut_plan_id: null, phase: 'off-season' })
    .eq('user_id', userId);
}

// ─── Daily Protocol ────────────────────────────────────────────

export async function upsertDailyCutProtocol(
  userId: string,
  planId: string,
  date: string,
  protocol: DailyCutProtocolResult
): Promise<void> {
  const row = {
    user_id: userId,
    plan_id: planId,
    date,
    cut_phase: protocol.cutPhase,
    days_to_weigh_in: protocol.daysToWeighIn,
    prescribed_calories: protocol.prescribedCalories,
    prescribed_protein: protocol.prescribedProtein,
    prescribed_carbs: protocol.prescribedCarbs,
    prescribed_fat: protocol.prescribedFat,
    is_refeed_day: protocol.isRefeedDay,
    is_carb_cycle_high: protocol.isCarbCycleHigh,
    water_target_oz: protocol.waterTargetOz,
    sodium_target_mg: protocol.sodiumTargetMg,
    sodium_instruction: protocol.sodiumInstruction,
    fiber_instruction: protocol.fiberInstruction,
    training_intensity_cap: protocol.trainingIntensityCap,
    training_recommendation: protocol.trainingRecommendation,
    morning_protocol: protocol.morningProtocol,
    afternoon_protocol: protocol.afternoonProtocol,
    evening_protocol: protocol.eveningProtocol,
    safety_flags: protocol.safetyFlags,
  };

  const { error } = await supabase
    .from('daily_cut_protocols')
    .upsert(row, { onConflict: 'user_id,date' });
  if (error) throw error;

  // Also update macro_ledger with cut phase + sodium info
  await supabase
    .from('macro_ledger')
    .update({
      cut_phase: protocol.cutPhase,
      sodium_target_mg: protocol.sodiumTargetMg,
      is_refeed_day: protocol.isRefeedDay,
      is_carb_cycle_high: protocol.isCarbCycleHigh,
    })
    .eq('user_id', userId)
    .eq('date', date);
}

export async function getDailyCutProtocol(
  userId: string,
  date: string
): Promise<DailyCutProtocolRow | null> {
  const { data, error } = await supabase
    .from('daily_cut_protocols')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as DailyCutProtocolRow) ?? null;
}

export async function updateProtocolCompliance(
  userId: string,
  date: string,
  fields: {
    actualWeight?: number;
    waterConsumedOz?: number;
    sodiumConsumedMg?: number;
    adherence?: 'followed' | 'partial' | 'missed';
  }
): Promise<void> {
  const { error } = await supabase
    .from('daily_cut_protocols')
    .update({
      actual_weight: fields.actualWeight,
      water_consumed_oz: fields.waterConsumedOz,
      sodium_consumed_mg: fields.sodiumConsumedMg,
      protocol_adherence: fields.adherence,
    })
    .eq('user_id', userId)
    .eq('date', date);
  if (error) throw error;
}

export async function getLastRefeedDate(userId: string, planId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('daily_cut_protocols')
    .select('date')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('is_refeed_day', true)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.date ?? null;
}

export async function getConsecutiveDepletedDays(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('daily_checkins')
    .select('date, readiness')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  if (error) return 0;
  if (!data || data.length === 0) return 0;

  let count = 0;
  for (const row of data) {
    if (row.readiness !== null && row.readiness <= 2) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ─── Safety Checks ─────────────────────────────────────────────

export async function upsertCutSafetyCheck(
  userId: string,
  planId: string,
  date: string,
  fields: Partial<Omit<CutSafetyCheckRow, 'id' | 'user_id' | 'plan_id' | 'date' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('cut_safety_checks')
    .upsert({ user_id: userId, plan_id: planId, date, ...fields }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function getRecentSafetyChecks(
  userId: string,
  planId: string,
  days = 7
): Promise<CutSafetyCheckRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('cut_safety_checks')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .gte('date', formatLocalDate(since))
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CutSafetyCheckRow[];
}

// ─── History ───────────────────────────────────────────────────

export async function completeCutPlan(
  userId: string,
  planId: string,
  outcome: {
    finalWeighInWeight?: number;
    madeWeight?: boolean;
    fightDayWeight?: number;
    rehydrationWeightRegained?: number;
  }
): Promise<void> {
  // Mark plan complete
  await updateWeightCutPlanStatus(planId, 'completed');
  await supabase
    .from('athlete_profiles')
    .update({ active_cut_plan_id: null })
    .eq('user_id', userId);

  // Gather plan summary
  const plan = await getActiveWeightCutPlan(userId);  // won't return now (completed), use direct fetch
  const { data: planData } = await supabase
    .from('weight_cut_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!planData) return;

  // Compute adherence
  const { data: protocols } = await supabase
    .from('daily_cut_protocols')
    .select('protocol_adherence, is_refeed_day')
    .eq('user_id', userId)
    .eq('plan_id', planId);

  const totalDays = protocols?.length ?? 0;
  const followedDays = protocols?.filter(p => p.protocol_adherence === 'followed').length ?? 0;
  const refeedDays = protocols?.filter(p => p.is_refeed_day).length ?? 0;
  const adherencePct = totalDays > 0 ? Math.round((followedDays / totalDays) * 100) : null;

  const durationDays = Math.round(
    (new Date().getTime() - new Date(planData.plan_created_date).getTime()) / 86400000
  );

  const dietLoss = planData.start_weight - (outcome.finalWeighInWeight ?? planData.target_weight) - (planData.water_cut_allocation_lbs ?? 0);

  await supabase.from('weight_cut_history').insert({
    user_id: userId,
    plan_id: planId,
    start_weight: planData.start_weight,
    final_weigh_in_weight: outcome.finalWeighInWeight ?? null,
    target_weight: planData.target_weight,
    made_weight: outcome.madeWeight ?? null,
    total_duration_days: durationDays,
    total_diet_loss_lbs: Math.max(0, dietLoss),
    total_water_cut_lbs: planData.water_cut_allocation_lbs,
    avg_weekly_loss_rate: durationDays > 7 ? Math.round(((planData.start_weight - (outcome.finalWeighInWeight ?? planData.target_weight)) / (durationDays / 7)) * 10) / 10 : null,
    rehydration_weight_regained: outcome.rehydrationWeightRegained ?? null,
    fight_day_weight: outcome.fightDayWeight ?? null,
    protocol_adherence_pct: adherencePct,
    refeed_days_used: refeedDays,
    fight_date: planData.fight_date,
  });
}

export async function getCutHistory(userId: string): Promise<WeightCutHistoryRow[]> {
  const { data, error } = await supabase
    .from('weight_cut_history')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WeightCutHistoryRow[];
}

// ─── Dashboard Aggregate ───────────────────────────────────────

export async function getWeightCutDashboardData(
  userId: string
): Promise<WeightCutDashboardData> {
  const todayStr = todayLocalDate();

  const [planRes, protocolRes, historyRes] = await Promise.all([
    getActiveWeightCutPlan(userId),
    getDailyCutProtocol(userId, todayStr),
    getCutHistory(userId),
  ]);

  let weightHistory: WeightDataPoint[] = [];
  let safetyChecks: CutSafetyCheckRow[] = [];
  let adherenceLast7Days = 0;
  let projectedWeightByWeighIn: number | null = null;

  if (planRes) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [weightRes, safetyRes, protocols7d] = await Promise.all([
      supabase
        .from('daily_checkins')
        .select('date, morning_weight')
        .eq('user_id', userId)
        .not('morning_weight', 'is', null)
        .gte('date', formatLocalDate(since))
        .order('date', { ascending: true }),
      getRecentSafetyChecks(userId, planRes.id, 7),
      supabase
        .from('daily_cut_protocols')
        .select('protocol_adherence')
        .eq('user_id', userId)
        .eq('plan_id', planRes.id)
        .not('protocol_adherence', 'is', null)
        .gte('date', formatLocalDate(new Date(Date.now() - 7 * 86400000))),
    ]);

    weightHistory = (weightRes.data ?? []).map(r => ({ date: r.date, weight: r.morning_weight }));
    safetyChecks = safetyRes;

    const p7 = protocols7d.data ?? [];
    const followed = p7.filter(p => p.protocol_adherence === 'followed').length;
    adherenceLast7Days = p7.length > 0 ? Math.round((followed / p7.length) * 100) : 0;

    // Project weight by weigh-in using linear trend
    if (weightHistory.length >= 7) {
      const recent = weightHistory.slice(-7);
      const oldHalf = recent.slice(0, 3).reduce((s, p) => s + p.weight, 0) / 3;
      const newHalf = recent.slice(4).reduce((s, p) => s + p.weight, 0) / 3;
      const weeklyVelocity = (newHalf - oldHalf) / (3.5 / 7);
      const daysLeft = Math.round(
        (new Date(planRes.weigh_in_date).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      const currentW = weightHistory[weightHistory.length - 1].weight;
      projectedWeightByWeighIn = Math.round((currentW + weeklyVelocity * (daysLeft / 7)) * 10) / 10;
    }
  }

  return {
    activePlan: planRes,
    todayProtocol: protocolRes,
    weightHistory,
    safetyChecks,
    cutHistory: historyRes,
    projectedWeightByWeighIn,
    adherenceLast7Days,
  };
}
