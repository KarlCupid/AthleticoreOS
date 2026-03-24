/**
 * Standalone test script for lib/engine/calculateSchedule.ts
 *
 * Run with:  npx tsx lib/engine/calculateSchedule.test.ts
 */

import {
    getRecoveryWindow,
    validateDayLoad,
    suggestAlternative,
    adjustNutritionForDay,
    detectOvertrainingRisk,
    generateSmartWeekPlan,
    generateWeekPlan,
    getBoxingIntensityScalar,
} from './calculateSchedule.ts';
import { generateCampPlan } from './calculateCamp.ts';
import type {
    NutritionTargets,
    RecurringActivityRow,
    WeeklyTargetsRow,
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
        entry.focus === 'lower'
        || entry.focus === 'upper_push'
        || entry.focus === 'upper_pull'
        || entry.focus === 'full_body'
    ).length;
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

// ─── Boxing intensity scalar ──────────────────────────────────

console.log('\n── getBoxingIntensityScalar ──');

(() => {
    assert('Active cut -> 0.6', getBoxingIntensityScalar({ isOnActiveCut: true, daysOut: 10 }) === 0.6);
})();

(() => {
    assert('7 days out -> 0.6', getBoxingIntensityScalar({ isOnActiveCut: false, daysOut: 7 }) === 0.6);
})();

(() => {
    assert('Not on cut, 21 days out -> 1.0', getBoxingIntensityScalar({ isOnActiveCut: false, daysOut: 21 }) === 1);
})();

(() => {
    assert('Not on cut, null daysOut -> 1.0', getBoxingIntensityScalar({ isOnActiveCut: false, daysOut: null }) === 1);
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

// ─── adjustNutritionForDay ────────────────────────────────────

console.log('\n── adjustNutritionForDay ──');

const baseTargets: NutritionTargets = {
    tdee: 2500, adjustedCalories: 2500, protein: 180, carbs: 280,
    fat: 70, proteinModifier: 1, phaseMultiplier: 0, weightCorrectionDeficit: 0,
    message: '',
};

(() => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'rest', expected_intensity: 1, estimated_duration_min: 0 },
    ]);
    assert('Rest day -> -15% carbs', result.carbModifierPct === -15);
})();

(() => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ]);
    assert('Sparring day -> +15% carbs or more', result.carbModifierPct >= 15);
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

// ─── generateWeekPlan ─────────────────────────────────────────

console.log('\n── generateWeekPlan ──');

const mockTemplate: RecurringActivityRow[] = [
    {
        id: 't1', user_id: 'u1', activity_type: 'sparring',
        custom_label: 'Tuesday Sparring', start_time: '18:00:00',
        estimated_duration_min: 90, expected_intensity: 8,
        session_components: [], is_active: true,
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [2] },
    },
    {
        id: 't2', user_id: 'u1', activity_type: 'boxing_practice',
        custom_label: 'Thursday Pads', start_time: '17:00:00',
        estimated_duration_min: 60, expected_intensity: 6,
        session_components: [], is_active: true,
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [4] },
    },
];

const mockTargets: WeeklyTargetsRow = {
    id: 'wt1', user_id: 'u1',
    sc_sessions: 3, running_sessions: 0, boxing_sessions: 2,
    conditioning_sessions: 0, recovery_sessions: 1,
    road_work_sessions: 0,
    total_weekly_load_cap: 5000,
};

(() => {
    const plan = generateWeekPlan({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        recurringActivities: mockTemplate,
        existingActivities: [],
        exerciseLibrary: [],
        weeklyTargets: mockTargets,
        sleepTrendAvg: 4.0,
        weekStartDate: '2026-01-05',
    });
    const templateEntries = plan.filter(a => a.source === 'template');
    const engineEntries = plan.filter(a => a.source === 'engine');
    assert('Template entries present', templateEntries.length === 2);
    assert('Engine fills SC sessions', engineEntries.length > 0);
})();

(() => {
    const plan = generateWeekPlan({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        recurringActivities: mockTemplate,
        existingActivities: [],
        exerciseLibrary: [],
        weeklyTargets: mockTargets,
        sleepTrendAvg: 4.0,
        weekStartDate: '2026-01-05',
    });
    const sparringDates = plan.filter(a => a.activity_type === 'sparring').map(a => a.date);
    const scDates = plan.filter(a => a.source === 'engine' && a.activity_type === 'sc').map(a => a.date);
    for (const sd of sparringDates) {
        assert(`SC not placed on sparring day ${sd}`, !scDates.includes(sd));
    }
})();

(() => {
    const plan = generateWeekPlan({
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        recurringActivities: mockTemplate,
        existingActivities: [],
        exerciseLibrary: [],
        weeklyTargets: mockTargets,
        sleepTrendAvg: 4.0,
        weekStartDate: '2026-01-05',
        activeCutPlan: { weigh_in_date: '2026-01-12' } as any,
    });
    const sparring = plan.find(a => a.activity_type === 'sparring');
    assert('Active cut tapers boxing to intensity 4', sparring?.expected_intensity === 4);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
// ─── generateSmartWeekPlan ─────────────────────────────────────

console.log('\n── generateSmartWeekPlan ──');

(() => {
    const { camp, weekStartDate } = makeCampPhaseContext('base');
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 2, 3, 4, 5, 6] }),
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: camp,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate,
        recurringActivities: [],
    });
    const guided = getGuidedEntries(result);
    assert('Camp weeks treat availability as max capacity', guided.length === 4);
    assert('Base phase does not auto-fill all available days', guided.length < 6);
})();

(() => {
    const phases: Array<['base' | 'build' | 'peak' | 'taper', { guided: number; strength: number; conditioning: number; recovery: number }]> = [
        ['base', { guided: 4, strength: 2, conditioning: 1, recovery: 1 }],
        ['build', { guided: 4, strength: 2, conditioning: 1, recovery: 1 }],
        ['peak', { guided: 3, strength: 1, conditioning: 1, recovery: 1 }],
        ['taper', { guided: 2, strength: 0, conditioning: 0, recovery: 2 }],
    ];

    for (const [campPhase, expected] of phases) {
        const { camp, weekStartDate } = makeCampPhaseContext(campPhase);
        const result = generateSmartWeekPlan({
            config: makeSmartConfig(),
            readinessState: 'Prime',
            phase: 'fight-camp',
            acwr: 1.0,
            fitnessLevel: 'intermediate',
            performanceGoalType: 'conditioning',
            exerciseLibrary: [],
            recentMuscleVolume: { ...EMPTY_VOLUME } as any,
            campConfig: camp,
            activeCutPlan: null,
            weeksSinceLastDeload: 1,
            gymProfile: null,
            weekStartDate,
            recurringActivities: [],
        });
        const guided = getGuidedEntries(result);
        const strengthCount = countStrengthEntries(guided);
        const conditioningCount = guided.filter((entry) => entry.focus === 'conditioning').length;
        const recoveryCount = guided.filter((entry) => entry.focus === 'recovery').length;

        assert(`${campPhase} phase guided-session ceiling`, guided.length === expected.guided);
        assert(`${campPhase} phase strength mix`, strengthCount === expected.strength);
        assert(`${campPhase} phase conditioning mix`, conditioningCount === expected.conditioning);
        assert(`${campPhase} phase recovery mix`, recoveryCount === expected.recovery);
    }
})();

(() => {
    const { camp, weekStartDate } = makeCampPhaseContext('build');
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 2, 3, 4] }),
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'boxing_skill',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: camp,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate,
        recurringActivities: [
            makeRecurringActivity('boxing_practice', [1, 3], {
                estimated_duration_min: 60,
                expected_intensity: 4,
            }),
        ],
    });
    const guided = getGuidedEntries(result);
    const boxingPracticeGuided = guided.filter((entry) => entry.day_of_week === 1 || entry.day_of_week === 3);
    assert('Boxing practice days can still receive guided work', boxingPracticeGuided.length === 2);
    assert('Boxing practice days do not collapse into spar support focus', boxingPracticeGuided.every((entry) => entry.focus !== 'sport_specific'));
    assert('No stray sport_specific sessions without sparring anchors', guided.every((entry) => entry.focus !== 'sport_specific'));
})();

(() => {
    const { camp, weekStartDate } = makeCampPhaseContext('build');
    const result = generateSmartWeekPlan({
        config: makeSmartConfig({ available_days: [1, 2, 3, 4, 5, 6] }),
        readinessState: 'Prime',
        phase: 'fight-camp',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: [],
        recentMuscleVolume: { ...EMPTY_VOLUME } as any,
        campConfig: camp,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate,
        recurringActivities: [
            makeRecurringActivity('sparring', [2, 5]),
        ],
    });
    const guided = getGuidedEntries(result);
    const sparSupportDays = guided.filter((entry) => entry.day_of_week === 2 || entry.day_of_week === 5);
    assert('Real sparring days get support sessions', sparSupportDays.length === 2);
    assert('Sparring days stay sport_specific', sparSupportDays.every((entry) => entry.focus === 'sport_specific'));
    assert('Sparring support stays activation-only in duration', sparSupportDays.every((entry) => entry.estimated_duration_min <= 30));
    assert('Sparring support stays activation-only in intensity', sparSupportDays.every((entry) => (entry.target_intensity ?? 10) <= 5));
})();

console.log(`\n── Final Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
