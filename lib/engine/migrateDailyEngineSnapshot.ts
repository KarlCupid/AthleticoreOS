import type {
  DailyEngineSnapshotRow,
  DailyMission,
  ResolvedNutritionTargets,
  WorkoutPrescriptionV2,
} from './types.ts';

type MaybeObject = Record<string, unknown> | null | undefined;

function asObject(value: unknown): MaybeObject {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function getFallbackHydrationPlan() {
  return {
    dailyTargetOz: 96,
    sodiumTargetMg: null,
    emphasis: 'baseline' as const,
    notes: [],
  };
}

function getFallbackSessionFuelingPlan() {
  return {
    priority: 'recovery' as const,
    priorityLabel: 'Recovery day',
    sessionLabel: 'Recovery day',
    preSession: {
      label: 'Before training',
      timing: 'No timed pre-session fueling needed',
      carbsG: 0,
      proteinG: 0,
      notes: [],
    },
    intraSession: {
      fluidsOz: 0,
      electrolytesMg: null,
      carbsG: 0,
      notes: [],
    },
    betweenSessions: null,
    postSession: {
      label: 'After training',
      timing: 'Use normal meals',
      carbsG: 0,
      proteinG: 25,
      notes: [],
    },
    hydrationNotes: [],
    coachingNotes: [],
  };
}

function migrateNutritionTargets(raw: unknown): ResolvedNutritionTargets {
  const source = asObject(raw) ?? {};
  const reasonLines = asStringArray(source.reasonLines);
  const traceLines = asStringArray(source.traceLines);

  return {
    tdee: coerceNumber(source.tdee, 0),
    adjustedCalories: coerceNumber(source.adjustedCalories, 0),
    protein: coerceNumber(source.protein, 0),
    carbs: coerceNumber(source.carbs, 0),
    fat: coerceNumber(source.fat, 0),
    proteinModifier: coerceNumber(source.proteinModifier, 1),
    phaseMultiplier: coerceNumber(source.phaseMultiplier, 0),
    weightCorrectionDeficit: coerceNumber(source.weightCorrectionDeficit, 0),
    message: typeof source.message === 'string' ? source.message : '',
    source: (source.source as ResolvedNutritionTargets['source']) ?? 'base',
    fuelState: (source.fuelState as ResolvedNutritionTargets['fuelState']) ?? 'rest',
    prioritySession: (source.prioritySession as ResolvedNutritionTargets['prioritySession']) ?? 'recovery',
    deficitClass: (source.deficitClass as ResolvedNutritionTargets['deficitClass']) ?? 'steady_maintain',
    recoveryNutritionFocus: (source.recoveryNutritionFocus as ResolvedNutritionTargets['recoveryNutritionFocus']) ?? 'none',
    sessionDemandScore: coerceNumber(source.sessionDemandScore, 0),
    hydrationBoostOz: coerceNumber(source.hydrationBoostOz, 0),
    hydrationPlan: (asObject(source.hydrationPlan) as unknown as ResolvedNutritionTargets['hydrationPlan']) ?? getFallbackHydrationPlan(),
    sessionFuelingPlan: (asObject(source.sessionFuelingPlan) as unknown as ResolvedNutritionTargets['sessionFuelingPlan']) ?? getFallbackSessionFuelingPlan(),
    reasonLines,
    energyAvailability: typeof source.energyAvailability === 'number' ? source.energyAvailability : null,
    fuelingFloorTriggered: Boolean(source.fuelingFloorTriggered),
    deficitBankDelta: coerceNumber(source.deficitBankDelta, 0),
    safetyWarning: (source.safetyWarning as ResolvedNutritionTargets['safetyWarning']) ?? 'none',
    safetyEvents: Array.isArray(source.safetyEvents) ? source.safetyEvents as ResolvedNutritionTargets['safetyEvents'] : [],
    traceLines: traceLines.length > 0 ? traceLines : reasonLines,
  };
}

function migrateWorkoutPrescription(raw: unknown): WorkoutPrescriptionV2 | null {
  const source = asObject(raw);
  if (!source) return null;

  return {
    ...source,
    payloadVersion: (source.payloadVersion as WorkoutPrescriptionV2['payloadVersion']) ?? 'v3',
    expectedActivationRPE: typeof source.expectedActivationRPE === 'number' ? source.expectedActivationRPE : null,
    activationGuidance: typeof source.activationGuidance === 'string' ? source.activationGuidance : null,
    interferenceWarnings: asStringArray(source.interferenceWarnings),
  } as WorkoutPrescriptionV2;
}

function migrateMission(raw: unknown, migratedNutrition: ResolvedNutritionTargets): DailyMission {
  const source = asObject(raw) ?? {};
  const fuelDirective = asObject(source.fuelDirective) ?? {};
  const riskState = asObject(source.riskState) ?? {};
  const trainingDirective = asObject(source.trainingDirective) ?? {};

  return {
    ...source,
    engineVersion: 'daily-engine-v3',
    readinessProfile: asObject(source.readinessProfile) as DailyMission['readinessProfile'],
    trainingDirective: {
      ...trainingDirective,
      constraintSet: asObject(trainingDirective.constraintSet) as DailyMission['trainingDirective']['constraintSet'],
      medStatus: asObject(trainingDirective.medStatus) as DailyMission['trainingDirective']['medStatus'],
    },
    fuelDirective: {
      ...fuelDirective,
      prioritySession: (fuelDirective.prioritySession as DailyMission['fuelDirective']['prioritySession']) ?? migratedNutrition.prioritySession,
      deficitClass: (fuelDirective.deficitClass as DailyMission['fuelDirective']['deficitClass']) ?? migratedNutrition.deficitClass,
      recoveryNutritionFocus: (fuelDirective.recoveryNutritionFocus as DailyMission['fuelDirective']['recoveryNutritionFocus']) ?? migratedNutrition.recoveryNutritionFocus,
      sessionFuelingPlan: (asObject(fuelDirective.sessionFuelingPlan) as unknown as DailyMission['fuelDirective']['sessionFuelingPlan']) ?? migratedNutrition.sessionFuelingPlan,
      energyAvailability: typeof fuelDirective.energyAvailability === 'number'
        ? fuelDirective.energyAvailability
        : migratedNutrition.energyAvailability,
      fuelingFloorTriggered: Boolean(fuelDirective.fuelingFloorTriggered ?? migratedNutrition.fuelingFloorTriggered),
      safetyWarning: (fuelDirective.safetyWarning as DailyMission['fuelDirective']['safetyWarning']) ?? migratedNutrition.safetyWarning,
      reasons: asStringArray(fuelDirective.reasons),
    },
    riskState: {
      ...riskState,
      campRiskLevel: (riskState.campRiskLevel as DailyMission['riskState']['campRiskLevel']) ?? null,
      campRiskSource: (riskState.campRiskSource as DailyMission['riskState']['campRiskSource']) ?? null,
      flags: Array.isArray(riskState.flags) ? riskState.flags : [],
      anchorSummary: typeof riskState.anchorSummary === 'string' ? riskState.anchorSummary : null,
    },
  } as DailyMission;
}

export function migrateDailyEngineSnapshot(snapshot: DailyEngineSnapshotRow): DailyEngineSnapshotRow {
  const migratedNutrition = migrateNutritionTargets(snapshot.nutrition_targets_snapshot);
  const migratedMission = migrateMission(snapshot.mission_snapshot, migratedNutrition);
  const migratedWorkout = migrateWorkoutPrescription(snapshot.workout_prescription_snapshot);

  return {
    ...snapshot,
    engine_version: 'daily-engine-v3',
    nutrition_targets_snapshot: migratedNutrition,
    workout_prescription_snapshot: migratedWorkout,
    mission_snapshot: migratedMission,
  };
}
