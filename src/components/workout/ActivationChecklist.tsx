import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  FONT_FAMILY,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
  TAP_TARGETS,
} from '../../theme/theme';
import type { ExerciseVM } from './types';

// ---------------------------------------------------------------------------
// ActivationChecklist — quick sparring-prep / activation UI
//
// All movements shown simultaneously (not one-at-a-time).
// Simple checkboxes per movement. "Ready" button at bottom.
// Compact layout — designed to be done in 10–15 minutes.
// ---------------------------------------------------------------------------

interface ActivationChecklistProps {
  exercises: ExerciseVM[];
  estimatedMinutes: number;
  /** Set of exercise IDs that are completed */
  completedIds?: Set<string>;
  /** Called when a movement is toggled */
  onToggle?: (exerciseId: string) => void;
  /** Called when "Ready" is pressed */
  onReady?: () => void;
  /** Interactive or readonly */
  interactive?: boolean;
  /** Label for what follows activation (e.g. "Sparring", "Training") */
  nextActivityLabel?: string;
}

export function ActivationChecklist({
  exercises,
  estimatedMinutes,
  completedIds,
  onToggle,
  onReady,
  interactive = false,
  nextActivityLabel = 'Training',
}: ActivationChecklistProps) {
  const completedCount = completedIds?.size ?? 0;
  const allDone = completedCount >= exercises.length;

  return (
    <View style={styles.container}>
      {/* Compact header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activation</Text>
          <Text style={styles.subtitle}>
            {exercises.length} movements • ~{estimatedMinutes} min
          </Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>
            {completedCount}/{exercises.length}
          </Text>
        </View>
      </View>

      {/* Movement grid — all visible at once */}
      <View style={styles.grid}>
        {exercises.map((ex) => {
          const isDone = completedIds?.has(ex.id) ?? false;

          const card = (
            <View style={[styles.card, isDone && styles.cardDone]}>
              <View style={[styles.checkDot, isDone && styles.checkDotDone]}>
                {isDone && <Text style={styles.checkDotText}>✓</Text>}
              </View>
              <Text style={[styles.cardName, isDone && styles.cardNameDone]} numberOfLines={2}>
                {ex.name}
              </Text>
              {ex.setScheme && (
                <Text style={styles.cardMeta}>{ex.setScheme}</Text>
              )}
              {ex.coachingCues.length > 0 && (
                <Text style={styles.cardCue} numberOfLines={1}>
                  {ex.coachingCues[0]}
                </Text>
              )}
            </View>
          );

          if (interactive && onToggle) {
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => onToggle(ex.id)}
                activeOpacity={0.7}
                style={styles.cardWrapper}
                accessibilityLabel={`${isDone ? 'Unmark' : 'Mark'} ${ex.name}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
              >
                {card}
              </TouchableOpacity>
            );
          }
          return (
            <View key={ex.id} style={styles.cardWrapper}>
              {card}
            </View>
          );
        })}
      </View>

      {/* Ready button */}
      {interactive && onReady && (
        <TouchableOpacity
          onPress={onReady}
          activeOpacity={0.85}
          disabled={!allDone}
          style={[
            styles.readyButton,
            allDone ? styles.readyButtonActive : styles.readyButtonDisabled,
          ]}
          accessibilityLabel={`Ready for ${nextActivityLabel}`}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.readyText,
              allDone ? styles.readyTextActive : styles.readyTextDisabled,
            ]}
          >
            {allDone ? `Ready for ${nextActivityLabel}` : `Complete all movements`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  subtitle: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 14,
    color: COLORS.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  cardWrapper: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minHeight: TAP_TARGETS.focus.min,
    ...SHADOWS.card,
  },
  cardDone: {
    backgroundColor: COLORS.readiness.primeLight,
    borderColor: COLORS.readiness.prime + '30',
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotDone: {
    backgroundColor: COLORS.readiness.prime,
    borderColor: COLORS.readiness.prime,
  },
  checkDotText: {
    fontSize: 12,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  cardName: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
    fontSize: 14,
  },
  cardNameDone: {
    color: COLORS.text.tertiary,
  },
  cardMeta: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  cardCue: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  readyButton: {
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TAP_TARGETS.focusPrimary.min,
  },
  readyButtonActive: {
    backgroundColor: COLORS.accent,
  },
  readyButtonDisabled: {
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readyText: {
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 18,
    letterSpacing: 0.3,
  },
  readyTextActive: {
    color: COLORS.text.inverse,
  },
  readyTextDisabled: {
    color: COLORS.text.tertiary,
  },
});
