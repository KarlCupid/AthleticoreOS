import type {
  ActivityType,
  PlanSlot,
  SessionDoseSummary,
  SessionModulePlan,
  TrainingSessionFamily,
  WeeklyPlanConfigRow,
  WeeklyPlanEntryRow,
  WorkoutDoseBucket,
  WorkoutFocus,
  WorkoutPrescriptionV2,
} from '../../engine/types';
import {
  contributionForGeneratedSession,
  templateIdForBoxingFamily,
} from './boxingTrainingModel.ts';
import {
  familyToAthleticDevelopmentDomain,
  protectedModalityToAthleticDevelopmentDomain,
  supportDomainSourceLabel,
  supportSessionMetadata,
} from './athleteSupportDomains.ts';
import type {
  AthleteSupportFuelPriority,
  BoxingAthleteSupportDomain,
  BoxingPlannedSessionRole,
  BoxingQualityGap,
  BoxingSessionDoseCategory,
  BoxingSessionFamily,
  BoxingTrainingContext,
  BoxingVariancePlan,
  BoxingWeeklyLoadLedger,
  GeneratedProgram,
  GeneratedProgramSession,
  GeneratedProgramWeek,
  GeneratedWorkout,
  ProtectedWorkoutModality,
  WeeklyTrainingDosePrescription,
  WorkoutIntensity,
  WorkoutReadinessBand,
  SupportDemandClass,
} from './types.ts';
import type { WorkoutProgrammingUserRequest } from './workoutProgrammingServiceTypes.ts';

type PersistableWeeklyPlanEntry = Omit<WeeklyPlanEntryRow, 'id' | 'created_at'>;

export interface BoxingGeneratedPlanEntrySnapshot {
  snapshotKind: 'boxing_generated_program_entry';
  schemaVersion: 1;
  sourceOfTruth: 'GeneratedProgram';
  programId: string;
  userProgramId?: string | null | undefined;
  sessionId: string;
  generatedWorkoutId?: string | null | undefined;
  weekIndex: number;
  dayIndex: number;
  scheduledDate: string;
  label: string;
  protectedAnchor: boolean;
  goalId: string;
  preferredSessionTemplateId?: string | null | undefined;
  plannedIntensity?: WorkoutIntensity | undefined;
  estimatedDurationMinutes: number;
  estimatedLoadScore?: number | null | undefined;
  boxingSessionFamily?: BoxingSessionFamily | undefined;
  boxingSessionRole?: BoxingPlannedSessionRole | undefined;
  sessionDoseCategory?: BoxingSessionDoseCategory | undefined;
  athleticDevelopmentDomain?: BoxingAthleteSupportDomain | undefined;
  sAndCRationale?: string | undefined;
  athleticDevelopmentRationale?: string | undefined;
  boxingRelevance?: string | undefined;
  supportDomainLabel?: string | undefined;
  isBoxingPracticeReplacement: false;
  isCoachLedRequired?: boolean | undefined;
  expectedFuelPriority?: AthleteSupportFuelPriority | undefined;
  expectedCarbDemandClass?: SupportDemandClass | undefined;
  expectedRecoveryDemandClass?: SupportDemandClass | undefined;
  expectedHydrationDemandClass?: SupportDemandClass | undefined;
  sessionEnergyDemandScore?: number | undefined;
  sessionRecoveryDemandScore?: number | undefined;
  protectedWorkoutModality?: ProtectedWorkoutModality | undefined;
  protectedDurationMinutes?: number | undefined;
  rationale: string[];
  generatedWorkout: GeneratedWorkout | null;
  weekSummary: BoxingGeneratedProgramWeekSnapshot;
}

export interface BoxingGeneratedProgramWeekSnapshot {
  weeklyBoxingHeadline?: string | undefined;
  weeklyBoxingSummary?: string | undefined;
  primaryBoxingFocus?: string | undefined;
  weeklyAthleticDevelopmentHeadline?: string | undefined;
  weeklyAthleticDevelopmentSummary?: string | undefined;
  sAndCFocus?: string | undefined;
  supportDomainSummary?: Record<BoxingAthleteSupportDomain, number> | undefined;
  protectedBoxingPracticeSummary?: string | undefined;
  athleticDevelopmentFocusAreas?: BoxingAthleteSupportDomain[] | undefined;
  hardDaySummary?: string | undefined;
  protectedLoadSummary?: string | undefined;
  generatedSupportSummary?: string | undefined;
  nextBestAction?: string | undefined;
  coachSummaryBullets: string[];
  coachRationale: string[];
  userFacingWarnings: string[];
  validationWarnings: string[];
  hardDayCount: number;
  hardDayCap?: number | undefined;
  generatedFullSessionCount?: number | undefined;
  generatedSupportSessionCount?: number | undefined;
  generatedMicrodoseCount?: number | undefined;
  protectedBoxingSessionCount?: number | undefined;
  protectedSparringCount?: number | undefined;
  protectedRoadworkCount?: number | undefined;
  generatedSAndCSessionCount?: number | undefined;
  generatedSkillSupportCount?: number | undefined;
  generatedRoadworkCount?: number | undefined;
  generatedStrengthPowerCount?: number | undefined;
  generatedDurabilityCount?: number | undefined;
  generatedRecoveryCount?: number | undefined;
  boxingWeeklyDosePlan?: WeeklyTrainingDosePrescription | undefined;
  boxingLoadLedger?: BoxingWeeklyLoadLedger | undefined;
  qualityGaps: BoxingQualityGap[];
  variancePlan?: BoxingVariancePlan | undefined;
}

export interface GeneratedProgramWeeklyPlanAdapterResult {
  entries: PersistableWeeklyPlanEntry[];
  warnings: string[];
  sourceSummary: {
    sourceOfTruth: 'GeneratedProgram';
    programId: string;
    userProgramId?: string | null | undefined;
    weekStart: string;
    generatedSessionCount: number;
    protectedAnchorCount: number;
    generatedFullSessionCount: number;
    generatedSupportSessionCount: number;
    generatedMicrodoseCount: number;
    protectedBoxingSessionCount: number;
    protectedSparringCount: number;
    protectedRoadworkCount: number;
    generatedSAndCSessionCount: number;
    generatedSkillSupportCount: number;
    generatedRoadworkCount: number;
    generatedStrengthPowerCount: number;
    generatedDurabilityCount: number;
    generatedRecoveryCount: number;
    supportDomainSummary?: Record<BoxingAthleteSupportDomain, number> | undefined;
  };
}

export interface LegacyWeeklyPlanEntryMigrationIntent {
  status: 'migratable' | 'archived_compatibility';
  reason: string;
  family?: BoxingSessionFamily;
  role?: BoxingPlannedSessionRole;
  doseCategory?: BoxingSessionDoseCategory;
  preferredSessionTemplateId?: string;
  goalId?: string;
}

const TECHNICAL_FAMILIES = new Set<BoxingSessionFamily>([
  'boxing_skill_microdose',
  'footwork_agility',
  'reaction_rhythm',
  'shadowboxing_quality',
  'bag_pad_support',
]);

const ROADWORK_FAMILIES = new Set<BoxingSessionFamily>([
  'roadwork_zone2',
  'roadwork_tempo',
  'roadwork_intervals',
]);

const CONDITIONING_FAMILIES = new Set<BoxingSessionFamily>([
  'alactic_repeat_power',
  'glycolytic_round_tolerance',
  'boxing_conditioning_support',
]);

const DURABILITY_FAMILIES = new Set<BoxingSessionFamily>([
  'trunk_durability',
  'shoulder_scap_durability',
  'neck_trap_durability',
  'hip_ankle_mobility',
  'mobility_prehab',
]);

const GOAL_ID_BY_FAMILY: Record<BoxingSessionFamily, string> = {
  boxing_skill_microdose: 'boxing_skill_microdose',
  footwork_agility: 'footwork_agility',
  reaction_rhythm: 'boxing_skill_microdose',
  shadowboxing_quality: 'shadowboxing_quality',
  bag_pad_support: 'shadowboxing_quality',
  max_strength_lower: 'lower_body_strength',
  strength_power: 'boxing_support',
  explosive_power: 'rotational_power',
  rotational_power: 'rotational_power',
  trunk_durability: 'trunk_rotation_durability',
  shoulder_scap_durability: 'shoulder_scap_durability',
  neck_trap_durability: 'neck_trap_durability',
  hip_ankle_mobility: 'hip_ankle_mobility',
  roadwork_zone2: 'roadwork_aerobic_base',
  roadwork_tempo: 'roadwork_tempo',
  roadwork_intervals: 'roadwork_intervals',
  alactic_repeat_power: 'alactic_repeat_power',
  glycolytic_round_tolerance: 'glycolytic_round_tolerance',
  boxing_conditioning_support: 'alactic_repeat_power',
  mobility_prehab: 'hip_ankle_mobility',
  recovery_reset: 'recovery_reset',
};

const ROLE_BY_FAMILY: Record<BoxingSessionFamily, BoxingPlannedSessionRole> = {
  boxing_skill_microdose: 'boxing_skill_microdose',
  footwork_agility: 'footwork_agility',
  reaction_rhythm: 'reaction_rhythm',
  shadowboxing_quality: 'boxing_technical_practice',
  bag_pad_support: 'bag_or_pad_support',
  max_strength_lower: 'max_strength_lower',
  strength_power: 'strength_power',
  explosive_power: 'explosive_power',
  rotational_power: 'rotational_power',
  trunk_durability: 'trunk_rotation_durability',
  shoulder_scap_durability: 'shoulder_scap_durability',
  neck_trap_durability: 'neck_trap_durability',
  hip_ankle_mobility: 'hip_footwork_durability',
  roadwork_zone2: 'roadwork_aerobic_base',
  roadwork_tempo: 'roadwork_tempo',
  roadwork_intervals: 'roadwork_intervals',
  alactic_repeat_power: 'alactic_repeat_power',
  glycolytic_round_tolerance: 'glycolytic_round_tolerance',
  boxing_conditioning_support: 'boxing_conditioning_support',
  mobility_prehab: 'mobility_prehab',
  recovery_reset: 'recovery_reset',
};

const FAMILY_LABELS: Record<BoxingSessionFamily, string> = {
  boxing_skill_microdose: 'Boxing skill microdose',
  footwork_agility: 'Speed & agility for boxing',
  reaction_rhythm: 'Reaction and rhythm support',
  shadowboxing_quality: 'Shadowboxing quality support',
  bag_pad_support: 'Bag/pad support',
  max_strength_lower: 'Lower-body strength',
  strength_power: 'Strength & power',
  explosive_power: 'Explosive power for boxing',
  rotational_power: 'Rotational power for boxing',
  trunk_durability: 'Trunk durability',
  shoulder_scap_durability: 'Shoulder durability for boxing',
  neck_trap_durability: 'Neck/trap durability',
  hip_ankle_mobility: 'Hip/ankle capacity',
  roadwork_zone2: 'Roadwork base',
  roadwork_tempo: 'Roadwork tempo',
  roadwork_intervals: 'Roadwork intervals',
  alactic_repeat_power: 'Alactic repeat power',
  glycolytic_round_tolerance: 'Round tolerance',
  boxing_conditioning_support: 'Conditioning support for boxing',
  mobility_prehab: 'Mobility/prehab',
  recovery_reset: 'Recovery reset',
};

const PROTECTED_MODALITY_LABELS: Partial<Record<ProtectedWorkoutModality, string>> = {
  boxing_skill: 'Protected boxing skill',
  shadowboxing: 'Protected shadowboxing',
  footwork: 'Protected footwork',
  bag_work: 'Protected bag work',
  pad_work: 'Protected pads',
  sparring: 'Protected sparring',
  boxing_conditioning: 'Protected boxing conditioning',
  roadwork_zone2: 'Protected roadwork base',
  roadwork_tempo: 'Protected roadwork tempo',
  roadwork_intervals: 'Protected roadwork intervals',
  strength_power: 'Protected strength and power',
  mobility_prehab: 'Protected mobility',
  competition: 'Protected competition',
  recovery: 'Protected recovery',
  external_non_boxing_load: 'External non-boxing load',
  unknown: 'Protected training anchor',
};

export function boxingSessionFamilyLabel(family: BoxingSessionFamily | null | undefined): string {
  return family ? FAMILY_LABELS[family] : 'Athleticore support';
}

export function boxingDoseCategoryLabel(category: BoxingSessionDoseCategory | null | undefined): string {
  if (category === 'full_session') return 'Athleticore-generated full session';
  if (category === 'support_session') return 'Athleticore support session';
  if (category === 'microdose') return 'Microdose';
  if (category === 'recovery_reset') return 'Recovery reset';
  return 'Athleticore-generated support';
}

export function boxingProtectedModalityLabel(modality: ProtectedWorkoutModality | null | undefined): string {
  return modality ? PROTECTED_MODALITY_LABELS[modality] ?? 'Protected training anchor' : 'Protected training anchor';
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function legacyDayOfWeek(dateString: string): number {
  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getUTCDay();
}

function dateForSession(weekStart: string, session: GeneratedProgramSession): string {
  return session.scheduledDate ?? addDays(weekStart, (Math.max(1, session.weekIndex) - 1) * 7 + (Math.max(1, session.dayIndex) - 1));
}

function estimatedMinutes(session: GeneratedProgramSession): number {
  return Math.max(0, Math.round(
    session.workout?.estimatedDurationMinutes
      ?? session.workout?.requestedDurationMinutes
      ?? session.protectedDurationMinutes
      ?? 0,
  ));
}

function targetIntensity(session: GeneratedProgramSession): number | null {
  if (session.plannedIntensity === 'hard') return 8;
  if (session.plannedIntensity === 'moderate') return 6;
  if (session.plannedIntensity === 'low') return 3;
  if (session.plannedIntensity === 'recovery') return 2;
  return null;
}

function activityTypeForProtected(modality: ProtectedWorkoutModality | undefined): ActivityType {
  switch (modality) {
    case 'sparring':
      return 'sparring';
    case 'boxing_skill':
    case 'shadowboxing':
    case 'footwork':
    case 'bag_work':
    case 'pad_work':
    case 'competition':
      return 'boxing_practice';
    case 'roadwork_zone2':
    case 'roadwork_tempo':
    case 'roadwork_intervals':
    case 'zone2':
      return 'road_work';
    case 'boxing_conditioning':
      return 'conditioning';
    case 'strength_power':
      return 'sc';
    case 'mobility_prehab':
    case 'recovery':
      return 'active_recovery';
    default:
      return 'other';
  }
}

function activityTypeForFamily(family: BoxingSessionFamily | undefined): ActivityType {
  if (!family) return 'sc';
  if (TECHNICAL_FAMILIES.has(family)) return 'boxing_practice';
  if (ROADWORK_FAMILIES.has(family)) return 'road_work';
  if (CONDITIONING_FAMILIES.has(family)) return 'conditioning';
  if (family === 'recovery_reset' || family === 'mobility_prehab' || family === 'hip_ankle_mobility') return 'active_recovery';
  return 'sc';
}

function focusForFamily(family: BoxingSessionFamily | undefined): WorkoutFocus | null {
  if (!family) return 'full_body';
  if (TECHNICAL_FAMILIES.has(family)) return 'sport_specific';
  if (ROADWORK_FAMILIES.has(family) || CONDITIONING_FAMILIES.has(family)) return 'conditioning';
  if (family === 'recovery_reset' || family === 'mobility_prehab' || family === 'hip_ankle_mobility') return 'recovery';
  return 'full_body';
}

function familyForProtected(modality: ProtectedWorkoutModality | undefined): TrainingSessionFamily {
  switch (modality) {
    case 'sparring':
    case 'competition':
      return 'sparring';
    case 'boxing_skill':
    case 'shadowboxing':
    case 'footwork':
    case 'bag_work':
    case 'pad_work':
      return 'boxing_skill';
    case 'roadwork_zone2':
    case 'roadwork_tempo':
    case 'roadwork_intervals':
    case 'zone2':
    case 'boxing_conditioning':
    case 'external_non_boxing_load':
      return 'conditioning';
    case 'strength_power':
      return 'strength';
    case 'mobility_prehab':
    case 'recovery':
      return 'recovery';
    default:
      return 'rest';
  }
}

function familyForGenerated(family: BoxingSessionFamily | undefined): TrainingSessionFamily {
  if (!family) return 'strength';
  if (TECHNICAL_FAMILIES.has(family)) return 'boxing_skill';
  if (ROADWORK_FAMILIES.has(family) || CONDITIONING_FAMILIES.has(family)) return 'conditioning';
  if (DURABILITY_FAMILIES.has(family)) return family === 'mobility_prehab' ? 'recovery' : 'durability_core';
  if (family === 'recovery_reset') return 'recovery';
  return 'strength';
}

function scFamilyFor(family: BoxingSessionFamily | undefined) {
  switch (family) {
    case 'footwork_agility':
    case 'reaction_rhythm':
      return 'footwork';
    case 'roadwork_zone2':
      return 'aerobic_base';
    case 'roadwork_tempo':
      return 'tempo';
    case 'roadwork_intervals':
      return 'repeated_sprint_ability';
    case 'alactic_repeat_power':
      return 'acceleration';
    case 'glycolytic_round_tolerance':
    case 'boxing_conditioning_support':
      return 'sport_round_conditioning';
    case 'rotational_power':
    case 'explosive_power':
      return 'med_ball_power';
    case 'trunk_durability':
    case 'shoulder_scap_durability':
    case 'neck_trap_durability':
      return 'durability';
    case 'hip_ankle_mobility':
    case 'mobility_prehab':
      return 'mobility_flow';
    case 'recovery_reset':
      return 'breathwork';
    case 'max_strength_lower':
    case 'strength_power':
      return 'max_strength';
    default:
      return null;
  }
}

function bucketForFamily(family: BoxingSessionFamily | undefined): WorkoutDoseBucket {
  if (!family) return 'strength';
  if (ROADWORK_FAMILIES.has(family) || CONDITIONING_FAMILIES.has(family)) return 'conditioning';
  if (DURABILITY_FAMILIES.has(family) || TECHNICAL_FAMILIES.has(family)) return 'durability';
  if (family === 'recovery_reset') return 'recovery';
  return 'strength';
}

function doseSummaryForSession(session: GeneratedProgramSession): SessionDoseSummary {
  if (!session.protectedAnchor) {
    const contribution = contributionForGeneratedSession(session);
    const summary: SessionDoseSummary = {};
    if (contribution.strengthMainSets > 0) summary.hardSets = contribution.strengthMainSets;
    if (contribution.alacticBursts > 0) summary.sprintMeters = contribution.alacticBursts * 20;
    if (contribution.powerContacts > 0) summary.plyoContacts = contribution.powerContacts;
    if (contribution.highIntensityIntervals > 0) summary.hiitMinutes = contribution.highIntensityIntervals;
    if (contribution.roadworkMinutes > 0) summary.aerobicMinutes = contribution.roadworkMinutes;
    if (contribution.glycolyticRounds > 0) summary.circuitRounds = contribution.glycolyticRounds;
    const highImpactCount = contribution.highIntensityIntervals + contribution.alacticBursts;
    if (highImpactCount > 0) summary.highImpactCount = highImpactCount;
    const tissueStressLoad = Math.round(
        contribution.trunkDurabilitySets
          + contribution.shoulderPrehabMinutes * 0.5
          + contribution.mobilityMinutes * 0.25,
      );
    if (tissueStressLoad > 0) summary.tissueStressLoad = tissueStressLoad;
    return summary;
  }

  const minutes = estimatedMinutes(session);
  if (session.protectedWorkoutModality === 'roadwork_zone2') return { aerobicMinutes: minutes };
  if (session.protectedWorkoutModality === 'roadwork_tempo') return { aerobicMinutes: minutes, hiitMinutes: Math.round(minutes * 0.25) };
  if (session.protectedWorkoutModality === 'roadwork_intervals') return { hiitMinutes: Math.round(minutes * 0.4), highImpactCount: 1 };
  if (session.protectedWorkoutModality === 'sparring' || session.protectedWorkoutModality === 'competition') {
    return { hiitMinutes: Math.round(minutes * 0.5), circuitRounds: 1, highImpactCount: 1 };
  }
  if (session.protectedWorkoutModality === 'mobility_prehab' || session.protectedWorkoutModality === 'recovery') return { tissueStressLoad: 0 };
  return {};
}

function sessionModulesFor(session: GeneratedProgramSession): SessionModulePlan[] {
  const bucket = bucketForFamily(session.boxingSessionFamily);
  return [{
    bucket,
    focus: focusForFamily(session.boxingSessionFamily),
    durationMin: estimatedMinutes(session),
    preserveOnYellow: session.plannedIntensity !== 'hard',
  }];
}

function athleticDomainForSession(session: GeneratedProgramSession): BoxingAthleteSupportDomain | undefined {
  return session.athleticDevelopmentDomain
    ?? familyToAthleticDevelopmentDomain(session.boxingSessionFamily, session.boxingSessionRole)
    ?? protectedModalityToAthleticDevelopmentDomain(session.protectedWorkoutModality);
}

function weekSnapshot(week: GeneratedProgramWeek | undefined): BoxingGeneratedProgramWeekSnapshot {
  const summary = week?.weeklyVolumeSummary;
  const snapshot: BoxingGeneratedProgramWeekSnapshot = {
    coachSummaryBullets: week?.coachSummaryBullets ?? [],
    coachRationale: week?.coachRationale ?? week?.rationale ?? [],
    userFacingWarnings: week?.userFacingWarnings ?? [],
    validationWarnings: week?.validationWarnings ?? [],
    hardDayCount: week?.hardDayCount ?? summary?.hardDayCount ?? 0,
    qualityGaps: week?.qualityGaps ?? summary?.qualityGaps ?? [],
  };
  if (week?.weeklyBoxingHeadline) snapshot.weeklyBoxingHeadline = week.weeklyBoxingHeadline;
  if (week?.weeklyBoxingSummary) snapshot.weeklyBoxingSummary = week.weeklyBoxingSummary;
  if (week?.primaryBoxingFocus) snapshot.primaryBoxingFocus = week.primaryBoxingFocus;
  if (week?.weeklyAthleticDevelopmentHeadline) snapshot.weeklyAthleticDevelopmentHeadline = week.weeklyAthleticDevelopmentHeadline;
  if (week?.weeklyAthleticDevelopmentSummary) snapshot.weeklyAthleticDevelopmentSummary = week.weeklyAthleticDevelopmentSummary;
  if (week?.sAndCFocus) snapshot.sAndCFocus = week.sAndCFocus;
  if (week?.supportDomainSummary) snapshot.supportDomainSummary = week.supportDomainSummary;
  if (week?.protectedBoxingPracticeSummary) snapshot.protectedBoxingPracticeSummary = week.protectedBoxingPracticeSummary;
  if (week?.athleticDevelopmentFocusAreas) snapshot.athleticDevelopmentFocusAreas = week.athleticDevelopmentFocusAreas;
  if (week?.hardDaySummary) snapshot.hardDaySummary = week.hardDaySummary;
  if (week?.protectedLoadSummary) snapshot.protectedLoadSummary = week.protectedLoadSummary;
  if (week?.generatedSupportSummary) snapshot.generatedSupportSummary = week.generatedSupportSummary;
  if (week?.nextBestAction) snapshot.nextBestAction = week.nextBestAction;
  const hardDayCap = summary?.hardDayCap ?? week?.weeklyDose?.hardDayCap;
  if (hardDayCap != null) snapshot.hardDayCap = hardDayCap;
  if (summary?.generatedFullSessionCount != null) snapshot.generatedFullSessionCount = summary.generatedFullSessionCount;
  if (summary?.generatedSupportSessionCount != null) snapshot.generatedSupportSessionCount = summary.generatedSupportSessionCount;
  if (summary?.generatedMicrodoseCount != null) snapshot.generatedMicrodoseCount = summary.generatedMicrodoseCount;
  if (summary?.protectedBoxingSessionCount != null) snapshot.protectedBoxingSessionCount = summary.protectedBoxingSessionCount;
  if (summary?.protectedSparringCount != null) snapshot.protectedSparringCount = summary.protectedSparringCount;
  if (summary?.protectedRoadworkCount != null) snapshot.protectedRoadworkCount = summary.protectedRoadworkCount;
  if (summary?.generatedSAndCSessionCount != null) snapshot.generatedSAndCSessionCount = summary.generatedSAndCSessionCount;
  if (summary?.generatedSkillSupportCount != null) snapshot.generatedSkillSupportCount = summary.generatedSkillSupportCount;
  if (summary?.generatedRoadworkCount != null) snapshot.generatedRoadworkCount = summary.generatedRoadworkCount;
  if (summary?.generatedStrengthPowerCount != null) snapshot.generatedStrengthPowerCount = summary.generatedStrengthPowerCount;
  if (summary?.generatedDurabilityCount != null) snapshot.generatedDurabilityCount = summary.generatedDurabilityCount;
  if (summary?.generatedRecoveryCount != null) snapshot.generatedRecoveryCount = summary.generatedRecoveryCount;
  if (summary?.supportDomainSummary) snapshot.supportDomainSummary = summary.supportDomainSummary;
  if (summary?.protectedBoxingPracticeSummary) snapshot.protectedBoxingPracticeSummary = summary.protectedBoxingPracticeSummary;
  if (summary?.athleticDevelopmentFocusAreas) snapshot.athleticDevelopmentFocusAreas = summary.athleticDevelopmentFocusAreas;
  if (week?.weeklyDose) snapshot.boxingWeeklyDosePlan = week.weeklyDose;
  const loadLedger = week?.boxingLoadLedger ?? summary?.boxingLoadLedger;
  if (loadLedger) snapshot.boxingLoadLedger = loadLedger;
  const variancePlan = week?.variancePlan ?? summary?.variancePlan;
  if (variancePlan) snapshot.variancePlan = variancePlan;
  return snapshot;
}

function snapshotForSession(program: GeneratedProgram, session: GeneratedProgramSession, week: GeneratedProgramWeek | undefined, scheduledDate: string): BoxingGeneratedPlanEntrySnapshot {
  const family = session.boxingSessionFamily;
  const supportMeta = supportSessionMetadata({
    family,
    role: session.boxingSessionRole,
    domain: athleticDomainForSession(session),
    doseCategory: session.sessionDoseCategory,
    plannedIntensity: session.plannedIntensity,
    durationMinutes: estimatedMinutes(session),
    protectedModality: session.protectedWorkoutModality,
  });
  const snapshot: BoxingGeneratedPlanEntrySnapshot = {
    snapshotKind: 'boxing_generated_program_entry',
    schemaVersion: 1,
    sourceOfTruth: 'GeneratedProgram',
    programId: program.id,
    sessionId: session.id,
    weekIndex: session.weekIndex,
    dayIndex: session.dayIndex,
    scheduledDate,
    label: displayLabelForSession(session),
    protectedAnchor: session.protectedAnchor,
    goalId: session.workout?.goalId ?? (family ? GOAL_ID_BY_FAMILY[family] : program.goalId),
    estimatedDurationMinutes: estimatedMinutes(session),
    athleticDevelopmentDomain: supportMeta.athleticDevelopmentDomain,
    supportDomainLabel: session.protectedAnchor && supportMeta.athleticDevelopmentDomain === 'boxing_skill_support'
      ? 'Protected boxing'
      : supportMeta.supportDomainLabel,
    sAndCRationale: session.sAndCRationale ?? supportMeta.sAndCRationale,
    athleticDevelopmentRationale: session.athleticDevelopmentRationale ?? supportMeta.athleticDevelopmentRationale,
    boxingRelevance: session.boxingRelevance ?? supportMeta.boxingRelevance,
    isBoxingPracticeReplacement: false,
    isCoachLedRequired: session.isCoachLedRequired ?? (
      session.protectedWorkoutModality === 'sparring'
      || session.protectedWorkoutModality === 'competition'
      || session.protectedWorkoutModality === 'pad_work'
    ),
    expectedFuelPriority: session.expectedFuelPriority ?? supportMeta.expectedFuelPriority,
    expectedCarbDemandClass: session.expectedCarbDemandClass ?? supportMeta.expectedCarbDemandClass,
    expectedRecoveryDemandClass: session.expectedRecoveryDemandClass ?? supportMeta.expectedRecoveryDemandClass,
    expectedHydrationDemandClass: session.expectedHydrationDemandClass ?? supportMeta.expectedHydrationDemandClass,
    sessionEnergyDemandScore: session.sessionEnergyDemandScore ?? supportMeta.sessionEnergyDemandScore,
    sessionRecoveryDemandScore: session.sessionRecoveryDemandScore ?? supportMeta.sessionRecoveryDemandScore,
    rationale: session.rationale ?? [],
    generatedWorkout: session.workout ?? null,
    weekSummary: weekSnapshot(week),
  };
  snapshot.userProgramId = program.persistenceId ?? session.userProgramId ?? null;
  snapshot.generatedWorkoutId = session.generatedWorkoutId ?? null;
  snapshot.preferredSessionTemplateId = family ? templateIdForBoxingFamily(family) : session.workout?.templateId ?? null;
  if (session.plannedIntensity) snapshot.plannedIntensity = session.plannedIntensity;
  snapshot.estimatedLoadScore = session.estimatedLoadScore ?? null;
  if (family) snapshot.boxingSessionFamily = family;
  if (session.boxingSessionRole) snapshot.boxingSessionRole = session.boxingSessionRole;
  if (session.sessionDoseCategory) snapshot.sessionDoseCategory = session.sessionDoseCategory;
  if (session.protectedWorkoutModality) snapshot.protectedWorkoutModality = session.protectedWorkoutModality;
  if (session.protectedDurationMinutes != null) snapshot.protectedDurationMinutes = session.protectedDurationMinutes;
  return snapshot;
}

function displayLabelForSession(session: GeneratedProgramSession): string {
  if (session.protectedAnchor) return boxingProtectedModalityLabel(session.protectedWorkoutModality);
  return boxingSessionFamilyLabel(session.boxingSessionFamily);
}

function sessionSortKey(session: GeneratedProgramSession, weekStart: string): string {
  return `${dateForSession(weekStart, session)}:${session.protectedAnchor ? 0 : 1}:${session.id}`;
}

function slotMapForSessions(sessions: readonly GeneratedProgramSession[], weekStart: string): Map<string, PlanSlot> {
  const byDate = new Map<string, GeneratedProgramSession[]>();
  for (const session of sessions) {
    const date = dateForSession(weekStart, session);
    byDate.set(date, [...(byDate.get(date) ?? []), session]);
  }
  const slots = new Map<string, PlanSlot>();
  for (const [date, daySessions] of byDate) {
    const sorted = [...daySessions].sort((a, b) => sessionSortKey(a, weekStart).localeCompare(sessionSortKey(b, weekStart)));
    if (sorted.length === 1) {
      slots.set(sorted[0].id, 'single');
      continue;
    }
    sorted.forEach((session, index) => {
      slots.set(session.id, index === 0 ? 'am' : 'pm');
    });
    void date;
  }
  return slots;
}

export function generatedProgramToWeeklyPlanEntries(input: {
  userId: string;
  weekStart: string;
  program: GeneratedProgram;
  planConfig?: WeeklyPlanConfigRow | null;
}): GeneratedProgramWeeklyPlanAdapterResult {
  const firstWeek = input.program.weeks.find((week) => week.weekIndex === 1) ?? input.program.weeks[0];
  const sessions = (firstWeek?.sessions ?? input.program.sessions.filter((session) => session.weekIndex === 1))
    .slice()
    .sort((a, b) => sessionSortKey(a, input.weekStart).localeCompare(sessionSortKey(b, input.weekStart)));
  const slots = slotMapForSessions(sessions, input.weekStart);
  const warnings = [...(firstWeek?.validationWarnings ?? []), ...(input.program.validationWarnings ?? [])];

  const entries: PersistableWeeklyPlanEntry[] = sessions.map((session, index) => {
    const scheduledDate = dateForSession(input.weekStart, session);
    const snapshot = snapshotForSession(input.program, session, firstWeek, scheduledDate);
    const doseSummary = doseSummaryForSession(session);
    const doseBucket = bucketForFamily(session.boxingSessionFamily);
    const sourceLabel = session.protectedAnchor
      ? 'Protected boxing'
      : supportDomainSourceLabel(snapshot.athleticDevelopmentDomain);
    const entry: PersistableWeeklyPlanEntry = {
      user_id: input.userId,
      week_start_date: input.weekStart,
      day_of_week: legacyDayOfWeek(scheduledDate),
      date: scheduledDate,
      slot: slots.get(session.id) ?? 'single',
      day_order: index + 1,
      session_type: session.protectedAnchor
        ? activityTypeForProtected(session.protectedWorkoutModality)
        : activityTypeForFamily(session.boxingSessionFamily),
      focus: session.protectedAnchor ? null : focusForFamily(session.boxingSessionFamily),
      session_family: session.protectedAnchor
        ? familyForProtected(session.protectedWorkoutModality)
        : familyForGenerated(session.boxingSessionFamily),
      sc_session_family: session.protectedAnchor ? null : scFamilyFor(session.boxingSessionFamily),
      placement_source: session.protectedAnchor ? 'locked' : 'generated',
      progression_intent: session.boxingSessionRole ?? session.sessionRole ?? null,
      carry_forward_reason: null,
      session_modules: session.protectedAnchor ? [] : sessionModulesFor(session),
      dose_credits: [{
        bucket: doseBucket,
        credit: session.protectedAnchor ? 0 : 1,
        preservedBySubstitution: false,
        reason: session.protectedAnchor
          ? 'Protected boxing anchors are counted as schedule load, not generated support dose.'
          : `${sourceLabel} contributes Athleticore support dose.`,
      }],
      dose_summary: doseSummary,
      realized_dose_buckets: session.protectedAnchor ? [] : [doseBucket],
      estimated_duration_min: snapshot.estimatedDurationMinutes,
      target_intensity: targetIntensity(session),
      status: session.status === 'completed' ? 'completed' : session.status === 'missed' ? 'skipped' : 'planned',
      rescheduled_to: null,
      workout_log_id: session.workoutCompletionId ?? null,
      scheduled_activity_id: session.calendarEventId ?? null,
      prescription_snapshot: snapshot as unknown as WorkoutPrescriptionV2,
      engine_notes: snapshot.rationale[0] ?? snapshot.weekSummary.nextBestAction ?? null,
      is_deload: firstWeek?.phase === 'deload',
    };
    return entry;
  });

  const summary = firstWeek?.weeklyVolumeSummary;
  return {
    entries,
    warnings,
    sourceSummary: {
      sourceOfTruth: 'GeneratedProgram',
      programId: input.program.id,
      userProgramId: input.program.persistenceId ?? null,
      weekStart: input.weekStart,
      generatedSessionCount: entries.filter((entry) => entry.placement_source === 'generated').length,
      protectedAnchorCount: entries.filter((entry) => entry.placement_source === 'locked').length,
      generatedFullSessionCount: summary?.generatedFullSessionCount ?? 0,
      generatedSupportSessionCount: summary?.generatedSupportSessionCount ?? 0,
      generatedMicrodoseCount: summary?.generatedMicrodoseCount ?? 0,
      protectedBoxingSessionCount: summary?.protectedBoxingSessionCount ?? 0,
      protectedSparringCount: summary?.protectedSparringCount ?? 0,
      protectedRoadworkCount: summary?.protectedRoadworkCount ?? 0,
      generatedSAndCSessionCount: summary?.generatedSAndCSessionCount ?? 0,
      generatedSkillSupportCount: summary?.generatedSkillSupportCount ?? 0,
      generatedRoadworkCount: summary?.generatedRoadworkCount ?? 0,
      generatedStrengthPowerCount: summary?.generatedStrengthPowerCount ?? 0,
      generatedDurabilityCount: summary?.generatedDurabilityCount ?? 0,
      generatedRecoveryCount: summary?.generatedRecoveryCount ?? 0,
      supportDomainSummary: summary?.supportDomainSummary,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getBoxingSnapshotFromWeeklyPlanEntry(
  entry: Pick<WeeklyPlanEntryRow, 'prescription_snapshot'> | null | undefined,
): BoxingGeneratedPlanEntrySnapshot | null {
  const snapshot = entry?.prescription_snapshot as unknown;
  if (!isRecord(snapshot)) return null;
  if (snapshot.snapshotKind !== 'boxing_generated_program_entry') return null;
  if (snapshot.sourceOfTruth !== 'GeneratedProgram') return null;
  return snapshot as unknown as BoxingGeneratedPlanEntrySnapshot;
}

export function isBoxingGeneratedWeeklyPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  return Boolean(getBoxingSnapshotFromWeeklyPlanEntry(entry));
}

export function isLegacyWeeklyPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  if (!entry) return false;
  if (isBoxingGeneratedWeeklyPlanEntry(entry)) return false;
  return Boolean(entry.prescription_snapshot || entry.session_family || entry.sc_session_family || entry.focus);
}

export function migrateLegacyEntryToBoxingIntent(entry: WeeklyPlanEntryRow): LegacyWeeklyPlanEntryMigrationIntent {
  if (entry.session_type === 'sparring') {
    return {
      status: 'archived_compatibility',
      reason: 'Sparring is a protected boxing anchor and is never regenerated.',
    };
  }
  if (entry.session_type === 'boxing_practice' || entry.focus === 'sport_specific') {
    return {
      status: 'migratable',
      reason: 'Older boxing practice maps to a small boxing-skill support dose.',
      family: 'boxing_skill_microdose',
      role: 'boxing_skill_microdose',
      doseCategory: 'microdose',
      preferredSessionTemplateId: templateIdForBoxingFamily('boxing_skill_microdose'),
      goalId: GOAL_ID_BY_FAMILY.boxing_skill_microdose,
    };
  }
  if (entry.session_type === 'running' || entry.session_type === 'road_work' || entry.sc_session_family === 'aerobic_base') {
    return {
      status: 'migratable',
      reason: 'Older roadwork maps to boxing roadwork support.',
      family: 'roadwork_zone2',
      role: 'roadwork_aerobic_base',
      doseCategory: 'support_session',
      preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_zone2'),
      goalId: GOAL_ID_BY_FAMILY.roadwork_zone2,
    };
  }
  if (entry.focus === 'conditioning' || entry.session_type === 'conditioning') {
    return {
      status: 'migratable',
      reason: 'Older conditioning maps to controlled power support unless readiness asks for recovery.',
      family: 'alactic_repeat_power',
      role: 'alactic_repeat_power',
      doseCategory: 'support_session',
      preferredSessionTemplateId: templateIdForBoxingFamily('alactic_repeat_power'),
      goalId: GOAL_ID_BY_FAMILY.alactic_repeat_power,
    };
  }
  if (entry.focus === 'recovery' || entry.session_type === 'active_recovery') {
    return {
      status: 'migratable',
      reason: 'Older recovery work maps to a boxing recovery reset.',
      family: 'recovery_reset',
      role: 'recovery_reset',
      doseCategory: 'recovery_reset',
      preferredSessionTemplateId: templateIdForBoxingFamily('recovery_reset'),
      goalId: GOAL_ID_BY_FAMILY.recovery_reset,
    };
  }
  return {
    status: 'archived_compatibility',
    reason: 'This old row is readable in compatibility mode but does not carry enough boxing intent to regenerate safely.',
  };
}

export function buildGeneratedWorkoutRequestFromPlanEntry(input: {
  entry: WeeklyPlanEntryRow;
  readinessBand?: WorkoutReadinessBand;
  equipmentIds?: string[];
  boxingTrainingContext?: BoxingTrainingContext;
}): WorkoutProgrammingUserRequest {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(input.entry);
  const migration = snapshot ? null : migrateLegacyEntryToBoxingIntent(input.entry);
  const family = snapshot?.boxingSessionFamily ?? migration?.family;
  if (!family) {
    throw new Error('This archived workout can be viewed, but it does not have enough boxing intent to regenerate safely.');
  }
  if (snapshot?.protectedAnchor || input.entry.placement_source === 'locked') {
    throw new Error('Protected boxing anchors are schedule commitments. Athleticore does not generate sparring or replace protected anchors.');
  }

  const request: WorkoutProgrammingUserRequest = {
    goalId: snapshot?.goalId ?? migration?.goalId ?? GOAL_ID_BY_FAMILY[family],
    durationMinutes: snapshot?.estimatedDurationMinutes ?? input.entry.estimated_duration_min,
    preferredDurationMinutes: snapshot?.estimatedDurationMinutes ?? input.entry.estimated_duration_min,
    readinessBand: input.readinessBand ?? 'unknown',
    equipmentIds: input.equipmentIds ?? ['bodyweight', 'mat', 'open_space', 'resistance_band', 'track_or_road'],
    experienceLevel: 'beginner',
    workoutEnvironment: ROADWORK_FAMILIES.has(family) ? 'outdoor' : 'home',
    preferredToneVariant: 'coach_like',
    intendedBoxingSessionFamily: family,
    intendedBoxingSessionRole: snapshot?.boxingSessionRole ?? migration?.role ?? ROLE_BY_FAMILY[family],
    intendedSessionDoseCategory: snapshot?.sessionDoseCategory ?? migration?.doseCategory ?? (family === 'recovery_reset' ? 'recovery_reset' : 'support_session'),
    athleticDevelopmentDomain: snapshot?.athleticDevelopmentDomain ?? familyToAthleticDevelopmentDomain(family, snapshot?.boxingSessionRole ?? migration?.role ?? ROLE_BY_FAMILY[family]),
    preferredSessionTemplateId: snapshot?.preferredSessionTemplateId ?? migration?.preferredSessionTemplateId ?? templateIdForBoxingFamily(family),
  };
  if (input.boxingTrainingContext) request.boxingTrainingContext = input.boxingTrainingContext;
  return request;
}

export function boxingEntryDisplayMeta(entry: WeeklyPlanEntryRow): {
  title: string;
  sourceLabel: string;
  familyLabel: string | null;
  modalityLabel: string | null;
  doseLabel: string | null;
  why: string | null;
  varianceNote: string | null;
  isCompatibilityOnly: boolean;
} {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (snapshot) {
    return {
      title: snapshot.protectedAnchor
        ? boxingProtectedModalityLabel(snapshot.protectedWorkoutModality)
        : boxingSessionFamilyLabel(snapshot.boxingSessionFamily),
      sourceLabel: snapshot.protectedAnchor ? 'Protected boxing' : supportDomainSourceLabel(snapshot.athleticDevelopmentDomain),
      familyLabel: snapshot.boxingSessionFamily ? boxingSessionFamilyLabel(snapshot.boxingSessionFamily) : null,
      modalityLabel: snapshot.protectedWorkoutModality ? boxingProtectedModalityLabel(snapshot.protectedWorkoutModality) : null,
      doseLabel: snapshot.sessionDoseCategory ? boxingDoseCategoryLabel(snapshot.sessionDoseCategory) : null,
      why: snapshot.rationale[0] ?? snapshot.weekSummary.nextBestAction ?? null,
      varianceNote: snapshot.weekSummary.variancePlan?.reason ?? null,
      isCompatibilityOnly: false,
    };
  }
  const migration = migrateLegacyEntryToBoxingIntent(entry);
  return {
    title: migration.family ? boxingSessionFamilyLabel(migration.family) : 'Archived training entry',
    sourceLabel: 'Older session',
    familyLabel: migration.family ? boxingSessionFamilyLabel(migration.family) : null,
    modalityLabel: null,
    doseLabel: migration.doseCategory ? boxingDoseCategoryLabel(migration.doseCategory) : null,
    why: migration.reason,
    varianceNote: null,
    isCompatibilityOnly: true,
  };
}
