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
    DailyAdaptationResult,
    MuscleGroup,
} from '../engine/types';
import { calculateWeeklyCompliance, getTrainingStreak, adaptDailySchedule } from '../engine/calculateSchedule';
import { generateAdaptiveSmartWeekPlan } from '../engine/adaptiveTrainingAdapter';
import { getRecentExerciseIds, getExerciseLibrary, getRecentMuscleVolume, getExerciseHistoryBatch } from './scService';
import { formatLocalDate, todayLocalDate } from '../utils/date';
import { getActiveFightCamp } from './fightCampService';
import { getAthleteContext } from './athleteContextService';
import { getDefaultGymProfile } from './gymProfileService';
import { getWeeksSinceLastDeload } from './overloadService';
import { getWeeklyPlanConfig, saveWeekPlan } from './weeklyPlanService';
import { getActiveWeightClassPlan } from './weightClassPlanService';
import { logWarn } from '../utils/logger';
import { isGuidedEngineActivityType } from '../engine/sessionOwnership';
import { withEngineInvalidation } from './engineInvalidation';

function today(): string {
    return todayLocalDate();
}

function addDays(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
}

async function loadDailyEngineState(userId: string, date: string) {
    const { getDailyEngineState } = await import('./dailyPerformanceService');
    return getDailyEngineState(userId, date);
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

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
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

export type SameDayOverrideType = 'lighter' | 'harder' | 'moved' | 'skipped' | 'completed';

export interface SameDayOverrideInput {
    type: SameDayOverrideType;
    start_time?: string | null;
    estimated_duration_min?: number;
    actual_duration_min?: number;
    actual_rpe?: number;
    notes?: string | undefined;
}

type RecurringActivityInput = {
    id?: string;
    activity_type: ActivityType;
    custom_label?: string | null;
    start_time?: string;
    estimated_duration_min?: number;
    expected_intensity?: number;
    session_components?: SessionComponent[];
    recurrence: RecurrencePattern;
    session_kind?: string | null;
    rounds?: number | null;
    round_duration_sec?: number | null;
    rest_duration_sec?: number | null;
    athlete_locked?: boolean;
    intended_intensity?: number | null;
    constraint_tier?: 'mandatory' | 'preferred';
};

function getRollingScheduleWindow(
    startDateStr: string = today(),
    weeksAhead: number = 4,
): { startDateStr: string; endDateStr: string } {
    return {
        startDateStr,
        endDateStr: addDays(startDateStr, weeksAhead * 7),
    };
}

function getRecurringActivityScheduleDates(
    tmpl: RecurringActivityRow,
    startDateStr: string,
    endDateStr: string,
): string[] {
    const dates: string[] = [];
    const currentDate = new Date(`${startDateStr}T00:00:00`);
    const maxDate = new Date(`${endDateStr}T00:00:00`);

    while (currentDate <= maxDate) {
        const dateStr = formatLocalDate(currentDate);
        const dayOfWeek = currentDate.getDay();
        const dateOfMonth = currentDate.getDate();

        if (tmpl.recurrence.frequency === 'daily') {
            dates.push(dateStr);
        }

        if (
            tmpl.recurrence.frequency === 'weekly'
            && (tmpl.recurrence.days_of_week || []).includes(dayOfWeek)
        ) {
            dates.push(dateStr);
        }

        if (
            tmpl.recurrence.frequency === 'monthly'
            && tmpl.recurrence.day_of_month === dateOfMonth
        ) {
            dates.push(dateStr);
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
}

function getExpectedRecurringScheduleKeys(
    templates: RecurringActivityRow[],
    startDateStr: string,
    endDateStr: string,
): Set<string> {
    const keys = new Set<string>();

    for (const tmpl of templates) {
        for (const dateStr of getRecurringActivityScheduleDates(tmpl, startDateStr, endDateStr)) {
            keys.add(`${dateStr}|${tmpl.id}`);
        }
    }

    return keys;
}

async function insertScheduledActivities(
    rows: Record<string, unknown>[],
): Promise<ScheduledActivityRow[]> {
    const { data, error } = await supabase
        .from('scheduled_activities')
        .insert(rows)
        .select();

    if (error) throw error;
    return (data ?? []) as ScheduledActivityRow[];
}

async function insertScheduledActivity(
    row: Record<string, unknown>,
): Promise<ScheduledActivityRow> {
    const { data, error } = await supabase
        .from('scheduled_activities')
        .insert(row)
        .select()
        .single();

    if (error) throw error;
    if (!data) {
        throw new Error('Failed to insert scheduled activity.');
    }
    return data as unknown as ScheduledActivityRow;
}

async function updateScheduledActivities(
    payload: Record<string, unknown>,
    execute: (nextPayload: Record<string, unknown>) => PromiseLike<{ error?: unknown }>,
): Promise<void> {
    const { error } = await execute(payload);

    if (error) throw error;
}

async function getScheduledActivityMutationContext(
    userId: string,
    activityId: string,
): Promise<{ date: string | null }> {
    const { data, error } = await supabase
        .from('scheduled_activities')
        .select('date')
        .eq('id', activityId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return { date: data?.date ?? null };
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
    entry: RecurringActivityInput,
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
    if (!data) {
        throw new Error('Failed to save recurring activity.');
    }
    return data as unknown as RecurringActivityRow;
}

/**
 * Remove a recurring activity (soft-delete via is_active = false)
 * and optionally remove future scheduled instances.
 */
export async function removeRecurringActivity(
    entryId: string,
    deleteFutureInstances: boolean = true
): Promise<void> {
    const { data: template, error: templateError } = await supabase
        .from('recurring_activities')
        .select('user_id')
        .eq('id', entryId)
        .maybeSingle();

    if (templateError) throw templateError;

    const mutation = async () => {
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
                logWarn('scheduleService.deleteFutureScheduledInstances', delError);
            }
        }
    };

    if (!template?.user_id) {
        await mutation();
        return;
    }

    return withEngineInvalidation({ userId: template.user_id, reason: 'recurring_activity_remove' }, mutation);
}


/**
 * Generate scheduled activities up to `weeksAhead` weeks in the future.
 */
export async function replaceRecurringActivities(
    userId: string,
    entries: RecurringActivityInput[],
): Promise<RecurringActivityRow[]> {
    return withEngineInvalidation({ userId, reason: 'recurring_activities_replace' }, async () => {
        const { data: existingActiveTemplates, error: existingActiveTemplatesError } = await supabase
            .from('recurring_activities')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (existingActiveTemplatesError) throw existingActiveTemplatesError;

        const existingTemplateIds = ((existingActiveTemplates ?? []) as Array<{ id: string }>).map((row) => row.id);
        if (existingTemplateIds.length > 0) {
            const { error: deleteScheduledError } = await supabase
                .from('scheduled_activities')
                .delete()
                .eq('user_id', userId)
                .gte('date', today())
                .eq('status', 'scheduled')
                .in('recurring_activity_id', existingTemplateIds);

            if (deleteScheduledError) throw deleteScheduledError;
        }

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
    });
}
export async function generateRollingSchedule(
    userId: string,
    startDate: string = today(),
    weeksAhead: number = 4
): Promise<ScheduledActivityRow[]> {
    const templates = await getRecurringActivities(userId);
    if (templates.length === 0) return [];

    const { startDateStr, endDateStr } = getRollingScheduleWindow(startDate, weeksAhead);

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
    const { data: existing, error: existingError } = await supabase
        .from('scheduled_activities')
        .select('date, recurring_activity_id')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .not('recurring_activity_id', 'is', null);

    if (existingError) throw existingError;

    const existingSet = new Set(
        (existing ?? []).map((e: any) => `${e.date}|${e.recurring_activity_id}`),
    );

    const newRows = rowsToInsert.filter(
        r => !existingSet.has(`${r.date}|${r.recurring_activity_id}`),
    );

    if (newRows.length === 0) return [];

    return withEngineInvalidation({ userId, reason: 'rolling_schedule_generate' }, () =>
        insertScheduledActivities(newRows),
    );
}

export async function ensureRollingScheduleFresh(
    userId: string,
    startDate: string = today(),
    weeksAhead: number = 4,
): Promise<ScheduledActivityRow[]> {
    const templates = await getRecurringActivities(userId);
    if (templates.length === 0) return [];

    const { startDateStr, endDateStr } = getRollingScheduleWindow(startDate, weeksAhead);
    const expectedKeys = getExpectedRecurringScheduleKeys(templates, startDateStr, endDateStr);
    if (expectedKeys.size === 0) return [];

    const { data: existing, error } = await supabase
        .from('scheduled_activities')
        .select('date, recurring_activity_id')
        .eq('user_id', userId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .not('recurring_activity_id', 'is', null);

    if (error) throw error;

    const existingKeys = new Set(
        ((existing ?? []) as Array<{ date: string; recurring_activity_id: string | null }>).
            filter((row) => Boolean(row.recurring_activity_id)).
            map((row) => `${row.date}|${row.recurring_activity_id}`),
    );
    const hasMissingEntry = Array.from(expectedKeys).some((key) => !existingKeys.has(key));

    if (!hasMissingEntry) return [];

    return generateRollingSchedule(userId, startDate, weeksAhead);
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

function dedupeScheduledActivities(rows: ScheduledActivityRow[]): ScheduledActivityRow[] {
    const deduped = new Map<string, ScheduledActivityRow>();

    for (const row of rows) {
        const key = row.source === 'template'
            ? [
                row.date,
                row.activity_type,
                row.custom_label ?? '',
                row.start_time ?? '',
                row.estimated_duration_min,
                row.expected_intensity,
                row.session_kind ?? '',
                row.rounds ?? '',
                row.round_duration_sec ?? '',
                row.rest_duration_sec ?? '',
                row.status,
            ].join('::')
            : row.id;

        if (!deduped.has(key)) {
            deduped.set(key, row);
        }
    }

    return Array.from(deduped.values());
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
    return dedupeScheduledActivities((data ?? []) as ScheduledActivityRow[]);
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
        notes?: string | undefined;
    },
): Promise<ScheduledActivityRow> {
    if (isGuidedEngineActivityType(activity.activity_type)) {
        throw new Error('Engine-managed S&C and conditioning sessions must come from the centralized planner.');
    }

    return withEngineInvalidation({ userId, date: activity.date, reason: 'activity_add' }, () =>
        insertScheduledActivity({
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
        }),
    );
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
    const context = await getScheduledActivityMutationContext(userId, activityId);
    const invalidationInput = updateType === 'future' && recurringActivityId
        ? { userId, reason: 'activity_future_update' }
        : { userId, date: context.date ?? undefined, reason: 'activity_update' };

    return withEngineInvalidation(invalidationInput, async () => {
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
            if (context.date) {
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
                    .gte('date', context.date)
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
    });
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
        notes?: string | undefined;
        constraint_tier?: 'mandatory' | 'preferred' | undefined;
        components: {
            component_type: ComponentType;
            duration_min: number;
            distance_miles?: number | undefined;
            pace_per_mile?: string | undefined;
            rounds?: number | undefined;
            intensity: number;
            heart_rate_avg?: number | undefined;
            notes?: string | undefined;
            constraint_tier?: 'mandatory' | 'preferred' | undefined;
        }[];
    },
): Promise<void> {
    const context = await getScheduledActivityMutationContext(userId, activityId);

    return withEngineInvalidation({ userId, date: context.date ?? undefined, reason: 'activity_complete' }, async () => {
        const { error } = await supabase.rpc('complete_scheduled_activity', {
            p_user_id: userId,
            p_activity_id: activityId,
            p_actual_duration_min: log.actual_duration_min,
            p_actual_rpe: log.actual_rpe,
            p_notes: log.notes ?? null,
            p_components: log.components,
        });

        if (error) throw error;
    });
}

/**
 * Skip an activity.
 */
export async function skipActivity(
    userId: string,
    activityId: string,
    reason?: string,
): Promise<void> {
    return withEngineInvalidation({ userId, reason: 'activity_skip' }, async () => {
        await updateScheduledActivities(
            {
                status: 'skipped',
                notes: reason ?? null,
                recommendation_status: 'declined',
            },
            (nextPayload) => supabase
                .from('scheduled_activities')
                .update(nextPayload)
                .eq('id', activityId)
                .eq('user_id', userId),
        );
    });
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

async function fetchWeeklyTargetsRow(userId: string): Promise<WeeklyTargetsRow | null> {
    const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return (data as WeeklyTargetsRow | null) ?? null;
}

export async function getTrainingStreakDays(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(60);

    if (error) throw error;

    return getTrainingStreak(
        ((data ?? []) as Array<{ date: string | null }>).
            map((row) => row.date).
            filter((date): date is string => Boolean(date)),
    );
}

export async function getWeeklyReview(
    userId: string,
    weekStartDate: string,
): Promise<WeeklyComplianceReport> {
    const weekEndDate = addDays(weekStartDate, 6);

    const [plannedResult, actualResult, streak] = await Promise.all([
        supabase
            .from('scheduled_activities')
            .select('activity_type, expected_intensity, estimated_duration_min')
            .eq('user_id', userId)
            .gte('date', weekStartDate)
            .lte('date', weekEndDate),
        supabase
            .from('scheduled_activities')
            .select('activity_type, status, actual_rpe, actual_duration_min, expected_intensity, estimated_duration_min')
            .eq('user_id', userId)
            .gte('date', weekStartDate)
            .lte('date', weekEndDate),
        getTrainingStreakDays(userId),
    ]);

    if (plannedResult.error) throw plannedResult.error;
    if (actualResult.error) throw actualResult.error;

    return calculateWeeklyCompliance(
        (plannedResult.data ?? []) as Pick<ScheduledActivityRow, 'activity_type' | 'expected_intensity' | 'estimated_duration_min'>[],
        (actualResult.data ?? []) as Pick<ScheduledActivityRow, 'activity_type' | 'status' | 'actual_rpe' | 'actual_duration_min' | 'expected_intensity' | 'estimated_duration_min'>[],
        streak,
    );
}

export async function getDailyAdaptationForToday(userId: string): Promise<DailyAdaptationResult | null> {
    const todayStr = today();
    const yesterdayStr = addDays(todayStr, -1);
    const athleteContext = await getAthleteContext(userId);
    const [todayActivities, yesterdayActivities, checkinResult, campConfig, exerciseLibrary, engineState] = await Promise.all([
        getScheduledActivities(userId, todayStr, todayStr),
        getScheduledActivities(userId, yesterdayStr, yesterdayStr),
        supabase
            .from('daily_checkins')
            .select('sleep_quality, readiness')
            .eq('user_id', userId)
            .eq('date', todayStr)
            .maybeSingle(),
        getActiveFightCamp(userId),
        getExerciseLibrary(),
        loadDailyEngineState(userId, todayStr),
    ]);

    return adaptDailySchedule({
        today: todayStr,
        todayActivities,
        yesterdayActivities,
        readinessState: engineState.readinessState,
        acwr: engineState.acwr.ratio,
        sleepLastNight: checkinResult.data?.sleep_quality ?? 4,
        fitnessLevel: athleteContext.fitnessLevel,
        phase: engineState.objectiveContext.phase,
        campConfig,
        trainingIntensityCap: null,
        exerciseLibrary,
    });
}

export async function syncEngineSchedule(userId: string, weekStartDate: string): Promise<void> {
    const [config, athleteContext, campConfig, weeksSinceLastDeload, recurringActivities, gymProfile, exerciseLibrary, recentExerciseIds, recentMuscleVolume] = await Promise.all([
        getWeeklyPlanConfig(userId),
        getAthleteContext(userId),
        getActiveFightCamp(userId),
        getWeeksSinceLastDeload(userId),
        getRecurringActivities(userId),
        getDefaultGymProfile(userId),
        getExerciseLibrary(),
        getRecentExerciseIds(userId),
        getRecentMuscleVolume(userId),
    ]);

    if (!config) return;
    if (!gymProfile) {
        throw new Error('Create a default gym profile before generating a workout plan.');
    }

    const activeWeightClassPlan = await getActiveWeightClassPlan(userId);

    const engineState = await loadDailyEngineState(userId, today());
    const exerciseHistory = await getExerciseHistoryBatch(
        userId,
        exerciseLibrary.map((exercise) => exercise.id),
    );

    const result = generateAdaptiveSmartWeekPlan({
        config,
        readinessState: engineState.readinessState,
        phase: athleteContext.phase,
        acwr: engineState.acwr.ratio,
        fitnessLevel: athleteContext.fitnessLevel,
        performanceGoalType: athleteContext.performanceGoalType,
        exerciseLibrary,
        exerciseHistory,
        recentExerciseIds,
        recentMuscleVolume: recentMuscleVolume ?? { ...EMPTY_VOLUME },
        campConfig,
        activeWeightClassPlan,
        weeksSinceLastDeload,
        gymProfile,
        weekStartDate,
        recurringActivities,
    });

    await saveWeekPlan(userId, result.entries);
}
