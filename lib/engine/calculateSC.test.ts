/**
 * Standalone test script for lib/engine/calculateSC.ts
 *
 * Run with:  npx tsx lib/engine/calculateSC.test.ts
 */

import {
    determineFocus,
    scoreExerciseForUser,
    generateWorkout,
    calculateVolumeLoad,
    calculateWeeklyVolume,
    getWorkoutCompliance,
} from '.ts';
import type {
    ExerciseLibraryRow,
    ExerciseScoringContext,
    MuscleGroup,
} from '.ts';

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

// ─── Mock Data ─────────────────────────────────────────────────

function makeExercise(overrides: Partial<ExerciseLibraryRow> = {}): ExerciseLibraryRow {
    return {
        id: 'ex-' + Math.random().toString(36).slice(2, 8),
        name: 'Test Exercise',
        type: 'heavy_lift',
        cns_load: 5,
        muscle_group: 'chest',
        equipment: 'barbell',
        description: 'Test exercise',
        cues: 'Test cues',
        sport_tags: ['boxing'],
        ...overrides,
    };
}

const EMPTY_VOLUME: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, quads: 0, hamstrings: 0,
    glutes: 0, arms: 0, core: 0, full_body: 0, neck: 0, calves: 0,
};

function makeScoringContext(overrides: Partial<ExerciseScoringContext> = {}): ExerciseScoringContext {
    return {
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        cnsBudgetRemaining: 50,
        fitnessLevel: 'intermediate',
        ...overrides,
    };
}

const MOCK_LIBRARY: ExerciseLibraryRow[] = [
    makeExercise({ id: 'ex-1', name: 'Barbell Back Squat', type: 'heavy_lift', cns_load: 9, muscle_group: 'quads' }),
    makeExercise({ id: 'ex-2', name: 'Bench Press', type: 'heavy_lift', cns_load: 7, muscle_group: 'chest' }),
    makeExercise({ id: 'ex-3', name: 'Box Jumps', type: 'power', cns_load: 6, muscle_group: 'quads' }),
    makeExercise({ id: 'ex-4', name: 'Hip Circles', type: 'mobility', cns_load: 1, muscle_group: 'glutes' }),
    makeExercise({ id: 'ex-5', name: 'Foam Rolling', type: 'mobility', cns_load: 1, muscle_group: 'full_body' }),
    makeExercise({ id: 'ex-6', name: 'Barbell Row', type: 'heavy_lift', cns_load: 7, muscle_group: 'back' }),
    makeExercise({ id: 'ex-7', name: 'Walking', type: 'active_recovery', cns_load: 1, muscle_group: 'full_body' }),
    makeExercise({ id: 'ex-8', name: 'Heavy Bag Rounds', type: 'sport_specific', cns_load: 7, muscle_group: 'full_body' }),
    makeExercise({ id: 'ex-9', name: 'Jump Rope', type: 'conditioning', cns_load: 3, muscle_group: 'calves' }),
    makeExercise({ id: 'ex-10', name: 'Overhead Press', type: 'heavy_lift', cns_load: 7, muscle_group: 'shoulders' }),
    makeExercise({ id: 'ex-11', name: 'Pull-ups', type: 'heavy_lift', cns_load: 5, muscle_group: 'back' }),
    makeExercise({ id: 'ex-12', name: 'Sled Push', type: 'conditioning', cns_load: 7, muscle_group: 'quads' }),
];

// ─── determineFocus Tests ──────────────────────────────────────

console.log('\n── determineFocus ──');

(() => {
    // Default weekly focus map
    assert('Sunday → recovery', determineFocus(0, 'Prime', 'off-season') === 'recovery');
    assert('Monday → upper_push', determineFocus(1, 'Prime', 'off-season') === 'upper_push');
    assert('Tuesday → lower', determineFocus(2, 'Prime', 'off-season') === 'lower');
    assert('Wednesday → sport_specific', determineFocus(3, 'Prime', 'off-season') === 'sport_specific');
    assert('Thursday → upper_pull', determineFocus(4, 'Prime', 'off-season') === 'upper_pull');
    assert('Friday → full_body', determineFocus(5, 'Prime', 'off-season') === 'full_body');
    assert('Saturday → conditioning', determineFocus(6, 'Prime', 'off-season') === 'conditioning');

    // Depleted always recovery regardless of day or phase
    assert('Depleted Mon → recovery', determineFocus(1, 'Depleted', 'off-season') === 'recovery');
    assert('Depleted Wed → recovery', determineFocus(3, 'Depleted', 'fight-camp') === 'recovery');
    assert('Depleted Fri → recovery', determineFocus(5, 'Depleted', 'pre-camp') === 'recovery');
    assert('Depleted Sat → recovery', determineFocus(6, 'Depleted', 'off-season') === 'recovery');

    // Override takes precedence over everything
    assert('Override beats weekly map', determineFocus(1, 'Prime', 'off-season', 'lower') === 'lower');
    assert('Override beats Depleted', determineFocus(1, 'Depleted', 'off-season', 'conditioning') === 'conditioning');

    // Fight-camp pattern: Mon/Wed/Fri → sport_specific, Tue/Thu → conditioning, Sun/Sat → recovery
    assert('Fight-camp Mon → sport_specific', determineFocus(1, 'Prime', 'fight-camp') === 'sport_specific');
    assert('Fight-camp Wed → sport_specific', determineFocus(3, 'Prime', 'fight-camp') === 'sport_specific');
    assert('Fight-camp Fri → sport_specific', determineFocus(5, 'Prime', 'fight-camp') === 'sport_specific');
    assert('Fight-camp Tue → conditioning', determineFocus(2, 'Prime', 'fight-camp') === 'conditioning');
    assert('Fight-camp Thu → conditioning', determineFocus(4, 'Prime', 'fight-camp') === 'conditioning');
    assert('Fight-camp Sun → recovery', determineFocus(0, 'Prime', 'fight-camp') === 'recovery');
    assert('Fight-camp Sat → recovery', determineFocus(6, 'Prime', 'fight-camp') === 'recovery');

    // Caution uses normal weekly map (not forced to recovery like Depleted)
    assert('Caution Mon → upper_push (normal map)', determineFocus(1, 'Caution', 'off-season') === 'upper_push');
})();

// ─── scoreExerciseForUser Tests ────────────────────────────────

console.log('\n── scoreExerciseForUser ──');

(() => {
    // Depleted + heavy_lift → 0
    const heavyLift = makeExercise({ type: 'heavy_lift', cns_load: 9 });
    assert('Depleted + heavy_lift → 0',
        scoreExerciseForUser(heavyLift, makeScoringContext({ readinessState: 'Depleted' })) === 0);

    // Depleted + power → 0
    const power = makeExercise({ type: 'power', cns_load: 6 });
    assert('Depleted + power → 0',
        scoreExerciseForUser(power, makeScoringContext({ readinessState: 'Depleted' })) === 0);

    // Depleted + mobility → high score (50 base + 30 bonus = 80)
    const mobility = makeExercise({ type: 'mobility', cns_load: 1 });
    const mobilityDepleted = scoreExerciseForUser(mobility, makeScoringContext({ readinessState: 'Depleted' }));
    assert('Depleted + mobility → 80', mobilityDepleted === 80);

    // Depleted + active_recovery → high score (50 + 30 = 80)
    const activeRecovery = makeExercise({ type: 'active_recovery', cns_load: 1 });
    const arDepleted = scoreExerciseForUser(activeRecovery, makeScoringContext({ readinessState: 'Depleted' }));
    assert('Depleted + active_recovery → 80', arDepleted === 80);

    // Prime + heavy_lift → higher than base (50 + 20 = 70)
    const heavyPrime = scoreExerciseForUser(
        makeExercise({ type: 'heavy_lift', cns_load: 5 }),
        makeScoringContext({ readinessState: 'Prime' }),
    );
    assert('Prime + heavy_lift → 70', heavyPrime === 70);

    // Prime + power → 70
    const powerPrime = scoreExerciseForUser(
        makeExercise({ type: 'power', cns_load: 5 }),
        makeScoringContext({ readinessState: 'Prime' }),
    );
    assert('Prime + power → 70', powerPrime === 70);

    // Phase boost: off-season boosts heavy_lift (+15)
    const heavyOffSeason = scoreExerciseForUser(
        makeExercise({ type: 'heavy_lift', cns_load: 5 }),
        makeScoringContext({ readinessState: 'Prime', phase: 'off-season' }),
    );
    // 50 (base) + 20 (Prime heavy) + 15 (off-season boost for heavy_lift) = 85
    assert('Off-season phase boosts heavy_lift', heavyOffSeason === 85);

    // Phase boost: fight-camp boosts sport_specific
    const sportSpecFightCamp = scoreExerciseForUser(
        makeExercise({ type: 'sport_specific', cns_load: 3 }),
        makeScoringContext({ phase: 'fight-camp' }),
    );
    // 50 (base) + 15 (fight-camp boost for sport_specific) = 65
    assert('Fight-camp phase boosts sport_specific', sportSpecFightCamp === 65);

    // Recency penalty: recently used exercise scored lower
    const recentEx = makeExercise({ id: 'recent-1', type: 'heavy_lift', cns_load: 5 });
    const scoreRecent = scoreExerciseForUser(recentEx, makeScoringContext({ recentExerciseIds: ['recent-1'] }));
    const scoreNotRecent = scoreExerciseForUser(recentEx, makeScoringContext({ recentExerciseIds: [] }));
    assert('Recently used exercise scores 25 less', scoreNotRecent - scoreRecent === 25);

    // CNS budget exceeded → 0
    const overBudget = makeExercise({ type: 'conditioning', cns_load: 60 });
    assert('CNS budget exceeded → 0',
        scoreExerciseForUser(overBudget, makeScoringContext({ cnsBudgetRemaining: 10 })) === 0);

    // High ACWR penalizes high-CNS exercises
    const highCNS = makeExercise({ type: 'heavy_lift', cns_load: 8 });
    const highACWR = scoreExerciseForUser(highCNS, makeScoringContext({ acwr: 1.5 }));
    const normalACWR = scoreExerciseForUser(highCNS, makeScoringContext({ acwr: 1.0 }));
    assert('High ACWR penalizes high-CNS exercises by 20', normalACWR - highACWR === 20);

    // Beginners penalized for power lifts
    const powerLift = makeExercise({ type: 'power', cns_load: 8 });
    const beginnerScore = scoreExerciseForUser(powerLift, makeScoringContext({ fitnessLevel: 'beginner' }));
    assert('Beginner power lift score reduced (below 50)', beginnerScore < 50);

    // Elite rewarded for complex power
    const eliteScore = scoreExerciseForUser(powerLift, makeScoringContext({ fitnessLevel: 'elite' }));
    assert('Elite power lift score boosted (above 50)', eliteScore > 50);

    // Muscle balance: under-trained group gets a boost
    const underTrainedVolume = { ...EMPTY_VOLUME, chest: 0, back: 5000, shoulders: 5000 };
    const chestExercise = makeExercise({ type: 'conditioning', cns_load: 3, muscle_group: 'chest' });
    const underScore = scoreExerciseForUser(chestExercise, makeScoringContext({ recentMuscleVolume: underTrainedVolume }));
    const evenVolume = { ...EMPTY_VOLUME };
    const evenScore = scoreExerciseForUser(chestExercise, makeScoringContext({ recentMuscleVolume: evenVolume }));
    assert('Under-trained muscle group gets boost', underScore > evenScore);

    // Caution + high-CNS heavy_lift penalized
    const cautionHeavy = makeExercise({ type: 'heavy_lift', cns_load: 9 });
    const cautionScore = scoreExerciseForUser(cautionHeavy, makeScoringContext({ readinessState: 'Caution' }));
    assert('Caution penalizes heavy_lift with cns_load >= 9', cautionScore < 50);
})();

// ─── generateWorkout Tests ─────────────────────────────────────

console.log('\n── generateWorkout ──');

(() => {
    // Prime generates exercises and respects CNS budget
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09', // Sunday
    });
    assert('Prime generates exercises', result.exercises.length > 0);
    assert('Prime respects CNS budget', result.usedCNS <= result.totalCNSBudget);
    assert('Has a message', result.message.length > 0);

    // Depleted → recovery focus, only mobility/recovery exercises
    const depleted = generateWorkout({
        readinessState: 'Depleted',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('Depleted → recovery focus', depleted.focus === 'recovery');
    assert('Depleted → only mobility/recovery exercises',
        depleted.exercises.every(e => e.exercise.type === 'mobility' || e.exercise.type === 'active_recovery'));
    assert('Depleted → max 3 exercises', depleted.exercises.length <= 3);

    // Caution → max 6 exercises
    const caution = generateWorkout({
        readinessState: 'Caution',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-10', // Monday → upper_push
    });
    assert('Caution → max 6 exercises', caution.exercises.length <= 6);

    // Empty library → 0 exercises
    const empty = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: [],
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('Empty library → 0 exercises', empty.exercises.length === 0);

    // Override focus is respected
    const overridden = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'lower',
    });
    assert('Override focus respected', overridden.focus === 'lower');

    // Fight week cap (intensity cap <= 4) → recovery only
    const fightWeek = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingIntensityCap: 4,
    });
    assert('Fight week cap → recovery focus', fightWeek.focus === 'recovery');
    assert('Fight week cap → all RPEs <= 4',
        fightWeek.exercises.every(e => e.targetRPE <= 4));

    // Set prescriptions: Prime exercises that are heavy_lift should have 4 sets
    const primeHeavy = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-10', // Monday → upper_push
    });
    const heavyEx = primeHeavy.exercises.find(e => e.exercise.type === 'heavy_lift');
    if (heavyEx) {
        assert('Prime heavy_lift → 4 sets', heavyEx.targetSets === 4);
        assert('Prime heavy_lift → reps = max(3, 6-2) = 4', heavyEx.targetReps === 4);
        assert('Prime heavy_lift → RPE 8', heavyEx.targetRPE === 8);
    }

    // Mobility exercises always get 2 sets, 12 reps, RPE 4
    const depletedMobility = depleted.exercises.find(e => e.exercise.type === 'mobility');
    if (depletedMobility) {
        assert('Mobility → 2 sets', depletedMobility.targetSets === 2);
        assert('Mobility → 12 reps', depletedMobility.targetReps === 12);
        assert('Mobility → RPE <= 4', depletedMobility.targetRPE <= 4);
    }
})();

// ─── calculateVolumeLoad Tests ─────────────────────────────────

console.log('\n── calculateVolumeLoad ──');

(() => {
    const result = calculateVolumeLoad([
        { reps: 8, weight_lbs: 135, is_warmup: false },
        { reps: 8, weight_lbs: 185, is_warmup: false },
        { reps: 6, weight_lbs: 205, is_warmup: false },
        { reps: 10, weight_lbs: 95, is_warmup: true },
    ]);
    const expectedVolume = (8 * 135) + (8 * 185) + (6 * 205); // 3790
    assert(`Volume = ${expectedVolume}`, result.totalVolume === expectedVolume);
    assert('Working sets = 3', result.workingSets === 3);
    assert('Total sets = 4', result.totalSets === 4);

    const emptyResult = calculateVolumeLoad([]);
    assert('Empty sets → 0 volume', emptyResult.totalVolume === 0);
    assert('Empty sets → 0 working', emptyResult.workingSets === 0);

    // All warmups → 0 volume
    const warmupOnly = calculateVolumeLoad([
        { reps: 10, weight_lbs: 45, is_warmup: true },
        { reps: 8, weight_lbs: 65, is_warmup: true },
    ]);
    assert('Warmup-only sets → 0 volume', warmupOnly.totalVolume === 0);
    assert('Warmup-only → 0 working sets', warmupOnly.workingSets === 0);
    assert('Warmup-only → total sets = 2', warmupOnly.totalSets === 2);
})();

// ─── calculateWeeklyVolume Tests ───────────────────────────────

console.log('\n── calculateWeeklyVolume ──');

(() => {
    const weeklyVol = calculateWeeklyVolume([
        { reps: 8, weight_lbs: 200, is_warmup: false, muscle_group: 'chest' },
        { reps: 6, weight_lbs: 200, is_warmup: false, muscle_group: 'chest' },
        { reps: 10, weight_lbs: 135, is_warmup: false, muscle_group: 'back' },
        { reps: 5, weight_lbs: 100, is_warmup: true, muscle_group: 'chest' },
    ]);
    assert('Chest weekly volume = 2800', weeklyVol.chest === (8 * 200) + (6 * 200));
    assert('Back weekly volume = 1350', weeklyVol.back === 10 * 135);
    assert('Quads weekly volume = 0', weeklyVol.quads === 0);
})();

// ─── getWorkoutCompliance Tests ────────────────────────────────

console.log('\n── getWorkoutCompliance ──');

(() => {
    const perfect = getWorkoutCompliance(12, 12, 5000, 5000);
    assert('100% compliance → Target Met', perfect.overall === 'Target Met');
    assert('Sets 100%', perfect.setsCompletedPct === 100);
    assert('Volume 100%', perfect.volumeCompliancePct === 100);

    const moderate = getWorkoutCompliance(12, 9, 5000, 4000);
    assert('~80% avg → Close Enough', moderate.overall === 'Close Enough');

    const low = getWorkoutCompliance(12, 4, 5000, 1500);
    assert('Low compliance → Missed It', low.overall === 'Missed It');

    // Edge: 0 planned, some actual
    const zeroPlan = getWorkoutCompliance(0, 5, 0, 1000);
    assert('0 planned + some actual → 100%', zeroPlan.setsCompletedPct === 100);

    // Edge: 0 planned, 0 actual
    const allZero = getWorkoutCompliance(0, 0, 0, 0);
    assert('All zeros → 0% → Missed It', allZero.overall === 'Missed It');
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
