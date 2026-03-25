import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { Card } from '../Card';
import { AnimatedPressable } from '../AnimatedPressable';
import { OverviewTab } from './tabs/OverviewTab';
import { WorkoutTab } from './tabs/WorkoutTab';
import { FuelTab } from './tabs/FuelTab';
import { DecisionsTab } from './tabs/DecisionsTab';
import { formatPhase, riskColors } from './helpers';
import { TONE_TINTS, type MetricTone } from './styles';
import { CollapsibleSection } from './primitives/CollapsibleSection';
import type { EngineReplayDay } from '../../../lib/engine/simulation/lab';
import type { ReplayQuickStat, WorkoutStats } from './useReplayState';

interface DayInspectorProps {
  day: EngineReplayDay;
  workoutStats: WorkoutStats;
  quickStats: ReplayQuickStat[];
  onJumpDay: (delta: number) => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function DayInspector({
  day,
  workoutStats,
  quickStats,
  onJumpDay,
  canGoPrevious,
  canGoNext,
}: DayInspectorProps) {
  const risk = riskColors(day.riskLevel);
  const defaultRiskOpen = day.engineDangerDay || day.athleteOverrideDay || day.findings.length > 0;

  return (
    <>
      <Card noPadding style={styles.heroCard}>
        <LinearGradient colors={[...GRADIENTS.accent]} style={styles.heroBand}>
          <View style={styles.heroBandRow}>
            <View style={styles.heroTitleBlock}>
              <Text style={styles.heroEyebrow}>Selected Workout</Text>
              <Text style={styles.heroDate}>{formatLongDate(day.date)}</Text>
              <Text style={styles.heroTitle}>{day.workoutTitle}</Text>
              <Text style={styles.heroSubtitle}>
                {formatPhase(day.cutPhase)} | {formatPhase(day.sessionRole)} | {formatPhase(day.workoutType ?? 'untitled session')}
              </Text>
            </View>

            <View style={styles.navControls}>
              <NavButton label="Previous" disabled={!canGoPrevious} onPress={() => onJumpDay(-1)} />
              <NavButton label="Next" disabled={!canGoNext} onPress={() => onJumpDay(1)} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.heroBody}>
          <Text style={styles.headline}>{day.headline}</Text>
          <Text style={styles.summary}>{day.summary}</Text>
          {day.primaryCause ? <Text style={styles.primaryCause}>Primary cause: {day.primaryCause}</Text> : null}

          <View style={styles.flagRow}>
            <ContextBadge label={`Risk ${day.riskLevel}`} backgroundColor={risk.bg} textColor={risk.fg} />
            <ContextBadge label={`Intervention ${formatPhase(day.interventionState)}`} tone="default" />
            {day.engineDangerDay ? <ContextBadge label="Engine danger" tone="danger" /> : null}
            {day.athleteOverrideDay ? <ContextBadge label="Athlete override" tone="warning" /> : null}
            {day.scenarioPressureDay ? <ContextBadge label="Scenario pressure" tone="warning" /> : null}
            {day.isMandatoryRecovery ? <ContextBadge label="Mandatory recovery" tone="good" /> : null}
          </View>

          <View style={styles.quickGrid}>
            {quickStats.map((stat) => (
              <QuickContextTile key={stat.label} stat={stat} />
            ))}
          </View>
        </View>
      </Card>

      <WorkoutTab day={day} workoutStats={workoutStats} />

      <CollapsibleSection
        title="Risk & Findings"
        subtitle="Primary drivers, findings, and session summary."
        defaultOpen={defaultRiskOpen}
        resetKey={day.index}
      >
        <OverviewTab day={day} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Fuel & Hydration"
        subtitle="Prescribed intake and what the simulated athlete actually hit."
        defaultOpen={false}
        resetKey={day.index}
      >
        <FuelTab day={day} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Decision Trace"
        subtitle="Why the engine shaped the day this way."
        defaultOpen={false}
        resetKey={day.index}
      >
        <DecisionsTab day={day} />
      </CollapsibleSection>
    </>
  );
}

function QuickContextTile({ stat }: { stat: ReplayQuickStat }) {
  return (
    <View style={[styles.quickTile, { backgroundColor: TONE_TINTS[stat.tone ?? 'default'] }]}>
      <Text style={styles.quickTileLabel}>{stat.label}</Text>
      <Text style={styles.quickTileValue}>{stat.value}</Text>
    </View>
  );
}

function ContextBadge({
  label,
  tone = 'default',
  backgroundColor,
  textColor,
}: {
  label: string;
  tone?: MetricTone;
  backgroundColor?: string;
  textColor?: string;
}) {
  return (
    <View style={[styles.contextBadge, { backgroundColor: backgroundColor ?? TONE_TINTS[tone] }]}>
      <Text style={[styles.contextBadgeText, textColor ? { color: textColor } : null]}>{label}</Text>
    </View>
  );
}

function NavButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.navButton, disabled && styles.navButtonDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.navButtonText}>{label}</Text>
    </AnimatedPressable>
  );
}

function formatLongDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  heroCard: {
    overflow: 'hidden',
  },
  heroBand: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  heroBandRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  heroTitleBlock: {
    flex: 1,
    minWidth: 240,
  },
  heroEyebrow: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: 'rgba(255,255,255,0.76)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroDate: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.inverse,
  },
  heroTitle: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.title,
    color: COLORS.text.inverse,
  },
  heroSubtitle: {
    marginTop: SPACING.xs,
    ...TYPOGRAPHY_V2.plan.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  navControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
  },
  navButton: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.inverse,
  },
  heroBody: {
    gap: SPACING.sm,
    padding: SPACING.lg,
  },
  headline: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  summary: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
  },
  primaryCause: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.secondary,
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  contextBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  contextBadgeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.primary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickTile: {
    flexBasis: '31%',
    minWidth: 104,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  quickTileLabel: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
  },
  quickTileValue: {
    marginTop: 4,
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
});
