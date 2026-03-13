import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { Card } from '../components/Card';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { NutritionCheckIn, type NutritionStatus } from '../components/NutritionCheckIn';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { supabase } from '../../lib/supabase';
import { calculateACWR } from '../../lib/engine/calculateACWR';
import { generateDailyCoachDebrief } from '../../lib/engine/calculateDailyCoachDebrief';
import type {
  CoachingFocus,
  DailyCoachDebrief,
  NutritionBarrier,
  Phase,
  PrimaryLimiter,
} from '../../lib/engine/types';
import { getAthleteContext } from '../../lib/api/athleteContextService';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';

type Step = 'recovery' | 'nutrition' | 'debrief';

const STEPS: Step[] = ['recovery', 'nutrition', 'debrief'];
const PRIMARY_LIMITER_OPTIONS: Array<{ value: PrimaryLimiter; label: string }> = [
  { value: 'sleep', label: 'Sleep' },
  { value: 'stress', label: 'Stress' },
  { value: 'soreness', label: 'Soreness' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'time', label: 'Time' },
  { value: 'none', label: 'No major limiter' },
];
const NUTRITION_BARRIER_OPTIONS: Array<{ value: NutritionBarrier; label: string }> = [
  { value: 'appetite', label: 'Low appetite' },
  { value: 'timing', label: 'Timing' },
  { value: 'cravings', label: 'Cravings' },
  { value: 'prep', label: 'Meal prep' },
  { value: 'social', label: 'Social events' },
  { value: 'none', label: 'No major barrier' },
];
const COACHING_FOCUS_OPTIONS: Array<{ value: CoachingFocus; label: string }> = [
  { value: 'recovery', label: 'Recovery' },
  { value: 'execution', label: 'Execution' },
  { value: 'consistency', label: 'Consistency' },
  { value: 'nutrition', label: 'Nutrition' },
];
const NUTRITION_METRICS: Array<{ key: keyof NutritionTrackerState['actual']; label: string; unit: string }> = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbs', unit: 'g' },
  { key: 'fat', label: 'Fat', unit: 'g' },
];

interface DailyCheckinRow {
  morning_weight: number | null;
  sleep_quality: number | null;
  readiness: number | null;
  macro_adherence: NutritionStatus;
  stress_level?: number | null;
  soreness_level?: number | null;
  confidence_level?: number | null;
  primary_limiter?: PrimaryLimiter | null;
  nutrition_barrier?: NutritionBarrier | null;
  coaching_focus?: CoachingFocus | null;
  coach_debrief?: unknown;
}

interface ActivityLoadRow {
  duration_min: number | null;
  intensity: number | null;
}

interface MacroLedgerRow {
  prescribed_calories: number | null;
  prescribed_protein: number | null;
  prescribed_carbs: number | null;
  prescribed_fats: number | null;
  actual_calories: number | null;
  actual_protein: number | null;
  actual_carbs: number | null;
  actual_fat: number | null;
}

interface DailyNutritionSummaryRow {
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  total_water_oz: number | null;
  meal_count: number | null;
}

interface NutritionTrackerState {
  targets: { calories: number; protein: number; carbs: number; fat: number } | null;
  actual: { calories: number; protein: number; carbs: number; fat: number };
  waterOz: number;
  mealCount: number;
}

const EMPTY_TRACKER_STATE: NutritionTrackerState = {
  targets: null,
  actual: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  waterOz: 0,
  mealCount: 0,
};

type NutritionActualDraft = Record<keyof NutritionTrackerState['actual'], string>;

function roundPercent(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

function pctDelta(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 1;
  return Math.abs(actual - target) / target;
}

function sanitizeNumericInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
}

function parseNonNegativeNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function simplifyDebriefCopy(text: string): string {
  return text
    .replace(/\bACWR\b/gi, 'training load')
    .replace(/load ratio/gi, 'training load trend')
    .replace(/\badaptation\b/gi, 'progress')
    .replace(/\bexecution\b/gi, 'performance')
    .replace(/\bCNS\b/gi, 'nervous system');
}

function assessTrackedNutrition(
  targets: NutritionTrackerState['targets'],
  actual: NutritionTrackerState['actual'],
): { status: NutritionStatus; reason: string } | null {
  if (!targets) return null;

  const hasAnyActual = actual.calories > 0 || actual.protein > 0 || actual.carbs > 0 || actual.fat > 0;
  if (!hasAnyActual) return null;

  const calDelta = pctDelta(actual.calories, targets.calories);
  const macroDeltas = [
    pctDelta(actual.protein, targets.protein),
    pctDelta(actual.carbs, targets.carbs),
    pctDelta(actual.fat, targets.fat),
  ];
  const macroTight = macroDeltas.filter((delta) => delta <= 0.15).length;
  const macroLoose = macroDeltas.filter((delta) => delta <= 0.25).length;

  const status: NutritionStatus = calDelta <= 0.1 && macroTight >= 2
    ? 'Target Met'
    : calDelta <= 0.2 && macroLoose >= 2
      ? 'Close Enough'
      : 'Missed It';

  const reason = `Tracked vs target: ${roundPercent(actual.calories, targets.calories)}% kcal, ${roundPercent(actual.protein, targets.protein)}% protein, ${roundPercent(actual.carbs, targets.carbs)}% carbs, ${roundPercent(actual.fat, targets.fat)}% fat.`;
  return { status, reason };
}

function isDailyCoachDebrief(value: unknown): value is DailyCoachDebrief {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.headline === 'string' && Array.isArray(v.action_steps) && typeof v.education_topic === 'string';
}

function isPrimaryLimiter(value: unknown): value is PrimaryLimiter {
  return PRIMARY_LIMITER_OPTIONS.some((option) => option.value === value);
}
function isNutritionBarrier(value: unknown): value is NutritionBarrier {
  return NUTRITION_BARRIER_OPTIONS.some((option) => option.value === value);
}
function isCoachingFocus(value: unknown): value is CoachingFocus {
  return COACHING_FOCUS_OPTIONS.some((option) => option.value === value);
}

function sliderHint(field: 'sleep' | 'readiness' | 'stress' | 'soreness' | 'confidence', value: number): string {
  const hintsByField: Record<'sleep' | 'readiness' | 'stress' | 'soreness' | 'confidence', string[]> = {
    sleep: [
      '1/5 sleep: severe recovery debt, keep effort minimal.',
      '2/5 sleep: below target, reduce intensity and extend warmup.',
      '3/5 sleep: adequate baseline, train at planned control.',
      '4/5 sleep: good recovery, support normal progression.',
      '5/5 sleep: excellent recovery, highest quality output window.',
    ],
    readiness: [
      '1/5 readiness: prioritize movement quality over load.',
      '2/5 readiness: conservative session with strict technique.',
      '3/5 readiness: steady baseline, execute the planned work.',
      '4/5 readiness: strong state, progress with intent.',
      '5/5 readiness: peak state, ideal for your top session.',
    ],
    stress: [
      '1/5 stress: very low strain, capacity is well preserved.',
      '2/5 stress: manageable strain, stay consistent with routine.',
      '3/5 stress: moderate strain, pace hard efforts carefully.',
      '4/5 stress: high strain, trim optional volume today.',
      '5/5 stress: extreme strain, protect recovery and simplify work.',
    ],
    soreness: [
      '1/5 soreness: fully fresh, no restriction from soreness.',
      '2/5 soreness: mild tightness, prep tissue before loading.',
      '3/5 soreness: moderate soreness, monitor range and speed.',
      '4/5 soreness: high soreness, cut nonessential intensity.',
      '5/5 soreness: severe soreness, recovery-first day is advised.',
    ],
    confidence: [
      '1/5 confidence: simplify goals and stack small wins.',
      '2/5 confidence: keep cues simple and repeat clean reps.',
      '3/5 confidence: neutral confidence, trust your normal process.',
      '4/5 confidence: strong confidence, execute assertively.',
      '5/5 confidence: elite confidence, attack key priorities.',
    ],
  };

  const clamped = Math.min(5, Math.max(1, Math.round(value)));
  return hintsByField[field][clamped - 1];
}

export function LogScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { themeColor, lightTint, gradient } = useReadinessTheme();

  const [step, setStep] = useState<Step>('recovery');
  const [weight, setWeight] = useState('');
  const [sleep, setSleep] = useState(3);
  const [readiness, setReadiness] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sorenessLevel, setSorenessLevel] = useState(3);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [primaryLimiter, setPrimaryLimiter] = useState<PrimaryLimiter>('none');
  const [macroAdherence, setMacroAdherence] = useState<NutritionStatus>(null);
  const [nutritionBarrier, setNutritionBarrier] = useState<NutritionBarrier>('none');
  const [coachingFocus, setCoachingFocus] = useState<CoachingFocus>('recovery');
  const [savedDebrief, setSavedDebrief] = useState<DailyCoachDebrief | null>(null);
  const [previousDebrief, setPreviousDebrief] = useState<{ education_topic?: string | null; risk_flags?: string[] | null; primary_limiter?: PrimaryLimiter | null } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [todayTrainingLoad, setTodayTrainingLoad] = useState<{ totalMinutes: number; weightedIntensity: number; totalLoad: number; sessionCount: number }>({
    totalMinutes: 0,
    weightedIntensity: 0,
    totalLoad: 0,
    sessionCount: 0,
  });
  const [nutritionTracker, setNutritionTracker] = useState<NutritionTrackerState>(EMPTY_TRACKER_STATE);
  const [nutritionActualDraft, setNutritionActualDraft] = useState<NutritionActualDraft>({
    calories: '0',
    protein: '0',
    carbs: '0',
    fat: '0',
  });
  const [nutritionWaterDraft, setNutritionWaterDraft] = useState('0');
  const [hasManualNutritionEdits, setHasManualNutritionEdits] = useState(false);
  const [acwrContext, setAcwrContext] = useState<{ ratio: number; status: 'safe' | 'caution' | 'redline'; acute: number; chronic: number; phase: Phase; isOnActiveCut: boolean }>({
    ratio: 0,
    status: 'safe',
    acute: 0,
    chronic: 0,
    phase: 'off-season',
    isOnActiveCut: false,
  });

  const logDate = todayLocalDate();
  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const nutritionDateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, [logDate]);
  const nutritionLogDate = useMemo(() => formatLocalDate(nutritionDateObj), [nutritionDateObj]);
  const nutritionFormatted = useMemo(
    () => nutritionDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    [nutritionDateObj],
  );
  const stepIndex = STEPS.indexOf(step);
  const hasRecoveryCoreInput = weight.trim().length > 0 || sleep !== 3 || readiness !== 3;
  const effectiveNutritionActual = useMemo(
    () => ({
      calories: parseNonNegativeNumber(nutritionActualDraft.calories),
      protein: parseNonNegativeNumber(nutritionActualDraft.protein),
      carbs: parseNonNegativeNumber(nutritionActualDraft.carbs),
      fat: parseNonNegativeNumber(nutritionActualDraft.fat),
    }),
    [nutritionActualDraft],
  );
  const nutritionAssessment = useMemo(
    () => assessTrackedNutrition(nutritionTracker.targets, effectiveNutritionActual),
    [nutritionTracker.targets, effectiveNutritionActual],
  );
  const effectiveNutritionWater = useMemo(
    () => parseNonNegativeNumber(nutritionWaterDraft),
    [nutritionWaterDraft],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return;
        const userId = userData.user.id;

        const [todayRes, yesterdayRes, activityRes, ledgerRes, nutritionSummaryRes] = await Promise.all([
          supabase.from('daily_checkins').select('*').eq('user_id', userId).eq('date', logDate).maybeSingle(),
          supabase.from('daily_checkins').select('coach_debrief,primary_limiter').eq('user_id', userId).eq('date', nutritionLogDate).maybeSingle(),
          supabase.from('activity_log').select('duration_min,intensity').eq('user_id', userId).eq('date', logDate),
          supabase
            .from('macro_ledger')
            .select('prescribed_calories,prescribed_protein,prescribed_carbs,prescribed_fats,actual_calories,actual_protein,actual_carbs,actual_fat')
            .eq('user_id', userId)
            .eq('date', nutritionLogDate)
            .maybeSingle(),
          supabase
            .from('daily_nutrition_summary')
            .select('total_calories,total_protein,total_carbs,total_fat,total_water_oz,meal_count')
            .eq('user_id', userId)
            .eq('date', nutritionLogDate)
            .maybeSingle(),
        ]);

        const athleteContext = await getAthleteContext(userId);
        let acwr: { ratio: number; status: 'safe' | 'caution' | 'redline'; acute: number; chronic: number } = {
          ratio: 0,
          status: 'safe',
          acute: 0,
          chronic: 0,
        };
        try {
          const acwrResult = await calculateACWR({
            userId,
            supabaseClient: supabase,
            asOfDate: logDate,
            fitnessLevel: athleteContext.fitnessLevel,
            phase: athleteContext.phase,
            isOnActiveCut: athleteContext.isOnActiveCut,
          });
          acwr = { ratio: acwrResult.ratio, status: acwrResult.status, acute: acwrResult.acute, chronic: acwrResult.chronic };
        } catch (error) {
          console.warn('ACWR context unavailable for coaching debrief:', error);
        }

        if (!mounted) return;
        const todayCheckin = (todayRes.data as DailyCheckinRow | null) ?? null;
        if (todayCheckin) {
          setWeight(todayCheckin.morning_weight != null ? String(todayCheckin.morning_weight) : '');
          setSleep(todayCheckin.sleep_quality ?? 3);
          setReadiness(todayCheckin.readiness ?? 3);
          setStressLevel(todayCheckin.stress_level ?? 3);
          setSorenessLevel(todayCheckin.soreness_level ?? 3);
          setConfidenceLevel(todayCheckin.confidence_level ?? 3);
          setMacroAdherence(todayCheckin.macro_adherence ?? null);
          setPrimaryLimiter(isPrimaryLimiter(todayCheckin.primary_limiter) ? todayCheckin.primary_limiter : 'none');
          setNutritionBarrier(isNutritionBarrier(todayCheckin.nutrition_barrier) ? todayCheckin.nutrition_barrier : 'none');
          setCoachingFocus(isCoachingFocus(todayCheckin.coaching_focus) ? todayCheckin.coaching_focus : 'recovery');
          if (isDailyCoachDebrief(todayCheckin.coach_debrief)) setSavedDebrief(todayCheckin.coach_debrief);
        }

        const prior = yesterdayRes.data as { coach_debrief?: unknown; primary_limiter?: PrimaryLimiter | null } | null;
        if (prior?.coach_debrief && typeof prior.coach_debrief === 'object') {
          const parsed = prior.coach_debrief as Record<string, unknown>;
          setPreviousDebrief({
            education_topic: typeof parsed.education_topic === 'string' ? parsed.education_topic : null,
            risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags.filter((entry): entry is string => typeof entry === 'string') : null,
            primary_limiter: isPrimaryLimiter(prior.primary_limiter) ? prior.primary_limiter : null,
          });
        }

        if (activityRes.error) {
          console.warn('Could not load activity log for coaching summary:', activityRes.error);
        }
        const activityRows = (activityRes.data as ActivityLoadRow[] | null) ?? [];
        const validLoadRows = activityRows.filter((row) =>
          Number.isFinite(row.duration_min) && row.duration_min != null && row.duration_min > 0 &&
          Number.isFinite(row.intensity) && row.intensity != null && row.intensity > 0,
        );
        const totalMinutes = validLoadRows.reduce((sum, row) => sum + (row.duration_min as number), 0);
        const weightedIntensity = totalMinutes > 0
          ? Math.round(validLoadRows.reduce((sum, row) => sum + ((row.duration_min as number) * (row.intensity as number)), 0) / totalMinutes)
          : 0;
        setTodayTrainingLoad({
          totalMinutes,
          weightedIntensity,
          totalLoad: totalMinutes * weightedIntensity,
          sessionCount: validLoadRows.length,
        });

        if (ledgerRes.error) {
          console.warn('Could not load macro ledger for daily log:', ledgerRes.error);
        }
        if (nutritionSummaryRes.error) {
          console.warn('Could not load nutrition summary for daily log:', nutritionSummaryRes.error);
        }

        const ledger = (ledgerRes.data as MacroLedgerRow | null) ?? null;
        const nutritionSummary = (nutritionSummaryRes.data as DailyNutritionSummaryRow | null) ?? null;
        const targets = ledger
          ? {
            calories: ledger.prescribed_calories ?? 0,
            protein: ledger.prescribed_protein ?? 0,
            carbs: ledger.prescribed_carbs ?? 0,
            fat: ledger.prescribed_fats ?? 0,
          }
          : null;
        const actual = {
          calories: nutritionSummary?.total_calories ?? ledger?.actual_calories ?? 0,
          protein: nutritionSummary?.total_protein ?? ledger?.actual_protein ?? 0,
          carbs: nutritionSummary?.total_carbs ?? ledger?.actual_carbs ?? 0,
          fat: nutritionSummary?.total_fat ?? ledger?.actual_fat ?? 0,
        };
        setNutritionTracker({
          targets,
          actual,
          waterOz: nutritionSummary?.total_water_oz ?? 0,
          mealCount: nutritionSummary?.meal_count ?? 0,
        });
        setNutritionActualDraft({
          calories: String(Math.round(actual.calories)),
          protein: String(Math.round(actual.protein)),
          carbs: String(Math.round(actual.carbs)),
          fat: String(Math.round(actual.fat)),
        });
        setNutritionWaterDraft(String(Math.round(nutritionSummary?.total_water_oz ?? 0)));
        setHasManualNutritionEdits(false);
        const assessment = assessTrackedNutrition(targets, actual);
        if (!todayCheckin?.macro_adherence && assessment?.status) {
          setMacroAdherence(assessment.status);
        }

        setAcwrContext({
          ratio: acwr.ratio,
          status: acwr.status,
          acute: acwr.acute,
          chronic: acwr.chronic,
          phase: athleteContext.phase,
          isOnActiveCut: athleteContext.isOnActiveCut,
        });
      } catch (error) {
        console.error('Failed to load daily log context:', error);
      } finally {
        if (mounted) setLoadingContext(false);
      }
    };

    void load();
    return () => { mounted = false; };
  }, [logDate, nutritionLogDate]);

  useEffect(() => {
    if (macroAdherence === 'Target Met' && nutritionBarrier !== 'none') {
      setNutritionBarrier('none');
    }
  }, [macroAdherence, nutritionBarrier]);

  useEffect(() => {
    if (!macroAdherence && nutritionAssessment?.status) {
      setMacroAdherence(nutritionAssessment.status);
    }
  }, [macroAdherence, nutritionAssessment]);

  const handleSlider = (setter: (value: number) => void) => (value: number) => {
    setter(value);
    Haptics.selectionAsync();
  };

  const handleNutritionActualChange = (field: keyof NutritionTrackerState['actual'], rawValue: string) => {
    setHasManualNutritionEdits(true);
    const sanitized = sanitizeNumericInput(rawValue);
    setNutritionActualDraft((prev) => ({ ...prev, [field]: sanitized }));
  };

  const handleNutritionWaterChange = (rawValue: string) => {
    setHasManualNutritionEdits(true);
    const sanitized = sanitizeNumericInput(rawValue);
    setNutritionWaterDraft(sanitized);
  };

  const resetNutritionToTracked = () => {
    setNutritionActualDraft({
      calories: String(Math.round(nutritionTracker.actual.calories)),
      protein: String(Math.round(nutritionTracker.actual.protein)),
      carbs: String(Math.round(nutritionTracker.actual.carbs)),
      fat: String(Math.round(nutritionTracker.actual.fat)),
    });
    setNutritionWaterDraft(String(Math.round(nutritionTracker.waterOz)));
    setHasManualNutritionEdits(false);
  };

  const saveAndGenerateDebrief = async () => {
    if (!macroAdherence) {
      Alert.alert('Nutrition check required', `Select adherence for ${nutritionFormatted} to generate your coaching debrief.`);
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        Alert.alert('Error', 'No authenticated user found.');
        return;
      }
      const userId = userData.user.id;

      const debrief = generateDailyCoachDebrief({
        sleepQuality: sleep,
        readiness,
        stressLevel,
        sorenessLevel,
        confidenceLevel,
        primaryLimiter,
        nutritionAdherence: macroAdherence,
        nutritionBarrier,
        coachingFocus,
        trainingLoadSummary: {
          plannedMinutes: todayTrainingLoad.totalMinutes,
          plannedIntensity: todayTrainingLoad.weightedIntensity,
          totalLoad: todayTrainingLoad.totalLoad,
          acuteLoad: acwrContext.acute,
          chronicLoad: acwrContext.chronic,
          acwrRatio: acwrContext.ratio,
          acwrStatus: acwrContext.status,
        },
        context: {
          phase: acwrContext.phase,
          isOnActiveCut: acwrContext.isOnActiveCut,
        },
        previousDebrief,
      });

      const { error: dailyError } = await supabase.from('daily_checkins').upsert({
        user_id: userId,
        date: logDate,
        morning_weight: weight ? Number.parseFloat(weight) : null,
        sleep_quality: sleep,
        readiness,
        macro_adherence: macroAdherence,
        stress_level: stressLevel,
        soreness_level: sorenessLevel,
        confidence_level: confidenceLevel,
        primary_limiter: primaryLimiter,
        nutrition_barrier: nutritionBarrier,
        coaching_focus: coachingFocus,
        coach_debrief: debrief,
      }, { onConflict: 'user_id,date' });
      if (dailyError) throw dailyError;

      const { error: nutritionSummaryUpsertError } = await supabase.from('daily_nutrition_summary').upsert({
        user_id: userId,
        date: nutritionLogDate,
        total_calories: Math.round(effectiveNutritionActual.calories),
        total_protein: Math.round(effectiveNutritionActual.protein * 10) / 10,
        total_carbs: Math.round(effectiveNutritionActual.carbs * 10) / 10,
        total_fat: Math.round(effectiveNutritionActual.fat * 10) / 10,
        total_water_oz: Math.round(effectiveNutritionWater),
        meal_count: nutritionTracker.mealCount,
      }, { onConflict: 'user_id,date' });
      if (nutritionSummaryUpsertError) throw nutritionSummaryUpsertError;

      const { error: ledgerActualUpdateError } = await supabase
        .from('macro_ledger')
        .update({
          actual_calories: Math.round(effectiveNutritionActual.calories),
          actual_protein: Math.round(effectiveNutritionActual.protein),
          actual_carbs: Math.round(effectiveNutritionActual.carbs),
          actual_fat: Math.round(effectiveNutritionActual.fat),
        })
        .eq('user_id', userId)
        .eq('date', nutritionLogDate);
      if (ledgerActualUpdateError) throw ledgerActualUpdateError;

      setSavedDebrief(debrief);
      setStep('debrief');
    } catch (error) {
      console.error('Save log failed:', error);
      Alert.alert('Error', 'Could not save log.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderOptionPills = <T extends string>(
    options: Array<{ value: T; label: string }>,
    selected: T,
    setter: (value: T) => void,
  ) => (
    <View style={styles.pillWrap}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.pill, active && { borderColor: themeColor, backgroundColor: lightTint }]}
            onPress={() => setter(option.value)}
          >
            <Text style={[styles.pillText, active && { color: themeColor }]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderRecovery = () => (
    <Card title="Recovery Baseline" subtitle="Why this matters: baseline controls your daily training recommendation.">
      <View style={styles.group}>
        <Text style={styles.label}>Morning Weight (lbs)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="155.0"
          placeholderTextColor={COLORS.text.tertiary}
        />
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>Sleep Quality {sleep}/5</Text>
        <Text style={styles.hint}>{sliderHint('sleep', sleep)}</Text>
        <Slider minimumValue={1} maximumValue={5} step={1} value={sleep} onValueChange={handleSlider(setSleep)} minimumTrackTintColor={themeColor} maximumTrackTintColor={COLORS.border} thumbTintColor={themeColor} />
      </View>
      <View style={styles.group}>
        <Text style={styles.label}>Readiness {readiness}/5</Text>
        <Text style={styles.hint}>{sliderHint('readiness', readiness)}</Text>
        <Slider minimumValue={1} maximumValue={5} step={1} value={readiness} onValueChange={handleSlider(setReadiness)} minimumTrackTintColor={themeColor} maximumTrackTintColor={COLORS.border} thumbTintColor={themeColor} />
      </View>
      {hasRecoveryCoreInput ? (
        <View style={styles.reveal}>
          <Text style={styles.subhead}>Deeper reflection unlocked</Text>
          <View style={styles.group}>
            <Text style={styles.label}>Stress {stressLevel}/5</Text>
            <Text style={styles.hint}>{sliderHint('stress', stressLevel)}</Text>
            <Slider minimumValue={1} maximumValue={5} step={1} value={stressLevel} onValueChange={handleSlider(setStressLevel)} minimumTrackTintColor={themeColor} maximumTrackTintColor={COLORS.border} thumbTintColor={themeColor} />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Soreness {sorenessLevel}/5</Text>
            <Text style={styles.hint}>{sliderHint('soreness', sorenessLevel)}</Text>
            <Slider minimumValue={1} maximumValue={5} step={1} value={sorenessLevel} onValueChange={handleSlider(setSorenessLevel)} minimumTrackTintColor={themeColor} maximumTrackTintColor={COLORS.border} thumbTintColor={themeColor} />
          </View>
          <View style={styles.group}>
            <Text style={styles.label}>Training Confidence {confidenceLevel}/5</Text>
            <Text style={styles.hint}>{sliderHint('confidence', confidenceLevel)}</Text>
            <Slider minimumValue={1} maximumValue={5} step={1} value={confidenceLevel} onValueChange={handleSlider(setConfidenceLevel)} minimumTrackTintColor={themeColor} maximumTrackTintColor={COLORS.border} thumbTintColor={themeColor} />
          </View>
          <Text style={styles.label}>Primary limiter today</Text>
          {renderOptionPills(PRIMARY_LIMITER_OPTIONS, primaryLimiter, setPrimaryLimiter)}
        </View>
      ) : null}
    </Card>
  );

  const renderNutrition = () => (
    <Card title="Nutrition Reflection" subtitle="Use yesterday's intake so today's coaching reflects what actually happened.">
      <Text style={styles.hint}>
        Training load is pulled from Workout Log: {todayTrainingLoad.sessionCount} session{todayTrainingLoad.sessionCount === 1 ? '' : 's'}
        {todayTrainingLoad.totalMinutes > 0 ? `, ${todayTrainingLoad.totalMinutes} min at avg RPE ${todayTrainingLoad.weightedIntensity} (${todayTrainingLoad.totalLoad} load).` : ', no load logged yet.'}
      </Text>
      <View style={styles.trackerBox}>
        <View style={styles.trackerHeader}>
          <Text style={styles.subhead}>Nutrition snapshot ({nutritionFormatted})</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Plan', { screen: 'NutritionHome' })}>
            <Text style={[styles.linkText, { color: themeColor }]}>Open tracker</Text>
          </TouchableOpacity>
        </View>
        {nutritionTracker.targets ? (
          <View style={styles.metricGrid}>
            {NUTRITION_METRICS.map((metric) => {
              const target = nutritionTracker.targets?.[metric.key] ?? 0;
              const trackedActual = nutritionTracker.actual[metric.key];
              return (
                <View key={metric.key} style={styles.metricTile}>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                  <Text style={styles.metricTargetValue}>Target: {Math.round(target)}{metric.unit}</Text>
                  <Text style={styles.metricTrackedValue}>Tracked: {Math.round(trackedActual)}{metric.unit}</Text>
                  <Text style={styles.metricPct}>Tracked hit: {roundPercent(trackedActual, target)}%</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.hint}>No nutrition targets found for {nutritionFormatted} yet. You can still rate adherence manually below.</Text>
        )}
        <View style={styles.manualEntryBox}>
          <View style={styles.trackerHeader}>
            <Text style={styles.subhead}>Quick manual entry</Text>
            <TouchableOpacity onPress={resetNutritionToTracked}>
              <Text style={[styles.linkText, { color: themeColor }]}>Reset to tracked</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>If meals were missed in tracker, enter your total intake for {nutritionFormatted}.</Text>
          <View style={styles.manualGrid}>
            {NUTRITION_METRICS.map((metric) => (
              <View key={`manual-${metric.key}`} style={styles.manualField}>
                <Text style={styles.manualFieldLabel}>{metric.label}</Text>
                <View style={styles.manualInputRow}>
                  <TextInput
                    style={styles.manualInput}
                    value={nutritionActualDraft[metric.key]}
                    onChangeText={(value) => handleNutritionActualChange(metric.key, value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.text.tertiary}
                  />
                  <Text style={styles.manualInputUnit}>{metric.unit}</Text>
                </View>
              </View>
            ))}
            <View style={styles.manualFieldFull}>
              <Text style={styles.manualFieldLabel}>Water</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualInput}
                  value={nutritionWaterDraft}
                  onChangeText={handleNutritionWaterChange}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.text.tertiary}
                />
                <Text style={styles.manualInputUnit}>oz</Text>
              </View>
            </View>
          </View>
        </View>
        {hasManualNutritionEdits ? <Text style={styles.hint}>Manual edits detected. These values will be used as yesterday's intake for coaching.</Text> : null}
        <Text style={[styles.hint, { marginBottom: 0 }]}>
          Meals logged: {nutritionTracker.mealCount} | Water: {Math.round(effectiveNutritionWater)} oz
        </Text>
      </View>
      {nutritionAssessment ? (
        <View style={styles.group}>
          <Text style={styles.label}>Tracker assessment</Text>
          <View
            style={[
              styles.assessmentBox,
              {
                borderColor: nutritionAssessment.status === 'Target Met'
                  ? COLORS.readiness.prime
                  : nutritionAssessment.status === 'Close Enough'
                    ? COLORS.readiness.caution
                    : COLORS.readiness.depleted,
              },
            ]}
          >
            <Text style={styles.assessmentTitle}>{nutritionAssessment.status}</Text>
            <Text style={[styles.hint, { marginBottom: SPACING.sm }]}>{nutritionAssessment.reason}</Text>
            <AnimatedPressable
              style={[styles.useTrackedButton, { borderColor: themeColor, backgroundColor: lightTint }]}
              onPress={() => setMacroAdherence(nutritionAssessment.status)}
            >
              <Text style={[styles.useTrackedButtonText, { color: themeColor }]}>Use this assessment</Text>
            </AnimatedPressable>
          </View>
        </View>
      ) : null}
      <Text style={styles.label}>Final nutrition call for coaching</Text>
      <Text style={styles.hint}>Only adjust this if yesterday's tracking is incomplete or late entries are missing.</Text>
      <NutritionCheckIn status={macroAdherence} setStatus={setMacroAdherence} />
      {macroAdherence ? (
        <View style={styles.reveal}>
          {macroAdherence !== 'Target Met' ? (
            <>
              <Text style={styles.label}>Main barrier</Text>
              {renderOptionPills(NUTRITION_BARRIER_OPTIONS, nutritionBarrier, setNutritionBarrier)}
            </>
          ) : (
            <Text style={styles.hint}>Barrier skipped because you marked targets as met.</Text>
          )}
          <Text style={[styles.label, { marginTop: SPACING.md }]}>Coaching focus for tomorrow</Text>
          {renderOptionPills(COACHING_FOCUS_OPTIONS, coachingFocus, setCoachingFocus)}
        </View>
      ) : null}
    </Card>
  );

  const renderDebrief = () => (
    <Card title="Coach Debrief" subtitle="Simple breakdown: what this means, what to do, and one thing to learn.">
      {savedDebrief ? (
        <>
          <View style={styles.debriefSummaryBox}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.debriefHeadline}>{simplifyDebriefCopy(savedDebrief.headline)}</Text>
            <Text style={styles.summaryBody}>{simplifyDebriefCopy(savedDebrief.reasoning)}</Text>
          </View>
          <Text style={styles.subhead}>Do This Next</Text>
          {savedDebrief.action_steps.map((stepItem) => (
            <View key={`${stepItem.pillar}-${stepItem.priority}`} style={styles.actionItem}>
              <Text style={styles.actionStep}>Step {stepItem.priority}: {simplifyDebriefCopy(stepItem.action)}</Text>
              <Text style={styles.actionWhy}>Why: {simplifyDebriefCopy(stepItem.why)}</Text>
            </View>
          ))}
          <Text style={styles.subhead}>Learn One Thing</Text>
          <View style={styles.skillBox}>
            <Text style={styles.skillTitle}>{savedDebrief.education_title}</Text>
            <Text style={styles.summaryBody}>{simplifyDebriefCopy(savedDebrief.teaching_snippet)}</Text>
            <Text style={[styles.summaryLabel, { marginTop: SPACING.sm }]}>Try this today</Text>
            <Text style={styles.summaryBody}>{simplifyDebriefCopy(savedDebrief.today_application)}</Text>
          </View>
        </>
      ) : <Text style={styles.hint}>Save your entry to generate a coaching debrief.</Text>}
    </Card>
  );

  const nextStep = () => {
    if (step === 'recovery') setStep('nutrition');
  };
  const prevStep = () => {
    if (step === 'nutrition') setStep('recovery');
  };

  const finish = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('HomeMain');
  };

  const buttonLabel = step === 'recovery'
    ? 'Next: Nutrition'
    : step === 'nutrition'
      ? (isSaving ? 'Saving...' : 'Save + Generate Debrief')
      : 'Done';

  const primaryAction = step === 'recovery'
    ? nextStep
    : step === 'nutrition'
      ? saveAndGenerateDebrief
      : finish;
  const showBackButton = step === 'nutrition';
  const bottomActionClearance = Math.max(tabBarHeight, insets.bottom) + SPACING.lg;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Daily Coaching Log</Text>
        <Text style={styles.headerDate}>{todayFormatted}</Text>
      </View>
      <View style={styles.notice}>
        <Text style={[styles.noticeText, { color: themeColor }]}>Check-in date: {todayFormatted} ({logDate}) | Nutrition date: {nutritionFormatted} ({nutritionLogDate})</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomActionClearance }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepKicker}>Step {stepIndex + 1} of {STEPS.length}</Text>
        <View style={styles.stepRow}>
          {STEPS.map((entry, index) => (
            <View key={entry} style={[styles.stepChip, index <= stepIndex && { backgroundColor: lightTint, borderColor: themeColor }]}>
              <Text style={[styles.stepChipText, index <= stepIndex && { color: themeColor }]}>{index + 1}</Text>
            </View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
          {step === 'recovery' && renderRecovery()}
          {step === 'nutrition' && renderNutrition()}
          {step === 'debrief' && renderDebrief()}
        </Animated.View>

        {loadingContext ? <Text style={styles.loadingText}>Loading ACWR and prior coaching context...</Text> : null}

        <View style={styles.footer}>
          {showBackButton ? (
            <AnimatedPressable style={styles.backButton} onPress={prevStep} disabled={isSaving}>
              <Text style={styles.backButtonText}>Back</Text>
            </AnimatedPressable>
          ) : null}
          <AnimatedPressable style={[styles.primaryWrap, !showBackButton && styles.primaryWrapFull, isSaving && styles.disabled]} onPress={primaryAction} disabled={isSaving}>
            <LinearGradient colors={gradient as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerTitle: { fontSize: 27, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  headerDate: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  notice: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.readiness.primeLight, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  noticeText: { textAlign: 'center', fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.prime },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  stepKicker: { marginTop: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  stepRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, marginBottom: SPACING.md },
  stepChip: { width: 26, height: 26, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  stepChipText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  group: { marginBottom: SPACING.md },
  label: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  input: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.background, color: COLORS.text.primary, textAlign: 'center', fontSize: 17, fontFamily: FONT_FAMILY.extraBold },
  hint: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, lineHeight: 17, marginBottom: SPACING.xs },
  trackerBox: { marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.sm },
  trackerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  linkText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.xs },
  metricTile: { width: '48%', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingVertical: SPACING.xs + 2, paddingHorizontal: SPACING.sm },
  metricLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 2 },
  metricTargetValue: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  metricTrackedValue: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 2 },
  metricPct: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, marginTop: 2 },
  manualEntryBox: { borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.sm, marginTop: SPACING.xs },
  manualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  manualField: { width: '48%' },
  manualFieldFull: { width: '100%' },
  manualFieldLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 2 },
  manualInputRow: { flexDirection: 'row', alignItems: 'center' },
  manualInput: { flex: 1, borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.sm, backgroundColor: COLORS.background, color: COLORS.text.primary, paddingVertical: 6, paddingHorizontal: 8, fontSize: 13, fontFamily: FONT_FAMILY.semiBold },
  manualInputUnit: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, marginLeft: SPACING.xs, minWidth: 10 },
  assessmentBox: { borderWidth: 1, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.sm },
  assessmentTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: 2 },
  useTrackedButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  useTrackedButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold },
  reveal: { borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  subhead: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  pill: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: COLORS.surface },
  pillText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  debriefSummaryBox: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.sm, marginBottom: SPACING.sm },
  summaryLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginBottom: 2 },
  debriefHeadline: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, lineHeight: 22, marginBottom: SPACING.xs },
  summaryBody: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 19 },
  actionItem: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, padding: SPACING.sm, marginBottom: SPACING.xs },
  actionStep: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, lineHeight: 19, marginBottom: 2 },
  actionWhy: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 17 },
  skillBox: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.sm },
  skillTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  loadingText: { marginTop: SPACING.md, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  footer: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, alignItems: 'center' },
  backButton: { flex: 0.4, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  backButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  primaryWrap: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.colored.prime },
  primaryWrapFull: { flex: 1 },
  primaryButton: { minHeight: 52, paddingVertical: SPACING.md + 1, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontFamily: FONT_FAMILY.semiBold },
  disabled: { opacity: 0.5 },
});
