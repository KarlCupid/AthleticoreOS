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
  MissionProtectWindow,
  RecoveryDirective,
  TrainingDirective,
  TrainingSessionRole,
  WeeklyMissionPlan,
  WorkoutFocus,
  WorkoutType,
} from './types.ts';
import { getInterferencePenalty, type SessionType } from './load/interferenceModel.ts';
import {
  FIGHT_CAMP_SAFETY_POLICY,
  getFightCampSodiumRestrictionInterpretation,
  getSafeFightCampSodiumRestrictionDetail,
} from './safety/policy.ts';

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

function inferFocusFromActivity(
  activityType: MissionScheduledActivity['activity_type'] | null | undefined,
): WorkoutFocus | null {
  switch (activityType) {
    case 'conditioning':
    case 'road_work':
    case 'running':
      return 'conditioning';
    case 'active_recovery':
      return 'recovery';
    default:
      return null;
  }
}

function normalizeWorkoutFocus(focus: TrainingDirective['focus']): WorkoutFocus | null {
  if (focus === 'strength') return 'full_body';
  return focus ?? null;
}

function getPrimaryScheduledActivity(input: BuildDailyMissionInput): MissionScheduledActivity | null {
  const activeActivities = input.scheduledActivities.filter((activity) => activity.status !== 'skipped');
  if (activeActivities.length === 0) return null;
  return [...activeActivities].sort((a, b) => {
    const rank = (activityType: MissionScheduledActivity['activity_type']) =>
      activityType === 'sparring'
        ? 0
        : activityType === 'boxing_practice'
          ? 1
          : activityType === 'conditioning' || activityType === 'road_work' || activityType === 'running'
            ? 2
            : activityType === 'sc'
              ? 3
              : 4;
    const rankDelta = rank(a.activity_type) - rank(b.activity_type);
    if (rankDelta !== 0) return rankDelta;
    return (b.expected_intensity ?? 0) - (a.expected_intensity ?? 0);
  })[0] ?? null;
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

  if ((intensityCap ?? 10) <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap) {
    return isOnActiveCut ? 'cut_protect' : 'recover';
  }
  if (campPhase === 'taper') return 'taper_sharpen';
  if (hasSparring) return 'spar_support';
  if (campPhase === 'peak') return 'express';
  if (campPhase === 'build' || campPhase === 'base') return 'develop';
  if ((intensityCap ?? 0) >= FIGHT_CAMP_SAFETY_POLICY.intervention.expressIntensityFloor && !isOnActiveCut) return 'express';
  if (focus === 'recovery') return 'recover';
  return 'develop';
}

function isCombatActivity(
  activityType: MissionScheduledActivity['activity_type'] | null | undefined,
): boolean {
  return activityType === 'sparring' || activityType === 'boxing_practice';
}

function isHighRiskLevel(level: MissionRiskLevel | null | undefined): boolean {
  return level === 'high' || level === 'critical';
}

function getUnderlyingRiskLevel(riskState: MissionRiskState): MissionRiskLevel {
  return riskState.underlyingLevel ?? riskState.level;
}

export function deriveProtectWindowFromRecentMissions(
  missions: Array<{
    date: string;
    trainingDirective: Pick<TrainingDirective, 'interventionState'>;
    riskState: MissionRiskState;
  }>,
): MissionProtectWindow | null {
  const recent = [...missions]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-3);
  const recentInterventionDays = recent.filter((mission) => mission.trainingDirective.interventionState !== 'none').length;
  const recentHighRiskDays = recent.filter((mission) => isHighRiskLevel(getUnderlyingRiskLevel(mission.riskState))).length;

  if (recentInterventionDays < 2 && recentHighRiskDays < 2) {
    return null;
  }

  const reasons: string[] = [];
  if (recentInterventionDays >= 2) {
    reasons.push(`${recentInterventionDays} interventions landed in the last 3 days`);
  }
  if (recentHighRiskDays >= 2) {
    reasons.push(`${recentHighRiskDays} high-risk days landed in the last 3 days`);
  }

  return {
    active: true,
    reason: `Protect window is active because ${reasons.join(' and ')}.`,
    recentInterventionDays,
    recentHighRiskDays,
    sourceDates: recent.map((mission) => mission.date),
  };
}

function resolveProtectWindowRole(input: {
  protectWindow: MissionProtectWindow | null | undefined;
  intensityCap: number | null;
  isOnActiveCut: boolean;
  hasCombatAnchor: boolean;
}): TrainingSessionRole | null {
  const { protectWindow, intensityCap, isOnActiveCut, hasCombatAnchor } = input;
  if (!protectWindow?.active) return null;
  if (isOnActiveCut && (intensityCap ?? 10) <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap) return 'cut_protect';
  if (hasCombatAnchor && (intensityCap ?? 10) > FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap) return 'spar_support';
  return isOnActiveCut ? 'cut_protect' : 'recover';
}

function getRoleIntent(role: TrainingSessionRole, objective: string, focus: WorkoutFocus | null): string {
  const focusLabel = focus ? titleize(focus) : 'Performance';
  switch (role) {
    case 'rest':
      return 'No training is scheduled today. Let the block absorb and protect tomorrow\'s quality.';
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
    case 'rest':
      return ['Recovery', 'Baseline habits', 'Readiness'];
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
  if (riskState.level === 'critical') {
    return {
      interventionState: 'hard',
      enforcedIntensityCap: plannedIntensityCap === null
        ? FIGHT_CAMP_SAFETY_POLICY.intervention.hardIntensityCap
        : Math.min(plannedIntensityCap, FIGHT_CAMP_SAFETY_POLICY.intervention.hardIntensityCap),
      forcedSessionRole: 'recover',
      isMandatoryRecovery: true,
      reason: 'Critical risk is active. Recovery is mandatory today to stop the fatigue spiral.',
    };
  }

  if (riskState.level === 'high') {
    return {
      interventionState: 'soft',
      enforcedIntensityCap: plannedIntensityCap === null
        ? FIGHT_CAMP_SAFETY_POLICY.intervention.softIntensityCap
        : Math.min(plannedIntensityCap, FIGHT_CAMP_SAFETY_POLICY.intervention.softIntensityCap),
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
  if (status === 'redline') return 'ACWR is above redline. Protect the next session before loading again.';
  if (status === 'caution') return 'Load is elevated. Keep the next hard effort controlled and watch recovery.';
  return null;
}

function getCutDepletionInterpretation(
  input: BuildDailyMissionInput,
  fuelDirective: FuelDirective,
): string | null {
  const cutPhase = input.cutProtocol?.cut_phase ?? null;
  if (cutPhase === 'fight_week_cut' || cutPhase === 'intensified' || fuelDirective.state === 'cut_protect') {
    return 'Energy availability is constrained today, so output and decision speed may be lower than normal.';
  }

  return null;
}

function getSodiumRestrictionInterpretation(input: BuildDailyMissionInput): string | null {
  return getFightCampSodiumRestrictionInterpretation({
    sodiumTargetMg: input.cutProtocol?.sodium_target_mg ?? null,
    sodiumInstruction: input.cutProtocol?.sodium_instruction ?? null,
  });
}

function getSafeSodiumRestrictionDetail(input: BuildDailyMissionInput): string {
  return getSafeFightCampSodiumRestrictionDetail(input.cutProtocol?.sodium_instruction ?? null);
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

  if (
    input.cutProtocol?.training_intensity_cap != null
    && input.cutProtocol.training_intensity_cap <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap
  ) {
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

  let level: MissionRiskLevel = input.riskLevel ?? 'low';
  if (input.riskLevel == null) {
    if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.critical) level = 'critical';
    else if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.high) level = 'high';
    else if (score >= FIGHT_CAMP_SAFETY_POLICY.riskScore.moderate) level = 'moderate';
  } else {
    score = Math.max(
      score,
      input.riskLevel === 'critical'
        ? FIGHT_CAMP_SAFETY_POLICY.riskScore.critical
        : input.riskLevel === 'high'
          ? FIGHT_CAMP_SAFETY_POLICY.riskScore.high
          : input.riskLevel === 'moderate'
            ? FIGHT_CAMP_SAFETY_POLICY.riskScore.moderate
            : 0,
    );
  }

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
    campRiskLevel: input.riskLevel ?? null,
    campRiskSource: input.riskLevel != null ? 'explicit_level' : 'score_only',
    flags: input.readinessProfile.flags,
    anchorSummary: anchorSummary || null,
    underlyingLevel: null,
    displayOverride: null,
  };
}

function summarizeVolume(durationMin: number | null, exerciseCount: number): string {
  if (!durationMin && exerciseCount === 0) return 'Follow the planned work with strict quality standards.';
  if (!durationMin) return `${exerciseCount} planned exercises.`;
  return `${durationMin} min target with ${exerciseCount} main exercise${exerciseCount === 1 ? '' : 's'}.`;
}

function buildTrainingDirective(input: BuildDailyMissionInput, riskState: MissionRiskState): TrainingDirective {
  const primaryScheduledActivity = getPrimaryScheduledActivity(input);
  const activeScheduledActivities = input.scheduledActivities.filter((activity) => activity.status !== 'skipped');
  const hasCombatAnchor = activeScheduledActivities.some((activity) => isCombatActivity(activity.activity_type));
  const plannedFocus = normalizeWorkoutFocus(
    input.workoutPrescription?.focus
    ?? input.weeklyPlanEntry?.focus
    ?? inferFocusFromActivity(primaryScheduledActivity?.activity_type)
    ?? null,
  );
  const plannedWorkoutType = input.workoutPrescription?.workoutType
    ?? inferWorkoutType(input.weeklyPlanEntry?.session_type)
    ?? inferWorkoutType(primaryScheduledActivity?.activity_type);
  const plannedDurationMin = input.weeklyPlanEntry?.estimated_duration_min
    ?? input.workoutPrescription?.estimatedDurationMin
    ?? primaryScheduledActivity?.estimated_duration_min
    ?? null;
  const plannedIntensityCap = input.cutProtocol?.training_intensity_cap
    ?? input.constraintSet.hardCaps.intensityCap
    ?? input.weeklyPlanEntry?.target_intensity
    ?? primaryScheduledActivity?.expected_intensity
    ?? null;
  const isTrueRestDay = input.weeklyPlanEntry == null
    && input.workoutPrescription == null
    && activeScheduledActivities.length === 0;
  const intervention = checkInterventionStatus(riskState, plannedIntensityCap);
  const intensityCap = intervention.enforcedIntensityCap;

  const hasSparring = input.scheduledActivities.some((activity) => activity.activity_type === 'sparring');
  const source: DirectiveSource = input.cutProtocol ? 'weight_cut_protocol'
    : input.weeklyPlanEntry?.prescription_snapshot ? 'weekly_plan_snapshot'
      : 'daily_engine';

  if (isTrueRestDay) {
    return {
      sessionRole: 'rest',
      interventionState: intervention.interventionState,
      isMandatoryRecovery: intervention.isMandatoryRecovery,
      focus: null,
      workoutType: null,
      intent: getRoleIntent('rest', input.macrocycleContext.performanceObjective.primaryOutcome, null),
      reason: intervention.reason
        ? `${intervention.reason} No training is scheduled today, so the engine is keeping the day fully off.`
        : riskState.level === 'low'
          ? 'No guided or scheduled training is assigned today. Keep the day truly restorative.'
          : `No training is scheduled today, so the engine is protecting recovery while respecting ${riskState.drivers[0].toLowerCase()}`,
      intensityCap: null,
      durationMin: 0,
      volumeTarget: 'No workout prescribed today.',
      keyQualities: getKeyQualities('rest', null),
      constraintSet: input.constraintSet,
      medStatus: input.medStatus ?? null,
      source,
      prescription: null,
    };
  }

  const inferredRole = inferSessionRole({
    campPhase: input.macrocycleContext.campPhase,
    focus: plannedFocus,
    intensityCap: plannedIntensityCap,
    isOnActiveCut: input.macrocycleContext.isOnActiveCut,
    hasSparring,
  });
  const protectWindowRole = intervention.interventionState === 'hard'
    ? null
    : resolveProtectWindowRole({
        protectWindow: input.protectWindow,
        intensityCap,
        isOnActiveCut: input.macrocycleContext.isOnActiveCut,
        hasCombatAnchor,
      });
  const softCombatRole = intervention.interventionState === 'soft' && hasCombatAnchor
    ? (input.macrocycleContext.isOnActiveCut && (intensityCap ?? 10) <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap
      ? 'cut_protect'
      : 'spar_support')
    : null;
  const sessionRole = intervention.forcedSessionRole ?? protectWindowRole ?? softCombatRole ?? inferredRole;
  const isProtectCutWindow = sessionRole === 'cut_protect'
    && input.macrocycleContext.isOnActiveCut
    && (intensityCap ?? 10) <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap;
  const focus = sessionRole === 'recover' || isProtectCutWindow ? 'recovery' : plannedFocus;
  const workoutType = sessionRole === 'recover' || isProtectCutWindow ? 'recovery' : plannedWorkoutType;
  const durationMin = sessionRole === 'recover'
    ? Math.min(
        plannedDurationMin ?? (
          intervention.isMandatoryRecovery
            ? FIGHT_CAMP_SAFETY_POLICY.intervention.mandatoryRecoveryMaxDurationMin
            : FIGHT_CAMP_SAFETY_POLICY.intervention.softMaxDurationMin
        ),
        intervention.isMandatoryRecovery
          ? FIGHT_CAMP_SAFETY_POLICY.intervention.mandatoryRecoveryMaxDurationMin
          : FIGHT_CAMP_SAFETY_POLICY.intervention.softMaxDurationMin,
      )
    : sessionRole === 'cut_protect'
      && input.macrocycleContext.isOnActiveCut
      && (intensityCap ?? 10) <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap
      ? Math.max(
          FIGHT_CAMP_SAFETY_POLICY.intervention.constrainedMinDurationMin,
          Math.min(
            plannedDurationMin ?? FIGHT_CAMP_SAFETY_POLICY.intervention.cutProtectDefaultDurationMin,
            FIGHT_CAMP_SAFETY_POLICY.intervention.cutProtectMaxDurationMin,
          ),
        )
      : sessionRole === 'spar_support' && (protectWindowRole === 'spar_support' || softCombatRole === 'spar_support')
        ? Math.max(
            FIGHT_CAMP_SAFETY_POLICY.intervention.constrainedMinDurationMin,
            Math.min(
              plannedDurationMin ?? FIGHT_CAMP_SAFETY_POLICY.intervention.softMaxDurationMin,
              FIGHT_CAMP_SAFETY_POLICY.intervention.softMaxDurationMin,
            ),
          )
    : plannedDurationMin;
  const prescription = sessionRole === 'recover' || isProtectCutWindow ? null : input.workoutPrescription;
  const protectWindowReason = input.protectWindow?.active
    ? `${input.protectWindow.reason} Today is being routed through ${sessionRole.replace(/_/g, ' ')} work to keep the block from escalating.`
    : null;
  const combatSupportReason = softCombatRole != null
    ? 'Combat work is already anchored on the calendar, so elevated risk is being routed into support work instead of a normal build session.'
    : null;

  return {
    sessionRole,
    interventionState: intervention.interventionState,
    isMandatoryRecovery: intervention.isMandatoryRecovery,
    focus,
    workoutType,
    intent: getRoleIntent(sessionRole, input.macrocycleContext.performanceObjective.primaryOutcome, focus),
    reason: intervention.reason
      ? `${intervention.reason}${combatSupportReason ? ` ${combatSupportReason}` : ''}`
      : protectWindowReason
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
    prescription,
  };
}

function buildDisplayedRiskState(
  input: BuildDailyMissionInput,
  trainingDirective: TrainingDirective,
  stateRisk: MissionRiskState,
): MissionRiskState {
  const activeScheduledActivities = input.scheduledActivities.filter((activity) => activity.status !== 'skipped');
  const isTrueRestDay = trainingDirective.sessionRole === 'rest'
    && trainingDirective.workoutType == null
    && activeScheduledActivities.length === 0;

  if (!isTrueRestDay) return stateRisk;

  return {
    ...stateRisk,
    level: 'low',
    score: Math.min(stateRisk.score, 15),
    label: 'Recovery window',
    underlyingLevel: stateRisk.level,
    displayOverride: 'rest_day_recovery_window',
  };
}

function buildFuelDirective(
  input: BuildDailyMissionInput,
  trainingDirective: TrainingDirective,
  riskState: MissionRiskState,
): FuelDirective {
  const fuelState = input.nutritionTargets.fuelState;
  const demandScore = input.nutritionTargets.sessionDemandScore;
  const isRestDay = trainingDirective.sessionRole === 'rest';
  const sessionFuelingPlan = isRestDay
    ? {
        priority: 'recovery' as const,
        priorityLabel: 'Rest day',
        sessionLabel: 'Rest day',
        preSession: { label: 'Before training', timing: 'No timed pre-session fueling needed', carbsG: 0, proteinG: 0, notes: [] },
        intraSession: { fluidsOz: 0, electrolytesMg: null, carbsG: 0, notes: [] },
        betweenSessions: null,
        postSession: { label: 'Meals', timing: 'Use normal meals across the day', carbsG: 0, proteinG: 25, notes: [] },
        hydrationNotes: [],
        coachingNotes: [],
      }
    : input.nutritionTargets.sessionFuelingPlan;
  const hasMultipleSessions = input.scheduledActivities.filter((activity) => activity.status !== 'skipped').length > 1;
  const highDemand = trainingDirective.sessionRole === 'express' || demandScore >= 60 || sessionFuelingPlan.priority === 'double_session' || sessionFuelingPlan.priority === 'sparring';
  const preSessionCarbsG = sessionFuelingPlan.preSession.carbsG;
  const intraSessionCarbsG = sessionFuelingPlan.intraSession.carbsG;
  const postSessionProteinG = sessionFuelingPlan.postSession.proteinG;
  const intraSessionHydrationOz = sessionFuelingPlan.intraSession.fluidsOz;

  let compliancePriority: FuelDirective['compliancePriority'] = 'consistency';
  if (input.cutProtocol || input.macrocycleContext.weightCutState === 'driving') compliancePriority = 'weight';
  else if (!isRestDay && (riskState.level === 'high' || riskState.level === 'critical')) compliancePriority = 'recovery';
  else if (highDemand || hasMultipleSessions) compliancePriority = 'performance';

  const source: DirectiveSource = input.cutProtocol
    ? 'weight_cut_protocol'
    : input.weeklyPlanEntry?.prescription_snapshot
      ? 'weekly_plan_snapshot'
      : 'daily_engine';
  let message = input.cutProtocol
    ? (isRestDay
      ? 'No training window is scheduled today. Hit the cut targets through normal meals and hydration to keep weight on line.'
      : 'Cut protocol is leading intake today. Hit the exact macro and hydration targets to keep weight on line.')
    : isRestDay
      ? 'No training fueling window is needed today. Use normal meals and hydration to absorb the block.'
    : compliancePriority === 'performance'
      ? 'Fuel the key work first. Front-load carbs before training and keep recovery intake tight after the session.'
      : compliancePriority === 'recovery'
        ? 'Keep intake steady to support recovery and avoid digging fatigue deeper.'
        : 'Stay on plan and treat nutrition consistency as part of the block.';
  if (input.nutritionTargets.recoveryNutritionFocus === 'hydration_restore') {
    message += ' Low-energy or dehydration signs are present, so fluids and easy carbs matter more than perfect meal variety today.';
  } else if (input.nutritionTargets.recoveryNutritionFocus === 'impact_recovery') {
    message += ' Protein timing matters today because tissue recovery is part of the workload.';
  }
  const weightDriftLbs = input.cutProtocol?.weight_drift_lbs ?? null;
  const hasDriftCorrection = weightDriftLbs != null && weightDriftLbs > 0.5;

  return {
    state: isRestDay ? 'rest' as const : fuelState,
    prioritySession: isRestDay ? 'recovery' : input.nutritionTargets.prioritySession,
    deficitClass: input.nutritionTargets.deficitClass,
    recoveryNutritionFocus: input.nutritionTargets.recoveryNutritionFocus,
    sessionDemandScore: isRestDay ? 0 : demandScore,
    calories: input.nutritionTargets.adjustedCalories,
    protein: input.nutritionTargets.protein,
    carbs: input.nutritionTargets.carbs,
    fat: input.nutritionTargets.fat,
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
    sessionFuelingPlan,
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
  const message = input.cutProtocol?.sodium_instruction
    ? getSafeSodiumRestrictionDetail(input)
    : input.cutProtocol?.fiber_instruction
      ?? input.hydration.message;

  return {
    waterTargetOz: Math.round(waterTargetOz),
    sodiumTargetMg,
    protocol,
    message,
  };
}

function buildRecoveryDirective(
  input: BuildDailyMissionInput,
  riskState: MissionRiskState,
  trainingDirective: TrainingDirective,
): RecoveryDirective {
  const isRestDay = trainingDirective.sessionRole === 'rest';
  const restrictions: string[] = [];
  const modalities: string[] = ['10-minute cooldown walk', '5 minutes nasal breathing'];

  if (!isRestDay && (riskState.level === 'high' || riskState.level === 'critical')) {
    restrictions.push('Cut optional volume.', 'Keep non-essential conditioning light.');
  }
  if (input.macrocycleContext.isTravelWindow) {
    modalities.push('Pack hydration early', 'Use mobility breaks during travel');
  }
  if (
    input.cutProtocol?.training_intensity_cap != null
    && input.cutProtocol.training_intensity_cap <= FIGHT_CAMP_SAFETY_POLICY.intervention.protectIntensityCap
  ) {
    restrictions.push('No extra conditioning after the planned work.');
  }
  if (trainingDirective.sessionRole === 'recover' || trainingDirective.sessionRole === 'cut_protect') {
    modalities.push('Mobility reset', 'Early bedtime');
  }
  if (trainingDirective.isMandatoryRecovery) {
    restrictions.push('Do not swap in harder work or add extra volume.');
  }
  if (isRestDay) {
    modalities.push('Stay off the training floor', 'Use a light walk only if it helps you recover');
    restrictions.push('Do not add make-up work just because the calendar looks open.');
  }

  return {
    emphasis: isRestDay
      ? trainingDirective.isMandatoryRecovery
        ? 'Rest day is locked in. Let the system calm down and do not add training.'
        : 'No training today. Absorb the work already done and protect tomorrow.'
      : riskState.level === 'low'
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
      detail: trainingDirective.sessionRole === 'rest'
        ? `${titleize(input.macrocycleContext.campPhase)} phase carries no planned training today, so the engine kept the day as rest.`
        : `${titleize(input.macrocycleContext.campPhase)} phase shifted today toward ${trainingDirective.sessionRole.replace(/_/g, ' ')} work.`,
      humanInterpretation: trainingDirective.isMandatoryRecovery
        ? 'The engine has taken the keys for today. Recovery comes first.'
        : null,
      impact: input.macrocycleContext.campPhase === 'taper' ? 'restricted' : 'adjusted',
    });
  }

  if (input.cutProtocol) {
    const phaseName = input.cutProtocol.cut_phase || 'active_cut';
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
        detail: getSafeSodiumRestrictionDetail(input),
        humanInterpretation: sodiumRestrictionInterpretation,
        impact: 'restricted',
      });
    }
  } else {
    trace.push({
      subsystem: 'fuel',
      title: 'Fuel timing match',
      detail: trainingDirective.sessionRole === 'rest'
        ? 'Rest day nutrition stays on baseline meals and hydration. No timed training fuel is required.'
        : `${fuelDirective.sessionFuelingPlan?.priorityLabel ?? 'Training'} is supported with ${fuelDirective.preSessionCarbsG}g pre-session carbs, ${fuelDirective.intraSessionHydrationOz} oz fluids during training, and ${fuelDirective.postSessionProteinG}g protein after.`,
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

  if (input.protectWindow?.active) {
    trace.push({
      subsystem: 'risk',
      title: 'Protect window',
      detail: input.protectWindow.reason,
      humanInterpretation: 'The recent trend is unstable, so the engine is pulling stress down before it turns into another intervention cycle.',
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
  if (trainingDirective.sessionRole === 'rest') {
    if (trainingDirective.interventionState === 'hard') return 'Rest Day: mandatory recovery lock';
    if (trainingDirective.interventionState === 'soft') return 'Rest Day: hold the line';
    return 'Rest Day: absorb the block';
  }
  if (trainingDirective.interventionState === 'hard') return `${roleLabel}: mandatory recovery lock`;
  if (trainingDirective.interventionState === 'soft') return `${roleLabel}: execute under intervention cap`;
  if (riskState.level === 'critical') return `${roleLabel}: protect freshness and make weight`;
  if (riskState.level === 'high') return `${roleLabel}: execute with tight control`;
  return `${roleLabel}: push the block forward`;
}

export function buildDailyMission(input: BuildDailyMissionInput): DailyMission {
  const stateRisk = buildRiskState(input);
  const trainingDirective = buildTrainingDirective(input, stateRisk);
  const riskState = buildDisplayedRiskState(input, trainingDirective, stateRisk);
  const fuelDirective = buildFuelDirective(input, trainingDirective, stateRisk);
  const hydrationDirective = buildHydrationDirective(input);
  const recoveryDirective = buildRecoveryDirective(input, stateRisk, trainingDirective);
  const overrideState = buildOverrideState(input);
  const decisionTrace = buildDecisionTrace(input, stateRisk, trainingDirective, fuelDirective);

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
