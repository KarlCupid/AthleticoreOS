import type { WeeklyPlanEntryRow } from '../../engine/types';
import { isActiveGuidedEnginePlanEntry } from '../../engine/sessionOwnership';
import {
  getBoxingSnapshotFromWeeklyPlanEntry,
  type BoxingGeneratedPlanEntrySnapshot,
} from './generatedProgramWeeklyPlanAdapter.ts';

export type PlanEntryRuntimeSurface =
  | 'athleticore_support_detail'
  | 'protected_anchor_detail'
  | 'legacy_guided_workout'
  | 'archived_detail'
  | 'none';

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

export function isProtectedBoxingAnchorPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  return Boolean(entry && entry.status === 'planned' && snapshot?.protectedAnchor === true);
}

export function isLegacyGuidedWorkoutPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  if (!entry || hasBoxingGeneratedSnapshot(entry)) return false;
  return isActiveGuidedEnginePlanEntry(entry);
}

export function isActiveTrainingPlanEntry(entry: WeeklyPlanEntryRow | null | undefined): boolean {
  return Boolean(
    entry
    && (
      isActiveAthleticoreSupportPlanEntry(entry)
      || isProtectedBoxingAnchorPlanEntry(entry)
      || isLegacyGuidedWorkoutPlanEntry(entry)
    ),
  );
}

export function planEntryActiveTrainingRank(entry: WeeklyPlanEntryRow): number | null {
  if (isActiveAthleticoreSupportPlanEntry(entry)) return 0;
  if (isProtectedBoxingAnchorPlanEntry(entry)) return 1;
  if (isLegacyGuidedWorkoutPlanEntry(entry)) return 2;
  if (entry.status === 'completed' || entry.status === 'skipped') return 3;
  return null;
}

export function classifyPlanEntryRuntimeSurface(entry: WeeklyPlanEntryRow | null | undefined): PlanEntryRuntimeSurface {
  if (!entry) return 'none';

  const snapshot = getBoxingSnapshotFromWeeklyPlanEntry(entry);
  if (snapshot?.protectedAnchor) return 'protected_anchor_detail';
  if (snapshot) return 'athleticore_support_detail';
  if (isLegacyGuidedWorkoutPlanEntry(entry)) return 'legacy_guided_workout';
  return 'archived_detail';
}
