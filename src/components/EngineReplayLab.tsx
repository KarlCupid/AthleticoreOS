import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bar, CartesianChart, Line } from 'victory-native';

import {
  ENGINE_REPLAY_SCENARIOS,
  buildEngineReplayRun,
  type EngineReplayDay,
  type EngineReplayFinding,
  type EngineReplayRun,
} from '../../lib/engine/simulation/lab.ts';
import { calculateCaloriesFromMacros } from '../../lib/utils/nutrition';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { COLORS, FONT_FAMILY, RADIUS, SPACING } from '../theme/theme';

interface EngineReplayLabProps {
  visible: boolean;
  onClose: () => void;
}

function getSeverityColors(severity: EngineReplayFinding['severity']) {
  switch (severity) {
    case 'danger':
      return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
    case 'warning':
      return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
    default:
      return { bg: COLORS.surfaceSecondary, fg: COLORS.text.secondary };
  }
}

function getRiskColors(level: EngineReplayDay['riskLevel']) {
  switch (level) {
    case 'critical':
      return { bg: COLORS.readiness.depletedLight, fg: COLORS.readiness.depleted };
    case 'high':
      return { bg: '#FDE8E8', fg: COLORS.error };
    case 'moderate':
      return { bg: COLORS.readiness.cautionLight, fg: COLORS.readiness.caution };
    default:
      return { bg: COLORS.readiness.primeLight, fg: COLORS.readiness.prime };
  }
}

function formatSessionRole(value: string) {
  return value.replace(/_/g, ' ');
}

function formatPhase(value: string) {
  return value.replace(/-/g, ' ');
}

function MetricTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'danger' | 'accent' }) {
  const valueColor = tone === 'danger'
    ? COLORS.readiness.depleted
    : tone === 'accent'
      ? COLORS.accent
      : COLORS.text.primary;

  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function ScenarioButton({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.scenarioButton,
        selected && styles.scenarioButtonSelected,
      ]}
    >
      <Text style={[styles.scenarioLabel, selected && styles.scenarioLabelSelected]}>{label}</Text>
      <Text style={[styles.scenarioDescription, selected && styles.scenarioDescriptionSelected]}>
        {description}
      </Text>
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
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      <View style={styles.chartArea}>
        <CartesianChart
          data={data as any[]}
          xKey="x"
          yKeys={[yKey]}
          domainPadding={{ left: 12, right: 18, top: 12 }}
        >
          {({ points }) => (
            <Line
              points={points[yKey]}
              color={color}
              strokeWidth={2.5}
              curveType="natural"
            />
          )}
        </CartesianChart>
      </View>
    </Card>
  );
}

function CaloriesChart({ data }: { data: EngineReplayRun['chartData'] }) {
  if (data.length < 2) return null;

  return (
    <Card style={styles.chartCard}>
      <Text style={styles.chartTitle}>Calories</Text>
      <Text style={styles.chartSubtitle}>Actual intake vs prescribed target across the block</Text>
      <View style={styles.chartArea}>
        <CartesianChart
          data={data as any[]}
          xKey="x"
          yKeys={['actualCalories', 'prescribedCalories']}
          domainPadding={{ left: 12, right: 18, top: 16 }}
        >
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.actualCalories}
                chartBounds={chartBounds}
                color={COLORS.chart.accent}
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                barWidth={8}
              />
              <Line
                points={points.prescribedCalories}
                color={COLORS.chart.protein}
                strokeWidth={2}
                curveType="natural"
              />
            </>
          )}
        </CartesianChart>
      </View>
    </Card>
  );
}

function FindingChip({ finding }: { finding: EngineReplayFinding }) {
  const colors = getSeverityColors(finding.severity);
  return (
    <View style={[styles.findingChip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.findingChipText, { color: colors.fg }]}>{finding.title}</Text>
    </View>
  );
}

function DayCard({
  day,
  selected,
  onPress,
}: {
  day: EngineReplayDay;
  selected: boolean;
  onPress: () => void;
}) {
  const risk = getRiskColors(day.riskLevel);
  return (
    <AnimatedPressable
      onPress={onPress}
      style={[styles.dayCard, selected && styles.dayCardSelected]}
    >
      <View style={styles.dayCardTopRow}>
        <Text style={styles.dayCardDate}>{day.date}</Text>
        <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
          <Text style={[styles.riskBadgeText, { color: risk.fg }]}>{day.riskLevel}</Text>
        </View>
      </View>
      <Text style={styles.dayCardHeadline} numberOfLines={2}>{day.headline}</Text>
      <Text style={styles.dayCardMeta}>
        {formatPhase(day.phase)} · {formatSessionRole(day.sessionRole)}
      </Text>
      <Text style={styles.dayCardMeta}>
        Ready {day.readinessLogged}/10 · {day.prescribedCalories} kcal
      </Text>
      {day.findings.length > 0 ? (
        <Text style={styles.dayCardFindingCount}>{day.findings.length} finding{day.findings.length === 1 ? '' : 's'}</Text>
      ) : (
        <Text style={styles.dayCardFindingClear}>No findings</Text>
      )}
    </AnimatedPressable>
  );
}

export function EngineReplayLab({ visible, onClose }: EngineReplayLabProps) {
  const insets = useSafeAreaInsets();
  const [scenarioId, setScenarioId] = useState(ENGINE_REPLAY_SCENARIOS[0]?.id ?? '');
  const [run, setRun] = useState<EngineReplayRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  async function executeReplay(nextScenarioId: string) {
    setLoading(true);
    setError(null);
    try {
      const nextRun = await buildEngineReplayRun(nextScenarioId);
      setRun(nextRun);
      setSelectedDayIndex(0);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Replay failed.');
      setRun(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!visible) return;
    void executeReplay(scenarioId);
  }, [visible]);

  const selectedDay = useMemo(() => {
    if (!run) return null;
    return run.days[selectedDayIndex] ?? run.days[0] ?? null;
  }, [run, selectedDayIndex]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>INTERNAL LAB</Text>
            <Text style={styles.title}>Engine Replay Lab</Text>
            <Text style={styles.subtitle}>
              Deterministic block simulation for training, nutrition, cut, and decision-trace inspection.
            </Text>
          </View>
          <AnimatedPressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </AnimatedPressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <Card title="Scenario">
            <View style={styles.scenarioList}>
              {ENGINE_REPLAY_SCENARIOS.map((scenario) => (
                <ScenarioButton
                  key={scenario.id}
                  label={scenario.label}
                  description={scenario.description}
                  selected={scenario.id === scenarioId}
                  onPress={() => setScenarioId(scenario.id)}
                />
              ))}
            </View>

            <AnimatedPressable
              style={styles.runButton}
              onPress={() => void executeReplay(scenarioId)}
            >
              <Text style={styles.runButtonText}>{loading ? 'Running...' : 'Run Replay'}</Text>
            </AnimatedPressable>
          </Card>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={COLORS.accent} />
              <Text style={styles.loadingText}>Simulating the full block...</Text>
            </View>
          ) : null}

          {error ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorTitle}>Replay failed</Text>
              <Text style={styles.errorText}>{error}</Text>
            </Card>
          ) : null}

          {run ? (
            <>
              <Card title="Run Summary" subtitle={`${run.scenario.label} · seed ${run.scenario.config.seed ?? 42}`}>
                <View style={styles.metricGrid}>
                  <MetricTile label="Days" value={String(run.summary.totalDays)} />
                  <MetricTile label="Final Weight" value={`${run.summary.finalWeightLbs.toFixed(1)} lbs`} />
                  <MetricTile label="Interventions" value={String(run.summary.interventionDays)} tone="accent" />
                  <MetricTile
                    label="Danger Findings"
                    value={String(run.summary.findingCounts.danger)}
                    tone={run.summary.findingCounts.danger > 0 ? 'danger' : 'default'}
                  />
                </View>
                <View style={styles.metricGrid}>
                  <MetricTile label="Avg Readiness" value={`${run.summary.avgReadiness}/10`} />
                  <MetricTile label="Weight Change" value={`${run.summary.weightChangeLbs.toFixed(1)} lbs`} />
                  <MetricTile label="Mandatory Recovery" value={String(run.summary.mandatoryRecoveryDays)} />
                  <MetricTile label="High Risk Days" value={String(run.summary.highRiskDays)} />
                </View>
              </Card>

              <SignalChart
                title="Readiness"
                subtitle="Subjective readiness logged across the block"
                data={run.chartData}
                yKey="readiness"
                color={COLORS.chart.readiness}
              />
              <SignalChart
                title="Body Weight"
                subtitle="End-of-day body weight across the block"
                data={run.chartData}
                yKey="weight"
                color={COLORS.chart.fitness}
              />
              <CaloriesChart data={run.chartData} />

              <Card title="Day Timeline" subtitle="Tap a day to inspect the exact prescription and reasoning.">
                <View style={styles.dayCardList}>
                  {run.days.map((day, index) => (
                    <DayCard
                      key={day.date}
                      day={day}
                      selected={selectedDayIndex === index}
                      onPress={() => setSelectedDayIndex(index)}
                    />
                  ))}
                </View>
              </Card>

              {selectedDay ? (
                <>
                  <Card title={selectedDay.headline} subtitle={`${selectedDay.date} · ${formatPhase(selectedDay.phase)} · ${formatSessionRole(selectedDay.sessionRole)}`}>
                    <Text style={styles.selectedSummary}>{selectedDay.summary}</Text>
                    <View style={styles.selectedMetaRow}>
                      <Text style={styles.selectedMetaText}>Readiness {selectedDay.readinessLogged}/10</Text>
                      <Text style={styles.selectedMetaText}>Sleep {selectedDay.sleepLogged}/10</Text>
                      <Text style={styles.selectedMetaText}>ACWR {selectedDay.acwrRatio.toFixed(2)}</Text>
                    </View>
                    <View style={styles.selectedMetaRow}>
                      <Text style={styles.selectedMetaText}>Risk {selectedDay.riskLevel}</Text>
                      <Text style={styles.selectedMetaText}>Intervention {selectedDay.interventionState}</Text>
                      <Text style={styles.selectedMetaText}>
                        {selectedDay.isMandatoryRecovery ? 'Mandatory recovery' : 'Training allowed'}
                      </Text>
                    </View>
                  </Card>

                  <Card title="Findings" subtitle="Invariant checks and notable engine conditions for the selected day.">
                    {selectedDay.findings.length > 0 ? (
                      <View style={styles.findingList}>
                        {selectedDay.findings.map((finding) => (
                          <View key={`${finding.severity}-${finding.title}`} style={styles.findingRow}>
                            <FindingChip finding={finding} />
                            <Text style={styles.findingDetail}>{finding.detail}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No findings on this day.</Text>
                    )}
                  </Card>

                  <Card title="Training Prescription" subtitle={`${selectedDay.workoutTitle} · ${selectedDay.workoutType ?? 'untyped session'}`}>
                    <View style={styles.metricGrid}>
                      <MetricTile label="Prescribed Load" value={selectedDay.prescribedLoad.toFixed(0)} />
                      <MetricTile label="Actual Load" value={selectedDay.actualLoad.toFixed(0)} />
                      <MetricTile label="Start Weight" value={`${selectedDay.bodyWeightStart.toFixed(1)} lbs`} />
                      <MetricTile label="End Weight" value={`${selectedDay.bodyWeightEnd.toFixed(1)} lbs`} />
                    </View>

                    {selectedDay.prescriptionPreview.length > 0 ? (
                      <View style={styles.previewList}>
                        {selectedDay.prescriptionPreview.map((item) => (
                          <Text key={item} style={styles.previewItem}>• {item}</Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyText}>No detailed exercise list was generated for this day.</Text>
                    )}
                  </Card>

                  <Card title="Nutrition & Hydration" subtitle={`${selectedDay.cutPhase} · fuel and water targets vs simulated actuals`}>
                    <View style={styles.metricGrid}>
                      <MetricTile label="Prescribed" value={`${selectedDay.prescribedCalories} kcal`} />
                      <MetricTile label="Actual" value={`${selectedDay.actualCalories} kcal`} />
                      <MetricTile label="Water" value={`${selectedDay.waterTargetOz} oz`} />
                      <MetricTile label="Sodium" value={selectedDay.sodiumTargetMg != null ? `${selectedDay.sodiumTargetMg} mg` : '—'} />
                    </View>

                    <View style={styles.macroCompareBlock}>
                      <MacroRow
                        label="Protein"
                        prescribed={selectedDay.prescribedProtein}
                        actual={selectedDay.actualProtein}
                        color={COLORS.chart.protein}
                      />
                      <MacroRow
                        label="Carbs"
                        prescribed={selectedDay.prescribedCarbs}
                        actual={selectedDay.actualCarbs}
                        color={COLORS.chart.carbs}
                      />
                      <MacroRow
                        label="Fat"
                        prescribed={selectedDay.prescribedFat}
                        actual={selectedDay.actualFat}
                        color={COLORS.chart.fat}
                      />
                    </View>
                  </Card>

                  <Card title="Decision Trace" subtitle="Why the engine prescribed this day the way it did.">
                    {selectedDay.decisionReasons.length > 0 ? (
                      selectedDay.decisionReasons.map((reason) => (
                        <View key={`${reason.subsystem}-${reason.title}`} style={styles.reasonRow}>
                          <Text style={styles.reasonTitle}>{reason.title}</Text>
                          <Text style={styles.reasonSentence}>{reason.sentence}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>No decision reasons were captured for this day.</Text>
                    )}
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

function MacroRow({
  label,
  prescribed,
  actual,
  color,
}: {
  label: string;
  prescribed: number;
  actual: number;
  color: string;
}) {
  const delta = actual - prescribed;
  const deltaSign = delta > 0 ? '+' : '';
  const actualCalories = calculateCaloriesFromMacros(
    label === 'Protein' ? actual : 0,
    label === 'Carbs' ? actual : 0,
    label === 'Fat' ? actual : 0,
  );

  return (
    <View style={styles.macroRow}>
      <View style={styles.macroRowHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValues}>
          {prescribed}g prescribed · {actual}g actual · {deltaSign}{delta}g
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            {
              width: `${Math.min(100, Math.max(8, prescribed === 0 ? 0 : (actual / prescribed) * 100))}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.macroCaloriesNote}>
        {label === 'Protein' ? `${actualCalories} kcal from protein` : label === 'Carbs' ? `${actualCalories} kcal from carbs` : `${actualCalories} kcal from fat`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerCopy: {
    gap: SPACING.xs,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.black,
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  closeButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  closeButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  scenarioList: {
    gap: SPACING.sm,
  },
  scenarioButton: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  scenarioButtonSelected: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  scenarioLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  scenarioLabelSelected: {
    color: COLORS.accent,
  },
  scenarioDescription: {
    marginTop: SPACING.xs,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 18,
  },
  scenarioDescriptionSelected: {
    color: COLORS.text.primary,
  },
  runButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  runButtonText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.inverse,
  },
  loadingState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: COLORS.readiness.depleted,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.depleted,
  },
  errorText: {
    marginTop: SPACING.xs,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metricTile: {
    flexBasis: '48%',
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    marginTop: SPACING.xs,
    fontSize: 20,
    fontFamily: FONT_FAMILY.extraBold,
  },
  chartCard: {
    marginTop: SPACING.md,
  },
  chartTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  chartSubtitle: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  chartArea: {
    height: 180,
  },
  dayCardList: {
    gap: SPACING.sm,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceSecondary,
    padding: SPACING.md,
  },
  dayCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  dayCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dayCardDate: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.tertiary,
  },
  riskBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  riskBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    textTransform: 'uppercase',
  },
  dayCardHeadline: {
    marginTop: SPACING.sm,
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  dayCardMeta: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  dayCardFindingCount: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.caution,
  },
  dayCardFindingClear: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.readiness.prime,
  },
  selectedSummary: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 21,
  },
  selectedMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  selectedMetaText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.secondary,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  findingList: {
    gap: SPACING.sm,
  },
  findingRow: {
    gap: SPACING.xs,
  },
  findingChip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  findingChipText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.semiBold,
    textTransform: 'uppercase',
  },
  findingDetail: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  previewList: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  previewItem: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.primary,
  },
  macroCompareBlock: {
    marginTop: SPACING.sm,
    gap: SPACING.md,
  },
  macroRow: {
    gap: SPACING.xs,
  },
  macroRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  macroLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  macroValues: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
  macroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.borderLight,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroCaloriesNote: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.tertiary,
  },
  reasonRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  reasonTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.semiBold,
    color: COLORS.text.primary,
  },
  reasonSentence: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
    lineHeight: 19,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.regular,
    color: COLORS.text.secondary,
  },
});
