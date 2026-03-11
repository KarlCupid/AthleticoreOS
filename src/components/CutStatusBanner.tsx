import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { CutPhase, WeightCutPlanRow, DailyCutProtocolRow } from '../../lib/engine/types';

interface Props {
  plan: WeightCutPlanRow;
  todayProtocol: DailyCutProtocolRow | null;
  currentWeight: number;
  onPress: () => void;
}

const PHASE_LABELS: Record<CutPhase, string> = {
  chronic:          'Chronic Cut',
  intensified:      'Intensified',
  fight_week_load:  'Water Loading',
  fight_week_cut:   'Water Cut',
  weigh_in:         'Weigh-in Day',
  rehydration:      'Rehydration',
};

const PHASE_GRADIENTS: Record<CutPhase, [string, string]> = {
  chronic:          ['#3B82F6', '#2563EB'],
  intensified:      ['#8B5CF6', '#7C3AED'],
  fight_week_load:  ['#06B6D4', '#0891B2'],
  fight_week_cut:   ['#F59E0B', '#D97706'],
  weigh_in:         ['#EF4444', '#DC2626'],
  rehydration:      ['#10B981', '#059669'],
};

export function CutStatusBanner({ plan, todayProtocol, currentWeight, onPress }: Props) {
  const phase = todayProtocol?.cut_phase ?? 'chronic';
  const daysOut = todayProtocol?.days_to_weigh_in ?? 0;
  const remaining = Math.max(0, currentWeight - plan.target_weight);
  const dangerCount = (todayProtocol?.safety_flags as any[])?.filter(f => f.severity === 'danger').length ?? 0;
  const gradient = PHASE_GRADIENTS[phase];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.wrapper}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
        {/* Left: phase + countdown */}
        <View style={styles.left}>
          <Text style={styles.phaseLabel}>{PHASE_LABELS[phase]}</Text>
          <Text style={styles.countdown}>
            {daysOut === 0 ? 'WEIGH-IN TODAY' : `${daysOut}d to weigh-in`}
          </Text>
        </View>

        {/* Center: remaining lbs */}
        <View style={styles.center}>
          <Text style={styles.remainingValue}>{remaining.toFixed(1)}</Text>
          <Text style={styles.remainingLabel}>lbs left</Text>
        </View>

        {/* Right: safety badge + chevron */}
        <View style={styles.right}>
          {dangerCount > 0 && (
            <View style={styles.dangerBadge}>
              <Text style={styles.dangerText}>⛔ {dangerCount}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  left: { flex: 1 },
  phaseLabel: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  countdown: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 17,
    color: '#FFFFFF',
    marginTop: 2,
  },
  center: { alignItems: 'center' },
  remainingValue: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 30,
  },
  remainingLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  right: { alignItems: 'flex-end', gap: 4 },
  dangerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dangerText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  chevron: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 24,
    color: 'rgba(255,255,255,0.7)',
  },
});
