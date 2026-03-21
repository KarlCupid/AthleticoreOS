import type {
  BuildDailyMissionInput,
  BuildMicrocyclePlanInput,
  DailyMission,
  DecisionTraceItem,
  DirectiveSource,
  FuelDirective,
  HydrationDirective,
  InterventionState,
  MissionOverride,
  MissionRiskLevel,
  MissionRiskState,
  MissionScheduledActivity,
  RecoveryDirective,
  TrainingDirective,
  TrainingSessionRole,
  WeeklyMissionPlan,
  WorkoutFocus,
  WorkoutType,
} from './types.ts';
import { getInterferencePenalty, type SessionType } from './load/interferenceModel.ts';

export const DAILY_ENGINE_VERSION = 'daily-engine-v3';

interface InterventionStatus {
  interventionState: InterventionState;
  enforcedIntensityCap: number | null;
  forcedSessionRole: TrainingSessionRole | null;
  isMandatoryRecovery: boolean;
  reason: string | null;
}

function titleize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferWorkoutType(sessionType: string | null | undefined): WorkoutType | null {
  switch (sessionType) {
    case 'conditioning':
      return 'conditioning';
    case 'activation':
    case 'deload':
    case 'recovery':
    case 'active_recovery':
      return 'recovery';
    case 'sparring':
    case 'boxing_practice':
    case 'sport_specific':
      return 'practice';
    case 'sc':
      return 'strength';
    default:
      return null;
  }
}

function mapActivityToSessionType(activityType: MissionScheduledActivity['activity_type']): SessionType {
  switch (activityType) {
    case 'sparring':
      return 'SPARRING';
    case 'boxing_practice':
      return 'SKILL';
    case 'conditioning':
    case 'road_work':
    case 'running':
      return 'CONDITIONING';
    case 'sc':
      return 'HEAVY_STRENGTH';
    default:
      return 'RECOVERY';
  }
}

function inferSessionRole(input: {
  campPhase: BuildDailyMissionInput['macrocycleContext']['campPhase'];
  focus: WorkoutFocus | null;
  intensityCap: number | null;
  isOnActiveCut: boolean;
  hasSparring: boolean;
}): TrainingSessionRole {
  const { campPhase, focus, intensityCap, isOnActiveCut, hasSparring } = input;

  if ((intensityCap ?? 10) <= 4) {
    return isOnActiveCut ? 'cut_protect' : 'recover';
  }
  if (campPhase === 'taper') return 'taper_sharpen';
  if (hasSparring || focus === 'sport_specific') return 'spar_support';
  if (campPhase === 'peak') return 'express';
  if (campPhase === 'build' || campPhase === 'base') return 'develop';
  if ((intensityCap ?? 0) >= 8 && !isOnActiveCut) return 'express';
  if (focus === 'recovery') return 'recover';
  return 'develop';
}

function getRoleIntent(role: TrainingSessionRole, objective: string, focus: WorkoutFocus | null): string {
  const focusLabel = focus ? titleize(focus) : 'Performance';
  switch (role) {
    case 'cut_protect':
      return `Protect output while keeping the cut on schedule. ${focusLabel} stays controlled today.`;
    case 'recover':
      return `Recover, restore movement quality, and keep ${objective.toLowerCase()} progressing without extra fatigue.`;
    case 'spar_support':
      return `Support ring work with just enough ${focusLabel.toLowerCase()} to sharpen execution without stealing energy.`;
    case 'express':
      return `Express the qualities you have built and keep ${focusLabel.toLowerCase()} sharp.`;
    case 'taper_sharpen':
      return 'Stay sharp, stay fresh, and avoid carrying fatigue into the next key session.';
    case 'develop':
    default:
      return `Build the qualities that move ${objective.toLowerCase()} forward.`;
  }
}

function getKeyQualities(role: TrainingSessionRole, focus: WorkoutFocus | null): string[] {
  const base = focus ? [titleize(focus)] : ['Performance'];
  switch (role) {
    case 'cut_protect':
      return [...base, 'Energy conservation', 'Quality reps'];
    case 'recover':
      return [...base, 'Tissue quality', 'Range of motion'];
    case 'spar_support':
      return [...base, 'Speed', 'Low fatigue'];
    case 'express':
      return [...base, 'Power', 'Specificity'];
    case 'taper_sharpen':
      return [...base, 'Sharpness', 'Recovery'];
    case 'develop':
    default:
      return [...base, 'Progressive load', 'Consistency'];
  }
}

function checkInterventionStatus(
  riskState: MissionRiskState,
  plannedIntensityCap: number | null,
): InterventionStatus {
  if (riskState.score >= 75) {
    return {
      interventionState: 'hard',
      enforcedIntensityCap: plannedIntensityCap === null ? 2 : Math.min(plannedIntensityCap, 2),
      forcedSessionRole: 'recover',
      isMandatoryRecovery: true,
      reason: 'Critical risk is active. Recovery is mandatory today to stop the fatigue spiral.',
    };
  }

  if (riskState.score >= 55) {
    return {
      interventionState: 'soft',
      enforcedIntensityCap: plannedIntensityCap === null ? 4 : Math.min(plannedIntensityCap, 4),
      forcedSessionRole: null,
      isMandatoryRecovery: false,
      reason: 'Risk is elevated. Output is capped today to protect recovery and keep the block on line.',
    };
  }

  return {
    interventionState: 'none',
    enforcedIntensityCap: plannedIntensityCap,
    forcedSessionRole: null,
    isMandatoryRecovery: false,
    reason: null,
  };
}

function getAcwrInterpretation(status: BuildDailyMissionInput['acwr']['status']): string | null {
  if (status === 'redline') return 'You are digging a hole. Stop before you break.';
  if (status === 'caution') return 'Load is running hot. Keep the lid on before this turns into a breakdown.';
  return null;
}

function getCutDepletionInterpretation(
  input: BuildDailyMissionInput,
  fuelDirective: FuelDirective,
): string | null {
  const cutPhase = input.cutProtocol?.cut_phase ?? null;
  if (cutPhase === 'fight_week_cut' || cutPhase === 'intensified' || fuelDirective.state === 'cut_protect') {
    return 'Tank is empty. You will feel slow and foggy today.';
  }

  return null;
}

function getSodiumRestrictionInterpretation(input: BuildDailyMissionInput): string | null {
  const sodiumTargetMg = input.cutProtocol?.sodium_target_mg ?? null;
  const sodiumInstruction = input.cutProtocol?.sodium_instruction?.toLowerCase() ?? '';
  if ((sodiumTargetMg != null && sodiumTargetMg <= 500) || sodiumInstruction.includes('zero') || sodiumInstruction.includes('minimal')) {
    return 'Stay away from salt. Water dump starts now.';
  }

  return null;
}

function buildRiskState(input: BuildDailyMissionInput): MissionRiskState {
  const drivers = [...(input.riskDrivers ?? [])];
  let score = input.riskScore ?? 8;
  const anchorSummary = input.readinessProfile.performanceAnchors
    .filter((anchor) => anchor.status === 'below_baseline')
    .map((anchor) => anchor.label)
    .join(', ');

  if (input.acwr.status === 'redline') {
    score += 20;
    drivers.push('Acute load is above the safe training band.');
  } else if (input.acwr.status === 'caution') {
    score += 10;
    drivers.push('Acute load is elevated and needs monitoring.');
  }

  if (input.readinessState === 'Depleted') {
    score += 20;
    drivers.push('Readiness is depleted.');
  } else if (input.readinessState === 'Caution') {
    score += 10;
    drivers.push('Readiness is below peak.');
  }

  const yellowFlags = input.readinessProfile.flags.filter((flag) => flag.level === 'yellow').length;
  const redFlags = input.readinessProfile.flags.filter((flag) => flag.level === 'red').length;
  score += yellowFlags * 4;
  score += redFlags * 9;
  if (redFlags > 0) {
    drivers.push('Red readiness flags are active.');
  } else if (yellowFlags > 0) {
    drivers.push('Yellow readiness flags are shaping the day.');
  }

  if (input.macrocycleContext.isTravelWindow) {
    score += 8;
    drivers.push('Travel window is active.');
  }

  if (input.cutProtocol?.training_intensity_cap != null && input.cutProtocol.training_intensity_cap <= 4) {
    score += 16;
    drivers.push('Fight-week cut is restricting training intensity.');
  } else if (input.macrocycleContext.weightCutState === 'driving') {
    score += 12;
    drivers.push('Weight cut is driving planning decisions.');
  }

  if (input.macrocycleContext.campPhase === 'taper') {
    score += 6;
    drivers.push('Taper phase prioritizes freshness over added load.');
  }

  let level: MissionRiskLevel = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 55) level = 'high';
  else if (score >= 35) level = 'moderate';

  const label = level === 'critical'
    ? 'Protect the next 48 hours'
    : level === 'high'
      ? 'Tight control required'
      : level === 'moderate'
        ? 'Stay disciplined'
        : 'Good window to execute';

  return {
    level,
    score: Math.max(0, Math.min(100, Math.round(score))),
    label,
    drivers: drivers.length > 0 ? drivers : ['No major risk drivers detected.'],
    flags: input.readinessProfile.flags,
    anchorSummary: anchorSummary || null,
  };
}

function summarizeVolume(durationMin: number | null, exerciseCount: number): string {
  if (!durationMin && exerciseCount === 0) return 'Follow the planned work with strict quality standards.';
  if (!durationMin) return `${exerciseCount} planned exercises.`;
  return `${durationMin} min target with ${exerciseCount} main exercise${exerciseCount === 1 ? '' : 's'}.`;
}

function buildTrainingDirective(input: BuildDailyMissionInput, riskState: MissionRiskState): TrainingDirective {
  const focus = input.workoutPrescription?.focus ?? input.weeklyPlanEntry?.focus ?? null;
  const workoutType = input.workoutPrescription?.workoutType
    ?? inferWorkoutType(input.weeklyPlanEntry?.session_type);
  const durationMin = input.weeklyPlanEntry?.estimated_duration_min
    ?? input.workoutPrescription?.estimatedDurationMin
    ?? null;
  let intensityCap = input.cutProtocol?.training_intensity_cap
    ?? input.constraintSet.hardCaps.intensityCap
    ?? input.weeklyPlanEntry?.target_intensity
    ?? null;
  const intervention = checkInterventionStatus(riskState, intensityCap);
  intensityCap = intervention.enforcedIntensityCap;

  const hasSparring = input.scheduledActivities.some((activity) => activity.activity_type === 'sparring');
  const inferredRole = inferSessionRole({
    campPhase: input.macrocycleContext.campPhase,
    focus,
    intensityCap,
    isOnActiveCut: input.macrocycleContext.isOnActiveCut,
    hasSparring,
  });
  const sessionRole = intervention.forcedSessionRole ?? inferredRole;
  const source: DirectiveSource = input.cutProtocol ? 'weight_cut_protocol'
    : input.weeklyPlanEntry?.prescription_snapshot ? 'weekly_plan_snapshot'
      : 'daily_engine';

  return {
    sessionRole,
    interventionState: intervention.interventionState,
    isMandatoryRecovery: intervention.isMandatoryRecovery,
    focus,
    workoutType,
    intent: getRoleIntent(sessionRole, input.macrocycleContext.performanceObjective.primaryOutcome, focus),
    reason: intervention.reason
      ?? (input.readinessProfile.flags.length > 0
        ? `The engine is preserving training intent by swapping out the wrong stress for today's readiness profile.`
        : undefined)
      ?? (riskState.level === 'low'
        ? `Today supports ${input.macrocycleContext.performanceObjective.primaryOutcome.toLowerCase()} with a clear execution window.`
        : `Today is being controlled to respect ${riskState.drivers[0].toLowerCase()}`),
    intensityCap,
    durationMin,
    volumeTarget: summarizeVolume(durationMin, input.workoutPrescription?.exercises.length ?? 0),
    keyQualities: getKeyQualities(sessionRole, focus),
    constraintSet: input.constraintSet,
    medStatus: input.medStatus ?? null,
    source,
    prescription: input.workoutPrescription,
  };
}

function getActiveTrainingCount(activities: MissionScheduledActivity[]): number {
  return activities.filter((activity) => activity.status !== 'skipped').length;
}

function buildFuelDirective(
  input: BuildDailyMissionInput,
  trainingDirective: TrainingDirective,
  riskState: MissionRiskState,
): FuelDirective {
  const trainingCount = getActiveTrainingCount(input.scheduledActivities);
  const durationMin = trainingDirective.durationMin ?? 0;
  const intensity = trainingDirective.intensityCap ?? input.weeklyPlanEntry?.target_intensity ?? 5;
  const fuelState = input.nutritionTargets.fuelState;
  const demandScore = input.nutritionTargets.sessionDemandScore;
  const highDemand = intensity >= 7 || durationMin >= 70 || trainingDirective.sessionRole === 'express' || demandScore >= 60;
  const cutProtected = fuelState === 'cut_protect'
    || (input.cutProtocol?.training_intensity_cap != null && input.cutProtocol.training_intensity_cap <= 4);

  const preSessionCarbsG = cutProtected
    ? 20
    : fuelState === 'double_day'
      ? 60
      : fuelState === 'spar_support'
        ? 55
        : fuelState === 'strength_power'
          ? 45
          : fuelState === 'aerobic'
            ? 35
            : 20;
  const intraSessionCarbsG = cutProtected
    ? 0
    : fuelState === 'double_day'
      ? 25
      : fuelState === 'spar_support'
        ? 20
        : fuelState === 'aerobic' && durationMin >= 60
          ? 10
          : highDemand
            ? 15
            : 0;
  const postSessionProteinG = durationMin >= 60 || fuelState === 'double_day' ? 40 : 30;
  const intraSessionHydrationOz = Math.max(
    12,
    Math.round(durationMin / 3) + input.nutritionTargets.hydrationBoostOz + (trainingCount > 1 ? 8 : 0),
  );

  let compliancePriority: FuelDirective['compliancePriority'] = 'consistency';
  if (input.cutProtocol || input.macrocycleContext.weightCutState === 'driving') compliancePriority = 'weight';
  else if (riskState.level === 'high' || riskState.level === 'critical') compliancePriority = 'recovery';
  else if (highDemand || trainingCount > 1) compliancePriority = 'performance';

  const source: DirectiveSource = input.cutProtocol
    ? 'weight_cut_protocol'
    : input.weeklyPlanEntry?.prescription_snapshot
      ? 'weekly_plan_snapshot'
      : 'daily_engine';
  const message = input.cutProtocol
    ? 'Cut protocol is leading intake today. Hit the exact macro and hydration targets to keep weight on line.'
    : compliancePriority === 'performance'
      ? 'Fuel the key work first. Front-load carbs before training and keep recovery intake tight after the session.'
      : compliancePriority === 'recovery'
        ? 'Keep intake steady to support recovery and avoid digging fatigue deeper.'
        : 'Stay on plan and treat nutrition consistency as part of the block.';
  const weightDriftLbs = (input.cutProtocol as any)?.weightDriftLbs ?? input.cutProtocol?.weight_drift_lbs ?? null;
  const hasDriftCorrection = weightDriftLbs != null && weightDriftLbs > 0.5;

  return {
    state: fuelState,
    sessionDemandScore: demandScore,
    calories: (input.cutProtocol as any)?.prescribedCalories ?? (input.cutProtocol as any)?.prescribed_calories ?? input.nutritionTargets.adjustedCalories,
    protein: (input.cutProtocol as any)?.prescribedProtein ?? (input.cutProtocol as any)?.prescribed_protein ?? input.nutritionTargets.protein,
    carbs: (input.cutProtocol as any)?.prescribedCarbs ?? (input.cutProtocol as any)?.prescribed_carbs ?? input.nutritionTargets.carbs,
    fat: (input.cutProtocol as any)?.prescribedFat ?? (input.cutProtocol as any)?.prescribed_fat ?? input.nutritionTargets.fat,
    preSessionCarbsG,
    intraSessionCarbsG,
    postSessionProteinG,
    intraSessionHydrationOz,
    hydrationBoostOz: input.nutritionTargets.hydrationBoostOz,
    sodiumTargetMg: input.cutProtocol?.sodium_target_mg ?? null,
    compliancePriority,
    adjustmentFlag: hasDriftCorrection ? 'drift_correction' : null,
    source,
    message: hasDriftCorrection
      ? `${message} Weight drift is above curve, so calories were tightened to pull the cut back on line.`
      : message,
    reasons: input.nutritionTargets.reasonLines,
    energyAvailability: input.nutritionTargets.energyAvailability,
    fuelingFloorTriggered: input.nutritionTargets.fuelingFloorTriggered,
    safetyWarning: input.nutritionTargets.safetyWarning,
  };
}

function buildHydrationDirective(input: BuildDailyMissionInput): HydrationDirective {
  const waterTargetOz = input.cutProtocol?.water_target_oz
    ?? (input.hydration.dailyWaterOz + input.nutritionTargets.hydrationBoostOz);
  const sodiumTargetMg = input.cutProtocol?.sodium_target_mg ?? null;
  const protocol = input.cutProtocol?.morning_protocol
    ?? input.cutProtocol?.training_recommendation
    ?? input.hydration.message;

  return {
    waterTargetOz: Math.round(waterTargetOz),
    sodiumTargetMg,
    protocol,
    message: input.cutProtocol?.sodium_instruction
      ?? input.cutProtocol?.fiber_instruction
      ?? input.hydration.message,
  };
}

function buildRecoveryDirective(
  input: BuildDailyMissionInput,
  riskState: MissionRiskState,
  trainingDirective: TrainingDirective,
): RecoveryDirective {
  const restrictions: string[] = [];
  const modalities: string[] = ['10-minute cooldown walk', '5 minutes nasal breathing'];

  if (riskState.level === 'high' || riskState.level === 'critical') {
    restrictions.push('Cut optional volume.', 'Keep non-essential conditioning light.');
  }
  if (input.macrocycleContext.isTravelWindow) {
    modalities.push('Pack hydration early', 'Use mobility breaks during travel');
  }
  if (input.cutProtocol?.training_intensity_cap != null && input.cutProtocol.training_intensity_cap <= 4) {
    restrictions.push('No extra conditioning after the planned work.');
  }
  if (trainingDirective.sessionRole === 'recover' || trainingDirective.sessionRole === 'cut_protect') {
    modalities.push('Mobility reset', 'Early bedtime');
  }
  if (trainingDirective.isMandatoryRecovery) {
    restrictions.push('Do not swap in harder work or add extra volume.');
  }

  return {
    emphasis: riskState.level === 'low'
      ? 'Recover well so tomorrow can stay productive.'
      : trainingDirective.isMandatoryRecovery
        ? 'Recovery is mandatory today. Do not negotiate with the redline.'
        : 'Recovery is part of today\'s workload. Treat it as mandatory.',
    sleepTargetHours: riskState.level === 'low' ? 8 : 9,
    modalities,
    restrictions,
  };
}

function buildOverrideState(input: BuildDailyMissionInput): MissionOverride {
  const hasModifiedActivity = input.scheduledActivities.some((activity) =>
    activity.status === 'skipped' || activity.status === 'modified',
  );
  const status = hasModifiedActivity || input.weeklyPlanEntry?.status === 'rescheduled'
    ? 'override_applied'
    : input.weeklyPlanEntry?.status === 'completed'
      ? 'following_plan'
      : 'override_available';

  return {
    status,
    note: status === 'override_applied'
      ? 'Today already includes a user override or manual schedule change.'
      : status === 'override_available'
        ? 'You can override today, but the mission is already adjusted for current context.'
        : 'Today is aligned with the plan.',
  };
}

function buildDecisionTrace(
  input: BuildDailyMissionInput,
  riskState: MissionRiskState,
  trainingDirective: TrainingDirective,
  fuelDirective: FuelDirective,
): DecisionTraceItem[] {
  const depletionInterpretation = getCutDepletionInterpretation(input, fuelDirective);
  const sodiumRestrictionInterpretation = getSodiumRestrictionInterpretation(input);
  const trace: DecisionTraceItem[] = [
    {
      subsystem: 'objective',
      title: 'Objective anchor',
      detail: input.macrocycleContext.performanceObjective.primaryOutcome,
      humanInterpretation: null,
      impact: 'kept',
    },
  ];

  if (input.macrocycleContext.campPhase) {
    trace.push({
      subsystem: 'training',
      title: 'Camp phase routing',
      detail: `${titleize(input.macrocycleContext.campPhase)} phase shifted today toward ${trainingDirective.sessionRole.replace(/_/g, ' ')} work.`,
      humanInterpretation: trainingDirective.isMandatoryRecovery
        ? 'The engine has taken the keys for today. Recovery comes first.'
        : null,
      impact: input.macrocycleContext.campPhase === 'taper' ? 'restricted' : 'adjusted',
    });
  }

  if (input.cutProtocol) {
    const phaseName = (input.cutProtocol as any).cut_phase || (input.cutProtocol as any).cutPhase || 'active_cut';
    trace.push({
      subsystem: 'fuel',
      title: 'Cut protocol authority',
      detail: `Macros, hydration, and training cap are being overridden by the active cut protocol for ${titleize(phaseName)}.`,
      humanInterpretation: depletionInterpretation,
      impact: 'restricted',
    });
    if (sodiumRestrictionInterpretation) {
      trace.push({
        subsystem: 'hydration',
        title: 'Sodium restriction',
        detail: input.cutProtocol?.sodium_instruction ?? 'Sodium is being restricted to accelerate the water cut.',
        humanInterpretation: sodiumRestrictionInterpretation,
        impact: 'restricted',
      });
    }
  } else {
    trace.push({
      subsystem: 'fuel',
      title: 'Fuel timing match',
      detail: `${fuelDirective.preSessionCarbsG}g pre-session carbs and ${fuelDirective.postSessionProteinG}g post-session protein are matched to today's training demand.`,
      humanInterpretation: depletionInterpretation,
      impact: 'adjusted',
    });
  }

  if (input.nutritionTargets.fuelingFloorTriggered) {
    trace.push({
      subsystem: 'fuel',
      title: 'Fueling floor protection',
      detail: input.nutritionTargets.traceLines[0] ?? 'The engine raised calories to protect minimum training-day energy availability.',
      humanInterpretation: input.nutritionTargets.safetyWarning === 'critical_energy_availability'
        ? 'Fuel was raised to avoid a dangerous low-energy state.'
        : null,
      impact: 'restricted',
    });
  }

  if (riskState.level !== 'low') {
    trace.push({
      subsystem: 'risk',
      title: 'Risk control',
      detail: trainingDirective.reason,
      humanInterpretation: riskState.anchorSummary ?? getAcwrInterpretation(input.acwr.status),
      impact: riskState.level === 'critical' ? 'escalated' : 'restricted',
    });
  }

  if (input.medStatus && input.medStatus.overall !== 'on_track') {
    trace.push({
      subsystem: 'training',
      title: 'MED protection',
      detail: input.medStatus.summary,
      humanInterpretation: 'The week still needs key exposure touches, so today keeps the intent alive with safer substitutions.',
      impact: 'adjusted',
    });
  }

  if (input.macrocycleContext.isTravelWindow) {
    trace.push({
      subsystem: 'recovery',
      title: 'Travel adjustment',
      detail: 'Recovery and hydration are being emphasized because travel is active.',
      humanInterpretation: null,
      impact: 'adjusted',
    });
  }

  const activeActivities = input.scheduledActivities.filter((activity) => activity.status !== 'skipped');
  if (activeActivities.length >= 2) {
    const sortedActivities = [...activeActivities].sort((a, b) => b.expected_intensity - a.expected_intensity);
    const first = mapActivityToSessionType(sortedActivities[0].activity_type);
    const second = mapActivityToSessionType(sortedActivities[1].activity_type);
    const penalty = getInterferencePenalty(first, second, 4);
    if (penalty > 1.15) {
      trace.push({
        subsystem: 'training',
        title: 'Session interference check',
        detail: `Same-day sequencing penalty detected (${penalty.toFixed(2)}x). Separate the harder sessions or downshift the second effort.`,
        humanInterpretation: 'Two demanding sessions are stacked too tightly to treat as independent.',
        impact: 'restricted',
      });
    }
  }

  return trace;
}

function buildHeadline(trainingDirective: TrainingDirective, riskState: MissionRiskState): string {
  const roleLabel = titleize(trainingDirective.sessionRole);
  if (trainingDirective.interventionState === 'hard') return `${roleLabel}: mandatory recovery lock`;
  if (trainingDirective.interventionState === 'soft') return `${roleLabel}: execute under intervention cap`;
  if (riskState.level === 'critical') return `${roleLabel}: protect freshness and make weight`;
  if (riskState.level === 'high') return `${roleLabel}: execute with tight control`;
  return `${roleLabel}: push the block forward`;
}

export function buildDailyMission(input: BuildDailyMissionInput): DailyMission {
  const riskState = buildRiskState(input);
  const trainingDirective = buildTrainingDirective(input, riskState);
  const fuelDirective = buildFuelDirective(input, trainingDirective, riskState);
  const hydrationDirective = buildHydrationDirective(input);
  const recoveryDirective = buildRecoveryDirective(input, riskState, trainingDirective);
  const overrideState = buildOverrideState(input);
  const decisionTrace = buildDecisionTrace(input, riskState, trainingDirective, fuelDirective);

  return {
    date: input.date,
    engineVersion: DAILY_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    headline: buildHeadline(trainingDirective, riskState),
    summary: `${trainingDirective.interventionState === 'none' ? trainingDirective.intent : trainingDirective.reason} ${fuelDirective.message}`,
    objective: input.macrocycleContext.performanceObjective,
    macrocycleContext: input.macrocycleContext,
    readinessProfile: input.readinessProfile,
    trainingDirective,
    fuelDirective,
    hydrationDirective,
    recoveryDirective,
    riskState,
    decisionTrace,
    overrideState,
  };
}

export function buildMicrocyclePlan(input: BuildMicrocyclePlanInput): WeeklyMissionPlan {
  const entries = input.entries.map((entry) => {
    const sameDayEntries = input.entries.filter((candidate) => candidate.date === entry.date);
    const mission = buildDailyMission({
      date: entry.date,
      macrocycleContext: {
        ...input.macrocycleContext,
        date: entry.date,
      },
      readinessState: input.readinessState,
      readinessProfile: input.readinessProfile,
      constraintSet: input.constraintSet,
      acwr: input.acwr,
      nutritionTargets: input.baseNutritionTargets,
      hydration: input.hydration,
      scheduledActivities: sameDayEntries.map((candidate) => ({
        date: candidate.date,
        activity_type: candidate.session_type as MissionScheduledActivity['activity_type'],
        estimated_duration_min: candidate.estimated_duration_min,
        expected_intensity: candidate.target_intensity ?? 5,
        status: candidate.status === 'planned' ? 'scheduled' : candidate.status === 'rescheduled' ? 'modified' : candidate.status,
      })),
      cutProtocol: null,
      workoutPrescription: entry.prescription_snapshot ?? null,
      weeklyPlanEntry: entry,
      medStatus: input.medStatus ?? null,
    });

    return {
      ...entry,
      daily_mission_snapshot: mission,
    };
  });

  return {
    entries,
    headline: `${titleize(input.macrocycleContext.performanceObjective.goalType)} microcycle`,
    summary: `${entries.length} sessions aligned to ${input.macrocycleContext.performanceObjective.primaryOutcome.toLowerCase()}.`,
  };
}
