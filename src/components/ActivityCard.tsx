import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, BORDERS } from '../theme/theme';
import type { ScheduledActivityRow } from '../../lib/engine/types';

const ACTIVITY_ICONS: Record<string, string> = {
  boxing_practice: 'BOX',
  sparring: 'SPR',
  sc: 'S&C',
  running: 'RUN',
  conditioning: 'CON',
  active_recovery: 'REC',
  rest: 'RST',
  other: 'GEN',
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: COLORS.text.tertiary,
  completed: COLORS.readiness.prime,
  skipped: COLORS.readiness.depleted,
  modified: COLORS.readiness.caution,
};

interface ActivityCardProps {
  activity: ScheduledActivityRow;
  onPress?: () => void;
  onSkip?: () => void;
  onEdit?: () => void;
  onLighter?: () => void;
  onHarder?: () => void;
  onLog?: () => void;
  showActions?: boolean;
}

export function ActivityCard({ activity, onPress, onSkip, onEdit, onLighter, onHarder, onLog, showActions }: ActivityCardProps) {
  const icon = ACTIVITY_ICONS[activity.activity_type] ?? 'GEN';
  const label = activity.custom_label ?? activity.activity_type.replace(/_/g, ' ');
  const statusColor = STATUS_COLORS[activity.status] ?? COLORS.text.tertiary;
  const timeStr = activity.start_time ? formatTime(activity.start_time) : '';
  const logHandler = onLog ?? onPress;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.timeText}>{timeStr}</Text>
      </View>

      <View style={[styles.indicator, { backgroundColor: statusColor }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={styles.label} numberOfLines={1}>{label.charAt(0).toUpperCase() + label.slice(1)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {activity.status === 'completed' ? 'Done' : activity.status}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>{activity.estimated_duration_min}min</Text>
          <Text style={styles.statDot}>|</Text>
          <Text style={styles.statText}>RPE {activity.actual_rpe ?? activity.expected_intensity}</Text>
          {activity.session_components && (activity.session_components as any[]).length > 0 && (
            <>
              <Text style={styles.statDot}>|</Text>
              <Text style={styles.statText}>{(activity.session_components as any[]).length} components</Text>
            </>
          )}
        </View>

        {activity.engine_recommendation && (
          <Text style={styles.recommendation} numberOfLines={2}>
            Tip: {activity.engine_recommendation}
          </Text>
        )}

        {showActions && activity.status === 'scheduled' && (
          <>
            <View style={styles.actionsRow}>
              {logHandler && (
                <TouchableOpacity style={styles.primaryButton} onPress={logHandler}>
                  <Text style={styles.primaryButtonText}>Log</Text>
                </TouchableOpacity>
              )}
              {onEdit && (
                <TouchableOpacity style={styles.secondaryButton} onPress={onEdit}>
                  <Text style={styles.secondaryButtonText}>Move</Text>
                </TouchableOpacity>
              )}
              {onSkip && (
                <TouchableOpacity style={styles.secondaryButton} onPress={onSkip}>
                  <Text style={styles.secondaryButtonText}>Skip</Text>
                </TouchableOpacity>
              )}
            </View>
            {(onLighter || onHarder) && (
              <View style={styles.actionsRow}>
                {onLighter && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={onLighter}>
                    <Text style={styles.secondaryButtonText}>Lighter</Text>
                  </TouchableOpacity>
                )}
                {onHarder && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={onHarder}>
                    <Text style={styles.secondaryButtonText}>Harder</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
    ...BORDERS.card,
  },
  timeColumn: { width: 50, justifyContent: 'center' },
  timeText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary },
  indicator: { width: 3, borderRadius: 1.5, marginRight: SPACING.sm },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  icon: { fontSize: 16 },
  label: { flex: 1, fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.sm },
  statusText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statText: { fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  statDot: { color: COLORS.text.tertiary },
  recommendation: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 6,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap' },
  primaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.sm,
  },
  primaryButtonText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#FFF' },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary },
});
