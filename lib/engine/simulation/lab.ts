import { calculateCaloriesFromMacros } from '../../utils/nutrition.ts';
import { getAllDecisionReasons } from '../presentation/decisionReason.ts';
import { TheBinger, TheGrinder, ThePerfectStudent, TheSlacker } from './personas.ts';
import { runSimulation } from './runner.ts';
import type {
  DailySimulationLog,
  SimulationConfig,
  SimulationResult,
} from './types.ts';

export type EngineReplayFindingSeverity = 'info' | 'warning' | 'danger';

export interface EngineReplayFinding {
  severity: EngineReplayFindingSeverity;
  subsystem: 'training' | 'nutrition' | 'recovery' | 'weight' | 'system';
  title: string;
  detail: string;
}

export interface EngineReplayDecisionReason {
  subsystem: string;
  title: string;
  sentence: string;
  impact: 'kept' | 'adjusted' | 'restricted' | 'escalated';
}

export interface EngineReplayExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sectionTitle: string | null;
  targetSets: number;
  completedSets: number;
  targetReps: number;
  actualReps: number;
  targetRpe: number;
  actualRpe: number | null;
  suggestedWeight: number | null;
  actualWeight: number | null;
  completed: boolean;
  note: string;
}

export interface EngineReplayDay {
  index: number;
  date: string;
  phase: string;
  cutPhase: string;
  readinessState: string;
  readinessLogged: number;
  sleepLogged: number;
  acwrRatio: number;
  riskLevel: string;
  riskScore: number;
  sessionRole: string;
  interventionState: string;
  isMandatoryRecovery: boolean;
  workoutType: string | null;
  workoutTitle: string;
  headline: string;
  summary: string;
  didWarmup: boolean;
  workoutBlueprint: string;
  coachingInsight: string;
  athleteMonologue: string;
  decisionReasons: EngineReplayDecisionReason[];
  prescriptionPreview: string[];
  exerciseLogs: EngineReplayExerciseLog[];
  prescribedCalories: number;
  actualCalories: number;
  prescribedProtein: number;
  prescribedCarbs: number;
  prescribedFat: number;
  actualProtein: number;
  actualCarbs: number;
  actualFat: number;
  waterTargetOz: number;
  sodiumTargetMg: number | null;
  bodyWeightStart: number;
  bodyWeightEnd: number;
  prescribedLoad: number;
  actualLoad: number;
  findings: EngineReplayFinding[];
}

export interface EngineReplayScenario {
  id: string;
  label: string;
  description: string;
  config: SimulationConfig;
}

export interface EngineReplayRun {
  scenario: EngineReplayScenario;
  days: EngineReplayDay[];
  chartData: Array<{
    x: number;
    label: string;
    readiness: number;
    acwr: number;
    weight: number;
    prescribedCalories: number;
    actualCalories: number;
    prescribedLoad: number;
    actualLoad: number;
  }>;
  summary: {
    totalDays: number;
    finalWeightLbs: number;
    weightChangeLbs: number;
    avgReadiness: number;
    interventionDays: number;
    mandatoryRecoveryDays: number;
    highRiskDays: number;
    findingCounts: Record<EngineReplayFindingSeverity, number>;
  };
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function buildFightCampConfig(input: {
  startDate: string;
  weeks: number;
  seed: number;
  targetWeight: number;
  persona: SimulationConfig['persona'];
  description?: string;
}): SimulationConfig {
  const { startDate, weeks, seed, targetWeight, persona } = input;
  return {
    startDate,
    weeks,
    seed,
    persona,
    initialState: {
      weightLbs: 185,
      fitnessLevel: 'advanced',
      goalMode: 'fight_camp',
      targetWeight,
      fightDate: addDays(startDate, weeks * 7),
    },
  };
}

export const ENGINE_REPLAY_SCENARIOS: EngineReplayScenario[] = [
  {
    id: 'build-baseline',
    label: 'Build Phase Baseline',
    description: 'Stable build block with clean compliance. Good for checking training and nutrition progression without cut pressure.',
    config: {
      startDate: '2026-01-05',
      weeks: 6,
      seed: 11,
      persona: ThePerfectStudent,
      initialState: {
        weightLbs: 185,
        fitnessLevel: 'advanced',
        goalMode: 'build_phase',
      },
    },
  },
  {
    id: 'camp-baseline',
    label: 'Fight Camp Baseline',
    description: 'Eight-week camp with consistent execution. Best baseline for reading engine prescription logic block by block.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 17,
      targetWeight: 170,
      persona: ThePerfectStudent,
    }),
  },
  {
    id: 'camp-active-cut',
    label: 'Camp Under Active Cut',
    description: 'Fight camp with a tighter cut and aggressive behavior. Useful for checking intervention logic, fueling, and cut protection.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 23,
      targetWeight: 168,
      persona: TheGrinder,
    }),
  },
  {
    id: 'stressed-low-compliance',
    label: 'Stressed Low-Compliance Block',
    description: 'Chaotic adherence and unstable recovery. Useful for validating whether the engine stays coherent when execution drifts.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 29,
      targetWeight: 170,
      persona: TheSlacker,
    }),
  },
  {
    id: 'nutrition-chaos',
    label: 'Nutrition Chaos',
    description: 'Training stays high while cheat days blow up intake. Use this to inspect calorie correction and nutrition drift.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 31,
      targetWeight: 170,
      persona: TheBinger,
    }),
  },
];

function severityRank(severity: EngineReplayFindingSeverity): number {
  switch (severity) {
    case 'danger':
      return 3;
    case 'warning':
      return 2;
    default:
      return 1;
  }
}

function buildFindings(log: DailySimulationLog): EngineReplayFinding[] {
  const { engineState, personaAction, stateBefore, stateAfter } = log;
  const { mission } = engineState;
  const findings: EngineReplayFinding[] = [];
  const intensityCap = mission.trainingDirective.intensityCap;
  const cutCap = engineState.cutProtocol?.training_intensity_cap ?? null;
  const completedSessions = personaAction.sessionsCompleted ?? [];

  if (mission.riskState.level === 'high' || mission.riskState.level === 'critical') {
    findings.push({
      severity: mission.riskState.level === 'critical' ? 'danger' : 'warning',
      subsystem: 'recovery',
      title: `Risk ${mission.riskState.level}`,
      detail: mission.riskState.drivers[0] ?? 'Risk state elevated without a clear primary driver.',
    });
  }

  if (mission.trainingDirective.isMandatoryRecovery && completedSessions.some((session) => session.actualRpe > 0)) {
    findings.push({
      severity: 'danger',
      subsystem: 'training',
      title: 'Mandatory recovery overridden',
      detail: 'The engine locked the day to recovery, but simulated training still occurred.',
    });
  }

  if (intensityCap != null && completedSessions.some((session) => session.actualRpe > intensityCap)) {
    findings.push({
      severity: 'warning',
      subsystem: 'training',
      title: 'Actual effort exceeded mission cap',
      detail: `At least one completed session went above the mission intensity cap of ${intensityCap}.`,
    });
  }

  if (cutCap != null && completedSessions.some((session) => session.actualRpe > cutCap)) {
    findings.push({
      severity: 'danger',
      subsystem: 'weight',
      title: 'Actual effort exceeded cut cap',
      detail: `At least one completed session went above the cut protection cap of ${cutCap}.`,
    });
  }

  if (mission.fuelDirective.safetyWarning === 'critical_energy_availability') {
    findings.push({
      severity: 'danger',
      subsystem: 'nutrition',
      title: 'Critical energy warning',
      detail: 'Fueling dropped into the critical energy-availability band for this day.',
    });
  } else if (mission.fuelDirective.safetyWarning === 'low_energy_availability') {
    findings.push({
      severity: 'warning',
      subsystem: 'nutrition',
      title: 'Low energy warning',
      detail: 'Fueling dropped below the preferred energy-availability floor for this day.',
    });
  }

  const actualMacroCalories = calculateCaloriesFromMacros(
    personaAction.actualProtein,
    personaAction.actualCarbs,
    personaAction.actualFat,
  );
  if (Math.abs(actualMacroCalories - personaAction.actualCalories) > 125) {
    findings.push({
      severity: 'warning',
      subsystem: 'nutrition',
      title: 'Actual calorie mismatch',
      detail: `Actual calorie total and macro-derived calories differ by ${Math.abs(actualMacroCalories - personaAction.actualCalories)} kcal.`,
    });
  }

  if (stateAfter.metabolism.currentWeightLbs > stateBefore.metabolism.currentWeightLbs + 1.5 && personaAction.isCheatDay) {
    findings.push({
      severity: 'info',
      subsystem: 'weight',
      title: 'Cheat-day rebound',
      detail: 'Weight jumped materially on a cheat day, which is useful for correction-logic review.',
    });
  }

  if (engineState.cutProtocol?.intervention_reason) {
    findings.push({
      severity: 'warning',
      subsystem: 'weight',
      title: 'Cut intervention applied',
      detail: engineState.cutProtocol.intervention_reason,
    });
  }

  return findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function mapDailyLog(log: DailySimulationLog, index: number): EngineReplayDay {
  const { engineState, personaAction, stateBefore, stateAfter } = log;
  const { mission } = engineState;
  const prescription = mission.trainingDirective.prescription;
  const prescribedCalories = calculateCaloriesFromMacros(
    mission.fuelDirective.protein,
    mission.fuelDirective.carbs,
    mission.fuelDirective.fat,
  );
  const actualLoad = (personaAction.sessionsCompleted ?? []).reduce(
    (sum, session) => sum + (session.actualDuration * session.actualRpe),
    0,
  );
  const prescribedLoad = (personaAction.sessionsCompleted ?? []).reduce(
    (sum, session) => sum + (session.prescribedDuration * session.prescribedRpe),
    0,
  );

  return {
    index,
    date: log.date,
    phase: engineState.objectiveContext.phase,
    cutPhase: personaAction.cutPhase ?? 'none',
    readinessState: engineState.readinessState,
    readinessLogged: personaAction.readinessLogged,
    sleepLogged: personaAction.sleepLogged,
    acwrRatio: engineState.acwr.ratio,
    riskLevel: mission.riskState.level,
    riskScore: mission.riskState.score,
    sessionRole: mission.trainingDirective.sessionRole,
    interventionState: mission.trainingDirective.interventionState,
    isMandatoryRecovery: mission.trainingDirective.isMandatoryRecovery,
    workoutType: mission.trainingDirective.workoutType ?? null,
    workoutTitle: mission.trainingDirective.focus ?? mission.trainingDirective.intent,
    headline: mission.headline,
    summary: mission.summary,
    didWarmup: personaAction.didWarmup,
    workoutBlueprint: personaAction.workoutBlueprint ?? 'Rest day',
    coachingInsight: personaAction.coachingInsight ?? '',
    athleteMonologue: personaAction.athleteMonologue ?? '',
    decisionReasons: getAllDecisionReasons(mission.decisionTrace).map((reason) => ({
      subsystem: reason.subsystem,
      title: reason.title,
      sentence: reason.sentence,
      impact: reason.impact,
    })),
    prescriptionPreview: prescription?.exercises?.slice(0, 4).map((exercise) => exercise.exercise.name) ?? [],
    exerciseLogs: (personaAction.exerciseLogs ?? []).map((entry) => ({
      exerciseId: entry.exerciseId,
      exerciseName: entry.exerciseName,
      sectionTitle: entry.sectionTitle ?? null,
      targetSets: entry.targetSets,
      completedSets: entry.completedSets,
      targetReps: entry.targetReps,
      actualReps: entry.actualReps,
      targetRpe: entry.targetRpe,
      actualRpe: entry.actualRpe ?? null,
      suggestedWeight: entry.suggestedWeight ?? null,
      actualWeight: entry.actualWeight ?? null,
      completed: entry.completed,
      note: entry.note,
    })),
    prescribedCalories,
    actualCalories: personaAction.actualCalories,
    prescribedProtein: mission.fuelDirective.protein,
    prescribedCarbs: mission.fuelDirective.carbs,
    prescribedFat: mission.fuelDirective.fat,
    actualProtein: personaAction.actualProtein,
    actualCarbs: personaAction.actualCarbs,
    actualFat: personaAction.actualFat,
    waterTargetOz: personaAction.waterTargetOz ?? mission.hydrationDirective.waterTargetOz ?? 0,
    sodiumTargetMg: personaAction.sodiumTargetMg ?? null,
    bodyWeightStart: stateBefore.metabolism.currentWeightLbs,
    bodyWeightEnd: stateAfter.metabolism.currentWeightLbs,
    prescribedLoad,
    actualLoad,
    findings: buildFindings(log),
  };
}

function buildSummary(scenario: EngineReplayScenario, days: EngineReplayDay[]): EngineReplayRun['summary'] {
  const findingCounts: Record<EngineReplayFindingSeverity, number> = {
    info: 0,
    warning: 0,
    danger: 0,
  };

  for (const day of days) {
    for (const finding of day.findings) {
      findingCounts[finding.severity] += 1;
    }
  }

  const finalDay = days[days.length - 1];
  const firstDay = days[0];

  return {
    totalDays: days.length,
    finalWeightLbs: finalDay?.bodyWeightEnd ?? scenario.config.initialState.weightLbs,
    weightChangeLbs: (finalDay?.bodyWeightEnd ?? scenario.config.initialState.weightLbs) - (firstDay?.bodyWeightStart ?? scenario.config.initialState.weightLbs),
    avgReadiness: Number((days.reduce((sum, day) => sum + day.readinessLogged, 0) / Math.max(days.length, 1)).toFixed(1)),
    interventionDays: days.filter((day) => day.interventionState !== 'none').length,
    mandatoryRecoveryDays: days.filter((day) => day.isMandatoryRecovery).length,
    highRiskDays: days.filter((day) => day.riskLevel === 'high' || day.riskLevel === 'critical').length,
    findingCounts,
  };
}

function mapSimulationResultToReplayRun(
  scenario: EngineReplayScenario,
  result: SimulationResult,
): EngineReplayRun {
  const days = result.dailyLogs.map(mapDailyLog);

  return {
    scenario,
    days,
    chartData: days.map((day, index) => ({
      x: index,
      label: day.date.slice(5),
      readiness: day.readinessLogged,
      acwr: Number(day.acwrRatio.toFixed(2)),
      weight: Number(day.bodyWeightEnd.toFixed(1)),
      prescribedCalories: day.prescribedCalories,
      actualCalories: day.actualCalories,
      prescribedLoad: Number(day.prescribedLoad.toFixed(1)),
      actualLoad: Number(day.actualLoad.toFixed(1)),
    })),
    summary: buildSummary(scenario, days),
  };
}

export function getEngineReplayScenarioById(id: string): EngineReplayScenario | null {
  return ENGINE_REPLAY_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export async function buildEngineReplayRun(scenarioId: string): Promise<EngineReplayRun> {
  const scenario = getEngineReplayScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown engine replay scenario: ${scenarioId}`);
  }

  const result = await runSimulation(scenario.config);
  return mapSimulationResultToReplayRun(scenario, result);
}
