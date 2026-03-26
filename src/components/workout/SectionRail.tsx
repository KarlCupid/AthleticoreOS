import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY_V2,
} from '../../theme/theme';
import type { WorkoutSectionVM } from './types';

// ---------------------------------------------------------------------------
// Section template display labels + icons
// ---------------------------------------------------------------------------

const SECTION_META: Record<string, { label: string; icon: string }> = {
  activation: { label: 'Activation', icon: '🔥' },
  power: { label: 'Power', icon: '⚡' },
  main_strength: { label: 'Main Lift', icon: '🏋️' },
  secondary_strength: { label: 'Secondary', icon: '💪' },
  accessory: { label: 'Accessory', icon: '🎯' },
  durability: { label: 'Durability', icon: '🛡️' },
  finisher: { label: 'Finisher', icon: '🔔' },
  cooldown: { label: 'Cooldown', icon: '🧊' },
};

function getSectionMeta(template: string) {
  return SECTION_META[template] ?? { label: template.replace(/_/g, ' '), icon: '•' };
}

// ---------------------------------------------------------------------------
// SectionRail — horizontal scrollable section pills with active highlight
// ---------------------------------------------------------------------------

interface SectionRailProps {
  sections: WorkoutSectionVM[];
  /** Currently active section index (-1 if none) */
  activeSectionIndex: number;
  /** Completed section indices */
  completedSections?: Set<number>;
  /** Called when user taps a section pill */
  onSectionPress?: (index: number) => void;
  /** Render mode — interactive allows tapping, readonly is display only */
  interactive?: boolean;
}

export function SectionRail({
  sections,
  activeSectionIndex,
  completedSections,
  onSectionPress,
  interactive = false,
}: SectionRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {sections.map((section, i) => {
        const meta = getSectionMeta(section.template);
        const isActive = i === activeSectionIndex;
        const isCompleted = completedSections?.has(i) ?? false;

        const pill = (
          <View
            key={section.id}
            style={[
              styles.pill,
              isActive && styles.pillActive,
              isCompleted && styles.pillCompleted,
            ]}
          >
            <Text style={styles.pillIcon}>{meta.icon}</Text>
            <Text
              style={[
                styles.pillLabel,
                isActive && styles.pillLabelActive,
                isCompleted && styles.pillLabelCompleted,
              ]}
              numberOfLines={1}
            >
              {meta.label}
            </Text>
            {/* Exercise count dot */}
            <View
              style={[
                styles.countDot,
                isActive && styles.countDotActive,
                isCompleted && styles.countDotCompleted,
              ]}
            >
              <Text
                style={[
                  styles.countText,
                  isActive && styles.countTextActive,
                  isCompleted && styles.countTextCompleted,
                ]}
              >
                {section.exercises.length}
              </Text>
            </View>
          </View>
        );

        if (interactive && onSectionPress) {
          return (
            <TouchableOpacity
              key={section.id}
              onPress={() => onSectionPress(i)}
              activeOpacity={0.7}
              accessibilityLabel={`${meta.label} section, ${section.exercises.length} exercises`}
              accessibilityRole="button"
            >
              {pill}
            </TouchableOpacity>
          );
        }

        return pill;
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Connector line between pills (visual)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pillActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  pillCompleted: {
    backgroundColor: COLORS.readiness.primeLight,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'capitalize',
  },
  pillLabelActive: {
    color: COLORS.accent,
  },
  pillLabelCompleted: {
    color: COLORS.readiness.prime,
  },
  countDot: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countDotActive: {
    backgroundColor: COLORS.accent,
  },
  countDotCompleted: {
    backgroundColor: COLORS.readiness.prime,
  },
  countText: {
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text.tertiary,
  },
  countTextActive: {
    color: COLORS.text.inverse,
  },
  countTextCompleted: {
    color: COLORS.text.inverse,
  },
});
