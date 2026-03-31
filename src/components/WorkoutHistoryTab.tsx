import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, SPACING, RADIUS, ANIMATION } from '../theme/theme';

interface WorkoutHistoryTabProps {
  workoutHistory: any[];
}

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatFocusLabel(log: any) {
  return String(log.focus ?? log.workout_type ?? 'training')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRecapLine(log: any) {
  const parts: string[] = [];

  if (log.duration_minutes) {
    parts.push(`${log.duration_minutes} min`);
  }

  if (log.session_rpe != null) {
    parts.push(`Effort ${log.session_rpe}/10`);
  } else {
    parts.push('Logged workout');
  }

  return parts.join('  |  ');
}

export function WorkoutHistoryTab({ workoutHistory }: WorkoutHistoryTabProps) {
  if (workoutHistory.length === 0) {
    return (
      <Card>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your recent sessions will show up here</Text>
          <Text style={styles.emptyBody}>
            Finish a workout and Train will start turning your work into a simple running recap.
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {workoutHistory.map((log, index) => (
        <Animated.View
          key={log.id}
          entering={FadeInDown.delay(50 * index).duration(ANIMATION.normal).springify()}
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardCopy}>
                <Text style={styles.dateLabel}>{formatDateLabel(log.date)}</Text>
                <Text style={styles.focusLabel}>{formatFocusLabel(log)}</Text>
                <Text style={styles.recapLine}>{formatRecapLine(log)}</Text>
              </View>
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>Logged</Text>
              </View>
            </View>
          </Card>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.sm,
  },
  card: {
    paddingVertical: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  cardCopy: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    marginBottom: 4,
  },
  focusLabel: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.extraBold,
    color: COLORS.text.primary,
  },
  recapLine: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    marginTop: 4,
    lineHeight: 19,
  },
  doneBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
  },
  doneBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
