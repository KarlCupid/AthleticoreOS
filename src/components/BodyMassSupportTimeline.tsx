import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONT_FAMILY, RADIUS } from '../theme/theme';
import { WeightCutPlanRow } from '../../lib/engine/types';
import type { BodyMassSupportPhase } from '../../lib/performance-engine';

interface Props {
  plan: WeightCutPlanRow;
  currentPhase: BodyMassSupportPhase;
}

const PHASES: { key: BodyMassSupportPhase; label: string; short: string; color: string }[] = [
  { key: 'long_term_body_composition', label: 'Long-Term', short: 'LT', color: '#D4AF37' },
  { key: 'gradual_weight_class_preparation', label: 'Class Prep', short: 'CP', color: '#15803D' },
  { key: 'competition_week_body_mass_monitoring', label: 'Monitoring', short: 'MON', color: '#B8C0C2' },
  { key: 'high_risk_review', label: 'Review', short: 'REV', color: '#D4AF37' },
  { key: 'weigh_in_logistics', label: 'Weigh-in', short: 'WI', color: '#D9827E' },
  { key: 'post_weigh_in_recovery_tracking', label: 'Recovery', short: 'REC', color: '#10B981' },
];

const PHASE_ORDER = PHASES.map(p => p.key);

export function BodyMassSupportTimeline({ plan, currentPhase }: Props) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  // Map phase keys to date labels from the plan
  const phaseDates: Partial<Record<BodyMassSupportPhase, string>> = {
    long_term_body_composition: plan.chronic_phase_start ? fmtDate(plan.chronic_phase_start) : undefined,
    gradual_weight_class_preparation: plan.intensified_phase_start ? fmtDate(plan.intensified_phase_start) : undefined,
    competition_week_body_mass_monitoring: plan.fight_week_start ? fmtDate(plan.fight_week_start) : undefined,
    high_risk_review: plan.fight_week_start ? fmtDateOffset(plan.fight_week_start, 3) : undefined,
    weigh_in_logistics: plan.weigh_in_day ? fmtDate(plan.weigh_in_day) : undefined,
    post_weigh_in_recovery_tracking: plan.rehydration_start ? fmtDate(plan.rehydration_start) : undefined,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.track}
    >
      {PHASES.map((phase, idx) => {
        const isPast = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        const chipBg = isCurrent
          ? phase.color
          : isPast
          ? `${phase.color}22`
          : COLORS.surfaceSecondary;

        const chipText = isCurrent
          ? '#F5F5F0'
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

