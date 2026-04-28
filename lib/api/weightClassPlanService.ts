import { supabase } from '../supabase';
import {
  WeightClassPlanRow,
  BodyMassSafetyCheckRow,
  WeightClassHistoryRow,
  BodyMassDashboardData,
  WeightClassPlanStatus,
  WeightDataPoint,
} from '../engine/types';
import type { WeightClassManagementResult } from '../performance-engine';
import { formatLocalDate, todayLocalDate } from '../utils/date';

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000);
}

function bodyMassPlanDates(evaluation: WeightClassManagementResult, asOfDate: string) {
  const weighInDate = evaluation.plan.weighInDate ?? evaluation.plan.competitionDate ?? asOfDate;
  const timeframeDays = evaluation.plan.timeframeDays ?? Math.max(0, daysBetween(asOfDate, weighInDate));
  const competitionWeekStart = addDays(weighInDate, -Math.min(7, timeframeDays));
  const prepEnd = addDays(competitionWeekStart, -1);

  return {
    weighInDate,
    chronicPhaseStart: timeframeDays > 56 ? asOfDate : null,
    chronicPhaseEnd: timeframeDays > 56 ? addDays(weighInDate, -57) : null,
    intensifiedPhaseStart: timeframeDays > 7 ? asOfDate : competitionWeekStart,
    intensifiedPhaseEnd: timeframeDays > 7 ? prepEnd : weighInDate,
    competitionWeekStart,
  };
}

function toWeightClassPlan(row: WeightClassPlanRow): WeightClassPlanRow {
  return row;
}

function toWeightClassHistory(row: WeightClassHistoryRow): WeightClassHistoryRow {
  return row;
}

// ─── Plan CRUD ─────────────────────────────────────────────────

export async function createWeightClassPlan(
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
    weightClassEvaluation: WeightClassManagementResult;
    coachNotes?: string;
  }
): Promise<WeightClassPlanRow> {
  const { weightClassEvaluation } = input;
  const { plan } = weightClassEvaluation;

  if (!weightClassEvaluation.shouldGenerateProtocol || plan.professionalReviewRequired) {
    throw new Error('This weight-class target requires a safer class, longer timeline, or qualified review before activation.');
  }

  const asOfDate = todayLocalDate();
  const dates = bodyMassPlanDates(weightClassEvaluation, asOfDate);
  const requiredChange = Math.max(0, plan.requiredChange.value ?? input.startWeight - input.targetWeight);

  const row = {
    user_id: userId,
    start_weight: input.startWeight,
    target_weight: input.targetWeight,
    weight_class_name: input.weightClassName,
    sport: input.sport,
    fight_date: input.fightDate,
    weigh_in_date: input.weighInDate,
    plan_created_date: asOfDate,
    fight_status: input.fightStatus,
    max_fight_week_body_mass_change_pct: 0,
    required_body_mass_change_lbs: requiredChange,
    gradual_body_mass_target_lbs: requiredChange,
    competition_week_body_mass_change_lbs: 0,
    chronic_phase_start: dates.chronicPhaseStart,
    chronic_phase_end: dates.chronicPhaseEnd,
    intensified_phase_start: dates.intensifiedPhaseStart,
    intensified_phase_end: dates.intensifiedPhaseEnd,
    fight_week_start: dates.competitionWeekStart,
    weigh_in_day: dates.weighInDate,
    rehydration_start: dates.weighInDate,
    status: 'active' as WeightClassPlanStatus,
    safe_weekly_loss_rate: Math.max(0, plan.requiredRateOfChange.value ?? 0),
    calorie_floor: 1800,
    coach_notes: input.coachNotes ?? null,
    baseline_cognitive_score: null,
    risk_acknowledged_at: null,
    risk_acknowledgement_version: null,
    risk_warning_snapshot: [...plan.safetyFlags, ...plan.riskFlags],
  };

  const { data, error } = await supabase
    .from('weight_class_plans')
    .insert(row)
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('athlete_profiles')
    .update({
      active_weight_class_plan_id: data.id,
      fight_date: input.fightDate,
      sport: input.sport,
    })
    .eq('user_id', userId);

  return toWeightClassPlan(data as WeightClassPlanRow);
}

export async function getActiveWeightClassPlan(userId: string): Promise<WeightClassPlanRow | null> {
  const { data, error } = await supabase
    .from('weight_class_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;  // PGRST116 = no rows
  return data ? toWeightClassPlan(data as WeightClassPlanRow) : null;
}

export async function updateWeightClassPlanStatus(
  planId: string,
  status: WeightClassPlanStatus
): Promise<void> {
  const { error } = await supabase
    .from('weight_class_plans')
    .update({ status, updated_at: new Date().toISOString(), completed_at: status === 'completed' || status === 'abandoned' ? new Date().toISOString() : null })
    .eq('id', planId);
  if (error) throw error;
}

export async function setBaselineCognitiveScore(planId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('weight_class_plans')
    .update({ baseline_cognitive_score: score })
    .eq('id', planId);
  if (error) throw error;
}

export async function abandonWeightClassPlan(
  userId: string,
  planId: string,
  reason: 'fight_fell_through' | 'made_weight' | 'other' = 'other'
): Promise<void> {
  await updateWeightClassPlanStatus(planId, reason === 'made_weight' ? 'completed' : 'abandoned');
  await supabase
    .from('athlete_profiles')
    .update({ active_weight_class_plan_id: null })
    .eq('user_id', userId);
}

// ─── Body-Mass Guidance ────────────────────────────────────────────

// ─── Safety Checks ─────────────────────────────────────────────

export async function upsertBodyMassSafetyCheck(
  userId: string,
  planId: string,
  date: string,
  fields: Partial<Omit<BodyMassSafetyCheckRow, 'id' | 'user_id' | 'plan_id' | 'date' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('body_mass_safety_checks')
    .upsert({ user_id: userId, plan_id: planId, date, ...fields }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function getRecentSafetyChecks(
  userId: string,
  planId: string,
  days = 7
): Promise<BodyMassSafetyCheckRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('body_mass_safety_checks')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .gte('date', formatLocalDate(since))
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as BodyMassSafetyCheckRow[];
}

// ─── History ───────────────────────────────────────────────────

export async function completeWeightClassPlan(
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
  await updateWeightClassPlanStatus(planId, 'completed');
  await supabase
    .from('athlete_profiles')
    .update({ active_weight_class_plan_id: null })
    .eq('user_id', userId);

  // Gather plan summary
  const { data: planData } = await supabase
    .from('weight_class_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!planData) return;

  const durationDays = Math.round(
    (new Date().getTime() - new Date(planData.plan_created_date).getTime()) / 86400000
  );

  const gradualBodyMassChange = planData.start_weight
    - (outcome.finalWeighInWeight ?? planData.target_weight)
    - (planData.competition_week_body_mass_change_lbs ?? 0);

  await supabase.from('weight_class_history').insert({
    user_id: userId,
    plan_id: planId,
    start_weight: planData.start_weight,
    final_weigh_in_weight: outcome.finalWeighInWeight ?? null,
    target_weight: planData.target_weight,
    made_weight: outcome.madeWeight ?? null,
    total_duration_days: durationDays,
    gradual_body_mass_change_lbs: Math.max(0, gradualBodyMassChange),
    competition_week_body_mass_change_lbs: planData.competition_week_body_mass_change_lbs,
    avg_weekly_loss_rate: durationDays > 7 ? Math.round(((planData.start_weight - (outcome.finalWeighInWeight ?? planData.target_weight)) / (durationDays / 7)) * 10) / 10 : null,
    rehydration_weight_regained: outcome.rehydrationWeightRegained ?? null,
    fight_day_weight: outcome.fightDayWeight ?? null,
    adherence_pct: null,
    refeed_days_used: 0,
    fight_date: planData.fight_date,
  });
}

export async function getWeightClassHistory(userId: string): Promise<WeightClassHistoryRow[]> {
  const { data, error } = await supabase
    .from('weight_class_history')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as WeightClassHistoryRow[]).map(toWeightClassHistory);
}

// ─── Dashboard Aggregate ───────────────────────────────────────

export async function getBodyMassDashboardData(
  userId: string
): Promise<BodyMassDashboardData> {
  const todayStr = todayLocalDate();

  const [planRes, historyRes] = await Promise.all([
    getActiveWeightClassPlan(userId),
    getWeightClassHistory(userId),
  ]);

  let weightHistory: WeightDataPoint[] = [];
  let safetyChecks: BodyMassSafetyCheckRow[] = [];
  let adherenceLast7Days = 0;
  let projectedWeightByWeighIn: number | null = null;

  if (planRes) {
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [weightRes, safetyRes] = await Promise.all([
      supabase
        .from('daily_checkins')
        .select('date, morning_weight')
        .eq('user_id', userId)
        .not('morning_weight', 'is', null)
        .gte('date', formatLocalDate(since))
        .order('date', { ascending: true }),
      getRecentSafetyChecks(userId, planRes.id, 7),
    ]);

    weightHistory = (weightRes.data ?? []).map(r => ({ date: r.date, weight: r.morning_weight }));
    safetyChecks = safetyRes;

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
    weightHistory,
    safetyChecks,
    weightClassHistory: historyRes,
    projectedWeightByWeighIn,
    adherenceLast7Days,
  };
}
