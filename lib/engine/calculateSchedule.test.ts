/**
 * Standalone test script for lib/engine/calculateSchedule.ts
 *
 * Run with:  npx tsx lib/engine/calculateSchedule.test.ts
 */

import {
    getRecoveryWindow,
    validateDayLoad,
    suggestAlternative,
    detectOvertrainingRisk,
    generateSmartWeekPlan,
    generateBlockPlan,
    resolveGuidedAvailability,
    updateRollingPlanContextFromPrescription,
} from './calculateSchedule.ts';
import { generateWorkoutV2 } from './calculateSC.ts';
import { generateCampPlan } from './calculateCamp.ts';
import type {
    ExerciseHistoryEntry,
    ExerciseLibraryRow,
    MuscleGroup,
    RecurringActivityRow,
} from './types.ts';

// ─── Test Runner ───────────────────────────────────────────────

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

const EMPTY_VOLUME = {
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

function makeExercise(overrides: Partial<ExerciseLibraryRow> = {}): ExerciseLibraryRow {
    return {
        id: 'ex-' + Math.random().toString(36).slice(2, 8),
        name: 'Test Exercise',
        type: 'heavy_lift',
        cns_load: 5,
        muscle_group: 'quads',
        equipment: 'barbell',
        description: 'Test exercise',
        cues: 'Own every rep.',
        sport_tags: ['boxing'],
        ...overrides,
    };
}

const ROTATION_LIBRARY: ExerciseLibraryRow[] = [
    makeExercise({ id: 'act-1', name: 'Hip Airplane', type: 'mobility', cns_load: 1, muscle_group: 'glutes' }),
    makeExercise({ id: 'act-2', name: 'Ankle Rocks', type: 'mobility', cns_load: 1, muscle_group: 'calves' }),
    makeExercise({ id: 'act-3', name: 'Breathing Reset', type: 'active_recovery', cns_load: 1, muscle_group: 'core' }),
    makeExercise({ id: 'pow-1', name: 'Box Jump', type: 'power', cns_load: 4, muscle_group: 'quads', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'main-1', name: 'Back Squat', type: 'heavy_lift', cns_load: 8, muscle_group: 'quads', normalized_recovery_cost: 9 }),
    makeExercise({ id: 'main-2', name: 'Front Squat', type: 'heavy_lift', cns_load: 7, muscle_group: 'quads', normalized_recovery_cost: 8 }),
    makeExercise({ id: 'main-3', name: 'Trap Bar Deadlift', type: 'heavy_lift', cns_load: 8, muscle_group: 'glutes', normalized_recovery_cost: 9 }),
    makeExercise({ id: 'sec-1', name: 'RDL', type: 'heavy_lift', cns_load: 6, muscle_group: 'hamstrings', normalized_recovery_cost: 6 }),
    makeExercise({ id: 'sec-2', name: 'Bulgarian Split Squat', type: 'heavy_lift', cns_load: 4, muscle_group: 'glutes', normalized_recovery_cost: 5 }),
    makeExercise({ id: 'sec-3', name: 'Step-Up', type: 'heavy_lift', cns_load: 3, muscle_group: 'quads', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'acc-1', name: 'Sled March', type: 'conditioning', cns_load: 4, muscle_group: 'quads', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'acc-2', name: 'Rotational Cable Punch', type: 'sport_specific', cns_load: 4, muscle_group: 'core', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'acc-3', name: 'Battle Rope Waves', type: 'conditioning', cns_load: 4, muscle_group: 'shoulders', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'acc-4', name: 'Medicine Ball Scoop Toss', type: 'sport_specific', cns_load: 4, muscle_group: 'core', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'acc-5', name: 'Tempo Bike', type: 'conditioning', cns_load: 4, muscle_group: 'full_body', normalized_recovery_cost: 4 }),
    makeExercise({ id: 'dur-1', name: 'Pallof Press', type: 'mobility', cns_load: 2, muscle_group: 'core', normalized_recovery_cost: 2 }),
    makeExercise({ id: 'dur-2', name: 'Copenhagen Plank', type: 'mobility', cns_load: 2, muscle_group: 'core', normalized_recovery_cost: 2 }),
    makeExercise({ id: 'dur-3', name: 'Neck Harness Hold', type: 'active_recovery', cns_load: 2, muscle_group: 'neck', normalized_recovery_cost: 2 }),
    makeExercise({ id: 'dur-4', name: 'Shoulder CARs', type: 'mobility', cns_load: 1, muscle_group: 'shoulders', normalized_recovery_cost: 1 }),
    makeExercise({ id: 'fin-1', name: 'Assault Bike Sprint', type: 'conditioning', cns_load: 4, muscle_group: 'full_body', normalized_recovery_cost: 4 }),
];

function makeSmartConfig(overrides: Record<string, any> = {}) {
    const availableDays = overrides.available_days ?? [1, 2, 3, 4, 5, 6];
    return {
        id: 'cfg-1',
        user_id: 'u1',
        available_days: availableDays,
        availability_windows: availableDays.map((dayOfWeek: number) => ({
            dayOfWeek,
            startTime: '08:00',
            endTime: '12:00',
        })),
        session_duration_min: 60,
        allow_two_a_days: false,
        two_a_day_days: [],
        am_session_type: 'sc',
        pm_session_type: 'boxing_practice',
        preferred_gym_profile_id: null,
        auto_deload_interval_weeks: 4,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        ...overrides,
    } as any;
}

function makeCampPhaseContext(campPhase: 'base' | 'build' | 'peak' | 'taper') {
    const camp = generateCampPlan({
        userId: 'u1',
        campStartDate: '2026-01-05',
        fightDate: '2026-03-28',
        hasConcurrentCut: false,
    });
    const weekStartDate = campPhase === 'base'
        ? camp.basePhaseDates.start
        : campPhase === 'build'
            ? camp.buildPhaseDates.start
            : campPhase === 'peak'
                ? camp.peakPhaseDates.start
                : camp.taperPhaseDates.start;
    return {
        camp,
        weekStartDate,
    };
}

function makeRecurringActivity(activity_type: 'boxing_practice' | 'sparring', days: number[], overrides: Record<string, any> = {}): RecurringActivityRow {
    return {
        id: `${activity_type}-${days.join('-')}`,
        user_id: 'u1',
        activity_type,
        custom_label: activity_type === 'sparring' ? 'Sparring' : 'Boxing Practice',
        start_time: '18:00:00',
        estimated_duration_min: 90,
        expected_intensity: activity_type === 'sparring' ? 8 : 6,
        session_components: [],
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: days },
        is_active: true,
        ...overrides,
    };
}

function getGuidedEntries(result: ReturnType<typeof generateSmartWeekPlan>) {
    return result.entries.filter((entry) => entry.focus != null);
}

function countStrengthEntries(entries: ReturnType<typeof getGuidedEntries>) {
    return entries.filter((entry) =>
        entry.session_family !== 'durability_core'
        && (
            entry.focus === 'lower'
            || entry.focus === 'upper_push'
            || entry.focus === 'upper_pull'
            || entry.focus === 'full_body'
        )
    ).length;
}

function countDurabilityEntries(entries: ReturnType<typeof getGuidedEntries>) {
    return entries.filter((entry) => entry.session_family === 'durability_core').length;
}

// ─── getRecoveryWindow ────────────────────────────────────────

console.log('\n── getRecoveryWindow ──');

(() => {
    assert('Sparring intensity 8 -> 48h', getRecoveryWindow('sparring', 8) === 48);
})();

(() => {
    const window = getRecoveryWindow('sparring', 5);
    assert('Sparring intensity 5 -> reduced (<48h)', window < 48);
})();

(() => {
    assert('Active recovery -> 0h', getRecoveryWindow('active_recovery', 10) === 0);
})();

(() => {
    assert('SC intensity 7 -> 36h', getRecoveryWindow('sc', 7) === 36);
})();

(() => {
    assert('Running intensity 8 -> 24h', getRecoveryWindow('running', 8) === 24);
})();

(() => {
    assert('Conditioning intensity 7 -> 24h', getRecoveryWindow('conditioning', 7) === 24);
})();

// ─── validateDayLoad ──────────────────────────────────────────

console.log('\n── validateDayLoad ──');

(() => {
    const result = validateDayLoad([]);
    assert('Empty day is safe', result.safe === true);
    assert('Empty day load = 0', result.totalLoad === 0);
})();

(() => {
    const result = validateDayLoad([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60 },
    ]);
    assert('Single moderate session is safe', result.safe === true);
})();

(() => {
    const result = validateDayLoad([
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 60 },
        { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60 },
    ]);
    assert('Sparring + heavy SC is unsafe', result.safe === false);
})();

// Calendar availability

console.log('\n-- resolveGuidedAvailability --');

(() => {
    const result = resolveGuidedAvailability({
        dayWindows: [{ dayOfWeek: 2, startTime: '17:00', endTime: '20:00' }],
        dayOfWeek: 2,
        recurringAnchors: [
            makeRecurringActivity('sparring', [2], {
                start_time: '18:00:00',
                estimated_duration_min: 60,
            }),
        ],
        primaryCombatAnchorStart: 18 * 60,
        primaryCombatAnchorEnd: 19 * 60,
    });
    assert('Availability helper subtracts fixed combat time', result.maxMinutes === 60);
    assert('Availability helper prefers before/after combat placement', result.placement === 'before' || result.placement === 'after');
})();

(() => {
    const result = resolveGuidedAvailability({
        dayWindows: [{ dayOfWeek: 2, startTime: '18:00', endTime: '19:00' }],
        dayOfWeek: 2,
        recurringAnchors: [
            makeRecurringActivity('sparring', [2], {
                start_time: '18:00:00',
                estimated_duration_min: 60,
            }),
        ],
        primaryCombatAnchorStart: 18 * 60,
        primaryCombatAnchorEnd: 19 * 60,
    });
    assert('Availability helper returns zero when fixed combat consumes the window', result.maxMinutes === 0);
})();

// ─── suggestAlternative ───────────────────────────────────────

console.log('\n── suggestAlternative ──');

(() => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 9, custom_label: 'Sparring' },
        'Prime',
    );
    assert('Prime readiness -> no swap', result.shouldSwap === false);
})();

(() => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 8, custom_label: 'Sparring' },
        'Depleted',
    );
    assert('Depleted + sparring -> swap', result.shouldSwap === true);
    assert('Depleted + sparring -> boxing_practice', result.alternative === 'boxing_practice');
})();

(() => {
    const result = suggestAlternative(
        { activity_type: 'sc', expected_intensity: 8, custom_label: null },
        'Depleted',
    );
    assert('Depleted + SC -> swap to active_recovery', result.shouldSwap === true);
    assert('Depleted SC alternative = active_recovery', result.alternative === 'active_recovery');
})();

// ─── detectOvertrainingRisk ───────────────────────────────────

console.log('\n── detectOvertrainingRisk ──');

(() => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
        { activity_type: 'running', expected_intensity: 5, estimated_duration_min: 30, date: '2026-01-07' },
    ], 1.0, 4.0);
    assert('Normal week -> no warnings', warnings.length === 0);
})();

(() => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.6, 4.0);
    assert('ACWR > 1.5 -> danger warning', warnings.length > 0 && warnings[0].severity === 'danger');
})();

(() => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.0, 2.5);
    assert('Poor sleep -> warning', warnings.length > 0);
})();

console.log('\n-- generateSmartWeekPlan adaptive path --');

(() => {
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 2, 3, 4, 5] }),
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate: '2026-03-02',
        recurringActivities: [
            makeRecurringActivity('sparring', [2], {
                id: 'protected-sparring',
                athlete_locked: true,
                constraint_tier: 'mandatory',
            }),
        ],
    });
    const protectedSparring = result.entries.find((entry) => entry.session_type === 'sparring') ?? null;
    const generatedHard = result.entries.filter((entry) => entry.placement_source === 'generated' && (entry.target_intensity ?? 0) >= 7);

    assert('Smart week planning now uses the Adaptive Training Engine', result.message.includes('Adaptive Training Engine'));
    assert('Weekly mix intent identifies the Adaptive Training Engine', result.weeklyMixPlan.weekIntent.includes('Adaptive Training Engine'));
    assert('Protected sparring is emitted as a locked anchor', protectedSparring?.placement_source === 'locked');
    assert('Protected sparring remains on its original weekday', protectedSparring?.day_of_week === 2);
    assert('Hard protected sessions reduce generated high-intensity volume', generatedHard.length <= 1);
})();

(() => {
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 2, 3, 4, 5] }),
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate: '2026-03-02',
        recurringActivities: [
            makeRecurringActivity('sparring', [2], {
                id: 'protected-sparring-a',
                athlete_locked: true,
                constraint_tier: 'mandatory',
            }),
            makeRecurringActivity('sparring', [5], {
                id: 'protected-sparring-b',
                athlete_locked: true,
                constraint_tier: 'mandatory',
            }),
        ],
    });
    const protectedSparringCount = result.entries.filter((entry) => entry.session_type === 'sparring' && entry.placement_source === 'locked').length;
    const recoveryTarget = result.weeklyMixPlan.sessionTargets.find((target) => target.family === 'recovery');

    assert('Multiple protected sparring anchors are preserved', protectedSparringCount === 2);
    assert('Adaptive weekly plan keeps recovery in the weekly targets', recoveryTarget != null);
    assert('Engine notes explain protected anchor preservation', result.entries.some((entry) => entry.engine_notes?.includes('Protected anchor preserved')));
})();

(() => {
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 3, 5], session_duration_min: 75 }),
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: ROTATION_LIBRARY,
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate: '2026-03-02',
        recurringActivities: [],
    });
    const guided = getGuidedEntries(result);

    assert('Adaptive scheduler returns generated guided sessions', guided.length > 0);
    assert('Generated guided sessions carry prescriptions when the exercise library is available', guided.every((entry) => (entry.prescription_snapshot?.exercises.length ?? 0) > 0));
    assert('Generated entries are marked with adaptive engine notes', guided.every((entry) => entry.engine_notes?.includes('Adaptive Training Engine')));
})();

(() => {
    const block = generateBlockPlan({
        config: makeSmartConfig({ available_days: [1, 2, 4, 5] }),
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'boxing_skill',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        recurringActivities: [],
        startDate: '2026-03-02',
        weeks: 2,
    });

    assert('Block planning still returns the requested number of weeks', block.weeks.length === 2);
    assert('Block planning is backed by Adaptive Training Engine mix plans', block.weeks.every((week) => week.weeklyMixPlan.weekIntent.includes('Adaptive Training Engine')));
})();

(() => {
    const recentExerciseIds: string[] = [];
    const recentMuscleVolume = { ...EMPTY_VOLUME } as Record<MuscleGroup, number>;
    const exerciseHistory = new Map<string, ExerciseHistoryEntry[]>();
    const firstWorkout = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'advanced',
        performanceGoalType: 'strength',
        exerciseLibrary: ROTATION_LIBRARY,
        recentExerciseIds,
        recentMuscleVolume,
        exerciseHistory,
        weeklyPlanFocus: 'lower',
        trainingDate: '2026-03-02',
        availableMinutes: 60,
    });
    updateRollingPlanContextFromPrescription({
        prescription: firstWorkout,
        trainingDate: '2026-03-02',
        recentExerciseIds,
        recentMuscleVolume,
        exerciseHistory,
    });
    const secondWorkout = generateWorkoutV2({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'advanced',
        performanceGoalType: 'strength',
        exerciseLibrary: ROTATION_LIBRARY,
        recentExerciseIds,
        recentMuscleVolume,
        exerciseHistory,
        weeklyPlanFocus: 'lower',
        trainingDate: '2026-03-05',
        availableMinutes: 60,
    });
    const firstExerciseKey = firstWorkout.exercises
        .filter((exercise) => exercise.sectionTemplate !== 'activation' && exercise.sectionTemplate !== 'cooldown')
        .map((exercise) => exercise.exercise.id)
        .join('|');
    const secondExerciseKey = secondWorkout.exercises
        .filter((exercise) => exercise.sectionTemplate !== 'activation' && exercise.sectionTemplate !== 'cooldown')
        .map((exercise) => exercise.exercise.id)
        .join('|');
    assert('Rolling plan context stores the first workout in exercise history', exerciseHistory.size > 0);
    assert('Rolling plan context changes the next same-focus workout selection', firstExerciseKey !== secondExerciseKey);
})();

console.log(`\n── Final Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
