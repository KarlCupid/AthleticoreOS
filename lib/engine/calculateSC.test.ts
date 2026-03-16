/**
 * Standalone test script for lib/engine/calculateSC.ts
 *
 * Run with:  npx tsx lib/engine/calculateSC.test.ts
 */

import {
    determineFocus,
    scoreExerciseForUser,
    generateWorkout,
    generateWorkoutV2,
    calculateVolumeLoad,
    calculateWeeklyVolume,
    getWorkoutCompliance,
} from '.ts';
import type {
    ExerciseLibraryRow,
    ExerciseScoringContext,
    ReadinessState,
    MuscleGroup,
    PerformanceRiskState,
    TrainingBlockContext,
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
    assert('Depleted always returns recovery',
        determineFocus(1, 'Depleted', 'off-season') === 'recovery');
})();

(() => {
    assert('Override takes precedence',
        determineFocus(1, 'Prime', 'off-season', 'lower') === 'lower');
})();

(() => {
    assert('Fight camp Mon returns sport_specific',
        determineFocus(1, 'Prime', 'fight-camp') === 'sport_specific');
})();

// ─── scoreExerciseForUser Tests ────────────────────────────────

console.log('\n── scoreExerciseForUser ──');

(() => {
    const heavyLift = makeExercise({ type: 'heavy_lift', cns_load: 9 });
    const score = scoreExerciseForUser(heavyLift, makeScoringContext({ readinessState: 'Depleted' }));
    assert('Heavy lift scores 0 when Depleted', score === 0);
})();

(() => {
    const mobility = makeExercise({ type: 'mobility', cns_load: 1 });
    const score = scoreExerciseForUser(mobility, makeScoringContext({ readinessState: 'Depleted' }));
    assert('Mobility scores high when Depleted', score >= 70);
})();

(() => {
    const heavyLift = makeExercise({ type: 'heavy_lift', cns_load: 5 });
    const score = scoreExerciseForUser(heavyLift, makeScoringContext({ readinessState: 'Prime' }));
    assert('Heavy lift scores well when Prime', score >= 60);
})();

(() => {
    const exercise = makeExercise({ id: 'recent-1', type: 'heavy_lift', cns_load: 5 });
    const score = scoreExerciseForUser(exercise, makeScoringContext({
        recentExerciseIds: ['recent-1'],
    }));
    const baseScore = scoreExerciseForUser(exercise, makeScoringContext({
        recentExerciseIds: [],
    }));
    assert('Recently used exercise scored lower', score < baseScore);
})();

(() => {
    const exercise = makeExercise({ type: 'heavy_lift', cns_load: 60 });
    const score = scoreExerciseForUser(exercise, makeScoringContext({ cnsBudgetRemaining: 10 }));
    assert('Exercise exceeding CNS budget scores 0', score === 0);
})();

(() => {
    const exercise = makeExercise({ type: 'heavy_lift', cns_load: 8 });
    const highACWR = scoreExerciseForUser(exercise, makeScoringContext({ acwr: 1.5 }));
    const normalACWR = scoreExerciseForUser(exercise, makeScoringContext({ acwr: 1.0 }));
    assert('High ACWR penalizes high-CNS exercises', highACWR < normalACWR);
})();

(() => {
    const powerLift = makeExercise({ type: 'power', cns_load: 8 });
    const beginnerScore = scoreExerciseForUser(powerLift, makeScoringContext({ fitnessLevel: 'beginner' }));
    const eliteScore = scoreExerciseForUser(powerLift, makeScoringContext({ fitnessLevel: 'elite' }));
    assert('Beginners are penalized for complex power lifts', beginnerScore < 50);
    assert('Elites are rewarded for complex power lifts', eliteScore > 50);
})();

// ─── generateWorkout Tests ─────────────────────────────────────

console.log('\n── generateWorkout ──');

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('Prime generates exercises', result.exercises.length > 0);
    assert('Prime respects CNS budget', result.usedCNS <= result.totalCNSBudget);
    assert('Has a message', result.message.length > 0);
})();

(() => {
    const result = generateWorkout({
        readinessState: 'Depleted',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('Depleted generates recovery focus', result.focus === 'recovery');
    assert('Depleted only has mobility/recovery exercises',
        result.exercises.every(e => e.exercise.type === 'mobility' || e.exercise.type === 'active_recovery'));
})();

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'lower',
    });
    assert('Override focus is respected', result.focus === 'lower');
})();

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: [],
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('Empty library produces 0 exercises', result.exercises.length === 0);
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
    const expectedVolume = (8 * 135) + (8 * 185) + (6 * 205); // 1080 + 1480 + 1230 = 3790
    assert(`Volume = ${expectedVolume}`, result.totalVolume === expectedVolume);
    assert('Working sets = 3', result.workingSets === 3);
    assert('Total sets = 4', result.totalSets === 4);
})();

(() => {
    const result = calculateVolumeLoad([]);
    assert('Empty sets = 0 volume', result.totalVolume === 0);
    assert('Empty sets = 0 working', result.workingSets === 0);
})();

// ─── getWorkoutCompliance Tests ────────────────────────────────

console.log('\n── getWorkoutCompliance ──');

(() => {
    const result = getWorkoutCompliance(12, 12, 5000, 5000);
    assert('100% compliance = Target Met', result.overall === 'Target Met');
    assert('Sets compliance = 100', result.setsCompletedPct === 100);
})();

(() => {
    const result = getWorkoutCompliance(12, 9, 5000, 4000);
    assert('~80% avg compliance = Close Enough', result.overall === 'Close Enough');
})();

(() => {
    const result = getWorkoutCompliance(12, 4, 5000, 1500);
    assert('Low compliance = Missed It', result.overall === 'Missed It');
})();

// ─── Cut-Aware generateWorkout Tests ───────────────────────────

console.log('\n── Cut-Aware generateWorkout ──');

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingIntensityCap: 4,
    });
    assert('Fight week cap → recovery focus', result.focus === 'recovery');
    assert('Fight week cap → recovery workout type', result.workoutType === 'recovery');
    assert('Fight week cap → all RPEs ≤ 4',
        result.exercises.every(e => e.targetRPE <= 4));
    assert('Fight week cap → message mentions fight week',
        result.message.includes('fight week'));
})();

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingIntensityCap: 8,
    });
    assert('Intensified cap → all RPEs ≤ 8',
        result.exercises.every(e => e.targetRPE <= 8));
    assert('Intensified cap → CNS budget scaled',
        result.totalCNSBudget <= 65 * 0.8 + 1); // 65 * 8/10 = 52, +1 for rounding
    assert('Intensified cap → message mentions cut',
        result.message.includes('Weight cut'));
})();

(() => {
    const result = generateWorkout({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        trainingDate: '2026-03-09',
    });
    assert('No cap → normal CNS budget', result.totalCNSBudget === 65);
    assert('No cap ? not recovery focus', result.focus !== 'recovery');
})();

// â”€â”€â”€ generateWorkoutV2 Planning Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

console.log('\nâ”€â”€ generateWorkoutV2 planning â”€â”€');

(() => {
    const risk: PerformanceRiskState = {
        level: 'red',
        intensityCap: 4,
        volumeMultiplier: 0.5,
        cnsMultiplier: 0.45,
        allowHighImpact: false,
        reasons: ['acute load is redlining'],
    };
    const blockContext: TrainingBlockContext = {
        weekInBlock: 4,
        phase: 'pivot',
        volumeMultiplier: 0.72,
        intensityOffset: -1,
        focusBias: 'recovery',
        note: 'Pivot week.',
    };
    const result = generateWorkoutV2({
        readinessState: 'Caution',
        phase: 'off-season',
        acwr: 1.48,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'full_body',
        performanceGoalType: 'strength',
        performanceRisk: risk,
        blockContext,
    });
    assert('Red risk preserves only low-cost work',
        result.exercises.every((exercise) => exercise.exercise.cns_load <= 3));
    assert('Red risk sets recovery-forward intent',
        (result.sessionIntent ?? '').includes('Protect recovery'));
    assert('Decision trace records risk', result.decisionTrace.includes('risk:red'));
    assert('Red risk suppresses finisher sections',
        !result.sections?.some((section) => section.template === 'finisher'));
})();

(() => {
    const result = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'conditioning',
        performanceGoalType: 'conditioning',
        trainingDate: '2026-03-09',
    });
    assert('Conditioning goal surfaces conditioning adaptation', result.primaryAdaptation === 'conditioning');
    assert('Conditioning goal tags decision trace', result.decisionTrace.includes('goal:conditioning'));
    assert('Conditioning day emits sections', (result.sections?.length ?? 0) > 0);
})();

(() => {
    const result = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'lower',
        performanceGoalType: 'strength',
        trainingDate: '2026-03-09',
    });

    const mainSection = result.sections?.find((section) => section.template === 'main_strength');
    assert('Sectioned workout exposes a main strength block', Boolean(mainSection));
    assert('Main strength block uses top-set backoff loading',
        mainSection?.exercises.some((exercise) => exercise.loadingStrategy === 'top_set_backoff') ?? false);
    assert('Main strength block carries substitutions',
        mainSection?.exercises.some((exercise) => (exercise.substitutions?.length ?? 0) > 0) ?? false);
})();

(() => {
    const first = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'upper_push',
        performanceGoalType: 'strength',
        trainingDate: '2026-03-09',
    });
    const second = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'upper_push',
        performanceGoalType: 'strength',
        trainingDate: '2026-03-16',
    });

    const firstAnchor = first.sections?.find((section) => section.template === 'main_strength')?.exercises[0]?.progressionAnchor?.key;
    const secondAnchor = second.sections?.find((section) => section.template === 'main_strength')?.exercises[0]?.progressionAnchor?.key;
    assert('Main lift anchor remains stable across repeated upper-push generations', firstAnchor === secondAnchor);
})();

(() => {
    const result = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        exerciseLibrary: MOCK_LIBRARY,
        recentExerciseIds: [],
        recentMuscleVolume: { ...EMPTY_VOLUME },
        fitnessLevel: 'intermediate',
        focus: 'lower',
        performanceGoalType: 'strength',
        availableMinutes: 28,
        trainingDate: '2026-03-09',
    });

    assert('Short sessions keep the main strength section',
        result.sections?.some((section) => section.template === 'main_strength') ?? false);
    assert('Short sessions trim optional finisher work first',
        !result.sections?.some((section) => section.template === 'finisher'));
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);

