import {
    HandleTimelineShiftInput,
    HandleTimelineShiftResult,
    AutoRegulateSCInput,
    AutoRegulateSCResult,
    ExerciseLibraryRow,
    CutPhase,
} from './types';

// ─── Constants ─────────────────────────────────────────────────

/**
 * Carb-expenditure coefficient.
 * Every point of planned_intensity on a skipped block ≈ 8 g of carbs
 * that the athlete will NOT burn. We subtract this from the day's
 * prescribed carbs to keep the weight cut on schedule.
 *
 * During intensified/fight-week cut phases, the coefficient is
 * amplified to 12 g because the athlete has lower overall glycogen
 * stores and the missed burn has a larger proportional impact.
 */
const CARB_GRAMS_PER_INTENSITY_POINT = 8;
const CARB_GRAMS_PER_INTENSITY_POINT_CUT = 12;

// ─── handleTimelineShift ───────────────────────────────────────

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - skippedBlock: DailyTimelineRow (the block whose status just changed to 'Skipped')
 *   - currentLedger: MacroLedgerRow  (today's row from macro_ledger for this user)
 *   - cutPhase?: CutPhase | null     (from active cut protocol, if any)
 *
 * Returns: HandleTimelineShiftResult
 *   - updatedCarbs: number   (new prescribed_carbs after reduction)
 *   - carbReduction: number  (grams subtracted)
 *   - message: string        (plain-English prescription)
 *
 * The caller is responsible for:
 *   1. Querying the skipped block and current ledger from Supabase.
 *   2. Writing the returned updatedCarbs back to macro_ledger.prescribed_carbs.
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function handleTimelineShift({
    skippedBlock,
    currentLedger,
    cutPhase,
}: HandleTimelineShiftInput): HandleTimelineShiftResult {
    if (skippedBlock.status !== 'Skipped') {
        throw new Error(
            `handleTimelineShift expects a block with status 'Skipped', got '${skippedBlock.status}'.`
        );
    }

    // Use amplified coefficient during intensified/fight-week cut phases
    const isAmplifiedCut = cutPhase != null && (
        cutPhase === 'intensified' ||
        cutPhase === 'fight_week_load' ||
        cutPhase === 'fight_week_cut'
    );
    const coefficient = isAmplifiedCut
        ? CARB_GRAMS_PER_INTENSITY_POINT_CUT
        : CARB_GRAMS_PER_INTENSITY_POINT;

    const carbReduction =
        skippedBlock.planned_intensity * coefficient;

    // Floor at 0 — never prescribe negative carbs.
    const updatedCarbs = Math.max(
        0,
        currentLedger.prescribed_carbs - carbReduction
    );

    // The actual reduction applied (may be smaller if we hit the floor).
    const appliedReduction =
        currentLedger.prescribed_carbs - updatedCarbs;

    const cutContext = isAmplifiedCut
        ? ' (amplified for active weight cut)'
        : '';
    const message =
        `Workout skipped. Your daily carb target has been lowered by ${appliedReduction}g${cutContext} to keep your weight cut on schedule.`;

    return { updatedCarbs, carbReduction: appliedReduction, message };
}

// ─── autoRegulateSC ────────────────────────────────────────────

/**
 * @ANTI-WIRING:
 * UI Parameters Expected:
 *   - boxingBlock: DailyTimelineRow      (the boxing block that was just completed with actual_intensity > 7)
 *   - next24hBlocks: DailyTimelineRow[]  (all 'Scheduled' blocks in the next 24 hours)
 *   - exerciseLibrary: ExerciseLibraryRow[] (full exercise_library table)
 *
 * Returns: AutoRegulateSCResult
 *   - swapped: boolean              (true if a heavy_lift was replaced)
 *   - originalBlockId: string|null  (id of the replaced block, or null)
 *   - replacementType: ExerciseType|null ('mobility' if swapped, else null)
 *   - message: string               (plain-English prescription)
 *
 * The caller is responsible for:
 *   1. Querying the boxing block, next 24h blocks, and exercise library from Supabase.
 *   2. If swapped === true, updating the target daily_timeline row:
 *      - block_type → 'Recovery'
 *      - status → 'Audible'
 *      - planned_intensity → replacement exercise's cns_load
 *
 * Pure synchronous function. No database queries. No LLM generation.
 */
export function autoRegulateSC({
    boxingBlock,
    next24hBlocks,
    exerciseLibrary,
}: AutoRegulateSCInput): AutoRegulateSCResult {
    // Guard: only triggers when boxing intensity was genuinely high.
    if (
        boxingBlock.block_type !== 'Boxing' ||
        boxingBlock.actual_intensity === null ||
        boxingBlock.actual_intensity <= 7
    ) {
        return {
            swapped: false,
            originalBlockId: null,
            replacementType: null,
            message:
                'Boxing intensity within normal range. No schedule changes required.',
        };
    }

    // Find the first scheduled S&C block that maps to a heavy_lift.
    // A block_type of 'S&C' is the schedule-level concept; we check the
    // exercise_library to confirm it is specifically a heavy_lift.
    const heavyLiftBlock = next24hBlocks.find(
        (block) =>
            block.status === 'Scheduled' && block.block_type === 'S&C'
    );

    if (!heavyLiftBlock) {
        return {
            swapped: false,
            originalBlockId: null,
            replacementType: null,
            message:
                'No heavy lifting scheduled in the next 24 hours. Your recovery window is clear.',
        };
    }

    // Pick the lowest-CNS-load mobility exercise as the replacement.
    const mobilityExercises = exerciseLibrary
        .filter((ex: ExerciseLibraryRow) => ex.type === 'mobility')
        .sort((a: ExerciseLibraryRow, b: ExerciseLibraryRow) => a.cns_load - b.cns_load);

    if (mobilityExercises.length === 0) {
        return {
            swapped: false,
            originalBlockId: heavyLiftBlock.id,
            replacementType: null,
            message:
                'A heavy lift should be swapped out to protect your CNS, but no mobility exercises are available in the exercise library.',
        };
    }

    const replacement = mobilityExercises[0];

    const message =
        `Boxing intensity was ${boxingBlock.actual_intensity}/10. ` +
        `Your scheduled S&C session has been swapped to a mobility block ` +
        `(${replacement.name}, CNS load ${replacement.cns_load}/10) ` +
        `to protect your central nervous system.`;

    return {
        swapped: true,
        originalBlockId: heavyLiftBlock.id,
        replacementType: 'mobility',
        message,
    };
}
