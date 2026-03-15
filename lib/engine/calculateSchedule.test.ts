console.log('\nâ”€â”€ generateSmartWeekPlan â”€â”€');

import {
    getRecoveryWindow,
    validateDayLoad,
    suggestAlternative,
    adjustNutritionForDay,
    detectOvertrainingRisk,
    generateWeekPlan,
    generateSmartWeekPlan,
    calculateWeeklyCompliance,
    getTrainingStreak,
} from './calculateSchedule';
import type {
    NutritionTargets,
    RecurringActivityRow,
    WeeklyTargetsRow,
    ExerciseLibraryRow,
    WeeklyPlanConfigRow,
} from './types';
import { formatLocalDate, todayLocalDate } from '../utils/date';

// ─── Test Runner ───────────────────────────────────────────────

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (e: any) { failed++; console.log(`  ✗ ${name}: ${e.message}`); }
}
function expect(v: any) {
    return {
        toBe: (x: any) => { if (v !== x) throw new Error(`${v} !== ${x}`); },
        toBeGreaterThan: (x: number) => { if (v <= x) throw new Error(`${v} <= ${x}`); },
        toBeGreaterThanOrEqual: (x: number) => { if (v < x) throw new Error(`${v} < ${x}`); },
        toBeLessThan: (x: number) => { if (v >= x) throw new Error(`${v} >= ${x}`); },
        toBeTruthy: () => { if (!v) throw new Error(`${v} is falsy`); },
        toBeFalsy: () => { if (v) throw new Error(`${v} is truthy`); },
        toContain: (x: string) => { if (typeof v === 'string' && !v.includes(x)) throw new Error(`"${v}" does not contain "${x}"`); },
    };
}

// ─── getRecoveryWindow ─────────────────────────────────────────

console.log('\n── getRecoveryWindow ──');

test('Sparring intensity 8 → 48h recovery', () => {
    expect(getRecoveryWindow('sparring', 8)).toBe(48);
});

test('Sparring intensity 5 → reduced recovery', () => {
    expect(getRecoveryWindow('sparring', 5)).toBeLessThan(48);
});

test('Active recovery → 0h recovery', () => {
    expect(getRecoveryWindow('active_recovery', 10)).toBe(0);
});

test('S&C intensity 7 → 36h recovery', () => {
    expect(getRecoveryWindow('sc', 7)).toBe(36);
});

test('Running intensity 8 → 24h recovery', () => {
    expect(getRecoveryWindow('running', 8)).toBe(24);
});

// ─── validateDayLoad ───────────────────────────────────────────

console.log('\n── validateDayLoad ──');

test('Empty day is safe', () => {
    const result = validateDayLoad([]);
    expect(result.safe).toBe(true);
    expect(result.totalLoad).toBe(0);
});

test('Single moderate session is safe', () => {
    const result = validateDayLoad([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60 },
    ]);
    expect(result.safe).toBe(true);
});

test('Sparring + heavy SC flagged as unsafe', () => {
    const result = validateDayLoad([
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 60 },
        { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60 },
    ]);
    expect(result.safe).toBe(false);
    expect(result.message).toContain('CNS');
});

test('3 high-intensity sessions flagged', () => {
    const result = validateDayLoad([
        { activity_type: 'sc', expected_intensity: 8, estimated_duration_min: 60 },
        { activity_type: 'running', expected_intensity: 8, estimated_duration_min: 45 },
        { activity_type: 'conditioning', expected_intensity: 8, estimated_duration_min: 30 },
    ]);
    expect(result.safe).toBe(false);
});

// ─── suggestAlternative ────────────────────────────────────────

console.log('\n── suggestAlternative ──');

test('Prime readiness → no swap', () => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 9, custom_label: 'Tuesday Sparring' },
        'Prime',
    );
    expect(result.shouldSwap).toBe(false);
});

test('Depleted + sparring → swap to boxing practice', () => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 8, custom_label: 'Sparring' },
        'Depleted',
    );
    expect(result.shouldSwap).toBe(true);
    expect(result.alternative).toBe('boxing_practice');
    expect(result.message).toContain('Depleted');
});

test('Depleted + SC → swap to active recovery', () => {
    const result = suggestAlternative(
        { activity_type: 'sc', expected_intensity: 8, custom_label: null },
        'Depleted',
    );
    expect(result.shouldSwap).toBe(true);
    expect(result.alternative).toBe('active_recovery');
});

test('Caution + low intensity → no swap', () => {
    const result = suggestAlternative(
        { activity_type: 'running', expected_intensity: 5, custom_label: 'Easy Run' },
        'Caution',
    );
    expect(result.shouldSwap).toBe(false);
});

// ─── adjustNutritionForDay ─────────────────────────────────────

console.log('\n── adjustNutritionForDay ──');

const baseTargets: NutritionTargets = {
    tdee: 2500, adjustedCalories: 2500, protein: 180, carbs: 280,
    fat: 70, proteinModifier: 1, phaseMultiplier: 0, weightCorrectionDeficit: 0,
    message: '',
};

test('Rest day → negative carb modifier', () => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'rest', expected_intensity: 1, estimated_duration_min: 0 },
    ]);
    expect(result.carbModifierPct).toBe(-15);
    expect(result.message).toContain('Rest day');
});

test('Sparring day → +15% carbs', () => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ]);
    expect(result.carbModifierPct).toBeGreaterThanOrEqual(15);
    expect(result.calorieModifier).toBeGreaterThan(0);
});

test('Double session → extra fuel', () => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 60 },
        { activity_type: 'sc', expected_intensity: 7, estimated_duration_min: 60 },
    ]);
    expect(result.carbModifierPct).toBeGreaterThan(15);
    expect(result.hydrationBoostOz).toBeGreaterThan(16);
});

test('Empty day → rest adjustment', () => {
    const result = adjustNutritionForDay(baseTargets, []);
    expect(result.carbModifierPct).toBe(-15);
});

// ─── detectOvertrainingRisk ────────────────────────────────────

console.log('\n── detectOvertrainingRisk ──');

test('Normal week → no warnings', () => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
        { activity_type: 'running', expected_intensity: 5, estimated_duration_min: 30, date: '2026-01-07' },
    ], 1.0, 4.0);
    expect(warnings.length).toBe(0);
});

test('ACWR > 1.5 → danger warning', () => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.6, 4.0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].severity).toBe('danger');
    expect(warnings[0].title).toContain('ACWR');
});

test('Poor sleep → danger warning', () => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.0, 2.5);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(w => w.title.includes('Sleep'))).toBeTruthy();
});

test('5+ high intensity sessions → warning', () => {
    const activities = Array.from({ length: 5 }, (_, i) => ({
        activity_type: 'sc' as const,
        expected_intensity: 8,
        estimated_duration_min: 60,
        date: `2026-01-0${i + 1}`,
    }));
    const warnings = detectOvertrainingRisk(activities, 1.0, 4.0);
    expect(warnings.some(w => w.title.includes('Intense'))).toBeTruthy();
});

// ─── generateWeekPlan ──────────────────────────────────────────

console.log('\n── generateWeekPlan ──');

const mockTemplate: RecurringActivityRow[] = [
    {
        id: 't1', user_id: 'u1', activity_type: 'sparring',
        custom_label: 'Tuesday Sparring', start_time: '18:00:00',
        estimated_duration_min: 90, expected_intensity: 8,
        session_components: [], is_active: true,
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [2] }
    },
    {
        id: 't2', user_id: 'u1', activity_type: 'boxing_practice',
        custom_label: 'Thursday Pads', start_time: '17:00:00',
        estimated_duration_min: 60, expected_intensity: 6,
        session_components: [], is_active: true,
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [4] }
    },
];

const mockTargets: WeeklyTargetsRow = {
    id: 'wt1', user_id: 'u1',
    sc_sessions: 3, running_sessions: 0, boxing_sessions: 2,
    conditioning_sessions: 0, recovery_sessions: 1,
    road_work_sessions: 0,
    total_weekly_load_cap: 5000,
};

const smartPlanConfig: WeeklyPlanConfigRow = {
    id: 'cfg-1',
    user_id: 'u1',
    available_days: [1, 3, 5],
    availability_windows: [
        { dayOfWeek: 1, startTime: '17:00', endTime: '22:00' },
        { dayOfWeek: 3, startTime: '17:00', endTime: '22:00' },
        { dayOfWeek: 5, startTime: '17:00', endTime: '22:00' },
    ],
    session_duration_min: 60,
    allow_two_a_days: false,
    two_a_day_days: [],
    am_session_type: 'sc',
    pm_session_type: 'boxing_practice',
    preferred_gym_profile_id: null,
    auto_deload_interval_weeks: 5,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
};

const smartPlanLibrary: ExerciseLibraryRow[] = [
    { id: 'ex-1', name: 'Back Squat', type: 'heavy_lift', cns_load: 8, muscle_group: 'quads', equipment: 'barbell', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-2', name: 'Bench Press', type: 'heavy_lift', cns_load: 7, muscle_group: 'chest', equipment: 'barbell', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-3', name: 'Row', type: 'heavy_lift', cns_load: 7, muscle_group: 'back', equipment: 'barbell', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-4', name: 'Jump Rope', type: 'conditioning', cns_load: 3, muscle_group: 'calves', equipment: 'other', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-5', name: 'Sled Push', type: 'conditioning', cns_load: 6, muscle_group: 'quads', equipment: 'sled', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-6', name: 'Hip Mobility', type: 'mobility', cns_load: 1, muscle_group: 'glutes', equipment: 'bodyweight', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-7', name: 'Pallof Press', type: 'sport_specific', cns_load: 3, muscle_group: 'core', equipment: 'cable', description: '', cues: '', sport_tags: ['boxing'] },
    { id: 'ex-8', name: 'Box Jump', type: 'power', cns_load: 5, muscle_group: 'quads', equipment: 'bodyweight', description: '', cues: '', sport_tags: ['boxing'] },
];

test('Generates template entries + SC fills', () => {
    const plan = generateWeekPlan({
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        recurringActivities: mockTemplate,
        existingActivities: [],
        exerciseLibrary: [],
        weeklyTargets: mockTargets,
        sleepTrendAvg: 4.0,
        weekStartDate: '2026-01-05', // Monday
    });
    // Should have template entries + SC fills
    const templateEntries = plan.filter(a => a.source === 'template');
    const engineEntries = plan.filter(a => a.source === 'engine');
    expect(templateEntries.length).toBe(2);
    expect(engineEntries.length).toBeGreaterThan(0);
});

test('Depleted readiness → lower SC intensity', () => {
    const plan = generateWeekPlan({
        readinessState: 'Depleted',
        phase: 'fight-camp',
        acwr: 1.4,
        recurringActivities: mockTemplate,
        existingActivities: [],
        exerciseLibrary: [],
        weeklyTargets: mockTargets,
        sleepTrendAvg: 2.5,
        weekStartDate: '2026-01-05',
    });
    const scSessions = plan.filter(a => a.activity_type === 'sc');
    for (const sc of scSessions) {
        expect(sc.expected_intensity).toBeLessThan(7);
        expect(sc.engine_recommendation).toBeTruthy();
    }
});

test('Engine avoids placing SC on sparring day', () => {
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
    // SC should not be on sparring days
    for (const sd of sparringDates) {
        expect(scDates.includes(sd)).toBeFalsy();
    }
});

test('Smart plan keeps guided slots on boxing-anchor days without two-a-day opt-in', () => {
    const boxingAnchors: RecurringActivityRow[] = [1, 3, 5].map((day, index) => ({
        id: `bp-${index}`,
        user_id: 'u1',
        activity_type: 'boxing_practice',
        custom_label: 'Boxing',
        start_time: '19:00:00',
        estimated_duration_min: 60,
        expected_intensity: 5,
        session_components: [],
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [day] },
        is_active: true,
    }));

    const result = generateSmartWeekPlan({
        config: smartPlanConfig,
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: smartPlanLibrary,
        recentExerciseIds: [],
        recentMuscleVolume: {
            chest: 0, back: 0, shoulders: 0, quads: 0, hamstrings: 0,
            glutes: 0, arms: 0, core: 0, full_body: 0, neck: 0, calves: 0,
        },
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate: '2026-03-16',
        recurringActivities: boxingAnchors,
    });

    const guided = result.entries.filter((entry) => entry.focus != null);
    const combat = result.entries.filter((entry) => entry.session_type === 'boxing_practice');
    expect(guided.length).toBe(3);
    expect(combat.length).toBe(3);
    expect(guided.some((entry) => entry.focus === 'sport_specific')).toBeFalsy();
    expect(guided[0]?.session_type).toBe('conditioning');
    expect(guided[0]?.prescription_snapshot?.workoutType).toBe('conditioning');
});

test('Smart plan skips guided slot when fixed combat session leaves no contiguous availability', () => {
    const tightConfig: WeeklyPlanConfigRow = {
        ...smartPlanConfig,
        availability_windows: [
            { dayOfWeek: 1, startTime: '18:00', endTime: '20:00' },
            { dayOfWeek: 3, startTime: '18:00', endTime: '20:00' },
            { dayOfWeek: 5, startTime: '18:00', endTime: '20:00' },
        ],
    };
    const boxingAnchors: RecurringActivityRow[] = [1, 3, 5].map((day, index) => ({
        id: `tight-${index}`,
        user_id: 'u1',
        activity_type: 'boxing_practice',
        custom_label: 'Boxing',
        start_time: '18:10:00',
        estimated_duration_min: 100,
        expected_intensity: 7,
        session_components: [],
        recurrence: { frequency: 'weekly', interval: 1, days_of_week: [day] },
        is_active: true,
    }));

    const result = generateSmartWeekPlan({
        config: tightConfig,
        readinessState: 'Prime',
        phase: 'off-season',
        acwr: 1.0,
        fitnessLevel: 'intermediate',
        performanceGoalType: 'conditioning',
        exerciseLibrary: smartPlanLibrary,
        recentExerciseIds: [],
        recentMuscleVolume: {
            chest: 0, back: 0, shoulders: 0, quads: 0, hamstrings: 0,
            glutes: 0, arms: 0, core: 0, full_body: 0, neck: 0, calves: 0,
        },
        campConfig: null,
        activeCutPlan: null,
        weeksSinceLastDeload: 1,
        gymProfile: null,
        weekStartDate: '2026-03-16',
        recurringActivities: boxingAnchors,
    });

    const guided = result.entries.filter((entry) => entry.focus != null);
    const combat = result.entries.filter((entry) => entry.session_type === 'boxing_practice');
    expect(guided.length).toBe(0);
    expect(combat.length).toBe(3);
    expect(combat.every((entry) => (entry.engine_notes ?? '').includes('no remaining contiguous availability window'))).toBeTruthy();
});

// ─── calculateWeeklyCompliance ─────────────────────────────────

console.log('\n── calculateWeeklyCompliance ──');

test('100% compliance', () => {
    const planned = [
        { activity_type: 'sc' as const, expected_intensity: 7, estimated_duration_min: 60 },
        { activity_type: 'sparring' as const, expected_intensity: 8, estimated_duration_min: 90 },
    ];
    const actual = [
        { activity_type: 'sc' as const, status: 'completed' as const, actual_rpe: 7, actual_duration_min: 55, expected_intensity: 7, estimated_duration_min: 60 },
        { activity_type: 'sparring' as const, status: 'completed' as const, actual_rpe: 8, actual_duration_min: 85, expected_intensity: 8, estimated_duration_min: 90 },
    ];
    const report = calculateWeeklyCompliance(planned, actual, 5);
    expect(report.overallPct).toBe(100);
    expect(report.streak).toBe(5);
    expect(report.message).toContain('Outstanding');
});

test('0% compliance', () => {
    const planned = [
        { activity_type: 'sc' as const, expected_intensity: 7, estimated_duration_min: 60 },
    ];
    const actual = [
        { activity_type: 'sc' as const, status: 'skipped' as const, actual_rpe: null, actual_duration_min: null, expected_intensity: 7, estimated_duration_min: 60 },
    ];
    const report = calculateWeeklyCompliance(planned, actual, 0);
    expect(report.overallPct).toBe(0);
    expect(report.message).toContain('Tough week');
});

// ─── getTrainingStreak ─────────────────────────────────────────

console.log('\n── getTrainingStreak ──');

test('Empty dates → 0 streak', () => {
    expect(getTrainingStreak([])).toBe(0);
});

test('Consecutive dates including today → correct streak', () => {
    const today = todayLocalDate();
    const yesterday = formatLocalDate(new Date(Date.now() - 86400000));
    const dayBefore = formatLocalDate(new Date(Date.now() - 2 * 86400000));
    expect(getTrainingStreak([today, yesterday, dayBefore])).toBe(3);
});

test('Gap breaks streak', () => {
    const today = todayLocalDate();
    const threeDaysAgo = formatLocalDate(new Date(Date.now() - 3 * 86400000));
    expect(getTrainingStreak([today, threeDaysAgo])).toBe(1);
});

// ─── Cut-Aware: suggestAlternative ─────────────────────────────

console.log('\n── Cut-Aware suggestAlternative ──');

test('Intensity cap 4 + session at 7 → always swap', () => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 7, custom_label: 'Sparring' },
        'Prime',
        4,
    );
    expect(result.shouldSwap).toBe(true);
    expect(result.message).toContain('Weight cut protocol');
});

test('Intensity cap 2 → swap to rest', () => {
    const result = suggestAlternative(
        { activity_type: 'sc', expected_intensity: 5, custom_label: null },
        'Prime',
        2,
    );
    expect(result.shouldSwap).toBe(true);
    expect(result.alternative).toBe('rest');
});

test('No cap → Prime still full send', () => {
    const result = suggestAlternative(
        { activity_type: 'sparring', expected_intensity: 9, custom_label: 'Sparring' },
        'Prime',
    );
    expect(result.shouldSwap).toBe(false);
});

// ─── Cut-Aware: adjustNutritionForDay ──────────────────────────

console.log('\n── Cut-Aware adjustNutritionForDay ──');

test('Fight week cap (4) → zeroes positive modifiers', () => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ], 4);
    expect(result.carbModifierPct).toBe(0);
    expect(result.calorieModifier).toBe(0);
    expect(result.message).toContain('fight week');
});

test('Intensified cap (8) → halves positive modifiers', () => {
    const resultWithCap = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ], 8);
    const resultWithout = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ]);
    expect(resultWithCap.carbModifierPct).toBeLessThan(resultWithout.carbModifierPct);
    expect(resultWithCap.message).toContain('active cut');
});

test('No cap → full sparring boosts preserved', () => {
    const result = adjustNutritionForDay(baseTargets, [
        { activity_type: 'sparring', expected_intensity: 8, estimated_duration_min: 90 },
    ]);
    expect(result.carbModifierPct).toBeGreaterThanOrEqual(15);
});

// ─── Cut-Aware: detectOvertrainingRisk ─────────────────────────

console.log('\n── Cut-Aware detectOvertrainingRisk ──');

test('Active cut + ACWR 1.35 → danger (normally caution)', () => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.35, 4.0, true);
    expect(warnings.some(w => w.severity === 'danger')).toBeTruthy();
    expect(warnings.some(w => w.title.includes('Weight Cut'))).toBeTruthy();
});

test('No cut + ACWR 1.35 → caution only', () => {
    const warnings = detectOvertrainingRisk([
        { activity_type: 'sc', expected_intensity: 6, estimated_duration_min: 60, date: '2026-01-05' },
    ], 1.35, 4.0, false);
    expect(warnings.some(w => w.severity === 'danger')).toBeFalsy();
    expect(warnings.some(w => w.severity === 'caution')).toBeTruthy();
});


test('High monotony week -> monotony warning', () => {
    const activities = Array.from({ length: 7 }, (_, i) => ({
        activity_type: 'sc' as const,
        expected_intensity: 6,
        estimated_duration_min: 90,
        date: `2026-01-0${i + 1}`,
    }));
    const warnings = detectOvertrainingRisk(activities, 1.0, 4.0, false, {
        fitnessLevel: 'intermediate',
        phase: 'off-season',
    });
    expect(warnings.some(w => w.title.includes('Monotony'))).toBeTruthy();
});

test('High strain week -> strain warning', () => {
    const activities = Array.from({ length: 7 }, (_, i) => ({
        activity_type: 'sparring' as const,
        expected_intensity: 8,
        estimated_duration_min: 150,
        date: `2026-01-0${i + 1}`,
    }));
    const warnings = detectOvertrainingRisk(activities, 1.0, 4.0, false, {
        fitnessLevel: 'advanced',
        phase: 'fight-camp',
    });
    expect(warnings.some(w => w.title.includes('Strain'))).toBeTruthy();
});

test('Back-loaded week -> rolling fatigue warning', () => {
    const loads = [20, 20, 20, 20, 120, 120, 120];
    const activities = loads.map((dur, i) => ({
        activity_type: 'sc' as const,
        expected_intensity: 6,
        estimated_duration_min: dur,
        date: `2026-01-0${i + 1}`,
    }));
    const warnings = detectOvertrainingRisk(activities, 1.0, 4.0, false, {
        fitnessLevel: 'intermediate',
        phase: 'off-season',
    });
    expect(warnings.some(w => w.title.includes('Rolling Fatigue'))).toBeTruthy();
});

test('Active cut + load 4500 → weekly load warning', () => {
    const activities = Array.from({ length: 6 }, (_, i) => ({
        activity_type: 'sc' as const,
        expected_intensity: 6,
        estimated_duration_min: 125, // 6*125 = 750 per session, 6*750 = 4500
        date: '2026-01-0' + (i + 1),
    }));
    const warnings = detectOvertrainingRisk(activities, 1.0, 4.0, true);
    expect(warnings.some(w => w.title.includes('Load'))).toBeTruthy();
});

// ─── Cut-Aware: generateWeekPlan ───────────────────────────────

console.log('\n── Cut-Aware generateWeekPlan ──');

test('TrainingIntensityCap 4 → SC intensity capped at 4', () => {
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
        activeCutPlan: { weigh_in_date: '2026-01-12' } as any,
    });
    const scSessions = plan.filter(a => a.activity_type === 'sc');
    for (const sc of scSessions) {
        expect(sc.expected_intensity).toBeLessThan(5);
    }
});

// ─── Results ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
if (failed > 0) process.exit(1);




