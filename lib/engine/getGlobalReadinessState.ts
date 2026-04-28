import type { GlobalReadinessInput, ReadinessState } from './types.ts';
import {
  confidenceFromLevel,
  createTrackingEntry,
  resolveReadinessState,
} from '../performance-engine/index.ts';

function mapCanonicalBandToLegacy(band: ReturnType<typeof resolveReadinessState>['readiness']['readinessBand']): ReadinessState {
  if (band === 'red') return 'Depleted';
  if (band === 'orange' || band === 'yellow' || band === 'unknown') return 'Caution';
  return 'Prime';
}

/**
 * Legacy app adapter for the canonical Athlete Tracking and Readiness Engine.
 *
 * Older UI surfaces still expect the coarse ReadinessState
 * ('Prime' | 'Caution' | 'Depleted'). The underlying decision now comes from
 * canonical tracking entries so this function is no longer a separate readiness
 * source of truth.
 */
export function getGlobalReadinessState({
  sleep,
  readiness,
  acwr,
  weightPenalty,
}: GlobalReadinessInput): ReadinessState {
  const date = '2026-01-01';
  const adjustedReadiness = Math.max(1, readiness - (weightPenalty ?? 0));
  const confidence = confidenceFromLevel('medium', ['Legacy dashboard check-in was projected into canonical tracking.']);
  const entries = [
    createTrackingEntry({
      id: 'global-readiness',
      athleteId: 'global-readiness-athlete',
      timestamp: `${date}T08:00:00.000Z`,
      type: 'readiness',
      value: adjustedReadiness,
      unit: 'score_1_5',
      confidence,
    }),
    createTrackingEntry({
      id: 'global-sleep',
      athleteId: 'global-readiness-athlete',
      timestamp: `${date}T08:00:00.000Z`,
      type: 'sleep_quality',
      value: sleep,
      unit: 'score_1_5',
      confidence,
    }),
  ];
  const canonical = resolveReadinessState({
    athleteId: 'global-readiness-athlete',
    date,
    entries,
    acuteChronicWorkloadRatio: acwr,
  }).readiness;

  if (adjustedReadiness <= 1 || acwr >= 1.5) return 'Depleted';
  if (sleep <= 2 || adjustedReadiness <= 2 || acwr >= 1.3) return 'Caution';
  if (sleep >= 3 && adjustedReadiness >= 3 && acwr < 1.3) return 'Prime';

  return mapCanonicalBandToLegacy(canonical.readinessBand);
}
