import type {
  AthleteTrainingArchetype,
  CombatSportContext,
  PlannedSessionIntent,
  PlannedSessionRole,
  ProgramPhase,
  ProtectedWorkoutInput,
  ProtectedWorkoutModality,
  WeeklyTrainingDosePrescription,
  WorkoutIntensity,
  WorkoutReadinessBand,
} from './types.ts';

interface BaseWeeklyDose {
  generatedSessionTarget: number;
  strengthPowerTarget: number;
  aerobicSupportTarget: number;
  conditioningSupportTarget: number;
  mobilityPrehabTarget: number;
  recoveryTarget: number;
  hardDayTarget: number;
  hardDayCap: number;
}

export function inferProtectedWorkoutModality(workout: Pick<ProtectedWorkoutInput, 'label' | 'modality'>): ProtectedWorkoutModality {
  if (workout.modality) return workout.modality;
  const label = workout.label.toLowerCase();
  if (/sparring|spar/.test(label)) return 'sparring';
  if (/fight|bout|match|competition|tournament/.test(label)) return 'competition';
  if (/boxing|mma|grappling|wrestling|muay|jiu|skill|technique|pads|bag/.test(label)) return 'sport_skill';
  if (/condition|interval|hiit|metcon/.test(label)) return 'conditioning';
  if (/strength|lift|weights/.test(label)) return 'strength';
  if (/power|plyo|sprint/.test(label)) return 'power';
  if (/zone ?2|roadwork|run|bike|aerobic/.test(label)) return 'zone2';
  if (/mobility|prehab|durability/.test(label)) return 'mobility';
  if (/recovery|breath|walk/.test(label)) return 'recovery';
  return 'unknown';
}

export function protectedWorkoutEstimatedRpe(workout: ProtectedWorkoutInput): number {
  if (workout.estimatedRpe != null && Number.isFinite(workout.estimatedRpe)) {
    return Math.max(1, Math.min(10, workout.estimatedRpe));
  }
  if (workout.intensity === 'hard') return 8;
  if (workout.intensity === 'moderate') return 6;
  if (workout.intensity === 'low') return 3;
  return 2;
}

export function protectedWorkoutLoadScore(workout: ProtectedWorkoutInput): number {
  if (workout.loadScore != null && Number.isFinite(workout.loadScore)) return Math.max(0, workout.loadScore);
  return Math.round(workout.durationMinutes * protectedWorkoutEstimatedRpe(workout));
}

export function protectedWorkoutCountsAsHardDay(workout: ProtectedWorkoutInput): boolean {
  if (workout.countsAsHardDay != null) return workout.countsAsHardDay;
  const modality = inferProtectedWorkoutModality(workout);
  if (modality === 'sparring' || modality === 'competition') return true;
  return workout.intensity === 'hard' || protectedWorkoutEstimatedRpe(workout) >= 7;
}

export function resolveTrainingArchetype(input: {
  goalId: string;
  context?: CombatSportContext | undefined;
}): AthleteTrainingArchetype {
  if (input.context?.archetype) return input.context.archetype;
  if (input.context?.fightCampWeeksOut != null) return 'combat_fight_camp';
  if (/boxing|fight|combat|sparring|mma/.test(input.goalId)) return 'combat_beginner';
  return 'combat_beginner';
}

function baseDoseFor(
  archetype: AthleteTrainingArchetype,
  requestedGeneratedSessions: number | null,
  enforceCombatFloor: boolean,
): BaseWeeklyDose {
  if (archetype === 'general_fitness_legacy') {
    const generatedSessionTarget = Math.max(1, requestedGeneratedSessions ?? 3);
    return {
      generatedSessionTarget,
      strengthPowerTarget: Math.min(2, generatedSessionTarget),
      aerobicSupportTarget: generatedSessionTarget >= 3 ? 1 : 0,
      conditioningSupportTarget: 0,
      mobilityPrehabTarget: generatedSessionTarget >= 4 ? 1 : 0,
      recoveryTarget: 0,
      hardDayTarget: Math.min(2, generatedSessionTarget),
      hardDayCap: 3,
    };
  }

  const defaults = {
    combat_beginner: {
      generatedSessionTarget: 3,
      strengthPowerTarget: 2,
      aerobicSupportTarget: 1,
      conditioningSupportTarget: 0,
      mobilityPrehabTarget: 1,
      recoveryTarget: 0,
      hardDayTarget: 2,
      hardDayCap: 3,
    },
    combat_recreational: {
      generatedSessionTarget: 3,
      strengthPowerTarget: 2,
      aerobicSupportTarget: 1,
      conditioningSupportTarget: 0,
      mobilityPrehabTarget: 1,
      recoveryTarget: 0,
      hardDayTarget: 3,
      hardDayCap: 3,
    },
    combat_competitive: {
      generatedSessionTarget: 4,
      strengthPowerTarget: 2,
      aerobicSupportTarget: 1,
      conditioningSupportTarget: 1,
      mobilityPrehabTarget: 1,
      recoveryTarget: 0,
      hardDayTarget: 3,
      hardDayCap: 4,
    },
    combat_fight_camp: {
      generatedSessionTarget: 4,
      strengthPowerTarget: 2,
      aerobicSupportTarget: 1,
      conditioningSupportTarget: 1,
      mobilityPrehabTarget: 1,
      recoveryTarget: 0,
      hardDayTarget: 3,
      hardDayCap: 4,
    },
  } satisfies Record<Exclude<AthleteTrainingArchetype, 'general_fitness_legacy'>, BaseWeeklyDose>;

  const base = defaults[archetype];
  return {
    ...base,
    generatedSessionTarget: enforceCombatFloor
      ? Math.max(base.generatedSessionTarget, requestedGeneratedSessions ?? base.generatedSessionTarget)
      : requestedGeneratedSessions ?? base.generatedSessionTarget,
  };
}

function readinessAdjustedDose(input: {
  dose: BaseWeeklyDose;
  readinessBand: WorkoutReadinessBand;
  phase: ProgramPhase;
  fightCampWeeksOut: number | null;
  safetyFlags: readonly string[];
}): BaseWeeklyDose {
  const dose = { ...input.dose };
  const hasRestrictiveSafety = input.safetyFlags.some((flag) => (
    /acute|chest|red_flag|illness|poor_readiness|coach_review_needed/.test(flag)
  ));
  const fatigueFlag = input.safetyFlags.some((flag) => /high_fatigue|under_fueled|poor_sleep|high_soreness/.test(flag));

  if (input.fightCampWeeksOut != null && input.fightCampWeeksOut <= 1) {
    dose.generatedSessionTarget = Math.min(dose.generatedSessionTarget, 2);
    dose.strengthPowerTarget = Math.min(dose.strengthPowerTarget, 1);
    dose.conditioningSupportTarget = 0;
    dose.hardDayTarget = Math.min(dose.hardDayTarget, 1);
    dose.hardDayCap = Math.min(dose.hardDayCap, 2);
  } else if (input.fightCampWeeksOut != null && input.fightCampWeeksOut <= 2) {
    dose.generatedSessionTarget = Math.min(dose.generatedSessionTarget, 3);
    dose.hardDayCap = Math.min(dose.hardDayCap, 3);
  }

  if (input.phase === 'deload') {
    dose.generatedSessionTarget = Math.max(2, Math.min(dose.generatedSessionTarget, 3));
    dose.strengthPowerTarget = Math.min(dose.strengthPowerTarget, 1);
    dose.conditioningSupportTarget = 0;
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.recoveryTarget = Math.max(1, dose.recoveryTarget);
    dose.hardDayTarget = Math.min(dose.hardDayTarget, 1);
    dose.hardDayCap = Math.min(dose.hardDayCap, 2);
  }

  if (input.phase === 'return_to_training' || input.readinessBand === 'red' || hasRestrictiveSafety) {
    return {
      generatedSessionTarget: 1,
      strengthPowerTarget: 0,
      aerobicSupportTarget: input.readinessBand === 'red' ? 0 : 1,
      conditioningSupportTarget: 0,
      mobilityPrehabTarget: 1,
      recoveryTarget: 1,
      hardDayTarget: 0,
      hardDayCap: 0,
    };
  }

  if (input.readinessBand === 'orange') {
    dose.generatedSessionTarget = Math.max(2, Math.min(dose.generatedSessionTarget, 3));
    dose.strengthPowerTarget = Math.min(dose.strengthPowerTarget, 1);
    dose.conditioningSupportTarget = 0;
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.recoveryTarget = Math.max(1, dose.recoveryTarget);
    dose.hardDayTarget = Math.min(dose.hardDayTarget, 1);
    dose.hardDayCap = Math.min(dose.hardDayCap, 1);
  } else if (input.readinessBand === 'yellow' || fatigueFlag) {
    dose.generatedSessionTarget = Math.max(2, Math.min(dose.generatedSessionTarget, 3));
    dose.strengthPowerTarget = Math.min(dose.strengthPowerTarget, 1);
    dose.conditioningSupportTarget = 0;
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.hardDayTarget = Math.min(dose.hardDayTarget, 2);
    dose.hardDayCap = Math.min(dose.hardDayCap, 2);
  }

  return dose;
}

function intent(goalId: string, plannedIntensity: WorkoutIntensity, role: PlannedSessionRole, rationale: string[]): PlannedSessionIntent {
  return {
    goalId,
    plannedIntensity,
    role,
    canStackWithProtected: ['aerobic_base', 'mobility_prehab', 'recovery', 'accessory', 'maintenance'].includes(role),
    rationale,
  };
}

function buildIntents(input: {
  goalId: string;
  archetype: AthleteTrainingArchetype;
  dose: BaseWeeklyDose;
  generatedHardSessionCap: number;
  phase: ProgramPhase;
}): PlannedSessionIntent[] {
  if (input.archetype === 'general_fitness_legacy') {
    const intents: PlannedSessionIntent[] = [];
    const primaryGoal = input.goalId;
    const hardPrimaryCount = Math.min(input.dose.strengthPowerTarget, input.generatedHardSessionCap);
    for (let index = 0; index < hardPrimaryCount; index += 1) {
      intents.push(intent(primaryGoal, 'hard', primaryGoal === 'boxing_support' ? 'power' : 'max_strength', [
        `${primaryGoal} remains the primary generated session for legacy-compatible programming.`,
      ]));
    }
    while (intents.length < input.dose.generatedSessionTarget) {
      const nextGoal = intents.some((item) => item.goalId === 'zone2_cardio') ? 'mobility' : 'zone2_cardio';
      intents.push(intent(nextGoal, nextGoal === 'mobility' ? 'low' : 'low', nextGoal === 'mobility' ? 'mobility_prehab' : 'aerobic_base', [
        'Legacy-compatible support work fills the week without adding extra hard exposure.',
      ]));
    }
    return intents.slice(0, input.dose.generatedSessionTarget);
  }

  const intents: PlannedSessionIntent[] = [];
  let hardUsed = 0;
  const strengthGoalIds = input.goalId === 'boxing_support'
    ? ['boxing_support', 'beginner_strength']
    : [input.goalId, 'boxing_support'];

  if (input.dose.strengthPowerTarget > 0 && hardUsed < input.generatedHardSessionCap) {
    const goalId = strengthGoalIds[0] ?? 'boxing_support';
    intents.push(intent(goalId, 'hard', 'power', [
      'Combat support needs force production and power qualities that complement sport practice.',
      'This is an Athleticore-generated support session, not a replacement for protected combat training.',
    ]));
    hardUsed += 1;
  }
  for (let index = 0; index < input.dose.aerobicSupportTarget; index += 1) {
    intents.push(intent('zone2_cardio', 'low', 'aerobic_base', [
      'Aerobic base support improves repeatability and recovery capacity with low interference.',
    ]));
  }
  for (let index = 0; index < input.dose.mobilityPrehabTarget; index += 1) {
    intents.push(intent(index % 2 === 0 ? 'mobility' : 'core_durability', 'low', 'mobility_prehab', [
      'Mobility and prehab support preserve useful frequency while keeping recovery cost low.',
    ]));
  }
  for (let index = 1; index < input.dose.strengthPowerTarget; index += 1) {
    if (hardUsed >= input.generatedHardSessionCap) break;
    const goalId = strengthGoalIds[index % strengthGoalIds.length] ?? 'boxing_support';
    intents.push(intent(goalId, 'hard', 'strength_power', [
      'A second strength/power exposure supports combat athletes without replacing protected sport work.',
    ]));
    hardUsed += 1;
  }
  for (let index = 0; index < input.dose.conditioningSupportTarget; index += 1) {
    const canGoHard = hardUsed < input.generatedHardSessionCap;
    intents.push(intent('boxing_support', canGoHard ? 'moderate' : 'low', 'conditioning_support', [
      canGoHard
        ? 'Conditioning support is included because competitive combat athletes need repeatable round tolerance.'
        : 'Conditioning support was kept low because protected hard work already used the hard-session budget.',
    ]));
    if (canGoHard) hardUsed += 1;
  }
  for (let index = 0; index < input.dose.recoveryTarget; index += 1) {
    intents.push(intent('recovery', 'recovery', 'recovery', [
      'Recovery work keeps the athlete moving without adding meaningful fatigue.',
    ]));
  }

  while (intents.length < input.dose.generatedSessionTarget) {
    intents.push(intent(intents.some((item) => item.role === 'aerobic_base') ? 'mobility' : 'zone2_cardio', 'low', 'accessory', [
      'Low-load accessory support preserves useful weekly frequency without forcing another hard day.',
    ]));
  }

  if (input.phase === 'deload') {
    return intents
      .map((item) => (item.plannedIntensity === 'hard'
        ? { ...item, plannedIntensity: 'moderate' as WorkoutIntensity, role: 'maintenance' as PlannedSessionRole, rationale: [...item.rationale, 'Deload week keeps exposure but reduces intensity.'] }
        : item))
      .slice(0, input.dose.generatedSessionTarget);
  }

  return intents.slice(0, input.dose.generatedSessionTarget);
}

export function planWeeklyTrainingDose(input: {
  goalId: string;
  phase: ProgramPhase;
  readinessBand: WorkoutReadinessBand;
  protectedWorkouts: readonly ProtectedWorkoutInput[];
  combatSportContext?: CombatSportContext | undefined;
  sessionsPerWeek?: number | undefined;
  generatedSessionsPerWeek?: number | undefined;
  totalExposureTarget?: number | undefined;
  safetyFlags?: readonly string[] | undefined;
}): WeeklyTrainingDosePrescription {
  const context = input.combatSportContext;
  const archetype = resolveTrainingArchetype({ goalId: input.goalId, context });
  const protectedHardDayCount = input.protectedWorkouts.filter(protectedWorkoutCountsAsHardDay).length;
  const protectedLoadScore = input.protectedWorkouts.reduce((sum, workout) => sum + protectedWorkoutLoadScore(workout), 0);
  const requestedGeneratedSessions = input.generatedSessionsPerWeek
    ?? context?.generatedSessionsPerWeek
    ?? input.sessionsPerWeek
    ?? null;
  const enforceCombatFloor = archetype !== 'general_fitness_legacy'
    && (requestedGeneratedSessions == null || context?.archetype != null);
  const baseDose = baseDoseFor(archetype, requestedGeneratedSessions, enforceCombatFloor);
  const adjustedDose = readinessAdjustedDose({
    dose: baseDose,
    readinessBand: input.readinessBand,
    phase: input.phase,
    fightCampWeeksOut: context?.fightCampWeeksOut ?? null,
    safetyFlags: input.safetyFlags ?? [],
  });

  const highProtectedLoad = protectedLoadScore >= 1_000 || protectedHardDayCount >= 2;
  if (highProtectedLoad && archetype !== 'general_fitness_legacy') {
    adjustedDose.conditioningSupportTarget = Math.min(adjustedDose.conditioningSupportTarget, 1);
    adjustedDose.hardDayTarget = Math.min(adjustedDose.hardDayTarget, protectedHardDayCount + 1);
  }

  const generatedHardSessionCap = Math.max(0, Math.min(
    adjustedDose.strengthPowerTarget + adjustedDose.conditioningSupportTarget,
    adjustedDose.hardDayCap - protectedHardDayCount,
    highProtectedLoad ? 1 : adjustedDose.hardDayCap,
  ));
  const totalExposureTarget = input.totalExposureTarget
    ?? context?.totalExposureTarget
    ?? adjustedDose.generatedSessionTarget + input.protectedWorkouts.length;
  const intents = buildIntents({
    goalId: input.goalId,
    archetype,
    dose: adjustedDose,
    generatedHardSessionCap,
    phase: input.phase,
  });

  const warnings: string[] = [];
  if (protectedHardDayCount > adjustedDose.hardDayCap) {
    warnings.push('Protected hard sessions already exceed this week hard-day cap; generated hard work is removed.');
  } else if (generatedHardSessionCap < adjustedDose.strengthPowerTarget) {
    warnings.push('Generated hard support was reduced because protected hard work already consumes the week hard-day budget.');
  }
  if (input.readinessBand === 'red') warnings.push('Red readiness blocks hard generated work and leaves only recovery-oriented support.');
  if (input.phase === 'deload') warnings.push('Deload week preserves useful exposure while reducing intensity and volume.');

  return {
    archetype,
    totalExposureTarget,
    generatedSessionTarget: intents.length,
    strengthPowerTarget: adjustedDose.strengthPowerTarget,
    aerobicSupportTarget: adjustedDose.aerobicSupportTarget,
    conditioningSupportTarget: adjustedDose.conditioningSupportTarget,
    mobilityPrehabTarget: adjustedDose.mobilityPrehabTarget,
    recoveryTarget: adjustedDose.recoveryTarget,
    hardDayTarget: adjustedDose.hardDayTarget,
    hardDayCap: adjustedDose.hardDayCap,
    protectedHardDayCount,
    protectedLoadScore,
    generatedHardSessionCap,
    intents,
    rationale: [
      `Weekly dose resolved as ${archetype} with ${intents.length} generated support session(s).`,
      `${input.protectedWorkouts.length} protected session(s) count toward load and hard-day exposure but do not automatically replace Athleticore S&C.`,
      `Hard-day cap for this week is ${adjustedDose.hardDayCap}; protected hard-day count is ${protectedHardDayCount}.`,
      'The planner balances specificity, progressive overload, minimum effective dose, high/low distribution, aerobic base, strength/power support, readiness regression, and stress consolidation.',
    ],
    warnings,
  };
}
