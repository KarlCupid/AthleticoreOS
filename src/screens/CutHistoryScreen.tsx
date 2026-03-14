import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useWeightCutData } from '../hooks/useWeightCutData';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import { WeightCutHistoryRow } from '../../lib/engine/types';

export function CutHistoryScreen() {
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { loading, cutHistory } = useWeightCutData(userId);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (cutHistory.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🏆</Text>
        <Text style={styles.emptyTitle}>No Completed Cuts</Text>
        <Text style={styles.emptySubtitle}>
          Your weight cut records will appear here once you complete a cut.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Cut History</Text>
      <Text style={styles.sectionSubtitle}>{cutHistory.length} completed cut{cutHistory.length !== 1 ? 's' : ''}</Text>
      {cutHistory.map((cut) => (
        <CutHistoryCard key={cut.id} cut={cut} />
      ))}
    </ScrollView>
  );
}

function CutHistoryCard({ cut }: { cut: WeightCutHistoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const madeWeight = cut.made_weight;
  const totalLbs = (cut.total_diet_loss_lbs ?? 0) + (cut.total_water_cut_lbs ?? 0);
  const adherence = cut.protocol_adherence_pct ?? 0;

  const adherenceColor =
    adherence >= 80 ? COLORS.readiness.prime :
    adherence >= 60 ? COLORS.readiness.caution :
    COLORS.readiness.depleted;

  const cutDate = cut.completed_at
    ? new Date(cut.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cutTitle}>{cut.start_weight} → {cut.target_weight} lbs</Text>
          <Text style={styles.cutDate}>{cutDate}</Text>
        </View>
        <View style={[styles.madeWeightBadge, { backgroundColor: madeWeight ? '#DCFCE7' : '#FEE2E2' }]}>
          <Text style={[styles.madeWeightText, { color: madeWeight ? '#16A34A' : '#DC2626' }]}>
            {madeWeight ? '✓ MADE WEIGHT' : '✗ MISSED'}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatPill
          label="Total Cut"
          value={`${totalLbs.toFixed(1)} lbs`}
          color={COLORS.chart.fitness}
        />
        <StatPill
          label="Adherence"
          value={`${adherence.toFixed(0)}%`}
          color={adherenceColor}
        />
        <StatPill
          label="Weigh-in"
          value={cut.final_weigh_in_weight ? `${cut.final_weigh_in_weight} lbs` : '—'}
          color={COLORS.text.secondary}
        />
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={styles.expanded}>
          <View style={styles.divider} />
          <View style={styles.detailGrid}>
            <DetailRow label="Diet phase loss" value={`${(cut.total_diet_loss_lbs ?? 0).toFixed(1)} lbs`} />
            <DetailRow label="Water cut" value={`${(cut.total_water_cut_lbs ?? 0).toFixed(1)} lbs`} />
            <DetailRow label="Rehydration regained" value={cut.rehydration_weight_regained ? `${cut.rehydration_weight_regained.toFixed(1)} lbs` : '—'} />
            <DetailRow label="Avg weekly loss" value={cut.avg_weekly_loss_rate ? `${cut.avg_weekly_loss_rate.toFixed(2)} lbs/wk` : '—'} />
            <DetailRow label="Fight day weight" value={cut.fight_day_weight ? `${cut.fight_day_weight} lbs` : '—'} />
            {(cut.safety_flags_triggered?.length ?? 0) > 0 && (
              <DetailRow
                label="Safety flags triggered"
                value={`${cut.safety_flags_triggered.length}`}
                valueColor={COLORS.readiness.caution}
              />
            )}
          </View>
        </View>
      )}

      <Text style={styles.expandHint}>{expanded ? '▲ Show less' : '▼ Show details'}</Text>
    </TouchableOpacity>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 48 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 20, color: COLORS.text.primary, marginBottom: SPACING.xs },
  emptySubtitle: { fontFamily: FONT_FAMILY.regular, fontSize: 14, color: COLORS.text.secondary, textAlign: 'center' },
  sectionTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 22, color: COLORS.text.primary },
  sectionSubtitle: { fontFamily: FONT_FAMILY.regular, fontSize: 14, color: COLORS.text.secondary, marginBottom: SPACING.md, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  cardTitleBlock: { flex: 1, marginRight: SPACING.sm },
  cutTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 16, color: COLORS.text.primary },
  cutDate: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },
  madeWeightBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  madeWeightText: { fontFamily: FONT_FAMILY.semiBold, fontSize: 11, letterSpacing: 0.4 },
  statsRow: { flexDirection: 'row', gap: SPACING.xs },
  pill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
  },
  pillValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14 },
  pillLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 11, color: COLORS.text.secondary, marginTop: 2 },
  expanded: { marginTop: SPACING.sm },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  detailGrid: {},
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontFamily: FONT_FAMILY.regular, fontSize: 13, color: COLORS.text.secondary },
  detailValue: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: COLORS.text.primary },
  expandHint: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
