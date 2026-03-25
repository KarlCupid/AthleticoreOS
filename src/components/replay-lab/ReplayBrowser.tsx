import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SEMANTIC_PALETTE, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { Card } from '../Card';
import { AnimatedPressable } from '../AnimatedPressable';
import { riskColors } from './helpers';
import type { ReplayWeekRail } from './useReplayState';

interface ReplayBrowserProps {
  weeks: ReplayWeekRail[];
  selectedDayIndex: number;
  expandedWeekIndex: number;
  onSelectDay: (index: number) => void;
  onExpandWeek: (index: number) => void;
}

export function ReplayBrowser({
  weeks,
  selectedDayIndex,
  expandedWeekIndex,
  onSelectDay,
  onExpandWeek,
}: ReplayBrowserProps) {
  return (
    <Card title="Workout Rail" subtitle="Browse the replay by week and open the generated workout for any day.">
      <View style={styles.weekList}>
        {weeks.map((week) => {
          const expanded = week.index === expandedWeekIndex;

          return (
            <View key={`week-${week.index}`} style={styles.weekSection}>
              <AnimatedPressable
                onPress={() => onExpandWeek(week.index)}
                style={[styles.weekHeader, expanded && styles.weekHeaderExpanded]}
                accessibilityRole="button"
                accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${week.label}`}
                accessibilityState={{ expanded }}
              >
                <View style={styles.weekHeaderBody}>
                  <Text style={styles.weekTitle}>{week.label}</Text>
                  <Text style={styles.weekSubtitle}>{week.rangeLabel}</Text>
                  {week.flagsLabel ? <Text style={styles.weekFlags}>{week.flagsLabel}</Text> : null}
                </View>
                <View style={[styles.weekToggle, expanded && styles.weekToggleExpanded]}>
                  <Text style={[styles.weekToggleText, expanded && styles.weekToggleTextExpanded]}>{expanded ? 'Shown' : 'View'}</Text>
                </View>
              </AnimatedPressable>

              {expanded ? (
                <View style={styles.dayList}>
                  {week.days.map((day) => {
                    const risk = riskColors(day.riskLevel);
                    const selected = day.index === selectedDayIndex;

                    return (
                      <AnimatedPressable
                        key={`day-${day.index}`}
                        onPress={() => onSelectDay(day.index)}
                        style={[
                          styles.dayCard,
                          selected && styles.dayCardSelected,
                          day.engineDangerDay && styles.dayCardDanger,
                          !day.engineDangerDay && day.athleteOverrideDay && styles.dayCardOverride,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${day.dateLabel}, ${day.title}, risk ${day.riskLevel}`}
                        accessibilityState={{ selected }}
                      >
                        <View style={styles.dayHeader}>
                          <Text style={[styles.dayDate, selected && styles.dayDateSelected]}>{day.dateLabel}</Text>
                          <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
                            <Text style={[styles.riskChipText, { color: risk.fg }]}>{day.riskLevel}</Text>
                          </View>
                        </View>

                        <Text style={styles.dayTitle} numberOfLines={1}>{day.title}</Text>
                        <Text style={styles.daySubtitle} numberOfLines={1}>{day.sessionLabel}</Text>
                        <Text style={styles.dayPreview} numberOfLines={1}>{day.preview}</Text>

                        <View style={styles.flagRow}>
                          {day.engineDangerDay ? <FlagChip label="Engine danger" tone="danger" /> : null}
                          {day.athleteOverrideDay ? <FlagChip label="Athlete override" tone="warning" /> : null}
                          {day.isMandatoryRecovery ? <FlagChip label="Mandatory recovery" tone="good" /> : null}
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function FlagChip({ label, tone }: { label: string; tone: 'good' | 'warning' | 'danger' }) {
  const palette = tone === 'danger'
    ? { bg: SEMANTIC_PALETTE.alert.tint, fg: SEMANTIC_PALETTE.alert.edge }
    : tone === 'warning'
      ? { bg: SEMANTIC_PALETTE.caution.tint, fg: SEMANTIC_PALETTE.caution.edge }
      : { bg: SEMANTIC_PALETTE.positive.tint, fg: SEMANTIC_PALETTE.positive.edge };

  return (
    <View style={[styles.flagChip, { backgroundColor: palette.bg }]}>
      <Text style={[styles.flagChipText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  weekList: {
    gap: SPACING.md,
  },
  weekSection: {
    gap: SPACING.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  weekHeaderExpanded: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  weekHeaderBody: {
    flex: 1,
  },
  weekTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  weekSubtitle: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  weekFlags: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.accent,
  },
  weekToggle: {
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  weekToggleExpanded: {
    backgroundColor: COLORS.accent,
  },
  weekToggleText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.primary,
  },
  weekToggleTextExpanded: {
    color: COLORS.text.inverse,
  },
  dayList: {
    gap: SPACING.sm,
  },
  dayCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  dayCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: '#F6FFFC',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  dayCardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC_PALETTE.alert.edge,
  },
  dayCardOverride: {
    borderLeftWidth: 4,
    borderLeftColor: SEMANTIC_PALETTE.caution.edge,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  dayDate: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  dayDateSelected: {
    color: COLORS.accent,
  },
  riskChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  riskChipText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    textTransform: 'uppercase',
  },
  dayTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  daySubtitle: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  dayPreview: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  flagChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  flagChipText: {
    ...TYPOGRAPHY_V2.plan.caption,
  },
});
