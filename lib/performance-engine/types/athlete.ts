import type { BodyMassUnit } from '../utils/bodyMassUnits.ts';
import { normalizeTimeZone, type TimeZoneId } from '../utils/timezones.ts';
import type { ConfidenceValue, ISODateString, ISODateTimeString, UnknownField } from './shared.ts';
import { UNKNOWN_CONFIDENCE } from './shared.ts';

export type AthleteSport = 'boxing' | 'mma' | 'general_combat' | 'unknown';
export type CompetitionLevel = 'recreational' | 'amateur' | 'professional' | 'unknown';
export type BiologicalSex = 'male' | 'female' | 'intersex' | 'unknown';
export type TrainingBackground = 'none' | 'recreational' | 'competitive' | 'professional' | 'unknown';

export interface AthleteProfile {
  athleteId: string;
  userId: string;
  displayName: string | null;
  sport: AthleteSport;
  competitionLevel: CompetitionLevel;
  biologicalSex: BiologicalSex;
  birthDate: ISODateString | null;
  timeZone: TimeZoneId;
  preferredBodyMassUnit: BodyMassUnit;
  trainingBackground: TrainingBackground;
  onboardingCompletedAt: ISODateTimeString | null;
  missingFields: UnknownField[];
  confidence: ConfidenceValue;
}

export function createAthleteProfile(input: {
  athleteId: string;
  userId: string;
  displayName?: string | null;
  sport?: AthleteSport | null;
  competitionLevel?: CompetitionLevel | null;
  biologicalSex?: BiologicalSex | null;
  birthDate?: ISODateString | null;
  timeZone?: string | null;
  preferredBodyMassUnit?: BodyMassUnit | null;
  trainingBackground?: TrainingBackground | null;
  onboardingCompletedAt?: ISODateTimeString | null;
  missingFields?: UnknownField[];
  confidence?: ConfidenceValue;
}): AthleteProfile {
  return {
    athleteId: input.athleteId,
    userId: input.userId,
    displayName: input.displayName ?? null,
    sport: input.sport ?? 'unknown',
    competitionLevel: input.competitionLevel ?? 'unknown',
    biologicalSex: input.biologicalSex ?? 'unknown',
    birthDate: input.birthDate ?? null,
    timeZone: normalizeTimeZone(input.timeZone),
    preferredBodyMassUnit: input.preferredBodyMassUnit ?? 'lb',
    trainingBackground: input.trainingBackground ?? 'unknown',
    onboardingCompletedAt: input.onboardingCompletedAt ?? null,
    missingFields: input.missingFields ?? [],
    confidence: input.confidence ?? UNKNOWN_CONFIDENCE,
  };
}
