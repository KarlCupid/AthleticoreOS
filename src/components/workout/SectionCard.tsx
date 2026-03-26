import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  RADIUS,
  SHADOWS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { WorkoutSectionVM, ExerciseVM, ExerciseProgressVM } from './types';
import { ExerciseCard } from './ExerciseCard';

// ---------------------------------------------------------------------------
// Template display metadata
// ---------------------------------------------------------------------------

const TEMPLATE_ACCENT: Record<string, string> = {
  activation: COLORS.readiness.caution,
  power: COLORS.chart.fitness,
  main_strength: COLORS.accent,
  secondary_strength: COLORS.accent,
  accessory: COLORS.text.tertiary,
  durability: COLORS.readiness.prime,
  finisher: COLORS.readiness.depleted,
  cooldown: COLORS.chart.water,
};

interface SectionCardProps {
  section: WorkoutSectionVM;
  /** Per-exercise progress map (exerciseId → progress) */
  progressMap?: Record<string, ExerciseProgressVM>;
  /** If true, section starts collapsed */
  defaultCollapsed?: boolean;
  /** Called when an exercise card is pressed */
  onExercisePress?: (exercise: ExerciseVM, index: number) => void;
  /** Children rendered after exercises (e.g. section-level timer) */
  children?: React.ReactNode;
}

export function SectionCard({
  section,
  progressMap,
  defaultCollapsed = false,
  onExercisePress,
  children,
}: SectionCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const accentColor = TEMPLATE_ACCENT[section.template] ?? COLORS.accent;

  const completedCount = section.exercises.filter(ex =>
    progressMap?.[ex.id]?.isComplete,
  ).length;
  const allDone = completedCount === section.exercises.length && section.exercises.length > 0;

  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      {/* Section header */}
      <TouchableOpacity
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${section.title} section, ${section.exercises.length} exercises`}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.templateDot, { backgroundColor: accentColor }]} />
          <View style={styles.headerText}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionIntent} numberOfLines={1}>
              {section.intent}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {allDone ? (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✓</Text>
            </View>
          ) : (
            <Text style={styles.exerciseCount}>
              {completedCount}/{section.exercises.length}
            </Text>
          )}
          <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
        </View>
      </TouchableOpacity>

      {/* Section meta pills */}
      {!collapsed && (
        <View style={styles.metaRow}>
          {section.timeCap > 0 && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{section.timeCap} min cap</Text>
            </View>
          )}
          {section.restRule && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{section.restRule}</Text>
            </View>
          )}
          {section.densityRule && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{section.densityRule}</Text>
            </View>
          )}
          {section.finisherReason && (
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{section.finisherReason}</Text>
            </View>
          )}
        </View>
      )}

      {/* Exercises */}
      {!collapsed && (
        <View style={styles.exerciseList}>
          {section.exercises.map((ex, i) => (
            <TouchableOpacity
              key={ex.id}
              onPress={() => onExercisePress?.(ex, i)}
              activeOpacity={onExercisePress ? 0.7 : 1}
              disabled={!onExercisePress}
            >
              <ExerciseCard
                exercise={ex}
                index={i + 1}
                progress={progressMap?.[ex.id] ?? null}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Section-level extras */}
      {!collapsed && children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  templateDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  sectionIntent: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  exerciseCount: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
  },
  doneBadge: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.readiness.primeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBadgeText: {
    fontSize: 12,
    color: COLORS.readiness.prime,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 14,
    color: COLORS.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaPill: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  metaText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    fontSize: 11,
  },
  exerciseList: {
    gap: SPACING.sm,
  },
});
