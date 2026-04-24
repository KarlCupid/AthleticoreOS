import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { ENGINE_REPLAY_SCENARIOS } from '../../../lib/engine/simulation/lab';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY_V2 } from '../../theme/theme';
import { AnimatedPressable } from '../AnimatedPressable';
import { Card } from '../Card';
import { MetricTile } from './primitives/MetricTile';
import { ScenarioButton } from './primitives/ScenarioButton';
import { ReplayCharts } from './ReplayCharts';
import { ReplayBrowser } from './ReplayBrowser';
import { DayInspector } from './DayInspector';
import { useReplayState } from './useReplayState';
import { shared } from './styles';

interface EngineReplayLabProps {
  visible: boolean;
  onClose: () => void;
}

export function EngineReplayLab({ visible, onClose }: EngineReplayLabProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();
  const state = useReplayState(visible);
  const wideLayout = width >= 1100;

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>INTERNAL LAB</Text>
            <Text style={styles.title}>Engine Replay Lab</Text>
            <Text style={styles.subtitle}>Block replay with simulated workout logging and a cleaner week/day browser.</Text>
          </View>
          <AnimatedPressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close replay lab"
          >
            <Text style={styles.closeText}>Close</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]} showsVerticalScrollIndicator={false}>
          {/* Scenario picker */}
          <Card title="Scenario">
            <View style={shared.listGap}>
              {ENGINE_REPLAY_SCENARIOS.map((scenario) => (
                <ScenarioButton
                  key={scenario.id}
                  selected={scenario.id === state.scenarioId}
                  label={scenario.label}
                  description={scenario.description}
                  onPress={() => state.setScenarioId(scenario.id)}
                />
              ))}
            </View>
            <AnimatedPressable
              style={styles.runButton}
              onPress={() => void state.executeReplay(state.scenarioId)}
              accessibilityRole="button"
              accessibilityLabel={state.loading ? 'Running replay' : 'Run replay'}
            >
              <Text style={styles.runButtonText}>{state.loading ? 'Running...' : 'Run Replay'}</Text>
            </AnimatedPressable>
          </Card>

          {/* Loading skeleton */}
          {state.loading ? (
            <View style={styles.skeleton} accessibilityLiveRegion="polite" accessibilityLabel="Loading replay">
              <View style={styles.skeletonBar} />
              <View style={styles.skeletonBarShort} />
              <View style={styles.skeletonChart} />
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonTile} />
                <View style={styles.skeletonTile} />
              </View>
            </View>
          ) : null}

          {/* Error state */}
          {state.error ? (
            <Card>
              <Text style={styles.errorText} accessibilityLiveRegion="assertive">{state.error}</Text>
              <AnimatedPressable
                style={styles.retryButton}
                onPress={() => void state.executeReplay(state.scenarioId)}
                accessibilityRole="button"
                accessibilityLabel="Retry replay"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </AnimatedPressable>
            </Card>
          ) : null}

          {/* Run content */}
          {state.run && state.selectedDay ? (
            <>
              <Card title="Run Summary" subtitle={`${state.run.scenario.label} | seed ${state.run.scenario.config.seed ?? 42}`}>
                <View style={shared.metricGrid}>
                  <MetricTile label="Days" value={String(state.run.summary.totalDays)} />
                  <MetricTile label="Final Weight" value={`${state.run.summary.finalWeightLbs.toFixed(1)} lbs`} />
                  <MetricTile label="Interventions" value={String(state.run.summary.interventionDays)} tone={state.run.summary.interventionDays > 0 ? 'warning' : 'default'} />
                  <MetricTile label="Engine Danger Days" value={String(state.run.summary.engineDangerDays)} tone={state.run.summary.engineDangerDays > 0 ? 'danger' : 'good'} />
                  <MetricTile label="Athlete Override Days" value={String(state.run.summary.athleteOverrideDays)} tone={state.run.summary.athleteOverrideDays > 0 ? 'warning' : 'good'} />
                  <MetricTile label="Scenario Pressure Days" value={String(state.run.summary.scenarioPressureDays)} tone={state.run.summary.scenarioPressureDays > 0 ? 'warning' : 'good'} />
                </View>
              </Card>

              <View style={[styles.workspace, wideLayout ? styles.workspaceWide : styles.workspaceStacked]}>
                <View style={[styles.railColumn, wideLayout && styles.railColumnWide]}>
                  <ReplayBrowser
                    weeks={state.railWeeks}
                    selectedDayIndex={state.selectedDayIndex}
                    expandedWeekIndex={state.expandedWeekIndex}
                    onSelectDay={state.selectDay}
                    onExpandWeek={state.setExpandedWeekIndex}
                  />
                </View>

                <View style={[styles.detailColumn, !wideLayout && styles.detailColumnStacked]}>
                  <DayInspector
                    day={state.selectedDay}
                    workoutStats={state.workoutStats}
                    quickStats={state.quickStats}
                    onJumpDay={state.jumpDay}
                    canGoPrevious={state.selectedDayIndex > 0}
                    canGoNext={state.selectedDayIndex < state.run.days.length - 1}
                  />
                </View>
              </View>

              <ReplayCharts
                chartData={state.chartWindowData}
                chartWindowSize={state.chartWindowSize}
                onChangeWindowSize={state.setChartZoom}
              />
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerBody: { flex: 1 },
  eyebrow: {
    ...TYPOGRAPHY_V2.plan.caption,
    color: COLORS.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    ...TYPOGRAPHY_V2.plan.title,
    color: COLORS.text.primary,
  },
  subtitle: {
    ...TYPOGRAPHY_V2.plan.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  closeButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    ...TYPOGRAPHY_V2.plan.caption,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  workspace: {
    gap: SPACING.md,
    alignItems: 'flex-start',
  },
  workspaceStacked: {
    flexDirection: 'column',
  },
  workspaceWide: {
    flexDirection: 'row',
  },
  railColumn: {
    width: '100%',
  },
  railColumnWide: {
    width: 348,
    flexShrink: 0,
  },
  detailColumn: {
    flex: 1,
    gap: SPACING.md,
  },
  detailColumnStacked: {
    width: '100%',
  },
  runButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  runButtonText: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.inverse,
  },

  // Skeleton loading
  skeleton: {
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  skeletonBar: {
    height: 16,
    width: '60%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  skeletonBarShort: {
    height: 12,
    width: '40%',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
  },
  skeletonChart: {
    height: 180,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  skeletonTile: {
    flex: 1,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
  },

  // Error state
  errorText: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.readiness.depleted,
  },
  retryButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    ...TYPOGRAPHY_V2.plan.body,
    fontWeight: '600',
    color: COLORS.text.inverse,
  },
});
