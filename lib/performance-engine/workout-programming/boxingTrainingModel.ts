import type {
  AthleteTrainingArchetype,
  BoxingGeneratedDoseContribution,
  BoxingPerformanceVector,
  BoxingPlannedSessionIntent,
  BoxingPlannedSessionRole,
  BoxingProgressionDecision,
  BoxingProgressionSignal,
  BoxingQualityGap,
  BoxingRulesetProfile,
  BoxingSessionDoseCategory,
  BoxingSessionFamily,
  BoxingTrainingContext,
  BoxingTrainingTrack,
  BoxingVariancePlan,
  BoxingWeeklyLoadLedger,
  CombatSportContext,
  GeneratedProgramSession,
  ProgressionDecision,
  ProgramPhase,
  ProtectedBoxingWorkoutModality,
  ProtectedWorkoutInput,
  ProtectedWorkoutModality,
  WeeklyTrainingDosePrescription,
  WorkoutCompletionLog,
  WorkoutIntensity,
  WorkoutReadinessBand,
} from './types.ts';
import { supportSessionMetadata } from './athleteSupportDomains.ts';

type BoxingCompatibilityInput = {
  goalId: string;
  boxingTrainingContext?: BoxingTrainingContext | undefined;
  combatSportContext?: CombatSportContext | undefined;
  protectedWorkouts?: readonly ProtectedWorkoutInput[] | undefined;
};

type BoxingDoseTemplate = {
  totalExposureTarget: number;
  generatedSessionTarget: number;
  generatedFullSessionTarget: number;
  supportMicrodoseTarget: number;
  boxingSkillTarget: number;
  footworkAgilityTarget: number;
  strengthPowerTarget: number;
  roadworkAerobicTarget: number;
  roadworkTempoTarget: number;
  conditioningTarget: number;
  mobilityPrehabTarget: number;
  recoveryTarget: number;
  hardDayTarget: number;
  hardDayCap: number;
};

const boxingModalities = new Set<ProtectedBoxingWorkoutModality>([
  'boxing_skill',
  'shadowboxing',
  'footwork',
  'bag_work',
  'pad_work',
  'sparring',
  'boxing_conditioning',
  'roadwork_zone2',
  'roadwork_tempo',
  'roadwork_intervals',
  'strength_power',
  'mobility_prehab',
  'competition',
  'recovery',
  'external_non_boxing_load',
  'unknown',
]);

const BOXING_SKILL_MODALITIES = new Set<ProtectedWorkoutModality>([
  'boxing_skill',
  'shadowboxing',
  'footwork',
  'bag_work',
  'pad_work',
  'sparring',
  'boxing_conditioning',
  'competition',
]);

const BOXING_TECHNICAL_MODALITIES = new Set<ProtectedWorkoutModality>([
  'boxing_skill',
  'shadowboxing',
  'footwork',
  'bag_work',
  'pad_work',
]);

const ROADWORK_MODALITIES = new Set<ProtectedWorkoutModality>([
  'roadwork_zone2',
  'roadwork_tempo',
  'roadwork_intervals',
  'zone2',
]);

const LOW_LOAD_FAMILIES = new Set<BoxingSessionFamily>([
  'boxing_skill_microdose',
  'footwork_agility',
  'reaction_rhythm',
  'shadowboxing_quality',
  'shoulder_scap_durability',
  'neck_trap_durability',
  'hip_ankle_mobility',
  'mobility_prehab',
  'recovery_reset',
]);

const HARD_FAMILIES = new Set<BoxingSessionFamily>([
  'max_strength_lower',
  'strength_power',
  'explosive_power',
  'roadwork_intervals',
  'alactic_repeat_power',
  'glycolytic_round_tolerance',
]);

const BOXING_FAMILY_TEMPLATE_IDS: Record<BoxingSessionFamily, string> = {
  boxing_skill_microdose: 'boxing_skill_microdose',
  footwork_agility: 'footwork_agility',
  reaction_rhythm: 'boxing_skill_microdose',
  shadowboxing_quality: 'shadowboxing_quality',
  bag_pad_support: 'shadowboxing_quality',
  max_strength_lower: 'lower_strength',
  strength_power: 'boxing_support',
  explosive_power: 'boxing_rotational_power',
  rotational_power: 'boxing_rotational_power',
  trunk_durability: 'boxing_trunk_durability',
  shoulder_scap_durability: 'boxing_shoulder_scap_durability',
  neck_trap_durability: 'boxing_neck_trap_durability',
  hip_ankle_mobility: 'boxing_hip_ankle_mobility',
  roadwork_zone2: 'boxing_roadwork_zone2',
  roadwork_tempo: 'boxing_roadwork_tempo',
  roadwork_intervals: 'boxing_roadwork_intervals',
  alactic_repeat_power: 'boxing_alactic_repeat_power',
  glycolytic_round_tolerance: 'boxing_glycolytic_round_tolerance',
  boxing_conditioning_support: 'boxing_alactic_repeat_power',
  mobility_prehab: 'boxing_hip_ankle_mobility',
  recovery_reset: 'boxing_recovery_reset',
};

export function templateIdForBoxingFamily(family: BoxingSessionFamily): string {
  return BOXING_FAMILY_TEMPLATE_IDS[family];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function protectedDuration(workout: ProtectedWorkoutInput): number {
  return Math.max(0, Math.round(workout.protectedDurationMinutes ?? workout.durationMinutes));
}

function isCanonicalBoxingModality(value: ProtectedWorkoutModality): value is ProtectedBoxingWorkoutModality {
  return boxingModalities.has(value as ProtectedBoxingWorkoutModality);
}

function compatibilityModality(value: ProtectedWorkoutModality): ProtectedBoxingWorkoutModality {
  if (isCanonicalBoxingModality(value)) return value;
  switch (value) {
    case 'sport_skill':
      return 'unknown';
    case 'conditioning':
      return 'boxing_conditioning';
    case 'strength':
    case 'power':
      return 'strength_power';
    case 'zone2':
      return 'roadwork_zone2';
    case 'mobility':
      return 'mobility_prehab';
    default:
      return 'unknown';
  }
}

export function inferProtectedWorkoutModality(
  workout: Pick<ProtectedWorkoutInput, 'label' | 'modality'>,
): ProtectedWorkoutModality {
  const label = normalizeText(workout.label);
  if (/\b(mma|grappling|wrestling|bjj|jiu jitsu|jiu-jitsu|muay thai|kickboxing)\b/.test(label)) {
    return 'external_non_boxing_load';
  }
  if (/\b(fight|bout|competition|tournament)\b/.test(label)) return 'competition';
  if (/\b(hard sparring|sparring|spar)\b/.test(label)) return 'sparring';
  if (/\b(shadowboxing|shadow boxing)\b/.test(label)) return 'shadowboxing';
  if (/\b(footwork|feet|agility ladder|ring movement)\b/.test(label)) return 'footwork';
  if (/\b(heavy bag|bag work|bag session|bag)\b/.test(label)) return 'bag_work';
  if (/\b(pads|pad work|mitt work|mitts|focus mitts)\b/.test(label)) return 'pad_work';
  if (/\b(boxing conditioning|boxing intervals|boxing circuit)\b/.test(label)) return 'boxing_conditioning';
  if (/\b(roadwork intervals|run intervals|running intervals|track intervals)\b/.test(label)) return 'roadwork_intervals';
  if (/\b(tempo run|roadwork tempo)\b/.test(label)) return 'roadwork_tempo';
  if (/\b(roadwork|zone 2 run|zone2 run|easy run|aerobic run)\b/.test(label)) return 'roadwork_zone2';
  if (/\bintervals?\b/.test(label)) {
    return /\b(run|running|roadwork|track)\b/.test(label) ? 'roadwork_intervals' : 'boxing_conditioning';
  }
  if (/\b(boxing skill|boxing class|boxing practice|boxing)\b/.test(label)) return 'boxing_skill';
  if (/\b(strength|lift|weights|power)\b/.test(label)) return 'strength_power';
  if (/\b(mobility|prehab|durability)\b/.test(label)) return 'mobility_prehab';
  if (/\b(recovery|breath|walk|reset)\b/.test(label)) return 'recovery';

  const explicit = workout.modality ? compatibilityModality(workout.modality) : 'unknown';
  if (explicit !== 'unknown') return explicit;
  if (workout.modality === 'sport_skill') return 'unknown';
  return 'unknown';
}

export function protectedWorkoutEstimatedRpe(workout: ProtectedWorkoutInput): number {
  if (workout.estimatedRpe != null && Number.isFinite(workout.estimatedRpe)) {
    return clamp(workout.estimatedRpe, 1, 10);
  }
  if (workout.intensity === 'hard') return 8;
  if (workout.intensity === 'moderate') return 6;
  if (workout.intensity === 'low') return 3;

  const modality = inferProtectedWorkoutModality(workout);
  switch (modality) {
    case 'competition':
      return 9;
    case 'sparring':
      return 8;
    case 'roadwork_intervals':
      return 7;
    case 'roadwork_tempo':
    case 'pad_work':
    case 'bag_work':
    case 'boxing_conditioning':
      return 6;
    case 'boxing_skill':
      return 5;
    case 'roadwork_zone2':
      return 4;
    case 'shadowboxing':
    case 'footwork':
    case 'mobility_prehab':
      return 3;
    default:
      return 2;
  }
}

export function protectedWorkoutLoadScore(workout: ProtectedWorkoutInput): number {
  if (workout.loadScore != null && Number.isFinite(workout.loadScore)) return Math.max(0, Math.round(workout.loadScore));
  return Math.round(protectedDuration(workout) * protectedWorkoutEstimatedRpe(workout));
}

export function protectedWorkoutCountsAsHardDay(workout: ProtectedWorkoutInput): boolean {
  if (workout.countsAsHardDay != null) return workout.countsAsHardDay;
  const modality = inferProtectedWorkoutModality(workout);
  if (modality === 'sparring' || modality === 'competition') return true;
  if (modality === 'roadwork_intervals') return protectedWorkoutEstimatedRpe(workout) >= 7;
  return workout.intensity === 'hard' || protectedWorkoutEstimatedRpe(workout) >= 7;
}

function hasBoxingSignal(input: BoxingCompatibilityInput): boolean {
  if (input.boxingTrainingContext?.track && input.boxingTrainingContext.track !== 'general_fitness_legacy') return true;
  if (input.combatSportContext?.track && input.combatSportContext.track !== 'general_fitness_legacy') return true;
  if (/boxing|fight|bout|sparring|boxer/.test(input.goalId)) return true;
  return (input.protectedWorkouts ?? []).some((workout) => {
    const modality = inferProtectedWorkoutModality(workout);
    return BOXING_SKILL_MODALITIES.has(modality) || ROADWORK_MODALITIES.has(modality);
  });
}

function trackFromRounds(roundCount: number | undefined): BoxingTrainingTrack {
  if (roundCount == null) return 'pro_development';
  if (roundCount >= 12) return 'pro_12_round';
  if (roundCount >= 8) return 'pro_8_10_round';
  if (roundCount >= 4) return 'pro_4_6_round';
  return 'amateur_open';
}

export function mapCombatArchetypeToBoxingTrack(input: {
  archetype?: AthleteTrainingArchetype | undefined;
  context?: CombatSportContext | undefined;
  hasBoxingSignal?: boolean | undefined;
}): BoxingTrainingTrack {
  const archetype = input.archetype;
  if (!archetype) return input.hasBoxingSignal ? 'aspiring_boxer' : 'general_fitness_legacy';
  if (archetype === 'general_fitness_legacy') return 'general_fitness_legacy';
  if (archetype === 'combat_beginner') return 'aspiring_boxer';
  if (archetype === 'combat_recreational') {
    const sessions = (input.context?.sparringSessionsPerWeek ?? 0) + (input.context?.technicalSessionsPerWeek ?? 0);
    return sessions >= 3 ? 'amateur_open' : 'amateur_novice';
  }
  if (archetype === 'combat_competitive') return trackFromRounds(input.context?.roundCount);
  if (archetype === 'combat_fight_camp') return trackFromRounds(input.context?.roundCount);
  return archetype;
}

export function resolveBoxingTrainingTrack(input: BoxingCompatibilityInput): BoxingTrainingTrack {
  if (input.boxingTrainingContext?.track) return input.boxingTrainingContext.track;
  if (input.combatSportContext?.track) return input.combatSportContext.track;
  const boxingSignal = hasBoxingSignal(input);
  const mapped = mapCombatArchetypeToBoxingTrack({
    archetype: input.combatSportContext?.archetype,
    context: input.combatSportContext,
    hasBoxingSignal: boxingSignal,
  });
  if (mapped !== 'general_fitness_legacy') return mapped;
  return boxingSignal ? 'aspiring_boxer' : 'general_fitness_legacy';
}

export function resolveTrainingArchetype(input: {
  goalId: string;
  context?: CombatSportContext | undefined;
}): AthleteTrainingArchetype {
  return resolveBoxingTrainingTrack({
    goalId: input.goalId,
    combatSportContext: input.context,
  });
}

function rulesetDefaults(track: BoxingTrainingTrack): Pick<BoxingRulesetProfile, 'roundCount' | 'roundMinutes' | 'restSeconds' | 'scoringBias' | 'primaryDemandBias'> {
  switch (track) {
    case 'aspiring_boxer':
      return { scoringBias: 'development', primaryDemandBias: 'fundamentals' };
    case 'amateur_novice':
    case 'amateur_open':
    case 'amateur_elite':
      return {
        roundCount: 3,
        roundMinutes: 3,
        restSeconds: 60,
        scoringBias: 'amateur_activity_accuracy',
        primaryDemandBias: track === 'amateur_novice' ? 'fundamentals' : 'high_pace_short_bout',
      };
    case 'pro_development':
      return {
        roundCount: 4,
        roundMinutes: 3,
        restSeconds: 60,
        scoringBias: 'development',
        primaryDemandBias: 'longer_pacing_durability',
      };
    case 'pro_4_6_round':
      return {
        roundCount: 6,
        roundMinutes: 3,
        restSeconds: 60,
        scoringBias: 'pro_damage_pacing',
        primaryDemandBias: 'balanced_competitive',
      };
    case 'pro_8_10_round':
      return {
        roundCount: 10,
        roundMinutes: 3,
        restSeconds: 60,
        scoringBias: 'pro_damage_pacing',
        primaryDemandBias: 'longer_pacing_durability',
      };
    case 'pro_12_round':
      return {
        roundCount: 12,
        roundMinutes: 3,
        restSeconds: 60,
        scoringBias: 'pro_damage_pacing',
        primaryDemandBias: 'longer_pacing_durability',
      };
    default:
      return { scoringBias: 'development', primaryDemandBias: 'fundamentals' };
  }
}

export function buildBoxingRulesetProfile(input: {
  track: BoxingTrainingTrack;
  context?: BoxingTrainingContext | undefined;
  compatibilityContext?: CombatSportContext | undefined;
}): BoxingRulesetProfile {
  const defaults = rulesetDefaults(input.track);
  const fightCampWeeksOut = input.context?.fightCampWeeksOut ?? input.compatibilityContext?.fightCampWeeksOut;
  return {
    track: input.track,
    roundCount: input.context?.roundCount ?? input.compatibilityContext?.roundCount ?? defaults.roundCount,
    roundMinutes: input.context?.roundMinutes ?? input.compatibilityContext?.roundMinutes ?? defaults.roundMinutes,
    restSeconds: input.context?.restSeconds ?? input.compatibilityContext?.restSeconds ?? defaults.restSeconds,
    ...(fightCampWeeksOut != null ? { fightCampWeeksOut } : {}),
    scoringBias: defaults.scoringBias,
    primaryDemandBias: fightCampWeeksOut != null && fightCampWeeksOut <= 1
      ? 'taper_maintenance'
      : defaults.primaryDemandBias,
  };
}

function baseDoseForTrack(track: BoxingTrainingTrack): BoxingDoseTemplate {
  switch (track) {
    case 'general_fitness_legacy':
      return {
        totalExposureTarget: 3,
        generatedSessionTarget: 3,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 1,
        boxingSkillTarget: 0,
        footworkAgilityTarget: 0,
        strengthPowerTarget: 2,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 0,
        conditioningTarget: 0,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'aspiring_boxer':
      return {
        totalExposureTarget: 4,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 2,
        footworkAgilityTarget: 2,
        strengthPowerTarget: 1,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 0,
        conditioningTarget: 0,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'amateur_novice':
      return {
        totalExposureTarget: 5,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 2,
        strengthPowerTarget: 1,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 0,
        conditioningTarget: 1,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'amateur_open':
      return {
        totalExposureTarget: 6,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 2,
        strengthPowerTarget: 2,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 0,
        conditioningTarget: 1,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 3,
        hardDayCap: 4,
      };
    case 'amateur_elite':
      return {
        totalExposureTarget: 7,
        generatedSessionTarget: 5,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 3,
        boxingSkillTarget: 4,
        footworkAgilityTarget: 3,
        strengthPowerTarget: 2,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 1,
        conditioningTarget: 2,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 3,
        hardDayCap: 4,
      };
    case 'pro_development':
      return {
        totalExposureTarget: 6,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 1,
        strengthPowerTarget: 2,
        roadworkAerobicTarget: 2,
        roadworkTempoTarget: 0,
        conditioningTarget: 1,
        mobilityPrehabTarget: 2,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'pro_4_6_round':
      return {
        totalExposureTarget: 6,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 1,
        strengthPowerTarget: 2,
        roadworkAerobicTarget: 1,
        roadworkTempoTarget: 1,
        conditioningTarget: 1,
        mobilityPrehabTarget: 1,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'pro_8_10_round':
      return {
        totalExposureTarget: 6,
        generatedSessionTarget: 4,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 2,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 1,
        strengthPowerTarget: 1,
        roadworkAerobicTarget: 2,
        roadworkTempoTarget: 1,
        conditioningTarget: 1,
        mobilityPrehabTarget: 2,
        recoveryTarget: 0,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
    case 'pro_12_round':
      return {
        totalExposureTarget: 7,
        generatedSessionTarget: 5,
        generatedFullSessionTarget: 2,
        supportMicrodoseTarget: 3,
        boxingSkillTarget: 3,
        footworkAgilityTarget: 1,
        strengthPowerTarget: 1,
        roadworkAerobicTarget: 2,
        roadworkTempoTarget: 1,
        conditioningTarget: 1,
        mobilityPrehabTarget: 2,
        recoveryTarget: 1,
        hardDayTarget: 2,
        hardDayCap: 3,
      };
  }
}

function adjustedForReadiness(input: {
  dose: BoxingDoseTemplate;
  track: BoxingTrainingTrack;
  phase: ProgramPhase;
  readinessBand: WorkoutReadinessBand;
  fightCampWeeksOut?: number | undefined;
  safetyFlags: readonly string[];
}): BoxingDoseTemplate {
  const dose = { ...input.dose };
  const restrictive = input.safetyFlags.some((flag) => /acute|chest|red_flag|illness|poor_readiness|coach_review_needed/.test(flag));
  const fatigue = input.safetyFlags.some((flag) => /high_fatigue|under_fueled|poor_sleep|high_soreness|low_energy/.test(flag));
  const taper = input.fightCampWeeksOut != null && input.fightCampWeeksOut <= 1;

  if (taper) {
    dose.generatedSessionTarget = Math.min(dose.generatedSessionTarget, 3);
    dose.generatedFullSessionTarget = 0;
    dose.supportMicrodoseTarget = Math.max(2, dose.supportMicrodoseTarget);
    dose.strengthPowerTarget = 0;
    dose.conditioningTarget = 0;
    dose.roadworkTempoTarget = 0;
    dose.mobilityPrehabTarget = Math.max(2, dose.mobilityPrehabTarget);
    dose.recoveryTarget = Math.max(1, dose.recoveryTarget);
    dose.hardDayTarget = 0;
    dose.hardDayCap = Math.min(2, dose.hardDayCap);
  } else if (input.fightCampWeeksOut != null && input.fightCampWeeksOut <= 2) {
    dose.generatedSessionTarget = Math.min(dose.generatedSessionTarget, 4);
    dose.strengthPowerTarget = Math.min(1, dose.strengthPowerTarget);
    dose.conditioningTarget = Math.min(1, dose.conditioningTarget);
    dose.hardDayCap = Math.min(3, dose.hardDayCap);
  }

  if (input.phase === 'deload') {
    dose.generatedSessionTarget = Math.max(2, Math.min(dose.generatedSessionTarget, 3));
    dose.generatedFullSessionTarget = Math.min(1, dose.generatedFullSessionTarget);
    dose.strengthPowerTarget = Math.min(1, dose.strengthPowerTarget);
    dose.conditioningTarget = 0;
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.recoveryTarget = Math.max(1, dose.recoveryTarget);
    dose.hardDayTarget = Math.min(1, dose.hardDayTarget);
    dose.hardDayCap = Math.min(2, dose.hardDayCap);
  }

  if (input.phase === 'return_to_training' || input.readinessBand === 'red' || restrictive) {
    return {
      ...dose,
      totalExposureTarget: Math.max(2, dose.totalExposureTarget),
      generatedSessionTarget: 2,
      generatedFullSessionTarget: 0,
      supportMicrodoseTarget: 2,
      strengthPowerTarget: 0,
      roadworkAerobicTarget: input.readinessBand === 'red' ? 0 : Math.min(1, dose.roadworkAerobicTarget),
      roadworkTempoTarget: 0,
      conditioningTarget: 0,
      mobilityPrehabTarget: Math.max(1, dose.mobilityPrehabTarget),
      recoveryTarget: Math.max(1, dose.recoveryTarget),
      hardDayTarget: 0,
      hardDayCap: 0,
    };
  }

  if (input.readinessBand === 'orange') {
    dose.generatedSessionTarget = Math.max(2, Math.min(dose.generatedSessionTarget, 3));
    dose.generatedFullSessionTarget = Math.min(1, dose.generatedFullSessionTarget);
    dose.strengthPowerTarget = Math.min(1, dose.strengthPowerTarget);
    dose.conditioningTarget = 0;
    dose.roadworkTempoTarget = 0;
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.recoveryTarget = Math.max(1, dose.recoveryTarget);
    dose.hardDayTarget = Math.min(1, dose.hardDayTarget);
    dose.hardDayCap = Math.min(1, dose.hardDayCap);
  } else if (input.readinessBand === 'yellow' || fatigue) {
    dose.generatedSessionTarget = Math.max(3, Math.min(dose.generatedSessionTarget, 4));
    dose.generatedFullSessionTarget = Math.min(1, dose.generatedFullSessionTarget);
    dose.strengthPowerTarget = Math.min(1, dose.strengthPowerTarget);
    dose.conditioningTarget = Math.min(1, dose.conditioningTarget);
    dose.mobilityPrehabTarget = Math.max(1, dose.mobilityPrehabTarget);
    dose.hardDayTarget = Math.min(2, dose.hardDayTarget);
    dose.hardDayCap = Math.min(2, dose.hardDayCap);
  }

  return dose;
}

function emptyLedger(hardDayCap: number): BoxingWeeklyLoadLedger {
  return {
    protectedBoxingMinutes: 0,
    protectedBoxingRounds: 0,
    protectedSparringRounds: 0,
    protectedBagPadRounds: 0,
    protectedRoadworkMinutes: 0,
    protectedExternalLoadMinutes: 0,
    generatedFullSessionCount: 0,
    generatedSupportSessionCount: 0,
    generatedMicrodoseCount: 0,
    strengthMainSets: 0,
    powerContacts: 0,
    trunkDurabilitySets: 0,
    shoulderPrehabMinutes: 0,
    mobilityMinutes: 0,
    roadworkMinutes: 0,
    highIntensityIntervals: 0,
    alacticBursts: 0,
    glycolyticRounds: 0,
    technicalMicrodoseMinutes: 0,
    sessionRpeLoad: 0,
    protectedLoadScore: 0,
    generatedLoadScore: 0,
    hardDayCount: 0,
    hardDayCap,
    consecutiveHardDayCount: 0,
  };
}

function estimateRounds(workout: ProtectedWorkoutInput, ruleset: BoxingRulesetProfile): number {
  if (workout.roundCount != null && Number.isFinite(workout.roundCount)) return Math.max(0, Math.round(workout.roundCount));
  const roundMinutes = workout.roundMinutes ?? ruleset.roundMinutes ?? 3;
  const restMinutes = (ruleset.restSeconds ?? 60) / 60;
  const denominator = Math.max(1, roundMinutes + restMinutes);
  return Math.max(0, Math.round(protectedDuration(workout) / denominator));
}

function protectedLoadLedger(input: {
  protectedWorkouts: readonly ProtectedWorkoutInput[];
  hardDayCap: number;
  ruleset: BoxingRulesetProfile;
}): BoxingWeeklyLoadLedger {
  const ledger = emptyLedger(input.hardDayCap);
  const hardDays: number[] = [];
  for (const workout of input.protectedWorkouts) {
    const modality = inferProtectedWorkoutModality(workout);
    const durationMinutes = protectedDuration(workout);
    const loadScore = protectedWorkoutLoadScore(workout);
    ledger.protectedLoadScore += loadScore;
    ledger.sessionRpeLoad += loadScore;
    if (protectedWorkoutCountsAsHardDay(workout)) hardDays.push(workout.dayIndex);

    if (BOXING_SKILL_MODALITIES.has(modality)) {
      ledger.protectedBoxingMinutes += durationMinutes;
      ledger.protectedBoxingRounds += estimateRounds(workout, input.ruleset);
    }
    if (modality === 'sparring') ledger.protectedSparringRounds += estimateRounds(workout, input.ruleset);
    if (modality === 'bag_work' || modality === 'pad_work') ledger.protectedBagPadRounds += estimateRounds(workout, input.ruleset);
    if (ROADWORK_MODALITIES.has(modality)) {
      ledger.protectedRoadworkMinutes += durationMinutes;
      ledger.roadworkMinutes += durationMinutes;
    }
    if (modality === 'external_non_boxing_load') ledger.protectedExternalLoadMinutes += durationMinutes;
    if (modality === 'mobility_prehab') ledger.mobilityMinutes += durationMinutes;
  }
  ledger.hardDayCount = unique(hardDays).length;
  ledger.consecutiveHardDayCount = consecutiveHardDayCount(hardDays);
  return ledger;
}

function protectedCounts(protectedWorkouts: readonly ProtectedWorkoutInput[]): {
  protectedHardDayCount: number;
  protectedSparringCount: number;
  protectedRoadworkCount: number;
  protectedTechnicalCount: number;
  protectedBagPadCount: number;
} {
  return protectedWorkouts.reduce((counts, workout) => {
    const modality = inferProtectedWorkoutModality(workout);
    return {
      protectedHardDayCount: counts.protectedHardDayCount + (protectedWorkoutCountsAsHardDay(workout) ? 1 : 0),
      protectedSparringCount: counts.protectedSparringCount + (modality === 'sparring' ? 1 : 0),
      protectedRoadworkCount: counts.protectedRoadworkCount + (ROADWORK_MODALITIES.has(modality) ? 1 : 0),
      protectedTechnicalCount: counts.protectedTechnicalCount + (BOXING_TECHNICAL_MODALITIES.has(modality) ? 1 : 0),
      protectedBagPadCount: counts.protectedBagPadCount + (modality === 'bag_work' || modality === 'pad_work' ? 1 : 0),
    };
  }, {
    protectedHardDayCount: 0,
    protectedSparringCount: 0,
    protectedRoadworkCount: 0,
    protectedTechnicalCount: 0,
    protectedBagPadCount: 0,
  });
}

function performanceVectorFromLedger(ledger: BoxingWeeklyLoadLedger): BoxingPerformanceVector {
  return {
    boxingSkillFrequency: ledger.protectedBoxingRounds / 3 + ledger.generatedMicrodoseCount,
    footworkAgility: ledger.generatedMicrodoseCount + ledger.protectedBoxingRounds / 8,
    reactionRhythm: ledger.generatedMicrodoseCount,
    lowerBodyMaxStrength: ledger.strengthMainSets / 4,
    lowerBodyExplosiveStrength: ledger.powerContacts / 20,
    upperBodyExplosiveStrength: ledger.powerContacts / 24,
    rotationalPowerTransfer: ledger.powerContacts / 18,
    antiRotationDurability: ledger.trunkDurabilitySets / 4,
    shoulderScapDurability: ledger.shoulderPrehabMinutes / 12,
    neckTrapDurability: 0,
    wristHandDurability: ledger.shoulderPrehabMinutes / 20,
    hipAnkleMobility: ledger.mobilityMinutes / 12,
    thoracicMobility: ledger.mobilityMinutes / 15,
    aerobicBase: ledger.roadworkMinutes / 30,
    aerobicPower: ledger.highIntensityIntervals / 4,
    alacticPower: ledger.alacticBursts / 8,
    repeatAlacticCapacity: ledger.alacticBursts / 12,
    glycolyticRoundTolerance: ledger.glycolyticRounds / 3,
    recoveryCapacity: (ledger.mobilityMinutes + ledger.roadworkMinutes * 0.25) / 20,
  };
}

function targetPerformanceVector(dose: BoxingDoseTemplate, track: BoxingTrainingTrack): BoxingPerformanceVector {
  const amateurBias = track.startsWith('amateur') ? 1 : 0;
  const proBias = track.startsWith('pro') ? 1 : 0;
  return {
    boxingSkillFrequency: dose.boxingSkillTarget,
    footworkAgility: dose.footworkAgilityTarget + amateurBias,
    reactionRhythm: Math.max(1, dose.footworkAgilityTarget),
    lowerBodyMaxStrength: dose.strengthPowerTarget,
    lowerBodyExplosiveStrength: dose.strengthPowerTarget,
    upperBodyExplosiveStrength: dose.strengthPowerTarget,
    rotationalPowerTransfer: Math.max(1, dose.strengthPowerTarget),
    antiRotationDurability: Math.max(1, dose.mobilityPrehabTarget),
    shoulderScapDurability: dose.mobilityPrehabTarget + proBias,
    neckTrapDurability: proBias,
    wristHandDurability: Math.max(1, dose.mobilityPrehabTarget),
    hipAnkleMobility: Math.max(1, dose.footworkAgilityTarget),
    thoracicMobility: Math.max(1, dose.mobilityPrehabTarget),
    aerobicBase: dose.roadworkAerobicTarget + proBias,
    aerobicPower: dose.roadworkTempoTarget + proBias,
    alacticPower: dose.conditioningTarget + amateurBias,
    repeatAlacticCapacity: dose.conditioningTarget + amateurBias,
    glycolyticRoundTolerance: Math.max(0, dose.conditioningTarget + (track === 'amateur_novice' ? 0 : 1)),
    recoveryCapacity: dose.recoveryTarget + dose.mobilityPrehabTarget + proBias,
  };
}

function qualityGaps(current: BoxingPerformanceVector, target: BoxingPerformanceVector): BoxingQualityGap[] {
  return (Object.keys(target) as Array<keyof BoxingPerformanceVector>)
    .map((quality) => {
      const currentDose = Number(current[quality].toFixed(2));
      const targetDose = Number(target[quality].toFixed(2));
      const gap = targetDose - currentDose;
      if (gap <= 0.25) return null;
      const ratio = targetDose === 0 ? 0 : currentDose / targetDose;
      const priority: BoxingQualityGap['priority'] = ratio <= 0.2
        ? 'critical'
        : ratio <= 0.5
          ? 'high'
          : ratio <= 0.75
            ? 'medium'
            : 'low';
      return {
        quality,
        currentDose,
        targetDose,
        priority,
        rationale: `${String(quality)} is below this week boxing-development target, so Athleticore should bias generated support toward that quality.`,
      };
    })
    .filter((gap): gap is BoxingQualityGap => gap !== null)
    .sort((a, b) => {
      const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityRank[b.priority] - priorityRank[a.priority] || b.targetDose - b.currentDose - (a.targetDose - a.currentDose);
    });
}

function familyForGoalId(goalId: string | undefined): BoxingSessionFamily | null {
  switch (goalId) {
    case 'boxing_skill_microdose':
    case 'boxing_progression':
      return 'boxing_skill_microdose';
    case 'footwork_agility':
      return 'footwork_agility';
    case 'shadowboxing_quality':
      return 'shadowboxing_quality';
    case 'roadwork_aerobic_base':
      return 'roadwork_zone2';
    case 'roadwork_tempo':
      return 'roadwork_tempo';
    case 'roadwork_intervals':
      return 'roadwork_intervals';
    case 'alactic_repeat_power':
      return 'alactic_repeat_power';
    case 'glycolytic_round_tolerance':
      return 'glycolytic_round_tolerance';
    case 'explosive_power':
      return 'explosive_power';
    case 'rotational_power':
      return 'rotational_power';
    case 'trunk_rotation_durability':
      return 'trunk_durability';
    case 'shoulder_scap_durability':
      return 'shoulder_scap_durability';
    case 'neck_trap_durability':
      return 'neck_trap_durability';
    case 'hip_footwork_durability':
    case 'hip_ankle_mobility':
      return 'hip_ankle_mobility';
    case 'mobility_prehab':
      return 'mobility_prehab';
    case 'recovery_reset':
    case 'recovery':
      return 'recovery_reset';
    case 'boxing_support':
      return 'strength_power';
    default:
      return null;
  }
}

function familyForTemplateId(templateId: string | undefined): BoxingSessionFamily | null {
  if (!templateId) return null;
  const direct = (Object.entries(BOXING_FAMILY_TEMPLATE_IDS) as Array<[BoxingSessionFamily, string]>)
    .find(([, id]) => id === templateId)?.[0];
  if (direct) return direct;
  if (templateId === 'lower_strength') return 'max_strength_lower';
  if (templateId === 'boxing_support') return 'strength_power';
  if (templateId === 'boxing_roadwork_zone2') return 'roadwork_zone2';
  if (templateId === 'boxing_roadwork_tempo') return 'roadwork_tempo';
  if (templateId === 'boxing_roadwork_intervals') return 'roadwork_intervals';
  return null;
}

function completionMatchesFamily(completion: WorkoutCompletionLog, family: BoxingSessionFamily): boolean {
  return familyForGoalId(completion.goalId) === family
    || familyForTemplateId(completion.prescriptionTemplateId) === family
    || (family === 'roadwork_zone2' && completion.workoutTypeId === 'zone2_cardio')
    || (family === 'recovery_reset' && completion.workoutTypeId === 'recovery');
}

function completionWasSuccessful(completion: WorkoutCompletionLog): boolean {
  return completion.completionStatus == null || completion.completionStatus === 'completed';
}

function average(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function evaluateBoxingProgressionForFamily(signal: BoxingProgressionSignal): BoxingProgressionDecision {
  const completions = signal.recentWorkoutCompletions ?? [];
  const matchingCompletions = completions.filter((completion) => completionMatchesFamily(completion, signal.family));
  const usefulCompletions = matchingCompletions.length > 0 ? matchingCompletions : completions;
  const completionRate = signal.completionRate
    ?? (usefulCompletions.length
      ? usefulCompletions.filter(completionWasSuccessful).length / usefulCompletions.length
      : 1);
  const latest = usefulCompletions[0];
  const averageRpe = average([
    signal.sessionRpe ?? NaN,
    ...usefulCompletions.slice(0, 3).map((completion) => completion.sessionRpe),
  ]);
  const painBefore = signal.painScoreBefore ?? latest?.painScoreBefore ?? null;
  const painAfter = signal.painScoreAfter ?? latest?.painScoreAfter ?? null;
  const painDelta = painBefore != null && painAfter != null ? painAfter - painBefore : 0;
  const tags = new Set((signal.feedbackTags ?? []).map(normalizeText));
  const priorCaution = signal.recentProgressionDecisions?.some((decision) => /regress|deload|recover|reduce|substitute/i.test(decision.direction)) ?? false;

  if (painDelta >= 2 || [...tags].some((tag) => /pain|sharp|symptom|injury/.test(tag))) {
    const shoulderOrNeck = signal.family === 'shoulder_scap_durability' || signal.family === 'neck_trap_durability';
    return {
      family: signal.family,
      action: shoulderOrNeck ? 'coach_review' : 'regress',
      rationale: shoulderOrNeck
        ? 'Pain increased on a shoulder/neck durability exposure, so progression pauses and coach review is recommended before adding load.'
        : 'Pain increased after this family, so the next exposure should regress before any progression.',
      doseTargetDelta: -1,
      hardGeneratedCapDelta: -1,
      varianceLevelOverride: 'low',
      avoidedFamilies: [signal.family],
      coachReviewRecommended: shoulderOrNeck,
    };
  }

  if (completionRate < 0.67 || [...tags].some((tag) => /missed|skipped|could not finish|too busy/.test(tag))) {
    return {
      family: signal.family,
      action: 'deload',
      rationale: 'Recent missed or incomplete sessions point to too much complexity or load, so next week should simplify and preserve low-load frequency.',
      doseTargetDelta: -1,
      hardGeneratedCapDelta: -1,
      varianceLevelOverride: 'low',
      avoidedFamilies: HARD_FAMILIES.has(signal.family) ? [signal.family] : [],
    };
  }

  if ((averageRpe ?? 0) >= 8.5 || [...tags].some((tag) => /too hard|crushed|failed|overwhelmed/.test(tag))) {
    return {
      family: signal.family,
      action: HARD_FAMILIES.has(signal.family) ? 'regress' : 'repeat',
      rationale: 'The last exposure was too demanding, so Athleticore repeats or slightly regresses instead of intensifying.',
      doseTargetDelta: HARD_FAMILIES.has(signal.family) ? -1 : 0,
      hardGeneratedCapDelta: HARD_FAMILIES.has(signal.family) ? -1 : 0,
      varianceLevelOverride: 'low',
      avoidedFamilies: HARD_FAMILIES.has(signal.family) ? [signal.family] : [],
    };
  }

  const easySuccessfulCount = usefulCompletions
    .filter((completion) => completionWasSuccessful(completion) && completion.sessionRpe <= 5.5)
    .length;
  if (
    easySuccessfulCount >= 2
    && completionRate >= 0.9
    && !priorCaution
    && ['roadwork_zone2', 'roadwork_tempo', 'recovery_reset', 'mobility_prehab'].includes(signal.family)
  ) {
    return {
      family: signal.family,
      action: signal.family === 'roadwork_tempo' ? 'progress_intensity' : 'progress_volume',
      rationale: 'Two easy successful exposures with stable pain support a small, controlled progression.',
      doseTargetDelta: 1,
      hardGeneratedCapDelta: 0,
      varianceLevelOverride: 'moderate',
      nextFamilyPreference: signal.family,
    };
  }

  return {
    family: signal.family,
    action: 'repeat',
    rationale: 'No strong signal supports changing the dose, so the safest next step is to repeat the family and watch completion quality.',
    doseTargetDelta: 0,
    hardGeneratedCapDelta: 0,
  };
}

function progressionFamilies(input: {
  completions: readonly WorkoutCompletionLog[];
  intents: readonly BoxingPlannedSessionIntent[];
}): BoxingSessionFamily[] {
  return unique([
    ...input.completions
      .map((completion) => familyForGoalId(completion.goalId) ?? familyForTemplateId(completion.prescriptionTemplateId))
      .filter((family): family is BoxingSessionFamily => Boolean(family)),
    ...input.intents.map((intentItem) => intentItem.family),
  ]);
}

function variancePlan(input: {
  track: BoxingTrainingTrack;
  readinessBand: WorkoutReadinessBand;
  phase: ProgramPhase;
  fightCampWeeksOut?: number | undefined;
  safetyFlags: readonly string[];
  intents?: readonly BoxingPlannedSessionIntent[] | undefined;
  progressionDecisions?: readonly BoxingProgressionDecision[] | undefined;
}): BoxingVariancePlan {
  const fatigue = input.readinessBand === 'red'
    || input.readinessBand === 'orange'
    || input.safetyFlags.some((flag) => /high_fatigue|poor_sleep|under_fueled|high_soreness/.test(flag));
  const taper = input.fightCampWeeksOut != null && input.fightCampWeeksOut <= 2;
  const beginner = input.track === 'aspiring_boxer' || input.track === 'amateur_novice';
  const progressionCaution = (input.progressionDecisions ?? []).some((decision) => (
    decision.varianceLevelOverride === 'low'
    || decision.action === 'regress'
    || decision.action === 'deload'
    || decision.action === 'coach_review'
  ));
  const highSkillOpen = input.track === 'amateur_open' || input.track === 'amateur_elite' || input.track === 'pro_development';
  const varianceLevel: BoxingVariancePlan['varianceLevel'] = fatigue || taper || beginner || progressionCaution
    ? 'low'
    : highSkillOpen
      ? 'moderate'
      : 'moderate';
  const families = unique((input.intents ?? []).map((item) => item.family));
  const anchors: BoxingSessionFamily[] = beginner
    ? ['boxing_skill_microdose', 'footwork_agility', 'roadwork_zone2', 'mobility_prehab']
    : taper
      ? ['shadowboxing_quality', 'mobility_prehab', 'recovery_reset']
      : ['strength_power', 'roadwork_zone2', 'mobility_prehab'];
  return {
    varianceLevel,
    reason: progressionCaution
      ? 'Recent outcome signals call for lower variance and repeatable, coach-review-friendly exposures.'
      : fatigue
      ? 'Readiness or fatigue signals lowered variance so the athlete repeats familiar low-risk formats.'
      : taper
        ? 'Fight-camp taper lowers random novelty and keeps reliable maintenance work.'
        : beginner
          ? 'Early boxing development repeats fundamentals so variance supports learning instead of noise.'
          : 'Open/development tracks rotate formats while preserving the adaptation target.',
    maxNewExercisesPerSession: varianceLevel === 'low' ? 1 : 2,
    maxChangedSessionFamiliesPerWeek: varianceLevel === 'low' ? 1 : 2,
    anchorFamiliesToRepeat: unique(anchors.filter((family) => families.length === 0 || families.includes(family))),
    familiesToRotate: families.filter((family) => !anchors.includes(family)),
    recentlyUsedFamilies: [],
    avoidedFamilies: unique([
      ...(fatigue
        ? ['glycolytic_round_tolerance', 'roadwork_intervals', 'alactic_repeat_power'] as BoxingSessionFamily[]
        : taper
          ? ['glycolytic_round_tolerance', 'roadwork_intervals', 'max_strength_lower'] as BoxingSessionFamily[]
          : []),
      ...(input.progressionDecisions ?? []).flatMap((decision) => decision.avoidedFamilies ?? []),
    ]),
  };
}

function phaseFromContext(input: {
  context?: BoxingTrainingContext | undefined;
  phase: ProgramPhase;
  ruleset: BoxingRulesetProfile;
  track: BoxingTrainingTrack;
}): BoxingTrainingContext['boxingProgressionPhase'] {
  if (input.context?.boxingProgressionPhase) return input.context.boxingProgressionPhase;
  if (input.ruleset.fightCampWeeksOut != null && input.ruleset.fightCampWeeksOut <= 1) return 'taper';
  if (input.ruleset.fightCampWeeksOut != null) return 'fight_camp';
  if (input.phase === 'return_to_training') return 'recovery_return';
  if (input.track === 'aspiring_boxer' || input.track === 'amateur_novice') return 'fundamentals';
  if (input.track.startsWith('amateur')) return 'amateur_pace_build';
  if (input.track.startsWith('pro')) return 'pro_pacing_build';
  return 'base_building';
}

function intent(input: {
  goalId: string;
  plannedIntensity: WorkoutIntensity;
  role: BoxingPlannedSessionRole;
  family: BoxingSessionFamily;
  doseCategory: BoxingSessionDoseCategory;
  rationale: string[];
  qualityTargets?: Array<keyof BoxingPerformanceVector>;
  generatedHardSessionCap: number;
  hardUsed: number;
}): BoxingPlannedSessionIntent {
  const wantsHard = input.plannedIntensity === 'hard' || HARD_FAMILIES.has(input.family);
  const canBeHard = wantsHard && input.hardUsed < input.generatedHardSessionCap;
  const plannedIntensity = canBeHard
    ? input.plannedIntensity
    : wantsHard
      ? 'low'
      : input.plannedIntensity;
  const doseCategory = plannedIntensity === 'low' && wantsHard ? 'support_session' : input.doseCategory;
  const family = plannedIntensity === 'low' && wantsHard ? 'mobility_prehab' : input.family;
  const supportMeta = supportSessionMetadata({
    family,
    role: input.role,
    doseCategory,
    plannedIntensity,
  });
  return {
    goalId: plannedIntensity === 'low' && wantsHard ? 'mobility_prehab' : input.goalId,
    plannedIntensity,
    role: input.role,
    boxingRole: input.role,
    family,
    doseCategory,
    athleticDevelopmentDomain: supportMeta.athleticDevelopmentDomain,
    supportDomainLabel: supportMeta.supportDomainLabel,
    boxingRelevance: supportMeta.boxingRelevance,
    athleticDevelopmentRationale: supportMeta.athleticDevelopmentRationale,
    sAndCRationale: supportMeta.sAndCRationale,
    expectedFuelPriority: supportMeta.expectedFuelPriority,
    expectedCarbDemandClass: supportMeta.expectedCarbDemandClass,
    expectedRecoveryDemandClass: supportMeta.expectedRecoveryDemandClass,
    expectedHydrationDemandClass: supportMeta.expectedHydrationDemandClass,
    sessionEnergyDemandScore: supportMeta.sessionEnergyDemandScore,
    sessionRecoveryDemandScore: supportMeta.sessionRecoveryDemandScore,
    canStackWithProtected: plannedIntensity !== 'hard' && (doseCategory !== 'full_session' || LOW_LOAD_FAMILIES.has(input.family)),
    rationale: plannedIntensity === input.plannedIntensity
      ? input.rationale
      : [...input.rationale, 'This harder intent was converted to low-load boxing support because the hard-session budget is already used.'],
    ...(input.qualityTargets ? { qualityTargets: input.qualityTargets } : {}),
    countsAsHard: plannedIntensity === 'hard',
  };
}

function pushIntent(
  intents: BoxingPlannedSessionIntent[],
  input: Parameters<typeof intent>[0],
): number {
  const next = intent(input);
  intents.push(next);
  return next.countsAsHard ? input.hardUsed + 1 : input.hardUsed;
}

function buildIntents(input: {
  track: BoxingTrainingTrack;
  goalId: string;
  dose: BoxingDoseTemplate;
  ruleset: BoxingRulesetProfile;
  phase: ProgramPhase;
  gaps: readonly BoxingQualityGap[];
  generatedHardSessionCap: number;
  generatedSkillSupportCap: number;
  generatedConditioningHardCap: number;
  protectedCounts: ReturnType<typeof protectedCounts>;
}): BoxingPlannedSessionIntent[] {
  if (input.track === 'general_fitness_legacy') {
    const legacy: BoxingPlannedSessionIntent[] = [];
    let hardUsed = 0;
    if (input.dose.strengthPowerTarget > 0 && input.phase !== 'deload') {
      hardUsed = pushIntent(legacy, {
        goalId: input.goalId,
        plannedIntensity: 'hard',
        role: 'strength_power',
        family: 'strength_power',
        doseCategory: 'full_session',
        rationale: ['Legacy-compatible mode keeps the requested primary workout pattern.'],
        generatedHardSessionCap: input.generatedHardSessionCap,
        hardUsed,
      });
    }
    while (legacy.length < input.dose.generatedSessionTarget) {
      legacy.push(intent({
        goalId: legacy.some((item) => item.goalId === 'zone2_cardio') ? 'mobility' : 'zone2_cardio',
        plannedIntensity: 'low',
        role: legacy.some((item) => item.goalId === 'zone2_cardio') ? 'mobility_prehab' : 'roadwork_aerobic_base',
        family: legacy.some((item) => item.goalId === 'zone2_cardio') ? 'mobility_prehab' : 'roadwork_zone2',
        doseCategory: 'support_session',
        rationale: ['Legacy-compatible support preserves conservative training balance.'],
        generatedHardSessionCap: input.generatedHardSessionCap,
        hardUsed,
      }));
    }
    return legacy.slice(0, input.dose.generatedSessionTarget);
  }

  const intents: BoxingPlannedSessionIntent[] = [];
  let hardUsed = 0;
  const taper = input.ruleset.fightCampWeeksOut != null && input.ruleset.fightCampWeeksOut <= 1;
  const redDose = input.dose.hardDayCap === 0;
  const protectedRoadworkCovered = input.protectedCounts.protectedRoadworkCount >= input.dose.roadworkAerobicTarget;
  const protectedPracticeExposure = input.protectedCounts.protectedTechnicalCount
    + input.protectedCounts.protectedBagPadCount
    + input.protectedCounts.protectedSparringCount;
  const protectedSkillCovered = protectedPracticeExposure >= input.dose.boxingSkillTarget;

  if (redDose) {
    intents.push(intent({
      goalId: 'recovery_reset',
      plannedIntensity: 'recovery',
      role: 'recovery_reset',
      family: 'recovery_reset',
      doseCategory: 'recovery_reset',
      rationale: ['Red readiness removes hard generated work and keeps only recovery-oriented support.'],
      qualityTargets: ['recoveryCapacity'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
    intents.push(intent({
      goalId: 'mobility_prehab',
      plannedIntensity: 'low',
      role: 'mobility_prehab',
      family: 'mobility_prehab',
      doseCategory: 'microdose',
      rationale: ['A short mobility/prehab dose preserves useful frequency without adding hard load.'],
      qualityTargets: ['hipAnkleMobility', 'shoulderScapDurability'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
    return intents.slice(0, input.dose.generatedSessionTarget);
  }

  if (taper) {
    intents.push(intent({
      goalId: 'recovery_reset',
      plannedIntensity: 'recovery',
      role: 'recovery_reset',
      family: 'recovery_reset',
      doseCategory: 'recovery_reset',
      rationale: ['One week out, Athleticore keeps generated work restorative and avoids hard S&C.'],
      qualityTargets: ['recoveryCapacity'],
      generatedHardSessionCap: 0,
      hardUsed,
    }));
    intents.push(intent({
      goalId: 'shoulder_scap_durability',
      plannedIntensity: 'low',
      role: 'shoulder_scap_durability',
      family: 'shoulder_scap_durability',
      doseCategory: 'microdose',
      rationale: ['Taper support emphasizes shoulder/scapular durability without fatigue.'],
      qualityTargets: ['shoulderScapDurability', 'thoracicMobility'],
      generatedHardSessionCap: 0,
      hardUsed,
    }));
    intents.push(intent({
      goalId: 'shadowboxing_quality',
      plannedIntensity: 'low',
      role: 'boxing_skill_microdose',
      family: 'shadowboxing_quality',
      doseCategory: 'microdose',
      rationale: ['Technical-light shadowboxing keeps rhythm while preserving freshness.'],
      qualityTargets: ['boxingSkillFrequency', 'reactionRhythm'],
      generatedHardSessionCap: 0,
      hardUsed,
    }));
    return intents.slice(0, input.dose.generatedSessionTarget);
  }

  const skillSupportAlready = () => intents.filter((item) => item.athleticDevelopmentDomain === 'boxing_skill_support').length;
  const shouldAddSkillSupport = skillSupportAlready() < input.generatedSkillSupportCap && (
    !protectedSkillCovered
    || (input.track === 'aspiring_boxer' && protectedPracticeExposure === 0)
    || (input.track.startsWith('amateur') && protectedPracticeExposure < 2)
  );

  if (shouldAddSkillSupport) {
    intents.push(intent({
      goalId: input.track === 'aspiring_boxer' ? 'boxing_skill_microdose' : 'footwork_agility',
      plannedIntensity: 'low',
      role: input.track === 'aspiring_boxer' ? 'boxing_skill_microdose' : 'footwork_agility',
      family: input.track === 'aspiring_boxer' ? 'boxing_skill_microdose' : 'footwork_agility',
      doseCategory: 'microdose',
      rationale: [
        input.track === 'aspiring_boxer'
          ? 'Aspiring-boxer track uses low-risk shadowboxing and stance quality; sparring is not generated.'
          : 'Amateur track keeps footwork/agility frequent so pace and positioning improve without extra contact.',
      ],
      qualityTargets: ['boxingSkillFrequency', 'footworkAgility', 'reactionRhythm'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  if (input.dose.strengthPowerTarget > 0) {
    const proStrength = input.track.startsWith('pro');
    hardUsed = pushIntent(intents, {
      goalId: proStrength ? 'boxing_support' : 'lower_body_strength',
      plannedIntensity: input.generatedHardSessionCap > 0 && !proStrength ? 'hard' : 'moderate',
      role: proStrength ? 'strength_power' : 'max_strength_lower',
      family: proStrength ? 'strength_power' : 'max_strength_lower',
      doseCategory: 'full_session',
      rationale: [
        proStrength
          ? 'Pro track keeps strength-power as retention work so durability and power stay available for longer pacing demands.'
          : 'Amateur track gets a strength/power exposure without turning the week into generic lifting.',
      ],
      qualityTargets: ['lowerBodyMaxStrength', 'lowerBodyExplosiveStrength', 'rotationalPowerTransfer'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    });
  }

  if (!protectedRoadworkCovered && input.dose.roadworkAerobicTarget > 0) {
    intents.push(intent({
      goalId: 'roadwork_aerobic_base',
      plannedIntensity: 'low',
      role: 'roadwork_aerobic_base',
      family: 'roadwork_zone2',
      doseCategory: input.track.startsWith('pro') ? 'full_session' : 'support_session',
      rationale: [
        input.track.startsWith('pro')
          ? 'Pro track emphasizes aerobic depth and repeat-round recovery.'
          : 'Roadwork supports repeatability and recovery between bursts without adding reckless fatigue.',
      ],
      qualityTargets: ['aerobicBase', 'recoveryCapacity'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  if (input.track.startsWith('amateur') && input.dose.conditioningTarget > 0 && hardUsed < input.generatedConditioningHardCap) {
    hardUsed = pushIntent(intents, {
      goalId: 'alactic_repeat_power',
      plannedIntensity: input.track === 'amateur_novice' ? 'moderate' : 'hard',
      role: 'alactic_repeat_power',
      family: 'alactic_repeat_power',
      doseCategory: 'support_session',
      rationale: [
        input.track === 'amateur_novice'
          ? 'Novice amateur conditioning stays controlled so pace tolerance builds without reckless glycolytic volume.'
          : 'Amateur-open track prioritizes repeat-output and agility for high-pace short bouts.',
      ],
      qualityTargets: ['alacticPower', 'repeatAlacticCapacity', 'footworkAgility'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    });
  } else if (input.track.startsWith('pro') && input.dose.roadworkTempoTarget > 0 && !protectedRoadworkCovered && hardUsed < input.generatedConditioningHardCap) {
    hardUsed = pushIntent(intents, {
      goalId: 'roadwork_tempo',
      plannedIntensity: 'moderate',
      role: 'roadwork_tempo',
      family: 'roadwork_tempo',
      doseCategory: 'support_session',
      rationale: ['Pro track adds controlled tempo support for pacing durability without random finishers.'],
      qualityTargets: ['aerobicPower', 'glycolyticRoundTolerance'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    });
  }

  if (input.track.startsWith('pro')) {
    intents.push(intent({
      goalId: 'trunk_rotation_durability',
      plannedIntensity: 'low',
      role: 'trunk_rotation_durability',
      family: 'trunk_durability',
      doseCategory: 'support_session',
      rationale: ['Pro tracks bias trunk durability and repeat-round posture under fatigue.'],
      qualityTargets: ['antiRotationDurability', 'rotationalPowerTransfer'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  intents.push(intent({
    goalId: input.track.startsWith('pro') ? 'shoulder_scap_durability' : 'hip_ankle_mobility',
    plannedIntensity: 'low',
    role: input.track.startsWith('pro') ? 'shoulder_scap_durability' : 'hip_footwork_durability',
    family: input.track.startsWith('pro') ? 'shoulder_scap_durability' : 'hip_ankle_mobility',
    doseCategory: 'microdose',
    rationale: [
      input.track.startsWith('pro')
        ? 'Pro support keeps shoulders, scapulae, trunk, and neck/trap-adjacent capacity durable without extra contact.'
        : 'Footwork development needs hip, ankle, calf, and mobility support so frequency stays useful.',
    ],
    qualityTargets: input.track.startsWith('pro')
      ? ['shoulderScapDurability', 'neckTrapDurability', 'wristHandDurability']
      : ['hipAnkleMobility', 'thoracicMobility'],
    generatedHardSessionCap: input.generatedHardSessionCap,
    hardUsed,
  }));

  if (input.protectedCounts.protectedSparringCount >= 2 || input.dose.recoveryTarget > 0) {
    intents.push(intent({
      goalId: 'recovery_reset',
      plannedIntensity: 'recovery',
      role: 'recovery_reset',
      family: 'recovery_reset',
      doseCategory: 'recovery_reset',
      rationale: [
        input.protectedCounts.protectedSparringCount >= 2
          ? 'Your sparring already covers two hard boxing exposures, so Athleticore kept generated work supportive.'
          : 'Recovery reset preserves the week adaptation by protecting readiness.',
      ],
      qualityTargets: ['recoveryCapacity'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  const gapFamilies: Partial<Record<keyof BoxingPerformanceVector, BoxingSessionFamily>> = {
    shoulderScapDurability: 'shoulder_scap_durability',
    hipAnkleMobility: 'hip_ankle_mobility',
    aerobicBase: 'roadwork_zone2',
    alacticPower: 'alactic_repeat_power',
    recoveryCapacity: 'recovery_reset',
  };
  for (const gap of input.gaps) {
    if (intents.length >= input.dose.generatedSessionTarget) break;
    const family = gapFamilies[gap.quality];
    if (!family || intents.some((item) => item.family === family)) continue;
    const recovery = family === 'recovery_reset';
    const roadwork = family === 'roadwork_zone2';
    const supportGoal = family === 'shoulder_scap_durability'
      ? 'shoulder_scap_durability'
      : family === 'hip_ankle_mobility'
        ? 'hip_ankle_mobility'
        : 'mobility_prehab';
    intents.push(intent({
      goalId: recovery ? 'recovery_reset' : roadwork ? 'roadwork_aerobic_base' : supportGoal,
      plannedIntensity: recovery ? 'recovery' : 'low',
      role: recovery ? 'recovery_reset' : roadwork ? 'roadwork_aerobic_base' : 'mobility_prehab',
      family,
      doseCategory: recovery ? 'recovery_reset' : 'microdose',
      rationale: [`${String(gap.quality)} is underdosed this week, so this low-load support fills the gap.`],
      qualityTargets: [gap.quality],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  while (intents.length < input.dose.generatedSessionTarget) {
    const useMobility = intents.some((item) => item.family === 'roadwork_zone2');
    intents.push(intent({
      goalId: useMobility ? 'mobility_prehab' : 'roadwork_aerobic_base',
      plannedIntensity: 'low',
      role: useMobility ? 'mobility_prehab' : 'roadwork_aerobic_base',
      family: useMobility ? 'mobility_prehab' : 'roadwork_zone2',
      doseCategory: 'support_session',
      rationale: ['Low-load support preserves useful boxing-athlete frequency without forcing another hard day.'],
      qualityTargets: useMobility ? ['hipAnkleMobility', 'thoracicMobility'] : ['aerobicBase'],
      generatedHardSessionCap: input.generatedHardSessionCap,
      hardUsed,
    }));
  }

  return intents.slice(0, input.dose.generatedSessionTarget);
}

function rationaleForTrack(track: BoxingTrainingTrack, protectedCount: number): string[] {
  const base = [
    `Weekly dose resolved as ${track} with protected boxing load credited before Athleticore support is generated.`,
    `${protectedCount} protected session(s) count toward boxing practice, load, and hard-day exposure while Athleticore fills S&C, roadwork, durability, mobility, and recovery gaps.`,
  ];
  if (track.startsWith('amateur')) {
    base.push(`${track}: Athleticore prioritizes speed/agility, repeatability, roadwork, strength-power, and durability around coach-led boxing.`);
  }
  if (track.startsWith('pro')) {
    base.push(`${track}: Athleticore emphasizes pacing durability, aerobic depth, power retention, trunk/shoulder durability, and taper discipline.`);
  }
  if (track === 'aspiring_boxer') {
    base.push('Aspiring-boxer track includes safe skill-support microdoses plus roadwork, mobility, strength basics, and agility; sparring is never generated.');
  }
  return base;
}

function applyBuildPhaseGoalBias(input: {
  dose: BoxingDoseTemplate;
  goalType?: BoxingTrainingContext['buildPhaseGoalType'] | undefined;
  secondaryConstraint?: BoxingTrainingContext['buildPhaseSecondaryConstraint'] | undefined;
  protectedCounts: ReturnType<typeof protectedCounts>;
  track: BoxingTrainingTrack;
}): void {
  const { dose, goalType, protectedCounts: counts } = input;
  if (!goalType) return;

  switch (goalType) {
    case 'conditioning':
      dose.roadworkAerobicTarget = Math.max(
        dose.roadworkAerobicTarget,
        counts.protectedRoadworkCount > 0 ? 0 : counts.protectedSparringCount >= 2 ? 2 : 1,
      );
      dose.conditioningTarget = Math.max(dose.conditioningTarget, counts.protectedSparringCount >= 2 ? 0 : 1);
      dose.strengthPowerTarget = Math.max(dose.strengthPowerTarget, 1);
      dose.mobilityPrehabTarget = Math.max(dose.mobilityPrehabTarget, 1);
      dose.generatedSessionTarget = Math.max(dose.generatedSessionTarget, Math.min(6, dose.roadworkAerobicTarget + dose.strengthPowerTarget + dose.mobilityPrehabTarget + 2));
      break;
    case 'strength':
      dose.strengthPowerTarget = Math.max(dose.strengthPowerTarget, 2);
      dose.mobilityPrehabTarget = Math.max(dose.mobilityPrehabTarget, 1);
      break;
    case 'boxing_skill':
      dose.boxingSkillTarget = Math.max(dose.boxingSkillTarget, 3);
      dose.footworkAgilityTarget = Math.max(dose.footworkAgilityTarget, 2);
      dose.mobilityPrehabTarget = Math.max(dose.mobilityPrehabTarget, 1);
      break;
    case 'weight_class_prep':
      dose.roadworkAerobicTarget = Math.max(dose.roadworkAerobicTarget, counts.protectedRoadworkCount > 0 ? 0 : 2);
      dose.recoveryTarget = Math.max(dose.recoveryTarget, 1);
      dose.mobilityPrehabTarget = Math.max(dose.mobilityPrehabTarget, 1);
      break;
  }

  if (input.secondaryConstraint === 'protect_recovery' || input.secondaryConstraint === 'injury_risk') {
    dose.recoveryTarget = Math.max(dose.recoveryTarget, counts.protectedSparringCount >= 1 ? 1 : dose.recoveryTarget);
    dose.mobilityPrehabTarget = Math.max(dose.mobilityPrehabTarget, 1);
  }
}

function consecutiveHardDayCount(days: readonly number[]): number {
  const sorted = unique(days.map((day) => Math.max(1, Math.min(7, Math.round(day))))).sort((a, b) => a - b);
  let longest = 0;
  let current = 0;
  let previous = -10;
  for (const day of sorted) {
    current = day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

export function planWeeklyTrainingDose(input: {
  goalId: string;
  phase: ProgramPhase;
  readinessBand: WorkoutReadinessBand;
  protectedWorkouts: readonly ProtectedWorkoutInput[];
  boxingTrainingContext?: BoxingTrainingContext | undefined;
  combatSportContext?: CombatSportContext | undefined;
  sessionsPerWeek?: number | undefined;
  generatedSessionsPerWeek?: number | undefined;
  totalExposureTarget?: number | undefined;
  safetyFlags?: readonly string[] | undefined;
  recentWorkoutCompletions?: readonly WorkoutCompletionLog[] | undefined;
  recentProgressionDecisions?: readonly ProgressionDecision[] | undefined;
  recentFeedbackTags?: readonly string[] | undefined;
}): WeeklyTrainingDosePrescription {
  const track = resolveBoxingTrainingTrack({
    goalId: input.goalId,
    boxingTrainingContext: input.boxingTrainingContext,
    combatSportContext: input.combatSportContext,
    protectedWorkouts: input.protectedWorkouts,
  });
  const rulesetProfile = buildBoxingRulesetProfile({
    track,
    context: input.boxingTrainingContext,
    compatibilityContext: input.combatSportContext,
  });
  const baseDose = baseDoseForTrack(track);
  const requestedGeneratedSessions = input.generatedSessionsPerWeek
    ?? input.boxingTrainingContext?.generatedSessionsPerWeek
    ?? input.combatSportContext?.generatedSessionsPerWeek
    ?? input.sessionsPerWeek
    ?? null;
  if (requestedGeneratedSessions != null) {
    baseDose.generatedSessionTarget = Math.max(1, Math.round(requestedGeneratedSessions));
  }

  const adjustedDose = adjustedForReadiness({
    dose: baseDose,
    track,
    phase: input.phase,
    readinessBand: input.readinessBand,
    fightCampWeeksOut: rulesetProfile.fightCampWeeksOut,
    safetyFlags: input.safetyFlags ?? [],
  });
  const counts = protectedCounts(input.protectedWorkouts);
  if (counts.protectedRoadworkCount > 0) {
    adjustedDose.roadworkAerobicTarget = Math.max(0, adjustedDose.roadworkAerobicTarget - counts.protectedRoadworkCount);
    adjustedDose.roadworkTempoTarget = Math.max(0, adjustedDose.roadworkTempoTarget - Math.max(0, counts.protectedRoadworkCount - 1));
  }
  const protectedBoxingPracticeExposure = counts.protectedTechnicalCount
    + counts.protectedBagPadCount
    + counts.protectedSparringCount;
  if (counts.protectedTechnicalCount + counts.protectedBagPadCount >= 2) {
    adjustedDose.boxingSkillTarget = Math.min(adjustedDose.boxingSkillTarget, 1);
    adjustedDose.footworkAgilityTarget = Math.min(adjustedDose.footworkAgilityTarget, 1);
    adjustedDose.strengthPowerTarget = Math.max(adjustedDose.strengthPowerTarget, 1);
    adjustedDose.roadworkAerobicTarget = Math.max(adjustedDose.roadworkAerobicTarget, counts.protectedRoadworkCount > 0 ? 0 : 1);
    adjustedDose.mobilityPrehabTarget = Math.max(adjustedDose.mobilityPrehabTarget, 1);
  }
  if (counts.protectedSparringCount >= 1) {
    adjustedDose.conditioningTarget = Math.min(adjustedDose.conditioningTarget, counts.protectedSparringCount >= 2 ? 0 : 1);
    adjustedDose.roadworkTempoTarget = Math.min(adjustedDose.roadworkTempoTarget, counts.protectedSparringCount >= 2 ? 0 : 1);
    adjustedDose.hardDayTarget = Math.min(adjustedDose.hardDayTarget, counts.protectedSparringCount >= 2 ? 1 : 2);
    adjustedDose.mobilityPrehabTarget = Math.max(adjustedDose.mobilityPrehabTarget, 1);
    adjustedDose.recoveryTarget = Math.max(adjustedDose.recoveryTarget, counts.protectedSparringCount >= 2 ? 1 : adjustedDose.recoveryTarget);
    if (counts.protectedSparringCount >= 2) {
      adjustedDose.strengthPowerTarget = Math.max(adjustedDose.strengthPowerTarget, track.startsWith('pro') ? 1 : adjustedDose.strengthPowerTarget);
    }
  }
  applyBuildPhaseGoalBias({
    dose: adjustedDose,
    goalType: input.boxingTrainingContext?.buildPhaseGoalType,
    secondaryConstraint: input.boxingTrainingContext?.buildPhaseSecondaryConstraint,
    protectedCounts: counts,
    track,
  });

  const completionFamilies = progressionFamilies({
    completions: input.recentWorkoutCompletions ?? [],
    intents: [],
  });
  const provisionalProgressionDecisions = completionFamilies.map((family) => evaluateBoxingProgressionForFamily({
    family,
    recentWorkoutCompletions: input.recentWorkoutCompletions as WorkoutCompletionLog[] | undefined,
    recentProgressionDecisions: input.recentProgressionDecisions as ProgressionDecision[] | undefined,
    feedbackTags: input.recentFeedbackTags as string[] | undefined,
  }));
  for (const decision of provisionalProgressionDecisions) {
    if (decision.action === 'progress_volume' && decision.doseTargetDelta && decision.doseTargetDelta > 0) {
      if (decision.family === 'roadwork_zone2') adjustedDose.roadworkAerobicTarget += decision.doseTargetDelta;
      else if (decision.family === 'roadwork_tempo') adjustedDose.roadworkTempoTarget += decision.doseTargetDelta;
      else if (decision.family === 'mobility_prehab' || decision.family === 'recovery_reset') adjustedDose.mobilityPrehabTarget += decision.doseTargetDelta;
      adjustedDose.generatedSessionTarget = Math.min(adjustedDose.generatedSessionTarget + 1, adjustedDose.totalExposureTarget + 1);
    }
    if (decision.action === 'progress_intensity' && decision.family === 'roadwork_tempo') {
      adjustedDose.roadworkTempoTarget += 1;
    }
    if (decision.hardGeneratedCapDelta && decision.hardGeneratedCapDelta < 0) {
      adjustedDose.hardDayTarget = Math.max(0, adjustedDose.hardDayTarget + decision.hardGeneratedCapDelta);
      adjustedDose.hardDayCap = Math.max(0, adjustedDose.hardDayCap + decision.hardGeneratedCapDelta);
      adjustedDose.conditioningTarget = Math.max(0, adjustedDose.conditioningTarget - 1);
    }
  }

  const ledger = protectedLoadLedger({
    protectedWorkouts: input.protectedWorkouts,
    hardDayCap: adjustedDose.hardDayCap,
    ruleset: rulesetProfile,
  });
  const highProtectedLoad = ledger.protectedLoadScore >= 1_000 || counts.protectedHardDayCount >= 2;
  const generatedConditioningHardCap = counts.protectedSparringCount >= 2
    ? 0
    : counts.protectedSparringCount >= 1
      ? 1
      : adjustedDose.hardDayCap;
  const generatedHardSessionCap = Math.max(0, Math.min(
    adjustedDose.strengthPowerTarget + adjustedDose.conditioningTarget + adjustedDose.roadworkTempoTarget,
    adjustedDose.hardDayCap - counts.protectedHardDayCount,
    highProtectedLoad ? 1 : adjustedDose.hardDayCap,
    generatedConditioningHardCap + Math.max(0, adjustedDose.strengthPowerTarget),
  ));
  const generatedSkillSupportCap = protectedBoxingPracticeExposure >= 2
    ? 1
    : Math.max(1, adjustedDose.boxingSkillTarget + Math.min(1, adjustedDose.footworkAgilityTarget));
  const generatedStrengthPowerFloor = adjustedDose.strengthPowerTarget > 0 ? 1 : 0;
  const generatedDurabilityFloor = adjustedDose.mobilityPrehabTarget > 0 || adjustedDose.recoveryTarget > 0 ? 1 : 0;
  const generatedRoadworkFloor = adjustedDose.roadworkAerobicTarget > 0 || adjustedDose.roadworkTempoTarget > 0 ? 1 : 0;
  const currentVector = performanceVectorFromLedger(ledger);
  const targetVector = targetPerformanceVector(adjustedDose, track);
  const gaps = qualityGaps(currentVector, targetVector);
  const totalExposureTarget = input.totalExposureTarget
    ?? input.boxingTrainingContext?.totalExposureTarget
    ?? input.combatSportContext?.totalExposureTarget
    ?? Math.max(adjustedDose.totalExposureTarget, adjustedDose.generatedSessionTarget + input.protectedWorkouts.length);
  const intents = buildIntents({
    track,
    goalId: input.goalId,
    dose: adjustedDose,
    ruleset: rulesetProfile,
    phase: input.phase,
    gaps,
    generatedHardSessionCap,
    generatedSkillSupportCap,
    generatedConditioningHardCap,
    protectedCounts: counts,
  });
  const progressionDecisions = provisionalProgressionDecisions.length
    ? provisionalProgressionDecisions
    : progressionFamilies({ completions: [], intents })
      .map((family) => evaluateBoxingProgressionForFamily({
        family,
        recentWorkoutCompletions: input.recentWorkoutCompletions as WorkoutCompletionLog[] | undefined,
        recentProgressionDecisions: input.recentProgressionDecisions as ProgressionDecision[] | undefined,
        feedbackTags: input.recentFeedbackTags as string[] | undefined,
      }))
      .filter((decision) => decision.action !== 'repeat' || decision.doseTargetDelta !== 0);
  const variance = variancePlan({
    track,
    readinessBand: input.readinessBand,
    phase: input.phase,
    fightCampWeeksOut: rulesetProfile.fightCampWeeksOut,
    safetyFlags: input.safetyFlags ?? [],
    intents,
    progressionDecisions,
  });
  const boxingProgressionPhase = phaseFromContext({
    context: input.boxingTrainingContext,
    phase: input.phase,
    ruleset: rulesetProfile,
    track,
  });

  const warnings: string[] = [];
  if (counts.protectedHardDayCount > adjustedDose.hardDayCap) {
    warnings.push('Protected hard boxing/load exposures already exceed this week hard-day cap; generated hard work is removed.');
  } else if (generatedHardSessionCap < adjustedDose.strengthPowerTarget && adjustedDose.strengthPowerTarget > 0) {
    warnings.push('Generated hard support was reduced because protected hard work already uses the week hard-day budget.');
  }
  if (input.readinessBand === 'red') warnings.push('Red readiness blocks hard generated work and leaves recovery, mobility, and microdose support only.');
  if (rulesetProfile.fightCampWeeksOut != null && rulesetProfile.fightCampWeeksOut <= 1) {
    warnings.push('Fight-camp taper removes hard generated S&C and keeps maintenance, recovery, mobility, and technical-light support.');
  }
  if (counts.protectedRoadworkCount > 0) {
    warnings.push('Roadwork is already covered, so this week reduces extra roadwork and emphasizes the next boxing-athlete support gaps.');
  }
  if (protectedBoxingPracticeExposure >= 2) {
    warnings.push('Your protected boxing anchors cover practice exposure; Athleticore-generated work is biased toward S&C and recovery support.');
  }
  if (counts.protectedSparringCount >= 2) {
    warnings.push('Two or more sparring anchors cap generated hard conditioning; support work stays mostly aerobic, durability, recovery, and low-volume strength-power.');
  }

  const plan: WeeklyTrainingDosePrescription = {
    archetype: track,
    track,
    rulesetProfile,
    boxingProgressionPhase,
    totalExposureTarget,
    generatedSessionTarget: intents.length,
    generatedFullSessionTarget: Math.min(adjustedDose.generatedFullSessionTarget, intents.filter((item) => item.doseCategory === 'full_session').length),
    supportMicrodoseTarget: adjustedDose.supportMicrodoseTarget,
    boxingSkillTarget: adjustedDose.boxingSkillTarget,
    footworkAgilityTarget: adjustedDose.footworkAgilityTarget,
    strengthPowerTarget: adjustedDose.strengthPowerTarget,
    roadworkAerobicTarget: adjustedDose.roadworkAerobicTarget,
    roadworkTempoTarget: adjustedDose.roadworkTempoTarget,
    conditioningTarget: adjustedDose.conditioningTarget,
    mobilityPrehabTarget: adjustedDose.mobilityPrehabTarget,
    recoveryTarget: adjustedDose.recoveryTarget,
    aerobicSupportTarget: adjustedDose.roadworkAerobicTarget,
    conditioningSupportTarget: adjustedDose.conditioningTarget,
    hardDayTarget: adjustedDose.hardDayTarget,
    hardDayCap: adjustedDose.hardDayCap,
    protectedHardDayCount: counts.protectedHardDayCount,
    protectedSparringCount: counts.protectedSparringCount,
    protectedRoadworkCount: counts.protectedRoadworkCount,
    protectedLoadScore: ledger.protectedLoadScore,
    generatedHardSessionCap,
    generatedSkillSupportCap,
    generatedConditioningHardCap,
    generatedStrengthPowerFloor,
    generatedDurabilityFloor,
    generatedRoadworkFloor,
    performanceVector: currentVector,
    qualityGaps: gaps,
    loadLedger: ledger,
    intents,
    boxingProgressionDecisions: progressionDecisions,
    variancePlan: variance,
    rationale: [
      ...rationaleForTrack(track, input.protectedWorkouts.length),
      protectedBoxingPracticeExposure >= 2
        ? 'Protected boxing practice covers the technical exposure, so generated work biases S&C, roadwork, durability, mobility, and recovery support.'
        : 'Generated support keeps boxing context while filling the athlete-development qualities around practice.',
      counts.protectedSparringCount >= 1
        ? 'Sparring owns the highest-stress boxing work; generated conditioning is capped and supportive.'
        : 'No protected sparring signal was found, so Athleticore can use controlled conditioning only when the week can absorb it.',
      `Hard-day cap is ${adjustedDose.hardDayCap}; protected hard-day count is ${counts.protectedHardDayCount}; generated hard cap is ${generatedHardSessionCap}.`,
      'Variance is controlled: formats may rotate, but the trained boxing qualities stay anchored.',
      ...progressionDecisions.map((decision) => `Progression signal for ${decision.family}: ${decision.rationale}`),
    ],
    warnings,
  };
  return {
    ...plan,
    boxingWeeklyDosePlan: plan,
  };
}

function sessionEstimatedMinutes(session: GeneratedProgramSession): number {
  return session.workout?.estimatedDurationMinutes
    ?? session.workout?.requestedDurationMinutes
    ?? session.protectedDurationMinutes
    ?? 0;
}

function sessionHard(session: GeneratedProgramSession): boolean {
  if (session.plannedIntensity === 'hard') return true;
  if (session.plannedIntensity === 'moderate' && session.boxingSessionFamily && HARD_FAMILIES.has(session.boxingSessionFamily)) return true;
  if (session.protectedAnchor && session.protectedWorkoutModality) {
    return session.protectedWorkoutModality === 'sparring' || session.protectedWorkoutModality === 'competition';
  }
  return false;
}

function numericPayloadTarget(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null) return fallback;
  const record = value as { target?: unknown; min?: unknown; max?: unknown };
  for (const candidate of [record.target, record.min, record.max]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
  }
  return fallback;
}

function familyForActualSession(session: GeneratedProgramSession): BoxingSessionFamily | undefined {
  return familyForTemplateId(session.workout?.templateId)
    ?? familyForGoalId(session.workout?.goalId)
    ?? session.boxingSessionFamily;
}

function generatedSessionLoadScore(session: GeneratedProgramSession, minutes: number): number {
  if (session.estimatedLoadScore != null && Number.isFinite(session.estimatedLoadScore)) return session.estimatedLoadScore;
  const rpe = session.plannedIntensity === 'hard'
    ? 8
    : session.plannedIntensity === 'moderate'
      ? 6
      : session.plannedIntensity === 'recovery'
        ? 2
        : 3;
  return Math.round(minutes * rpe);
}

export function contributionForGeneratedSession(session: GeneratedProgramSession): BoxingGeneratedDoseContribution {
  const zero: BoxingGeneratedDoseContribution = {
    minutes: 0,
    loadScore: 0,
    strengthMainSets: 0,
    powerContacts: 0,
    trunkDurabilitySets: 0,
    shoulderPrehabMinutes: 0,
    mobilityMinutes: 0,
    roadworkMinutes: 0,
    highIntensityIntervals: 0,
    alacticBursts: 0,
    glycolyticRounds: 0,
    technicalMicrodoseMinutes: 0,
    fullSessionCount: 0,
    supportSessionCount: 0,
    microdoseCount: 0,
    recoveryResetCount: 0,
    counted: false,
    rationale: [],
  };
  if (session.protectedAnchor) return { ...zero, rationale: ['Protected anchors are accounted separately.'] };
  if (!session.workout || session.workout.blocked) return { ...zero, rationale: ['Blocked or missing workouts do not count as successful generated dose.'] };
  const minutes = sessionEstimatedMinutes(session);
  const family = familyForActualSession(session);
  const contribution: BoxingGeneratedDoseContribution = {
    ...zero,
    minutes,
    loadScore: generatedSessionLoadScore(session, minutes),
    fullSessionCount: session.sessionDoseCategory === 'full_session' ? 1 : 0,
    supportSessionCount: session.sessionDoseCategory === 'support_session' || session.sessionDoseCategory === 'recovery_reset' ? 1 : 0,
    microdoseCount: session.sessionDoseCategory === 'microdose' ? 1 : 0,
    recoveryResetCount: session.sessionDoseCategory === 'recovery_reset' ? 1 : 0,
    counted: true,
    rationale: [`Actual generated template ${session.workout.templateId} credited as ${family ?? 'unknown boxing support'}.`],
  };

  for (const block of session.workout.blocks) {
    for (const exercise of block.exercises) {
      const payload = exercise.prescription.payload as unknown as Record<string, unknown>;
      const sets = exercise.prescription.sets ?? numericPayloadTarget(payload.sets, block.kind === 'main' ? 2 : 1);
      const duration = exercise.prescription.durationMinutes
        ?? numericPayloadTarget(payload.durationMinutes, Math.max(1, Math.round(block.estimatedDurationMinutes / Math.max(1, block.exercises.length))));
      const patternText = exercise.movementPatternIds.join(' ');
      const isMain = block.kind === 'main';
      const kind = exercise.prescription.kind;

      if (isMain && (kind === 'resistance' || session.workout.workoutTypeId.includes('strength'))) {
        contribution.strengthMainSets += Math.max(0, sets);
      }
      if (kind === 'power') {
        const reps = typeof exercise.prescription.reps === 'string'
          ? Number.parseInt(exercise.prescription.reps, 10)
          : NaN;
        contribution.powerContacts += Math.max(4, Math.round(sets * (Number.isFinite(reps) ? reps : 4)));
      }
      if (kind === 'cardio' || /roadwork|zone2|tempo/.test(session.workout.templateId)) {
        contribution.roadworkMinutes += Math.max(0, duration);
      }
      if (kind === 'interval' || kind === 'conditioning') {
        const rounds = numericPayloadTarget(payload.rounds, family === 'glycolytic_round_tolerance' ? 3 : 6);
        contribution.highIntensityIntervals += Math.max(0, Math.round(rounds));
        if (family === 'alactic_repeat_power' || session.workout.templateId.includes('alactic')) {
          contribution.alacticBursts += Math.max(0, Math.round(rounds));
        }
        if (family === 'glycolytic_round_tolerance' || session.workout.templateId.includes('glycolytic')) {
          contribution.glycolyticRounds += Math.max(1, Math.round(rounds / 2));
        }
      }
      if (/rotation|anti_rotation|carry|core|bracing/.test(patternText) || family === 'trunk_durability') {
        contribution.trunkDurabilitySets += Math.max(0, isMain ? sets : Math.ceil(sets / 2));
      }
      if (/shoulder_prehab|scap|thoracic/.test(patternText) || family === 'shoulder_scap_durability' || family === 'neck_trap_durability') {
        contribution.shoulderPrehabMinutes += Math.max(0, duration);
      }
      if (kind === 'mobility' || kind === 'flexibility' || kind === 'recovery' || /mobility|breathing|balance/.test(patternText)) {
        contribution.mobilityMinutes += Math.max(0, duration);
      }
      if (['boxing_skill_microdose', 'footwork_agility', 'reaction_rhythm', 'shadowboxing_quality', 'bag_pad_support'].includes(family ?? '')) {
        contribution.technicalMicrodoseMinutes += Math.max(0, duration);
      }
    }
  }

  if (family === 'rotational_power' || family === 'explosive_power') contribution.powerContacts = Math.max(contribution.powerContacts, 16);
  if (family === 'alactic_repeat_power') contribution.alacticBursts = Math.max(contribution.alacticBursts, 6);
  if (family === 'glycolytic_round_tolerance') contribution.glycolyticRounds = Math.max(contribution.glycolyticRounds, 2);
  if (family === 'recovery_reset') contribution.mobilityMinutes = Math.max(contribution.mobilityMinutes, minutes);
  if (contribution.technicalMicrodoseMinutes > 0 && contribution.microdoseCount === 0) {
    contribution.microdoseCount = 1;
  }
  return contribution;
}

function generatedDoseContribution(session: GeneratedProgramSession, ledger: BoxingWeeklyLoadLedger): void {
  const contribution = contributionForGeneratedSession(session);
  if (!contribution.counted) return;
  ledger.generatedFullSessionCount += contribution.fullSessionCount;
  ledger.generatedSupportSessionCount += contribution.supportSessionCount;
  ledger.generatedMicrodoseCount += contribution.microdoseCount;
  ledger.generatedLoadScore += contribution.loadScore;
  ledger.sessionRpeLoad += contribution.loadScore;
  ledger.strengthMainSets += contribution.strengthMainSets;
  ledger.powerContacts += contribution.powerContacts;
  ledger.trunkDurabilitySets += contribution.trunkDurabilitySets;
  ledger.shoulderPrehabMinutes += contribution.shoulderPrehabMinutes;
  ledger.mobilityMinutes += contribution.mobilityMinutes;
  ledger.roadworkMinutes += contribution.roadworkMinutes;
  ledger.highIntensityIntervals += contribution.highIntensityIntervals;
  ledger.alacticBursts += contribution.alacticBursts;
  ledger.glycolyticRounds += contribution.glycolyticRounds;
  ledger.technicalMicrodoseMinutes += contribution.technicalMicrodoseMinutes;
  const family = familyForActualSession(session);
  switch (family) {
    case 'max_strength_lower':
    case 'strength_power':
      ledger.strengthMainSets += Math.max(0, contribution.strengthMainSets === 0 ? (session.sessionDoseCategory === 'full_session' ? 8 : 4) : 0);
      ledger.powerContacts += family === 'strength_power' && contribution.powerContacts === 0 ? 12 : 0;
      break;
    case 'explosive_power':
    case 'rotational_power':
      ledger.powerContacts += contribution.powerContacts === 0 ? 20 : 0;
      ledger.trunkDurabilitySets += family === 'rotational_power' && contribution.trunkDurabilitySets === 0 ? 4 : 0;
      break;
    case 'alactic_repeat_power':
      ledger.alacticBursts += contribution.alacticBursts === 0 ? 10 : 0;
      ledger.powerContacts += contribution.powerContacts === 0 ? 16 : 0;
      break;
    case 'glycolytic_round_tolerance':
      ledger.glycolyticRounds += contribution.glycolyticRounds === 0 ? 3 : 0;
      ledger.highIntensityIntervals += contribution.highIntensityIntervals === 0 ? 4 : 0;
      break;
    case 'roadwork_zone2':
    case 'roadwork_tempo':
    case 'roadwork_intervals':
      ledger.roadworkMinutes += contribution.roadworkMinutes === 0 ? sessionEstimatedMinutes(session) : 0;
      if (family !== 'roadwork_zone2' && contribution.highIntensityIntervals === 0) ledger.highIntensityIntervals += family === 'roadwork_intervals' ? 6 : 3;
      break;
    case 'trunk_durability':
      ledger.trunkDurabilitySets += contribution.trunkDurabilitySets === 0 ? 6 : 0;
      break;
    case 'shoulder_scap_durability':
    case 'neck_trap_durability':
      ledger.shoulderPrehabMinutes += contribution.shoulderPrehabMinutes === 0 ? sessionEstimatedMinutes(session) : 0;
      ledger.mobilityMinutes += contribution.mobilityMinutes === 0 ? Math.round(sessionEstimatedMinutes(session) * 0.5) : 0;
      break;
    case 'hip_ankle_mobility':
    case 'mobility_prehab':
    case 'recovery_reset':
      ledger.mobilityMinutes += contribution.mobilityMinutes === 0 ? sessionEstimatedMinutes(session) : 0;
      break;
    case 'boxing_skill_microdose':
    case 'footwork_agility':
    case 'reaction_rhythm':
    case 'shadowboxing_quality':
    case 'bag_pad_support':
    case 'boxing_conditioning_support':
      ledger.powerContacts += family === 'boxing_conditioning_support' && contribution.powerContacts === 0 ? 8 : 0;
      ledger.trunkDurabilitySets += family === 'bag_pad_support' && contribution.trunkDurabilitySets === 0 ? 2 : 0;
      break;
  }
}

export function finalizeBoxingWeeklyDosePlan(
  plan: WeeklyTrainingDosePrescription,
  sessions: readonly GeneratedProgramSession[],
): WeeklyTrainingDosePrescription {
  const ledger: BoxingWeeklyLoadLedger = {
    ...plan.loadLedger,
    generatedFullSessionCount: 0,
    generatedSupportSessionCount: 0,
    generatedMicrodoseCount: 0,
    generatedLoadScore: 0,
  };
  const hardDays: number[] = [];
  for (const session of sessions) {
    if (sessionHard(session)) hardDays.push(session.dayIndex);
    generatedDoseContribution(session, ledger);
  }
  ledger.hardDayCount = unique(hardDays).length;
  ledger.consecutiveHardDayCount = consecutiveHardDayCount(hardDays);
  const performanceVector = performanceVectorFromLedger(ledger);
  const targetVector = targetPerformanceVector({
    totalExposureTarget: plan.totalExposureTarget,
    generatedSessionTarget: plan.generatedSessionTarget,
    generatedFullSessionTarget: plan.generatedFullSessionTarget,
    supportMicrodoseTarget: plan.supportMicrodoseTarget,
    boxingSkillTarget: plan.boxingSkillTarget,
    footworkAgilityTarget: plan.footworkAgilityTarget,
    strengthPowerTarget: plan.strengthPowerTarget,
    roadworkAerobicTarget: plan.roadworkAerobicTarget,
    roadworkTempoTarget: plan.roadworkTempoTarget,
    conditioningTarget: plan.conditioningTarget,
    mobilityPrehabTarget: plan.mobilityPrehabTarget,
    recoveryTarget: plan.recoveryTarget,
    hardDayTarget: plan.hardDayTarget,
    hardDayCap: plan.hardDayCap,
  }, plan.track);
  const finalized = {
    ...plan,
    loadLedger: ledger,
    performanceVector,
    qualityGaps: qualityGaps(performanceVector, targetVector),
  };
  return {
    ...finalized,
    boxingWeeklyDosePlan: finalized,
  };
}
