import type { DailyCutProtocolRow } from './types/weight_cut.ts';
import type {
  DailyHydrationPlan,
  DeficitClass,
  FuelPriority,
  MacroAdherenceResult,
  NutritionGoal,
  NutritionProfileInput,
  NutritionSafetyEvent,
  NutritionSafetyWarning,
  NutritionTargets,
  RecoveryNutritionFocus,
  ResolvedNutritionTargets,
  SessionFuelingPlan,
  SessionFuelingWindow,
} from './types/nutrition.ts';
import type { Phase } from './types/foundational.ts';
import type { ActivityType } from './types/schedule.ts';
import type { MacrocycleContext } from './types/mission.ts';
import type { MEDStatus, ReadinessProfile, StimulusConstraintSet } from './types/readiness.ts';
import { getSafeFightCampSodiumRestrictionDetail } from './safety/policy.ts';
import { applyFuelingFloor, estimateLeanMassKg, estimateTrainingExpenditure } from './nutrition/energyAvailability.ts';
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
  start_time?: string | null;
  custom_label?: string | null;
};

type NutritionResolutionOptions = {
  daysToWeighIn?: number | null;
  bodyweightLbs?: number | null;
  leanMassKg?: number | null;
  athleteAge?: number | null;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  macrocycleContext?: MacrocycleContext | null;
  medStatus?: MEDStatus | null;
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

function legacyPhaseMultiplier(phase: Phase, goal: NutritionGoal): number {
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

function sessionTitle(activity: DayActivity): string {
  if (activity.custom_label?.trim()) return activity.custom_label.trim();
  return activity.activity_type.replace(/_/g, ' ');
}

function toComposedSessions(activities: DayActivity[], date: string): ComposedSession[] {
  return activities.map((activity, index) => {
    const family = activityFamily(activity.activity_type);
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
      stressScore: Math.round((duration * intensity) / 10),
      tissueLoads: family === 'strength' ? ['strength'] : family === 'sparring' ? ['impact', 'neural'] : [],
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
    'Legacy readiness profile was projected into PerformanceState.',
  ]);
  const neural = clamp(profile.neuralReadiness, 0, 100);
  const structural = clamp(profile.structuralReadiness, 0, 100);
  const metabolic = clamp(profile.metabolicReadiness, 0, 100);
  const overall = clamp(profile.overallReadiness ?? Math.round((neural + structural + metabolic) / 3), 0, 100);

  return resolveReadinessState({
    athleteId: 'legacy-nutrition-athlete',
    date,
    entries: [
      {
        id: `legacy-nutrition-readiness:${date}`,
        athleteId: 'legacy-nutrition-athlete',
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
          legacyReadinessState: profile.readinessState,
        },
        notes: null,
      },
      {
        id: `legacy-nutrition-support:${date}`,
        athleteId: 'legacy-nutrition-athlete',
        timestamp: `${date}T08:05:00.000Z`,
        timezone: 'UTC',
        type: 'nutrition_adherence',
        source: 'system_inferred',
        value: metabolic,
        unit: 'percent',
        confidence,
        context: { source: 'legacy_metabolic_readiness' },
        notes: null,
      },
    ],
  }).readiness;
}

function buildPerformanceState(input: {
  profile: NutritionProfileInput;
  date: string;
  activities?: DayActivity[];
  options?: NutritionResolutionOptions;
}): PerformanceState {
  const canonicalPhase = mapPhase(input.options?.macrocycleContext?.phase ?? input.profile.phase, input.options?.macrocycleContext);
  const athlete = createAthleteProfile({
    athleteId: 'legacy-nutrition-athlete',
    userId: 'legacy-nutrition-user',
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
  activities?: DayActivity[];
  options?: NutritionResolutionOptions;
}): NutritionTarget {
  return generateNutritionTarget({
    performanceState: buildPerformanceState(input),
    date: input.date,
  }).target;
}

function nutritionTargetToLegacy(input: NutritionProfileInput): NutritionTargets {
  const target = getEngineTarget({ profile: input, date: ADAPTER_DATE });
  const weightLbs = input.weightLbs;
  const phaseMultiplier = legacyPhaseMultiplier(input.phase, input.nutritionGoal);
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
    input.nutritionGoal === 'cut' ? 'Cut support is gradual and cannot cross under-fueling floors.' : null,
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
  const base = activity.expected_intensity * 10 + Math.round(activity.estimated_duration_min / 5);
  if (activity.activity_type === 'sparring') return base + 35;
  if (activity.activity_type === 'boxing_practice') return base + 20;
  if (activity.activity_type === 'sc') return base + 15;
  if (activity.activity_type === 'conditioning') return base + 12;
  return base;
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
      priority: 'cut_protect',
      label: 'Cut-protect session',
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

  switch (activity.activity_type) {
    case 'sparring':
      return { priority: 'sparring', label: 'Sparring', sessionLabel: activity.custom_label ?? 'Sparring', activity };
    case 'boxing_practice':
      return { priority: 'boxing_practice', label: 'Boxing practice', sessionLabel: activity.custom_label ?? 'Technical practice', activity };
    case 'sc':
      return {
        priority: activity.expected_intensity >= 7 ? 'heavy_sc' : 'conditioning',
        label: activity.expected_intensity >= 7 ? 'Heavy S&C' : 'S&C session',
        sessionLabel: activity.custom_label ?? 'Strength and conditioning',
        activity,
      };
    case 'conditioning':
    case 'road_work':
    case 'running':
    case 'other':
    default:
      return { priority: 'conditioning', label: 'Conditioning', sessionLabel: activity.custom_label ?? 'Conditioning session', activity };
  }
}

function deficitClass(baseTargets: NutritionTargets): DeficitClass {
  if (baseTargets.phaseMultiplier < -0.03 || baseTargets.weightCorrectionDeficit > 0) return 'steady_cut';
  if (baseTargets.phaseMultiplier > 0.03) return 'steady_bulk';
  return 'steady_maintain';
}

function fuelState(priority: FuelPriority, target: NutritionTarget): ResolvedNutritionTargets['fuelState'] {
  if (priority === 'cut_protect') return 'cut_protect';
  if (target.phase === 'taper' || target.phase === 'competition_week') return 'taper';
  if (priority === 'sparring' || priority === 'boxing_practice') return 'spar_support';
  if (priority === 'heavy_sc') return 'strength_power';
  if (priority === 'double_session') return 'double_day';
  if (priority === 'recovery') return 'active_recovery';
  return 'aerobic';
}

function recoveryFocus(target: NutritionTarget, priority: FuelPriority): RecoveryNutritionFocus {
  const focus = target.recoveryDirectives[0]?.focus;
  if (priority === 'sparring' || focus === 'impact_recovery' || focus === 'tissue_repair') return 'impact_recovery';
  if (focus === 'glycogen_restore') return 'glycogen_restore';
  if (focus === 'hydration_restore') return 'hydration_restore';
  return 'none';
}

function hydrationPlan(input: {
  target: NutritionTarget;
  cutProtocol: DailyCutProtocolRow | null;
  priority: FuelPriority;
  recoveryFocus: RecoveryNutritionFocus;
  hydrationBoostOz: number;
}): DailyHydrationPlan {
  const sodiumTargetValue = input.cutProtocol?.sodium_target_mg
    ?? targetValue(input.target.sodiumElectrolyteGuidance?.sodiumTargetRange ?? { target: null, min: null, max: null }, 0);
  const sodiumTarget = sodiumTargetValue || null;
  const notes = [
    ...(input.target.sodiumElectrolyteGuidance?.electrolyteNotes ?? []),
    input.cutProtocol?.sodium_instruction ? getSafeFightCampSodiumRestrictionDetail(input.cutProtocol.sodium_instruction) : null,
    input.priority === 'sparring' ? 'Start the first session hydrated so speed and decision-making stay protected.' : null,
    input.target.phase === 'competition_week' || input.target.phase === 'taper' ? 'Avoid new hydration products during competition week.' : null,
  ].filter((line): line is string => Boolean(line));

  return {
    dailyTargetOz: Math.max(
      input.cutProtocol?.water_target_oz ?? 0,
      targetValue(input.target.hydrationTarget ?? { target: 96, min: null, max: null }, 96),
    ),
    sodiumTargetMg: sodiumTarget,
    emphasis: input.cutProtocol
      ? 'cut'
      : input.recoveryFocus === 'hydration_restore'
        ? 'recovery'
        : input.priority === 'sparring' || input.priority === 'double_session' || input.priority === 'boxing_practice'
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

function legacyFuelingPlan(input: {
  priority: FuelPriority;
  priorityLabel: string;
  sessionLabel: string;
  directive: SessionFuelingDirective | null;
  activeCount: number;
  cutProtocol: DailyCutProtocolRow | null;
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
        lowResidue: Boolean(input.cutProtocol) || directive?.gutComfortConcern === 'moderate' || directive?.gutComfortConcern === 'high',
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
          lowResidue: Boolean(input.cutProtocol),
        }
      : null,
    postSession: post,
    hydrationNotes: directive?.duringSessionGuidance ?? [],
    coachingNotes: [
      'Nutrition and Fueling Engine generated session fueling guidance.',
      directive?.explanation?.summary ?? 'Session fueling came from the Nutrition and Fueling Engine.',
      input.cutProtocol ? 'Cut protocol cannot bypass fueling safety floors.' : null,
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
  baseTargets: NutritionTargets;
  target: NutritionTarget;
  cutProtocol: DailyCutProtocolRow | null;
  activities: DayActivity[];
  adjustedMacros?: { calories: number; protein: number; carbs: number; fat: number };
  floorResult?: ReturnType<typeof applyFuelingFloor>;
  reasonLines?: string[];
}): ResolvedNutritionTargets {
  const priority = getPrioritySession(input.activities, input.cutProtocol?.training_intensity_cap ?? null);
  const activeCount = activeActivities(input.activities).length;
  const firstDirective = input.target.sessionFuelingDirectives[0] ?? null;
  const recovery = recoveryFocus(input.target, priority.priority);
  const hydrationTargetOz = targetValue(input.target.hydrationTarget ?? { target: 96, min: null, max: null }, 96);
  const hydrationBoostOz = clamp(hydrationTargetOz - 80, 0, 72);
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
    source: input.cutProtocol
      ? floorResult?.fuelingFloorTriggered
        ? 'weight_cut_protocol_safety_adjusted'
        : 'weight_cut_protocol'
      : input.activities.length > 0
        ? 'daily_activity_adjusted'
        : 'base',
    fuelState: activeCount === 0 && !input.cutProtocol ? 'rest' : fuelState(priority.priority, input.target),
    prioritySession: priority.priority,
    deficitClass: deficitClass(input.baseTargets),
    recoveryNutritionFocus: recovery,
    sessionDemandScore: clamp(Math.round(estimateTrainingExpenditure(input.activities) / 5), activeCount > 0 ? 15 : 0, 95),
    hydrationBoostOz,
    hydrationPlan: hydrationPlan({
      target: input.target,
      cutProtocol: input.cutProtocol,
      priority: priority.priority,
      recoveryFocus: recovery,
      hydrationBoostOz,
    }),
    sessionFuelingPlan: legacyFuelingPlan({
      priority: priority.priority,
      priorityLabel: priority.label,
      sessionLabel: priority.sessionLabel,
      directive: firstDirective,
      activeCount,
      cutProtocol: input.cutProtocol,
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

export function calculateNutritionTargets(input: NutritionProfileInput): NutritionTargets {
  return nutritionTargetToLegacy(input);
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

export function resolveDailyNutritionTargets(
  baseTargets: NutritionTargets,
  cutProtocol: DailyCutProtocolRow | null,
  dayActivities: DayActivity[],
  options?: NutritionResolutionOptions,
): ResolvedNutritionTargets {
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

  if (!cutProtocol) {
    return resolveFromTarget({
      baseTargets,
      target,
      cutProtocol: null,
      activities: dayActivities,
    });
  }

  const cutCalories = calculateCaloriesFromMacros(
    cutProtocol.prescribed_protein,
    cutProtocol.prescribed_carbs,
    cutProtocol.prescribed_fat,
  );
  const activeCount = activeActivities(dayActivities).length;
  const bodyweightLbs = options?.bodyweightLbs ?? options?.macrocycleContext?.currentWeightLbs ?? profile.weightLbs;
  const leanMassKg = options?.leanMassKg ?? estimateLeanMassKg(bodyweightLbs);
  const metabolicReadiness = options?.readinessProfile?.metabolicReadiness ?? 100;
  const floorResult = applyFuelingFloor({
    targetCalories: cutCalories,
    estimatedExpenditure: estimateTrainingExpenditure(dayActivities),
    leanMassKg,
    isTrainingDay: activeCount > 0,
    daysToWeighIn: options?.daysToWeighIn ?? cutProtocol.days_to_weigh_in,
    minimumEnergyAvailability: activeCount > 0 && metabolicReadiness < 60 ? 23 : null,
    floorSource: activeCount > 0 && metabolicReadiness < 60 ? 'cut_readiness_floor' : 'fueling_floor',
  });
  const proteinTarget = Math.max(
    cutProtocol.prescribed_protein,
    targetValue(target.proteinTarget, baseTargets.protein),
  );
  const macros = distributeAroundProtein({
    calories: floorResult.adjustedCalories,
    protein: proteinTarget,
    carbBias: Math.max(cutProtocol.prescribed_carbs, targetValue(target.carbohydrateTarget.min != null ? target.carbohydrateTarget : target.carbohydrateTargetRange, cutProtocol.prescribed_carbs)),
    fatBias: cutProtocol.prescribed_fat,
    lockFat: floorResult.adjustedCalories === cutCalories,
  });
  const reasonLines = [
    'Active weight-cut protocol was checked by the Nutrition and Fueling Engine safety floor.',
    floorResult.fuelingFloorTriggered ? 'Cut target was raised because energy availability was too low for the available context.' : 'Cut target stayed inside the current fueling floor.',
    target.explanation?.summary ?? null,
  ].filter((line): line is string => Boolean(line));

  return resolveFromTarget({
    baseTargets,
    target,
    cutProtocol,
    activities: dayActivities,
    adjustedMacros: macros,
    floorResult,
    reasonLines,
  });
}

export function resolveDailyMacros(
  baseTargets: NutritionTargets,
  cutProtocol: DailyCutProtocolRow | null,
  dayActivities: DayActivity[],
) {
  const resolved = resolveDailyNutritionTargets(baseTargets, cutProtocol, dayActivities);

  return {
    calories: resolved.adjustedCalories,
    protein: resolved.protein,
    carbs: resolved.carbs,
    fat: resolved.fat,
    source: resolved.source,
    message: resolved.message,
  };
}
