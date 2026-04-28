import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useWeightCutData } from '../hooks/useWeightCutData';
import type { FuelStackParamList } from '../navigation/types';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import {
  IconTarget, IconChevronRight, IconTrendDown, IconScale,
} from '../components/icons';
import { Card } from '../components/Card';
import { BodyMassSupportTimeline } from '../components/BodyMassSupportTimeline';
import { WeightCutChart } from '../components/WeightCutChart';
import { UnifiedJourneySummaryCard } from '../components/performance/UnifiedJourneySummaryCard';
import { getBodyMassSupportPhase, type BodyMassSupportPhase } from '../../lib/performance-engine';
import { todayLocalDate } from '../../lib/utils/date';

type NavProp = NativeStackNavigationProp<FuelStackParamList, 'WeightCutHome'>;

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
  unknown: ['#B8C0C2', '#6F7778'],
  long_term_body_composition: ['#D4AF37', '#8C6A1E'],
  gradual_weight_class_preparation: ['#15803D', '#166534'],
  competition_week_body_mass_monitoring: ['#B8C0C2', '#6F7778'],
  weigh_in_logistics: ['#D9827E', '#D9827E'],
  post_weigh_in_recovery_tracking: ['#10B981', '#059669'],
  high_risk_review: ['#D4AF37', '#B8892D'],
};

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000);
}

export function WeightCutHomeScreen() {
  const nav = useNavigation<NavProp>();
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const {
    loading, error, activePlan, weightHistory,
    cutHistory, projectedWeightByWeighIn, adherenceLast7Days,
    refresh, abandon, performanceContext,
  } = useWeightCutData(userId);

  const handleEndCut = useCallback(() => {
    Alert.alert(
      'End Class Plan',
      'Why are you ending this weight-class plan?',
      [
        {
          text: 'Fight fell through',
          onPress: () => {
            Alert.alert(
              'End Class Plan',
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
              'End Class Plan',
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
  // No active cut
  if (!activePlan) {
    return (
      <View style={styles.noCutContainer}>
        <LinearGradient colors={['rgba(10, 10, 10, 0.94)', 'rgba(212, 175, 55, 0.20)']} style={styles.noCutGradient}>
          <IconScale size={64} color={COLORS.accent} />
          <Text style={styles.noCutTitle}>Weight-Class Context</Text>
          <Text style={styles.noCutSubtitle}>
            Evaluate fight date, class, body-mass trend, fueling, readiness, and safety.
          </Text>
          <UnifiedJourneySummaryCard
            summary={performanceContext}
            compact
            showProtectedAnchors={false}
            showBodyMass={Boolean(performanceContext.bodyMass)}
            style={styles.noCutJourneyCard}
          />
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => nav.navigate('CutPlanSetup')}
          >
            <Text style={styles.startButtonText}>Evaluate Class</Text>
          </TouchableOpacity>
          {cutHistory.length > 0 && (
            <TouchableOpacity
              style={styles.historyLink}
              onPress={() => nav.navigate('CutHistory')}
            >
              <Text style={styles.historyLinkText}>View Past Class Plans ({cutHistory.length})</Text>
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
  const bodyMassPlanBlocked = performanceContext.riskFlags.some((flag) => (
    flag.blocksPlan
    && /weight|body|fuel|professional|unsafe|rapid/i.test(`${flag.label} ${flag.message}`)
  )) || performanceContext.bodyMass?.safetyLabel === 'Blocked for safety'
    || performanceContext.bodyMass?.safetyLabel === 'Professional review required';
  const bodyMassBlockReason = performanceContext.riskFlags.find((flag) => flag.blocksPlan)?.message
    ?? performanceContext.bodyMass?.explanation
    ?? 'The requested body-mass plan needs review before Athleticore can show daily weight-class guidance.';
  const bodyMassGuidance = performanceContext.bodyMass?.explanation
    ?? performanceContext.nutrition.explanation
    ?? 'Body-mass support is resolved through the Unified Performance Engine using phase, training, fueling, readiness, and safety context.';
  const confidenceNote = performanceContext.lowConfidence
    ? performanceContext.confidenceSummary
    : performanceContext.bodyMass?.riskLabel
      ? `Current body-mass risk: ${performanceContext.bodyMass.riskLabel}.`
      : 'Body-mass support is linked to performance state, not a standalone rapid-cut protocol.';

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
              {projectedWeightByWeighIn <= activePlan.target_weight ? '  ON TRACK' : '  BEHIND'}
            </Text>
          </View>
        )}
      </LinearGradient>
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
          <Text style={styles.sectionTitle}>Plan blocked for safety</Text>
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
        <WeightCutChart
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
            onPress={() => nav.navigate('FightWeekProtocol')}
          >
            <Text style={styles.actionButtonText}>Fight Week Support</Text>
            <IconChevronRight size={18} color={COLORS.text.inverse} />
          </TouchableOpacity>
        ) : null}

        {phase === 'post_weigh_in_recovery_tracking' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.readiness.prime }]}
            onPress={() => nav.navigate('RehydrationProtocol', {
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
          onPress={() => nav.navigate('CutHistory')}
        >
          <Text style={[styles.actionButtonText, { color: COLORS.text.primary }]}>Past Class Plans</Text>
          <IconChevronRight size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCutButton}
          onPress={handleEndCut}
        >
          <Text style={styles.endCutText}>End Class Plan</Text>
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
  noCutContainer: { flex: 1 },
  noCutGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  noCutJourneyCard: { alignSelf: 'stretch', marginBottom: 0 },
  noCutTitle: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary, textAlign: 'center', letterSpacing: 0 },
  noCutSubtitle: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, textAlign: 'center', lineHeight: 24 },
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
  endCutButton: {
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  endCutText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.error,
  },
});
