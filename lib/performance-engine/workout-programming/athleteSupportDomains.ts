import type {
  AthleteSupportFuelPriority,
  BoxingAthleteSupportDomain,
  BoxingPlannedSessionRole,
  BoxingSessionDoseCategory,
  BoxingSessionFamily,
  ProtectedWorkoutModality,
  SupportDemandClass,
  WorkoutIntensity,
} from './types.ts';

export const SUPPORT_DOMAIN_LABELS: Record<BoxingAthleteSupportDomain, string> = {
  boxing_skill_support: 'Boxing skill support',
  strength: 'Strength',
  power: 'Power',
  speed_agility: 'Speed & agility',
  conditioning: 'Conditioning',
  roadwork: 'Roadwork',
  durability: 'Durability',
  mobility: 'Mobility',
  recovery: 'Recovery',
  nutrition_fueling: 'Nutrition & fueling',
  hydration: 'Hydration',
  weight_class_support: 'Weight-class support',
};

export const SUPPORT_DOMAIN_SOURCE_LABELS: Record<BoxingAthleteSupportDomain, string> = {
  boxing_skill_support: 'Skill support',
  strength: 'Strength & power support',
  power: 'Strength & power support',
  speed_agility: 'Speed & agility support',
  conditioning: 'Conditioning support',
  roadwork: 'Roadwork support',
  durability: 'Durability support',
  mobility: 'Mobility support',
  recovery: 'Recovery support',
  nutrition_fueling: 'Nutrition support',
  hydration: 'Hydration support',
  weight_class_support: 'Weight-class support',
};

const SKILL_SUPPORT_FAMILIES = new Set<BoxingSessionFamily>([
  'boxing_skill_microdose',
  'shadowboxing_quality',
  'bag_pad_support',
]);

const POWER_FAMILIES = new Set<BoxingSessionFamily>([
  'explosive_power',
  'rotational_power',
]);

const STRENGTH_FAMILIES = new Set<BoxingSessionFamily>([
  'max_strength_lower',
  'strength_power',
]);

const ROADWORK_FAMILIES = new Set<BoxingSessionFamily>([
  'roadwork_zone2',
  'roadwork_tempo',
]);

const CONDITIONING_FAMILIES = new Set<BoxingSessionFamily>([
  'roadwork_intervals',
  'alactic_repeat_power',
  'glycolytic_round_tolerance',
  'boxing_conditioning_support',
]);

const DURABILITY_FAMILIES = new Set<BoxingSessionFamily>([
  'trunk_durability',
  'shoulder_scap_durability',
  'neck_trap_durability',
]);

const MOBILITY_FAMILIES = new Set<BoxingSessionFamily>([
  'hip_ankle_mobility',
  'mobility_prehab',
]);

const domainSummarySeed = (): Record<BoxingAthleteSupportDomain, number> => ({
  boxing_skill_support: 0,
  strength: 0,
  power: 0,
  speed_agility: 0,
  conditioning: 0,
  roadwork: 0,
  durability: 0,
  mobility: 0,
  recovery: 0,
  nutrition_fueling: 0,
  hydration: 0,
  weight_class_support: 0,
});

export function emptySupportDomainSummary(): Record<BoxingAthleteSupportDomain, number> {
  return domainSummarySeed();
}

export function supportDomainLabel(domain?: BoxingAthleteSupportDomain | null): string {
  return domain ? SUPPORT_DOMAIN_LABELS[domain] : 'Athleticore support';
}

export function supportDomainSourceLabel(domain?: BoxingAthleteSupportDomain | null): string {
  return domain ? SUPPORT_DOMAIN_SOURCE_LABELS[domain] : 'Athleticore support';
}

export function isSAndCSupportDomain(domain?: BoxingAthleteSupportDomain | null): boolean {
  return domain != null && ![
    'boxing_skill_support',
    'nutrition_fueling',
    'hydration',
    'weight_class_support',
  ].includes(domain);
}

export function familyToAthleticDevelopmentDomain(
  family?: BoxingSessionFamily | null,
  role?: BoxingPlannedSessionRole | null,
): BoxingAthleteSupportDomain | undefined {
  if (!family) return undefined;
  if (SKILL_SUPPORT_FAMILIES.has(family)) return 'boxing_skill_support';
  if (family === 'footwork_agility') {
    return role === 'boxing_skill_microdose' || role === 'boxing_technical_practice'
      ? 'boxing_skill_support'
      : 'speed_agility';
  }
  if (family === 'reaction_rhythm') return 'speed_agility';
  if (STRENGTH_FAMILIES.has(family)) return 'strength';
  if (POWER_FAMILIES.has(family)) return 'power';
  if (ROADWORK_FAMILIES.has(family)) return 'roadwork';
  if (CONDITIONING_FAMILIES.has(family)) return 'conditioning';
  if (DURABILITY_FAMILIES.has(family)) return 'durability';
  if (MOBILITY_FAMILIES.has(family)) return 'mobility';
  if (family === 'recovery_reset') return 'recovery';
  return undefined;
}

export function protectedModalityToAthleticDevelopmentDomain(
  modality?: ProtectedWorkoutModality | null,
): BoxingAthleteSupportDomain | undefined {
  switch (modality) {
    case 'boxing_skill':
    case 'shadowboxing':
    case 'footwork':
    case 'bag_work':
    case 'pad_work':
    case 'sparring':
    case 'boxing_conditioning':
    case 'competition':
      return 'boxing_skill_support';
    case 'strength':
    case 'strength_power':
      return 'strength';
    case 'power':
      return 'power';
    case 'roadwork_zone2':
    case 'zone2':
    case 'roadwork_tempo':
      return 'roadwork';
    case 'roadwork_intervals':
    case 'conditioning':
      return 'conditioning';
    case 'mobility':
    case 'mobility_prehab':
      return 'mobility';
    case 'recovery':
      return 'recovery';
    default:
      return undefined;
  }
}

export function boxingRelevanceForFamily(family?: BoxingSessionFamily | null): string {
  switch (family) {
    case 'boxing_skill_microdose':
      return 'Keeps boxing movement quality present without replacing coach-led practice.';
    case 'footwork_agility':
      return 'Supports ring movement, entry/exit speed, and stance control.';
    case 'reaction_rhythm':
      return 'Builds change-of-pace qualities that support timing and defensive reactions.';
    case 'shadowboxing_quality':
      return 'Rehearses low-risk rhythm and positioning without contact.';
    case 'bag_pad_support':
      return 'Supports self-guided boxing rhythm without pretending to replace pad coaching.';
    case 'max_strength_lower':
      return 'Builds lower-body force that supports stance, pressure, and late-round legs.';
    case 'strength_power':
      return 'Builds the strength base that lets punching, clinch posture, and movement stay durable.';
    case 'explosive_power':
      return 'Supports fast force production for entries, counters, and punch snap.';
    case 'rotational_power':
      return 'Supports hip-to-trunk force transfer for punching.';
    case 'trunk_durability':
      return 'Supports rotational control, bracing, and repeated force transfer across rounds.';
    case 'shoulder_scap_durability':
      return 'Supports punch volume, guard position, and shoulder resilience.';
    case 'neck_trap_durability':
      return 'Supports posture and neck/trap resilience around contact-heavy boxing weeks.';
    case 'hip_ankle_mobility':
      return 'Supports stance changes, pivots, and footwork capacity.';
    case 'roadwork_zone2':
      return 'Builds the aerobic base that helps recover between rounds and sessions.';
    case 'roadwork_tempo':
      return 'Builds controlled pace tolerance without turning every conditioning day into a fight.';
    case 'roadwork_intervals':
      return 'Supports repeatability and recovery after higher-output efforts.';
    case 'alactic_repeat_power':
      return 'Supports repeated short bursts for entries, exits, and power actions.';
    case 'glycolytic_round_tolerance':
      return 'Supports hard round repeatability while respecting existing sparring stress.';
    case 'boxing_conditioning_support':
      return 'Supports boxing-specific conditioning without generating contact practice.';
    case 'mobility_prehab':
      return 'Keeps the joints and tissues that boxing stresses ready to train.';
    case 'recovery_reset':
      return 'Helps absorb boxing and S&C load so the next hard exposure is higher quality.';
    default:
      return 'Builds athletic qualities that support boxing performance.';
  }
}

export function athleticDevelopmentRationaleForFamily(family?: BoxingSessionFamily | null): string {
  switch (family) {
    case 'max_strength_lower':
      return 'Lower-body strength is S&C work for better force production and durable stance mechanics.';
    case 'strength_power':
      return 'Strength-power support gives the boxer a higher-output athletic base without adding more boxing practice.';
    case 'explosive_power':
      return 'Explosive-power support trains fast intent with low skill complexity.';
    case 'rotational_power':
      return 'Rotational-power support trains the athletic chain behind punching mechanics.';
    case 'roadwork_zone2':
      return 'Roadwork base supports repeat training quality and between-round recovery.';
    case 'roadwork_tempo':
      return 'Tempo roadwork supports sustained output with controlled stress.';
    case 'roadwork_intervals':
    case 'alactic_repeat_power':
    case 'glycolytic_round_tolerance':
    case 'boxing_conditioning_support':
      return 'Conditioning support fills energy-system gaps around protected boxing anchors.';
    case 'trunk_durability':
    case 'shoulder_scap_durability':
    case 'neck_trap_durability':
      return 'Durability support protects the tissues and positions boxing repeatedly loads.';
    case 'hip_ankle_mobility':
    case 'mobility_prehab':
      return 'Mobility support keeps the stance, hips, ankles, and shoulders trainable.';
    case 'recovery_reset':
      return 'Recovery support reduces accumulated stress so boxing and S&C stay productive.';
    case 'boxing_skill_microdose':
    case 'footwork_agility':
    case 'reaction_rhythm':
    case 'shadowboxing_quality':
    case 'bag_pad_support':
      return 'Skill support is a low-risk microdose around coach-led boxing, not a coaching replacement.';
    default:
      return 'Athleticore fills the athlete-support gaps around protected boxing commitments.';
  }
}

export function fuelPriorityForSupportDomain(input: {
  domain?: BoxingAthleteSupportDomain | null | undefined;
  family?: BoxingSessionFamily | null | undefined;
  role?: BoxingPlannedSessionRole | null | undefined;
  plannedIntensity?: WorkoutIntensity | null | undefined;
  durationMinutes?: number | null | undefined;
  protectedModality?: ProtectedWorkoutModality | null | undefined;
}): AthleteSupportFuelPriority {
  const modality = input.protectedModality;
  if (modality === 'sparring' || modality === 'competition') return 'sparring';
  if (modality === 'boxing_skill' || modality === 'shadowboxing' || modality === 'footwork' || modality === 'bag_work' || modality === 'pad_work' || modality === 'boxing_conditioning') {
    return 'boxing_practice';
  }

  const family = input.family;
  const domain = input.domain ?? familyToAthleticDevelopmentDomain(family, input.role);
  if (domain === 'strength') return 'strength_power';
  if (domain === 'power') return 'power';
  if (family === 'roadwork_tempo') return 'roadwork_tempo';
  if (domain === 'roadwork') return 'roadwork_aerobic';
  if (domain === 'conditioning') return 'conditioning_intervals';
  if (domain === 'durability') return 'durability';
  if (domain === 'mobility') return 'mobility';
  if (domain === 'boxing_skill_support') {
    const meaningfulDuration = (input.durationMinutes ?? 0) >= 25;
    const meaningfulIntensity = input.plannedIntensity === 'hard';
    return meaningfulDuration || meaningfulIntensity ? 'boxing_practice' : 'mobility';
  }
  return 'recovery';
}

export function supportDemandForSession(input: {
  domain?: BoxingAthleteSupportDomain | null | undefined;
  family?: BoxingSessionFamily | null | undefined;
  fuelPriority?: AthleteSupportFuelPriority | null | undefined;
  plannedIntensity?: WorkoutIntensity | null | undefined;
  durationMinutes?: number | null | undefined;
  protectedModality?: ProtectedWorkoutModality | null | undefined;
}): {
  expectedCarbDemandClass: SupportDemandClass;
  expectedRecoveryDemandClass: SupportDemandClass;
  expectedHydrationDemandClass: SupportDemandClass;
  sessionEnergyDemandScore: number;
  sessionRecoveryDemandScore: number;
} {
  const fuelPriority = input.fuelPriority ?? fuelPriorityForSupportDomain(input);
  const duration = input.durationMinutes ?? 45;
  const long = duration >= 60;
  const veryLong = duration >= 80;
  const hardIntensity = input.plannedIntensity === 'hard';

  switch (fuelPriority) {
    case 'sparring':
      return {
        expectedCarbDemandClass: 'high',
        expectedRecoveryDemandClass: 'high',
        expectedHydrationDemandClass: 'high',
        sessionEnergyDemandScore: 9,
        sessionRecoveryDemandScore: 9,
      };
    case 'boxing_practice':
      return {
        expectedCarbDemandClass: long || hardIntensity ? 'high' : 'moderate',
        expectedRecoveryDemandClass: hardIntensity ? 'high' : 'moderate',
        expectedHydrationDemandClass: 'moderate',
        sessionEnergyDemandScore: long ? 8 : 6,
        sessionRecoveryDemandScore: hardIntensity ? 7 : 5,
      };
    case 'strength_power':
    case 'power':
      return {
        expectedCarbDemandClass: 'moderate',
        expectedRecoveryDemandClass: 'high',
        expectedHydrationDemandClass: 'moderate',
        sessionEnergyDemandScore: 6,
        sessionRecoveryDemandScore: 7,
      };
    case 'roadwork_aerobic':
      return {
        expectedCarbDemandClass: veryLong ? 'moderate' : 'low',
        expectedRecoveryDemandClass: long ? 'moderate' : 'low',
        expectedHydrationDemandClass: long ? 'moderate' : 'low',
        sessionEnergyDemandScore: long ? 5 : 3,
        sessionRecoveryDemandScore: long ? 4 : 2,
      };
    case 'roadwork_tempo':
    case 'conditioning_intervals':
      return {
        expectedCarbDemandClass: 'high',
        expectedRecoveryDemandClass: 'high',
        expectedHydrationDemandClass: 'high',
        sessionEnergyDemandScore: 8,
        sessionRecoveryDemandScore: 8,
      };
    case 'durability':
      return {
        expectedCarbDemandClass: 'low',
        expectedRecoveryDemandClass: 'moderate',
        expectedHydrationDemandClass: 'low',
        sessionEnergyDemandScore: 3,
        sessionRecoveryDemandScore: 4,
      };
    case 'mobility':
    case 'recovery':
      return {
        expectedCarbDemandClass: 'baseline',
        expectedRecoveryDemandClass: 'low',
        expectedHydrationDemandClass: 'baseline',
        sessionEnergyDemandScore: 1,
        sessionRecoveryDemandScore: 2,
      };
    case 'double_session':
      return {
        expectedCarbDemandClass: 'high',
        expectedRecoveryDemandClass: 'high',
        expectedHydrationDemandClass: 'high',
        sessionEnergyDemandScore: 9,
        sessionRecoveryDemandScore: 8,
      };
    case 'body_mass_protect':
      return {
        expectedCarbDemandClass: 'moderate',
        expectedRecoveryDemandClass: 'high',
        expectedHydrationDemandClass: 'high',
        sessionEnergyDemandScore: 5,
        sessionRecoveryDemandScore: 7,
      };
    default:
      return {
        expectedCarbDemandClass: 'baseline',
        expectedRecoveryDemandClass: 'baseline',
        expectedHydrationDemandClass: 'baseline',
        sessionEnergyDemandScore: 2,
        sessionRecoveryDemandScore: 2,
      };
  }
}

export function supportSessionMetadata(input: {
  family?: BoxingSessionFamily | null | undefined;
  role?: BoxingPlannedSessionRole | null | undefined;
  domain?: BoxingAthleteSupportDomain | null | undefined;
  doseCategory?: BoxingSessionDoseCategory | null | undefined;
  plannedIntensity?: WorkoutIntensity | null | undefined;
  durationMinutes?: number | null | undefined;
  protectedModality?: ProtectedWorkoutModality | null | undefined;
}): {
  athleticDevelopmentDomain?: BoxingAthleteSupportDomain | undefined;
  supportDomainLabel?: string | undefined;
  supportSourceLabel?: string | undefined;
  boxingRelevance?: string | undefined;
  athleticDevelopmentRationale?: string | undefined;
  sAndCRationale?: string | undefined;
  expectedFuelPriority: AthleteSupportFuelPriority;
  expectedCarbDemandClass: SupportDemandClass;
  expectedRecoveryDemandClass: SupportDemandClass;
  expectedHydrationDemandClass: SupportDemandClass;
  sessionEnergyDemandScore: number;
  sessionRecoveryDemandScore: number;
} {
  const athleticDevelopmentDomain = input.domain
    ?? familyToAthleticDevelopmentDomain(input.family, input.role)
    ?? protectedModalityToAthleticDevelopmentDomain(input.protectedModality);
  const expectedFuelPriority = fuelPriorityForSupportDomain({
    ...input,
    domain: athleticDevelopmentDomain,
  });
  const demand = supportDemandForSession({
    ...input,
    domain: athleticDevelopmentDomain,
    fuelPriority: expectedFuelPriority,
  });
  const label = supportDomainLabel(athleticDevelopmentDomain);

  return {
    athleticDevelopmentDomain,
    supportDomainLabel: label,
    supportSourceLabel: supportDomainSourceLabel(athleticDevelopmentDomain),
    boxingRelevance: input.family ? boxingRelevanceForFamily(input.family) : undefined,
    athleticDevelopmentRationale: input.family ? athleticDevelopmentRationaleForFamily(input.family) : undefined,
    sAndCRationale: input.family ? athleticDevelopmentRationaleForFamily(input.family) : undefined,
    expectedFuelPriority,
    ...demand,
  };
}
