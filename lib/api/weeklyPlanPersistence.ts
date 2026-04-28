import type { WeeklyPlanEntryRow } from '../engine/types';

export function buildWeeklyPlanEntryInsertPayload(
    userId: string,
    e: Omit<WeeklyPlanEntryRow, 'id' | 'created_at'>,
): Record<string, unknown> {
    return {
        user_id: userId,
        week_start_date: e.week_start_date,
        day_of_week: e.day_of_week,
        date: e.date,
        slot: e.slot,
        day_order: e.day_order ?? null,
        session_type: e.session_type,
        focus: e.focus,
        session_family: e.session_family ?? null,
        sc_session_family: e.sc_session_family ?? e.prescription_snapshot?.scSessionFamily ?? e.prescription_snapshot?.sessionPrescription?.sessionFamily ?? null,
        placement_source: e.placement_source ?? null,
        progression_intent: e.progression_intent ?? null,
        carry_forward_reason: e.carry_forward_reason ?? null,
        session_modules: e.session_modules ?? e.prescription_snapshot?.sessionComposition ?? null,
        dose_credits: e.dose_credits ?? e.prescription_snapshot?.doseCredits ?? [],
        dose_summary: e.dose_summary ?? e.prescription_snapshot?.doseSummary ?? e.prescription_snapshot?.sessionPrescription?.dose ?? null,
        realized_dose_buckets: e.realized_dose_buckets ?? [],
        estimated_duration_min: e.estimated_duration_min,
        target_intensity: e.target_intensity,
        status: e.status,
        rescheduled_to: e.rescheduled_to,
        workout_log_id: e.workout_log_id,
        prescription_snapshot: e.prescription_snapshot,
        engine_notes: e.engine_notes,
        is_deload: e.is_deload,
    };
}
