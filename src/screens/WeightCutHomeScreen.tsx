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
import { CutPhaseTimeline } from '../components/CutPhaseTimeline';
import { WeightCutChart } from '../components/WeightCutChart';
import { DailyProtocolCard } from '../components/DailyProtocolCard';
import { SafetyStatusIndicator } from '../components/SafetyStatusIndicator';
import { CutPhase } from '../../lib/engine/types';

type NavProp = NativeStackNavigationProp<FuelStackParamList, 'WeightCutHome'>;

const PHASE_LABELS: Record<CutPhase, string> = {
  chronic: 'Chronic Cut',
  intensified: 'Intensified Cut',
  fight_week_load: 'Water Loading',
  fight_week_cut: 'Water Cut',
  weigh_in: 'Weigh-in Day',
  rehydration: 'Rehydration',
};

const PHASE_COLORS: Record<CutPhase, string[]> = {
  chronic:         ['#3B82F6', '#2563EB'],
  intensified:     ['#15803D', '#166534'],
  fight_week_load: ['#06B6D4', '#0891B2'],
  fight_week_cut:  ['#F59E0B', '#D97706'],
  weigh_in:        ['#EF4444', '#DC2626'],
  rehydration:     ['#10B981', '#059669'],
};

export function WeightCutHomeScreen() {
  const nav = useNavigation<NavProp>();
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const {
    loading, error, activePlan, todayProtocol, weightHistory,
    cutHistory, projectedWeightByWeighIn, adherenceLast7Days,
    refresh, abandon,
  } = useWeightCutData(userId);

  const handleEndCut = useCallback(() => {
    Alert.alert(
      'End Cut',
      'Why are you ending this cut?',
      [
        {
          text: 'Fight fell through',
          onPress: () => {
            Alert.alert(
              'End Cut',
              'Cut will be marked abandoned and your targets will return to normal. You can start a new cut whenever your next fight is booked.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Cut', style: 'destructive', onPress: () => abandon('fight_fell_through') },
              ]
            );
          },
        },
        {
          text: 'Made weight âœ“',
          onPress: () => {
            Alert.alert(
              'Mark Complete',
              'Great work! Mark this cut as complete?',
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
              'End Cut',
              'End this cut and return to normal training targets?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'End Cut', style: 'destructive', onPress: () => abandon('other') },
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

  // â”€â”€ Loading (auth not resolved yet, or data fetching) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (userId === null || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ No active cut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!activePlan) {
    return (
      <View style={styles.noCutContainer}>
        <LinearGradient colors={['#16A34A', '#15803D']} style={styles.noCutGradient}>
          <IconScale size={64} color="#fff" />
          <Text style={styles.noCutTitle}>No Active Weight Cut</Text>
          <Text style={styles.noCutSubtitle}>
            Start a scientifically guided weight cut plan tailored to your fight date and weight class.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => nav.navigate('CutPlanSetup')}
          >
            <Text style={styles.startButtonText}>Start a Cut</Text>
          </TouchableOpacity>
          {cutHistory.length > 0 && (
            <TouchableOpacity
              style={styles.historyLink}
              onPress={() => nav.navigate('CutHistory')}
            >
              <Text style={styles.historyLinkText}>View Past Cuts ({cutHistory.length})</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
    );
  }

  const phase = todayProtocol?.cut_phase ?? 'chronic';
  const daysOut = todayProtocol?.days_to_weigh_in ?? 0;
  const dangerFlags = todayProtocol?.safety_flags?.filter((f: any) => f.severity === 'danger') ?? [];
  const currentWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : activePlan.start_weight;
  const remaining = Math.max(0, currentWeight - activePlan.target_weight).toFixed(1);
  const phaseColors = PHASE_COLORS[phase] as [string, string];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LinearGradient colors={phaseColors} style={styles.hero}>
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
            <IconTrendDown size={28} color="rgba(255,255,255,0.7)" />
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{activePlan.target_weight}</Text>
            <Text style={styles.heroStatLabel}>Target (lbs)</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatValue, { color: Number(remaining) > 5 ? '#FEF3C7' : '#DCFCE7' }]}>
              {remaining}
            </Text>
            <Text style={styles.heroStatLabel}>Remaining (lbs)</Text>
          </View>
        </View>

        {projectedWeightByWeighIn !== null && (
          <View style={styles.projectionBanner}>
            <Text style={styles.projectionText}>
              Projected weigh-in: {projectedWeightByWeighIn.toFixed(1)} lbs
              {projectedWeightByWeighIn <= activePlan.target_weight ? '  âœ“ ON TRACK' : '  âš  BEHIND'}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* â”€â”€ Safety flags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {dangerFlags.length > 0 && (
        <SafetyStatusIndicator flags={todayProtocol?.safety_flags ?? []} />
      )}

      {/* â”€â”€ Today's protocol â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {todayProtocol && (
        <DailyProtocolCard protocol={todayProtocol} />
      )}

      {/* â”€â”€ Weight chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Weight Trend</Text>
        <WeightCutChart
          weightHistory={weightHistory}
          targetWeight={activePlan.target_weight}
          projectedWeight={projectedWeightByWeighIn}
          weighInDate={activePlan.weigh_in_date}
        />
      </View>

      {/* â”€â”€ Phase timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Cut Timeline</Text>
        <CutPhaseTimeline plan={activePlan} currentPhase={phase} />
      </View>

      {/* â”€â”€ Quick actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.quickActions}>
        {phase === 'fight_week_load' || phase === 'fight_week_cut' || phase === 'weigh_in' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: phaseColors[0] }]}
            onPress={() => nav.navigate('FightWeekProtocol')}
          >
            <Text style={styles.actionButtonText}>Fight Week Protocol</Text>
            <IconChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}

        {phase === 'rehydration' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.readiness.prime }]}
            onPress={() => nav.navigate('RehydrationProtocol', {
              weighInWeightLbs: currentWeight,
              hoursToFight: 24,
            })}
          >
            <Text style={styles.actionButtonText}>Rehydration Protocol</Text>
            <IconChevronRight size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.surfaceSecondary }]}
          onPress={() => nav.navigate('CutHistory')}
        >
          <Text style={[styles.actionButtonText, { color: COLORS.text.primary }]}>Past Cuts</Text>
          <IconChevronRight size={18} color={COLORS.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCutButton}
          onPress={handleEndCut}
        >
          <Text style={styles.endCutText}>End Cut</Text>
        </TouchableOpacity>
      </View>

      {/* â”€â”€ Weight class info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activePlan.weight_class_name && (
        <View style={[styles.card, styles.weightClassCard]}>
          <IconTarget size={16} color={COLORS.text.secondary} />
          <Text style={styles.weightClassText}>
            {activePlan.weight_class_name} Â· {activePlan.sport?.toUpperCase()} Â· {activePlan.fight_status}
          </Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  noCutContainer: { flex: 1 },
  noCutGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  noCutTitle: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: '#fff', textAlign: 'center' },
  noCutSubtitle: { fontSize: 16, fontFamily: FONT_FAMILY.regular, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  startButton: { backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, marginTop: SPACING.md },
  startButtonText: { fontSize: 17, fontFamily: FONT_FAMILY.semiBold, color: '#16A34A' },
  historyLink: { marginTop: SPACING.sm },
  historyLinkText: { color: 'rgba(255,255,255,0.8)', fontFamily: FONT_FAMILY.semiBold, fontSize: 14 },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseLabel: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, textTransform: 'uppercase' },
  countdownText: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: '#fff', marginTop: 2 },
  adherenceBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8 },
  adherenceValue: { fontSize: 20, fontFamily: FONT_FAMILY.black, color: '#fff' },
  adherenceLabel: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5 },
  heroNumbers: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 26, fontFamily: FONT_FAMILY.black, color: '#fff' },
  heroStatLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroArrow: { alignItems: 'center' },
  projectionBanner: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  projectionText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#fff' },
  card: {
    margin: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  sectionTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary, marginBottom: SPACING.sm },
  quickActions: { marginHorizontal: SPACING.md, gap: SPACING.sm },
  actionButton: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.md, borderRadius: RADIUS.lg,
  },
  actionButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: '#fff' },
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

