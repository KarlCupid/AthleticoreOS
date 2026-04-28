import { supabase } from '../supabase';
import { generateCampPlan, determineCampPhase, toCampEnginePhase } from '../engine/calculateCamp';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { getAthleteContext } from './athleteContextService';
import { getEffectiveWeight } from './weightService';
import { createFightOpportunity, mapPerformancePhaseToLegacyPhase } from '../performance-engine';
import { PLANNING_SETUP_VERSION } from './planningConstants';
import type {
  CampConfig,
  CampPlanInput,
  CampPlanRow,
  Phase,
  FitnessLevel,
  FightCampSetupInput,
  FightCampStatus,
  WeightCutInfluenceState,
  WeighInTiming,
} from '../engine/types';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

function normalizeStatus(rawStatus: string | null | undefined): 'active' | 'completed' | 'abandoned' {
  if (rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'abandoned') {
    return rawStatus;
  }
  if (rawStatus === 'cancelled') {
    return 'abandoned';
  }
  return 'active';
}

export function normalizeCampConfig(raw: CampPlanRow | CampConfig | null): CampConfig | null {
  if (!raw) return null;

  if ('fightDate' in raw && 'campStartDate' in raw) {
    return {
      ...raw,
      status: normalizeStatus(raw.status),
    } as CampConfig;
  }

  const row = raw as CampPlanRow;
  return {
    id: row.id,
    user_id: row.user_id,
    fightDate: row.fight_date,
    campStartDate: row.camp_start_date,
    totalWeeks: row.total_weeks,
    hasConcurrentCut: row.has_concurrent_cut,
    basePhaseDates: {
      start: row.base_phase_start,
      end: row.base_phase_end,
    },
    buildPhaseDates: {
      start: row.build_phase_start,
      end: row.build_phase_end,
    },
    peakPhaseDates: {
      start: row.peak_phase_start,
      end: row.peak_phase_end,
    },
    taperPhaseDates: {
      start: row.taper_phase_start,
      end: row.taper_phase_end,
    },
    status: normalizeStatus(row.status),
    weighInTiming: row.weigh_in_timing ?? 'next_day',
    targetWeight: row.target_weight ?? null,
    roundCount: row.round_count ?? null,
    roundDurationSec: row.round_duration_sec ?? null,
    restDurationSec: row.rest_duration_sec ?? null,
    travelStartDate: row.travel_start_date ?? null,
    travelEndDate: row.travel_end_date ?? null,
    weightCutState: row.weight_cut_state ?? null,
  };
}

export function computeWeightCutInfluenceState(input: {
  hasActiveCutPlan: boolean;
  currentWeight: number | null;
  targetWeight: number | null;
  fightDate: string | null;
  weighInTiming?: WeighInTiming | null;
  asOfDate?: string;
}): WeightCutInfluenceState {
  if (input.hasActiveCutPlan) return 'driving';
  if (input.currentWeight == null || input.targetWeight == null || !input.fightDate) return 'none';

  const asOf = input.asOfDate ?? todayLocalDate();
  const daysToFight = Math.max(0, daysBetween(asOf, input.fightDate));
  const remainingLbs = Math.max(0, input.currentWeight - input.targetWeight);

  if (remainingLbs <= 0) return 'none';

  const weeksToFight = Math.max(0.5, daysToFight / 7);
  const requiredWeeklyLoss = remainingLbs / weeksToFight;
  const pctPerWeek = input.currentWeight > 0 ? requiredWeeklyLoss / input.currentWeight : 0;
  const sameDayUnsafe = (input.weighInTiming ?? 'next_day') === 'same_day'
    && remainingLbs > Math.max(1.5, input.currentWeight * 0.02);

  const isDriving =
    (daysToFight <= 56 && remainingLbs > 2) ||
    pctPerWeek > 0.01 ||
    sameDayUnsafe;

  if (isDriving) return 'driving';
  return 'monitoring';
}

export async function getActiveFightCamp(userId: string): Promise<CampConfig | null> {
  const { data, error } = await supabase
    .from('fight_camps')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return normalizeCampConfig((data as CampPlanRow | null) ?? null);
}

export async function resolvePhaseForDate(
  userId: string,
  date: string,
  fallbackPhase: Phase,
): Promise<Phase> {
  const camp = await getActiveFightCamp(userId);
  if (!camp) return fallbackPhase;

  const campPhase = determineCampPhase(camp, date);
  if (!campPhase) return fallbackPhase;
  return toCampEnginePhase(campPhase);
}

export async function getGuidedWorkoutContext(userId: string, date: string): Promise<{
  phase: Phase;
  fitnessLevel: FitnessLevel;
  isCampActive: boolean;
}> {
  const athleteContext = await getAthleteContext(userId);
  const resolvedPhase = await resolvePhaseForDate(userId, date, athleteContext.phase);

  return {
    phase: resolvedPhase,
    fitnessLevel: athleteContext.fitnessLevel,
    isCampActive: athleteContext.goalMode === 'fight_camp',
  };
}

export async function setupFightCamp(userId: string, input: FightCampSetupInput): Promise<CampConfig | null> {
  const athleteContext = await getAthleteContext(userId);

  if (input.goalMode === 'build_phase') {
    await supabase
      .from('fight_camps')
      .update({ status: 'completed' })
      .eq('user_id', userId)
      .eq('status', 'active');

    await supabase
      .from('athlete_profiles')
      .update({
        athlete_goal_mode: 'build_phase',
        performance_goal_type: input.performanceGoalType ?? 'conditioning',
        planning_setup_version: PLANNING_SETUP_VERSION,
        phase: mapPerformancePhaseToLegacyPhase('build'),
      })
      .eq('user_id', userId);

    return null;
  }

  if (!input.fightDate) {
    throw new Error('Fight date is required for fight camp setup.');
  }

  const today = todayLocalDate();
  const defaultCampStart = (() => {
    const candidate = addDays(input.fightDate!, -84);
    return candidate < today ? today : candidate;
  })();

  const campStartDate = input.campStartDate ?? defaultCampStart;

  if (input.travelStartDate && input.travelEndDate && input.travelEndDate < input.travelStartDate) {
    throw new Error('Travel end date must be on or after travel start date.');
  }
  const hasConcurrentCut = Boolean(athleteContext.profile?.active_cut_plan_id);
  const currentWeight = athleteContext.profile?.base_weight
    ? await getEffectiveWeight(userId, athleteContext.profile.base_weight)
    : null;

  const weightCutState = computeWeightCutInfluenceState({
    hasActiveCutPlan: hasConcurrentCut,
    currentWeight,
    targetWeight: input.targetWeight ?? athleteContext.profile?.target_weight ?? null,
    fightDate: input.fightDate,
    weighInTiming: input.weighInTiming ?? 'next_day',
    asOfDate: today,
  });

  const generated = generateCampPlan({
    fightDate: input.fightDate,
    campStartDate,
    fitnessLevel: athleteContext.fitnessLevel,
    hasConcurrentCut,
    userId,
  } as CampPlanInput);

  const { data: activeCamp } = await supabase
    .from('fight_camps')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  const payload = {
    user_id: userId,
    fight_date: generated.fightDate,
    camp_start_date: generated.campStartDate,
    total_weeks: generated.totalWeeks,
    has_concurrent_cut: generated.hasConcurrentCut,
    base_phase_start: generated.basePhaseDates.start,
    base_phase_end: generated.basePhaseDates.end,
    build_phase_start: generated.buildPhaseDates.start,
    build_phase_end: generated.buildPhaseDates.end,
    peak_phase_start: generated.peakPhaseDates.start,
    peak_phase_end: generated.peakPhaseDates.end,
    taper_phase_start: generated.taperPhaseDates.start,
    taper_phase_end: generated.taperPhaseDates.end,
    weigh_in_timing: input.weighInTiming ?? 'next_day',
    target_weight: input.targetWeight ?? athleteContext.profile?.target_weight ?? null,
    round_count: input.roundCount ?? 3,
    round_duration_sec: input.roundDurationSec ?? 180,
    rest_duration_sec: input.restDurationSec ?? 60,
    travel_start_date: input.travelStartDate ?? null,
    travel_end_date: input.travelEndDate ?? null,
    weight_cut_state: weightCutState,
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  const upsertPayload = activeCamp?.id ? { ...payload, id: activeCamp.id } : payload;

  const { data, error } = await supabase
    .from('fight_camps')
    .upsert(upsertPayload as Record<string, unknown>)
    .select('*')
    .single();

  if (error) throw error;

  const camp = normalizeCampConfig(data as CampPlanRow);
  const targetWeight = input.targetWeight ?? athleteContext.profile?.target_weight ?? null;
  const opportunity = createFightOpportunity({
    id: activeCamp?.id ?? `${userId}:fight-opportunity:${input.fightDate}`,
    athleteId: userId,
    status: 'confirmed',
    asOfDate: today,
    createdAt: new Date().toISOString(),
    currentPhase: athleteContext.goalMode === 'fight_camp' ? 'camp' : 'build',
    competitionDate: input.fightDate,
    targetWeightLbs: targetWeight,
  });
  const phaseForToday = camp ? determineCampPhase(camp, today) : null;
  const generatedCampLegacyPhase = phaseForToday ? toCampEnginePhase(phaseForToday) : null;
  const recommendedLegacyPhase = mapPerformancePhaseToLegacyPhase(opportunity.phaseRecommendation.recommendedPhase);
  const nextProfilePhase = opportunity.phaseRecommendation.recommendedPhase === 'camp'
    ? generatedCampLegacyPhase ?? recommendedLegacyPhase
    : recommendedLegacyPhase;

  await supabase
    .from('athlete_profiles')
    .update({
      athlete_goal_mode: 'fight_camp',
      performance_goal_type: input.performanceGoalType ?? athleteContext.profile?.performance_goal_type ?? 'conditioning',
      fight_date: input.fightDate,
      target_weight: targetWeight,
      planning_setup_version: PLANNING_SETUP_VERSION,
      phase: nextProfilePhase,
    })
    .eq('user_id', userId);

  return camp;
}

export async function getFightCampStatus(userId: string, date: string = todayLocalDate()): Promise<FightCampStatus> {
  const athleteContext = await getAthleteContext(userId);
  const camp = await getActiveFightCamp(userId);

  if (camp) {
    const campPhase = determineCampPhase(camp, date);
    const daysOut = Math.max(0, daysBetween(date, camp.fightDate));
    const campRowResponse = await supabase
      .from('fight_camps')
      .select('weight_cut_state')
      .eq('id', camp.id)
      .maybeSingle();

    if (campRowResponse.error) throw campRowResponse.error;

    const campRow = campRowResponse.data as { weight_cut_state?: WeightCutInfluenceState } | null;

    const weightCutState = campRow?.weight_cut_state ?? camp.weightCutState ?? 'none';
    const labelPhase = campPhase ? campPhase.charAt(0).toUpperCase() + campPhase.slice(1) : 'Camp';
    const weighInLabel = camp.weighInTiming === 'same_day' ? 'Same-day weigh-in' : 'Next-day weigh-in';
    const isTravelMode = Boolean(
      camp.travelStartDate
      && camp.travelStartDate <= date
      && (!camp.travelEndDate || date <= camp.travelEndDate),
    );
    const travelTag = isTravelMode ? ' - Travel mode' : '';

    return {
      camp,
      campPhase,
      daysOut,
      weightCutState,
      label: `${labelPhase} Phase - ${daysOut} days out - ${weighInLabel} - Cut ${weightCutState}${travelTag}`,
    };
  }

  const goalType = athleteContext.performanceGoalType ?? 'conditioning';
  const prettyGoal = goalType.replace('_', ' ');

  return {
    camp: null,
    campPhase: null,
    daysOut: null,
    weightCutState: 'none',
    label: `Build Phase - ${prettyGoal}`,
  };
}



