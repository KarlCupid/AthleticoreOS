/**
 * Standalone test script for lib/engine/adaptiveWorkout.ts
 *
 * Run with:  npx tsx lib/engine/adaptiveWorkout.test.ts
 */

import {
    initFatigueState,
    processSetCompletion,
    findSubstituteExercise,
    getRestTimerDefaults,
    getRestDuration,
} from '.ts';
import type { ExerciseLibraryRow, PrescribedExerciseV2, SessionFatigueState } from '.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
    if (condition) {
        passed++;
        console.log(`  PASS ${label}`);
    } else {
        failed++;
        console.error(`  FAIL ${label}`);
    }
}

function ex(overrides: Partial<ExerciseLibraryRow>): ExerciseLibraryRow {
    return {
        id: 'ex-' + Math.random().toString(36).slice(2, 8),
        name: 'Exercise',
        type: 'heavy_lift',
        cns_load: 8,
        muscle_group: 'back',
        equipment: 'barbell',
        description: '',
        cues: '',
        sport_tags: [],
        ...overrides,
    };
}

function makeFatigueState(overrides: Partial<SessionFatigueState> = {}): SessionFatigueState {
    return {
        setsCompleted: 0,
        cumulativeRPEDelta: 0,
        avgRPEDelta: 0,
        consecutiveHighRPESets: 0,
        fatigueScore: 0,
        fatigueLevel: 'fresh',
        ...overrides,
    };
}

function makeSetInput(overrides: Record<string, any> = {}) {
    return {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        setNumber: 1,
        actualWeight: 185,
        actualReps: 8,
        actualRPE: 7,
        targetWeight: 185,
        targetReps: 8,
        targetRPE: 7,
        currentFatigueState: makeFatigueState(),
        remainingExercises: [],
        exerciseLibrary: [],
        ...overrides,
    };
}

// ─── initFatigueState ─────────────────────────────────────────

console.log('\n── initFatigueState ──');

(() => {
    const state = initFatigueState();
    assert('setsCompleted = 0', state.setsCompleted === 0);
    assert('cumulativeRPEDelta = 0', state.cumulativeRPEDelta === 0);
    assert('avgRPEDelta = 0', state.avgRPEDelta === 0);
    assert('consecutiveHighRPESets = 0', state.consecutiveHighRPESets === 0);
    assert('fatigueScore = 0', state.fatigueScore === 0);
    assert('fatigueLevel = fresh', state.fatigueLevel === 'fresh');
})();

// ─── processSetCompletion: RPE delta effects ──────────────────

console.log('\n── processSetCompletion: RPE delta ──');

(() => {
    // RPE on target (delta = 0) -> neutral feedback, no adjustments
    const result = processSetCompletion(makeSetInput({
        actualRPE: 7, targetRPE: 7,
    }));
    assert('On-target RPE -> neutral severity', result.feedbackSeverity === 'neutral');
    assert('On-target RPE -> no adjustments', result.adjustments.length === 0);
    assert('Feedback says on target', result.feedbackMessage.includes('on target'));
})();

(() => {
    // RPE +1 (mild fatigue) -> weight reduction 5%
    const result = processSetCompletion(makeSetInput({
        actualRPE: 8, targetRPE: 7, targetWeight: 200,
    }));
    const weightAdj = result.adjustments.find(a => a.adjustmentType === 'weight_reduction');
    assert('RPE +1 -> weight reduction', weightAdj != null);
    assert('RPE +1 -> 5% reduction (200->190)', weightAdj?.adjustedValue === 190);
    assert('RPE +1 -> caution severity', result.feedbackSeverity === 'caution');
})();

(() => {
    // RPE +2 (heavy fatigue) -> weight reduction 10% AND rep reduction
    const result = processSetCompletion(makeSetInput({
        actualRPE: 9, targetRPE: 7, targetWeight: 200, targetReps: 10,
    }));
    const weightAdj = result.adjustments.find(a => a.adjustmentType === 'weight_reduction');
    const repAdj = result.adjustments.find(a => a.adjustmentType === 'rep_reduction');
    assert('RPE +2 -> weight reduction', weightAdj != null);
    assert('RPE +2 -> 10% reduction (200->180)', weightAdj?.adjustedValue === 180);
    assert('RPE +2 -> rep reduction', repAdj != null);
    assert('RPE +2 -> reps reduced by 2 (10->8)', repAdj?.adjustedValue === 8);
    assert('RPE +2 -> warning severity', result.feedbackSeverity === 'warning');
})();

(() => {
    // RPE -1 (feeling strong) -> weight increase suggestion
    const result = processSetCompletion(makeSetInput({
        actualRPE: 6, targetRPE: 7, targetWeight: 200,
    }));
    const weightAdj = result.adjustments.find(a => a.adjustmentType === 'weight_increase');
    assert('RPE -1 -> weight increase suggestion', weightAdj != null);
    assert('RPE -1 -> positive severity', result.feedbackSeverity === 'positive');
    assert('RPE -1 -> increased weight >= targetWeight + 5', (weightAdj?.adjustedValue ?? 0) >= 205);
})();

// ─── processSetCompletion: fatigue state update ───────────────

console.log('\n── processSetCompletion: fatigue state ──');

(() => {
    const result = processSetCompletion(makeSetInput({
        actualRPE: 7, targetRPE: 7,
        currentFatigueState: makeFatigueState({ setsCompleted: 3 }),
    }));
    assert('Sets completed increments', result.updatedFatigueState.setsCompleted === 4);
})();

(() => {
    // High RPE delta increments consecutiveHighRPESets
    const result = processSetCompletion(makeSetInput({
        actualRPE: 9, targetRPE: 7,
        currentFatigueState: makeFatigueState({ consecutiveHighRPESets: 1 }),
    }));
    assert('High RPE increments consecutive count', result.updatedFatigueState.consecutiveHighRPESets === 2);
})();

(() => {
    // On-target RPE resets consecutiveHighRPESets
    const result = processSetCompletion(makeSetInput({
        actualRPE: 7, targetRPE: 7,
        currentFatigueState: makeFatigueState({ consecutiveHighRPESets: 2 }),
    }));
    assert('On-target RPE resets consecutive count', result.updatedFatigueState.consecutiveHighRPESets === 0);
})();

// ─── processSetCompletion: fatigue level thresholds ───────────

console.log('\n── processSetCompletion: fatigue levels ──');

(() => {
    // Low fatigue score < 25 -> fresh
    const result = processSetCompletion(makeSetInput({
        actualRPE: 7, targetRPE: 7,
        currentFatigueState: makeFatigueState({ setsCompleted: 0, cumulativeRPEDelta: 0 }),
    }));
    assert('Low score -> fresh', result.updatedFatigueState.fatigueLevel === 'fresh');
})();

(() => {
    // Simulate moderate fatigue: many sets with mild RPE delta
    const result = processSetCompletion(makeSetInput({
        actualRPE: 8, targetRPE: 7,
        currentFatigueState: makeFatigueState({
            setsCompleted: 8,
            cumulativeRPEDelta: 4,
            avgRPEDelta: 0.5,
            consecutiveHighRPESets: 0,
            fatigueScore: 20,
        }),
    }));
    // With 9 sets completed, avgDelta ~0.55, score should be moderate range
    assert('Fatigue level is fresh or moderate after 9 sets',
        result.updatedFatigueState.fatigueLevel === 'fresh' || result.updatedFatigueState.fatigueLevel === 'moderate');
})();

// ─── processSetCompletion: 3+ consecutive high RPE -> swap ───

console.log('\n── processSetCompletion: exercise swap ──');

(() => {
    const lib = [
        ex({ id: 'heavy-1', name: 'Deadlift', cns_load: 9, muscle_group: 'back', equipment: 'barbell' }),
        ex({ id: 'light-1', name: 'Band Pull-Apart', cns_load: 2, muscle_group: 'back', equipment: 'band' }),
    ];
    const remaining: PrescribedExerciseV2[] = [{
        exercise: lib[0],
        targetSets: 3,
        targetReps: 5,
        targetRPE: 8,
        supersetGroup: null,
        score: 70,
    }];

    const result = processSetCompletion(makeSetInput({
        actualRPE: 9, targetRPE: 7,
        currentFatigueState: makeFatigueState({ consecutiveHighRPESets: 2 }),
        remainingExercises: remaining,
        exerciseLibrary: lib,
        availableEquipment: ['barbell', 'resistance_bands'],
    }));

    const swapAdj = result.adjustments.find(a => a.adjustmentType === 'exercise_swap');
    assert('3rd consecutive high RPE triggers swap', swapAdj != null);
    assert('Swap target is lower CNS', (swapAdj?.adjustedValue ?? 99) < 9);
})();

// ─── processSetCompletion: fatigue score >= 85 -> end early ──

console.log('\n── processSetCompletion: end early ──');

(() => {
    // Force extreme fatigue: high avgRPEDelta + many sets + consecutive high RPE
    const result = processSetCompletion(makeSetInput({
        actualRPE: 10, targetRPE: 7,
        currentFatigueState: makeFatigueState({
            setsCompleted: 15,
            cumulativeRPEDelta: 30,
            avgRPEDelta: 2.0,
            consecutiveHighRPESets: 5,
            fatigueScore: 80,
        }),
    }));
    assert('Extreme fatigue -> shouldEndWorkoutEarly', result.shouldEndWorkoutEarly === true);
    assert('End early has reason', result.endEarlyReason != null && result.endEarlyReason.length > 0);
})();

// ─── findSubstituteExercise ──────────────────────────────────

console.log('\n── findSubstituteExercise ──');

(() => {
    const heavy = ex({ id: 'h1', name: 'Heavy Squat', cns_load: 9, muscle_group: 'quads', equipment: 'barbell' });
    const light = ex({ id: 'l1', name: 'Goblet Squat', cns_load: 4, muscle_group: 'quads', equipment: 'dumbbell' });
    const unrelated = ex({ id: 'u1', name: 'Pull-up', cns_load: 3, muscle_group: 'back', equipment: 'bodyweight' });

    const result = findSubstituteExercise(heavy, [heavy, light, unrelated], ['barbell', 'dumbbells']);
    assert('Substitute is lower CNS same muscle group', result?.id === 'l1');
})();

(() => {
    const heavy = ex({ id: 'h2', name: 'Deadlift', cns_load: 9, muscle_group: 'back' });
    const result = findSubstituteExercise(heavy, [heavy]); // no alternatives
    assert('No substitute returns null', result === null);
})();

(() => {
    const heavy = ex({ id: 'h3', name: 'Barbell Row', cns_load: 7, muscle_group: 'back', equipment: 'barbell' });
    const cable = ex({ id: 'c3', name: 'Cable Row', cns_load: 4, muscle_group: 'back', equipment: 'cable' });
    // No cables available
    const result = findSubstituteExercise(heavy, [heavy, cable], ['barbell']);
    assert('Unavailable equipment excluded', result === null);
})();

// ─── getRestTimerDefaults ─────────────────────────────────────

console.log('\n── getRestTimerDefaults ──');

(() => {
    const defaults = getRestTimerDefaults();
    assert('heavy_lift default = 150s', defaults.heavy_lift.defaultSeconds === 150);
    assert('power default = 180s', defaults.power.defaultSeconds === 180);
    assert('mobility default = 30s', defaults.mobility.defaultSeconds === 30);
    assert('sport_specific default = 60s', defaults.sport_specific.defaultSeconds === 60);
    assert('conditioning default = 60s', defaults.conditioning.defaultSeconds === 60);
    assert('active_recovery default = 30s', defaults.active_recovery.defaultSeconds === 30);
})();

// ─── getRestDuration ──────────────────────────────────────────

console.log('\n── getRestDuration ──');

(() => {
    const fresh = getRestDuration('heavy_lift', 'fresh');
    assert('Fresh heavy_lift = 150s', fresh === 150);
})();

(() => {
    const moderate = getRestDuration('heavy_lift', 'moderate');
    assert('Moderate heavy_lift = 150s (no bonus)', moderate === 150);
})();

(() => {
    const high = getRestDuration('heavy_lift', 'high');
    assert('High fatigue heavy_lift = 180s (+30)', high === 180);
})();

(() => {
    const extreme = getRestDuration('heavy_lift', 'extreme');
    assert('Extreme fatigue heavy_lift = 180s (+30)', extreme === 180);
})();

(() => {
    const highMobility = getRestDuration('mobility', 'high');
    assert('High fatigue mobility = 60s (capped at max)', highMobility === 60);
})();

(() => {
    const freshPower = getRestDuration('power', 'fresh');
    assert('Fresh power = 180s', freshPower === 180);
})();

(() => {
    const highPower = getRestDuration('power', 'high');
    assert('High fatigue power = 210s (+30)', highPower === 210);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
