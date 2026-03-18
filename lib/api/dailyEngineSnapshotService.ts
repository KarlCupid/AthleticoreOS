import { supabase } from '../supabase';
import type {
  DailyEngineSnapshotRow,
  DailyMission,
  MacrocycleContext,
  ResolvedNutritionTargets,
  WorkoutPrescriptionV2,
} from '../engine/types';
import { migrateDailyEngineSnapshot } from '../engine/migrateDailyEngineSnapshot';

let hasDailyEngineSnapshotsTable: boolean | null = null;

function isMissingDailyEngineSnapshotsTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { code?: string; message?: string };
  const message = typeof maybe.message === 'string' ? maybe.message : '';

  return (
    maybe.code === 'PGRST205'
    || maybe.code === '42P01'
    || (message.includes('daily_engine_snapshots') && message.includes('could not find'))
    || (message.includes('relation') && message.includes('daily_engine_snapshots'))
  );
}

function toSnapshotPayload(input: UpsertDailyEngineSnapshotInput) {
  return {
    user_id: input.userId,
    date: input.date,
    engine_version: input.engineVersion,
    objective_context_snapshot: input.objectiveContext,
    nutrition_targets_snapshot: input.nutritionTargets,
    workout_prescription_snapshot: input.workoutPrescription,
    mission_snapshot: input.mission,
    updated_at: new Date().toISOString(),
  };
}

export interface UpsertDailyEngineSnapshotInput {
  userId: string;
  date: string;
  engineVersion: string;
  objectiveContext: MacrocycleContext;
  nutritionTargets: ResolvedNutritionTargets;
  workoutPrescription: WorkoutPrescriptionV2 | null;
  mission: DailyMission;
}

export async function getDailyEngineSnapshot(
  userId: string,
  date: string,
): Promise<DailyEngineSnapshotRow | null> {
  if (hasDailyEngineSnapshotsTable === false) {
    return null;
  }

  const { data, error } = await supabase
    .from('daily_engine_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    if (isMissingDailyEngineSnapshotsTableError(error)) {
      hasDailyEngineSnapshotsTable = false;
      return null;
    }
    throw error;
  }

  hasDailyEngineSnapshotsTable = true;
  return data ? migrateDailyEngineSnapshot(data as DailyEngineSnapshotRow) : null;
}

export async function getDailyEngineSnapshotsForDates(
  userId: string,
  dates: string[],
): Promise<Map<string, DailyEngineSnapshotRow>> {
  const normalizedDates = Array.from(new Set(dates.filter(Boolean)));
  if (normalizedDates.length === 0 || hasDailyEngineSnapshotsTable === false) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('daily_engine_snapshots')
    .select('*')
    .eq('user_id', userId)
    .in('date', normalizedDates);

  if (error) {
    if (isMissingDailyEngineSnapshotsTableError(error)) {
      hasDailyEngineSnapshotsTable = false;
      return new Map();
    }
    throw error;
  }

  hasDailyEngineSnapshotsTable = true;
  return new Map(
    ((data ?? []) as DailyEngineSnapshotRow[])
      .map((snapshot) => migrateDailyEngineSnapshot(snapshot))
      .map((snapshot) => [snapshot.date, snapshot]),
  );
}

export async function upsertDailyEngineSnapshot(input: UpsertDailyEngineSnapshotInput): Promise<void> {
  await upsertDailyEngineSnapshots([input]);
}

export async function upsertDailyEngineSnapshots(inputs: UpsertDailyEngineSnapshotInput[]): Promise<void> {
  if (inputs.length === 0 || hasDailyEngineSnapshotsTable === false) {
    return;
  }

  const { error } = await supabase
    .from('daily_engine_snapshots')
    .upsert(inputs.map(toSnapshotPayload), { onConflict: 'user_id,date' });

  if (error) {
    if (isMissingDailyEngineSnapshotsTableError(error)) {
      hasDailyEngineSnapshotsTable = false;
      return;
    }
    throw error;
  }

  hasDailyEngineSnapshotsTable = true;
}
