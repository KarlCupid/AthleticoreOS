import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../theme/theme';
import type { ExerciseVM } from './types';

// ---------------------------------------------------------------------------
// RecoveryChecklist — calm, spacious recovery/cooldown UI
//
// Shows all movements at once with time guidance, simple checkboxes,
// no weight or RPE input. Softer colors and gentle spacing.
// ---------------------------------------------------------------------------

interface RecoveryChecklistProps {
  exercises: ExerciseVM[];
  /** Set of exercise IDs that are completed */
  completedIds?: Set<string>;
  /** Called when a movement is toggled */
  onToggle?: (exerciseId: string) => void;
  /** Interactive (live) or readonly (replay) */
  interactive?: boolean;
  /** Optional message from the coach */
  message?: string;
}

export function RecoveryChecklist({
  exercises,
  completedIds,
  onToggle,
  interactive = false,
  message,
}: RecoveryChecklistProps) {
  const allDone = completedIds
    ? completedIds.size >= exercises.length
    : false;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Recovery Session</Text>
        {allDone && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Complete</Text>
          </View>
        )}
      </View>

      {message && (
        <Text style={styles.message}>{message}</Text>
      )}

      {/* Movement list */}
      <View style={styles.list}>
        {exercises.map((ex) => {
          const isDone = completedIds?.has(ex.id) ?? false;
          const timeGuide = ex.restSeconds
            ? `${ex.restSeconds}s`
            : ex.setPrescription.length > 0
              ? ex.setPrescription[0].label
              : null;

          const content = (
            <View style={[styles.row, isDone && styles.rowDone]}>
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, isDone && styles.nameDone]}>
                  {ex.name}
                </Text>
                <View style={styles.hints}>
                  {timeGuide && (
                    <Text style={styles.hint}>{timeGuide}</Text>
                  )}
                  {ex.setScheme && (
                    <Text style={styles.hint}>{ex.setScheme}</Text>
                  )}
                  {ex.coachingCues.length > 0 && (
                    <Text style={styles.hint}>{ex.coachingCues[0]}</Text>
                  )}
                </View>
              </View>
            </View>
          );

          if (interactive && onToggle) {
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => onToggle(ex.id)}
                activeOpacity={0.7}
                accessibilityLabel={`${isDone ? 'Unmark' : 'Mark'} ${ex.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                style={{ minHeight: TAP_TARGETS.plan.min }}
              >
                {content}
              </TouchableOpacity>
            );
          }
          return <View key={ex.id}>{content}</View>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  doneBadge: {
    backgroundColor: COLORS.readiness.primeLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  doneBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.readiness.prime,
    fontWeight: '700',
  },
  message: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  list: {
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  rowDone: {
    backgroundColor: COLORS.readiness.primeLight,
    borderColor: COLORS.readiness.prime + '30',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: COLORS.readiness.prime,
    borderColor: COLORS.readiness.prime,
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  nameDone: {
    color: COLORS.text.tertiary,
  },
  hints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  hint: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
