import type { ReadinessProfile } from '../../engine/index.ts';
import {
  confidenceFromLevel,
  createTrackingEntry,
} from '../../performance-engine/index.ts';

export interface DailyReadinessCheckinRow {
  date: string;
  sleep_quality?: number | null;
  readiness?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  soreness_level?: number | null;
  pain_level?: number | null;
  confidence_level?: number | null;
}

export function buildUnifiedTrackingEntries(input: {
  userId: string;
  date: string;
  readinessProfile: ReadinessProfile;
  currentWeightLbs: number | null;
  todayCheckin?: DailyReadinessCheckinRow | null | undefined;
}) {
  const checkinConfidence = confidenceFromLevel('medium', [
    'Daily check-in was entered by the athlete and projected into canonical tracking state.',
  ]);
  const entries: ReturnType<typeof createTrackingEntry>[] = [];
  const todayCheckin = input.todayCheckin;

  if (todayCheckin) {
    const makeCheckinEntry = (
      suffix: string,
      type: Parameters<typeof createTrackingEntry>[0]['type'],
      value: number | boolean | string | null | undefined,
      unit: string | null = 'score_1_5',
    ) => {
      if (value == null) return;
      entries.push(createTrackingEntry({
        id: `${input.userId}:${input.date}:${suffix}`,
        athleteId: input.userId,
        timestamp: `${input.date}T08:00:00.000Z`,
        timezone: 'UTC',
        type,
        source: 'user_reported',
        value,
        unit,
        confidence: checkinConfidence,
        context: { source: 'daily_checkin' },
      }));
    };

    makeCheckinEntry('readiness-checkin', 'readiness', todayCheckin.readiness ?? todayCheckin.energy_level);
    makeCheckinEntry('sleep-quality', 'sleep_quality', todayCheckin.sleep_quality);
    makeCheckinEntry('stress', 'stress', todayCheckin.stress_level);
    makeCheckinEntry('soreness', 'soreness', todayCheckin.soreness_level);
    makeCheckinEntry(
      'fatigue',
      'fatigue',
      todayCheckin.energy_level == null ? null : Math.max(1, Math.min(5, 6 - todayCheckin.energy_level)),
    );
    makeCheckinEntry('pain', 'pain', todayCheckin.pain_level);
    makeCheckinEntry('training-confidence', 'mood', todayCheckin.confidence_level);
  } else {
    entries.push(createTrackingEntry({
      id: `${input.userId}:${input.date}:legacy-readiness-profile`,
      athleteId: input.userId,
      timestamp: `${input.date}T08:00:00.000Z`,
      timezone: 'UTC',
      type: 'readiness',
      source: 'system_inferred',
      value: input.readinessProfile.overallReadiness,
      unit: 'percent',
      confidence: confidenceFromLevel(input.readinessProfile.dataConfidence, [
        'Daily readiness profile was projected into canonical tracking state during performance engine integration.',
      ]),
      context: {
        sourceReadinessState: input.readinessProfile.readinessState,
        flags: input.readinessProfile.flags,
      },
    }));
  }

  if (input.currentWeightLbs != null) {
    entries.push(createTrackingEntry({
      id: `${input.userId}:${input.date}:body-mass`,
      athleteId: input.userId,
      timestamp: `${input.date}T07:00:00.000Z`,
      timezone: 'UTC',
      type: 'body_mass',
      source: 'system_inferred',
      value: input.currentWeightLbs,
      unit: 'lb',
      confidence: confidenceFromLevel('medium', [
        'Body mass came from current athlete context and remains source-qualified.',
      ]),
    }));
  }

  return entries;
}
