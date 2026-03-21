/**
 * Standalone test script for lib/engine/adaptive.ts
 *
 * Run with:  npx tsx lib/engine/adaptive.test.ts
 */

import { handleTimelineShift } from './adaptive.ts';
import { autoRegulateSC } from './adaptive.ts';
import type {
    DailyTimelineRow,
    MacroLedgerRow,
    ExerciseLibraryRow,
    ExerciseType
} from './types.ts';

// ─── Helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${label}`);
    }
}

// ─── Mock Factories ────────────────────────────────────────────

function makeLedger(overrides: Partial<MacroLedgerRow> = {}): MacroLedgerRow {
    return {
        id: 'ledger-1',
        user_id: 'user-1',
        date: '2026-03-01',
        base_tdee: 2500,
        prescribed_protein: 200,
        prescribed_fats: 80,
        prescribed_carbs: 300,
        weight_correction_deficit: 0,
        ...overrides,
    };
}

function makeBlock(
    overrides: Partial<DailyTimelineRow> = {}
): DailyTimelineRow {
    return {
        id: 'block-1',
        user_id: 'user-1',
        date: '2026-03-01',
        block_type: 'Boxing',
        planned_intensity: 7,
        actual_intensity: null,
        status: 'Scheduled',
        ...overrides,
    };
}

const MOCK_EXERCISES: ExerciseLibraryRow[] = [
    { id: 'ex-1', name: 'Barbell Back Squat', type: 'heavy_lift' as ExerciseType, cns_load: 9, muscle_group: 'quads' as any, equipment: 'barbell' as any, description: '', cues: '', sport_tags: [] },
    { id: 'ex-2', name: 'Hip Circles', type: 'mobility' as ExerciseType, cns_load: 2, muscle_group: 'full_body' as any, equipment: 'bodyweight' as any, description: '', cues: '', sport_tags: [] },
    { id: 'ex-3', name: 'Foam Rolling', type: 'mobility' as ExerciseType, cns_load: 1, muscle_group: 'full_body' as any, equipment: 'bodyweight' as any, description: '', cues: '', sport_tags: [] },
    { id: 'ex-4', name: 'Band Pull-Aparts', type: 'active_recovery' as ExerciseType, cns_load: 3, muscle_group: 'back' as any, equipment: 'band' as any, description: '', cues: '', sport_tags: [] },
];

// ─── handleTimelineShift Tests ─────────────────────────────────

console.log('\n── handleTimelineShift ──');

// Test 1: Standard carb reduction
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({
            status: 'Skipped',
            planned_intensity: 10,
        }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
    });
    assert('Intensity 10 → 80g reduction', result.carbReduction === 80);
    assert('Updated carbs = 220', result.updatedCarbs === 220);
    assert('Message mentions 80g', result.message.includes('80g'));
})();

// Test 2: Low intensity
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({
            status: 'Skipped',
            planned_intensity: 1,
        }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
    });
    assert('Intensity 1 → 8g reduction', result.carbReduction === 8);
    assert('Updated carbs = 292', result.updatedCarbs === 292);
})();

// Test 3: Floor at zero
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({
            status: 'Skipped',
            planned_intensity: 10,
        }),
        currentLedger: makeLedger({ prescribed_carbs: 30 }),
    });
    assert('Floor: updatedCarbs >= 0', result.updatedCarbs === 0);
    assert('Applied reduction capped at 30', result.carbReduction === 30);
    assert('Message mentions 30g (not 80g)', result.message.includes('30g'));
})();

// Test 4: Throws on wrong status
(() => {
    let threw = false;
    try {
        handleTimelineShift({
            skippedBlock: makeBlock({ status: 'Completed' }),
            currentLedger: makeLedger(),
        });
    } catch {
        threw = true;
    }
    assert('Throws if status is not Skipped', threw);
})();

// ─── autoRegulateSC Tests ──────────────────────────────────────

console.log('\n── autoRegulateSC ──');

// Test 5: Swap heavy lift for mobility
(() => {
    const result = autoRegulateSC({
        boxingBlock: makeBlock({
            block_type: 'Boxing',
            actual_intensity: 8,
            status: 'Completed',
        }),
        next24hBlocks: [
            makeBlock({
                id: 'sc-block-1',
                block_type: 'S&C',
                status: 'Scheduled',
                planned_intensity: 8,
            }),
        ],
        exerciseLibrary: MOCK_EXERCISES,
    });
    assert('Swap occurred', result.swapped === true);
    assert('Original block ID is sc-block-1', result.originalBlockId === 'sc-block-1');
    assert('Replacement type is mobility', result.replacementType === 'mobility');
    assert('Picks lowest CNS mobility (Foam Rolling)', result.message.includes('Foam Rolling'));
    assert('Message mentions CNS', result.message.includes('central nervous system'));
})();

// Test 6: No heavy lift in next 24h
(() => {
    const result = autoRegulateSC({
        boxingBlock: makeBlock({
            block_type: 'Boxing',
            actual_intensity: 9,
            status: 'Completed',
        }),
        next24hBlocks: [
            makeBlock({
                id: 'rec-block-1',
                block_type: 'Recovery',
                status: 'Scheduled',
            }),
        ],
        exerciseLibrary: MOCK_EXERCISES,
    });
    assert('No swap when no S&C scheduled', result.swapped === false);
    assert('Message confirms clear window', result.message.includes('clear'));
})();

// Test 7: Boxing intensity <= 7 — no action
(() => {
    const result = autoRegulateSC({
        boxingBlock: makeBlock({
            block_type: 'Boxing',
            actual_intensity: 7,
            status: 'Completed',
        }),
        next24hBlocks: [
            makeBlock({
                id: 'sc-block-2',
                block_type: 'S&C',
                status: 'Scheduled',
            }),
        ],
        exerciseLibrary: MOCK_EXERCISES,
    });
    assert('No swap when intensity <= 7', result.swapped === false);
    assert('Message says normal range', result.message.includes('normal range'));
})();

// Test 8: Multiple S&C blocks — only first is swapped
(() => {
    const result = autoRegulateSC({
        boxingBlock: makeBlock({
            block_type: 'Boxing',
            actual_intensity: 9,
            status: 'Completed',
        }),
        next24hBlocks: [
            makeBlock({ id: 'sc-first', block_type: 'S&C', status: 'Scheduled' }),
            makeBlock({ id: 'sc-second', block_type: 'S&C', status: 'Scheduled' }),
        ],
        exerciseLibrary: MOCK_EXERCISES,
    });
    assert('Only first S&C block swapped', result.originalBlockId === 'sc-first');
})();

// ─── Cut-Aware handleTimelineShift Tests ──────────────────────

console.log('\n── Cut-Aware handleTimelineShift ──');

// Intensified phase: amplified coefficient (12g per point)
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({ status: 'Skipped', planned_intensity: 10 }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
        cutPhase: 'intensified',
    });
    assert('Intensified → 120g reduction (12 * 10)', result.carbReduction === 120);
    assert('Updated carbs = 180', result.updatedCarbs === 180);
    assert('Message mentions amplified', result.message.includes('amplified'));
})();

// Fight week cut: amplified coefficient
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({ status: 'Skipped', planned_intensity: 5 }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
        cutPhase: 'fight_week_cut',
    });
    assert('Fight week cut → 60g reduction (12 * 5)', result.carbReduction === 60);
    assert('Updated carbs = 240', result.updatedCarbs === 240);
})();

// No cut phase: normal coefficient
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({ status: 'Skipped', planned_intensity: 10 }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
    });
    assert('No cut → 80g reduction (8 * 10)', result.carbReduction === 80);
    assert('No amplified mention', !result.message.includes('amplified'));
})();

// Chronic phase: NOT amplified (only intensified/fight-week)
(() => {
    const result = handleTimelineShift({
        skippedBlock: makeBlock({ status: 'Skipped', planned_intensity: 10 }),
        currentLedger: makeLedger({ prescribed_carbs: 300 }),
        cutPhase: 'chronic',
    });
    assert('Chronic → 80g (not amplified)', result.carbReduction === 80);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
