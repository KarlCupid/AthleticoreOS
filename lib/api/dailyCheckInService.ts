import { supabase } from '../supabase';
import { generateDailyCoachDebrief } from '../engine/calculateDailyCoachDebrief';
import {
  deriveLegacyReadinessFromDailyCheck,
  estimateDailyPerformanceReadinessScore,
  inferPrimaryLimiterFromDailyCheck,
  type DailyPerformanceCheckInput,
} from '../engine/readiness/dailyCheck';
import type { CoachingFocus, DailyCoachDebriefInput } from '../engine/types';
import { getDailyEngineState } from './dailyPerformanceService';
import { mutateEngineAffectingData } from './engineInvalidation';

const DAILY_PERFORMANCE_CHECK_COLUMNS = [
  'energy_level',
  'pain_level',
  'readiness_score',
  'checkin_version',
] as const;

function isMissingDailyPerformanceCheckColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  const message = typeof maybe.message === 'string' ? maybe.message : '';
  return (maybe.code === 'PGRST204' || maybe.code === '42703')
    && DAILY_PERFORMANCE_CHECK_COLUMNS.some((column) => message.includes(column));
}

function getCoachingFocus(primaryLimiter: ReturnType<typeof inferPrimaryLimiterFromDailyCheck>): CoachingFocus {
  if (primaryLimiter === 'nutrition' || primaryLimiter === 'hydration') return 'nutrition';
  if (primaryLimiter === 'none') return 'execution';
  return 'recovery';
}

export interface SaveDailyPerformanceCheckInput {
  userId: string;
  date: string;
  morningWeightLbs: number | null;
  checkInput: DailyPerformanceCheckInput;
  trainingLoadSummary: DailyCoachDebriefInput['trainingLoadSummary'];
  context: DailyCoachDebriefInput['context'];
  previousDebrief?: DailyCoachDebriefInput['previousDebrief'];
}

export interface SaveDailyPerformanceCheckResult {
  readinessScore: number;
  canonicalReadinessScore: number | null;
  savedWithPerformanceColumns: boolean;
}

export async function saveDailyPerformanceCheck(
  input: SaveDailyPerformanceCheckInput,
): Promise<SaveDailyPerformanceCheckResult> {
  const { userId, date, checkInput } = input;
  const legacyReadiness = deriveLegacyReadinessFromDailyCheck(checkInput);
  const primaryLimiter = inferPrimaryLimiterFromDailyCheck(checkInput);
  const coachingFocus = getCoachingFocus(primaryLimiter);
  const readinessScore = estimateDailyPerformanceReadinessScore(checkInput);
  const debrief = generateDailyCoachDebrief({
    sleepQuality: checkInput.sleepQuality,
    readiness: legacyReadiness,
    energyLevel: checkInput.energyLevel,
    painLevel: checkInput.painLevel,
    stressLevel: checkInput.stressLevel,
    sorenessLevel: checkInput.sorenessLevel,
    confidenceLevel: checkInput.confidenceLevel,
    primaryLimiter,
    nutritionAdherence: null,
    nutritionBarrier: 'none',
    coachingFocus,
    trainingLoadSummary: input.trainingLoadSummary,
    context: input.context,
    previousDebrief: input.previousDebrief,
  });

  const performancePayload = {
    user_id: userId,
    date,
    morning_weight: input.morningWeightLbs,
    sleep_quality: checkInput.sleepQuality,
    readiness: legacyReadiness,
    energy_level: checkInput.energyLevel,
    stress_level: checkInput.stressLevel,
    soreness_level: checkInput.sorenessLevel,
    pain_level: checkInput.painLevel,
    confidence_level: checkInput.confidenceLevel,
    primary_limiter: primaryLimiter,
    nutrition_barrier: 'none',
    coaching_focus: coachingFocus,
    coach_debrief: debrief,
    readiness_score: readinessScore,
    checkin_version: 2,
  };
  const legacyPayload = {
    user_id: userId,
    date,
    morning_weight: input.morningWeightLbs,
    sleep_quality: checkInput.sleepQuality,
    readiness: legacyReadiness,
    stress_level: checkInput.stressLevel,
    soreness_level: checkInput.sorenessLevel,
    confidence_level: checkInput.confidenceLevel,
    primary_limiter: primaryLimiter,
    nutrition_barrier: 'none',
    coaching_focus: coachingFocus,
    coach_debrief: debrief,
  };

  const savedWithPerformanceColumns = await mutateEngineAffectingData(
    { userId, date, reason: 'daily_checkin_save' },
    async () => {
      const { error } = await supabase.from('daily_checkins').upsert(performancePayload, { onConflict: 'user_id,date' });
      if (!error) return true;
      if (!isMissingDailyPerformanceCheckColumnError(error)) throw error;
      const fallback = await supabase.from('daily_checkins').upsert(legacyPayload, { onConflict: 'user_id,date' });
      if (fallback.error) throw fallback.error;
      return false;
    },
  );

  let canonicalReadinessScore: number | null = null;
  if (savedWithPerformanceColumns) {
    const engineState = await getDailyEngineState(userId, date, { forceRefresh: true });
    canonicalReadinessScore = engineState.unifiedPerformance?.canonicalOutputs.readiness.overallReadiness
      ?? engineState.readinessProfile.overallReadiness;

    await mutateEngineAffectingData(
      { userId, date, reason: 'daily_checkin_readiness_score_update' },
      async () => {
        const readinessUpdate = await supabase
          .from('daily_checkins')
          .update({ readiness_score: canonicalReadinessScore })
          .eq('user_id', userId)
          .eq('date', date);
        if (readinessUpdate.error && !isMissingDailyPerformanceCheckColumnError(readinessUpdate.error)) {
          throw readinessUpdate.error;
        }
      },
    );
  }

  return {
    readinessScore,
    canonicalReadinessScore,
    savedWithPerformanceColumns,
  };
}
