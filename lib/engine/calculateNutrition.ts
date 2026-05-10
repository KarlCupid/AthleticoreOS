import type {
  DailyHydrationPlan,
  DeficitClass,
  FuelPriority,
  MacroAdherenceResult,
  NutritionGoal,
  NutritionProfileInput,
  NutritionSafetyEvent,
  NutritionSafetyWarning,
  NutritionTargetEstimate,
  RecoveryNutritionFocus,
  NutritionFuelingTarget,
  SessionFuelingPlan,
  SessionFuelingWindow,
} from './types/nutrition.ts';
import type { Phase } from './types/foundational.ts';
import type { ActivityType } from './types/schedule.ts';
import type { MacrocycleContext } from './types/mission.ts';
import type { MEDStatus, ReadinessProfile, StimulusConstraintSet } from './types/readiness.ts';
import { applyFuelingFloor, estimateTrainingExpenditure } from './nutrition/energyAvailability.ts';
import { calculateCaloriesFromMacros } from '../utils/nutrition.ts';
import {
  confidenceFromLevel,
  createAthleteJourneyState,
  createAthleteProfile,
  createComposedSession,
  createMeasurementRange,
  createPerformanceState,
  createPhaseState,
  createUnknownBodyMassState,
  createUnknownReadinessState,
  generateNutritionTarget,
  normalizeBodyMass,
  resolveReadinessState,
  type AthleticorePhase,
  type ComposedSession,
  type NutritionTarget,
  type PerformanceState,
  type ReadinessState as EngineReadinessState,
  type SessionFamily,
  type SessionFuelingDirective,
} from '../performance-engine/index.ts';

type DayActivity = {
  activity_type: ActivityType;
  expected_intensity: number;
  estimated_duration_min: number;
  start_time?: string | null | undefined;
  custom_label?: string | null | undefined;
  athletic_development_domain?: string | null | undefined;
  boxing_session_family?: string | null | undefined;
  support_domain_label?: string | null | undefined;
  fuel_priority?: FuelPriority | null | undefined;
  carb_demand_class?: 'baseline' | 'low' | 'moderate' | 'high' | null | undefined;
  recovery_demand_class?: 'baseline' | 'low' | 'moderate' | 'high' | null | undefined;
  hydration_demand_class?: 'baseline' | 'low' | 'moderate' | 'high' | null | undefined;
  energy_demand_score?: number | null | undefined;
  recovery_demand_score?: number | null | undefined;
};

type NutritionResolutionOptions = {
  daysToWeighIn?: number | null | undefined;
  bodyweightLbs?: number | null | undefined;
  leanMassKg?: number | null | undefined;
  athleteAge?: number | null | undefined;
  readinessProfile?: ReadinessProfile | null | undefined;
  constraintSet?: StimulusConstraintSet | null | undefined;
  macrocycleContext?: MacrocycleContext | null | undefined;
  medStatus?: MEDStatus | null | undefined;
};

const ENGINE_VERSION = 'nutrition_fueling_engine_v1' as const;
const ADAPTER_DATE = '2026-01-01';
const ENGINE_CONFIDENCE = confidenceFromLevel('medium', [
  'Nutrition targets are resolved by the Nutrition and Fueling Engine.',
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function targetValue(range: { target: number | null; min: number | null; max: number | null }, fallback: number): number {
  return Math.round(range.target ?? range.min ?? range.max ?? fallback);
}

function mapPhase(phase: Phase | null | undefined, context?: MacrocycleContext | null): AthleticorePhase {
  if (context?.campPhase === 'taper') return 'taper';
  if (context?.daysOut != null && context.daysOut <= 7 && context.goalMode === 'fight_camp') return 'competition_week';
  if (context?.goalMode === 'fight_camp') return 'camp';

  switch (phase) {
    case 'fight-camp':
    case 'camp-base':
    case 'camp-build':
    case 'camp-peak':
      return 'camp';
    case 'camp-taper':
      return 'taper';
    case 'pre-camp':
    case 'off-season':
    default:
      return 'build';
  }
}

function estimatePhaseEnergyAdjustment(phase: Phase, goal: NutritionGoal): number {
  const canonical = mapPhase(phase);
  if (goal === 'bulk') return canonical === 'camp' || canonical === 'taper' ? 0 : 0.08;
  if (goal === 'cut') {
    if (canonical === 'camp') return -0.12;
    if (canonical === 'taper') return -0.08;
    return -0.06;
  }
  if (canonical === 'camp') return 0.04;
  return 0;
}

function safeEnergyFloor(weightLbs: number, biologicalSex?: 'male' | 'female'): number {
  const sexFloor = biologicalSex === 'female' ? 1200 : 1500;
  return Math.max(sexFloor, Math.round(weightLbs * 11.5));
}

function distributeAroundProtein(input: {
  calories: number;
  protein: number;
  carbBias: number;
  fatBias?: number | null;
  lockCarbs?: boolean;
  lockFat?: boolean;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const protein = clamp(Math.round(input.protein), 70, 330);
  const minFat = 40;

  if (input.lockCarbs && input.lockFat && input.fatBias != null) {
    const carbs = Math.max(0, Math.round(input.carbBias));
    const fat = Math.max(minFat, Math.round(input.fatBias));
    return {
      calories: calculateCaloriesFromMacros(protein, carbs, fat),
      protein,
      carbs,
      fat,
    };
  }

  if (input.lockCarbs) {
    const carbs = Math.max(0, Math.round(input.carbBias));
    const fat = Math.max(minFat, Math.round((input.calories - protein * 4 - carbs * 4) / 9));
    return {
      calories: calculateCaloriesFromMacros(protein, carbs, fat),
      protein,
      carbs,
      fat,
    };
  }

  if (input.lockFat && input.fatBias != null) {
    const fat = Math.max(minFat, Math.round(input.fatBias));
    const carbs = Math.max(0, Math.round((input.calories - protein * 4 - fat * 9) / 4));
    return {
      calories: calculateCaloriesFromMacros(protein, carbs, fat),
      protein,
      carbs,
      fat,
    };
  }

  const maxCarbsAtMinFat = Math.max(0, Math.floor((input.calories - protein * 4 - minFat * 9) / 4));
  const carbs = clamp(Math.round(input.carbBias), 0, maxCarbsAtMinFat);
  const fat = Math.max(minFat, Math.round((input.calories - protein * 4 - carbs * 4) / 9));

  return {
    calories: calculateCaloriesFromMacros(protein, carbs, fat),
    protein,
    carbs,
    fat,
  };
}

function activityFamily(activity: ActivityType): SessionFamily {
  switch (activity) {
    case 'sparring':
      return 'sparring';
    case 'boxing_practice':
      return 'boxing_skill';
    case 'sc':
      return 'strength';
    case 'running':
    case 'road_work':
      return 'roadwork';
    case 'conditioning':
      return 'conditioning';
    case 'active_recovery':
      return 'recovery';
    case 'rest':
      return 'rest';
    case 'other':
    default:
      return 'other';
  }
}

function inferredFuelPriority(activity: DayActivity): FuelPriority | null {
  if (activity.fuel_priority) return activity.fuel_priority;
  const domain = activity.athletic_development_domain;
  const label = `${activity.custom_label ?? ''} ${activity.support_domain_label ?? ''} ${activity.boxing_session_family ?? ''}`.toLowerCase();
  if (activity.activity_type === 'sparring') return 'sparring';
  if (domain === 'strength' || label.includes('strength')) return 'strength_power';
  if (domain === 'power' || label.includes('power')) return 'power';
  if (domain === 'roadwork' && (label.includes('tempo') || activity.expected_intensity >= 6)) return 'roadwork_tempo';
  if (domain === 'roadwork' || label.includes('roadwork')) return 'roadwork_aerobic';
  if (domain === 'conditioning' || label.includes('interval') || label.includes('alactic') || label.includes('round tolerance')) return 'conditioning_intervals';
  if (domain === 'durability' || label.includes('durability')) return 'durability';
  if (domain === 'mobility' || label.includes('mobility') || label.includes('prehab')) return 'mobility';
  if (domain === 'recovery' || activity.activity_type === 'active_recovery') return 'recovery';
  if (domain === 'boxing_skill_support' || activity.activity_type === 'boxing_practice') {
    return activity.expected_intensity >= 6 || activity.estimated_duration_min >= 25 ? 'boxing_practice' : 'mobility';
  }
  return null;
}

function sessionTitle(activity: DayActivity): string {
  if (activity.custom_label?.trim()) return activity.custom_label.trim();
  return activity.activity_type.replace(/_/g, ' ');
}

function toComposedSessions(activities: DayActivity[], date: string): ComposedSession[] {
  return activities.map((activity, index) => {
    const priority = inferredFuelPriority(activity);
    const family = priority === 'strength_power' || priority === 'power'
      ? 'strength'
      : priority === 'roadwork_aerobic' || priority === 'roadwork_tempo'
        ? 'roadwork'
        : priority === 'conditioning_intervals'
          ? 'conditioning'
          : priority === 'durability' || priority === 'mobility'
            ? 'recovery'
            : activityFamily(activity.activity_type);
    const duration = Math.max(0, activity.estimated_duration_min);
    const intensity = clamp(activity.expected_intensity, 0, 10);

    return createComposedSession({
      id: `nutrition:${date}:${activity.activity_type}:${index}`,
      date,
      family,
      title: sessionTitle(activity),
      source: 'engine_generated',
      protectedAnchor: false,
      durationMinutes: createMeasurementRange({
        target: duration,
        unit: 'minute',
        confidence: ENGINE_CONFIDENCE,
      }),
      intensityRpe: createMeasurementRange({
        target: intensity,
        unit: 'rpe',
        confidence: ENGINE_CONFIDENCE,
      }),
      startsAt: activity.start_time ? `${date}T${activity.start_time.length === 5 ? `${activity.start_time}:00` : activity.start_time}` : null,
      stressScore: activity.energy_demand_score ?? activity.recovery_demand_score ?? Math.round((duration * intensity) / 10),
      tissueLoads: family === 'strength'
        ? ['strength']
        : priority === 'durability'
          ? ['trunk', 'shoulder_scap', 'neck_trap']
          : priority === 'mobility'
            ? ['hip_ankle', 'mobility']
            : family === 'sparring'
              ? ['impact', 'neural']
              : [],
      supportMetadata: {
        athleticDevelopmentDomain: activity.athletic_development_domain ?? null,
        boxingSessionFamily: activity.boxing_session_family ?? null,
        supportDomainLabel: activity.support_domain_label ?? null,
        expectedFuelPriority: activity.fuel_priority ?? null,
        expectedCarbDemandClass: activity.carb_demand_class ?? null,
        expectedRecoveryDemandClass: activity.recovery_demand_class ?? null,
        expectedHydrationDemandClass: activity.hydration_demand_class ?? null,
        sessionEnergyDemandScore: activity.energy_demand_score ?? null,
        sessionRecoveryDemandScore: activity.recovery_demand_score ?? null,
      },
      confidence: ENGINE_CONFIDENCE,
    });
  });
}

function createBodyMassState(weightLbs: number | null, date: string) {
  if (weightLbs == null) return createUnknownBodyMassState('lb');
  const current = normalizeBodyMass({
    value: weightLbs,
    fromUnit: 'lb',
    toUnit: 'lb',
    measuredOn: date,
    confidence: ENGINE_CONFIDENCE,
  });

  return {
    ...createUnknownBodyMassState('lb'),
    current,
    missingFields: current ? [] : [{ field: 'current_body_mass', reason: 'invalid' as const }],
    confidence: current ? ENGINE_CONFIDENCE : confidenceFromLevel('low', ['Body mass was unavailable or invalid.']),
  };
}

function createReadinessState(profile: ReadinessProfile | null | undefined, date: string): EngineReadinessState {
  if (!profile) return createUnknownReadinessState(date);
  const confidence = confidenceFromLevel(profile.dataConfidence ?? 'medium', [
    'Readiness profile was projected into PerformanceState.',
  ]);
  const neural = clamp(profile.neuralReadiness, 0, 100);
  const structural = clamp(profile.structuralReadiness, 0, 100);
  const metabolic = clamp(profile.metabolicReadiness, 0, 100);
  const overall = clamp(profile.overallReadiness ?? Math.round((neural + structural + metabolic) / 3), 0, 100);

  return resolveReadinessState({
    athleteId: 'nutrition-fueling-athlete',
    date,
    entries: [
      {
        id: `nutrition-fueling-readiness:${date}`,
        athleteId: 'nutrition-fueling-athlete',
        timestamp: `${date}T08:00:00.000Z`,
        timezone: 'UTC',
        type: 'readiness',
        source: 'system_inferred',
        value: overall,
        unit: 'percent',
        confidence,
        context: {
          neuralReadiness: neural,
          structuralReadiness: structural,
          metabolicReadiness: metabolic,
          sourceReadinessState: profile.readinessState,
        },
        notes: null,
      },
      {
        id: `nutrition-fueling-support:${date}`,
        athleteId: 'nutrition-fueling-athlete',
        timestamp: `${date}T08:05:00.000Z`,
        timezone: 'UTC',
        type: 'nutrition_adherence',
        source: 'system_inferred',
        value: metabolic,
        unit: 'percent',
        confidence,
        context: { source: 'projected_metabolic_readiness' },
        notes: null,
      },
    ],
  }).readiness;
}

function buildPerformanceState(input: {
  profile: NutritionProfileInput;
  date: string;
  activities?: DayActivity[] | undefined;
  options?: NutritionResolutionOptions | undefined;
}): PerformanceState {
  const canonicalPhase = mapPhase(input.options?.macrocycleContext?.phase ?? input.profile.phase, input.options?.macrocycleContext);
  const athlete = createAthleteProfile({
    athleteId: 'nutrition-fueling-athlete',
    userId: 'nutrition-fueling-user',
    sport: 'boxing',
    biologicalSex: input.profile.biologicalSex,
    ageYears: input.options?.athleteAge ?? input.profile.age,
    preferredBodyMassUnit: 'lb',
    confidence: ENGINE_CONFIDENCE,
  });
  const phase = createPhaseState({
    current: canonicalPhase,
    activeSince: input.date,
    transitionReason: 'unknown',
    confidence: ENGINE_CONFIDENCE,
  });
  const bodyMass = createBodyMassState(input.options?.bodyweightLbs ?? input.profile.weightLbs, input.date);
  const journey = createAthleteJourneyState({
    journeyId: `${athlete.athleteId}:journey`,
    athlete,
    phase,
    bodyMassState: bodyMass,
    nutritionPreferences: {
      goal: input.profile.nutritionGoal,
      dietaryNotes: [],
      supplementNotes: [],
    },
    trackingPreferences: {
      bodyMass: true,
      readiness: Boolean(input.options?.readinessProfile),
      nutrition: true,
      cycle: input.profile.cycleDay != null,
    },
    confidence: ENGINE_CONFIDENCE,
  });
  const composedSessions = toComposedSessions(input.activities ?? [], input.date);

  return createPerformanceState({
    athlete,
    journey,
    asOfDate: input.date,
    phase,
    bodyMass,
    composedSessions,
    readiness: createReadinessState(input.options?.readinessProfile, input.date),
    riskFlags: [],
    confidence: ENGINE_CONFIDENCE,
  });
}

function getEngineTarget(input: {
  profile: NutritionProfileInput;
  date: string;
  activities?: DayActivity[] | undefined;
  options?: NutritionResolutionOptions | undefined;
}): NutritionTarget {
  return generateNutritionTarget({
    performanceState: buildPerformanceState(input),
    date: input.date,
  }).target;
}

function nutritionTargetToEstimate(input: NutritionProfileInput): NutritionTargetEstimate {
  const target = getEngineTarget({ profile: input, date: ADAPTER_DATE });
  const weightLbs = input.weightLbs;
  const phaseMultiplier = estimatePhaseEnergyAdjustment(input.phase, input.nutritionGoal);
  const engineCalories = targetValue(target.energyTarget, Math.round(weightLbs * 14.2));
  const floor = safeEnergyFloor(weightLbs, input.biologicalSex);
  const correction = input.weightCorrectionDeficit ?? 0;
  let adjustedCalories = input.coachCaloriesOverride ?? engineCalories;
  adjustedCalories = correction >= 0 ? adjustedCalories - correction : adjustedCalories + Math.abs(correction);
  adjustedCalories = Math.max(floor, Math.round(adjustedCalories));

  const protein = input.coachProteinOverride ?? targetValue(target.proteinTarget, Math.round(weightLbs * 0.85));
  const carbBias = input.coachCarbsOverride ?? targetValue(target.carbohydrateTarget, Math.round(weightLbs * 1.8));
  const fatBias = input.coachFatOverride ?? targetValue(target.fatTarget, Math.round(weightLbs * 0.35));
  let reconciled = distributeAroundProtein({
    calories: adjustedCalories,
    protein,
    carbBias,
    fatBias,
    lockCarbs: input.coachCarbsOverride != null,
    lockFat: input.coachFatOverride != null,
  });
  if (reconciled.calories < floor) {
    const carbSafetyBump = Math.ceil((floor - reconciled.calories) / 4);
    reconciled = {
      ...reconciled,
      carbs: reconciled.carbs + carbSafetyBump,
      calories: calculateCaloriesFromMacros(reconciled.protein, reconciled.carbs + carbSafetyBump, reconciled.fat),
    };
  }
  const tdee = Math.max(
    reconciled.calories,
    Math.round(target.energyTargetRange.max ?? reconciled.calories),
    Math.round(reconciled.calories / Math.max(0.72, 1 + phaseMultiplier)),
  );
  const messageParts = [
    'Nutrition and Fueling Engine target resolved from athlete profile, phase, body mass, and safety floors.',
    input.nutritionGoal === 'cut' ? 'Body-composition support is gradual and cannot cross under-fueling floors.' : null,
    input.nutritionGoal === 'bulk' ? 'Lean-gain support uses training-aware ranges instead of fixed macro tables.' : null,
    input.coachCaloriesOverride != null && input.coachCaloriesOverride < floor ? 'Unsafe low calorie override was raised to the safety floor.' : null,
    correction !== 0 ? `${Math.abs(correction)} cal body-mass correction applied with safety floor protection.` : null,
    target.explanation?.summary ?? null,
  ].filter((line): line is string => Boolean(line));

  return {
    engineVersion: ENGINE_VERSION,
    canonicalPhase: target.phase,
    tdee,
    adjustedCalories: reconciled.calories,
    protein: reconciled.protein,
    carbs: reconciled.carbs,
    fat: reconciled.fat,
    proteinModifier: 1,
    phaseMultiplier,
    weightCorrectionDeficit: correction,
    message: messageParts.join(' '),
  };
}

function sortedActivities(activities: DayActivity[]): DayActivity[] {
  return [...activities].sort((left, right) => {
    const timeA = left.start_time ?? '99:99';
    const timeB = right.start_time ?? '99:99';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return activityPriorityScore(right) - activityPriorityScore(left);
  });
}

function activeActivities(activities: DayActivity[]): DayActivity[] {
  return activities.filter((activity) => activity.activity_type !== 'rest' && activity.activity_type !== 'active_recovery');
}

function activityPriorityScore(activity: DayActivity): number {
  const directScore = Math.max(
    activity.energy_demand_score ?? 0,
    activity.recovery_demand_score ?? 0,
  );
  const base = activity.expected_intensity * 10 + Math.round(activity.estimated_duration_min / 5);
  const priority = inferredFuelPriority(activity);
  const sourceScore = directScore > 0 ? Math.max(base, directScore) : base;
  if (activity.activity_type === 'sparring') return sourceScore + 35;
  if (activity.activity_type === 'boxing_practice') return sourceScore + 20;
  if (priority === 'strength_power' || priority === 'power') return sourceScore + 18;
  if (priority === 'conditioning_intervals' || activity.activity_type === 'conditioning') return sourceScore + 16;
  if (priority === 'roadwork_tempo') return sourceScore + 14;
  if (activity.activity_type === 'sc') return sourceScore + 15;
  return sourceScore;
}

function getPrioritySession(activities: DayActivity[], trainingIntensityCap?: number | null): {
  priority: FuelPriority;
  label: string;
  sessionLabel: string;
  activity: DayActivity | null;
} {
  const sorted = sortedActivities(activities);
  const active = activeActivities(sorted);

  if ((trainingIntensityCap ?? 10) <= 4) {
    const activity = active[0] ?? null;
    return {
      priority: 'body_mass_protect',
      label: 'Body-mass support session',
      sessionLabel: activity?.custom_label ?? 'Allowed training window',
      activity,
    };
  }

  if (active.length >= 2) {
    const activity = [...active].sort((a, b) => activityPriorityScore(b) - activityPriorityScore(a))[0] ?? null;
    return {
      priority: 'double_session',
      label: 'Double session day',
      sessionLabel: activity?.custom_label ?? 'Two-a-day',
      activity,
    };
  }

  const activity = active[0] ?? null;
  if (!activity) {
    return {
      priority: 'recovery',
      label: sorted[0]?.activity_type === 'active_recovery' ? 'Recovery session' : 'Recovery day',
      sessionLabel: sorted[0]?.custom_label ?? 'Recovery day',
      activity: sorted[0] ?? null,
    };
  }

  const inferred = inferredFuelPriority(activity);
  if (inferred) {
    const labels: Record<FuelPriority, string> = {
      sparring: 'Sparring',
      boxing_practice: 'Boxing practice',
      strength_power: 'Strength-power support',
      power: 'Power support',
      roadwork_aerobic: 'Roadwork base',
      roadwork_tempo: 'Roadwork tempo',
      conditioning_intervals: 'Conditioning intervals',
      durability: 'Durability support',
      mobility: 'Mobility support',
      heavy_sc: 'Heavy S&C',
      conditioning: 'Conditioning',
      double_session: 'Double session day',
      recovery: 'Recovery session',
      body_mass_protect: 'Body-mass support session',
    };
    return {
      priority: inferred,
      label: labels[inferred],
      sessionLabel: activity.custom_label ?? activity.support_domain_label ?? labels[inferred],
      activity,
    };
  }

  switch (activity.activity_type) {
    case 'sparring':
      return { priority: 'sparring', label: 'Sparring', sessionLabel: activity.custom_label ?? 'Sparring', activity };
    case 'boxing_practice':
      return { priority: 'boxing_practice', label: 'Boxing practice', sessionLabel: activity.custom_label ?? 'Technical practice', activity };
    case 'sc':
      return {
        priority: 'strength_power',
        label: 'Strength-power support',
        sessionLabel: activity.custom_label ?? 'Strength and conditioning',
        activity,
      };
    case 'conditioning':
      return { priority: 'conditioning_intervals', label: 'Conditioning intervals', sessionLabel: activity.custom_label ?? 'Conditioning support', activity };
    case 'road_work':
    case 'running':
      return {
        priority: activity.expected_intensity >= 6 ? 'roadwork_tempo' : 'roadwork_aerobic',
        label: activity.expected_intensity >= 6 ? 'Roadwork tempo' : 'Roadwork base',
        sessionLabel: activity.custom_label ?? 'Roadwork support',
        activity,
      };
    case 'other':
    default:
      return { priority: 'conditioning', label: 'Conditioning', sessionLabel: activity.custom_label ?? 'Conditioning session', activity };
  }
}

function deficitClass(baseTargets: NutritionTargetEstimate): DeficitClass {
  if (baseTargets.phaseMultiplier < -0.03 || baseTargets.weightCorrectionDeficit > 0) return 'steady_deficit';
  if (baseTargets.phaseMultiplier > 0.03) return 'steady_bulk';
  return 'steady_maintain';
}

function fuelState(priority: FuelPriority, target: NutritionTarget): NutritionFuelingTarget['fuelState'] {
  if (priority === 'body_mass_protect') return 'body_mass_protect';
  if (target.phase === 'taper' || target.phase === 'competition_week') return 'taper';
  if (priority === 'sparring' || priority === 'boxing_practice') return 'spar_support';
  if (priority === 'heavy_sc' || priority === 'strength_power' || priority === 'power') return 'strength_power';
  if (priority === 'double_session') return 'double_day';
  if (priority === 'recovery' || priority === 'mobility' || priority === 'durability') return 'active_recovery';
  return 'aerobic';
}

function recoveryFocus(target: NutritionTarget, priority: FuelPriority): RecoveryNutritionFocus {
  const focus = target.recoveryDirectives[0]?.focus;
  if (priority === 'sparring' || focus === 'impact_recovery' || focus === 'tissue_repair') return 'impact_recovery';
  if (focus === 'glycogen_restore' || priority === 'conditioning_intervals' || priority === 'roadwork_tempo') return 'glycogen_restore';
  if (focus === 'hydration_restore') return 'hydration_restore';
  if (priority === 'roadwork_aerobic') return 'hydration_restore';
  return 'none';
}

function hydrationPlan(input: {
  target: NutritionTarget;
  priority: FuelPriority;
  recoveryFocus: RecoveryNutritionFocus;
  hydrationBoostOz: number;
  hydrationDemandClass?: DayActivity['hydration_demand_class'];
}): DailyHydrationPlan {
  const sodiumTargetValue = targetValue(input.target.sodiumElectrolyteGuidance?.sodiumTargetRange ?? { target: null, min: null, max: null }, 0);
  const sodiumTarget = sodiumTargetValue || null;
  const notes = [
    ...(input.target.sodiumElectrolyteGuidance?.electrolyteNotes ?? []),
    input.priority === 'sparring' ? 'Start the first session hydrated so speed and decision-making stay protected.' : null,
    input.priority === 'roadwork_aerobic' ? 'Roadwork base usually needs steady hydration; add electrolytes if it is long, hot, or sweaty.' : null,
    input.priority === 'conditioning_intervals' ? 'Conditioning intervals need fluids and electrolytes before and after the session.' : null,
    input.target.phase === 'competition_week' || input.target.phase === 'taper' ? 'Avoid new hydration products during competition week.' : null,
  ].filter((line): line is string => Boolean(line));

  return {
    dailyTargetOz: targetValue(input.target.hydrationTarget ?? { target: 96, min: null, max: null }, 96),
    sodiumTargetMg: sodiumTarget,
    emphasis: input.hydrationDemandClass === 'high' || input.hydrationDemandClass === 'moderate'
        ? 'performance'
        : input.recoveryFocus === 'hydration_restore'
        ? 'recovery'
        : input.priority === 'sparring' || input.priority === 'double_session' || input.priority === 'boxing_practice'
          || input.priority === 'strength_power' || input.priority === 'power'
          || input.priority === 'roadwork_aerobic' || input.priority === 'roadwork_tempo'
          || input.priority === 'conditioning_intervals'
          ? 'performance'
          : 'baseline',
    notes,
  };
}

function defaultFuelingWindow(label: string, timing: string): SessionFuelingWindow {
  return {
    label,
    timing,
    carbsG: 0,
    proteinG: 0,
    notes: [],
  };
}

function sessionFuelingPlanFromDirective(input: {
  priority: FuelPriority;
  priorityLabel: string;
  sessionLabel: string;
  directive: SessionFuelingDirective | null;
  activeCount: number;
}): SessionFuelingPlan {
  const directive = input.directive;
  const preWindow = directive?.windows?.find((window) => window.timing === 'pre');
  const postWindow = directive?.windows?.find((window) => window.timing === 'post');
  const carbDemand = targetValue(directive?.carbohydrateDemand ?? { target: 0, min: null, max: null }, 0);
  const hydrationDemand = targetValue(directive?.hydrationDemand ?? { target: 18, min: null, max: null }, 18);
  const pre = preWindow
    ? {
        label: 'Before training',
        timing: '60-90 min before training',
        carbsG: targetValue(preWindow.carbGrams, 0),
        proteinG: targetValue(preWindow.proteinGrams, 0),
        notes: preWindow.notes,
        lowResidue: directive?.gutComfortConcern === 'moderate' || directive?.gutComfortConcern === 'high',
      }
    : defaultFuelingWindow('Before training', 'No timed pre-session fueling needed');
  const post = postWindow
    ? {
        label: 'After training',
        timing: 'Within 60 min after training',
        carbsG: targetValue(postWindow.carbGrams, 0),
        proteinG: targetValue(postWindow.proteinGrams, 0),
        notes: postWindow.notes,
      }
    : defaultFuelingWindow('After training', 'Normal meal timing is enough today');
  const supportNote = (() => {
    switch (input.priority) {
      case 'strength_power':
      case 'heavy_sc':
        return 'Today is strength-power support, so the goal is enough carbs to train and protein to recover.';
      case 'power':
        return 'Today is power support for boxing; arrive fueled enough to move fast and recover with protein.';
      case 'roadwork_aerobic':
        return 'Roadwork base is low intensity; keep hydration steady and fuel normally unless duration is long.';
      case 'roadwork_tempo':
        return 'Roadwork tempo needs enough carbohydrate and fluids to hold controlled pace without under-fueling.';
      case 'conditioning_intervals':
      case 'conditioning':
        return 'Conditioning intervals need pre-session carbs and fluids, then glycogen restore after training.';
      case 'durability':
        return 'Durability support has lower carb demand, but protein, micronutrients, and hydration still matter.';
      case 'mobility':
      case 'recovery':
        return 'Recovery reset day: stay consistent, hit protein, and hydrate.';
      case 'sparring':
        return 'Sparring already drives high stress today; do not under-fuel recovery.';
      default:
        return 'Nutrition and Fueling Engine generated session fueling guidance.';
    }
  })();

  return {
    priority: input.priority,
    priorityLabel: input.priorityLabel,
    sessionLabel: input.sessionLabel,
    preSession: pre,
    intraSession: {
      fluidsOz: hydrationDemand,
      electrolytesMg: targetValue(preWindow?.sodiumMg ?? { target: null, min: null, max: null }, 0) || null,
      carbsG: carbDemand >= 60 ? Math.min(60, Math.round(carbDemand * 0.4)) : 0,
      notes: directive?.duringSessionGuidance ?? ['Use fluids during training.'],
    },
    betweenSessions: input.activeCount >= 2
      ? {
          label: 'Between sessions',
          timing: 'Within 30-60 min after the first session',
          carbsG: Math.max(25, Math.round(carbDemand * 0.35)),
          proteinG: 20,
          notes: ['Keep this easy to digest so the second session stays sharp.'],
          lowResidue: false,
        }
      : null,
    postSession: post,
    hydrationNotes: directive?.duringSessionGuidance ?? [],
    coachingNotes: [
      supportNote,
      directive?.explanation?.summary ?? 'Session fueling came from the Nutrition and Fueling Engine.',
    ].filter((line): line is string => Boolean(line)),
  };
}

function safetyWarningFromRisks(target: NutritionTarget, fallback: NutritionSafetyWarning): NutritionSafetyWarning {
  if (fallback !== 'none') return fallback;
  if (target.riskFlags.some((flag) => flag.code === 'under_fueling_risk' && flag.severity === 'critical')) {
    return 'critical_energy_availability';
  }
  if (target.riskFlags.some((flag) => flag.code === 'under_fueling_risk')) {
    return 'low_energy_availability';
  }
  return 'none';
}

function resolveFromTarget(input: {
  baseTargets: NutritionTargetEstimate;
  target: NutritionTarget;
  activities: DayActivity[];
  adjustedMacros?: { calories: number; protein: number; carbs: number; fat: number };
  floorResult?: ReturnType<typeof applyFuelingFloor>;
  reasonLines?: string[];
}): NutritionFuelingTarget {
  const priority = getPrioritySession(input.activities, null);
  const activeCount = activeActivities(input.activities).length;
  const firstDirective = input.target.sessionFuelingDirectives[0] ?? null;
  const recovery = recoveryFocus(input.target, priority.priority);
  const hydrationTargetOz = targetValue(input.target.hydrationTarget ?? { target: 96, min: null, max: null }, 96);
  const hydrationBoostOz = clamp(hydrationTargetOz - 80, 0, 72);
  const directDemandScore = input.activities.reduce((max, activity) => Math.max(
    max,
    activity.energy_demand_score ?? 0,
    activity.recovery_demand_score ?? 0,
  ), 0);
  const floorResult = input.floorResult;
  const macros = input.adjustedMacros ?? {
    calories: targetValue(input.target.energyTarget, input.baseTargets.adjustedCalories),
    protein: targetValue(input.target.proteinTarget, input.baseTargets.protein),
    carbs: targetValue(input.target.carbohydrateTarget, input.baseTargets.carbs),
    fat: targetValue(input.target.fatTarget, input.baseTargets.fat),
  };
  const reasonLines = input.reasonLines ?? [
    input.target.explanation?.summary ?? 'Nutrition and Fueling Engine resolved the target.',
    ...(input.target.explanation?.reasons ?? []),
  ];
  const traceLines = [
    'Canonical Nutrition and Fueling Engine generated this daily target.',
    ...reasonLines,
    ...(floorResult?.traceLines ?? []),
    ...input.target.riskFlags.map((risk) => risk.message),
  ];
  const safetyEvents: NutritionSafetyEvent[] = floorResult?.safetyEvents ?? [];

  return {
    ...input.baseTargets,
    engineVersion: ENGINE_VERSION,
    canonicalPhase: input.target.phase,
    adjustedCalories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    source: input.activities.length > 0
        ? 'daily_activity_adjusted'
        : 'base',
    fuelState: activeCount === 0 ? 'rest' : fuelState(priority.priority, input.target),
    prioritySession: priority.priority,
    deficitClass: deficitClass(input.baseTargets),
    recoveryNutritionFocus: recovery,
    sessionDemandScore: directDemandScore > 0
      ? clamp(Math.round(directDemandScore), activeCount > 0 ? 15 : 0, 95)
      : clamp(Math.round(estimateTrainingExpenditure(input.activities) / 5), activeCount > 0 ? 15 : 0, 95),
    hydrationBoostOz,
    hydrationPlan: hydrationPlan({
      target: input.target,
      priority: priority.priority,
      recoveryFocus: recovery,
      hydrationBoostOz,
      hydrationDemandClass: priority.activity?.hydration_demand_class ?? null,
    }),
    sessionFuelingPlan: sessionFuelingPlanFromDirective({
      priority: priority.priority,
      priorityLabel: priority.label,
      sessionLabel: priority.sessionLabel,
      directive: firstDirective,
      activeCount,
    }),
    reasonLines,
    energyAvailability: floorResult?.energyAvailability ?? null,
    fuelingFloorTriggered: floorResult?.fuelingFloorTriggered ?? input.target.riskFlags.some((flag) => flag.code === 'under_fueling_risk'),
    deficitBankDelta: floorResult?.deficitBankDelta ?? 0,
    safetyWarning: safetyWarningFromRisks(input.target, floorResult?.safetyWarning ?? 'none'),
    safetyEvents,
    traceLines,
    message: reasonLines.join(' '),
  };
}

export function calculateNutritionTargetEstimate(input: NutritionProfileInput): NutritionTargetEstimate {
  return nutritionTargetToEstimate(input);
}

export function computeMacroAdherence(
  actual: { calories: number; protein: number; carbs: number; fat: number },
  prescribed: { calories: number; protein: number; carbs: number; fat: number }
): MacroAdherenceResult {
  const safePct = (a: number, p: number) =>
    p > 0 ? Math.round((a / p) * 100) : a === 0 ? 100 : 0;

  const caloriesPct = safePct(actual.calories, prescribed.calories);
  const proteinPct = safePct(actual.protein, prescribed.protein);
  const carbsPct = safePct(actual.carbs, prescribed.carbs);
  const fatPct = safePct(actual.fat, prescribed.fat);
  const withinRange = (pct: number, threshold: number) => Math.abs(pct - 100) <= threshold;
  const allWithin10 =
    withinRange(caloriesPct, 10) &&
    withinRange(proteinPct, 10) &&
    withinRange(carbsPct, 10) &&
    withinRange(fatPct, 10);
  const allWithin20 =
    withinRange(caloriesPct, 20) &&
    withinRange(proteinPct, 20) &&
    withinRange(carbsPct, 20) &&
    withinRange(fatPct, 20);
  const overall: MacroAdherenceResult['overall'] = allWithin10
    ? 'Target Met'
    : allWithin20
      ? 'Close Enough'
      : 'Missed It';

  return { caloriesPct, proteinPct, carbsPct, fatPct, overall };
}

export function resolveDailyNutritionTargetEstimate(
  baseTargets: NutritionTargetEstimate,
  dayActivities: DayActivity[],
  options?: NutritionResolutionOptions,
): NutritionFuelingTarget {
  const date = ADAPTER_DATE;
  const profile: NutritionProfileInput = {
    weightLbs: options?.bodyweightLbs ?? options?.macrocycleContext?.currentWeightLbs ?? Math.max(120, Math.round(baseTargets.protein / 0.85)),
    heightInches: null,
    age: options?.athleteAge ?? null,
    biologicalSex: 'male',
    activityLevel: 'moderate',
    phase: options?.macrocycleContext?.phase ?? 'off-season',
    nutritionGoal: baseTargets.phaseMultiplier < -0.03 ? 'cut' : baseTargets.phaseMultiplier > 0.03 ? 'bulk' : 'maintain',
    cycleDay: null,
    coachProteinOverride: null,
    coachCarbsOverride: null,
    coachFatOverride: null,
    coachCaloriesOverride: null,
    weightCorrectionDeficit: baseTargets.weightCorrectionDeficit,
  };
  const target = getEngineTarget({
    profile,
    date,
    activities: dayActivities,
    options,
  });

  return resolveFromTarget({
    baseTargets,
    target,
    activities: dayActivities,
  });
}

export function resolveNutritionMacros(
  baseTargets: NutritionTargetEstimate,
  dayActivities: DayActivity[],
) {
  const resolved = resolveDailyNutritionTargetEstimate(baseTargets, dayActivities);

  return {
    calories: resolved.adjustedCalories,
    protein: resolved.protein,
    carbs: resolved.carbs,
    fat: resolved.fat,
    source: resolved.source,
    message: resolved.message,
  };
}
