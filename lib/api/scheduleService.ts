import { supabase } from '../supabase';
import {
    RecurringActivityRow,
    RecurrencePattern,
    ScheduledActivityRow,
    ActivityLogEntry,
    WeeklyTargetsRow,
    ActivityType,
    ComponentType,
    SessionComponent,
    ScheduleSource,
    WeeklyComplianceReport,
} from '../engine/types';
import { calculateWeeklyCompliance, getTrainingStreak, generateWeekPlan, adaptDailySchedule } from '../engine/calculateSchedule';
import { getFitnessProfile } from './fitnessService';
import { calculateACWR } from '../engine/calculateACWR';
import { getRecentExerciseIds, getExerciseLibrary } from './scService';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { getGlobalReadinessState } from '../engine/getGlobalReadinessState';
import { getActiveFightCamp, resolvePhaseForDate } from './fightCampService';

function today(): string {
    return todayLocalDate();
}

const DEFAULT_WEEKLY_TARGETS: Omit<WeeklyTargetsRow, 'id' | 'user_id'> = {
    sc_sessions: 2,
    running_sessions: 0,
    road_work_sessions: 2,
    boxing_sessions: 3,
    conditioning_sessions: 1,
    recovery_sessions: 1,
    total_weekly_load_cap: 4000,
};

export type SameDayOverrideType = 'lighter' | 'harder' | 'moved' | 'skipped' | 'completed';

export interface SameDayOverrideInput {
    type: SameDayOverrideType;
    start_time?: string | null;
    estimated_duration_min?: number;
    actual_duration_min?: number;
    actual_rpe?: number;
    notes?: string;
}

/**
 * Fetch the user's recurring activities.
 */
export async function getRecurringActivities(userId: string): Promise<RecurringActivityRow[]> {
    const { data, error } = await supabase
        .from('recurring_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) throw error;
    return (data ?? []) as RecurringActivityRow[];
}

/**
 * Add or update a recurring activity.
 */
export async function upsertRecurringActivity(
    userId: string,
    entry: {
        id?: string;
        activity_type: ActivityType;
        custom_label?: string | null;
        start_time?: string;
        estimated_duration_min?: number;
        expected_intensity?: number;
        session_components?: SessionComponent[];
        recurrence: RecurrencePattern;
    },
): Promise<RecurringActivityRow> {
    const row = {
        user_id: userId,
        activity_type: entry.activity_type,
        custom_label: entry.custom_label ?? null,
        start_time: entry.start_time ?? null,
        estimated_duration_min: entry.estimated_duration_min ?? 60,
        expected_intensity: entry.expected_intensity ?? 5,
        session_components: entry.session_components ?? [],
        recurrence: entry.recurrence,
        session_kind: entry.session_kind ?? null,
        rounds: entry.rounds ?? null,
        round_duration_sec: entry.round_duration_sec ?? null,
        rest_duration_sec: entry.rest_duration_sec ?? null,
        constraint_tier: entry.constraint_tier ?? 'mandatory',
        is_active: true,
        ...(entry.id ? { id: entry.id } : {}),
    };

    const { data, error } = await supabase
        .from('recurring_activities')
        .upsert(row)
        .select()
        .single();

    if (error) throw error;
    return data as RecurringActivityRow;
}

/**
 * Remove a recurring activity (soft-delete via is_active = false)
 * and optionally remove future scheduled instances.
 */
export async function removeRecurringActivity(
    entryId: string,
    deleteFutureInstances: boolean = true
): Promise<void> {
    const { error } = await supabase
        .from('recurring_activities')
        .update({ is_active: false })
        .eq('id', entryId);

    if (error) throw error;

    if (deleteFutureInstances) {
        const todayStr = today();
        const { error: delError } = await supabase
            .from('scheduled_activities')
            .delete()
            .eq('recurring_activity_id', entryId)
            .gte('date', todayStr)
            .eq('status', 'scheduled'); // Only delete if not already completed/skipped

        if (delError) {
            console.warn('Failed to delete future scheduled instances', delError);
        }
    }
}


/**
 * Generate scheduled activities up to `weeksAhead` weeks in the future.
 */
export async function replaceRecurringActivities(
    userId: string,
    entries: Array<{
        activity_type: ActivityType;
        custom_label?: string | null;
        start_time?: string;
        estimated_duration_min?: number;
        expected_intensity?: number;
        session_components?: SessionComponent[];
        recurrence: RecurrencePattern;
    }>,
): Promise<RecurringActivityRow[]> {
    const { error } = await supabase
        .from('recurring_activities')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) throw error;

    const saved: RecurringActivityRow[] = [];
    for (const entry of entries) {
        saved.push(await upsertRecurringActivity(userId, entry));
    }

    return saved;
}
export async function generateRollingSchedule(
    userId: string,
    weeksAhead: number = 4
): Promise<ScheduledActivityRow[]> {
    const templates = await getRecurringActivities(userId);
    if (templates.length === 0) return [];

    const now = new Date();
    // Start generating from today
    const startDateStr = today();

    // End date is weeksAhead weeks from today
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (weeksAhead * 7));
    const endDateStr = formatLocalDate(endDate);

    const rowsToInsert: any[] = [];

    // Group templates by frequency for easier processing
    const dailyActivities = templates.filter(t => t.recurrence.frequency === 'daily');
    const weeklyActivities = templates.filter(t => t.recurrence.frequency === 'weekly');
    const monthlyActivities = templates.filter(t => t.recurrence.frequency === 'monthly');

    // Generate dates from startDate to endDate
    let currentDate = new Date(startDateStr + 'T00:00:00');
    let maxDate = new Date(endDateStr + 'T00:00:00');

    while (currentDate <= maxDate) {
        const dateStr = formatLocalDate(currentDate);
        const dayOfWeek = currentDate.getDay();
        const dateOfMonth = currentDate.getDate();

        // 1. Daily
        for (const tmpl of dailyActivities) {
            rowsToInsert.push(createScheduledObj(tmpl, dateStr));
        }

        // 2. Weekly
        for (const tmpl of weeklyActivities) {
            const days = tmpl.recurrence.days_of_week || [];
            if (days.includes(dayOfWeek)) {
                // simple interval handling can be added here
                rowsToInsert.push(createScheduledObj(tmpl, dateStr));
            }
        }

        // 3. Monthly
        for (const tmpl of monthlyActivities) {
            if (tmpl.recurrence.day_of_month === dateOfMonth) {
                rowsToInsert.push(createScheduledObj(tmpl, dateStr));
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    if (rowsToInsert.length === 0) return [];

    // Fetch existing up to endDate to avoid duplicate generation
    const { data: existing } = await supabase
        .from('scheduled_activities')
        .select('date, recurring_activity_id')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .not('recurring_activity_id', 'is', null);

    const existingSet = new Set(
        (existing ?? []).map((e: any) => `${e.date}|${e.recurring_activity_id}`),
    );

    const newRows = rowsToInsert.filter(
        r => !existingSet.has(`${r.date}|${r.recurring_activity_id}`),
    );

    if (newRows.length === 0) return [];

    const { data, error } = await supabase
        .from('scheduled_activities')
        .insert(newRows)
        .select();

    if (error) throw error;
    return (data ?? []) as ScheduledActivityRow[];
}

function createScheduledObj(tmpl: RecurringActivityRow, dateStr: string) {
    return {
        user_id: tmpl.user_id,
        recurring_activity_id: tmpl.id,
        date: dateStr,
        activity_type: tmpl.activity_type,
        custom_label: tmpl.custom_label,
        start_time: tmpl.start_time,
        estimated_duration_min: tmpl.estimated_duration_min,
        expected_intensity: tmpl.expected_intensity,
        session_components: tmpl.session_components,
        session_kind: tmpl.session_kind ?? null,
        rounds: tmpl.rounds ?? null,
        round_duration_sec: tmpl.round_duration_sec ?? null,
        rest_duration_sec: tmpl.rest_duration_sec ?? null,
        athlete_locked: tmpl.athlete_locked ?? true,
        intended_intensity: tmpl.intended_intensity ?? null,
        constraint_tier: tmpl.constraint_tier ?? 'mandatory',
        source: 'template' as ScheduleSource,
        status: 'scheduled',
    };
}

/**
 * Fetch scheduled activities for a date range.
 */
export async function getScheduledActivities(
    userId: string,
    startDate: string,
    endDate: string,
): Promise<ScheduledActivityRow[]> {
    const { data, error } = await supabase
        .from('scheduled_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ScheduledActivityRow[];
}

/**
 * Add a manual (one-off) scheduled activity.
 */
export async function addManualActivity(
    userId: string,
    activity: {
        date: string;
        activity_type: ActivityType;
        custom_label?: string | null;
        start_time?: string;
        estimated_duration_min?: number;
        expected_intensity?: number;
        session_components?: SessionComponent[];
        session_kind?: string;
        rounds?: number;
        round_duration_sec?: number;
        rest_duration_sec?: number;
        athlete_locked?: boolean;
        intended_intensity?: number;
        constraint_tier?: 'mandatory' | 'preferred';
        notes?: string;
    },
): Promise<ScheduledActivityRow> {
    const { data, error } = await supabase
        .from('scheduled_activities')
        .insert({
            user_id: userId,
            date: activity.date,
            activity_type: activity.activity_type,
            custom_label: activity.custom_label ?? null,
            start_time: activity.start_time ?? null,
            estimated_duration_min: activity.estimated_duration_min ?? 60,
            expected_intensity: activity.expected_intensity ?? 5,
            session_components: activity.session_components ?? [],
            session_kind: activity.session_kind ?? null,
            rounds: activity.rounds ?? null,
            round_duration_sec: activity.round_duration_sec ?? null,
            rest_duration_sec: activity.rest_duration_sec ?? null,
            athlete_locked: activity.athlete_locked ?? true,
            intended_intensity: activity.intended_intensity ?? null,
            notes: activity.notes ?? null,
            source: 'manual' as ScheduleSource,
            recurring_activity_id: null,
            status: 'scheduled',
        })
        .select()
        .single();

    if (error) throw error;
    return data as ScheduledActivityRow;
}

/**
 * Update a scheduled activity.
 * If updateType is 'future' and it's a recurring activity, also update the template and all future instances.
 */
export async function updateScheduledActivity(
    userId: string,
    activityId: string,
    updates: Partial<Pick<ScheduledActivityRow,
        'custom_label' | 'start_time' | 'estimated_duration_min' |
        'expected_intensity' | 'session_components' | 'status' |
        'actual_duration_min' | 'actual_rpe' | 'notes' | 'engine_recommendation'
    >>,
    recurringActivityId?: string | null,
    updateType: 'single' | 'future' = 'single'
): Promise<void> {
    if (updateType === 'future' && recurringActivityId) {
        // 1. Update the template
        const { error: tmplError } = await supabase
            .from('recurring_activities')
            .update({
                custom_label: updates.custom_label,
                start_time: updates.start_time,
                estimated_duration_min: updates.estimated_duration_min,
                expected_intensity: updates.expected_intensity,
                session_components: updates.session_components,
            })
            .eq('id', recurringActivityId)
            .eq('user_id', userId);

        if (tmplError) throw tmplError;

        // 2. Update this and future scheduled activities
        const { data: activity } = await supabase
            .from('scheduled_activities')
            .select('date')
            .eq('id', activityId)
            .maybeSingle();
        const activityDate = activity?.date ?? null;
        if (activityDate) {
            const { error: bulkUpdateError } = await supabase
                .from('scheduled_activities')
                .update({
                    custom_label: updates.custom_label,
                    start_time: updates.start_time,
                    estimated_duration_min: updates.estimated_duration_min,
                    expected_intensity: updates.expected_intensity,
                    session_components: updates.session_components,
                })
                .eq('recurring_activity_id', recurringActivityId)
                .eq('user_id', userId)
                .gte('date', activityDate)
                .eq('status', 'scheduled');

            if (bulkUpdateError) throw bulkUpdateError;
        }
    } else {
        // Just update single activity
        const { error } = await supabase
            .from('scheduled_activities')
            .update(updates)
            .eq('id', activityId)
            .eq('user_id', userId);

        if (error) throw error;
    }
}


/**
 */
export async function applySameDayOverride(
    userId: string,
    activity: ScheduledActivityRow,
    input: SameDayOverrideInput,
): Promise<void> {
    if (input.type === 'lighter' || input.type === 'harder') {
        const delta = input.type === 'lighter' ? -2 : 2;
        const nextIntensity = Math.max(1, Math.min(10, (activity.expected_intensity ?? 5) + delta));
        await updateScheduledActivity(
            userId,
            activity.id,
            {
                expected_intensity: nextIntensity,
                notes: input.notes ?? activity.notes ?? null,
            },
            activity.recurring_activity_id,
            'single',
        );
        return;
    }

    if (input.type === 'moved') {
        await updateScheduledActivity(
            userId,
            activity.id,
            {
                start_time: input.start_time ?? activity.start_time ?? null,
                estimated_duration_min: input.estimated_duration_min ?? activity.estimated_duration_min,
                notes: input.notes ?? activity.notes ?? null,
            },
            activity.recurring_activity_id,
            'single',
        );
        return;
    }

    if (input.type === 'skipped') {
        await skipActivity(userId, activity.id, input.notes);
        return;
    }

    if (input.type === 'completed') {
        await completeActivity(userId, activity.id, {
            actual_duration_min: input.actual_duration_min ?? activity.estimated_duration_min,
            actual_rpe: input.actual_rpe ?? activity.expected_intensity,
            notes: input.notes,
            components: [],
        });
    }
}

export async function completeActivity(
    userId: string,
    activityId: string,
    log: {
        actual_duration_min: number;
        actual_rpe: number;
        notes?: string;
        constraint_tier?: 'mandatory' | 'preferred';
        components: {
            component_type: ComponentType;
            duration_min: number;
            distance_miles?: number;
            pace_per_mile?: string;
            rounds?: number;
            intensity: number;
            heart_rate_avg?: number;
            notes?: string;
            constraint_tier?: 'mandatory' | 'preferred';
        }[];
    },
): Promise<void> {
    // 1. Update the scheduled activity
    const { error: updateError } = await supabase
        .from('scheduled_activities')
        .update({
            status: 'completed',
            actual_duration_min: log.actual_duration_min,
            actual_rpe: log.actual_rpe,
            notes: log.notes ?? null,
            recommendation_status: 'completed',
        })
        .eq('id', activityId)
        .eq('user_id', userId);

    if (updateError) throw updateError;

    // 2. Get the activity date
    const { data: activity } = await supabase
        .from('scheduled_activities')
        .select('date')
        .eq('id', activityId)
        .single();

    const activityDate = activity?.date ?? today();

    // 3. Insert component logs
    if (log.components.length > 0) {
        const componentRows = log.components.map(c => ({
            scheduled_activity_id: activityId,
            user_id: userId,
            date: activityDate,
            component_type: c.component_type,
            duration_min: c.duration_min,
            distance_miles: c.distance_miles ?? null,
            pace_per_mile: c.pace_per_mile ?? null,
            rounds: c.rounds ?? null,
            intensity: c.intensity,
            heart_rate_avg: c.heart_rate_avg ?? null,
            notes: c.notes ?? null,
        }));

        const { error: logError } = await supabase
            .from('activity_log')
            .insert(componentRows);

        if (logError) throw logError;
    }
    // 4. Also insert into training_sessions for ACWR calculation
    const { error: sessionError } = await supabase
        .from('training_sessions')
        .insert({
            user_id: userId,
            date: activityDate,
            duration_minutes: log.actual_duration_min,
            intensity_srpe: log.actual_rpe,
        });

    if (sessionError) {
        console.warn('Could not insert training_sessions row:', sessionError.message);
    }
}

/**
 * Skip an activity.
 */
export async function skipActivity(
    userId: string,
    activityId: string,
    reason?: string,
): Promise<void> {
    const { error } = await supabase
        .from('scheduled_activities')
        .update({
            status: 'skipped',
            notes: reason ?? null,
            recommendation_status: 'declined',
        })
        .eq('id', activityId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Fetch activity component logs for a specific activity.
 */
export async function getActivityLog(
    userId: string,
    activityId: string,
): Promise<ActivityLogEntry[]> {
    const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_activity_id', activityId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as ActivityLogEntry[];
}


/**
 * Get the user's weekly training targets.
 */
export async function getWeeklyTargets(userId: string): Promise<WeeklyTargetsRow> {
    const row = await fetchWeeklyTargetsRow(userId);

    if (!row) {
        return {
            id: 'default',
            user_id: userId,
            ...DEFAULT_WEEKLY_TARGETS,
        };
    }

    return row;
}

/**
 * Update or create weekly targets.
 */
export async function updateWeeklyTargets(
    userId: string,
    targets: Partial<Omit<WeeklyTargetsRow, 'id' | 'user_id'>>,
): Promise<WeeklyTargetsRow> {
    const existing = await fetchWeeklyTargetsRow(userId);

    if (existing) {
        const { data, error } = await supabase
            .from('weekly_targets')
            .update(targets)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        return data as WeeklyTargetsRow;
    }

    const { data, error } = await supabase
        .from('weekly_targets')
        .insert({ user_id: userId, ...DEFAULT_WEEKLY_TARGETS, ...targets })
        .select()
        .single();
    if (error) throw error;
    return data as WeeklyTargetsRow;
}

