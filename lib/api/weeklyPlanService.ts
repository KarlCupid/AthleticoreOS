import { supabase } from '../supabase';
import { WeeklyPlanConfigRow, WeeklyPlanEntryRow, PlanEntryStatus, AvailabilityWindow } from '../engine/types';
import { toScheduledActivityPayload } from '../engine/sessionOwnership';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { buildWeeklyPlanEntryInsertPayload } from './weeklyPlanPersistence';

export { buildWeeklyPlanEntryInsertPayload } from './weeklyPlanPersistence';

const today = todayLocalDate;
let hasScheduledActivityIdColumn: boolean | null = null;
let hasScheduledActivitiesWeeklyPlanEntryIdColumn: boolean | null = null;
let hasWeeklyPlanMetadataColumns: boolean | null = null;

function isMissingScheduledActivityIdColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    return (maybe.code === 'PGRST204' || maybe.code === '42703')
        && typeof maybe.message === 'string'
        && maybe.message.includes('scheduled_activity_id')
        && maybe.message.includes('weekly_plan_entries');
}

function isMissingScheduledActivitiesWeeklyPlanEntryIdColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    return maybe.code === 'PGRST204'
        && typeof maybe.message === 'string'
        && maybe.message.includes('weekly_plan_entry_id')
        && maybe.message.includes('scheduled_activities');
}

const WEEKLY_PLAN_METADATA_COLUMNS = [
    'day_order',
    'session_family',
    'sc_session_family',
    'placement_source',
    'progression_intent',
    'carry_forward_reason',
    'session_modules',
    'dose_credits',
    'dose_summary',
    'realized_dose_buckets',
] as const;

function isMissingWeeklyPlanMetadataColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    const message = typeof maybe.message === 'string' ? maybe.message : '';
    return (maybe.code === 'PGRST204' || maybe.code === '42703')
        && message.includes('weekly_plan_entries')
        && WEEKLY_PLAN_METADATA_COLUMNS.some((column) => message.includes(column));
}

function normalizeDay(day: number): number | null {
    if (day === 7) return 0;
    if (day < 0 || day > 6) return null;
    return day;
}

function normalizeDays(days: number[] | null | undefined, fallback: number[]): number[] {
    if (!days || days.length === 0) return [...fallback];

    const normalized = Array.from(
        new Set(
            days
                .map((day) => normalizeDay(Number(day)))
                .filter((day): day is number => day !== null),
        ),
    );

    return normalized.length > 0 ? normalized : [...fallback];
}

function normalizeAvailabilityWindows(windows: AvailabilityWindow[] | null | undefined): AvailabilityWindow[] {
    if (!windows || windows.length === 0) return [];

    return windows
        .map((window) => ({
            dayOfWeek: normalizeDay(Number(window.dayOfWeek)) ?? 0,
            startTime: window.startTime,
            endTime: window.endTime,
        }))
        .filter((window) => typeof window.startTime === 'string' && typeof window.endTime === 'string')
        .sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
}

function stripWeeklyPlanMetadataPayload<T extends Record<string, unknown>>(payload: T) {
    const {
        day_order: _day_order,
        session_family: _session_family,
        sc_session_family: _sc_session_family,
        placement_source: _placement_source,
        progression_intent: _progression_intent,
        carry_forward_reason: _carry_forward_reason,
        session_modules: _session_modules,
        dose_credits: _dose_credits,
        dose_summary: _dose_summary,
        realized_dose_buckets: _realized_dose_buckets,
        ...rest
    } = payload;
    return rest;
}

function applyWeeklyPlanColumnCompatibility<T extends Record<string, unknown>>(payload: T) {
    return hasWeeklyPlanMetadataColumns === false
        ? stripWeeklyPlanMetadataPayload(payload)
        : payload;
}

async function getScheduledActivityIdForEntry(entryId: string): Promise<string | null> {
    if (hasScheduledActivityIdColumn === false) {
        return null;
    }

    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('scheduled_activity_id')
        .eq('id', entryId)
        .single();

    if (error) {
        if (isMissingScheduledActivityIdColumnError(error)) {
            hasScheduledActivityIdColumn = false;
            return null;
        }
        throw error;
    }

    hasScheduledActivityIdColumn = true;
    return (data as { scheduled_activity_id?: string | null } | null)?.scheduled_activity_id ?? null;
}
// --- Weekly Plan Config -------------------------------------

/**
 * Get the user's weekly plan configuration.
 */
export async function getWeeklyPlanConfig(userId: string): Promise<WeeklyPlanConfigRow | null> {
    const { data, error } = await supabase
        .from('weekly_plan_config')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const config = data as WeeklyPlanConfigRow;
    return {
        ...config,
        available_days: normalizeDays(config.available_days, [1, 2, 3, 4, 5]),
        availability_windows: normalizeAvailabilityWindows(config.availability_windows),
        two_a_day_days: normalizeDays(config.two_a_day_days, []),
    };
}

/**
 * Save or update the weekly plan configuration.
 */
export async function saveWeeklyPlanConfig(
    userId: string,
    config: Omit<WeeklyPlanConfigRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
): Promise<WeeklyPlanConfigRow> {
    const normalizedAvailability = normalizeAvailabilityWindows(config.availability_windows);
    const normalizedAvailable = normalizeDays(config.available_days, normalizedAvailability.map((window) => window.dayOfWeek));
    const normalizedTwoADays = normalizeDays(config.two_a_day_days, []).filter((day) =>
        normalizedAvailable.includes(day),
    );

    const { data, error } = await supabase
        .from('weekly_plan_config')
        .upsert(
            {
                user_id: userId,
                available_days: normalizedAvailable,
                availability_windows: normalizedAvailability,
                session_duration_min: config.session_duration_min,
                allow_two_a_days: config.allow_two_a_days,
                two_a_day_days: normalizedTwoADays,
                am_session_type: config.am_session_type,
                pm_session_type: config.pm_session_type,
                preferred_gym_profile_id: config.preferred_gym_profile_id,
                auto_deload_interval_weeks: config.auto_deload_interval_weeks,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        )
        .select()
        .single();

    if (error) throw error;

    const saved = data as WeeklyPlanConfigRow;
    return {
        ...saved,
        available_days: normalizeDays(saved.available_days, [1, 2, 3, 4, 5]),
        availability_windows: normalizeAvailabilityWindows(saved.availability_windows),
        two_a_day_days: normalizeDays(saved.two_a_day_days, []),
    };
}

/**
 * Cancel the active plan completely.
 * Deletes all uncompleted sessions from the weekly plan and the schedule.
 */
export async function cancelActivePlan(userId: string): Promise<void> {
    const { data: latestEntry } = await supabase
        .from('weekly_plan_entries')
        .select('week_start_date')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!latestEntry) return;

    const weekStart = latestEntry.week_start_date;

    await supabase
        .from('weekly_plan_entries')
        .delete()
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .neq('status', 'completed');

    await supabase
        .from('scheduled_activities')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'engine')
        .gte('date', today())
        .eq('status', 'scheduled');
}

// --- Weekly Plan Entries -----------------------------------

/**
 * Get the active week plan (entries for the current week).
 * Finds the most recent plan and returns it if it is less than 7 days old.
 */
export async function getActiveWeekPlan(userId: string): Promise<WeeklyPlanEntryRow[]> {
    const { data: latestEntry, error: latestErr } = await supabase
        .from('weekly_plan_entries')
        .select('week_start_date')
        .eq('user_id', userId)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (latestErr) throw latestErr;
    if (!latestEntry) return [];

    const weekStart = latestEntry.week_start_date;
    const weekStartDateObj = new Date(`${weekStart}T00:00:00`);
    const todayObj = new Date(`${today()}T00:00:00`);

    const daysOld = (todayObj.getTime() - weekStartDateObj.getTime()) / (1000 * 3600 * 24);
    if (daysOld >= 7) {
        return [];
    }

    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .order('date')
        .order('slot');

    if (error) throw error;
    return (data ?? []) as WeeklyPlanEntryRow[];
}

/**
 * Save a batch of weekly plan entries (replaces existing for the same week).
 */
export async function saveWeekPlan(
    userId: string,
    entries: Omit<WeeklyPlanEntryRow, 'id' | 'created_at'>[],
): Promise<WeeklyPlanEntryRow[]> {
    if (entries.length === 0) return [];

    const weekStart = entries[0].week_start_date;
    const endDate = new Date(`${weekStart}T00:00:00`);
    endDate.setDate(endDate.getDate() + 6);
    const weekEnd = formatLocalDate(endDate);

    const { data: preservedCompletedEntries, error: preservedCompletedError } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('status', 'completed');

    if (preservedCompletedError) throw preservedCompletedError;

    const preservedKeys = new Set(
        ((preservedCompletedEntries ?? []) as WeeklyPlanEntryRow[]).map((entry) => `${entry.date}::${entry.slot}`),
    );

    await supabase
        .from('weekly_plan_entries')
        .delete()
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .neq('status', 'completed');

    await supabase
        .from('scheduled_activities')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'engine')
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('status', 'scheduled');

    const entriesToInsert = entries.filter((entry) => !preservedKeys.has(`${entry.date}::${entry.slot}`));
    if (entriesToInsert.length === 0) {
        const { data: finalCompletedOnly, error: finalCompletedOnlyError } = await supabase
            .from('weekly_plan_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('date', weekStart)
            .lte('date', weekEnd)
            .order('date')
            .order('slot');

        if (finalCompletedOnlyError) throw finalCompletedOnlyError;
        return (finalCompletedOnly ?? []) as WeeklyPlanEntryRow[];
    }

    const baseInsertPayload = entriesToInsert.map((entry) => buildWeeklyPlanEntryInsertPayload(userId, entry));

    const withScheduledActivityPayload = entriesToInsert.map((e, index) => ({
        ...applyWeeklyPlanColumnCompatibility(baseInsertPayload[index]),
        scheduled_activity_id: e.scheduled_activity_id ?? null,
    }));

    let generatedEntries: WeeklyPlanEntryRow[] | null = null;

    if (hasScheduledActivityIdColumn !== false) {
        const { data, error } = await supabase
            .from('weekly_plan_entries')
            .insert(withScheduledActivityPayload)
            .select();

        if (error) {
            const missingScheduledActivityId = isMissingScheduledActivityIdColumnError(error);
            const missingWeeklyPlanMetadata = isMissingWeeklyPlanMetadataColumnError(error);

            if (missingScheduledActivityId || missingWeeklyPlanMetadata) {
                if (missingScheduledActivityId) {
                    hasScheduledActivityIdColumn = false;
                }
                if (missingWeeklyPlanMetadata) {
                    hasWeeklyPlanMetadataColumns = false;
                }
            } else {
                throw error;
            }
        } else {
            generatedEntries = (data ?? []) as WeeklyPlanEntryRow[];
            hasScheduledActivityIdColumn = true;
            hasWeeklyPlanMetadataColumns = true;
        }
    }

    if (!generatedEntries) {
        const payload = baseInsertPayload.map(applyWeeklyPlanColumnCompatibility);
        const { data, error } = await supabase
            .from('weekly_plan_entries')
            .insert(payload)
            .select();

        if (error) {
            const missingWeeklyPlanMetadata = isMissingWeeklyPlanMetadataColumnError(error);

            if (missingWeeklyPlanMetadata) {
                if (missingWeeklyPlanMetadata) hasWeeklyPlanMetadataColumns = false;
                const retry = await supabase
                    .from('weekly_plan_entries')
                    .insert(baseInsertPayload.map(applyWeeklyPlanColumnCompatibility))
                    .select();
                if (retry.error) throw retry.error;
                generatedEntries = (retry.data ?? []) as WeeklyPlanEntryRow[];
            } else {
                throw error;
            }
        } else {
            hasWeeklyPlanMetadataColumns = true;
            generatedEntries = (data ?? []) as WeeklyPlanEntryRow[];
        }
    }

    const insertedEntries = generatedEntries;

    let scheduledByEntryId = new Map<string, string>();
    const { data: existingScheduledActivities, error: existingScheduledActivitiesError } = await supabase
        .from('scheduled_activities')
        .select('id, date, activity_type')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .neq('source', 'engine')
        .eq('status', 'scheduled');

    if (existingScheduledActivitiesError) throw existingScheduledActivitiesError;

    const anchorActivityQueues = new Map<string, string[]>();
    for (const activity of (existingScheduledActivities ?? []) as Array<{
        id: string;
        date: string;
        activity_type: string;
    }>) {
        const key = `${activity.date}::${activity.activity_type}`;
        const current = anchorActivityQueues.get(key) ?? [];
        current.push(activity.id);
        anchorActivityQueues.set(key, current);
    }

    const entriesNeedingScheduledInsert: WeeklyPlanEntryRow[] = [];
    for (const entry of insertedEntries) {
        const anchorKey = `${entry.date}::${entry.session_type}`;
        const matchingAnchorId = anchorActivityQueues.get(anchorKey)?.shift();
        if (matchingAnchorId) {
            scheduledByEntryId.set(entry.id, matchingAnchorId);
            continue;
        }
        entriesNeedingScheduledInsert.push(entry);
    }

    if (hasScheduledActivitiesWeeklyPlanEntryIdColumn !== false && entriesNeedingScheduledInsert.length > 0) {
        const { data: scheduledActivities, error: scheduledError } = await supabase
            .from('scheduled_activities')
            .insert(entriesNeedingScheduledInsert.map((entry) => toScheduledActivityPayload(userId, entry)))
            .select('id, weekly_plan_entry_id');

        if (scheduledError) {
            if (isMissingScheduledActivitiesWeeklyPlanEntryIdColumnError(scheduledError)) {
                hasScheduledActivitiesWeeklyPlanEntryIdColumn = false;
            } else {
                throw scheduledError;
            }
        } else {
            hasScheduledActivitiesWeeklyPlanEntryIdColumn = true;
            scheduledByEntryId = new Map(
                ((scheduledActivities ?? []) as Array<{ id: string; weekly_plan_entry_id: string | null }>).
                    filter((activity) => Boolean(activity.weekly_plan_entry_id)).
                    map((activity) => [activity.weekly_plan_entry_id as string, activity.id]),
            );
        }
    }

    if (hasScheduledActivitiesWeeklyPlanEntryIdColumn === false && entriesNeedingScheduledInsert.length > 0) {
        const { error: scheduledFallbackError } = await supabase
            .from('scheduled_activities')
            .insert(
                entriesNeedingScheduledInsert.map((entry) =>
                    toScheduledActivityPayload(userId, entry, { includeWeeklyPlanEntryId: false }),
                ),
            )
            .select('id');

        if (scheduledFallbackError) throw scheduledFallbackError;
    }

    if (hasScheduledActivityIdColumn !== false) {
        try {
            await Promise.all(
                insertedEntries
                    .filter((entry) => scheduledByEntryId.has(entry.id))
                    .map((entry) => supabase
                        .from('weekly_plan_entries')
                        .update({ scheduled_activity_id: scheduledByEntryId.get(entry.id) })
                        .eq('id', entry.id)),
            );
            hasScheduledActivityIdColumn = true;
        } catch (error) {
            if (isMissingScheduledActivityIdColumnError(error)) {
                hasScheduledActivityIdColumn = false;
            } else {
                throw error;
            }
        }
    }

    const { data: finalEntries, error: finalEntriesError } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date')
        .order('slot');

    if (finalEntriesError) throw finalEntriesError;
    return (finalEntries ?? []) as WeeklyPlanEntryRow[];
}

/**
 * Mark a plan entry as completed, linking it to a workout log.
 */
export async function markDayCompleted(
    entryId: string,
    workoutLogId: string,
): Promise<void> {
    const scheduledActivityId = await getScheduledActivityIdForEntry(entryId);

    const { error } = await supabase
        .from('weekly_plan_entries')
        .update({ status: 'completed' as PlanEntryStatus, workout_log_id: workoutLogId })
        .eq('id', entryId);

    if (error) throw error;

    if (scheduledActivityId) {
        const { error: scheduledError } = await supabase
            .from('scheduled_activities')
            .update({ status: 'completed', recommendation_status: 'completed' })
            .eq('id', scheduledActivityId);
        if (scheduledError) throw scheduledError;
    }
}

/**
 * Mark a plan entry as skipped.
 */
export async function markDaySkipped(entryId: string): Promise<void> {
    const scheduledActivityId = await getScheduledActivityIdForEntry(entryId);

    const { error } = await supabase
        .from('weekly_plan_entries')
        .update({ status: 'skipped' as PlanEntryStatus })
        .eq('id', entryId);

    if (error) throw error;

    if (scheduledActivityId) {
        const { error: scheduledError } = await supabase
            .from('scheduled_activities')
            .update({ status: 'skipped', recommendation_status: 'declined' })
            .eq('id', scheduledActivityId);
        if (scheduledError) throw scheduledError;
    }
}

/**
 * Reschedule a missed day to a new date.
 */
export async function rescheduleMissedDay(
    entryId: string,
    newDate: string,
): Promise<void> {
    const scheduledActivityId = await getScheduledActivityIdForEntry(entryId);

    const { error } = await supabase
        .from('weekly_plan_entries')
        .update({
            status: 'rescheduled' as PlanEntryStatus,
            rescheduled_to: newDate,
        })
        .eq('id', entryId);

    if (error) throw error;

    if (scheduledActivityId) {
        const { error: scheduledError } = await supabase
            .from('scheduled_activities')
            .update({ date: newDate, status: 'scheduled', recommendation_status: 'declined' })
            .eq('id', scheduledActivityId);
        if (scheduledError) throw scheduledError;
    }
}

/**
 * Get plan entries that were missed (past date, still 'planned').
 */
export async function getMissedEntries(userId: string): Promise<WeeklyPlanEntryRow[]> {
    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'planned')
        .lt('date', today())
        .order('date');

    if (error) throw error;
    return (data ?? []) as WeeklyPlanEntryRow[];
}

/**
 * Get the most recent week start date that had a deload.
 */
export async function getLastDeloadWeekStart(userId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('week_start_date')
        .eq('user_id', userId)
        .eq('is_deload', true)
        .order('week_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data?.week_start_date ?? null;
}

/**
 * Get today's plan entry (if any).
 */
export async function getTodayPlanEntry(
    userId: string,
    slot?: string,
): Promise<WeeklyPlanEntryRow | null> {
    let q = supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today());

    if (slot) q = q.eq('slot', slot);

    const { data, error } = await q.limit(1).maybeSingle();

    if (error) throw error;
    return data as WeeklyPlanEntryRow | null;
}

export async function getWeeklyPlanEntryById(entryId: string): Promise<WeeklyPlanEntryRow | null> {
    const { data, error } = await supabase
        .from('weekly_plan_entries')
        .select('*')
        .eq('id', entryId)
        .maybeSingle();

    if (error) throw error;
    return data as WeeklyPlanEntryRow | null;
}

export async function updatePlanEntryPrescription(
    entryId: string,
    prescription: import('../engine/types').WorkoutPrescriptionV2,
): Promise<void> {
    const metadataPayload = {
        prescription_snapshot: prescription,
        sc_session_family: prescription.scSessionFamily ?? prescription.sessionPrescription?.sessionFamily ?? null,
        session_modules: prescription.sessionComposition ?? null,
        dose_credits: prescription.doseCredits ?? [],
        dose_summary: prescription.doseSummary ?? prescription.sessionPrescription?.dose ?? null,
        realized_dose_buckets: prescription.realizedBucket ? [prescription.realizedBucket] : [],
    };

    const { error } = await supabase
        .from('weekly_plan_entries')
        .update(applyWeeklyPlanColumnCompatibility(metadataPayload))
        .eq('id', entryId);

    if (error) {
        if (isMissingWeeklyPlanMetadataColumnError(error)) {
            hasWeeklyPlanMetadataColumns = false;
            const retry = await supabase
                .from('weekly_plan_entries')
                .update({ prescription_snapshot: prescription })
                .eq('id', entryId);
            if (retry.error) throw retry.error;
            return;
        }
        throw error;
    }

    hasWeeklyPlanMetadataColumns = true;
}

export async function restorePlanEntry(entryId: string): Promise<void> {
    const { error } = await supabase
        .from('weekly_plan_entries')
        .update({ status: 'planned' as PlanEntryStatus })
        .eq('id', entryId);
    if (error) throw error;
}

export async function regenerateDayWorkout(
    userId: string,
    entryId: string,
    overrideFocus?: import('../engine/types').WorkoutFocus,
): Promise<import('../engine/types').WorkoutPrescriptionV2> {
    const [entry, athleteCtx] = await Promise.all([
        getWeeklyPlanEntryById(entryId),
        import('./athleteContextService').then(m => m.getAthleteContext(userId)),
    ]);
    if (!entry) throw new Error('Plan entry not found');

    const [engineState, gymProfile, exerciseLibrary, recentExerciseIds, recentMuscleVolume] = await Promise.all([
        import('./dailyPerformanceService').then(m => m.getDailyEngineState(userId, entry.date)),
        import('./gymProfileService').then(m => m.getDefaultGymProfile(userId)),
        import('./scService').then(m => m.getExerciseLibrary()),
        import('./scService').then(m => m.getRecentExerciseIds(userId)),
        import('./scService').then(m => m.getRecentMuscleVolume(userId)),
    ]);
    const exerciseHistory = await import('./scService').then((m) =>
        m.getExerciseHistoryBatch(userId, exerciseLibrary.map((exercise) => exercise.id)),
    );
    if (exerciseLibrary.length === 0) {
        throw new Error('Exercise library is empty. Apply the S&C resource migration before regenerating guided workouts.');
    }

    const { generateWorkoutV2 } = await import('../engine/calculateSC');

    const prescription = generateWorkoutV2({
        readinessState: engineState.readinessState,
        readinessProfile: engineState.readinessProfile,
        constraintSet: engineState.constraintSet,
        phase: engineState.objectiveContext.phase,
        acwr: engineState.acwr.ratio,
        exerciseLibrary,
        recentExerciseIds,
        recentMuscleVolume,
        fitnessLevel: athleteCtx.fitnessLevel,
        weeklyPlanFocus: overrideFocus ?? entry.focus ?? undefined,
        availableMinutes: entry.estimated_duration_min,
        trainingIntensityCap: undefined,
        gymEquipment: gymProfile?.equipment ?? undefined,
        exerciseHistory,
        isDeloadWeek: entry.is_deload,
        trainingDate: entry.date,
        performanceGoalType: engineState.objectiveContext.performanceGoalType,
        medStatus: engineState.medStatus,
        sessionFamily: entry.session_family ?? undefined,
        scSessionFamily: entry.sc_session_family ?? entry.prescription_snapshot?.scSessionFamily ?? null,
        sessionModules: entry.session_modules ?? entry.prescription_snapshot?.sessionComposition ?? null,
    });

    await updatePlanEntryPrescription(entryId, prescription);
    return prescription;
}

export async function markRecommendationAccepted(entryId: string): Promise<void> {
    const scheduledActivityId = await getScheduledActivityIdForEntry(entryId);
    if (!scheduledActivityId) return;

    const { error } = await supabase
        .from('scheduled_activities')
        .update({ recommendation_status: 'accepted' })
        .eq('id', scheduledActivityId)
        .eq('recommendation_status', 'pending');

    if (error) throw error;
}
