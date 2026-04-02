import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';
import { getSessionFamilyLabel } from '../../lib/engine/sessionLabels';

function getSessionIcon(sessionType: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const t = sessionType.toLowerCase();
  if (t.includes('sparring') || t.includes('boxing') || t.includes('striking')) return 'boxing-glove';
  if (t === 'sc' || t.includes('strength')) return 'dumbbell';
  if (t.includes('conditioning') || t.includes('run')) return 'shoe-print';
  if (t.includes('recovery')) return 'spa';
  if (t.includes('grappling')) return 'mixed-martial-arts';
  return 'flash';
}

function getIntensityConfig(intensity: number | null): { label: string; color: string; bg: string } {
  if (intensity === null) return { label: 'Unrated', color: COLORS.text.tertiary, bg: 'transparent' };
  
  if (intensity <= 3) return { label: 'Recovery', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
  if (intensity <= 6) return { label: 'Moderate', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
  if (intensity <= 8) return { label: 'Hard', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
  return { label: 'Max Effort', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
}

interface Session {
  slot: 'am' | 'pm' | 'single';
  sessionType: string;
  focus: string | null;
  duration: number;
  intensity: number | null;
  status: 'planned' | 'completed' | 'skipped' | 'rescheduled';
}

interface DayPlanCardProps {
  dayName: string;
  date: string;
  sessions: Session[];
  isToday: boolean;
  isDeload: boolean;
  onPress: () => void;
  onReschedule?: () => void;
}

const STATUS_COLORS: Record<Session['status'], string> = {
  planned: COLORS.text.secondary,
  completed: COLORS.success,
  skipped: COLORS.warning,
  rescheduled: COLORS.warning,
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function IntensityBadge({ intensity }: { intensity: number | null }) {
  if (intensity === null) return null;
  const config = getIntensityConfig(intensity);
  return (
    <View style={[styles.intensityBadge, { backgroundColor: config.bg, borderColor: config.color + '30', borderWidth: 1 }]}>
      <Text style={[styles.intensityText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Session['status'] }) {
  if (status === 'planned') return null;

  const label =
    status === 'completed'
      ? '\u2713'
      : status === 'skipped'
        ? 'Skipped'
        : 'Moved';

  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: STATUS_COLORS[status] + '1A' },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          { color: STATUS_COLORS[status] },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SessionRow({ session }: { session: Session }) {
  const isMuted =
    session.status === 'completed' || session.status === 'skipped';
  const sessionLabel = getSessionFamilyLabel({
    sessionType: session.sessionType,
    focus: session.focus,
  });

  const iconName = getSessionIcon(session.sessionType);

  return (
    <View style={[styles.sessionRow, isMuted && styles.sessionRowMuted]}>
      <View style={styles.sessionLeft}>
        <View style={[styles.iconContainer, isMuted && { opacity: 0.5 }]}>
          <MaterialCommunityIcons name={iconName} size={22} color={isMuted ? COLORS.text.tertiary : COLORS.text.primary} />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.sessionType, isMuted && styles.textMuted]}
              numberOfLines={1}
            >
              {sessionLabel}
            </Text>
            {session.slot !== 'single' && (
              <View style={styles.slotBadge}>
                <Text style={styles.slotText}>{session.slot.toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionDuration}>
              {formatDuration(session.duration)}
            </Text>
            <View style={styles.metaDot} />
            <IntensityBadge intensity={session.intensity} />
          </View>
        </View>
      </View>
      <StatusBadge status={session.status} />
    </View>
  );
}

export default function DayPlanCard({
  dayName,
  date,
  sessions,
  isToday,
  isDeload,
  onPress,
  onReschedule,
}: DayPlanCardProps) {
  const hasSkipped = sessions.some(
    (s) => s.status === 'skipped' || s.status === 'rescheduled'
  );
  const allCompleted =
    sessions.length > 0 && sessions.every((s) => s.status === 'completed');

  const d = new Date(date);
  const dayNum = d.getDate();
  const monthShort = d.toLocaleString('en-US', { month: 'short' });

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    isToday && styles.cardToday,
    allCompleted && styles.cardCompleted,
  ];

  return (
    <Animated.View entering={FadeInDown.duration(ANIMATION.slow).springify()}>
      <AnimatedPressable
        style={cardStyle}
        onPress={onPress}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.dateLabel}>
              {monthShort} {dayNum}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isDeload && (
              <View style={styles.deloadBadge}>
                <Text style={styles.deloadText}>Recovery</Text>
              </View>
            )}
            {isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayText}>Today</Text>
              </View>
            )}
          </View>
        </View>

        {/* Sessions or Rest Day */}
        {sessions.length === 0 ? (
          <View style={styles.restDayContainer}>
            <View style={styles.restIconBox}>
                <MaterialCommunityIcons name="spa-outline" size={20} color={COLORS.text.tertiary} />
            </View>
            <View>
                <Text style={styles.restDayTitle}>Rest & Recovery</Text>
                <Text style={styles.restDaySubtitle}>Focus on sleep and hydration</Text>
            </View>
          </View>
        ) : (
          <View style={styles.sessionsList}>
            {sessions.map((session, idx) => (
              <SessionRow key={`${session.slot}-${idx}`} session={session} />
            ))}
          </View>
        )}

        {/* Reschedule button */}
        {hasSkipped && onReschedule && (
          <AnimatedPressable
            style={styles.rescheduleBtn}
            onPress={() => {
              onReschedule();
            }}
          >
            <Text style={styles.rescheduleBtnText}>Reschedule</Text>
          </AnimatedPressable>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)', // Deeper Glass
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...SHADOWS.md,
  },
  cardToday: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)', // Glassy Blue/Accent for today
    borderColor: COLORS.accent + '50',
    borderWidth: 1,
    ...SHADOWS.colored.accent,
  },
  cardCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)', // Even more subtle for completed
    borderColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dayName: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 16,
    color: COLORS.text.primary,
  },
  dateLabel: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  todayBadge: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  todayText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    color: COLORS.accent,
  },
  deloadBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  deloadText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
    color: '#166534',
  },
  sessionsList: {
    gap: SPACING.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  sessionRowMuted: {
    opacity: 0.55,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sessionInfo: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  slotBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  slotText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    color: COLORS.text.secondary,
  },
  sessionType: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 15,
    color: COLORS.text.primary,
  },
  textMuted: {
    color: COLORS.text.secondary,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.text.tertiary,
  },
  sessionDuration: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  intensityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  intensityText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 11,
  },
  restDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: 2,
    opacity: 0.7,
  },
  restIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  restDayTitle: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  restDaySubtitle: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  rescheduleBtn: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.warning + '1A',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  rescheduleBtnText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 12,
    color: COLORS.warning,
  },
});
