import type {
  ConfidenceValue,
  DataAvailability,
  ISODateString,
  ISODateTimeString,
  MeasurementRange,
  SourceReference,
  UnknownField,
} from './shared.ts';
import { LOW_CONFIDENCE, UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { AthleticorePhase } from './phase.ts';
import type { RiskFlag } from './risk.ts';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'intra_workout' | 'other';
export type FoodEntrySource = 'ingredient' | 'packaged' | 'custom' | 'barcode' | 'imported' | 'recipe' | 'unknown';
export type NutritionTargetPurpose =
  | 'maintenance'
  | 'performance'
  | 'recovery'
  | 'body_composition_support'
  | 'weight_class_management_support'
  | 'fight_week_support';
export type NutritionDataSourceType =
  | 'usda'
  | 'fdc'
  | 'open_food_facts'
  | 'barcode'
  | 'custom'
  | 'recipe'
  | 'manual'
  | 'imported'
  | 'unknown';
export type SessionFuelingDemand = 'unknown' | 'low' | 'moderate' | 'high';
export type GutComfortConcern = 'unknown' | 'low' | 'moderate' | 'high';
export type PrimaryNutritionAdaptation =
  | 'strength'
  | 'power'
  | 'conditioning'
  | 'boxing_skill'
  | 'sparring'
  | 'competition'
  | 'recovery'
  | 'mixed'
  | 'unknown';

export interface NutritionDataQuality {
  sourceType: NutritionDataSourceType;
  verified: boolean;
  servingConfidence: ConfidenceValue;
  nutrientCompleteness: ConfidenceValue;
  portionConfidence: ConfidenceValue;
  userEstimate: boolean;
  lastUpdated: ISODateTimeString | null;
  warnings: string[];
  availability: DataAvailability;
  confidence: ConfidenceValue;
  missingFields: UnknownField[];
  estimatedFields: string[];
  source: SourceReference | null;
}

export interface FoodNutrients {
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  vitaminDMcg: number | null;
  magnesiumMg: number | null;
}

export interface RecoveryNutritionDirective {
  focus: 'glycogen_restore' | 'impact_recovery' | 'hydration_restore' | 'tissue_repair' | 'none';
  proteinTiming: string | null;
  carbohydrateTiming: string | null;
  hydrationTiming: string | null;
  notes: string[];
  confidence: ConfidenceValue;
  explanation: Explanation | null;
}

export interface SodiumElectrolyteGuidance {
  sodiumTargetRange: MeasurementRange<'mg'> | null;
  electrolyteNotes: string[];
  confidence: ConfidenceValue;
}

export interface SessionFuelingDirective {
  id: string;
  sessionId: string | null;
  date: ISODateString | null;
  sessionType: string;
  intensity: MeasurementRange<'rpe'>;
  durationMinutes: MeasurementRange<'minute'>;
  primaryAdaptation: PrimaryNutritionAdaptation;
  carbohydrateDemand: MeasurementRange<'g'>;
  proteinRecoveryDemand: MeasurementRange<'g'>;
  hydrationDemand: MeasurementRange<'oz'>;
  gutComfortConcern: GutComfortConcern;
  preSessionGuidance: string[];
  duringSessionGuidance: string[];
  postSessionGuidance: string[];
  confidence: ConfidenceValue;
  explanation: Explanation | null;

  // Compatibility fields for legacy UI view models during migration.
  priority?: 'unknown' | 'low' | 'medium' | 'high';
  windows?: Array<{
    timing: 'pre' | 'intra' | 'post' | 'between_sessions';
    carbGrams: MeasurementRange<'g'>;
    proteinGrams: MeasurementRange<'g'>;
    fluidOunces: MeasurementRange<'oz'>;
    sodiumMg: MeasurementRange<'mg'>;
    notes: string[];
  }>;
  dataQuality?: NutritionDataQuality;
  riskFlags?: RiskFlag[];
}

export interface NutritionTarget {
  id: string;
  date: ISODateString | null;
  phase: AthleticorePhase;
  purpose: NutritionTargetPurpose;
  energyTarget: MeasurementRange<'kcal'>;
  energyTargetRange: MeasurementRange<'kcal'>;
  proteinTarget: MeasurementRange<'g'>;
  proteinTargetRange: MeasurementRange<'g'>;
  carbohydrateTarget: MeasurementRange<'g'>;
  carbohydrateTargetRange: MeasurementRange<'g'>;
  fatTarget: MeasurementRange<'g'>;
  fatTargetRange: MeasurementRange<'g'>;
  fiberTargetRange: MeasurementRange<'g'>;
  hydrationTarget: MeasurementRange<'oz'> | null;
  sodiumElectrolyteGuidance: SodiumElectrolyteGuidance | null;
  micronutrientFocus: string[];
  sessionFuelingDirectives: SessionFuelingDirective[];
  recoveryDirectives: RecoveryNutritionDirective[];
  bodyMassGoalContext: string | null;
  confidence: ConfidenceValue;
  explanation: Explanation | null;
  riskFlags: RiskFlag[];
  dataQuality: NutritionDataQuality;

  // Compatibility aliases for older callers while canonical ownership is migrated.
  calories?: MeasurementRange<'kcal'>;
  proteinGrams?: MeasurementRange<'g'>;
  carbGrams?: MeasurementRange<'g'>;
  fatGrams?: MeasurementRange<'g'>;
  fluidOunces?: MeasurementRange<'oz'>;
  sodiumMg?: MeasurementRange<'mg'>;
  safetyFlags?: RiskFlag[];
}

export interface FoodEntry {
  id: string;
  athleteId: string;
  timestamp: ISODateTimeString | null;
  mealType: MealType;
  foodName: string;
  quantity: number | null;
  unit: string | null;
  gramsNormalized: number | null;
  source: FoodEntrySource;
  sourceId: string | null;
  barcode: string | null;
  brand: string | null;
  servingSize: string | null;
  nutrients: FoodNutrients;
  dataQuality: NutritionDataQuality;
  confidence: ConfidenceValue;
  isVerified: boolean;
  isUserEstimated: boolean;
  isRecipe: boolean;
  isCustomFood: boolean;
  missingNutrients: string[];
  notes: string | null;

  // Legacy aliases for screens still reading the old food entry shape.
  loggedAt?: ISODateTimeString | null;
  date?: ISODateString | null;
  name?: string;
  amount?: MeasurementRange<'g' | 'oz' | 'count'>;
  calories?: MeasurementRange<'kcal'>;
  proteinGrams?: MeasurementRange<'g'>;
  carbGrams?: MeasurementRange<'g'>;
  fatGrams?: MeasurementRange<'g'>;
  sourceReference?: SourceReference | null;
}

function combineConfidence(input: {
  verified: boolean;
  sourceType: NutritionDataSourceType;
  servingConfidence?: ConfidenceValue | undefined;
  nutrientCompleteness?: ConfidenceValue | undefined;
  portionConfidence?: ConfidenceValue | undefined;
  userEstimate?: boolean | undefined;
  missingFields?: UnknownField[] | undefined;
}): ConfidenceValue {
  const servingScore = input.servingConfidence?.score ?? (input.verified ? 0.75 : input.userEstimate ? 0.25 : 0.55);
  const nutrientScore = input.nutrientCompleteness?.score ?? (input.verified ? 0.85 : 0.35);
  const portionScore = input.portionConfidence?.score ?? (input.verified ? 0.7 : input.userEstimate ? 0.25 : 0.55);
  const sourceBonus = input.verified && input.sourceType !== 'manual' && input.sourceType !== 'custom' ? 0.1 : 0;
  const missingPenalty = Math.min(0.25, (input.missingFields?.length ?? 0) * 0.04);
  const score = Math.max(0, Math.min(1, ((servingScore + nutrientScore + portionScore) / 3) + sourceBonus - missingPenalty));
  const level = score >= 0.75 ? 'high' : score >= 0.45 ? 'medium' : score > 0 ? 'low' : 'unknown';

  return {
    level,
    score: level === 'unknown' ? null : score,
    reasons: [
      input.verified ? 'Food data is source-traceable or verified.' : 'Food data is not verified.',
      input.userEstimate ? 'Portion or nutrient data includes a user estimate.' : 'Portion data is not marked as a user estimate.',
      input.missingFields?.length ? 'Some nutrient fields are missing and remain unknown.' : 'Core nutrient fields are present.',
    ],
  };
}

export function createNutritionDataQuality(input: {
  sourceType?: NutritionDataSourceType | undefined;
  verified?: boolean | undefined;
  servingConfidence?: ConfidenceValue | undefined;
  nutrientCompleteness?: ConfidenceValue | undefined;
  portionConfidence?: ConfidenceValue | undefined;
  userEstimate?: boolean | undefined;
  lastUpdated?: ISODateTimeString | null | undefined;
  warnings?: string[] | undefined;
  missingFields?: UnknownField[] | undefined;
  estimatedFields?: string[] | undefined;
  source?: SourceReference | null | undefined;
} = {}): NutritionDataQuality {
  const missingFields = input.missingFields ?? [];
  const sourceType = input.sourceType ?? 'unknown';
  const verified = input.verified ?? false;
  const userEstimate = input.userEstimate ?? sourceType === 'manual';
  const confidence = combineConfidence({
    verified,
    sourceType,
    servingConfidence: input.servingConfidence,
    nutrientCompleteness: input.nutrientCompleteness,
    portionConfidence: input.portionConfidence,
    userEstimate,
    missingFields,
  });

  return {
    sourceType,
    verified,
    servingConfidence: input.servingConfidence ?? (userEstimate ? LOW_CONFIDENCE : confidence),
    nutrientCompleteness: input.nutrientCompleteness ?? confidence,
    portionConfidence: input.portionConfidence ?? (userEstimate ? LOW_CONFIDENCE : confidence),
    userEstimate,
    lastUpdated: input.lastUpdated ?? null,
    warnings: input.warnings ?? [],
    availability: missingFields.length > 0 ? 'partial' : sourceType === 'unknown' ? 'unknown' : 'known',
    confidence,
    missingFields,
    estimatedFields: input.estimatedFields ?? [],
    source: input.source ?? null,
  };
}

export function createUnknownNutritionDataQuality(missingFields: UnknownField[] = []): NutritionDataQuality {
  return createNutritionDataQuality({
    sourceType: 'unknown',
    verified: false,
    userEstimate: true,
    servingConfidence: UNKNOWN_CONFIDENCE,
    nutrientCompleteness: UNKNOWN_CONFIDENCE,
    portionConfidence: UNKNOWN_CONFIDENCE,
    missingFields,
    warnings: ['Nutrition data is missing; values should be treated as unknown, not zero.'],
    source: null,
  });
}
