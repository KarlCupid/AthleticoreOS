import type {
    HandleTimelineShiftInput,
    HandleTimelineShiftResult,
    AutoRegulateSCInput,
    AutoRegulateSCResult,
    ExerciseLibraryRow,
} from './types.ts';

// ─── Constants ─────────────────────────────────────────────────

/**
 * Carb-expenditure coefficient.
 * Every point of planned_intensity on a skipped block is treated as
 * roughly 8 g of carbohydrate demand that no longer happened. This is
 * a demand adjustment only; body-mass pressure is owned by the
 * Nutrition/Fueling and Body Mass engines.
 */
const CARB_GRAMS_PER_INTENSITY_POINT = 8;

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

    const hasBodyMassContext = cutPhase != null;
    const coefficient = CARB_GRAMS_PER_INTENSITY_POINT;

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

    const context = hasBodyMassContext
        ? ' Body-mass context remains safety-gated by the Nutrition/Fueling Engine.'
        : '';
    const message =
        `Workout skipped. Daily carbohydrate demand changed by ${appliedReduction}g.${context}`;

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
 *   2. If swapped === true, updating the target scheduled activity row:
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
    constraintSet,
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

    const lowCostStrength = exerciseLibrary
        .filter((ex: ExerciseLibraryRow) => ex.type === 'heavy_lift' && ex.cns_load <= 5 && (ex.equipment === 'machine' || ex.cns_load <= 4))
        .sort((a: ExerciseLibraryRow, b: ExerciseLibraryRow) => a.cns_load - b.cns_load);
    const mobilityExercises = exerciseLibrary
        .filter((ex: ExerciseLibraryRow) => ex.type === 'mobility' || ex.type === 'active_recovery')
        .sort((a: ExerciseLibraryRow, b: ExerciseLibraryRow) => a.cns_load - b.cns_load);

    const canKeepStrengthIntent = Boolean(
        constraintSet
        && constraintSet.allowedStimuli.includes('controlled_strength')
        && !constraintSet.blockedStimuli.includes('high_impact')
        && lowCostStrength.length > 0,
    );
    const replacement = canKeepStrengthIntent ? lowCostStrength[0] : mobilityExercises[0];

    if (!replacement) {
        return {
            swapped: false,
            originalBlockId: heavyLiftBlock.id,
            replacementType: null,
            message:
                'A heavy lift should be swapped out to protect your CNS, but no suitable lower-cost substitute is available in the exercise library.',
        };
    }

    const message =
        `Boxing intensity was ${boxingBlock.actual_intensity}/10. ` +
        (canKeepStrengthIntent
            ? `Your scheduled S&C session has been downshifted to a lower-cost strength substitute `
            : `Your scheduled S&C session has been swapped to a recovery block `) +
        `(${replacement.name}, CNS load ${replacement.cns_load}/10) ` +
        `to protect your central nervous system without throwing away the day.`;

    return {
        swapped: true,
        originalBlockId: heavyLiftBlock.id,
        replacementType: replacement.type,
        message,
    };
}
