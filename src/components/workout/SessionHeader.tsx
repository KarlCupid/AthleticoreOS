import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { WorkoutSessionVM } from './types';
import {
  getCampPhaseLabel,
  getFocusLabel,
  getPrimaryAdaptationLabel,
  getWorkoutTypeLabel,
} from './metadata';

interface SessionHeaderProps {
  session: WorkoutSessionVM;
}

export function SessionHeader({ session }: SessionHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Type + adaptation badge row */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {getWorkoutTypeLabel(session.workoutType)}
          </Text>
        </View>
        <View style={styles.adaptationBadge}>
          <Text style={styles.adaptationBadgeText}>
            {getPrimaryAdaptationLabel(session.primaryAdaptation)}
          </Text>
        </View>
        {session.isDeload && (
          <View style={styles.deloadBadge}>
            <Text style={styles.deloadBadgeText}>Deload</Text>
          </View>
        )}
        {session.campPhase && (
          <View style={styles.campBadge}>
            <Text style={styles.campBadgeText}>
              {getCampPhaseLabel(session.campPhase)}
            </Text>
          </View>
        )}
      </View>

      {/* Goal */}
      {session.sessionGoal ? (
        <Text style={styles.goal}>{session.sessionGoal}</Text>
      ) : null}

      {/* Intent */}
      {session.sessionIntent ? (
        <Text style={styles.intent}>{session.sessionIntent}</Text>
      ) : null}

      {/* Meta row: duration + section count + exercise count */}
      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>{session.estimatedDurationMin} min</Text>
        </View>
        {session.hasSections && (
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>
              {session.sections.length} sections
            </Text>
          </View>
        )}
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>
            {session.hasSections
              ? session.sections.reduce((n, s) => n + s.exercises.length, 0)
              : session.flatExercises.length} exercises
          </Text>
        </View>
        <View style={styles.metaPill}>
          <Text style={styles.metaText}>
            {getFocusLabel(session.focus)}
          </Text>
        </View>
      </View>

      {/* Activation guidance */}
      {session.activationGuidance ? (
        <View style={styles.activationCard}>
          <Text style={styles.activationText}>{session.activationGuidance}</Text>
        </View>
      ) : null}

      {/* Interference warnings */}
      {session.interferenceWarnings.length > 0 && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            {session.interferenceWarnings.join(' • ')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  typeBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adaptationBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  adaptationBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deloadBadge: {
    backgroundColor: COLORS.readiness.cautionLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  deloadBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.readiness.caution,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  campBadge: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs,
  },
  campBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goal: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  intent: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaPill: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    textTransform: 'capitalize',
  },
  activationCard: {
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  activationText: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.accent,
    fontSize: 14,
  },
  warningCard: {
    backgroundColor: COLORS.readiness.cautionLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.readiness.caution,
  },
  warningText: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.readiness.caution,
    fontSize: 14,
  },
});
