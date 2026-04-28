import { calculateCaloriesFromMacros } from '../../utils/nutrition.ts';
import { getAllDecisionReasons } from '../presentation/decisionReason.ts';
import { TheCoachablePro } from './personas.ts';
import { runSimulation } from './runner.ts';
import type {
  DailySimulationLog,
  SimulationConfig,
  SimulationResult,
} from './types.ts';

export type EngineReplayFindingSeverity = 'info' | 'warning' | 'danger';
export type EngineReplayFindingOrigin = 'engine' | 'athlete' | 'scenario';

export interface EngineReplayFinding {
  severity: EngineReplayFindingSeverity;
  origin: EngineReplayFindingOrigin;
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

export interface EngineReplayExerciseSubstitution {
  exerciseId: string;
  exerciseName: string;
  rationale: string;
  rank: number;
  preservesPattern: boolean;
  preservesStimulus: boolean;
  fatigueDelta: number;
}

export interface EngineReplaySetPrescription {
  label: string;
  sets: number;
  reps: number | string;
  targetRPE: number;
  restSeconds: number;
  intensityNote?: string;
  timedWork?: {
    format: 'emom' | 'amrap' | 'tabata' | 'timed_set' | 'for_time';
    totalDurationSec: number;
    workIntervalSec?: number;
    restIntervalSec?: number;
    roundCount?: number;
    targetRounds?: number;
  } | null;
  circuitRound?: {
    roundCount: number;
    restBetweenRoundsSec: number;
    movements: Array<{
      exerciseId?: string;
      exerciseName: string;
      reps: number | null;
      durationSec: number | null;
      restSec: number;
    }>;
  } | null;
}

export interface EngineReplayPrescribedExercise {
  exerciseId: string;
  exerciseName: string;
  sectionTitle: string | null;
  sectionTemplate: string | null;
  sectionId: string | null;
  setScheme: string | null;
  targetSets: number;
  targetReps: number;
  targetRpe: number;
  suggestedWeight: number | null;
  warmupSetCount: number;
  restSeconds: number | null;
  loadingNotes: string | null;
  coachingCues: string[];
  substitutions: EngineReplayExerciseSubstitution[];
  setPrescription: EngineReplaySetPrescription[];
}

export interface EngineReplayWorkoutSection {
  id: string;
  template: string;
  title: string;
  intent: string;
  timeCap: number;
  restRule: string;
  densityRule: string | null;
  decisionTrace: string[];
  finisherReason?: string | null;
  exercises: EngineReplayPrescribedExercise[];
}

export interface EngineReplayWorkoutSession {
  estimatedDurationMin: number;
  sessionGoal: string | null;
  sessionIntent: string | null;
  primaryAdaptation: 'strength' | 'power' | 'conditioning' | 'recovery' | 'mixed';
  activationGuidance: string | null;
  expectedActivationRPE: number | null;
  decisionTrace: string[];
  interferenceWarnings: string[];
  sections: EngineReplayWorkoutSection[];
}

export interface EngineReplayConditioningDrill {
  name: string;
  targetRounds: number;
  completedRounds: number;
  durationSec: number | null;
  reps: number | null;
  restSec: number;
  completed: boolean;
  note: string;
}

export interface EngineReplayConditioningPrescription {
  type: string;
  totalDurationMin: number;
  rounds: number;
  workIntervalSec: number;
  restIntervalSec: number;
  format?: 'rounds' | 'emom' | 'amrap' | 'tabata' | 'for_time' | 'intervals';
  timedWork?: {
    format: 'emom' | 'amrap' | 'tabata' | 'timed_set' | 'for_time';
    totalDurationSec: number;
    workIntervalSec?: number;
    restIntervalSec?: number;
    roundCount?: number;
    targetRounds?: number;
  } | null;
  circuitRound?: {
    roundCount: number;
    restBetweenRoundsSec: number;
    movements: Array<{
      exerciseId?: string;
      exerciseName: string;
      reps: number | null;
      durationSec: number | null;
      restSec: number;
    }>;
  } | null;
  intensityLabel: 'light' | 'moderate' | 'hard';
  message: string;
  cnsBudget: number;
  estimatedLoad: number;
  drills: Array<{
    name: string;
    durationSec: number | null;
    reps: number | null;
    rounds: number;
    restSec: number;
    format?: 'steady_state' | 'intervals' | 'emom' | 'tabata' | 'amrap' | 'for_time';
    timedWork?: {
      format: 'emom' | 'amrap' | 'tabata' | 'timed_set' | 'for_time';
      totalDurationSec: number;
      workIntervalSec?: number;
      restIntervalSec?: number;
      roundCount?: number;
      targetRounds?: number;
    } | null;
  }>;
}

export interface EngineReplayConditioningLog {
  completedRounds: number;
  prescribedRounds: number;
  completedDurationMin: number;
  targetDurationMin: number;
  actualRpe: number | null;
  completionRate: number;
  note: string;
  drillLogs: EngineReplayConditioningDrill[];
}

export interface EngineReplayDay {
  index: number;
  date: string;
  phase: string;
  bodyMassSupportPhase: string;
  readinessState: string;
  readinessLogged: number;
  sleepLogged: number;
  acwrRatio: number;
  riskLevel: string;
  underlyingRiskLevel: string | null;
  riskDisplayOverride: string | null;
  riskScore: number;
  sessionRole: string;
  interventionState: string;
  isMandatoryRecovery: boolean;
  workoutType: string | null;
  workoutTitle: string;
  headline: string;
  summary: string;
  didWarmup: boolean;
  durationMin: number;
  activationGuidance: string | null;
  workoutBlueprint: string;
  coachingInsight: string;
  athleteMonologue: string;
  decisionReasons: EngineReplayDecisionReason[];
  workoutSession: EngineReplayWorkoutSession | null;
  prescriptionPreview: string[];
  prescribedExercises: EngineReplayPrescribedExercise[];
  conditioningPrescription: EngineReplayConditioningPrescription | null;
  conditioningLog: EngineReplayConditioningLog | null;
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
  primaryCause: string | null;
  contributingFactors: string[];
  engineDangerDay: boolean;
  athleteOverrideDay: boolean;
  scenarioPressureDay: boolean;
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
    nonBodyMassInterventionDays: number;
    bodyMassSupportInterventionDays: number;
    mandatoryRecoveryDays: number;
    highRiskDays: number;
    engineDangerDays: number;
    athleteOverrideDays: number;
    scenarioPressureDays: number;
    findingCounts: Record<EngineReplayFindingSeverity, number>;
    findingOriginCounts: Record<EngineReplayFindingOrigin, number>;
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
    description: 'Stable build block with a realistically compliant athlete. Good for checking training and nutrition progression without cut pressure.',
    config: {
      startDate: '2026-01-05',
      weeks: 6,
      seed: 11,
      persona: TheCoachablePro,
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
    description: 'Eight-week camp with a realistically compliant athlete. Best baseline for reading engine prescription logic block by block.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 17,
      targetWeight: 170,
      persona: TheCoachablePro,
    }),
  },
  {
    id: 'camp-active-cut',
    label: 'Camp Under Active Cut',
    description: 'Fight camp with a tighter cut and a realistically compliant athlete. Useful for checking intervention logic, fueling, and cut protection without confounding override behavior.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 23,
      targetWeight: 168,
      persona: TheCoachablePro,
    }),
  },
  {
    id: 'camp-taper-cut-protection',
    label: 'Taper Cut Protection',
    description: 'Late-camp replay tuned for taper plus active cut pressure. Useful for checking that protective mission logic still preserves recovery-first outputs as weigh-in approaches.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 37,
      targetWeight: 167,
      persona: TheCoachablePro,
    }),
  },
  {
    id: 'camp-peak-concurrent-cut',
    label: 'Peak With Concurrent Cut',
    description: 'Peak-camp replay with a tighter cut. Useful for validating that intensity pressure stays bounded instead of stacking peak load and aggressive cut stress together.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 41,
      targetWeight: 166,
      persona: TheCoachablePro,
    }),
  },
  {
    id: 'stressed-low-compliance',
    label: 'Camp Recovery Headwinds',
    description: 'Same realistically compliant athlete under a noisier recovery trajectory. Useful for validating whether the engine stays coherent when readiness gets choppy.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 29,
      targetWeight: 170,
      persona: TheCoachablePro,
    }),
  },
  {
    id: 'nutrition-chaos',
    label: 'Camp Tight Fueling Margin',
    description: 'A tighter cut with a realistically compliant athlete. Use this to inspect calorie correction and nutrition drift without intentional binge behavior.',
    config: buildFightCampConfig({
      startDate: '2026-02-02',
      weeks: 8,
      seed: 31,
      targetWeight: 167,
      persona: TheCoachablePro,
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

function originRank(origin: EngineReplayFindingOrigin): number {
  switch (origin) {
    case 'engine':
      return 3;
    case 'athlete':
      return 2;
    default:
      return 1;
  }
}

function classifyDriverGroup(driver: string): number {
  const normalized = driver.toLowerCase();
  if (
    normalized.includes('acute load')
    || normalized.includes('readiness is')
    || normalized.includes('central fatigue')
    || normalized.includes('low-energy')
    || normalized.includes('energy availability')
    || normalized.includes('red readiness')
  ) {
    return 0;
  }
  if (
    normalized.includes('weight-class')
    || normalized.includes('body-mass')
    || normalized.includes('glycogen')
    || normalized.includes('dehydr')
    || normalized.includes('sodium')
    || normalized.includes('make weight')
    || normalized.includes('drift')
    || normalized.includes('cut ')
  ) {
    return 1;
  }
  if (
    normalized.includes('double-session')
    || normalized.includes('sparring is on the schedule')
    || normalized.includes('hard sparring')
    || normalized.includes('taper phase')
    || normalized.includes('travel window')
  ) {
    return 2;
  }
  return 3;
}

function orderDrivers(drivers: string[]): string[] {
  return [...drivers].sort((left, right) => {
    const groupDelta = classifyDriverGroup(left) - classifyDriverGroup(right);
    if (groupDelta !== 0) return groupDelta;
    return left.localeCompare(right);
  });
}

function buildFindings(log: DailySimulationLog): EngineReplayFinding[] {
  const { engineState, personaAction, stateBefore, stateAfter } = log;
  const { mission } = engineState;
  const findings: EngineReplayFinding[] = [];
  const intensityCap = mission.trainingDirective.intensityCap;
  const completedSessions = personaAction.sessionsCompleted ?? [];
  const underlyingRiskLevel = mission.riskState.underlyingLevel ?? mission.riskState.level;
  const isRestDayOverride = mission.riskState.displayOverride === 'rest_day_recovery_window';

  if (isRestDayOverride && mission.trainingDirective.interventionState !== 'none') {
    findings.push({
      severity: 'warning',
      origin: 'engine',
      subsystem: 'recovery',
      title: 'Recovery day intervention',
      detail: `Underlying risk reached ${underlyingRiskLevel}, but the engine kept the day as true recovery instead of treating it as a danger day.`,
    });
  } else if (underlyingRiskLevel === 'high' || underlyingRiskLevel === 'critical') {
    findings.push({
      severity: underlyingRiskLevel === 'critical' ? 'danger' : 'warning',
      origin: 'engine',
      subsystem: 'recovery',
      title: `Risk ${underlyingRiskLevel}`,
      detail: mission.riskState.drivers[0] ?? 'Risk state elevated without a clear primary driver.',
    });
  }

  if (
    mission.trainingDirective.isMandatoryRecovery
    && completedSessions.some((session) => session.actualRpe > 0 && session.type !== 'recovery')
  ) {
    findings.push({
      severity: 'danger',
      origin: 'athlete',
      subsystem: 'training',
      title: 'Mandatory recovery overridden',
      detail: 'The engine locked the day to recovery, but simulated training still occurred.',
    });
  }

  if (intensityCap != null && completedSessions.some((session) => session.actualRpe > intensityCap)) {
    findings.push({
      severity: 'warning',
      origin: 'athlete',
      subsystem: 'training',
      title: 'Actual effort exceeded mission cap',
      detail: `At least one completed session went above the mission intensity cap of ${intensityCap}.`,
    });
  }

  if (mission.fuelDirective.safetyWarning === 'critical_energy_availability') {
    findings.push({
      severity: 'danger',
      origin: 'engine',
      subsystem: 'nutrition',
      title: 'Critical energy warning',
      detail: 'Fueling dropped into the critical energy-availability band for this day.',
    });
  } else if (mission.fuelDirective.safetyWarning === 'low_energy_availability') {
    findings.push({
      severity: 'warning',
      origin: 'engine',
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
      origin: 'athlete',
      subsystem: 'nutrition',
      title: 'Actual calorie mismatch',
      detail: `Actual calorie total and macro-derived calories differ by ${Math.abs(actualMacroCalories - personaAction.actualCalories)} kcal.`,
    });
  }

  if (stateAfter.metabolism.currentWeightLbs > stateBefore.metabolism.currentWeightLbs + 1.5 && personaAction.isCheatDay) {
    findings.push({
      severity: 'info',
      origin: 'athlete',
      subsystem: 'weight',
      title: 'Cheat-day rebound',
      detail: 'Weight jumped materially on a cheat day, which is useful for correction-logic review.',
    });
  }

  return findings.sort((left, right) => {
    const severityDelta = severityRank(right.severity) - severityRank(left.severity);
    if (severityDelta !== 0) return severityDelta;
    const originDelta = originRank(right.origin) - originRank(left.origin);
    if (originDelta !== 0) return originDelta;
    return left.title.localeCompare(right.title);
  });
}

function mapDailyLog(log: DailySimulationLog, index: number): EngineReplayDay {
  const { engineState, personaAction, stateBefore, stateAfter } = log;
  const { mission } = engineState;
  const prescription = mission.trainingDirective.prescription;
  const combatActivities = (engineState.scheduledActivities ?? []).filter((activity) =>
    activity.activity_type === 'boxing_practice' || activity.activity_type === 'sparring',
  );
  const primaryCombatActivity = combatActivities[0] ?? null;
  const hasGuidedPrescription = (prescription?.exercises?.length ?? 0) > 0
    || personaAction.conditioningPrescription != null;
  const preserveMissionLabel = mission.trainingDirective.sessionRole === 'rest'
    || mission.trainingDirective.sessionRole === 'recover'
    || mission.trainingDirective.sessionRole === 'cut_protect'
    || mission.trainingDirective.workoutType === 'recovery'
    || mission.trainingDirective.workoutType == null;
  const derivedWorkoutType = preserveMissionLabel || hasGuidedPrescription
    ? mission.trainingDirective.workoutType
    : primaryCombatActivity?.activity_type === 'sparring'
      ? 'sparring'
      : primaryCombatActivity?.activity_type === 'boxing_practice'
        ? 'practice'
        : mission.trainingDirective.workoutType;
  const derivedWorkoutTitle = preserveMissionLabel
    ? (mission.trainingDirective.focus ?? mission.trainingDirective.intent)
    : hasGuidedPrescription && primaryCombatActivity?.custom_label
      ? `${mission.trainingDirective.focus ?? mission.trainingDirective.intent} paired with ${primaryCombatActivity.custom_label}`
    : primaryCombatActivity?.custom_label
      ?? mission.trainingDirective.focus
      ?? mission.trainingDirective.intent;
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
  const findings = buildFindings(log);
  const orderedDrivers = orderDrivers(mission.riskState.drivers ?? []);
  const engineDangerDay = findings.some((finding) => finding.origin === 'engine' && finding.severity === 'danger');
  const athleteOverrideDay = findings.some((finding) =>
      finding.origin === 'athlete'
    && (
      finding.title === 'Mandatory recovery overridden'
      || finding.title === 'Actual effort exceeded mission cap'
    ),
  );
  const scenarioPressureDay = findings.some((finding) => finding.origin === 'scenario');

  return {
    index,
    date: log.date,
    phase: engineState.objectiveContext.phase,
    bodyMassSupportPhase: personaAction.bodyMassSupportPhase ?? 'none',
    readinessState: engineState.readinessState,
    readinessLogged: personaAction.readinessLogged,
    sleepLogged: personaAction.sleepLogged,
    acwrRatio: engineState.acwr.ratio,
    riskLevel: mission.riskState.level,
    underlyingRiskLevel: mission.riskState.underlyingLevel ?? null,
    riskDisplayOverride: mission.riskState.displayOverride ?? null,
    riskScore: mission.riskState.score,
    sessionRole: mission.trainingDirective.sessionRole,
    interventionState: mission.trainingDirective.interventionState,
    isMandatoryRecovery: mission.trainingDirective.isMandatoryRecovery,
    workoutType: derivedWorkoutType,
    workoutTitle: derivedWorkoutTitle,
    headline: mission.headline,
    summary: mission.summary,
    didWarmup: personaAction.didWarmup,
    durationMin: mission.trainingDirective.durationMin ?? 0,
    activationGuidance: prescription?.activationGuidance ?? null,
    workoutBlueprint: personaAction.workoutBlueprint ?? 'Rest day',
    coachingInsight: personaAction.coachingInsight ?? '',
    athleteMonologue: personaAction.athleteMonologue ?? '',
    decisionReasons: getAllDecisionReasons(mission.decisionTrace).map((reason) => ({
      subsystem: reason.subsystem,
      title: reason.title,
      sentence: reason.sentence,
      impact: reason.impact,
    })),
    workoutSession: prescription ? {
      estimatedDurationMin: prescription.estimatedDurationMin,
      sessionGoal: prescription.sessionGoal ?? null,
      sessionIntent: prescription.sessionIntent ?? null,
      primaryAdaptation: prescription.primaryAdaptation,
      activationGuidance: prescription.activationGuidance ?? null,
      expectedActivationRPE: prescription.expectedActivationRPE ?? null,
      decisionTrace: prescription.decisionTrace ?? [],
      interferenceWarnings: prescription.interferenceWarnings ?? [],
      sections: (prescription.sections ?? []).map((section) => ({
        id: section.id,
        template: section.template,
        title: section.title,
        intent: section.intent,
        timeCap: section.timeCap,
        restRule: section.restRule,
        densityRule: section.densityRule ?? null,
        decisionTrace: section.decisionTrace ?? [],
        finisherReason: section.finisherReason ?? null,
        exercises: section.exercises.map((exercise) => ({
          exerciseId: exercise.exercise.id,
          exerciseName: exercise.exercise.name,
          sectionTitle: exercise.sectionIntent ?? null,
          sectionTemplate: exercise.sectionTemplate ?? null,
          sectionId: exercise.sectionId ?? null,
          setScheme: exercise.setScheme ?? null,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetRpe: exercise.targetRPE,
          suggestedWeight: exercise.suggestedWeight ?? null,
          warmupSetCount: Array.isArray(exercise.warmupSets) ? exercise.warmupSets.length : 0,
          restSeconds: exercise.restSeconds ?? null,
          loadingNotes: exercise.loadingNotes ?? null,
          coachingCues: exercise.coachingCues ?? [],
          substitutions: (exercise.substitutions ?? []).map((substitution) => ({
            exerciseId: substitution.exerciseId,
            exerciseName: substitution.exerciseName,
            rationale: substitution.rationale,
            rank: substitution.rank,
            preservesPattern: substitution.preservesPattern,
            preservesStimulus: substitution.preservesStimulus,
            fatigueDelta: substitution.fatigueDelta,
          })),
          setPrescription: (exercise.setPrescription ?? []).map((setEntry) => ({
            label: setEntry.label,
            sets: setEntry.sets,
            reps: setEntry.reps,
            targetRPE: setEntry.targetRPE,
            restSeconds: setEntry.restSeconds,
            intensityNote: setEntry.intensityNote,
            timedWork: setEntry.timedWork ?? null,
            circuitRound: setEntry.circuitRound ?? null,
          })),
        })),
      })),
    } : null,
    prescriptionPreview: prescription?.exercises?.slice(0, 4).map((exercise) => exercise.exercise.name) ?? [],
    prescribedExercises: prescription?.exercises?.map((exercise) => ({
      exerciseId: exercise.exercise.id,
      exerciseName: exercise.exercise.name,
      sectionTitle: exercise.sectionIntent ?? null,
      sectionTemplate: exercise.sectionTemplate ?? null,
      sectionId: exercise.sectionId ?? null,
      setScheme: exercise.setScheme ?? null,
      targetSets: exercise.targetSets,
      targetReps: exercise.targetReps,
      targetRpe: exercise.targetRPE,
      suggestedWeight: exercise.suggestedWeight ?? null,
      warmupSetCount: Array.isArray(exercise.warmupSets) ? exercise.warmupSets.length : 0,
      restSeconds: exercise.restSeconds ?? null,
      loadingNotes: exercise.loadingNotes ?? null,
      coachingCues: exercise.coachingCues ?? [],
      substitutions: (exercise.substitutions ?? []).map((substitution) => ({
        exerciseId: substitution.exerciseId,
        exerciseName: substitution.exerciseName,
        rationale: substitution.rationale,
        rank: substitution.rank,
        preservesPattern: substitution.preservesPattern,
        preservesStimulus: substitution.preservesStimulus,
        fatigueDelta: substitution.fatigueDelta,
      })),
      setPrescription: (exercise.setPrescription ?? []).map((setEntry) => ({
        label: setEntry.label,
        sets: setEntry.sets,
        reps: setEntry.reps,
        targetRPE: setEntry.targetRPE,
        restSeconds: setEntry.restSeconds,
        intensityNote: setEntry.intensityNote,
        timedWork: setEntry.timedWork ?? null,
        circuitRound: setEntry.circuitRound ?? null,
      })),
    })) ?? [],
    conditioningPrescription: personaAction.conditioningPrescription ? {
      type: personaAction.conditioningPrescription.type,
      totalDurationMin: personaAction.conditioningPrescription.totalDurationMin,
      rounds: personaAction.conditioningPrescription.rounds,
      workIntervalSec: personaAction.conditioningPrescription.workIntervalSec,
      restIntervalSec: personaAction.conditioningPrescription.restIntervalSec,
      format: personaAction.conditioningPrescription.format,
      timedWork: personaAction.conditioningPrescription.timedWork ?? null,
      circuitRound: personaAction.conditioningPrescription.circuitRound ?? null,
      intensityLabel: personaAction.conditioningPrescription.intensityLabel,
      message: personaAction.conditioningPrescription.message,
      cnsBudget: personaAction.conditioningPrescription.cnsBudget,
      estimatedLoad: personaAction.conditioningPrescription.estimatedLoad,
      drills: (personaAction.conditioningPrescription.exercises ?? []).map((exercise) => ({
        name: exercise.name,
        durationSec: exercise.durationSec ?? null,
        reps: exercise.reps ?? null,
        rounds: exercise.rounds,
        restSec: exercise.restSec,
        format: exercise.format,
        timedWork: exercise.timedWork ?? null,
      })),
    } : null,
    conditioningLog: personaAction.conditioningLog ? {
      completedRounds: personaAction.conditioningLog.completedRounds,
      prescribedRounds: personaAction.conditioningLog.prescribedRounds,
      completedDurationMin: personaAction.conditioningLog.completedDurationMin,
      targetDurationMin: personaAction.conditioningLog.targetDurationMin,
      actualRpe: personaAction.conditioningLog.actualRpe ?? null,
      completionRate: personaAction.conditioningLog.completionRate,
      note: personaAction.conditioningLog.note,
      drillLogs: (personaAction.conditioningLog.drillLogs ?? []).map((drill) => ({
        name: drill.name,
        targetRounds: drill.targetRounds,
        completedRounds: drill.completedRounds,
        durationSec: drill.durationSec ?? null,
        reps: drill.reps ?? null,
        restSec: drill.restSec,
        completed: drill.completed,
        note: drill.note,
      })),
    } : null,
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
    primaryCause: orderedDrivers[0] ?? null,
    contributingFactors: orderedDrivers.slice(1),
    engineDangerDay,
    athleteOverrideDay,
    scenarioPressureDay,
    findings,
  };
}

function buildSummary(scenario: EngineReplayScenario, days: EngineReplayDay[]): EngineReplayRun['summary'] {
  const findingCounts: Record<EngineReplayFindingSeverity, number> = {
    info: 0,
    warning: 0,
    danger: 0,
  };
  const findingOriginCounts: Record<EngineReplayFindingOrigin, number> = {
    engine: 0,
    athlete: 0,
    scenario: 0,
  };

  for (const day of days) {
    for (const finding of day.findings) {
      findingCounts[finding.severity] += 1;
      findingOriginCounts[finding.origin] += 1;
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
    nonBodyMassInterventionDays: days.filter((day) => day.interventionState !== 'none' && day.bodyMassSupportPhase === 'none').length,
    bodyMassSupportInterventionDays: days.filter((day) => day.interventionState !== 'none' && day.bodyMassSupportPhase !== 'none').length,
    mandatoryRecoveryDays: days.filter((day) => day.isMandatoryRecovery).length,
    highRiskDays: days.filter((day) => day.riskLevel === 'high' || day.riskLevel === 'critical').length,
    engineDangerDays: days.filter((day) => day.engineDangerDay).length,
    athleteOverrideDays: days.filter((day) => day.athleteOverrideDay).length,
    scenarioPressureDays: days.filter((day) => day.scenarioPressureDay).length,
    findingCounts,
    findingOriginCounts,
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

export async function buildEngineReplayRun(
  scenarioId: string,
  options?: { seedOverride?: number | null },
): Promise<EngineReplayRun> {
  const scenario = getEngineReplayScenarioById(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown engine replay scenario: ${scenarioId}`);
  }

  const resolvedSeed = options?.seedOverride ?? scenario.config.seed ?? 42;
  const runScenario: EngineReplayScenario = {
    ...scenario,
    config: {
      ...scenario.config,
      seed: resolvedSeed,
    },
  };

  const result = await runSimulation(runScenario.config);
  return mapSimulationResultToReplayRun(runScenario, result);
}
