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

import { Card } from '../components/Card';
import { SessionLogger } from '../components/SessionLogger';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { NutritionCheckIn, type NutritionStatus } from '../components/NutritionCheckIn';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION, GRADIENTS } from '../theme/theme';
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

type WorkoutDraft = { id: string; label: string; intensity: number; minutes: string };
type Step = 'recovery' | 'training' | 'nutrition' | 'debrief';

const STEPS: Step[] = ['recovery', 'training', 'nutrition', 'debrief'];
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

function createWorkoutDraft(): WorkoutDraft {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: '', intensity: 5, minutes: '' };
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
  if (field === 'sleep') return value <= 2 ? 'Low sleep raises recovery cost.' : value === 3 ? 'Average sleep supports maintenance.' : 'Strong sleep supports output.';
  if (field === 'readiness') return value <= 2 ? 'Low readiness: protect quality.' : value === 3 ? 'Moderate readiness: train with control.' : 'High readiness: good progression window.';
  if (field === 'stress') return value >= 4 ? 'High life stress adds to training load.' : 'Manage stress to preserve adaptation.';
  if (field === 'soreness') return value >= 4 ? 'High soreness: prep more, trim optional volume.' : 'Use full-range warmup before hard work.';
  return value <= 2 ? 'Low confidence: simplify and execute clean reps.' : 'Confidence supports sharper execution.';
}

export function LogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { themeColor } = useReadinessTheme();

  const [step, setStep] = useState<Step>('recovery');
  const [weight, setWeight] = useState('');
  const [sleep, setSleep] = useState(3);
  const [readiness, setReadiness] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sorenessLevel, setSorenessLevel] = useState(3);
  const [confidenceLevel, setConfidenceLevel] = useState(3);
  const [primaryLimiter, setPrimaryLimiter] = useState<PrimaryLimiter>('none');
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>([createWorkoutDraft()]);
  const [macroAdherence, setMacroAdherence] = useState<NutritionStatus>(null);
  const [nutritionBarrier, setNutritionBarrier] = useState<NutritionBarrier>('none');
  const [coachingFocus, setCoachingFocus] = useState<CoachingFocus>('recovery');
  const [savedDebrief, setSavedDebrief] = useState<DailyCoachDebrief | null>(null);
  const [previousDebrief, setPreviousDebrief] = useState<{ education_topic?: string | null; risk_flags?: string[] | null; primary_limiter?: PrimaryLimiter | null } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
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
  const stepIndex = STEPS.indexOf(step);
  const hasRecoveryCoreInput = weight.trim().length > 0 || sleep !== 3 || readiness !== 3;

  const validWorkouts = useMemo(
    () => workouts
      .map((workout) => ({ ...workout, parsedMinutes: Number.parseInt(workout.minutes, 10) }))
      .filter((workout) => Number.isFinite(workout.parsedMinutes) && workout.parsedMinutes > 0),
    [workouts],
  );

  const trainingSummary = useMemo(() => {
    if (validWorkouts.length === 0) return { totalMinutes: 0, weightedIntensity: 0, totalLoad: 0 };
    const totalMinutes = validWorkouts.reduce((sum, workout) => sum + workout.parsedMinutes, 0);
    const weightedIntensity = Math.round(validWorkouts.reduce((sum, workout) => sum + (workout.intensity * workout.parsedMinutes), 0) / totalMinutes);
    return { totalMinutes, weightedIntensity, totalLoad: totalMinutes * weightedIntensity };
  }, [validWorkouts]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return;
        const userId = userData.user.id;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday);

        const [todayRes, yesterdayRes] = await Promise.all([
          supabase.from('daily_checkins').select('*').eq('user_id', userId).eq('date', logDate).maybeSingle(),
          supabase.from('daily_checkins').select('coach_debrief,primary_limiter').eq('user_id', userId).eq('date', yesterdayStr).maybeSingle(),
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
  }, [logDate]);

  const handleSlider = (setter: (value: number) => void) => (value: number) => {
    setter(value);
    Haptics.selectionAsync();
  };

  const saveAndGenerateDebrief = async () => {
    if (!macroAdherence) {
      Alert.alert('Nutrition check required', 'Select nutrition adherence to generate your coaching debrief.');
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
          plannedMinutes: trainingSummary.totalMinutes,
          plannedIntensity: trainingSummary.weightedIntensity,
          totalLoad: trainingSummary.totalLoad,
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

      if (validWorkouts.length > 0) {
        const { error: trainingError } = await supabase.from('training_sessions').upsert({
          user_id: userId,
          date: logDate,
          duration_minutes: trainingSummary.totalMinutes,
          intensity_srpe: trainingSummary.weightedIntensity,
        }, { onConflict: 'user_id,date' });
        if (trainingError) throw trainingError;

        const { error: clearError } = await supabase.from('activity_log').delete().eq('user_id', userId).eq('date', logDate);
        if (clearError) throw clearError;

        const { error: insertActivityError } = await supabase.from('activity_log').insert(
          validWorkouts.map((workout) => ({
            user_id: userId,
            date: logDate,
            component_type: workout.label.trim() ? workout.label.trim().toLowerCase().replace(/\s+/g, '_') : 'training',
            duration_min: workout.parsedMinutes,
            intensity: workout.intensity,
            notes: workout.label.trim() || null,
          })),
        );
        if (insertActivityError) throw insertActivityError;
      } else {
        await supabase.from('training_sessions').delete().eq('user_id', userId).eq('date', logDate);
        await supabase.from('activity_log').delete().eq('user_id', userId).eq('date', logDate);
      }

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
            style={[styles.pill, active && { borderColor: themeColor, backgroundColor: COLORS.accentLight }]}
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

  const renderTraining = () => (
    <Card title="Training Reflection" subtitle="Why this matters: load accuracy drives better adaptation decisions.">
      {workouts.map((workout, index) => (
        <View key={workout.id} style={[styles.workoutBlock, index > 0 && { marginTop: SPACING.md }]}>
          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>Workout {index + 1}</Text>
            {workouts.length > 1 ? (
              <TouchableOpacity onPress={() => setWorkouts((prev) => prev.filter((entry) => entry.id !== workout.id))}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TextInput
            style={styles.secondaryInput}
            value={workout.label}
            onChangeText={(value) => setWorkouts((prev) => prev.map((entry) => entry.id === workout.id ? { ...entry, label: value } : entry))}
            placeholder="Type (optional): S&C, Boxing, Roadwork..."
            placeholderTextColor={COLORS.text.tertiary}
          />
          <SessionLogger
            intensity={workout.intensity}
            setIntensity={(value) => setWorkouts((prev) => prev.map((entry) => entry.id === workout.id ? { ...entry, intensity: value } : entry))}
            minutes={workout.minutes}
            setMinutes={(value) => setWorkouts((prev) => prev.map((entry) => entry.id === workout.id ? { ...entry, minutes: value } : entry))}
          />
        </View>
      ))}
      <AnimatedPressable style={styles.addButton} onPress={() => setWorkouts((prev) => [...prev, createWorkoutDraft()])}>
        <Text style={styles.addButtonText}>+ Add Another Workout</Text>
      </AnimatedPressable>
      <Text style={styles.summaryText}>
        Today load: {trainingSummary.totalMinutes} min
        {trainingSummary.totalMinutes > 0 ? ` - RPE ${trainingSummary.weightedIntensity} - ${trainingSummary.totalLoad} load` : ''}
      </Text>
    </Card>
  );

  const renderNutrition = () => (
    <Card title="Nutrition Reflection" subtitle="Why this matters: poor fuel execution under load slows recovery.">
      <Text style={styles.label}>How close were you to your targets?</Text>
      <NutritionCheckIn status={macroAdherence} setStatus={setMacroAdherence} />
      {macroAdherence ? (
        <View style={styles.reveal}>
          <Text style={styles.label}>Main barrier</Text>
          {renderOptionPills(NUTRITION_BARRIER_OPTIONS, nutritionBarrier, setNutritionBarrier)}
          <Text style={[styles.label, { marginTop: SPACING.md }]}>Coaching focus for tomorrow</Text>
          {renderOptionPills(COACHING_FOCUS_OPTIONS, coachingFocus, setCoachingFocus)}
        </View>
      ) : null}
    </Card>
  );

  const renderDebrief = () => (
    <Card title="Coach Debrief" subtitle="What your data means today and what to do next.">
      {savedDebrief ? (
        <>
          <Text style={styles.debriefHeadline}>{savedDebrief.headline}</Text>
          <Text style={styles.hint}>{savedDebrief.reasoning}</Text>
          <Text style={styles.subhead}>Next 24 Hours</Text>
          {savedDebrief.action_steps.map((stepItem) => (
            <View key={`${stepItem.pillar}-${stepItem.priority}`} style={styles.actionRow}>
              <Text style={styles.priority}>{stepItem.priority}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{stepItem.pillar.toUpperCase()}: {stepItem.action}</Text>
                <Text style={styles.hint}>{stepItem.why}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.subhead}>Skill of the day</Text>
          <View style={styles.skillBox}>
            <Text style={styles.skillTitle}>{savedDebrief.education_title}</Text>
            <Text style={styles.hint}>{savedDebrief.teaching_snippet}</Text>
            <Text style={[styles.label, { marginTop: SPACING.sm }]}>Today application</Text>
            <Text style={styles.hint}>{savedDebrief.today_application}</Text>
          </View>
        </>
      ) : <Text style={styles.hint}>Save your entry to generate a coaching debrief.</Text>}
    </Card>
  );

  const nextStep = () => {
    if (step === 'recovery') setStep('training');
    else if (step === 'training') setStep('nutrition');
  };
  const prevStep = () => {
    if (step === 'training') setStep('recovery');
    else if (step === 'nutrition') setStep('training');
  };

  const finish = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('HomeMain');
  };

  const buttonLabel = step === 'recovery'
    ? 'Next: Training'
    : step === 'training'
      ? 'Next: Nutrition'
      : step === 'nutrition'
        ? (isSaving ? 'Saving...' : 'Save + Generate Debrief')
        : 'Done';

  const primaryAction = step === 'recovery' || step === 'training'
    ? nextStep
    : step === 'nutrition'
      ? saveAndGenerateDebrief
      : finish;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={styles.headerTitle}>Daily Coaching Log</Text>
        <Text style={styles.headerDate}>{todayFormatted}</Text>
      </View>
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Saving entries for {todayFormatted} ({logDate})</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.stepKicker}>Step {stepIndex + 1} of 4</Text>
        <View style={styles.stepRow}>
          {STEPS.map((entry, index) => (
            <View key={entry} style={[styles.stepChip, index <= stepIndex && { backgroundColor: COLORS.accentLight, borderColor: themeColor }]}>
              <Text style={[styles.stepChipText, index <= stepIndex && { color: themeColor }]}>{index + 1}</Text>
            </View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
          {step === 'recovery' && renderRecovery()}
          {step === 'training' && renderTraining()}
          {step === 'nutrition' && renderNutrition()}
          {step === 'debrief' && renderDebrief()}
        </Animated.View>

        {loadingContext ? <Text style={styles.loadingText}>Loading ACWR and prior coaching context...</Text> : null}

        <View style={styles.footer}>
          {step === 'training' || step === 'nutrition' ? (
            <AnimatedPressable style={styles.backButton} onPress={prevStep} disabled={isSaving}>
              <Text style={styles.backButtonText}>Back</Text>
            </AnimatedPressable>
          ) : <View style={styles.backSpacer} />}
          <AnimatedPressable style={[styles.primaryWrap, isSaving && styles.disabled]} onPress={primaryAction} disabled={isSaving}>
            <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
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
  notice: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  noticeText: { textAlign: 'center', fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  stepKicker: { marginTop: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  stepRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm, marginBottom: SPACING.md },
  stepChip: { width: 26, height: 26, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  stepChipText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  group: { marginBottom: SPACING.md },
  label: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  input: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.background, color: COLORS.text.primary, textAlign: 'center', fontSize: 17, fontFamily: FONT_FAMILY.extraBold },
  secondaryInput: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, backgroundColor: COLORS.surfaceSecondary, color: COLORS.text.primary, marginBottom: SPACING.sm },
  hint: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, lineHeight: 17, marginBottom: SPACING.xs },
  reveal: { borderTopWidth: 1, borderTopColor: COLORS.borderLight, marginTop: SPACING.sm, paddingTop: SPACING.sm },
  subhead: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  pill: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: COLORS.surface },
  pillText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  workoutBlock: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, padding: SPACING.sm },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  workoutTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  removeText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.depleted },
  addButton: { marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.accent, borderRadius: RADIUS.md, backgroundColor: COLORS.accentLight, paddingVertical: SPACING.sm, alignItems: 'center' },
  addButtonText: { color: COLORS.accent, fontFamily: FONT_FAMILY.semiBold, fontSize: 13 },
  summaryText: { marginTop: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  debriefHeadline: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, lineHeight: 21, marginBottom: SPACING.sm },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  priority: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', textAlignVertical: 'center', backgroundColor: COLORS.accentLight, color: COLORS.accent, fontFamily: FONT_FAMILY.semiBold, fontSize: 12 },
  actionTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, lineHeight: 19 },
  skillBox: { borderWidth: 1, borderColor: COLORS.borderLight, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.sm },
  skillTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  loadingText: { marginTop: SPACING.md, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  footer: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg, alignItems: 'center' },
  backButton: { flex: 0.4, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, alignItems: 'center', backgroundColor: COLORS.surface },
  backButtonText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  backSpacer: { flex: 0.4 },
  primaryWrap: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.colored.accent },
  primaryButton: { paddingVertical: SPACING.md + 1, alignItems: 'center' },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontFamily: FONT_FAMILY.semiBold },
  disabled: { opacity: 0.5 },
});
