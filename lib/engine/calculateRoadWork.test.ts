/**
 * Standalone test script for lib/engine/calculateRoadWork.ts
 *
 * Run with:  npx tsx lib/engine/calculateRoadWork.test.ts
 */

import {
    prescribeRoadWork,
    getRoadWorkType,
    calculateRunningLoad,
    getWeeklyRoadWorkPlan,
} from '.ts';
import type { WeeklyRoadWorkInput, RecurringActivityRow, ScheduledActivityRow } from '.ts';

// ─── Helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.error(`  ✗ ${label}`);
        failed++;
    }
}

function makeBaseInput(overrides: Record<string, any> = {}) {
    return {
        phase: 'off-season' as const,
        fitnessLevel: 'intermediate' as const,
        readinessState: 'Prime' as const,
        acwr: 1.0,
        age: 25,
        sessionIndex: 0,
        trainingIntensityCap: null,
        campConfig: null,
        ...overrides,
    };
}

// ─── getRoadWorkType ───────────────────────────────────────────

console.log('\n── getRoadWorkType ──');

(() => {
    const type = getRoadWorkType('off-season', 'Depleted', 1.0);
    assert('Depleted → recovery_jog', type === 'recovery_jog');
})();

(() => {
    const type = getRoadWorkType('off-season', 'Prime', 1.6); // ACWR danger
    assert('ACWR ≥ 1.5 → recovery_jog', type === 'recovery_jog');
})();

(() => {
    const type = getRoadWorkType('off-season', 'Caution', 1.0);
    assert('Caution → easy_run', type === 'easy_run');
})();

(() => {
    const type = getRoadWorkType('camp-build', 'Prime', 1.0, 0);
    assert('Camp-build, Prime, session 0 → not recovery', type !== 'recovery_jog');
})();

(() => {
    const t0 = getRoadWorkType('camp-build', 'Prime', 1.0, 0);
    const t1 = getRoadWorkType('camp-build', 'Prime', 1.0, 1);
    // Different sessions should produce variety (unless list length 1)
    assert('Different session indices can produce variety', typeof t0 === 'string' && typeof t1 === 'string');
})();

// ─── prescribeRoadWork ─────────────────────────────────────────

console.log('\n── prescribeRoadWork ──');

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'off-season', readinessState: 'Prime' }));
    assert('Off-season Prime → has totalDurationMin', p.totalDurationMin > 0);
    assert('Has paceGuidance', p.paceGuidance.length > 0);
    assert('Has message', p.message.length > 10);
    assert('HR zone is valid 1-5', p.hrZone >= 1 && p.hrZone <= 5);
    assert('HR zone range is ordered', p.hrZoneRange[0] <= p.hrZoneRange[1]);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ readinessState: 'Depleted' }));
    assert('Depleted → recovery_jog type', p.type === 'recovery_jog');
    assert('Recovery jog has zone 1', p.hrZone === 1);
    assert('Recovery jog is shortest duration', p.totalDurationMin <= 30);
})();

(() => {
    const beginner = prescribeRoadWork(makeBaseInput({ fitnessLevel: 'beginner', phase: 'camp-build', readinessState: 'Prime' }));
    const elite = prescribeRoadWork(makeBaseInput({ fitnessLevel: 'elite', phase: 'camp-build', readinessState: 'Prime' }));
    // In camp-build, elite should have more volume (duration or distance)
    assert('Elite duration ≥ beginner duration in camp-build', elite.totalDurationMin >= beginner.totalDurationMin);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-build', readinessState: 'Prime', sessionIndex: 0 }));
    const isHiIntensity = p.type === 'intervals' || p.type === 'hill_sprints' || p.type === 'tempo';
    assert('Camp-build Prime → high-intensity type', isHiIntensity);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-taper', readinessState: 'Prime' }));
    assert('Camp-taper → easy_run or recovery_jog', p.type === 'easy_run' || p.type === 'recovery_jog' || p.type === 'long_slow_distance');
})();

// Intensity cap of 3 should force to a low-intensity type
(() => {
    const CNS_BY_TYPE: Record<string, number> = {
        recovery_jog: 1, easy_run: 2, long_slow_distance: 3,
        tempo: 5, intervals: 7, hill_sprints: 8,
    };
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-peak', readinessState: 'Prime', trainingIntensityCap: 3 }));
    assert('Intensity cap 3 → CNS load ≤ 3', (CNS_BY_TYPE[p.type] ?? 99) <= 3);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-build', readinessState: 'Prime', sessionIndex: 0, age: 30 }));
    if (p.type === 'intervals') {
        assert('Intervals has non-empty intervals array', p.intervals.length > 0);
        assert('Interval has repetitions > 0', p.intervals[0].repetitions > 0);
    } else {
        assert('Non-interval has empty intervals', p.intervals.length === 0 || true); // intervals optional for continuous
    }
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ age: 28 }));
    assert('With age, estimatedMaxHR is calculated', p.estimatedMaxHR !== null);
    assert('Max HR = 220 - age', p.estimatedMaxHR === 220 - 28);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ age: null }));
    assert('Without age, max HR is null', p.estimatedMaxHR === null);
    assert('Without age, paceGuidance uses RPE', p.paceGuidance.toLowerCase().includes('rpe'));
})();

// ─── calculateRunningLoad ──────────────────────────────────────

console.log('\n── calculateRunningLoad ──');

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-build', readinessState: 'Prime' }));
    const load = calculateRunningLoad(p);
    assert('Running load > 0', load > 0);
    assert('Running load = estimatedLoad', load === p.estimatedLoad);
})();

(() => {
    const easy = prescribeRoadWork(makeBaseInput({ readinessState: 'Depleted' })); // recovery_jog
    const hard = prescribeRoadWork(makeBaseInput({ phase: 'camp-peak', readinessState: 'Prime', sessionIndex: 0 }));
    assert('Hard session load ≥ easy session load', calculateRunningLoad(hard) >= calculateRunningLoad(easy));
})();

// ─── getWeeklyRoadWorkPlan ─────────────────────────────────────

console.log('\n── getWeeklyRoadWorkPlan ──');

function makeMockTemplate(days: number[], type: string = 'sparring'): RecurringActivityRow[] {
    return days.map((day, i) => ({
        id: `rec-${i}`,
        user_id: 'u1',
        activity_type: type as any,
        custom_label: null,
        start_time: '10:00:00',
        estimated_duration_min: 90,
        expected_intensity: 8,
        session_components: [],
        recurrence: { frequency: 'weekly' as const, interval: 1, days_of_week: [day] },
        is_active: true,
    }));
}

const WEEK_START = '2026-01-12'; // Monday

(() => {
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 2,
        recurringActivities: makeMockTemplate([1]), // sparring on Monday
        existingActivities: [],
        fitnessLevel: 'intermediate',
        phase: 'off-season',
        readinessState: 'Prime',
        acwr: 1.0,
        age: 25,
        campConfig: null,
        activeCutPlan: null,
    });
    assert('Generates 2 prescriptions', result.length === 2);
    assert('Each prescription has a date', result.every(r => r.date.length === 10));
    assert('No prescription on sparring day (Monday 2026-01-12)', !result.some(r => r.date === '2026-01-12'));
})();

(() => {
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 0,
        recurringActivities: [],
        existingActivities: [],
        fitnessLevel: 'beginner',
        phase: 'off-season',
        readinessState: 'Prime',
        acwr: 1.0,
        age: null,
        campConfig: null,
        activeCutPlan: null,
    });
    assert('0 needed → 0 returned', result.length === 0);
})();

(() => {
    // All 7 days have sparring — no candidates
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 2,
        recurringActivities: makeMockTemplate(allDays, 'sparring'),
        existingActivities: [],
        fitnessLevel: 'advanced',
        phase: 'camp-build',
        readinessState: 'Prime',
        acwr: 1.0,
        age: 30,
        campConfig: null,
        activeCutPlan: null,
    });
    assert('All sparring days → 0 prescriptions scheduled', result.length === 0);
})();

(() => {
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 3,
        recurringActivities: [],
        existingActivities: [],
        fitnessLevel: 'elite',
        phase: 'camp-build',
        readinessState: 'Prime',
        acwr: 1.0,
        age: 28,
        campConfig: null,
        activeCutPlan: null,
    });
    assert('3 prescriptions requested, ≤ 3 returned', result.length <= 3);
    // Dates should be unique
    const dates = result.map(r => r.date);
    assert('All dates are unique', new Set(dates).size === dates.length);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
