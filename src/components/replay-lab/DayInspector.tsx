import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { Card } from '../Card';
import { PillButton } from './primitives/PillButton';
import { OverviewTab } from './tabs/OverviewTab';
import { WorkoutTab } from './tabs/WorkoutTab';
import { FuelTab } from './tabs/FuelTab';
import { DecisionsTab } from './tabs/DecisionsTab';
import { formatPhase } from './helpers';
import { shared } from './styles';
import type { EngineReplayDay } from '../../../lib/engine/simulation/lab';
import type { ReplayTab } from './helpers';
import type { WorkoutStats } from './useReplayState';

interface DayInspectorProps {
  day: EngineReplayDay;
  tab: ReplayTab;
  onChangeTab: (tab: ReplayTab) => void;
  workoutStats: WorkoutStats;
}

const TABS: { key: ReplayTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'workout', label: 'Workout Log' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'decisions', label: 'Decisions' },
];

export function DayInspector({ day, tab, onChangeTab, workoutStats }: DayInspectorProps) {
  return (
    <>
      <Card title="Selected Day" subtitle={`${day.date} | ${formatPhase(day.cutPhase)} | ${day.exerciseLogs.length} exercise logs`}>
        <Text style={styles.headline}>{day.headline}</Text>
        <Text style={shared.bodyText}>{day.summary}</Text>

        {/* Recovery cluster */}
        <View style={styles.tagCluster}>
          <Text style={shared.tag}>Ready {day.readinessLogged}/10</Text>
          <Text style={shared.tag}>Sleep {day.sleepLogged}/10</Text>
          <Text style={shared.tag}>Risk {day.riskLevel}</Text>
        </View>

        {/* Session cluster */}
        <View style={styles.tagCluster}>
          <Text style={shared.tag}>ACWR {day.acwrRatio.toFixed(2)}</Text>
          <Text style={shared.tag}>Intervention {day.interventionState}</Text>
          <Text style={shared.tag}>Warm-up {day.didWarmup ? 'done' : 'missed'}</Text>
          <Text style={shared.tag}>{day.isMandatoryRecovery ? 'Mandatory recovery' : 'Training allowed'}</Text>
        </View>

        <View style={styles.tabRow} accessibilityRole="tablist">
          {TABS.map((t) => (
            <PillButton
              key={t.key}
              active={tab === t.key}
              label={t.label}
              onPress={() => onChangeTab(t.key)}
              accessibilityLabel={`${t.label} tab`}
            />
          ))}
        </View>
      </Card>

      {tab === 'overview' ? <OverviewTab day={day} /> : null}
      {tab === 'workout' ? <WorkoutTab day={day} workoutStats={workoutStats} /> : null}
      {tab === 'fuel' ? <FuelTab day={day} /> : null}
      {tab === 'decisions' ? <DecisionsTab day={day} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  headline: {
    ...TYPOGRAPHY_V2.plan.headline,
    color: COLORS.text.primary,
  },
  tagCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
});
