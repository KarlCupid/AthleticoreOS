import type {
  ACWRInput,
  ACWRResult,
  ACWRThresholds,
  FitnessLevel,
  LoadMetrics,
  Phase,
  TrainingSessionRow,
} from './types.ts';

function formatLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISODate(dateStr: string): Date {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date: ${dateStr}`);
  }
  return parsed;
}

function addDaysLocal(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetweenLocal(startIso: string, endIso: string): number {
  const start = parseISODate(startIso).getTime();
  const end = parseISODate(endIso).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, places: number): number {
  const mult = 10 ** places;
  return Math.round(value * mult) / mult;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + ((v - avg) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function ewma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let current = values[0];
  for (let i = 1; i < values.length; i++) {
    current = (alpha * values[i]) + ((1 - alpha) * current);
  }
  return current;
}

function buildDailyLoads(
  sessions: Pick<TrainingSessionRow, 'date' | 'total_load'>[],
  startIso: string,
  endIso: string,
): number[] {
  const byDate = new Map<string, number>();
  for (const s of sessions) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.total_load);
  }

  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  const loads: number[] = [];

  for (let d = new Date(start); d <= end; d = addDaysLocal(d, 1)) {
    loads.push(byDate.get(formatLocalISO(d)) ?? 0);
  }

  return loads;
}

function computeLoadMetrics(dailyLoads28: number[]): LoadMetrics {
  const dailyLoads7 = dailyLoads28.slice(-7);
  const weeklyLoad = dailyLoads7.reduce((sum, load) => sum + load, 0);
  const avg7 = mean(dailyLoads7);
  const sd7 = stdDev(dailyLoads7);
  const monotony = weeklyLoad <= 0
    ? 0
    : (sd7 < 1 ? 4 : clamp(avg7 / sd7, 0, 6));
  const strain = weeklyLoad * monotony;

  const acuteEWMA = ewma(dailyLoads28, 2 / (7 + 1));
  const chronicEWMA = ewma(dailyLoads28, 2 / (28 + 1));
  const rollingFatigueRatio = chronicEWMA <= 0 ? 0 : acuteEWMA / chronicEWMA;

  const ratioComponent = clamp((rollingFatigueRatio - 0.9) / 0.6, 0, 1) * 55;
  const monotonyComponent = clamp((monotony - 1.4) / 1.3, 0, 1) * 25;
  const strainComponent = clamp((strain - 1200) / 2800, 0, 1) * 20;
  const rollingFatigueScore = roundTo(clamp(ratioComponent + monotonyComponent + strainComponent, 0, 100), 1);

  const fatigueBand: LoadMetrics['fatigueBand'] =
    rollingFatigueScore >= 80 ? 'very_high'
      : rollingFatigueScore >= 60 ? 'high'
        : rollingFatigueScore >= 35 ? 'moderate'
          : 'low';

  return {
    weeklyLoad: Math.round(weeklyLoad),
    monotony: roundTo(monotony, 2),
    strain: Math.round(strain),
    rollingFatigueRatio: roundTo(rollingFatigueRatio, 2),
    rollingFatigueScore,
    fatigueBand,
  };
}

function inferFitnessLevel(chronicLoad: number): FitnessLevel {
  if (chronicLoad >= 1600) return 'elite';
  if (chronicLoad >= 1200) return 'advanced';
  if (chronicLoad >= 700) return 'intermediate';
  return 'beginner';
}

export function getPersonalizedACWRThresholds(input: {
  fitnessLevel?: FitnessLevel | null;
  phase?: Phase | null;
  isOnActiveCut?: boolean;
  daysOfData: number;
  chronicLoad: number;
  loadMetrics: LoadMetrics;
}): ACWRThresholds {
  const {
    fitnessLevel,
    phase,
    isOnActiveCut = false,
    daysOfData,
    chronicLoad,
    loadMetrics,
  } = input;

  const effectiveFitness = fitnessLevel ?? inferFitnessLevel(chronicLoad);
  const effectivePhase: Phase = phase ?? 'off-season';
  const factors: string[] = [];

  const baseByFitness: Record<FitnessLevel, { caution: number; redline: number }> = {
    beginner: { caution: 1.12, redline: 1.3 },
    intermediate: { caution: 1.2, redline: 1.4 },
    advanced: { caution: 1.24, redline: 1.45 },
    elite: { caution: 1.28, redline: 1.5 },
  };

  const phaseAdj: Record<Phase, number> = {
    'off-season': 0,
    'pre-camp': 0.02,
    'fight-camp': 0.03,
    'camp-base': 0.02,
    'camp-build': 0.04,
    'camp-peak': 0.03,
    'camp-taper': -0.08,
  };

  let adjustment = phaseAdj[effectivePhase] ?? 0;
  if (adjustment !== 0) {
    factors.push(`phase:${effectivePhase}`);
  }

  if (isOnActiveCut) {
    adjustment -= 0.1;
    factors.push('active_cut');
  }

  if (daysOfData < 7) {
    adjustment -= 0.05;
    factors.push('low_data');
  } else if (daysOfData < 14) {
    adjustment -= 0.03;
    factors.push('limited_data');
  } else if (daysOfData >= 24) {
    adjustment += 0.02;
    factors.push('stable_history');
  }

  if (chronicLoad <= 400) {
    adjustment -= 0.05;
    factors.push('low_chronic_load');
  } else if (chronicLoad >= 1400) {
    adjustment += 0.05;
    factors.push('high_chronic_load');
  }

  if (loadMetrics.monotony >= 2.2) {
    adjustment -= 0.05;
    factors.push('high_monotony');
  } else if (loadMetrics.monotony >= 1.8) {
    adjustment -= 0.03;
    factors.push('elevated_monotony');
  }

  if (loadMetrics.fatigueBand === 'very_high') {
    adjustment -= 0.06;
    factors.push('very_high_fatigue');
  } else if (loadMetrics.fatigueBand === 'high') {
    adjustment -= 0.03;
    factors.push('high_fatigue');
  }

  const base = baseByFitness[effectiveFitness];
  const caution = clamp(base.caution + adjustment, 1.05, 1.38);
  const redline = clamp(base.redline + adjustment, caution + 0.12, 1.7);

  const confidence: ACWRThresholds['confidence'] =
    daysOfData >= 18 ? 'high' : daysOfData >= 7 ? 'medium' : 'low';

  return {
    caution: roundTo(caution, 2),
    redline: roundTo(redline, 2),
    confidence,
    personalizationFactors: factors,
  };
}

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - userId: string (from supabase.auth.getUser() in the calling screen)
 *   - supabaseClient: SupabaseClient (passed from the screen's imported supabase instance)
 *   - asOfDate?: string (optional ISO date for deterministic calculations/tests)
 *
 * Returns: Promise<ACWRResult>
 *   - ratio: number (Acute / Chronic workload ratio)
 *   - acute: number (sum of total_load for last 7 days)
 *   - chronic: number (weekly-equivalent load derived from up to last 28 calendar days)
 *   - status: 'safe' | 'caution' | 'redline'
 *   - message: string (coaching guidance)
 *   - daysOfData: number (how many of the 28 days had sessions)
 *
 * Queries training_sessions for up to the last 28 calendar days.
 */
export async function calculateACWR({
  userId,
  supabaseClient,
  asOfDate,
  fitnessLevel,
  phase,
  isOnActiveCut,
}: ACWRInput): Promise<ACWRResult> {
  const asOf = asOfDate
    ? parseISODate(asOfDate)
    : (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    })();

  const asOfDateStr = formatLocalISO(asOf);
  const twentyEightDaysStartStr = formatLocalISO(addDaysLocal(asOf, -27));

  const { data, error } = await supabaseClient
    .from('training_sessions')
    .select('date, total_load')
    .eq('user_id', userId)
    .gte('date', twentyEightDaysStartStr)
    .lte('date', asOfDateStr)
    .order('date', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch training sessions: ' + error.message);
  }

  if (!data || data.length === 0) {
    const emptyMetrics: LoadMetrics = {
      weeklyLoad: 0,
      monotony: 0,
      strain: 0,
      rollingFatigueRatio: 0,
      rollingFatigueScore: 0,
      fatigueBand: 'low',
    };

    const thresholds = getPersonalizedACWRThresholds({
      fitnessLevel,
      phase,
      isOnActiveCut,
      daysOfData: 0,
      chronicLoad: 0,
      loadMetrics: emptyMetrics,
    });

    return {
      ratio: 0,
      acute: 0,
      chronic: 0,
      status: 'safe',
      message:
        'Not enough training data yet. Log sessions consistently and we will start tracking your load ratio.',
      daysOfData: 0,
      thresholds,
      loadMetrics: emptyMetrics,
    };
  }

  const sessions = data as Pick<TrainingSessionRow, 'date' | 'total_load'>[];
  const daysOfData = new Set(sessions.map((s) => s.date)).size;

  const dailyLoads28 = buildDailyLoads(sessions, twentyEightDaysStartStr, asOfDateStr);
  const dailyLoads7 = dailyLoads28.slice(-7);

  const acute = dailyLoads7.reduce((sum, load) => sum + load, 0);

  const chronicTotal = sessions.reduce((sum, s) => sum + s.total_load, 0);
  const oldestSessionDate = sessions.reduce(
    (oldest, s) => (s.date < oldest ? s.date : oldest),
    sessions[0].date,
  );
  const calendarDaysCovered = Math.max(1, daysBetweenLocal(oldestSessionDate, asOfDateStr) + 1);
  const chronicWindowDays = Math.min(28, calendarDaysCovered);

  // Convert available multi-day load into a weekly-equivalent chronic load.
  const chronic = chronicWindowDays > 0
    ? (chronicTotal / chronicWindowDays) * 7
    : 0;

  const ratio = chronic === 0 ? 0 : parseFloat((acute / chronic).toFixed(2));
  const loadMetrics = computeLoadMetrics(dailyLoads28);
  const thresholds = getPersonalizedACWRThresholds({
    fitnessLevel,
    phase,
    isOnActiveCut,
    daysOfData,
    chronicLoad: chronic,
    loadMetrics,
  });

  let status: ACWRResult['status'];
  let message: string;

  if (ratio > thresholds.redline) {
    status = 'redline';
    message =
      `You are redlining (ACWR ${ratio.toFixed(2)} > ${thresholds.redline.toFixed(2)}). ` +
      'Keep today light and prioritize recovery.';
  } else if (ratio > thresholds.caution) {
    status = 'caution';
    message =
      `Your ACWR is elevated (${ratio.toFixed(2)} > ${thresholds.caution.toFixed(2)}). ` +
      'Stay disciplined with recovery and avoid stacking high-intensity work.';
  } else {
    status = 'safe';
    message =
      `Your workload ratio is in range (${ratio.toFixed(2)} <= ${thresholds.caution.toFixed(2)}). Keep building.`;
  }

  return {
    ratio,
    acute: Math.round(acute),
    chronic: Math.round(chronic),
    status,
    message,
    daysOfData,
    thresholds,
    loadMetrics,
  };
}
