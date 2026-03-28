import { supabase } from '../supabase';
import {
    ComplianceReason,
    ExerciseLibraryRow,
    WorkoutLogRow,
    WorkoutSetLogRow,
    WorkoutFocus,
    WorkoutType,
    MuscleGroup,
    Equipment,
    ExerciseType,
    EquipmentItem,
    ExerciseHistoryEntry,
} from '../engine/types';
import { estimateE1RM } from '../engine/calculateOverload';
import { formatLocalDate, todayLocalDate } from '../utils/date';

const today = todayLocalDate;
let hasWorkoutLogScheduledActivityIdColumn: boolean | null = null;

function isMissingWorkoutLogScheduledActivityIdColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    return maybe.code === 'PGRST204'
        && typeof maybe.message === 'string'
        && maybe.message.includes('scheduled_activity_id')
        && maybe.message.includes('workout_log');
}

async function insertWorkoutLogWithCompat(
    basePayload: Record<string, unknown>,
    scheduledActivityId?: string | null,
): Promise<WorkoutLogRow> {
    const payload = hasWorkoutLogScheduledActivityIdColumn === false || typeof scheduledActivityId === 'undefined'
        ? basePayload
        : { ...basePayload, scheduled_activity_id: scheduledActivityId ?? null };

    const { data, error } = await supabase
        .from('workout_log')
        .insert(payload)
        .select()
        .single();

    if (error && isMissingWorkoutLogScheduledActivityIdColumnError(error)) {
        hasWorkoutLogScheduledActivityIdColumn = false;

        const retry = await supabase
            .from('workout_log')
            .insert(basePayload)
            .select()
            .single();

        if (retry.error) throw retry.error;
        return retry.data as WorkoutLogRow;
    }

    if (error) throw error;
    if (typeof scheduledActivityId !== 'undefined') {
        hasWorkoutLogScheduledActivityIdColumn = true;
    }
    return data as WorkoutLogRow;
}

export async function findOpenWorkoutLog(
    userId: string,
    params: {
        date?: string;
        weeklyPlanEntryId?: string;
        scheduledActivityId?: string | null;
    },
): Promise<WorkoutLogRow | null> {
    if (typeof params.scheduledActivityId === 'undefined' && !params.weeklyPlanEntryId) {
        return null;
    }

    const targetDate = params.date ?? today();
    let query = supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', userId)
        .eq('date', targetDate)
        .is('session_rpe', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (typeof params.scheduledActivityId !== 'undefined' && params.scheduledActivityId !== null) {
        query = query.eq('scheduled_activity_id', params.scheduledActivityId);
    } else if (params.weeklyPlanEntryId) {
        query = query.eq('weekly_plan_entry_id', params.weeklyPlanEntryId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return (data as WorkoutLogRow | null) ?? null;
}

// ─── Exercise Library ──────────────────────────────────────────

/**
 * Fetch all exercises from the library.
 */
export async function getExerciseLibrary(): Promise<ExerciseLibraryRow[]> {
    const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .order('name');

    if (error) throw error;
    return (data ?? []) as ExerciseLibraryRow[];
}

/**
 * Search exercises with optional filters.
 */
export async function searchExercises(
    query: string,
    filters?: {
        type?: ExerciseType;
        muscle_group?: MuscleGroup;
        equipment?: Equipment;
    },
    limit: number = 20,
): Promise<ExerciseLibraryRow[]> {
    let q = supabase.from('exercise_library').select('*');

    if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`);
    }

    if (filters?.type) q = q.eq('type', filters.type);
    if (filters?.muscle_group) q = q.eq('muscle_group', filters.muscle_group);
    if (filters?.equipment) q = q.eq('equipment', filters.equipment);

    const { data, error } = await q.order('name').limit(limit);
    if (error) throw error;
    return (data ?? []) as ExerciseLibraryRow[];
}

/**
 * Create a custom exercise for a user.
 */
export async function createCustomExercise(
    userId: string,
    exercise: {
        name: string;
        type: ExerciseType;
        cns_load: number;
        muscle_group: MuscleGroup;
        equipment: Equipment;
        description: string;
        cues: string;
    },
): Promise<ExerciseLibraryRow> {
    const { data, error } = await supabase
        .from('exercise_library')
        .insert({
            name: exercise.name,
            type: exercise.type,
            cns_load: exercise.cns_load,
            muscle_group: exercise.muscle_group,
            equipment: exercise.equipment,
            description: exercise.description,
            cues: exercise.cues,
            sport_tags: [],
            user_id: userId,
        })
        .select()
        .single();

    if (error) throw error;
    return data as ExerciseLibraryRow;
}

// ─── Workout Log CRUD ──────────────────────────────────────────

/**
 * Start a new workout. Creates a workout_log row and returns it.
 */
export async function startWorkout(
    userId: string,
    params: {
        workoutType: WorkoutType;
        focus: WorkoutFocus | null;
        scheduledActivityId?: string | null;
        date?: string;
    },
): Promise<WorkoutLogRow> {
    return insertWorkoutLogWithCompat({
        user_id: userId,
        date: params.date ?? today(),
        workout_type: params.workoutType,
        focus: params.focus,
        total_volume: 0,
        total_sets: 0,
        session_rpe: null,
        duration_minutes: null,
        notes: null,
    }, params.scheduledActivityId);
}

/**
 * Log a single workout set.
 */
export async function logWorkoutSet(
    workoutLogId: string,
    set: {
        exercise_library_id: string;
        set_number: number;
        reps: number;
        weight_lbs: number;
        rpe?: number;
        tempo?: string;
        rest_seconds?: number;
        is_warmup?: boolean;
        superset_group?: number;
    },
): Promise<WorkoutSetLogRow> {
    const { data, error } = await supabase
        .from('workout_set_log')
        .insert({
            workout_log_id: workoutLogId,
            exercise_library_id: set.exercise_library_id,
            set_number: set.set_number,
            reps: set.reps,
            weight_lbs: set.weight_lbs,
            rpe: set.rpe ?? null,
            tempo: set.tempo ?? null,
            rest_seconds: set.rest_seconds ?? null,
            is_warmup: set.is_warmup ?? false,
            superset_group: set.superset_group ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return data as WorkoutSetLogRow;
}

/**
 * Update an existing workout set.
 */
export async function updateWorkoutSet(
    setId: string,
    updates: Partial<Pick<WorkoutSetLogRow,
        'reps' | 'weight_lbs' | 'rpe' | 'tempo' | 'rest_seconds' | 'is_warmup' | 'superset_group'
    >>,
): Promise<void> {
    const { error } = await supabase
        .from('workout_set_log')
        .update(updates)
        .eq('id', setId);

    if (error) throw error;
}

/**
 * Remove a workout set.
 */
export async function removeWorkoutSet(setId: string): Promise<void> {
    const { error } = await supabase
        .from('workout_set_log')
        .delete()
        .eq('id', setId);

    if (error) throw error;
}

/**
 * Complete a workout. Calculates totals, updates workout_log,
 * syncs linked schedule/plan rows, and inserts a training_sessions row.
 */
export async function completeWorkout(
    userId: string,
    workoutLogId: string,
    sessionRPE: number,
    durationMinutes: number,
    notes?: string,
    options?: {
        complianceReason?: ComplianceReason | null;
        activationRPE?: number | null;
    },
): Promise<void> {
    // 1. Fetch all sets for this workout
    const { data: sets, error: setsErr } = await supabase
        .from('workout_set_log')
        .select('*')
        .eq('workout_log_id', workoutLogId);

    if (setsErr) throw setsErr;
    const allSets = (sets ?? []) as WorkoutSetLogRow[];

    // 2. Calculate totals
    const workingSets = allSets.filter(s => !s.is_warmup);
    const totalVolume = workingSets.reduce((sum, s) => sum + s.reps * s.weight_lbs, 0);
    const totalSets = workingSets.length;

    // 3. Update workout_log
    const { data: workoutLog, error: updateErr } = await supabase
        .from('workout_log')
        .update({
            total_volume: Math.round(totalVolume),
            total_sets: totalSets,
            session_rpe: sessionRPE,
            duration_minutes: durationMinutes,
            compliance_reason: options?.complianceReason ?? null,
            activation_rpe: options?.activationRPE ?? null,
            notes: notes ?? null,
        })
        .eq('id', workoutLogId)
        .select()
        .single();

    if (updateErr) throw updateErr;
    const log = workoutLog as WorkoutLogRow;

    if (log.weekly_plan_entry_id) {
        const { error: weeklyPlanError } = await supabase
            .from('weekly_plan_entries')
            .update({
                status: 'completed',
                workout_log_id: workoutLogId,
            })
            .eq('id', log.weekly_plan_entry_id);
        if (weeklyPlanError) throw weeklyPlanError;
    }

    if (log.scheduled_activity_id) {
        const { error: scheduledError } = await supabase
            .from('scheduled_activities')
            .update({
                status: 'completed',
                actual_duration_min: durationMinutes,
                actual_rpe: sessionRPE,
                notes: notes ?? null,
                recommendation_status: 'completed',
            })
            .eq('id', log.scheduled_activity_id);
        if (scheduledError) throw scheduledError;
    }

    // 4. Insert into training_sessions for ACWR calculation
    await supabase
        .from('training_sessions')
        .upsert({
            user_id: userId,
            date: log.date,
            duration_minutes: durationMinutes,
            intensity_srpe: sessionRPE,
        }, { onConflict: 'user_id,date' });
}

/**
 * Cancel a workout. Deletes the workout_log and its associated sets.
 */
export async function cancelWorkout(workoutLogId: string): Promise<void> {
    const { error: setsError } = await supabase
        .from('workout_set_log')
        .delete()
        .eq('workout_log_id', workoutLogId);

    if (setsError) throw setsError;

    const { error: logError } = await supabase
        .from('workout_log')
        .delete()
        .eq('id', workoutLogId);

    if (logError) throw logError;
}

// ─── Workout Retrieval ─────────────────────────────────────────

/**
 * Get a workout log with all its sets for a specific date.
 */
export async function getWorkoutLog(
    userId: string,
    date: string = today(),
): Promise<{ workout: WorkoutLogRow | null; sets: (WorkoutSetLogRow & { exercise?: ExerciseLibraryRow })[] }> {
    const { data: workouts, error } = await supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    if (!workouts || workouts.length === 0) {
        return { workout: null, sets: [] };
    }

    const workout = workouts[0] as WorkoutLogRow;

    const { data: sets, error: setsErr } = await supabase
        .from('workout_set_log')
        .select('*, exercise_library(*)')
        .eq('workout_log_id', workout.id)
        .order('set_number');

    if (setsErr) throw setsErr;

    return {
        workout,
        sets: (sets ?? []).map((set: any) => ({
            ...set,
            exercise: set.exercise_library ?? undefined,
        })),
    };
}

/**
 * Get all sets for a specific workout log id.
 * Used by ActiveWorkout to restore in-progress sessions.
 */
export async function getWorkoutSetsForLog(
    workoutLogId: string,
): Promise<(WorkoutSetLogRow & { exercise?: ExerciseLibraryRow })[]> {
    const { data, error } = await supabase
        .from('workout_set_log')
        .select('*, exercise_library(*)')
        .eq('workout_log_id', workoutLogId)
        .order('set_number');

    if (error) throw error;

    return (data ?? []).map((set: any) => ({
        ...set,
        exercise: set.exercise_library ?? undefined,
    }));
}

/**
 * Get recent workout history.
 */
export async function getWorkoutHistory(
    userId: string,
    limit: number = 20,
): Promise<WorkoutLogRow[]> {
    const { data, error } = await supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', userId)
        .not('session_rpe', 'is', null) // only completed workouts
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data ?? []) as WorkoutLogRow[];
}

/**
 * Get personal records per exercise (or a specific exercise).
 */
export async function getExercisePRs(
    userId: string,
    exerciseId?: string,
): Promise<{ exercise_library_id: string; exercise_name: string; max_weight: number; max_reps: number }[]> {
    // Fetch all working sets for this user
    let q = supabase
        .from('workout_set_log')
        .select('exercise_library_id, reps, weight_lbs, is_warmup, workout_log!inner(user_id)')
        .eq('workout_log.user_id', userId)
        .eq('is_warmup', false);

    if (exerciseId) {
        q = q.eq('exercise_library_id', exerciseId);
    }

    const { data, error } = await q;
    if (error) throw error;
    const allSets = data ?? [];

    // Group by exercise and find max weight and max reps
    const prMap = new Map<string, { maxWeight: number; maxReps: number }>();
    for (const set of allSets as any[]) {
        const id = set.exercise_library_id;
        const current = prMap.get(id) ?? { maxWeight: 0, maxReps: 0 };
        if (set.weight_lbs > current.maxWeight) current.maxWeight = set.weight_lbs;
        if (set.reps > current.maxReps) current.maxReps = set.reps;
        prMap.set(id, current);
    }

    // Fetch exercise names for the IDs
    const ids = Array.from(prMap.keys());
    if (ids.length === 0) return [];

    const { data: exercises } = await supabase
        .from('exercise_library')
        .select('id, name')
        .in('id', ids);

    const nameMap = new Map((exercises ?? []).map((e: any) => [e.id, e.name]));

    return ids.map(id => ({
        exercise_library_id: id,
        exercise_name: nameMap.get(id) ?? 'Unknown',
        max_weight: prMap.get(id)!.maxWeight,
        max_reps: prMap.get(id)!.maxReps,
    }));
}

/**
 * Get weekly volume stats per muscle group for analytics.
 */
export async function getWeeklyVolumeStats(
    userId: string,
    weeks: number = 8,
): Promise<{ week: string; volumes: Record<string, number> }[]> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    const sinceStr = formatLocalDate(since);

    const { data, error } = await supabase
        .from('workout_set_log')
        .select('reps, weight_lbs, is_warmup, exercise_library(muscle_group), workout_log!inner(user_id, date)')
        .eq('workout_log.user_id', userId)
        .gte('workout_log.date', sinceStr)
        .eq('is_warmup', false);

    if (error) throw error;
    const allSets = data ?? [];

    // Group by week and muscle group
    const weekMap = new Map<string, Record<string, number>>();
    for (const set of allSets as any[]) {
        const date = set.workout_log?.date;
        if (!date) continue;

        // Calculate week start (Monday)
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStartDate = new Date(d);
        weekStartDate.setDate(diff);
        const weekStart = formatLocalDate(weekStartDate);

        const muscleGroup = set.exercise_library?.muscle_group ?? 'full_body';
        const volume = set.reps * set.weight_lbs;

        if (!weekMap.has(weekStart)) weekMap.set(weekStart, {});
        const weekVolumes = weekMap.get(weekStart)!;
        weekVolumes[muscleGroup] = (weekVolumes[muscleGroup] ?? 0) + volume;
    }

    return Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, volumes]) => ({ week, volumes }));
}

/**
 * Get consistency data (dates with workouts) for calendar display.
 */
export async function getConsistencyData(
    userId: string,
    days: number = 60,
): Promise<Set<string>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = formatLocalDate(since);

    const { data, error } = await supabase
        .from('workout_log')
        .select('date')
        .eq('user_id', userId)
        .gte('date', sinceStr)
        .not('session_rpe', 'is', null);

    if (error) throw error;
    return new Set((data ?? []).map((d: any) => d.date));
}

/**
 * Get recent exercise IDs (used in last 48h) for the scoring algorithm.
 */
export async function getRecentExerciseIds(userId: string): Promise<string[]> {
    const since = new Date();
    since.setDate(since.getDate() - 2);
    const sinceStr = formatLocalDate(since);

    const { data, error } = await supabase
        .from('workout_set_log')
        .select('exercise_library_id, workout_log!inner(user_id, date)')
        .eq('workout_log.user_id', userId)
        .gte('workout_log.date', sinceStr);

    if (error) throw error;
    const ids = new Set((data ?? []).map((d: any) => d.exercise_library_id));
    return Array.from(ids);
}

export async function getRecentMuscleVolume(
    userId: string,
    days: number = 21,
): Promise<Record<MuscleGroup, number>> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = formatLocalDate(since);

    const emptyVolume: Record<MuscleGroup, number> = {
        chest: 0,
        back: 0,
        shoulders: 0,
        quads: 0,
        hamstrings: 0,
        glutes: 0,
        arms: 0,
        core: 0,
        full_body: 0,
        neck: 0,
        calves: 0,
    };

    const { data, error } = await supabase
        .from('workout_set_log')
        .select('reps, weight_lbs, is_warmup, exercise_library!inner(muscle_group), workout_log!inner(user_id, date)')
        .eq('workout_log.user_id', userId)
        .gte('workout_log.date', sinceStr)
        .eq('is_warmup', false);

    if (error) throw error;

    return (data ?? []).reduce<Record<MuscleGroup, number>>((volume, row: any) => {
        const group = row.exercise_library?.muscle_group as MuscleGroup | undefined;
        if (!group) return volume;

        const liftedLoad = Math.max(1, Number(row.weight_lbs) || 0);
        volume[group] += Number(row.reps ?? 0) * liftedLoad;
        return volume;
    }, { ...emptyVolume });
}

// ─── V2 Extensions ──────────────────────────────────────────────

/**
 * Get exercise history for a specific exercise (last N sessions).
 * Used by the progressive overload engine to suggest weight increases.
 */
export async function getExerciseHistoryForExercise(
    userId: string,
    exerciseId: string,
    limit: number = 12,
): Promise<ExerciseHistoryEntry[]> {
    const { data, error } = await supabase
        .from('workout_set_log')
        .select('reps, weight_lbs, rpe, is_warmup, workout_log!inner(user_id, date)')
        .eq('workout_log.user_id', userId)
        .eq('exercise_library_id', exerciseId)
        .eq('is_warmup', false)
        .order('workout_log(date)', { ascending: false });

    if (error) throw error;
    const allSets = data ?? [];

    // Group by date
    const dateMap = new Map<string, { weight: number; reps: number; rpe: number | null; volume: number; sets: number }>();
    for (const set of allSets as any[]) {
        const date = set.workout_log?.date;
        if (!date) continue;

        const current = dateMap.get(date) ?? { weight: 0, reps: 0, rpe: null, volume: 0, sets: 0 };
        const setVolume = set.reps * set.weight_lbs;

        if (set.weight_lbs > current.weight || (set.weight_lbs === current.weight && set.reps > current.reps)) {
            current.weight = set.weight_lbs;
            current.reps = set.reps;
            current.rpe = set.rpe ?? current.rpe;
        }
        current.volume += setVolume;
        current.sets += 1;
        dateMap.set(date, current);
    }

    const entries: ExerciseHistoryEntry[] = Array.from(dateMap.entries())
        .map(([date, d]) => ({
            date,
            bestSetWeight: d.weight,
            bestSetReps: d.reps,
            bestSetRPE: d.rpe,
            totalVolume: d.volume,
            workingSets: d.sets,
            estimated1RM: estimateE1RM(d.weight, d.reps, d.rpe ?? 8),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);

    return entries;
}

/**
 * Batch-fetch exercise history for multiple exercises at once.
 * Returns a Map of exerciseId → ExerciseHistoryEntry[].
 */
export async function getExerciseHistoryBatch(
    userId: string,
    exerciseIds: string[],
    sessionsPerExercise: number = 8,
): Promise<Map<string, ExerciseHistoryEntry[]>> {
    if (exerciseIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('workout_set_log')
        .select('exercise_library_id, reps, weight_lbs, rpe, is_warmup, workout_log!inner(user_id, date)')
        .eq('workout_log.user_id', userId)
        .in('exercise_library_id', exerciseIds)
        .eq('is_warmup', false)
        .order('workout_log(date)', { ascending: false });

    if (error) throw error;
    const allSets = data ?? [];

    // Group by exerciseId → date → best set
    const exerciseMap = new Map<string, Map<string, { weight: number; reps: number; rpe: number | null; volume: number; sets: number }>>();

    for (const set of allSets as any[]) {
        const exId = set.exercise_library_id;
        const date = set.workout_log?.date;
        if (!exId || !date) continue;

        if (!exerciseMap.has(exId)) exerciseMap.set(exId, new Map());
        const dateMap = exerciseMap.get(exId)!;
        const current = dateMap.get(date) ?? { weight: 0, reps: 0, rpe: null, volume: 0, sets: 0 };

        if (set.weight_lbs > current.weight || (set.weight_lbs === current.weight && set.reps > current.reps)) {
            current.weight = set.weight_lbs;
            current.reps = set.reps;
            current.rpe = set.rpe ?? current.rpe;
        }
        current.volume += set.reps * set.weight_lbs;
        current.sets += 1;
        dateMap.set(date, current);
    }

    const result = new Map<string, ExerciseHistoryEntry[]>();
    for (const [exId, dateMap] of exerciseMap) {
        const entries = Array.from(dateMap.entries())
            .map(([date, d]) => ({
                date,
                bestSetWeight: d.weight,
                bestSetReps: d.reps,
                bestSetRPE: d.rpe,
                totalVolume: d.volume,
                workingSets: d.sets,
                estimated1RM: estimateE1RM(d.weight, d.reps, d.rpe ?? 8),
            }))
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, sessionsPerExercise);
        result.set(exId, entries);
    }

    return result;
}

/**
 * Search exercises with equipment availability filter.
 */
export async function searchExercisesWithEquipment(
    query: string,
    availableEquipment: EquipmentItem[],
    filters?: {
        type?: ExerciseType;
        muscle_group?: MuscleGroup;
    },
    limit: number = 20,
): Promise<ExerciseLibraryRow[]> {
    let q = supabase.from('exercise_library').select('*');

    if (query.trim()) {
        q = q.ilike('name', `%${query.trim()}%`);
    }

    if (filters?.type) q = q.eq('type', filters.type);
    if (filters?.muscle_group) q = q.eq('muscle_group', filters.muscle_group);

    // Filter by equipment: include bodyweight + equipment that's available
    const equipmentFilter: Equipment[] = ['bodyweight', 'other'];
    const equipmentMapping: Record<string, Equipment> = {
        barbell: 'barbell',
        dumbbells: 'dumbbell',
        kettlebells: 'kettlebell',
        cables: 'cable',
        resistance_bands: 'band',
        medicine_balls: 'medicine_ball',
        sled: 'sled',
        heavy_bag: 'heavy_bag',
    };
    for (const item of availableEquipment) {
        const mapped = equipmentMapping[item];
        if (mapped && !equipmentFilter.includes(mapped)) {
            equipmentFilter.push(mapped);
        }
        // Machine items map to 'machine' equipment
        if (['smith_machine', 'leg_press_machine', 'cable_crossover', 'lat_pulldown_machine', 'assault_bike', 'rowing_machine'].includes(item)) {
            if (!equipmentFilter.includes('machine')) {
                equipmentFilter.push('machine');
            }
        }
    }

    q = q.in('equipment', equipmentFilter);

    const { data, error } = await q.order('name').limit(limit);
    if (error) throw error;
    return (data ?? []) as ExerciseLibraryRow[];
}

/**
 * Start a workout with V2 extensions (weekly plan entry link, gym profile).
 */
export async function startWorkoutV2(
    userId: string,
    params: {
        workoutType: WorkoutType;
        focus: WorkoutFocus | null;
        weeklyPlanEntryId?: string;
        scheduledActivityId?: string | null;
        gymProfileId?: string;
        date?: string;
    },
): Promise<WorkoutLogRow> {
    const openWorkout = await findOpenWorkoutLog(userId, {
        date: params.date,
        weeklyPlanEntryId: params.weeklyPlanEntryId,
        scheduledActivityId: params.scheduledActivityId,
    });

    if (openWorkout) {
        return openWorkout;
    }

    return insertWorkoutLogWithCompat({
        user_id: userId,
        date: params.date ?? today(),
        workout_type: params.workoutType,
        focus: params.focus,
        weekly_plan_entry_id: params.weeklyPlanEntryId ?? null,
        gym_profile_id: params.gymProfileId ?? null,
        total_volume: 0,
        total_sets: 0,
        session_rpe: null,
        duration_minutes: null,
        notes: null,
    }, params.scheduledActivityId);
}

/**
 * Log a workout set with V2 extensions (target values, adaptation tracking).
 */
export async function logWorkoutSetV2(
    workoutLogId: string,
    set: {
        exercise_library_id: string;
        set_number: number;
        reps: number;
        weight_lbs: number;
        rpe?: number;
        tempo?: string;
        rest_seconds?: number;
        is_warmup?: boolean;
        superset_group?: number;
        target_weight?: number;
        target_reps?: number;
        target_rpe?: number;
        was_adapted?: boolean;
        adaptation_reason?: string;
    },
): Promise<WorkoutSetLogRow> {
    const { data, error } = await supabase
        .from('workout_set_log')
        .insert({
            workout_log_id: workoutLogId,
            exercise_library_id: set.exercise_library_id,
            set_number: set.set_number,
            reps: set.reps,
            weight_lbs: set.weight_lbs,
            rpe: set.rpe ?? null,
            tempo: set.tempo ?? null,
            rest_seconds: set.rest_seconds ?? null,
            is_warmup: set.is_warmup ?? false,
            superset_group: set.superset_group ?? null,
            target_weight: set.target_weight ?? null,
            target_reps: set.target_reps ?? null,
            target_rpe: set.target_rpe ?? null,
            was_adapted: set.was_adapted ?? false,
            adaptation_reason: set.adaptation_reason ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return data as WorkoutSetLogRow;
}



