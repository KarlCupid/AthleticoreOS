import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { ConditioningVM, ConditioningDrillVM, ConditioningLogVM, ConditioningDrillLogVM } from './types';

// ---------------------------------------------------------------------------
// Intensity band colors
// ---------------------------------------------------------------------------

const INTENSITY_COLORS: Record<string, { bg: string; text: string }> = {
  light: { bg: COLORS.readiness.primeLight, text: COLORS.readiness.prime },
  moderate: { bg: COLORS.readiness.cautionLight, text: COLORS.readiness.caution },
  hard: { bg: COLORS.readiness.depletedLight, text: COLORS.readiness.depleted },
};

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// ConditioningCard — conditioning prescription display
// ---------------------------------------------------------------------------

interface ConditioningCardProps {
  conditioning: ConditioningVM;
  /** Logged conditioning data (replay or post-workout) */
  log?: ConditioningLogVM | null;
}

export function ConditioningCard({ conditioning, log }: ConditioningCardProps) {
  const intensity = INTENSITY_COLORS[conditioning.intensityLabel] ?? INTENSITY_COLORS.moderate;

  return (
    <View style={styles.container}>
      {/* Header: type + intensity band */}
      <View style={styles.header}>
        <Text style={styles.type}>{formatLabel(conditioning.type)}</Text>
        <View style={[styles.intensityBand, { backgroundColor: intensity.bg }]}>
          <Text style={[styles.intensityText, { color: intensity.text }]}>
            {formatLabel(conditioning.intensityLabel)}
          </Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <MetaPill label={`${conditioning.totalDurationMin} min`} />
        <MetaPill label={`${conditioning.rounds} rounds`} />
        {conditioning.workIntervalSec > 0 && (
          <MetaPill label={`${conditioning.workIntervalSec}s work`} />
        )}
        {conditioning.restIntervalSec > 0 && (
          <MetaPill label={`${conditioning.restIntervalSec}s rest`} />
        )}
        {conditioning.format && (
          <MetaPill label={conditioning.format.toUpperCase()} />
        )}
        <MetaPill label={`Load: ${conditioning.estimatedLoad}`} />
      </View>

      {/* Message */}
      {conditioning.message && (
        <Text style={styles.message}>{conditioning.message}</Text>
      )}

      {/* Drills */}
      {conditioning.drills.length > 0 && (
        <View style={styles.drillList}>
          <Text style={styles.drillHeader}>Drills</Text>
          {conditioning.drills.map((drill, i) => (
            <DrillRow key={i} drill={drill} />
          ))}
        </View>
      )}

      {/* Logged data */}
      {log && <ConditioningLogSection log={log} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

function DrillRow({ drill }: { drill: ConditioningDrillVM }) {
  return (
    <View style={styles.drillRow}>
      <View style={styles.drillInfo}>
        <Text style={styles.drillName}>{drill.name}</Text>
        <Text style={styles.drillMeta}>
          {drill.rounds > 0 && `${drill.rounds} rounds`}
          {drill.durationSec != null && ` • ${drill.durationSec}s`}
          {drill.reps != null && ` • ${drill.reps} reps`}
          {drill.restSec > 0 && ` • ${drill.restSec}s rest`}
        </Text>
      </View>
      {drill.format && (
        <View style={styles.drillFormatBadge}>
          <Text style={styles.drillFormatText}>{drill.format.toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}

function ConditioningLogSection({ log }: { log: ConditioningLogVM }) {
  const completionPct = Math.round(log.completionRate * 100);
  return (
    <View style={styles.logSection}>
      <Text style={styles.logTitle}>Session Log</Text>
      <View style={styles.metaRow}>
        <MetaPill label={`${log.completedRounds}/${log.prescribedRounds} rounds`} />
        <MetaPill label={`${log.completedDurationMin.toFixed(0)} min`} />
        {log.actualRpe != null && <MetaPill label={`RPE ${log.actualRpe}`} />}
        <MetaPill label={`${completionPct}%`} />
      </View>
      {log.note && <Text style={styles.logNote}>{log.note}</Text>}
      {log.drillLogs.length > 0 && (
        <View style={styles.drillLogList}>
          {log.drillLogs.map((dl, i) => (
            <DrillLogRow key={i} drill={dl} />
          ))}
        </View>
      )}
    </View>
  );
}

function DrillLogRow({ drill }: { drill: ConditioningDrillLogVM }) {
  return (
    <View style={styles.drillRow}>
      <View style={styles.drillInfo}>
        <Text style={styles.drillName}>{drill.name}</Text>
        <Text style={styles.drillMeta}>
          {drill.completedRounds}/{drill.targetRounds} rounds
          {drill.reps != null && ` • ${drill.reps} reps`}
          {drill.durationSec != null && ` • ${drill.durationSec}s`}
        </Text>
      </View>
      <View
        style={[
          styles.statusBadge,
          drill.completed ? styles.statusDone : styles.statusMissed,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            drill.completed ? styles.statusTextDone : styles.statusTextMissed,
          ]}
        >
          {drill.completed ? 'Done' : 'Missed'}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
    fontSize: 18,
  },
  intensityBand: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  intensityText: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaPill: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  metaText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  message: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
    fontSize: 14,
  },
  drillList: {
    gap: SPACING.xs,
  },
  drillHeader: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.sm,
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  drillMeta: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  drillFormatBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  drillFormatText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  logSection: {
    backgroundColor: '#F6FFFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  logTitle: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logNote: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    fontStyle: 'italic',
  },
  drillLogList: {
    gap: 0,
  },
  statusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statusDone: {
    backgroundColor: COLORS.readiness.primeLight,
  },
  statusMissed: {
    backgroundColor: COLORS.readiness.depletedLight,
  },
  statusText: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  statusTextDone: {
    color: COLORS.readiness.prime,
  },
  statusTextMissed: {
    color: COLORS.readiness.depleted,
  },
});
