import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { CutPhase, WeightCutPlanRow } from '../../lib/engine/types';

interface Props {
  plan: WeightCutPlanRow;
  currentPhase: CutPhase;
}

const PHASES: { key: CutPhase; label: string; short: string; color: string }[] = [
  { key: 'chronic',         label: 'Chronic',      short: 'CHR', color: '#3B82F6' },
  { key: 'intensified',     label: 'Intensified',  short: 'INT', color: '#8B5CF6' },
  { key: 'fight_week_load', label: 'Water Load',   short: 'WL',  color: '#06B6D4' },
  { key: 'fight_week_cut',  label: 'Water Cut',    short: 'WC',  color: '#F59E0B' },
  { key: 'weigh_in',        label: 'Weigh-in',     short: 'WI',  color: '#EF4444' },
  { key: 'rehydration',     label: 'Rehydrate',    short: 'RH',  color: '#10B981' },
];

const PHASE_ORDER = PHASES.map(p => p.key);

export function CutPhaseTimeline({ plan, currentPhase }: Props) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  // Map phase keys to date labels from the plan
  const phaseDates: Partial<Record<CutPhase, string>> = {
    chronic: plan.chronic_phase_start ? fmtDate(plan.chronic_phase_start) : undefined,
    intensified: plan.intensified_phase_start ? fmtDate(plan.intensified_phase_start) : undefined,
    fight_week_load: plan.fight_week_start ? fmtDate(plan.fight_week_start) : undefined,
    fight_week_cut: plan.fight_week_start ? fmtDateOffset(plan.fight_week_start, 3) : undefined,
    weigh_in: plan.weigh_in_day ? fmtDate(plan.weigh_in_day) : undefined,
    rehydration: plan.rehydration_start ? fmtDate(plan.rehydration_start) : undefined,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.track}
    >
      {PHASES.map((phase, idx) => {
        const isPast    = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isFuture  = idx > currentIndex;

        const chipBg = isCurrent
          ? phase.color
          : isPast
          ? `${phase.color}22`
          : COLORS.surfaceSecondary;

        const chipText = isCurrent
          ? '#FFFFFF'
          : isPast
          ? phase.color
          : COLORS.text.tertiary;

        const dotBg = isCurrent || isPast ? phase.color : COLORS.border;

        return (
          <React.Fragment key={phase.key}>
            {/* Phase node */}
            <View style={styles.node}>
              <View style={[styles.dot, { backgroundColor: dotBg }, isCurrent && styles.dotCurrent]} />
              <View style={[styles.chip, { backgroundColor: chipBg }]}>
                <Text style={[styles.chipText, { color: chipText }]}>{phase.label}</Text>
              </View>
              {phaseDates[phase.key] && (
                <Text style={[styles.dateText, isCurrent && { color: phase.color, fontFamily: FONT_FAMILY.semiBold }]}>
                  {phaseDates[phase.key]}
                </Text>
              )}
              {isCurrent && <View style={[styles.activePip, { backgroundColor: phase.color }]} />}
            </View>

            {/* Connector */}
            {idx < PHASES.length - 1 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: idx < currentIndex ? COLORS.chart.fitness : COLORS.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateOffset(iso: string, addDays: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + addDays);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  scroll: {},
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  node: {
    alignItems: 'center',
    width: 80,
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  chipText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 11,
  },
  dateText: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 10,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  activePip: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  connector: {
    height: 2,
    width: 12,
    marginBottom: 28,
    borderRadius: 1,
  },
});
