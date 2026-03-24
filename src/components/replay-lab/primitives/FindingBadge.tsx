import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../../theme/theme';
import type { EngineReplayFinding } from '../../../../lib/engine/simulation/lab';
import { severityColors } from '../helpers';
import { shared } from '../styles';

interface FindingBadgeProps {
  finding: EngineReplayFinding;
}

export function FindingBadge({ finding }: FindingBadgeProps) {
  const colors = severityColors(finding.severity);

  return (
    <View style={styles.row} accessibilityRole="text" accessibilityLabel={`${finding.severity}: ${finding.title}. ${finding.detail}`}>
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.badgeText, { color: colors.fg }]}>{finding.title}</Text>
      </View>
      <Text style={shared.detailText}>{finding.detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: SPACING.xs },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  badgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    textTransform: 'uppercase',
  },
});
