import React, { memo } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS } from '../theme/theme';
import type { ScheduledActivityRow } from '../../lib/engine/types';

const SCHEDULE_BACKGROUND = require('../../assets/images/dashboard/schedule-card-bg.png');

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

export const ActivityCard = memo(function ActivityCard({ activity, onPress, onSkip, onEdit, onLighter, onHarder, onLog, showActions }: ActivityCardProps) {
  const icon = ACTIVITY_ICONS[activity.activity_type] ?? 'GEN';
  const label = activity.custom_label ?? activity.activity_type.replace(/_/g, ' ');
  const statusColor = STATUS_COLORS[activity.status] ?? COLORS.text.tertiary;
  const timeStr = activity.start_time ? formatTime(activity.start_time) : '';
  const logHandler = onLog ?? onPress;

  return (
    <TouchableOpacity
      style={styles.cardShell}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress || showActions}
      testID={`activity-card-${activity.id}`}
    >
      <ImageBackground
        source={SCHEDULE_BACKGROUND}
        style={styles.card}
        imageStyle={styles.cardImage}
        resizeMode="cover"
      >
        <View style={styles.cardScrim} />
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
                  <TouchableOpacity style={styles.primaryButton} onPress={logHandler} testID={`activity-card-log-${activity.id}`}>
                    <Text style={styles.primaryButtonText}>Log</Text>
                  </TouchableOpacity>
                )}
                {onEdit && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={onEdit} testID={`activity-card-move-${activity.id}`}>
                    <Text style={styles.secondaryButtonText}>Move</Text>
                  </TouchableOpacity>
                )}
                {onSkip && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={onSkip} testID={`activity-card-skip-${activity.id}`}>
                    <Text style={styles.secondaryButtonText}>Skip</Text>
                  </TouchableOpacity>
                )}
              </View>
              {(onLighter || onHarder) && (
                <View style={styles.actionsRow}>
                  {onLighter && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={onLighter} testID={`activity-card-lighter-${activity.id}`}>
                      <Text style={styles.secondaryButtonText}>Lighter</Text>
                    </TouchableOpacity>
                  )}
                  {onHarder && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={onHarder} testID={`activity-card-harder-${activity.id}`}>
                      <Text style={styles.secondaryButtonText}>Harder</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: RADIUS.xl, // Chunkier borders
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 10, 0.68)',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 245, 240, 0.16)',
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: RADIUS.xl,
  },
  cardScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.42)',
  },
  timeColumn: { width: 55, justifyContent: 'center' },
  timeText: { fontSize: 13, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.secondary },
  indicator: { width: 4, borderRadius: 2, marginRight: SPACING.md },
  content: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  icon: { fontSize: 20 },
  label: { flex: 1, fontSize: 18, fontFamily: FONT_FAMILY.black, letterSpacing: 0, color: COLORS.text.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: 11, fontFamily: FONT_FAMILY.extraBold, letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statText: { flexShrink: 1, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
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
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: COLORS.readiness.prime,
    borderRadius: RADIUS.sm,
  },
  primaryButtonText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#F5F5F0', textAlign: 'center' },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, textAlign: 'center' },
});
