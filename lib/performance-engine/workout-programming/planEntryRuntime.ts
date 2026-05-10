import type { WeeklyPlanEntryRow } from '../../engine/types';
import {
  classifyGuidedSessionType,
  hasGuidedEnginePrescription,
  isGuidedEngineActivityType,
} from '../../engine/sessionOwnership';
import {
  getBoxingSnapshotFromWeeklyPlanEntry,
  type BoxingGeneratedPlanEntrySnapshot,
} from './generatedProgramWeeklyPlanAdapter.ts';

export type PlanEntryRuntimeSurface =
  | 'athleticore_support_session'
  | 'protected_boxing_anchor'
  | 'legacy_guided_workout'
  | 'archived_compatibility'
  | 'unknown';

export function hasBoxingGeneratedSnapshot(
  entry: Pick<WeeklyPlanEntryRow, 'prescription_snapshot'> | null | undefined,
): entry is Pick<WeeklyPlanEntryRow, 'prescription_snapshot'> & {
  prescription_snapshot: BoxingGeneratedPlanEntrySnapshot;
} {
  return Boolean(getBoxingSnapshotFromWeeklyPlanEntry(entry));
}

export function isActiveAthleticoreSupportPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  return Boolean(entry && entry.status === 'planned' && snapshot && snapshot.protectedAnchor === false);
}

export function isProtectedAthleticoreAnchorEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  return Boolean(entry && entry.status === 'planned' && snapshot?.protectedAnchor === true);
}

export const isProtectedBoxingAnchorPlanEntry = isProtectedAthleticoreAnchorEntry;

export function isLegacyGuidedWorkoutPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  if (!entry || hasBoxingGeneratedSnapshot(entry)) return false;
  return (
    (entry.status === 'planned' || entry.status === 'rescheduled')
    && isGuidedEngineActivityType(classifyGuidedSessionType({
      sessionType: entry.session_type,
      focus: entry.focus,
      prescription: entry.prescription_snapshot,
    }))
    && hasGuidedEnginePrescription(entry)
  );
}

export function isActiveTrainingPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  return Boolean(
    entry
    && (
      isActiveAthleticoreSupportPlanEntry(entry)
      || isProtectedAthleticoreAnchorEntry(entry)
      || isLegacyGuidedWorkoutPlanEntry(entry)
    ),
  );
}

export function planEntryActiveTrainingRank(entry: WeeklyPlanEntryRow): number | null {
  if (isActiveAthleticoreSupportPlanEntry(entry)) return 0;
  if (isProtectedAthleticoreAnchorEntry(entry)) return 1;
  if (isLegacyGuidedWorkoutPlanEntry(entry)) return 2;
  if (entry.status === 'completed' || entry.status === 'skipped') return 3;
  return null;
}

export function classifyPlanEntryRuntimeSurface(entry: WeeklyPlanEntryRow | null | undefined): PlanEntryRuntimeSurface {
  if (!entry) return 'unknown';

  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (snapshot?.protectedAnchor) return 'protected_boxing_anchor';
  if (snapshot) return 'athleticore_support_session';
  if (isLegacyGuidedWorkoutPlanEntry(entry)) return 'legacy_guided_workout';
  if (entry.prescription_snapshot || entry.status === 'completed' || entry.status === 'skipped') {
    return 'archived_compatibility';
  }
  return 'unknown';
}
