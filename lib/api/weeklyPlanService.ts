import { supabase } from '../supabase';
import { WeeklyPlanConfigRow, WeeklyPlanEntryRow, PlanEntryStatus, AvailabilityWindow, DailyMission } from '../engine/types';
import { formatLocalDate, todayLocalDate } from '../utils/date';

const today = todayLocalDate;
let hasScheduledActivityIdColumn: boolean | null = null;
let hasScheduledActivitiesWeeklyPlanEntryIdColumn: boolean | null = null;
let hasDailyMissionSnapshotColumn: boolean | null = null;

function isMissingScheduledActivityIdColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    return maybe.code === 'PGRST204'
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

function isMissingDailyMissionSnapshotColumnError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const maybe = error as { code?: string; message?: string };
    return maybe.code === 'PGRST204'
        && typeof maybe.message === 'string'
        && maybe.message.includes('daily_mission_snapshot')
        && maybe.message.includes('weekly_plan_entries');
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

function toScheduledActivityPayload(
    userId: string,
    entry: Pick<
        WeeklyPlanEntryRow,
        | 'id'
        | 'date'
        | 'session_type'
        | 'focus'
        | 'estimated_duration_min'
        | 'target_intensity'
        | 'engine_notes'
        | 'status'
    >,
    options?: {
        includeWeeklyPlanEntryId?: boolean;
    },
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        user_id: userId,
        date: entry.date,
        activity_type: entry.session_type,
        expected_intensity: entry.target_intensity ?? 5,
        estimated_duration_min: entry.estimated_duration_min,
        engine_recommendation: entry.engine_notes,
        custom_label: entry.focus ? entry.focus.replace(/_/g, ' ') : null,
        source: 'engine',
        athlete_locked: false,
        session_kind: entry.session_type,
        intended_intensity: entry.target_intensity ?? null,
        recommendation_reason: entry.engine_notes,
        recommendation_severity: 'recommended',
        recommendation_affected_subsystem: 'schedule',
        recommendation_change: entry.focus ? `Focus on ${entry.focus.replace(/_/g, ' ')}` : 'Follow planned session',
        recommendation_education: 'This session is recommended based on your weekly context, readiness, and camp goals.',
        recommendation_status: 'pending',
        status: entry.status === 'planned' ? 'scheduled' : entry.status === 'rescheduled' ? 'scheduled' : entry.status,
    };

    if (options?.includeWeeklyPlanEntryId ?? true) {
        payload.weekly_plan_entry_id = entry.id ?? null;
    }

    return payload;
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
        available_days: normalizeDays(config.available_days, [1, 3, 5]),
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
        available_days: normalizeDays(saved.available_days, [1, 3, 5]),
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

    const baseInsertPayload = entriesToInsert.map((e) => ({
        user_id: userId,
        week_start_date: e.week_start_date,
        day_of_week: e.day_of_week,
        date: e.date,
        slot: e.slot,
        session_type: e.session_type,
        focus: e.focus,
        estimated_duration_min: e.estimated_duration_min,
        target_intensity: e.target_intensity,
        status: e.status,
        rescheduled_to: e.rescheduled_to,
        workout_log_id: e.workout_log_id,
        prescription_snapshot: e.prescription_snapshot,
        daily_mission_snapshot: e.daily_mission_snapshot ?? null,
        engine_notes: e.engine_notes,
        is_deload: e.is_deload,
    }));

    const insertPayloadWithoutMission = baseInsertPayload.map(({ daily_mission_snapshot: _daily_mission_snapshot, ...payload }) => payload);

    const withScheduledActivityPayload = entriesToInsert.map((e, index) => ({
        ...(hasDailyMissionSnapshotColumn === false ? insertPayloadWithoutMission[index] : baseInsertPayload[index]),
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
            const missingDailyMissionSnapshot = isMissingDailyMissionSnapshotColumnError(error);

            if (missingScheduledActivityId || missingDailyMissionSnapshot) {
                if (missingScheduledActivityId) {
                    hasScheduledActivityIdColumn = false;
                }
                if (missingDailyMissionSnapshot) {
                    hasDailyMissionSnapshotColumn = false;
                }
            } else {
                throw error;
            }
        } else {
            generatedEntries = (data ?? []) as WeeklyPlanEntryRow[];
            hasScheduledActivityIdColumn = true;
            hasDailyMissionSnapshotColumn = true;
        }
    }

    if (!generatedEntries) {
        const payload = hasDailyMissionSnapshotColumn === false ? insertPayloadWithoutMission : baseInsertPayload;
        const { data, error } = await supabase
            .from('weekly_plan_entries')
            .insert(payload)
            .select();

        if (error) {
            if (isMissingDailyMissionSnapshotColumnError(error)) {
                hasDailyMissionSnapshotColumn = false;
                const retry = await supabase
                    .from('weekly_plan_entries')
                    .insert(insertPayloadWithoutMission)
                    .select();
                if (retry.error) throw retry.error;
                generatedEntries = (retry.data ?? []) as WeeklyPlanEntryRow[];
            } else {
                throw error;
            }
        } else {
            hasDailyMissionSnapshotColumn = true;
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

export async function updateDailyMissionSnapshotsByDate(
    userId: string,
    snapshots: Array<{ date: string; mission: DailyMission }>,
): Promise<void> {
    if (hasDailyMissionSnapshotColumn === false || snapshots.length === 0) {
        return;
    }

    try {
        await Promise.all(
            snapshots.map(({ date, mission }) =>
                supabase
                    .from('weekly_plan_entries')
                    .update({ daily_mission_snapshot: mission })
                    .eq('user_id', userId)
                    .eq('date', date),
            ),
        );
        hasDailyMissionSnapshotColumn = true;
    } catch (error) {
        if (isMissingDailyMissionSnapshotColumnError(error)) {
            hasDailyMissionSnapshotColumn = false;
            return;
        }
        throw error;
    }
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




