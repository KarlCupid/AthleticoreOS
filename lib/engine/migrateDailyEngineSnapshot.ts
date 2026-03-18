import type {
  DailyEngineSnapshotRow,
  DailyMission,
  ResolvedNutritionTargets,
  WorkoutPrescriptionV2,
} from './types';

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
    sessionDemandScore: coerceNumber(source.sessionDemandScore, 0),
    hydrationBoostOz: coerceNumber(source.hydrationBoostOz, 0),
    reasonLines,
    energyAvailability: typeof source.energyAvailability === 'number' ? source.energyAvailability : null,
    fuelingFloorTriggered: Boolean(source.fuelingFloorTriggered),
    deficitBankDelta: coerceNumber(source.deficitBankDelta, 0),
    safetyWarning: (source.safetyWarning as ResolvedNutritionTargets['safetyWarning']) ?? 'none',
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

  return {
    ...source,
    engineVersion: 'daily-engine-v3',
    fuelDirective: {
      ...fuelDirective,
      energyAvailability: typeof fuelDirective.energyAvailability === 'number'
        ? fuelDirective.energyAvailability
        : migratedNutrition.energyAvailability,
      fuelingFloorTriggered: Boolean(fuelDirective.fuelingFloorTriggered ?? migratedNutrition.fuelingFloorTriggered),
      safetyWarning: (fuelDirective.safetyWarning as DailyMission['fuelDirective']['safetyWarning']) ?? migratedNutrition.safetyWarning,
      reasons: asStringArray(fuelDirective.reasons),
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
