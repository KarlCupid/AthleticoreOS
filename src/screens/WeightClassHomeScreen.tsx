import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useBodyMassPlanData } from '../hooks/useBodyMassPlanData';
import type { FuelStackParamList } from '../navigation/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import {
  IconTarget, IconChevronRight, IconTrendDown, IconScale,
} from '../components/icons';
import { Card } from '../components/Card';
import { BodyMassSupportTimeline } from '../components/BodyMassSupportTimeline';
import { BodyMassTrendChart } from '../components/BodyMassTrendChart';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { getBodyMassSupportPhase, type BodyMassSupportPhase } from '../../lib/performance-engine';
import { todayLocalDate } from '../../lib/utils/date';

type NavProp = NativeStackNavigationProp<FuelStackParamList, 'WeightClassHome'>;

const PHASE_LABELS: Record<BodyMassSupportPhase, string> = {
  unknown: 'Body-Mass Context',
  long_term_body_composition: 'Long-Term Management',
  gradual_weight_class_preparation: 'Weight-Class Prep',
  competition_week_body_mass_monitoring: 'Competition Week Monitoring',
  weigh_in_logistics: 'Weigh-in Day',
  post_weigh_in_recovery_tracking: 'Post Weigh-In Recovery',
  high_risk_review: 'Safety Review',
};

const PHASE_COLORS: Record<BodyMassSupportPhase, [string, string]> = {
  unknown: [COLORS.chart.water, COLORS.chart.water],
  long_term_body_composition: [COLORS.accent, COLORS.chart.fatigue],
  gradual_weight_class_preparation: [COLORS.success, COLORS.success],
  competition_week_body_mass_monitoring: [COLORS.chart.water, COLORS.chart.water],
  weigh_in_logistics: [COLORS.error, COLORS.error],
  post_weigh_in_recovery_tracking: [COLORS.success, COLORS.success],
  high_risk_review: [COLORS.warning, COLORS.readiness.caution],
};

function statusColor(tone: 'ready' | 'caution' | 'blocked' | 'unknown'): string {
  if (tone === 'ready') return COLORS.success;
  if (tone === 'caution') return COLORS.warning;
  if (tone === 'blocked') return COLORS.error;
  return COLORS.chart.water;
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000);
}

export function WeightClassHomeScreen() {
  const nav = useNavigation<NavProp>();
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const {
    loading, error, activePlan, weightHistory,
    weightClassHistory, projectedWeightByWeighIn, adherenceLast7Days,
    refresh, abandon, performanceContext, guidedBodyMass,
  } = useBodyMassPlanData(userId);

  const handleEndPlan = useCallback(() => {
    Alert.alert(
      'End Weight-Class Plan',
      'Why are you ending this weight-class plan?',
      [
        {
          text: 'Fight fell through',
          onPress: () => {
            Alert.alert(
              'End Weight-Class Plan',
              'This plan will be marked abandoned and the journey will return to normal performance targets. You can evaluate a new class when another fight appears.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Plan', style: 'destructive', onPress: () => abandon('fight_fell_through') },
              ]
            );
          },
        },
        {
          text: 'Made weight',
          onPress: () => {
            Alert.alert(
              'Mark Complete',
              'Mark this weight-class plan as complete?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Mark Complete', onPress: () => abandon('made_weight') },
              ]
            );
          },
        },
        {
          text: 'Other reason',
          onPress: () => {
            Alert.alert(
              'End Weight-Class Plan',
              'End this plan and return to normal performance targets?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Plan', style: 'destructive', onPress: () => abandon('other') },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  }, [abandon]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  // Loading
  if (userId === null || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  // Error state
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: COLORS.error, textAlign: 'center', marginHorizontal: SPACING.xl }}>
          {error}
        </Text>
        <TouchableOpacity onPress={refresh} style={{ marginTop: SPACING.md, padding: SPACING.md }}>
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: COLORS.accent }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // No active weight-class plan
  if (!activePlan) {
    return (
      <View style={styles.noPlanContainer}>
        <LinearGradient colors={['rgba(10, 10, 10, 0.94)', 'rgba(212, 175, 55, 0.20)']} style={styles.noPlanGradient}>
          <IconScale size={64} color={COLORS.accent} />
          <Text style={styles.noPlanTitle}>Weight-Class Context</Text>
          <Text style={styles.noPlanSubtitle}>
            Check whether a target can be reached safely while maintaining performance.
          </Text>
          <UnifiedJourneySummaryCard
            summary={performanceContext}
            compact
            showProtectedAnchors={false}
            showBodyMass={Boolean(performanceContext.bodyMass)}
            style={styles.noPlanJourneyCard}
          />
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => nav.navigate('WeightClassPlanSetup')}
          >
            <Text style={styles.startButtonText}>Evaluate Class</Text>
          </TouchableOpacity>
          {weightClassHistory.length > 0 && (
            <TouchableOpacity
              style={styles.historyLink}
              onPress={() => nav.navigate('WeightClassHistory')}
            >
              <Text style={styles.historyLinkText}>View Past Class Plans ({weightClassHistory.length})</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  }

  const phase = getBodyMassSupportPhase(activePlan, todayLocalDate());
  const daysOut = Math.max(0, daysBetween(todayLocalDate(), activePlan.weigh_in_date));
  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : activePlan.start_weight;
  const remaining = Math.max(0, currentWeight - activePlan.target_weight).toFixed(1);
  const phaseColors = PHASE_COLORS[phase];
  const bodyMassPlanBlocked = guidedBodyMass.planBlocked || performanceContext.riskFlags.some((flag) => (
    flag.blocksPlan
    && /weight|body|fuel|professional|unsafe|rapid/i.test(`${flag.label} ${flag.message}`)
  )) || performanceContext.bodyMass?.safetyLabel === 'Blocked for safety'
    || performanceContext.bodyMass?.safetyLabel === 'Professional review required';
  const bodyMassBlockReason = guidedBodyMass.available ? guidedBodyMass.primaryMessage
    : performanceContext.riskFlags.find((flag) => flag.blocksPlan)?.message
      ?? performanceContext.bodyMass?.explanation
      ?? 'The requested body-mass plan needs review before Athleticore can show daily weight-class guidance.';
  const bodyMassGuidance = guidedBodyMass.available ? guidedBodyMass.primaryMessage
    : performanceContext.bodyMass?.explanation
    ?? performanceContext.nutrition.explanation
    ?? 'Body-mass support is guided by phase, training, fueling, readiness, and safety context together.';
  const confidenceNote = performanceContext.lowConfidence
    ? guidedBodyMass.confidenceSummary || performanceContext.confidenceSummary
    : performanceContext.bodyMass?.riskLabel
      ? `Current body-mass risk: ${performanceContext.bodyMass.riskLabel}.`
      : guidedBodyMass.confidenceSummary;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient colors={['rgba(10, 10, 10, 0.94)', `${phaseColors[0]}30`]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>
            <Text style={styles.countdownText}>
              {daysOut === 0 ? 'WEIGH-IN TODAY' : `${daysOut} days to weigh-in`}
            </Text>
          </View>
          <View style={styles.adherenceBadge}>
            <Text style={styles.adherenceValue}>{adherenceLast7Days}%</Text>
            <Text style={styles.adherenceLabel}>7d adherence</Text>
          </View>
        </View>

        <View style={styles.heroNumbers}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{currentWeight.toFixed(1)}</Text>
            <Text style={styles.heroStatLabel}>Current (lbs)</Text>
          </View>
          <View style={styles.heroArrow}>
            <IconTrendDown size={28} color={COLORS.text.secondary} />
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{activePlan.target_weight}</Text>
            <Text style={styles.heroStatLabel}>Target (lbs)</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { color: Number(remaining) > 5 ? COLORS.warning : COLORS.success }]}>
              {remaining}
            </Text>
            <Text style={styles.heroStatLabel}>Remaining (lbs)</Text>
          </View>
        </View>

        {projectedWeightByWeighIn !== null && (
          <View style={styles.projectionBanner}>
            <Text style={styles.projectionText}>
              Projected weigh-in: {projectedWeightByWeighIn.toFixed(1)} lbs
              {projectedWeightByWeighIn <= activePlan.target_weight ? ' - within target context' : ' - needs review'}
            </Text>
          </View>
        )}
      </LinearGradient>
      <Card
        style={[styles.guidedCard, { borderLeftColor: statusColor(guidedBodyMass.statusTone) }]}
        backgroundTone={guidedBodyMass.planBlocked ? 'risk' : 'bodyMassSupport'}
        backgroundScrimColor="rgba(10, 10, 10, 0.76)"
      >
        <View style={styles.guidedHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.guidedEyebrow}>{guidedBodyMass.title}</Text>
            <Text style={styles.guidedTitle}>{guidedBodyMass.primaryQuestion}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: statusColor(guidedBodyMass.statusTone) }]}>
            <Text style={[styles.statusPillText, { color: statusColor(guidedBodyMass.statusTone) }]}>
              {guidedBodyMass.statusLabel}
            </Text>
          </View>
        </View>
        <Text style={styles.guidanceBody}>{guidedBodyMass.primaryMessage}</Text>
        <View style={styles.detailGrid}>
          {guidedBodyMass.detailRows.slice(0, 6).map((row) => (
            <View key={`${row.label}-${row.value}`} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>
        {guidedBodyMass.professionalReviewRecommendation ? (
          <Text style={styles.reviewText}>{guidedBodyMass.professionalReviewRecommendation}</Text>
        ) : null}
        {guidedBodyMass.saferAlternatives.length > 0 ? (
          <View style={styles.supportBlock}>
            <Text style={styles.supportTitle}>Safer options</Text>
            {guidedBodyMass.saferAlternatives.slice(0, 3).map((item) => (
              <Text key={item} style={styles.supportText}>- {item}</Text>
            ))}
          </View>
        ) : null}
        {guidedBodyMass.riskHighlights.length > 0 ? (
          <View style={styles.supportBlock}>
            <Text style={styles.supportTitle}>Risk context</Text>
            {guidedBodyMass.riskHighlights.slice(0, 2).map((item) => (
              <Text key={item} style={styles.supportText}>- {item}</Text>
            ))}
          </View>
        ) : null}
        <View style={styles.nextActionRow}>
          {guidedBodyMass.nextActions.slice(0, 3).map((action) => (
            <View key={action} style={styles.nextActionPill}>
              <Text style={styles.nextActionText}>{action}</Text>
            </View>
          ))}
        </View>
      </Card>
      <UnifiedJourneySummaryCard
        summary={performanceContext}
        compact
        showProtectedAnchors={false}
        showBodyMass={Boolean(performanceContext.bodyMass)}
      />

      {bodyMassPlanBlocked ? (
        <Card
          style={styles.card}
          backgroundTone="risk"
          backgroundScrimColor="rgba(10, 10, 10, 0.74)"
        >
          <Text style={styles.sectionTitle}>Automatic support blocked for safety</Text>
          <Text style={styles.guidanceBody}>{bodyMassBlockReason}</Text>
        </Card>
      ) : (
        <Card
          style={styles.card}
          backgroundTone="bodyMassSupport"
          backgroundScrimColor="rgba(10, 10, 10, 0.74)"
        >
          <Text style={styles.sectionTitle}>Today's body-mass support</Text>
          <Text style={styles.guidanceBody}>{bodyMassGuidance}</Text>
          <Text style={styles.guidanceMeta}>{confidenceNote}</Text>
        </Card>
      )}

      <Card
        style={styles.card}
        backgroundTone="bodyMassSupport"
        backgroundScrimColor="rgba(10, 10, 10, 0.76)"
      >
        <Text style={styles.sectionTitle}>Health guidance note</Text>
        <Text style={styles.guidanceBody}>
          This feature provides coaching-oriented educational guidance. It does not replace licensed medical advice,
          diagnosis, or emergency care.
        </Text>
      </Card>
      {/* Weight chart */}
      <Card
        style={styles.card}
        backgroundTone="bodyTrend"
        backgroundScrimColor="rgba(10, 10, 10, 0.80)"
      >
        <Text style={styles.sectionTitle}>Weight Trend</Text>
        <BodyMassTrendChart
          weightHistory={weightHistory}
          targetWeight={activePlan.target_weight}
          projectedWeight={projectedWeightByWeighIn}
          weighInDate={activePlan.weigh_in_date}
        />
      </Card>
      {/* Phase timeline */}
      <Card
        style={styles.card}
        backgroundTone="bodyMassSupport"
        backgroundScrimColor="rgba(10, 10, 10, 0.78)"
      >
        <Text style={styles.sectionTitle}>Body-Mass Timeline</Text>
        <BodyMassSupportTimeline plan={activePlan} currentPhase={phase} />
      </Card>
      {/* Quick actions */}
      <View style={styles.quickActions}>
        {phase === 'competition_week_body_mass_monitoring' || phase === 'weigh_in_logistics' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: phaseColors[0] }]}
            onPress={() => nav.navigate('CompetitionBodyMass')}
          >
            <Text style={styles.actionButtonText}>Fight Week Support</Text>
            <IconChevronRight size={18} color={COLORS.text.inverse} />
          </TouchableOpacity>
        ) : null}

        {phase === 'post_weigh_in_recovery_tracking' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.readiness.prime }]}
            onPress={() => nav.navigate('PostWeighInRecovery', {
              weighInWeightLbs: currentWeight,
              hoursToFight: 24,
            })}
          >
            <Text style={styles.actionButtonText}>Post Weigh-In Recovery</Text>
            <IconChevronRight size={18} color={COLORS.text.inverse} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.surfaceSecondary }]}
          onPress={() => nav.navigate('WeightClassHistory')}
        >
          <Text style={[styles.actionButtonText, { color: COLORS.text.primary }]}>Past Class Plans</Text>
          <IconChevronRight size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endPlanButton}
          onPress={handleEndPlan}
        >
          <Text style={styles.endPlanText}>End Weight-Class Plan</Text>
        </TouchableOpacity>
      </View>
      {/* Weight class info */}
      {activePlan.weight_class_name && (
        <Card
          style={[styles.card, styles.weightClassCard]}
          backgroundTone="bodyMassSupport"
          backgroundScrimColor="rgba(10, 10, 10, 0.78)"
        >
          <IconTarget size={16} color={COLORS.text.secondary} />
          <Text style={styles.weightClassText}>
            {activePlan.weight_class_name} - {activePlan.sport?.toUpperCase()} - {activePlan.fight_status}
          </Text>
        </Card>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  noPlanContainer: { flex: 1 },
  noPlanGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  noPlanJourneyCard: { alignSelf: 'stretch', marginBottom: 0 },
  noPlanTitle: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, textAlign: 'center', letterSpacing: 0 },
  noPlanSubtitle: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 24 },
  startButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.md, ...SHADOWS.colored.accent },
  startButtonText: { fontSize: 17, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  historyLink: { marginTop: SPACING.sm },
  historyLinkText: { color: COLORS.text.secondary, fontFamily: FONT_FAMILY.semiBold, fontSize: 14 },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.accent, letterSpacing: 0, textTransform: 'uppercase' },
  countdownText: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, marginTop: 2, letterSpacing: 0 },
  adherenceBadge: { alignItems: 'center', backgroundColor: 'rgba(10, 10, 10, 0.48)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  adherenceValue: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  adherenceLabel: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, letterSpacing: 0 },
  heroNumbers: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 26, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  heroStatLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, marginTop: 2 },
  heroArrow: { alignItems: 'center' },
  projectionBanner: {
    backgroundColor: 'rgba(10, 10, 10, 0.48)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  projectionText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  card: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  guidedCard: {
    margin: SPACING.md,
    marginBottom: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  guidedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  guidedEyebrow: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  guidedTitle: {
    marginTop: 2,
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 24,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    backgroundColor: 'rgba(10, 10, 10, 0.42)',
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    letterSpacing: 0,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  detailRow: {
    width: '48%',
    minWidth: 138,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.sm,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 0,
  },
  detailValue: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    lineHeight: 18,
  },
  reviewText: {
    marginTop: SPACING.md,
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.error,
    lineHeight: 20,
  },
  supportBlock: {
    marginTop: SPACING.md,
    gap: 3,
  },
  supportTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  supportText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  nextActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  nextActionPill: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceSecondary,
  },
  nextActionText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.sm },
  guidanceBody: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  guidanceMeta: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
    lineHeight: 18,
    marginTop: SPACING.sm,
  },
  quickActions: { marginHorizontal: SPACING.md, gap: SPACING.sm },
  actionButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  actionButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  weightClassCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm },
  weightClassText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
  endPlanButton: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  endPlanText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.error,
  },
});
