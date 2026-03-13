import type {
  BuildDailyMissionInput,
  BuildMicrocyclePlanInput,
  DailyMission,
  DecisionTraceItem,
  DirectiveSource,
  FuelDirective,
  HydrationDirective,
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
} from './types';

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
  if (campPhase === 'peak' || (intensityCap ?? 0) >= 8) return 'express';
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
      return `Stay sharp, stay fresh, and avoid carrying fatigue into the next key session.`;
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

function buildRiskState(input: BuildDailyMissionInput): MissionRiskState {
  const drivers = [...(input.riskDrivers ?? [])];
  let score = input.riskScore ?? 8;

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
  const intensityCap = input.cutProtocol?.training_intensity_cap
    ?? input.weeklyPlanEntry?.target_intensity
    ?? null;
  const hasSparring = input.scheduledActivities.some((activity) => activity.activity_type === 'sparring');
  const sessionRole = inferSessionRole({
    campPhase: input.macrocycleContext.campPhase,
    focus,
    intensityCap,
    isOnActiveCut: input.macrocycleContext.isOnActiveCut,
    hasSparring,
  });
  const source: DirectiveSource = input.cutProtocol ? 'weight_cut_protocol'
    : input.weeklyPlanEntry?.prescription_snapshot ? 'weekly_plan_snapshot'
      : 'daily_engine';

  return {
    sessionRole,
    focus,
    workoutType,
    intent: getRoleIntent(sessionRole, input.macrocycleContext.performanceObjective.primaryOutcome, focus),
    reason: riskState.level === 'low'
      ? `Today supports ${input.macrocycleContext.performanceObjective.primaryOutcome.toLowerCase()} with a clear execution window.`
      : `Today is being controlled to respect ${riskState.drivers[0].toLowerCase()}`,
    intensityCap,
    durationMin,
    volumeTarget: summarizeVolume(durationMin, input.workoutPrescription?.exercises.length ?? 0),
    keyQualities: getKeyQualities(sessionRole, focus),
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
  const highDemand = intensity >= 7 || durationMin >= 70 || trainingDirective.sessionRole === 'express';
  const cutProtected = input.cutProtocol?.training_intensity_cap != null && input.cutProtocol.training_intensity_cap <= 4;

  const preSessionCarbsG = cutProtected ? 20 : highDemand ? 55 : trainingDirective.sessionRole === 'recover' ? 20 : 35;
  const postSessionProteinG = durationMin >= 60 ? 40 : 30;
  const intraSessionHydrationOz = Math.max(12, Math.round(durationMin / 3) + (trainingCount > 1 ? 8 : 0));

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
    ? `Cut protocol is leading intake today. Hit the exact macro and hydration targets to keep weight on line.`
    : compliancePriority === 'performance'
      ? `Fuel the key work first. Front-load carbs before training and get protein in quickly after.`
      : compliancePriority === 'recovery'
        ? `Keep intake steady to support recovery and avoid digging fatigue deeper.`
        : `Stay on plan and treat nutrition consistency as part of the block.`;

  return {
    calories: input.nutritionTargets.adjustedCalories,
    protein: input.nutritionTargets.protein,
    carbs: input.nutritionTargets.carbs,
    fat: input.nutritionTargets.fat,
    preSessionCarbsG,
    postSessionProteinG,
    intraSessionHydrationOz,
    sodiumTargetMg: input.cutProtocol?.sodium_target_mg ?? null,
    compliancePriority,
    source,
    message,
  };
}

function buildHydrationDirective(input: BuildDailyMissionInput): HydrationDirective {
  const waterTargetOz = input.cutProtocol?.water_target_oz ?? input.hydration.dailyWaterOz;
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

  return {
    emphasis: riskState.level === 'low'
      ? 'Recover well so tomorrow can stay productive.'
      : 'Recovery is part of today’s workload. Treat it as mandatory.',
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
  const trace: DecisionTraceItem[] = [
    {
      subsystem: 'objective',
      title: 'Objective anchor',
      detail: input.macrocycleContext.performanceObjective.primaryOutcome,
      impact: 'kept',
    },
  ];

  if (input.macrocycleContext.campPhase) {
    trace.push({
      subsystem: 'training',
      title: 'Camp phase routing',
      detail: `${titleize(input.macrocycleContext.campPhase)} phase shifted today toward ${trainingDirective.sessionRole.replace(/_/g, ' ')} work.`,
      impact: input.macrocycleContext.campPhase === 'taper' ? 'restricted' : 'adjusted',
    });
  }

  if (input.cutProtocol) {
    trace.push({
      subsystem: 'fuel',
      title: 'Cut protocol authority',
      detail: `Macros, hydration, and training cap are being overridden by the active cut protocol for ${titleize(input.cutProtocol.cut_phase)}.`,
      impact: 'restricted',
    });
  } else {
    trace.push({
      subsystem: 'fuel',
      title: 'Fuel timing match',
      detail: `${fuelDirective.preSessionCarbsG}g pre-session carbs and ${fuelDirective.postSessionProteinG}g post-session protein are matched to today’s training demand.`,
      impact: 'adjusted',
    });
  }

  if (riskState.level !== 'low') {
    trace.push({
      subsystem: 'risk',
      title: 'Risk control',
      detail: riskState.drivers[0],
      impact: riskState.level === 'critical' ? 'escalated' : 'restricted',
    });
  }

  if (input.macrocycleContext.isTravelWindow) {
    trace.push({
      subsystem: 'recovery',
      title: 'Travel adjustment',
      detail: 'Recovery and hydration are being emphasized because travel is active.',
      impact: 'adjusted',
    });
  }

  return trace;
}

function buildHeadline(trainingDirective: TrainingDirective, riskState: MissionRiskState): string {
  const roleLabel = titleize(trainingDirective.sessionRole);
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
    headline: buildHeadline(trainingDirective, riskState),
    summary: `${trainingDirective.intent} ${fuelDirective.message}`,
    objective: input.macrocycleContext.performanceObjective,
    macrocycleContext: input.macrocycleContext,
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
