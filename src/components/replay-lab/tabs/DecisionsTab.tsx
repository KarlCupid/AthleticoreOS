import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY_V2, SEMANTIC_PALETTE } from '../../../theme/theme';
import { Card } from '../../Card';
import { shared } from '../styles';
import type { EngineReplayDay } from '../../../../lib/engine/simulation/lab';

interface DecisionsTabProps {
  day: EngineReplayDay;
}

const IMPACT_TINTS: Record<string, string> = {
  restricted: SEMANTIC_PALETTE.caution.tint,
  escalated: SEMANTIC_PALETTE.alert.tint,
};

export function DecisionsTab({ day }: DecisionsTabProps) {
  // Group decision reasons by subsystem
  const grouped = useMemo(() => {
    const map = new Map<string, typeof day.decisionReasons>();
    for (const reason of day.decisionReasons) {
      const key = reason.subsystem ?? 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(reason);
    }
    return map;
  }, [day.decisionReasons]);

  return (
    <>
      <Card title="Decision Trace" subtitle="Why the engine prescribed this day the way it did.">
        {day.decisionReasons.length > 0 ? (
          Array.from(grouped.entries()).map(([subsystem, reasons]) => (
            <View key={subsystem} style={styles.subsystemGroup}>
              <Text style={styles.subsystemLabel}>{subsystem}</Text>
              {reasons.map((reason, index) => {
                const tint = IMPACT_TINTS[reason.impact ?? ''];
                return (
                  <View
                    key={`${reason.title}-${index}`}
                    style={[styles.reasonRow, tint ? { backgroundColor: tint } : undefined]}
                  >
                    <Text style={styles.reasonTitle}>{reason.title}</Text>
                    <Text style={shared.detailText}>{reason.sentence}</Text>
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <Text style={shared.bodyText}>No decision reasons were captured for this day.</Text>
        )}
      </Card>

      <Card title="Narrative Notes" subtitle="Simulated coach and athlete perspective.">
        <Text style={styles.noteLabel}>Coach</Text>
        <Text style={shared.bodyText}>{day.coachingInsight || 'No coaching note generated.'}</Text>
        <Text style={[styles.noteLabel, styles.noteLabelSpacing]}>Athlete</Text>
        <Text style={shared.bodyText}>{day.athleteMonologue || 'No athlete monologue generated.'}</Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  subsystemGroup: {
    marginBottom: SPACING.md,
  },
  subsystemLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  reasonRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
    borderRadius: 6,
  },
  reasonTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  noteLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteLabelSpacing: { marginTop: SPACING.md },
});
