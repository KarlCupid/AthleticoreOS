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
import type { CircuitRoundVM, CircuitMovementVM } from './types';

// ---------------------------------------------------------------------------
// CircuitView — movement list with round tracking and per-movement toggles
// ---------------------------------------------------------------------------

interface CircuitViewProps {
  circuit: CircuitRoundVM;
  /** Current round (1-based) */
  currentRound: number;
  /** Set of completed movement indices for the current round */
  completedMovements?: Set<number>;
  /** Called when a movement is toggled */
  onToggleMovement?: (movementIndex: number) => void;
  /** Whether the UI is interactive (live workout) or readonly (replay) */
  interactive?: boolean;
}

export function CircuitView({
  circuit,
  currentRound,
  completedMovements,
  onToggleMovement,
  interactive = false,
}: CircuitViewProps) {
  const allDone = completedMovements
    ? completedMovements.size >= circuit.movements.length
    : false;

  return (
    <View style={styles.container}>
      {/* Round header */}
      <View style={styles.roundHeader}>
        <Text style={styles.roundTitle}>
          Round {currentRound} of {circuit.roundCount}
        </Text>
        {allDone && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Complete</Text>
          </View>
        )}
      </View>

      {/* Round progress blocks */}
      <View style={styles.roundBlocks}>
        {Array.from({ length: circuit.roundCount }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.roundBlock,
              i < currentRound - 1 && styles.roundBlockDone,
              i === currentRound - 1 && styles.roundBlockCurrent,
            ]}
          />
        ))}
      </View>

      {/* Movement list */}
      <View style={styles.movementList}>
        {circuit.movements.map((movement, i) => {
          const isDone = completedMovements?.has(i) ?? false;
          return (
            <MovementRow
              key={i}
              movement={movement}
              index={i + 1}
              completed={isDone}
              onToggle={interactive ? () => onToggleMovement?.(i) : undefined}
              interactive={interactive}
            />
          );
        })}
      </View>

      {/* Rest between rounds */}
      {circuit.restBetweenRoundsSec > 0 && (
        <View style={styles.restNote}>
          <Text style={styles.restNoteText}>
            {circuit.restBetweenRoundsSec}s rest between rounds
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// MovementRow
// ---------------------------------------------------------------------------

interface MovementRowProps {
  movement: CircuitMovementVM;
  index: number;
  completed: boolean;
  onToggle?: () => void;
  interactive: boolean;
}

function MovementRow({ movement, index, completed, onToggle, interactive }: MovementRowProps) {
  const content = (
    <View style={[styles.movementRow, completed && styles.movementRowDone]}>
      {/* Checkbox */}
      <View style={[styles.checkbox, completed && styles.checkboxDone]}>
        {completed && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Movement info */}
      <View style={styles.movementInfo}>
        <Text
          style={[styles.movementName, completed && styles.movementNameDone]}
          numberOfLines={1}
        >
          {movement.exerciseName}
        </Text>
        <Text style={styles.movementMeta}>
          {movement.reps != null && `${movement.reps} reps`}
          {movement.reps != null && movement.durationSec != null && ' • '}
          {movement.durationSec != null && `${movement.durationSec}s`}
          {movement.restSec > 0 && ` • ${movement.restSec}s rest`}
        </Text>
      </View>

      {/* Index */}
      <Text style={styles.movementIndex}>{index}</Text>
    </View>
  );

  if (interactive && onToggle) {
    return (
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityLabel={`${completed ? 'Unmark' : 'Mark'} ${movement.exerciseName}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        style={{ minHeight: TAP_TARGETS.focus.min }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundTitle: {
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
  roundBlocks: {
    flexDirection: 'row',
    gap: 3,
    flexWrap: 'wrap',
  },
  roundBlock: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    minWidth: 16,
  },
  roundBlockDone: {
    backgroundColor: COLORS.accent,
  },
  roundBlockCurrent: {
    backgroundColor: COLORS.readiness.caution,
  },
  movementList: {
    gap: SPACING.xs,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  movementRowDone: {
    backgroundColor: COLORS.readiness.primeLight,
    borderColor: COLORS.readiness.prime + '30',
  },
  checkbox: {
    width: 24,
    height: 24,
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
    fontSize: 14,
    color: COLORS.text.inverse,
    fontWeight: '700',
  },
  movementInfo: {
    flex: 1,
  },
  movementName: {
    ...TYPOGRAPHY_V2.plan.body,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  movementNameDone: {
    textDecorationLine: 'line-through',
    color: COLORS.text.tertiary,
  },
  movementMeta: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  movementIndex: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    width: 20,
    textAlign: 'right',
  },
  restNote: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  restNoteText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
  },
});
