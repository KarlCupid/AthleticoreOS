import type {
  ConfidenceValue,
  DataAvailability,
  ISODateString,
  ISODateTimeString,
  MeasurementRange,
  SourceReference,
  UnknownField,
} from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';
import type { Explanation } from './explanation.ts';
import type { RiskFlag } from './risk.ts';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'intra_workout' | 'other';
export type FoodEntrySource = 'ingredient' | 'packaged' | 'custom' | 'barcode' | 'imported' | 'unknown';
export type NutritionTargetPurpose = 'maintenance' | 'performance' | 'recovery' | 'gradual_body_mass_change' | 'fight_week_support';

export interface NutritionDataQuality {
  availability: DataAvailability;
  confidence: ConfidenceValue;
  missingFields: UnknownField[];
  estimatedFields: string[];
  source: SourceReference | null;
}

export interface NutritionTarget {
  id: string;
  date: ISODateString | null;
  purpose: NutritionTargetPurpose;
  calories: MeasurementRange<'kcal'>;
  proteinGrams: MeasurementRange<'g'>;
  carbGrams: MeasurementRange<'g'>;
  fatGrams: MeasurementRange<'g'>;
  fluidOunces: MeasurementRange<'oz'>;
  sodiumMg: MeasurementRange<'mg'>;
  safetyFlags: RiskFlag[];
  dataQuality: NutritionDataQuality;
  explanation: Explanation | null;
}

export interface SessionFuelingWindow {
  timing: 'pre' | 'intra' | 'post' | 'between_sessions';
  carbGrams: MeasurementRange<'g'>;
  proteinGrams: MeasurementRange<'g'>;
  fluidOunces: MeasurementRange<'oz'>;
  sodiumMg: MeasurementRange<'mg'>;
  notes: string[];
}

export interface SessionFuelingDirective {
  id: string;
  sessionId: string | null;
  priority: 'unknown' | 'low' | 'medium' | 'high';
  windows: SessionFuelingWindow[];
  dataQuality: NutritionDataQuality;
  riskFlags: RiskFlag[];
  explanation: Explanation | null;
}

export interface FoodEntry {
  id: string;
  athleteId: string;
  loggedAt: ISODateTimeString | null;
  date: ISODateString | null;
  mealType: MealType;
  name: string;
  source: FoodEntrySource;
  amount: MeasurementRange<'g' | 'oz' | 'count'>;
  calories: MeasurementRange<'kcal'>;
  proteinGrams: MeasurementRange<'g'>;
  carbGrams: MeasurementRange<'g'>;
  fatGrams: MeasurementRange<'g'>;
  dataQuality: NutritionDataQuality;
  sourceReference: SourceReference | null;
}

export function createUnknownNutritionDataQuality(missingFields: UnknownField[] = []): NutritionDataQuality {
  return {
    availability: missingFields.length > 0 ? 'partial' : 'unknown',
    confidence: UNKNOWN_CONFIDENCE,
    missingFields,
    estimatedFields: [],
    source: null,
  };
}
