import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, CartesianChart, Line } from 'victory-native';

import {
  ENGINE_REPLAY_SCENARIOS,
  buildEngineReplayRun,
  type EngineReplayDay,
  type EngineReplayExerciseLog,
  type EngineReplayFinding,
  type EngineReplayRun,
} from '../../lib/engine/simulation/lab.ts';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

interface EngineReplayLabProps {
  visible: boolean;
  onClose: () => void;
}

type ReplayTab = 'overview' | 'workout' | 'fuel' | 'decisions';

function formatPhase(value: string) {
  return value.replace(/[-_]/g, ' ');
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function severityColors(severity: EngineReplayFinding['severity']) {
  if (severity === 'danger') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (severity === 'warning') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.surfaceSecondary, fg: COLORS.text.secondary };
}

function riskColors(level: EngineReplayDay['riskLevel']) {
  if (level === 'critical') return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
  if (level === 'high') return { bg: '#FDE8E8', fg: COLORS.error };
  if (level === 'moderate') return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
  return { bg: COLORS.readiness.primeLight, fg: COLORS.readiness.prime };
}

function chunkWeeks(days: EngineReplayDay[]) {
  const weeks: Array<{ index: number; days: EngineReplayDay[] }> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({ index: weeks.length, days: days.slice(i, i + 7) });
  }
  return weeks;
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ScenarioButton({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.scenarioButton, selected && styles.scenarioButtonSelected]}>
      <Text style={[styles.scenarioTitle, selected && styles.scenarioTitleSelected]}>{label}</Text>
      <Text style={styles.scenarioDescription}>{description}</Text>
    </AnimatedPressable>
  );
}

function SignalChart({
  title,
  subtitle,
  data,
  yKey,
  color,
}: {
  title: string;
  subtitle: string;
  data: EngineReplayRun['chartData'];
  yKey: 'readiness' | 'weight';
  color: string;
}) {
  if (data.length < 2) return null;

  return (
    <Card>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={[yKey]} domainPadding={{ left: 12, right: 18, top: 12 }}>
          {({ points }) => <Line points={points[yKey]} color={color} strokeWidth={2.5} curveType="natural" />}
        </CartesianChart>
      </View>
    </Card>
  );
}

function CaloriesChart({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length < 2) return null;

  return (
    <Card>
      <Text style={styles.sectionTitle}>Calories</Text>
      <Text style={styles.sectionSubtitle}>Actual intake vs prescribed target</Text>
      <View style={styles.chartArea}>
        <CartesianChart data={data as any[]} xKey="x" yKeys={['actualCalories', 'prescribedCalories']} domainPadding={{ left: 12, right: 18, top: 16 }}>
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.actualCalories}
                chartBounds={chartBounds}
                color={COLORS.chart.accent}
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                barWidth={8}
              />
              <Line points={points.prescribedCalories} color={COLORS.chart.protein} strokeWidth={2} curveType="natural" />
            </>
          )}
        </CartesianChart>
      </View>
    </Card>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function ExerciseLogRow({ entry }: { entry: EngineReplayExerciseLog }) {
  return (
    <View style={styles.exerciseRow}>
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseHeaderBody}>
          <Text style={styles.exerciseName}>{entry.exerciseName}</Text>
          <Text style={styles.exerciseMeta}>{entry.sectionTitle ?? 'session'} | {entry.completed ? 'logged' : 'skipped'}</Text>
        </View>
        <Text style={[styles.exerciseStatus, !entry.completed && styles.exerciseStatusMiss]}>{entry.completed ? 'Logged' : 'Skipped'}</Text>
      </View>
      <Text style={styles.bodyText}>Planned {entry.targetSets} x {entry.targetReps} @ RPE {entry.targetRpe}</Text>
      <Text style={styles.bodyText}>
        Logged {entry.completedSets} x {entry.actualReps}
        {entry.actualRpe != null ? ` @ RPE ${entry.actualRpe}` : ''}
        {entry.actualWeight != null ? ` | ${entry.actualWeight} lb` : entry.suggestedWeight != null ? ` | target ${entry.suggestedWeight} lb` : ''}
      </Text>
      <Text style={styles.detailText}>{entry.note}</Text>
    </View>
  );
}

export function EngineReplayLab({ visible, onClose }: EngineReplayLabProps) {
  const insets = useSafeAreaInsets();
  const [scenarioId, setScenarioId] = useState(ENGINE_REPLAY_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<EngineReplayRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [tab, setTab] = useState<ReplayTab>('overview');

  async function executeReplay(nextScenarioId: string) {
    setLoading(true);
    setError(null);
    setRun(null);
    setSelectedDayIndex(0);
    setTab('overview');

    try {
      const nextRun = await buildEngineReplayRun(nextScenarioId);
      setRun(nextRun);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Replay failed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (visible) void executeReplay(scenarioId);
  }, [visible]);

  const selectedDay = run?.days[selectedDayIndex] ?? null;
  const weeks = useMemo(() => chunkWeeks(run?.days ?? []), [run]);
  const selectedWeekIndex = selectedDay ? Math.floor(selectedDay.index / 7) : 0;
  const selectedWeek = weeks[selectedWeekIndex] ?? null;

  function jumpDay(delta: number) {
    if (!run) return;
    setSelectedDayIndex((current) => Math.max(0, Math.min(run.days.length - 1, current + delta)));
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>INTERNAL LAB</Text>
            <Text style={styles.title}>Engine Replay Lab</Text>
            <Text style={styles.subtitle}>Block replay with simulated workout logging and a cleaner week/day browser.</Text>
          </View>
          <AnimatedPressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </AnimatedPressable>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]} showsVerticalScrollIndicator={false}>
          <Card title="Scenario">
            <View style={styles.listGap}>
              {ENGINE_REPLAY_SCENARIOS.map((scenario) => (
                <ScenarioButton
                  key={scenario.id}
                  selected={scenario.id === scenarioId}
                  label={scenario.label}
                  description={scenario.description}
                  onPress={() => setScenarioId(scenario.id)}
                />
              ))}
            </View>
            <AnimatedPressable style={styles.runButton} onPress={() => void executeReplay(scenarioId)}>
              <Text style={styles.runButtonText}>{loading ? 'Running...' : 'Run Replay'}</Text>
            </AnimatedPressable>
          </Card>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.bodyText}>Clearing the old replay and simulating the new block...</Text>
            </View>
          ) : null}

          {error ? (
            <Card>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}

          {run && selectedDay ? (
            <>
              <Card title="Run Summary" subtitle={`${run.scenario.label} | seed ${run.scenario.config.seed ?? 42}`}>
                <View style={styles.metricGrid}>
                  <MetricTile label="Days" value={String(run.summary.totalDays)} />
                  <MetricTile label="Final Weight" value={`${run.summary.finalWeightLbs.toFixed(1)} lbs`} />
                  <MetricTile label="Interventions" value={String(run.summary.interventionDays)} />
                  <MetricTile label="Danger Findings" value={String(run.summary.findingCounts.danger)} />
                </View>
              </Card>

              <SignalChart title="Readiness" subtitle="Subjective readiness across the block" data={run.chartData} yKey="readiness" color={COLORS.chart.readiness} />
              <SignalChart title="Body Weight" subtitle="End-of-day weight across the block" data={run.chartData} yKey="weight" color={COLORS.chart.fitness} />
              <CaloriesChart data={run.chartData} />

              <Card title="Replay Browser" subtitle="Pick a week, then inspect the days inside that week.">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {weeks.map((week) => (
                    <AnimatedPressable
                      key={`week-${week.index}`}
                      onPress={() => setSelectedDayIndex(week.days[0]?.index ?? 0)}
                      style={[styles.weekButton, week.index === selectedWeekIndex && styles.weekButtonActive]}
                    >
                      <Text style={[styles.weekButtonTitle, week.index === selectedWeekIndex && styles.weekButtonTitleActive]}>Week {week.index + 1}</Text>
                      <Text style={styles.weekButtonDate}>{formatDate(week.days[0].date)} - {formatDate(week.days[week.days.length - 1].date)}</Text>
                    </AnimatedPressable>
                  ))}
                </ScrollView>

                <View style={styles.dayNavRow}>
                  <AnimatedPressable
                    onPress={() => jumpDay(-1)}
                    disabled={selectedDayIndex === 0}
                    style={[styles.navButton, selectedDayIndex === 0 && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>Previous</Text>
                  </AnimatedPressable>
                  <View style={styles.dayNavCenter}>
                    <Text style={styles.dayNavTitle}>{formatDate(selectedDay.date)}</Text>
                    <Text style={styles.dayNavSubtitle}>{formatPhase(selectedDay.phase)} | {formatPhase(selectedDay.sessionRole)}</Text>
                  </View>
                  <AnimatedPressable
                    onPress={() => jumpDay(1)}
                    disabled={selectedDayIndex === run.days.length - 1}
                    style={[styles.navButton, selectedDayIndex === run.days.length - 1 && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>Next</Text>
                  </AnimatedPressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalRow}>
                  {selectedWeek?.days.map((day) => {
                    const risk = riskColors(day.riskLevel);
                    const active = day.index === selectedDayIndex;

                    return (
                      <AnimatedPressable key={`day-${day.index}`} onPress={() => setSelectedDayIndex(day.index)} style={[styles.dayButton, active && styles.dayButtonActive]}>
                        <Text style={[styles.dayButtonDate, active && styles.dayButtonDateActive]}>{formatDate(day.date)}</Text>
                        <Text style={styles.dayButtonRole} numberOfLines={1}>{formatPhase(day.sessionRole)}</Text>
                        <View style={[styles.riskChip, { backgroundColor: risk.bg }]}>
                          <Text style={[styles.riskChipText, { color: risk.fg }]}>{day.riskLevel}</Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </ScrollView>
              </Card>

              <Card title="Selected Day" subtitle={`${selectedDay.date} | ${formatPhase(selectedDay.cutPhase)} | ${selectedDay.exerciseLogs.length} exercise logs`}>
                <Text style={styles.dayHeadline}>{selectedDay.headline}</Text>
                <Text style={styles.bodyText}>{selectedDay.summary}</Text>
                <View style={styles.tagRow}>
                  <Text style={styles.tag}>Ready {selectedDay.readinessLogged}/10</Text>
                  <Text style={styles.tag}>Sleep {selectedDay.sleepLogged}/10</Text>
                  <Text style={styles.tag}>ACWR {selectedDay.acwrRatio.toFixed(2)}</Text>
                  <Text style={styles.tag}>Warm-up {selectedDay.didWarmup ? 'done' : 'missed'}</Text>
                </View>
                <View style={styles.tagRow}>
                  <Text style={styles.tag}>Risk {selectedDay.riskLevel}</Text>
                  <Text style={styles.tag}>Intervention {selectedDay.interventionState}</Text>
                  <Text style={styles.tag}>{selectedDay.isMandatoryRecovery ? 'Mandatory recovery' : 'Training allowed'}</Text>
                </View>
                <View style={styles.tabRow}>
                  <TabButton active={tab === 'overview'} label="Overview" onPress={() => setTab('overview')} />
                  <TabButton active={tab === 'workout'} label="Workout Log" onPress={() => setTab('workout')} />
                  <TabButton active={tab === 'fuel'} label="Fuel" onPress={() => setTab('fuel')} />
                  <TabButton active={tab === 'decisions'} label="Decisions" onPress={() => setTab('decisions')} />
                </View>
              </Card>

              {tab === 'overview' ? (
                <>
                  <Card title="Findings" subtitle="Invariant checks and notable engine conditions for this day.">
                    {selectedDay.findings.length > 0 ? (
                      <View style={styles.listGap}>
                        {selectedDay.findings.map((finding, index) => {
                          const colors = severityColors(finding.severity);

                          return (
                            <View key={`${finding.severity}-${finding.title}-${index}`} style={styles.findingRow}>
                              <View style={[styles.findingBadge, { backgroundColor: colors.bg }]}>
                                <Text style={[styles.findingBadgeText, { color: colors.fg }]}>{finding.title}</Text>
                              </View>
                              <Text style={styles.detailText}>{finding.detail}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : <Text style={styles.bodyText}>No findings on this day.</Text>}
                  </Card>

                  <Card title="Session Summary" subtitle={selectedDay.workoutTitle}>
                    <View style={styles.metricGrid}>
                      <MetricTile label="Prescribed Load" value={selectedDay.prescribedLoad.toFixed(0)} />
                      <MetricTile label="Actual Load" value={selectedDay.actualLoad.toFixed(0)} />
                      <MetricTile label="Start Weight" value={`${selectedDay.bodyWeightStart.toFixed(1)} lbs`} />
                      <MetricTile label="End Weight" value={`${selectedDay.bodyWeightEnd.toFixed(1)} lbs`} />
                    </View>
                    <Text style={styles.bodyText}>{selectedDay.workoutBlueprint}</Text>
                  </Card>
                </>
              ) : null}

              {tab === 'workout' ? (
                <>
                  <Card title="Prescription Preview" subtitle={selectedDay.workoutType ?? 'untyped session'}>
                    {selectedDay.prescriptionPreview.length > 0
                      ? selectedDay.prescriptionPreview.map((item, index) => <Text key={`${item}-${index}`} style={styles.bodyText}>- {item}</Text>)
                      : <Text style={styles.bodyText}>No exercise prescription was generated for this day.</Text>}
                  </Card>
                  <Card title="Simulated Workout Log" subtitle="Exercise-by-exercise output from the simulated athlete.">
                    {selectedDay.exerciseLogs.length > 0
                      ? selectedDay.exerciseLogs.map((entry, index) => (
                        <ExerciseLogRow key={`${entry.exerciseId}-${entry.sectionTitle ?? 'section'}-${index}`} entry={entry} />
                      ))
                      : <Text style={styles.bodyText}>No exercise-level simulated log exists for this day.</Text>}
                  </Card>
                </>
              ) : null}

              {tab === 'fuel' ? (
                <Card title="Nutrition & Hydration" subtitle="Prescribed targets vs simulated actual intake.">
                  <View style={styles.metricGrid}>
                    <MetricTile label="Prescribed" value={`${selectedDay.prescribedCalories} kcal`} />
                    <MetricTile label="Actual" value={`${selectedDay.actualCalories} kcal`} />
                    <MetricTile label="Water" value={`${selectedDay.waterTargetOz} oz`} />
                    <MetricTile label="Sodium" value={selectedDay.sodiumTargetMg != null ? `${selectedDay.sodiumTargetMg} mg` : '--'} />
                  </View>
                  <View style={styles.metricGrid}>
                    <MetricTile label="Protein" value={`${selectedDay.actualProtein} / ${selectedDay.prescribedProtein}g`} />
                    <MetricTile label="Carbs" value={`${selectedDay.actualCarbs} / ${selectedDay.prescribedCarbs}g`} />
                    <MetricTile label="Fat" value={`${selectedDay.actualFat} / ${selectedDay.prescribedFat}g`} />
                    <MetricTile label="Cut Phase" value={formatPhase(selectedDay.cutPhase)} />
                  </View>
                </Card>
              ) : null}

              {tab === 'decisions' ? (
                <>
                  <Card title="Decision Trace" subtitle="Why the engine prescribed this day the way it did.">
                    {selectedDay.decisionReasons.length > 0
                      ? selectedDay.decisionReasons.map((reason, index) => (
                        <View key={`${reason.subsystem}-${reason.title}-${index}`} style={styles.reasonRow}>
                          <Text style={styles.reasonTitle}>{reason.title}</Text>
                          <Text style={styles.detailText}>{reason.sentence}</Text>
                        </View>
                      ))
                      : <Text style={styles.bodyText}>No decision reasons were captured for this day.</Text>}
                  </Card>
                  <Card title="Narrative Notes" subtitle="Simulated coach and athlete perspective.">
                    <Text style={styles.noteLabel}>Coach</Text>
                    <Text style={styles.bodyText}>{selectedDay.coachingInsight || 'No coaching note generated.'}</Text>
                    <Text style={[styles.noteLabel, styles.noteLabelSpacing]}>Athlete</Text>
                    <Text style={styles.bodyText}>{selectedDay.athleteMonologue || 'No athlete monologue generated.'}</Text>
                  </Card>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  headerBody: { flex: 1 },
  eyebrow: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, letterSpacing: 1 },
  title: { fontSize: 28, fontFamily: FONT_FAMILY.black, color: COLORS.text.primary },
  subtitle: { fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20, marginTop: SPACING.xs },
  closeButton: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  closeText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  content: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  listGap: { gap: SPACING.sm },
  scenarioButton: { borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  scenarioButtonSelected: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  scenarioTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  scenarioTitleSelected: { color: COLORS.accent },
  scenarioDescription: { marginTop: SPACING.xs, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  runButton: { marginTop: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.accent, alignItems: 'center', paddingVertical: SPACING.md },
  runButtonText: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.inverse },
  loadingWrap: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.lg },
  errorText: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.depleted },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  metricTile: { flexBasis: '48%', backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md },
  metricLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase' },
  metricValue: { marginTop: SPACING.xs, fontSize: 18, fontFamily: FONT_FAMILY.extraBold, color: COLORS.text.primary },
  sectionTitle: { fontSize: 15, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  sectionSubtitle: { marginTop: SPACING.xs, marginBottom: SPACING.sm, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  chartArea: { height: 180 },
  horizontalRow: { gap: SPACING.sm },
  weekButton: { minWidth: 136, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  weekButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  weekButtonTitle: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  weekButtonTitleActive: { color: COLORS.accent },
  weekButtonDate: { marginTop: 4, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  dayNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginVertical: SPACING.md },
  navButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  navButtonDisabled: { opacity: 0.45 },
  navButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayNavCenter: { flex: 1, alignItems: 'center' },
  dayNavTitle: { fontSize: 16, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayNavSubtitle: { marginTop: 4, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  dayButton: { width: 120, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary, padding: SPACING.md },
  dayButtonActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  dayButtonDate: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  dayButtonDateActive: { color: COLORS.accent },
  dayButtonRole: { marginTop: 6, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary },
  riskChip: { alignSelf: 'flex-start', marginTop: SPACING.sm, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  riskChipText: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase' },
  dayHeadline: { fontSize: 18, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  bodyText: { marginTop: SPACING.sm, fontSize: 13, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 20 },
  detailText: { marginTop: 4, fontSize: 12, fontFamily: FONT_FAMILY.regular, color: COLORS.text.secondary, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm },
  tag: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.secondary, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  tabButton: { borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceSecondary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tabButtonActive: { backgroundColor: COLORS.accent },
  tabButtonText: { fontSize: 12, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  tabButtonTextActive: { color: COLORS.text.inverse },
  findingRow: { gap: SPACING.xs },
  findingBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  findingBadgeText: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, textTransform: 'uppercase' },
  exerciseRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight, paddingBottom: SPACING.md, marginBottom: SPACING.md },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm, alignItems: 'flex-start' },
  exerciseHeaderBody: { flex: 1 },
  exerciseName: { fontSize: 14, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
  exerciseMeta: { marginTop: 4, fontSize: 11, fontFamily: FONT_FAMILY.regular, color: COLORS.text.tertiary },
  exerciseStatus: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: COLORS.readiness.prime, textTransform: 'uppercase' },
  exerciseStatusMiss: { color: COLORS.readiness.depleted },
  noteLabel: { fontSize: 11, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteLabelSpacing: { marginTop: SPACING.md },
  reasonRow: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderLight },
  reasonTitle: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: COLORS.text.primary },
});
