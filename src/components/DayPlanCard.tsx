import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, SHADOWS, ANIMATION } from '../theme/theme';
import { AnimatedPressable } from './AnimatedPressable';

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

const SLOT_LABELS: Record<Session['slot'], string> = {
  am: 'AM',
  pm: 'PM',
  single: '',
};

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

function IntensityDots({ intensity }: { intensity: number | null }) {
  if (intensity === null) return null;
  const filled = Math.max(0, Math.min(5, Math.round((intensity / 10) * 5)));
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i <= filled ? COLORS.accent : COLORS.border },
          ]}
        />
      ))}
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

  return (
    <View style={[styles.sessionRow, isMuted && styles.sessionRowMuted]}>
      <View style={styles.sessionLeft}>
        {session.slot !== 'single' && (
          <View style={styles.slotTag}>
            <Text style={styles.slotTagText}>
              {SLOT_LABELS[session.slot]}
            </Text>
          </View>
        )}
        <View style={styles.sessionInfo}>
          <Text
            style={[styles.sessionType, isMuted && styles.textMuted]}
            numberOfLines={1}
          >
            {session.focus ?? session.sessionType}
          </Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionDuration}>
              {formatDuration(session.duration)}
            </Text>
            <IntensityDots intensity={session.intensity} />
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

        {/* Sessions */}
        {sessions.length === 0 ? (
          <Text style={styles.restDay}>Rest Day</Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg - 4,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardToday: {
    borderLeftColor: COLORS.accent,
  },
  cardCompleted: {
    backgroundColor: COLORS.surfaceSecondary,
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
    gap: SPACING.sm,
  },
  slotTag: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  slotTagText: {
    fontFamily: FONT_FAMILY.semiBold,
    fontSize: 10,
    color: COLORS.text.secondary,
    letterSpacing: 0.5,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionType: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 14,
    color: COLORS.text.primary,
  },
  textMuted: {
    color: COLORS.text.tertiary,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  sessionDuration: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
  restDay: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: SPACING.xs,
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


