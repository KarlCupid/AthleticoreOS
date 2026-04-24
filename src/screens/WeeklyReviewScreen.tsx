import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { useReadinessTheme } from '../theme/ReadinessThemeContext';
import { WeeklyComplianceBar } from '../components/WeeklyComplianceBar';
import { StreakBadge } from '../components/StreakBadge';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { AnimatedPressable } from '../components/AnimatedPressable';

import { getWeeklyReview } from '../../lib/api/scheduleService';
import { buildWeeklyReviewNarrativeViewModel, type WeeklyReviewInsights, type WeeklyReviewNarrativeViewModel } from '../../lib/engine/presentation';
import { getFightCampStatus } from '../../lib/api/fightCampService';
import type { WeeklyComplianceReport } from '../../lib/engine/types';
import { formatLocalDate, todayLocalDate } from '../../lib/utils/date';
import { calculateCampRisk, type CampRiskAssessment } from '../../lib/engine/calculateCampRisk';
import { logError } from '../../lib/utils/logger';

interface WeekInsights {
  campLabel: string;
  projectedMakeWeightStatus: string;
  readinessAvg: number | null;
  readinessDelta: number | null;
  weightDelta: number | null;
  recommendationFollowThroughPct: number | null;
  recommendationCount: number;
  campRisk: CampRiskAssessment | null;
}

function getCurrentWeekWindow(): { weekStart: string; weekEnd: string } {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStart: formatLocalDate(monday),
    weekEnd: formatLocalDate(sunday),
  };
}

export function WeeklyReviewScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { themeColor } = useReadinessTheme();

  const [report, setReport] = useState<WeeklyComplianceReport | null>(null);
  const [insights, setInsights] = useState<WeekInsights | null>(null);
  const [narrative, setNarrative] = useState<WeeklyReviewNarrativeViewModel | null>(null);
  const [showLoadDetails, setShowLoadDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { weekStart, weekEnd } = getCurrentWeekWindow();

    try {
      const [review, campStatus, checkinsResult, recommendationsResult] = await Promise.all([
        getWeeklyReview(session.user.id, weekStart),
        getFightCampStatus(session.user.id, todayLocalDate()),
        supabase
          .from('daily_checkins')
          .select('date, readiness, morning_weight')
          .eq('user_id', session.user.id)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .order('date', { ascending: true }),
        supabase
          .from('scheduled_activities')
          .select('status, recommendation_severity, recommendation_status')
          .eq('user_id', session.user.id)
          .gte('date', weekStart)
          .lte('date', weekEnd)
          .not('recommendation_severity', 'is', null),
      ]);

      setReport(review);

      const checkins = (checkinsResult.data ?? []) as {
        date: string;
        readiness: number | null;
        morning_weight: number | null;
      }[];

      const readinessValues = checkins
        .map((row) => row.readiness)
        .filter((value): value is number => typeof value === 'number');

      const readinessAvg =
        readinessValues.length > 0
          ? Math.round((readinessValues.reduce((sum, value) => sum + value, 0) / readinessValues.length) * 10) / 10
          : null;

      const readinessDelta =
        readinessValues.length >= 2
          ? Math.round((readinessValues[readinessValues.length - 1] - readinessValues[0]) * 10) / 10
          : null;

      const weightValues = checkins
        .map((row) => row.morning_weight)
        .filter((value): value is number => typeof value === 'number');

      const weightDelta =
        weightValues.length >= 2
          ? Math.round((weightValues[weightValues.length - 1] - weightValues[0]) * 10) / 10
          : null;

      const latestWeight = weightValues.length > 0 ? weightValues[weightValues.length - 1] : null;
      const targetWeight = campStatus.camp?.targetWeight ?? null;
      const remainingWeightLbs =
        latestWeight != null && targetWeight != null
          ? Math.max(0, latestWeight - targetWeight)
          : null;

      const recommendationRows = ((recommendationsResult.data ?? []) as unknown) as {
        status: string;
        recommendation_severity: 'info' | 'recommended' | 'strongly_recommended' | null;
        recommendation_status: 'pending' | 'accepted' | 'declined' | 'completed' | null;
      }[];

      const recommendationCount = recommendationRows.length;
      const followedThrough = recommendationRows.filter((row) => {
        if (row.recommendation_status === 'accepted' || row.recommendation_status === 'completed') {
          return true;
        }
        return row.recommendation_status == null && row.status === 'completed';
      }).length;
      const recommendationFollowThroughPct =
        recommendationCount > 0
          ? Math.round((followedThrough / recommendationCount) * 100)
          : null;

      const today = todayLocalDate();
      const isTravelWindow = Boolean(
        campStatus.camp?.travelStartDate
        && campStatus.camp.travelStartDate <= today
        && (!campStatus.camp.travelEndDate || today <= campStatus.camp.travelEndDate),
      );

      const campRisk = calculateCampRisk({
        goalMode: campStatus.camp ? 'fight_camp' : 'build_phase',
        weightCutState: campStatus.weightCutState,
        daysOut: campStatus.daysOut,
        remainingWeightLbs,
        weighInTiming: campStatus.camp?.weighInTiming ?? null,
        readinessAvg,
        readinessDelta,
        recommendationFollowThroughPct,
        isTravelWindow,
      });

      const projectedMakeWeightStatus = campRisk?.projectedMakeWeightStatus ?? 'Build Phase active';

      const weekInsights: WeekInsights = {
        campLabel: campStatus.label,
        projectedMakeWeightStatus,
        readinessAvg,
        readinessDelta,
        weightDelta,
        recommendationFollowThroughPct,
        recommendationCount,
        campRisk,
      };
      setInsights(weekInsights);

      const narrativeInsights: WeeklyReviewInsights = {
        readinessAvg,
        readinessDelta,
        weightDelta,
        recommendationFollowThroughPct,
        recommendationCount,
        campRisk,
        campLabel: campStatus.label,
      };
      setNarrative(buildWeeklyReviewNarrativeViewModel(review, narrativeInsights));
    } catch (error) {
      logError('WeeklyReviewScreen.loadReview', error, { weekStart, weekEnd });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !report || !insights) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Week in Review</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={[styles.content, { flex: 1, marginTop: SPACING.md }]}>
          <SkeletonLoader width="100%" height={160} shape="rect" style={{ borderRadius: RADIUS.xl, marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={220} shape="rect" style={{ borderRadius: RADIUS.lg, marginBottom: SPACING.md }} />
          <SkeletonLoader width="100%" height={120} shape="rect" style={{ borderRadius: RADIUS.lg }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Week in Review</Text>
        <StreakBadge streak={report.streak} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* 1. Narrative — reading-first */}
        {narrative ? (
          <Animated.View entering={FadeInDown.delay(50).duration(ANIMATION.normal).springify()}>
            <View style={styles.card}>
              <Text style={styles.narrativeSummary}>{narrative.narrativeSummary}</Text>

              <View style={styles.narrativeRowList}>
                <View style={styles.narrativeRow}>
                  <Text style={[styles.narrativeKicker, { color: COLORS.success }]}>IMPROVED</Text>
                  <Text style={styles.narrativeRowText}>{narrative.whatImproved}</Text>
                </View>
                {narrative.whatSlipped ? (
                  <View style={styles.narrativeRow}>
                    <Text style={[styles.narrativeKicker, { color: COLORS.warning }]}>SLIPPED</Text>
                    <Text style={styles.narrativeRowText}>{narrative.whatSlipped}</Text>
                  </View>
                ) : null}
                <View style={styles.narrativeRow}>
                  <Text style={[styles.narrativeKicker, { color: themeColor }]}>NEXT FOCUS</Text>
                  <Text style={styles.narrativeRowText}>{narrative.whatChangesNext}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* 2. Single highlight chart */}
        {narrative?.highlightChart === 'training_compliance' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.normal).springify()}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Training Compliance</Text>
              <WeeklyComplianceBar label="S&C" planned={report.sc.planned} actual={report.sc.actual} color="#4A90D9" />
              <WeeklyComplianceBar label="Boxing" planned={report.boxing.planned} actual={report.boxing.actual} color="#FF6B35" />
            </View>
          </Animated.View>
        ) : null}
        {narrative?.highlightChart === 'readiness_trend' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.normal).springify()}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Readiness Trend</Text>
              <View style={styles.loadRow}>
                <View style={styles.loadStat}>
                  <AnimatedNumber value={insights.readinessAvg ?? 0} style={[styles.loadNumber, { color: themeColor }]} />
                  <Text style={styles.loadLabel}>Avg Readiness</Text>
                </View>
                {insights.readinessDelta != null ? (
                  <>
                    <View style={styles.loadDivider} />
                    <View style={styles.loadStat}>
                      <Text style={[styles.loadNumber, { color: insights.readinessDelta >= 0 ? COLORS.success : COLORS.error }]}>
                        {insights.readinessDelta >= 0 ? '+' : ''}{insights.readinessDelta}
                      </Text>
                      <Text style={styles.loadLabel}>Week Trend</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </Animated.View>
        ) : null}
        {narrative?.highlightChart === 'weight_trend' ? (
          <Animated.View entering={FadeInDown.delay(90).duration(ANIMATION.normal).springify()}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weight This Week</Text>
              <View style={styles.loadRow}>
                <View style={styles.loadStat}>
                  <Text style={[styles.loadNumber, { color: insights.weightDelta != null && insights.weightDelta <= 0 ? COLORS.success : COLORS.warning }]}>
                    {insights.weightDelta != null ? `${insights.weightDelta > 0 ? '+' : ''}${insights.weightDelta} lb` : 'n/a'}
                  </Text>
                  <Text style={styles.loadLabel}>Weight Change</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* 3. Activity Breakdown — secondary */}
        <Animated.View entering={FadeInDown.delay(120).duration(ANIMATION.normal).springify()}>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <Text style={styles.cardTitle}>Activity Breakdown</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <AnimatedNumber value={report.overallPct} style={[styles.inlineScore, { color: themeColor }]} />
                <Text style={[styles.inlineScore, { color: themeColor }]}>%</Text>
              </View>
            </View>
            <WeeklyComplianceBar label="S&C" planned={report.sc.planned} actual={report.sc.actual} color="#4A90D9" />
            <WeeklyComplianceBar label="Boxing" planned={report.boxing.planned} actual={report.boxing.actual} color="#FF6B35" />
            <WeeklyComplianceBar label="Running" planned={report.running.planned} actual={report.running.actual} color="#4CAF50" />
            <WeeklyComplianceBar label="Conditioning" planned={report.conditioning.planned} actual={report.conditioning.actual} color="#FFC107" />
            <WeeklyComplianceBar label="Recovery" planned={report.recovery.planned} actual={report.recovery.actual} color="#9C27B0" />
          </View>
        </Animated.View>

        {/* 4. Load Summary — collapsed */}
        <Animated.View entering={FadeInDown.delay(150).duration(ANIMATION.normal).springify()}>
          <View style={styles.card}>
            <AnimatedPressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => setShowLoadDetails((v) => !v)}
            >
              <Text style={styles.cardTitle}>Load Details</Text>
              <Text style={{ fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary }}>
                {showLoadDetails ? 'Hide ▲' : 'Show ▼'}
              </Text>
            </AnimatedPressable>
            {showLoadDetails ? (
              <View style={[styles.loadRow, { marginTop: SPACING.md }]}>
                <View style={styles.loadStat}>
                  <AnimatedNumber value={report.totalLoadPlanned} style={styles.loadNumber} />
                  <Text style={styles.loadLabel}>Planned Load</Text>
                </View>
                <View style={styles.loadDivider} />
                <View style={styles.loadStat}>
                  <AnimatedNumber value={report.totalLoadActual} style={styles.loadNumber} />
                  <Text style={styles.loadLabel}>Actual Load</Text>
                </View>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  headerTitle: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  content: { paddingHorizontal: SPACING.lg },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  scoreNumber: { fontSize: 48, fontFamily: FONT_FAMILY.black },
  scoreLabel: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, marginTop: 4 },
  scoreMessage: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardTitle: { fontSize: 16, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginBottom: SPACING.md },
  metricLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  metricMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  loadRow: { flexDirection: 'row', alignItems: 'center' },
  loadStat: { flex: 1, alignItems: 'center' },
  loadNumber: { fontSize: 24, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  loadLabel: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary, marginTop: 2 },
  loadDivider: { width: 1, height: 40, backgroundColor: COLORS.borderLight },

  // Narrative styles
  narrativeSummary: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  narrativeRowList: {
    gap: SPACING.sm,
  },
  narrativeRow: {
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  narrativeKicker: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.semiBold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  narrativeRowText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  inlineScore: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.black,
    letterSpacing: -0.3,
  },
});


