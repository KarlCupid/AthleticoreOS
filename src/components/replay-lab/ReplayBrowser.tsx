import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { Card } from '../Card';
import { AnimatedPressable } from '../AnimatedPressable';
import { PillButton } from './primitives/PillButton';
import { formatDate, formatPhase, riskColors } from './helpers';
import type { EngineReplayDay } from '../../../lib/engine/simulation/lab';

interface ReplayBrowserProps {
  weeks: Array<{ index: number; days: EngineReplayDay[] }>;
  selectedDayIndex: number;
  selectedWeekIndex: number;
  totalDays: number;
  onSelectDay: (index: number) => void;
  onJumpDay: (delta: number) => void;
  selectedDay: EngineReplayDay;
  selectedWeek: { index: number; days: EngineReplayDay[] } | null;
}

export function ReplayBrowser({
  weeks,
  selectedDayIndex,
  selectedWeekIndex,
  totalDays,
  onSelectDay,
  onJumpDay,
  selectedDay,
  selectedWeek,
}: ReplayBrowserProps) {
  return (
    <Card title="Replay Browser" subtitle="Pick a week, then inspect the days inside that week.">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalRow}
        accessibilityRole="toolbar"
        accessibilityLabel="Week selector"
      >
        {weeks.map((week) => (
          <AnimatedPressable
            key={`week-${week.index}`}
            onPress={() => onSelectDay(week.days[0]?.index ?? 0)}
            style={[styles.weekButton, week.index === selectedWeekIndex && styles.weekButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={`Week ${week.index + 1}, ${formatDate(week.days[0].date)} to ${formatDate(week.days[week.days.length - 1].date)}`}
            accessibilityState={{ selected: week.index === selectedWeekIndex }}
          >
            <Text style={[styles.weekTitle, week.index === selectedWeekIndex && styles.weekTitleActive]}>
              Week {week.index + 1}
            </Text>
            <Text style={styles.weekDate}>
              {formatDate(week.days[0].date)} - {formatDate(week.days[week.days.length - 1].date)}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>

      <View style={styles.dayNavRow}>
        <PillButton
          label="Previous"
          active={false}
          onPress={() => onJumpDay(-1)}
          disabled={selectedDayIndex === 0}
          size="sm"
          accessibilityLabel="Previous day"
        />
        <View style={styles.dayNavCenter}>
          <Text style={styles.dayNavTitle}>{formatDate(selectedDay.date)}</Text>
          <Text style={styles.dayNavSubtitle}>{formatPhase(selectedDay.phase)} | {formatPhase(selectedDay.sessionRole)}</Text>
        </View>
        <PillButton
          label="Next"
          active={false}
          onPress={() => onJumpDay(1)}
          disabled={selectedDayIndex === totalDays - 1}
          size="sm"
          accessibilityLabel="Next day"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalRow}
        accessibilityRole="toolbar"
        accessibilityLabel="Day selector"
      >
        {selectedWeek?.days.map((day) => {
          const risk = riskColors(day.riskLevel);
          const active = day.index === selectedDayIndex;
          const hasEngineDanger = day.engineDangerDay;
          const hasAthleteOverride = day.athleteOverrideDay;

          return (
            <AnimatedPressable
              key={`day-${day.index}`}
              onPress={() => onSelectDay(day.index)}
              style={[
                styles.dayButton,
                active && styles.dayButtonActive,
                hasEngineDanger && styles.dayButtonDanger,
                !hasEngineDanger && hasAthleteOverride && styles.dayButtonOverride,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${formatDate(day.date)}, ${formatPhase(day.sessionRole)}, risk ${day.riskLevel}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.dayDate, active && styles.dayDateActive]}>{formatDate(day.date)}</Text>
              <Text style={[styles.dayRole, day.sessionRole === 'recovery' && styles.dayRoleDimmed]} numberOfLines={1}>
                {formatPhase(day.sessionRole)}
              </Text>
              <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
                <Text style={[styles.riskChipText, { color: risk.fg }]}>{day.riskLevel}</Text>
              </View>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  horizontalRow: { gap: SPACING.sm },
  weekButton: {
    minWidth: 144,
    minHeight: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  weekButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  weekTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  weekTitleActive: { color: COLORS.accent },
  weekDate: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  dayNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  dayNavCenter: { flex: 1, alignItems: 'center' },
  dayNavTitle: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  dayNavSubtitle: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  dayButton: {
    width: 128,
    minHeight: 44,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  dayButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  dayButtonDanger: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.readiness.depleted,
  },
  dayButtonOverride: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.readiness.caution,
  },
  dayDate: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.primary,
  },
  dayDateActive: { color: COLORS.accent },
  dayRole: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    color: COLORS.text.secondary,
  },
  dayRoleDimmed: { opacity: 0.6 },
  riskChip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  riskChipText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY_V2.plan.caption.fontFamily,
    textTransform: 'uppercase',
  },
});
