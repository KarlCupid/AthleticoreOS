import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { AnimatedPressable } from '../components/AnimatedPressable';
import { IconInfo } from '../components/icons';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { useLogScreenData } from '../hooks/useLogScreenData';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { getActiveUserId } from '../../lib/api/athleteContextService';
import {
  getDailyEngineState,
  invalidateEngineDataCache,
} from '../../lib/api/dailyPerformanceService';
import { supabase } from '../../lib/supabase';
import {
  deriveLegacyReadinessFromDailyCheck,
  estimateDailyPerformanceReadinessScore,
  inferPrimaryLimiterFromDailyCheck,
  mapScoreToPerformanceBand,
  type DailyPerformanceBand,
  type DailyPerformanceCheckInput,
} from '../../lib/engine/readiness/dailyCheck';
import { generateDailyCoachDebrief } from '../../lib/engine/calculateDailyCoachDebrief';
import type { CoachingFocus, NutritionBarrier } from '../../lib/engine/types';
import { logError } from '../../lib/utils/logger';

type CheckKey = 'sleep' | 'energy' | 'stress' | 'soreness' | 'confidence';

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

interface CheckScale {
  key: CheckKey;
  label: string;
  question: string;
  tooltip: string;
  values: [string, string, string, string, string];
}

const CHECK_SCALES: CheckScale[] = [
  {
    key: 'sleep',
    label: 'Sleep',
    question: 'Sleep quality last night?',
    tooltip: 'Rate the sleep you got, not the plan. If you woke often or feel foggy, score lower.',
    values: ['Very poor', 'Poor', 'Fair', 'Good', 'Excellent'],
  },
  {
    key: 'energy',
    label: 'Energy',
    question: 'Current energy level?',
    tooltip: 'Rate how ready your body feels to produce work now. Low energy means speed, focus, or output feels limited.',
    values: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
  },
  {
    key: 'stress',
    label: 'Stress',
    question: 'Current life stress?',
    tooltip: 'Include work, school, travel, and mental load. Higher stress increases recovery cost.',
    values: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
  },
  {
    key: 'soreness',
    label: 'Soreness',
    question: 'Muscle soreness today?',
    tooltip: 'Score soreness that affects movement. If range, speed, or contact changes, use 4-5.',
    values: ['None', 'Mild', 'Moderate', 'High', 'Severe'],
  },
  {
    key: 'confidence',
    label: 'Confidence',
    question: 'Confidence to train well?',
    tooltip: 'Rate confidence to complete the planned work with control. This is not a toughness score.',
    values: ['Very low', 'Low', 'Moderate', 'High', 'Very high'],
  },
];

const BAND_COPY: Record<DailyPerformanceBand, { title: string; body: string }> = {
  Push: {
    title: 'Push',
    body: 'Planned work is appropriate. Follow the prescription as written.',
  },
  Build: {
    title: 'Build',
    body: 'Main work stays. Optional volume may be reduced.',
  },
  Protect: {
    title: 'Protect',
    body: 'Training cost is reduced today to lower risk.',
  },
};

function sanitizeNumericInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('')}` : whole;
}

function getBandColor(band: DailyPerformanceBand): string {
  if (band === 'Push') return COLORS.readiness.prime;
  if (band === 'Build') return COLORS.readiness.caution;
  return COLORS.readiness.depleted;
}

function getCoachingFocus(primaryLimiter: ReturnType<typeof inferPrimaryLimiterFromDailyCheck>): CoachingFocus {
  if (primaryLimiter === 'nutrition' || primaryLimiter === 'hydration') return 'nutrition';
  if (primaryLimiter === 'none') return 'execution';
  return 'recovery';
}

function getValue(values: Record<CheckKey, number>, key: CheckKey): number {
  return values[key];
}

export function LogScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { themeColor, gradient, lightTint } = useReadinessTheme();
  const logScreenData = useLogScreenData();
  const [weight, setWeight] = useState('');
  const [values, setValues] = useState<Record<CheckKey, number>>({
    sleep: 3,
    energy: 3,
    stress: 3,
    soreness: 3,
    confidence: 3,
  });
  const [painLevel, setPainLevel] = useState(1);
  const [showPainScale, setShowPainScale] = useState(false);
  const [tooltip, setTooltip] = useState<CheckScale | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const initial = logScreenData.initialValues;
    setWeight(initial.weight);
    setValues({
      sleep: initial.sleep,
      energy: initial.energyLevel,
      stress: initial.stressLevel,
      soreness: initial.sorenessLevel,
      confidence: initial.confidenceLevel,
    });
    setPainLevel(initial.painLevel);
    setShowPainScale(initial.painLevel > 1 || initial.sorenessLevel >= 4);
  }, [logScreenData.version, logScreenData.initialValues]);

  const checkInput: DailyPerformanceCheckInput = useMemo(() => ({
    sleepQuality: values.sleep,
    energyLevel: values.energy,
    stressLevel: values.stress,
    sorenessLevel: values.soreness,
    confidenceLevel: values.confidence,
    painLevel: showPainScale ? painLevel : null,
  }), [painLevel, showPainScale, values]);
  const estimatedScore = useMemo(() => estimateDailyPerformanceReadinessScore(checkInput), [checkInput]);
  const band = useMemo(() => mapScoreToPerformanceBand(estimatedScore), [estimatedScore]);
  const bandColor = getBandColor(band);
  const bandCopy = BAND_COPY[band];
  const bottomActionClearance = Math.max(tabBarHeight, insets.bottom) + SPACING.lg;

  const setScaleValue = (key: CheckKey, value: number) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (key === 'soreness' && value >= 4) {
      setShowPainScale(true);
    }
    Haptics.selectionAsync();
  };

  const saveCheck = async () => {
    setIsSaving(true);
    try {
      const userId = await getActiveUserId();
      if (!userId) {
        Alert.alert('Error', 'No authenticated user found.');
        return;
      }

      const legacyReadiness = deriveLegacyReadinessFromDailyCheck(checkInput);
      const primaryLimiter = inferPrimaryLimiterFromDailyCheck(checkInput);
      const debrief = generateDailyCoachDebrief({
        sleepQuality: values.sleep,
        readiness: legacyReadiness,
        energyLevel: values.energy,
        painLevel: showPainScale ? painLevel : null,
        stressLevel: values.stress,
        sorenessLevel: Math.max(values.soreness, showPainScale ? painLevel : 1),
        confidenceLevel: values.confidence,
        primaryLimiter,
        nutritionAdherence: null,
        nutritionBarrier: 'none' as NutritionBarrier,
        coachingFocus: getCoachingFocus(primaryLimiter),
        trainingLoadSummary: {
          plannedMinutes: logScreenData.todayTrainingLoad.totalMinutes,
          plannedIntensity: logScreenData.todayTrainingLoad.weightedIntensity,
          totalLoad: logScreenData.todayTrainingLoad.totalLoad,
          acuteLoad: logScreenData.acwrContext.acute,
          chronicLoad: logScreenData.acwrContext.chronic,
          acwrRatio: logScreenData.acwrContext.ratio,
          acwrStatus: logScreenData.acwrContext.status,
        },
        context: {
          phase: logScreenData.acwrContext.phase,
          hasActiveWeightClassPlan: logScreenData.acwrContext.hasActiveWeightClassPlan,
        },
        previousDebrief: logScreenData.previousDebrief,
      });

      const performancePayload = {
        user_id: userId,
        date: logScreenData.logDate,
        morning_weight: weight.trim() ? Number.parseFloat(weight) : null,
        sleep_quality: values.sleep,
        readiness: legacyReadiness,
        energy_level: values.energy,
        stress_level: values.stress,
        soreness_level: values.soreness,
        pain_level: showPainScale ? painLevel : null,
        confidence_level: values.confidence,
        primary_limiter: primaryLimiter,
        nutrition_barrier: 'none',
        coaching_focus: getCoachingFocus(primaryLimiter),
        coach_debrief: debrief,
        readiness_score: estimatedScore,
        checkin_version: 2,
      };
      const legacyPayload = {
        user_id: userId,
        date: logScreenData.logDate,
        morning_weight: weight.trim() ? Number.parseFloat(weight) : null,
        sleep_quality: values.sleep,
        readiness: legacyReadiness,
        stress_level: values.stress,
        soreness_level: values.soreness,
        confidence_level: values.confidence,
        primary_limiter: primaryLimiter,
        nutrition_barrier: 'none',
        coaching_focus: getCoachingFocus(primaryLimiter),
        coach_debrief: debrief,
      };

      const { error } = await supabase.from('daily_checkins').upsert(performancePayload, { onConflict: 'user_id,date' });
      const savedWithPerformanceColumns = !error;
      if (error) {
        if (!isMissingDailyPerformanceCheckColumnError(error)) throw error;
        const fallback = await supabase.from('daily_checkins').upsert(legacyPayload, { onConflict: 'user_id,date' });
        if (fallback.error) throw fallback.error;
      }

      invalidateEngineDataCache({ userId, date: logScreenData.logDate });
      const engineState = await getDailyEngineState(userId, logScreenData.logDate, { forceRefresh: true });

      if (savedWithPerformanceColumns) {
        const canonicalReadinessScore = engineState.unifiedPerformance?.canonicalOutputs.readiness.overallReadiness
          ?? engineState.readinessProfile.overallReadiness;
        const readinessUpdate = await supabase
          .from('daily_checkins')
          .update({
            readiness_score: canonicalReadinessScore,
          })
          .eq('user_id', userId)
          .eq('date', logScreenData.logDate);
        if (readinessUpdate.error && !isMissingDailyPerformanceCheckColumnError(readinessUpdate.error)) {
          throw readinessUpdate.error;
        }
      }

      invalidateEngineDataCache({ userId, date: logScreenData.logDate });
      navigation.navigate('TodayHome');
    } catch (error) {
      logError('LogScreen.savePerformanceCheck', error, { targetDate: logScreenData.logDate });
      Alert.alert('Error', 'Could not save your daily check.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <View>
          <Text style={styles.headerTitle}>Daily Performance Check</Text>
          <Text style={styles.headerSubtitle}>Score the factors that affect training today.</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomActionClearance }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()}>
          <UnifiedJourneySummaryCard
            summary={logScreenData.performanceContext}
            compact
            showProtectedAnchors={false}
            showBodyMass={Boolean(logScreenData.performanceContext.bodyMass)}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()} style={[styles.resultPanel, { borderColor: bandColor }]}>
          <View style={styles.resultHeaderRow}>
            <View>
              <Text style={styles.resultLabel}>TODAY</Text>
              <Text style={[styles.resultBand, { color: bandColor }]}>{bandCopy.title}</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: `${bandColor}22`, borderColor: `${bandColor}55` }]}>
              <Text style={[styles.scoreText, { color: bandColor }]}>{estimatedScore}</Text>
            </View>
          </View>
          <Text style={styles.resultBody}>{bandCopy.body}</Text>
        </Animated.View>

        <View style={styles.weightGroup}>
          <Text style={styles.fieldLabel}>Morning Weight (optional)</Text>
          <TextInput
            style={styles.weightInput}
            value={weight}
            onChangeText={(next) => setWeight(sanitizeNumericInput(next))}
            keyboardType="decimal-pad"
            placeholder="155.0"
            placeholderTextColor={COLORS.text.tertiary}
            returnKeyType="done"
          />
        </View>

        {CHECK_SCALES.map((scale, index) => (
          <Animated.View
            key={scale.key}
            entering={FadeInDown.delay(index * 35).duration(ANIMATION.normal).springify()}
            style={styles.scaleGroup}
          >
            <View style={styles.scaleHeader}>
              <View>
                <Text style={styles.scaleLabel}>{scale.label}</Text>
                <Text style={styles.scaleQuestion}>{scale.question}</Text>
              </View>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setTooltip(scale)}
                accessibilityLabel={`${scale.label} scoring help`}
                accessibilityRole="button"
              >
                <IconInfo size={16} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.choiceRow}>
              {scale.values.map((label, valueIndex) => {
                const value = valueIndex + 1;
                const selected = getValue(values, scale.key) === value;
                return (
                  <TouchableOpacity
                    key={`${scale.key}-${value}`}
                    style={[
                      styles.choiceButton,
                      selected && {
                        borderColor: bandColor,
                        backgroundColor: `${bandColor}1F`,
                      },
                    ]}
                    onPress={() => setScaleValue(scale.key, value)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${scale.label} ${value} ${label}`}
                  >
                    <Text style={[styles.choiceNumber, selected && { color: bandColor }]}>{value}</Text>
                    <Text style={[styles.choiceLabel, selected && { color: COLORS.text.primary }]} numberOfLines={2}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ))}

        {showPainScale ? (
          <Animated.View entering={FadeInDown.duration(ANIMATION.normal).springify()} style={styles.scaleGroup}>
            <View style={styles.scaleHeader}>
              <View>
                <Text style={styles.scaleLabel}>Pain</Text>
                <Text style={styles.scaleQuestion}>Pain with movement?</Text>
              </View>
              <TouchableOpacity
                style={styles.infoButton}
                onPress={() => setTooltip({
                  key: 'soreness',
                  label: 'Pain',
                  question: 'Pain with movement?',
                  tooltip: 'Score pain only if it changes movement, range, loading, or contact. Sharp or limiting pain is 4-5.',
                  values: ['None', 'Mild', 'Moderate', 'Limiting', 'Stop'],
                })}
              >
                <IconInfo size={16} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.choiceRow}>
              {['None', 'Mild', 'Moderate', 'Limiting', 'Stop'].map((label, idx) => {
                const value = idx + 1;
                const selected = painLevel === value;
                return (
                  <TouchableOpacity
                    key={`pain-${value}`}
                    style={[
                      styles.choiceButton,
                      selected && {
                        borderColor: bandColor,
                        backgroundColor: `${bandColor}1F`,
                      },
                    ]}
                    onPress={() => {
                      setPainLevel(value);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.78}
                  >
                    <Text style={[styles.choiceNumber, selected && { color: bandColor }]}>{value}</Text>
                    <Text style={[styles.choiceLabel, selected && { color: COLORS.text.primary }]} numberOfLines={2}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ) : (
          <TouchableOpacity
            style={[styles.addPainButton, { borderColor: themeColor, backgroundColor: lightTint }]}
            onPress={() => setShowPainScale(true)}
            activeOpacity={0.78}
          >
            <Text style={[styles.addPainText, { color: themeColor }]}>Add pain score</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
        <AnimatedPressable
          style={[styles.primaryWrap, isSaving && styles.disabled]}
          onPress={saveCheck}
          disabled={isSaving}
          haptic
        >
          <LinearGradient
            colors={gradient as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save Check'}</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>

      <Modal
        visible={tooltip !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTooltip(null)}
      >
        <TouchableOpacity style={styles.modalScrim} activeOpacity={1} onPress={() => setTooltip(null)}>
          <View style={[styles.tooltipSheet, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
            <Text style={styles.tooltipTitle}>{tooltip?.label}</Text>
            <Text style={styles.tooltipQuestion}>{tooltip?.question}</Text>
            <Text style={styles.tooltipBody}>{tooltip?.tooltip}</Text>
            <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltip(null)}>
              <Text style={styles.tooltipCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 27,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  resultPanel: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  resultLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0.8,
  },
  resultBand: {
    marginTop: 2,
    fontSize: 30,
    fontFamily: FONT_FAMILY.black,
  },
  resultBody: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  scoreBadge: {
    minWidth: 64,
    height: 56,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 25,
    fontFamily: FONT_FAMILY.black,
  },
  weightGroup: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  weightInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
  },
  scaleGroup: {
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: SPACING.md,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  scaleLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  scaleQuestion: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  infoButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  choiceButton: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: SPACING.xs,
  },
  choiceNumber: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.tertiary,
    marginBottom: 2,
  },
  choiceLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  addPainButton: {
    minHeight: 48,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  addPainText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  primaryWrap: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.colored.prime,
  },
  primaryButton: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  primaryButtonText: {
    color: '#F5F5F0',
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
  },
  disabled: {
    opacity: 0.55,
  },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  tooltipSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  tooltipTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
  },
  tooltipQuestion: {
    marginTop: SPACING.xs,
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  tooltipBody: {
    marginTop: SPACING.md,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  tooltipClose: {
    marginTop: SPACING.lg,
    minHeight: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  tooltipCloseText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
});
