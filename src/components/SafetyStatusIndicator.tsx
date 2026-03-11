import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS } from '../theme/theme';
import { CutSafetyFlag } from '../../lib/engine/types';

interface Props {
  flags: CutSafetyFlag[];
  compact?: boolean;
}

const SEVERITY_CONFIG = {
  danger: {
    bg: '#FEE2E2',
    border: '#FECACA',
    text: '#DC2626',
    icon: '⛔',
    badgeBg: COLORS.readiness.depleted,
    label: 'DANGER',
  },
  warning: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#D97706',
    icon: '⚠️',
    badgeBg: COLORS.readiness.caution,
    label: 'WARNING',
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#2563EB',
    icon: 'ℹ️',
    badgeBg: COLORS.chart.fitness,
    label: 'INFO',
  },
} as const;

export function SafetyStatusIndicator({ flags, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  const dangerCount  = flags.filter(f => f.severity === 'danger').length;
  const warningCount = flags.filter(f => f.severity === 'warning').length;

  const overallStatus =
    dangerCount > 0  ? 'danger'  :
    warningCount > 0 ? 'warning' :
    'clear';

  const statusConfig = overallStatus === 'clear'
    ? { bg: '#DCFCE7', border: '#BBF7D0', text: '#16A34A', icon: '✅', label: 'ALL CLEAR' }
    : SEVERITY_CONFIG[overallStatus];

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
        <Text style={styles.compactIcon}>{statusConfig.icon}</Text>
        <Text style={[styles.compactLabel, { color: statusConfig.text }]}>{statusConfig.label}</Text>
        {flags.length > 0 && (
          <Text style={[styles.compactCount, { color: statusConfig.text }]}>{flags.length}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => flags.length > 0 && setExpanded(!expanded)}
        activeOpacity={flags.length > 0 ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: statusConfig.text }]}>{statusConfig.label}</Text>
            {flags.length > 0 ? (
              <Text style={styles.flagSummary}>
                {dangerCount > 0 ? `${dangerCount} danger` : ''}
                {dangerCount > 0 && warningCount > 0 ? ', ' : ''}
                {warningCount > 0 ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : ''}
              </Text>
            ) : (
              <Text style={styles.flagSummary}>No active safety flags</Text>
            )}
          </View>
        </View>
        {flags.length > 0 && (
          <Text style={[styles.expandChevron, { color: statusConfig.text }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        )}
      </TouchableOpacity>

      {expanded && flags.length > 0 && (
        <View style={styles.flagList}>
          <View style={styles.divider} />
          {flags.map((flag, i) => {
            const cfg = SEVERITY_CONFIG[flag.severity];
            return (
              <View key={i} style={[styles.flagRow, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <Text style={styles.flagIcon}>{cfg.icon}</Text>
                <View style={styles.flagContent}>
                  <Text style={[styles.flagTitle, { color: cfg.text }]}>{flag.message}</Text>
                  {flag.recommendation && (
                    <Text style={styles.flagAction}>{flag.recommendation}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statusIcon: { fontSize: 22 },
  statusLabel: { fontFamily: FONT_FAMILY.semiBold, fontSize: 14, letterSpacing: 0.3 },
  flagSummary: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginTop: 1 },
  expandChevron: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12 },
  flagList: { gap: SPACING.xs, marginTop: SPACING.xs },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: SPACING.xs },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  flagIcon: { fontSize: 15, marginTop: 1 },
  flagContent: { flex: 1 },
  flagTitle: { fontFamily: FONT_FAMILY.semiBold, fontSize: 13 },
  flagAction: { fontFamily: FONT_FAMILY.regular, fontSize: 12, color: COLORS.text.secondary, marginTop: 2 },

  // Compact badge
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 5,
  },
  compactIcon: { fontSize: 13 },
  compactLabel: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12, letterSpacing: 0.3 },
  compactCount: { fontFamily: FONT_FAMILY.semiBold, fontSize: 12 },
});
