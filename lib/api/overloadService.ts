import { supabase } from '../supabase';
import { ExerciseHistoryEntry, PRRecord } from '../engine/types';
import { todayLocalDate } from '../utils/date';

const today = todayLocalDate;

function mapPRRow(row: any, exerciseNames?: Map<string, string>): PRRecord {
    return {
        id: row.id,
        exerciseId: row.exercise_library_id,
        exerciseName: row.exercise_library?.name ?? exerciseNames?.get(row.exercise_library_id) ?? 'Unknown',
        prType: row.pr_type,
        value: Number(row.value),
        repsAtPR: row.reps_at_pr,
        weightAtPR: row.weight_at_pr ? Number(row.weight_at_pr) : null,
        rpeAtPR: row.rpe_at_pr,
        estimated1RM: row.estimated_1rm ? Number(row.estimated_1rm) : null,
        achievedDate: row.achieved_date,
    };
}

async function getExerciseNamesById(exerciseIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = [...new Set(exerciseIds.filter(Boolean))];
    const names = new Map<string, string>();

    if (uniqueIds.length === 0) {
        return names;
    }

    const { data, error } = await supabase
        .from('exercise_library')
        .select('id, name')
        .in('id', uniqueIds);

    if (error) throw error;

    for (const row of (data ?? []) as any[]) {
        names.set(row.id, row.name);
    }

    return names;
}

// ─── Exercise History ────────────────────────────────────────

/**
 * Get the performance history for a specific exercise (for overload suggestions).
 * Returns the best set per session, ordered by date.
 */
export async function getExerciseHistory(
    userId: string,
    exerciseId: string,
    limit: number = 12,
): Promise<ExerciseHistoryEntry[]> {
    const { data, error } = await supabase
        .from('exercise_overload_history')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_library_id', exerciseId)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        date: row.date,
        bestSetWeight: Number(row.best_set_weight),
        bestSetReps: row.best_set_reps,
        bestSetRPE: row.best_set_rpe,
        totalVolume: Number(row.total_volume),
        workingSets: row.working_sets,
        estimated1RM: Number(row.estimated_1rm ?? 0),
    }));
}

/**
 * Save overload history for an exercise after a workout session.
 * Upserts based on user_id + exercise_id + date.
 */
export async function saveOverloadHistory(
    userId: string,
    exerciseId: string,
    entry: {
        bestSetWeight: number;
        bestSetReps: number;
        bestSetRPE: number | null;
        totalVolume: number;
        workingSets: number;
        estimated1RM: number;
        progressionModel: string | null;
    },
): Promise<void> {
    const { error } = await supabase
        .from('exercise_overload_history')
        .upsert({
            user_id: userId,
            exercise_library_id: exerciseId,
            date: today(),
            best_set_weight: entry.bestSetWeight,
            best_set_reps: entry.bestSetReps,
            best_set_rpe: entry.bestSetRPE,
            total_volume: entry.totalVolume,
            working_sets: entry.workingSets,
            estimated_1rm: entry.estimated1RM,
            progression_model: entry.progressionModel,
        }, { onConflict: 'user_id,exercise_library_id,date' });

    if (error) throw error;
}

/**
 * Batch fetch exercise history for multiple exercises at once.
 * Used to populate overload suggestions for a full prescription.
 */
export async function getExerciseHistoryBatch(
    userId: string,
    exerciseIds: string[],
    limit: number = 12,
): Promise<Map<string, ExerciseHistoryEntry[]>> {
    if (exerciseIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('exercise_overload_history')
        .select('*')
        .eq('user_id', userId)
        .in('exercise_library_id', exerciseIds)
        .order('date', { ascending: false });

    if (error) throw error;

    const result = new Map<string, ExerciseHistoryEntry[]>();
    for (const id of exerciseIds) {
        result.set(id, []);
    }

    for (const row of (data ?? []) as any[]) {
        const entries = result.get(row.exercise_library_id);
        if (entries && entries.length < limit) {
            entries.push({
                date: row.date,
                bestSetWeight: Number(row.best_set_weight),
                bestSetReps: row.best_set_reps,
                bestSetRPE: row.best_set_rpe,
                totalVolume: Number(row.total_volume),
                workingSets: row.working_sets,
                estimated1RM: Number(row.estimated_1rm ?? 0),
            });
        }
    }

    return result;
}

// ─── PR Records ──────────────────────────────────────────────

/**
 * Get all PRs for a user, optionally filtered by exercise.
 */
export async function getPRs(
    userId: string,
    exerciseId?: string,
): Promise<PRRecord[]> {
    let q = supabase
        .from('exercise_pr_log')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_date', { ascending: false });

    if (exerciseId) {
        q = q.eq('exercise_library_id', exerciseId);
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as any[];
    const exerciseNames = await getExerciseNamesById(rows.map((row) => row.exercise_library_id));

    return rows.map((row) => mapPRRow(row, exerciseNames));
}

export async function getPRsForExercises(
    userId: string,
    exerciseIds: string[],
): Promise<Map<string, PRRecord[]>> {
    const result = new Map<string, PRRecord[]>();

    for (const exerciseId of exerciseIds) {
        result.set(exerciseId, []);
    }

    if (exerciseIds.length === 0) {
        return result;
    }

    const [{ data, error }, exerciseNames] = await Promise.all([
        supabase
            .from('exercise_pr_log')
            .select('*')
            .eq('user_id', userId)
            .in('exercise_library_id', exerciseIds)
            .order('achieved_date', { ascending: false }),
        getExerciseNamesById(exerciseIds),
    ]);

    if (error) throw error;

    for (const row of (data ?? []) as any[]) {
        const mapped = mapPRRow(row, exerciseNames);
        const existing = result.get(mapped.exerciseId);
        if (existing) {
            existing.push(mapped);
        } else {
            result.set(mapped.exerciseId, [mapped]);
        }
    }

    return result;
}

/**
 * Save a new PR record.
 */
export async function savePR(
    userId: string,
    pr: {
        exerciseId: string;
        prType: 'weight' | 'reps' | 'estimated_1rm' | 'volume';
        value: number;
        repsAtPR: number | null;
        weightAtPR: number | null;
        rpeAtPR: number | null;
        estimated1RM: number | null;
        workoutLogId: string | null;
    },
): Promise<void> {
    const { error } = await supabase
        .from('exercise_pr_log')
        .insert({
            user_id: userId,
            exercise_library_id: pr.exerciseId,
            pr_type: pr.prType,
            value: pr.value,
            reps_at_pr: pr.repsAtPR,
            weight_at_pr: pr.weightAtPR,
            rpe_at_pr: pr.rpeAtPR,
            estimated_1rm: pr.estimated1RM,
            workout_log_id: pr.workoutLogId,
            achieved_date: today(),
        });

    if (error) throw error;
}

/**
 * Get the number of weeks since the last deload.
 */
export async function getWeeksSinceLastDeload(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('week_start_date')
        .eq('user_id', userId)
        .eq('is_deload', true)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    if (!data) return 99; // Never had a deload

    const lastDeload = new Date(data.week_start_date + 'T00:00:00');
    const now = new Date();
    const diffMs = now.getTime() - lastDeload.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Get recent session RPEs for deload detection (last N sessions).
 */
export async function getRecentSessionRPEs(
    userId: string,
    limit: number = 10,
): Promise<number[]> {
    const { data, error } = await supabase
        .from('workout_log')
        .select('session_rpe')
        .eq('user_id', userId)
        .not('session_rpe', 'is', null)
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data ?? []).map((d: any) => d.session_rpe as number);
}

