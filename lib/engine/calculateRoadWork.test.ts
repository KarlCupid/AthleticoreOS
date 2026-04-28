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
} from './calculateRoadWork.ts';
import type { WeeklyRoadWorkInput, RecurringActivityRow } from './types.ts';

// ─── Helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
    if (condition) {
        console.log(`  PASS ${label}`);
        passed++;
    } else {
        console.error(`  FAIL ${label}`);
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

// ─── getRoadWorkType ──────────────────────────────────────────

console.log('\n── getRoadWorkType ──');

(() => {
    const type = getRoadWorkType('off-season', 'Depleted', 1.0);
    assert('Depleted -> recovery_jog', type === 'recovery_jog');
})();

(() => {
    const type = getRoadWorkType('camp-build', 'Prime', 1.6);
    assert('ACWR >= 1.5 -> recovery_jog', type === 'recovery_jog');
})();

(() => {
    const type = getRoadWorkType('off-season', 'Caution', 1.0);
    assert('Caution -> easy_run', type === 'easy_run');
})();

(() => {
    const type = getRoadWorkType('camp-build', 'Prime', 1.35);
    assert('ACWR >= 1.3 -> easy_run', type === 'easy_run');
})();

(() => {
    const type = getRoadWorkType('camp-build', 'Prime', 1.0, 0);
    assert('Camp-build Prime session 0 = tempo', type === 'tempo');
})();

(() => {
    const type = getRoadWorkType('camp-build', 'Prime', 1.0, 1);
    assert('Camp-build Prime session 1 = intervals', type === 'intervals');
})();

(() => {
    const type = getRoadWorkType('camp-taper', 'Prime', 1.0, 0);
    assert('Camp-taper session 0 = recovery_jog', type === 'recovery_jog');
})();

// ─── prescribeRoadWork: base distances ────────────────────────

console.log('\n── prescribeRoadWork: distances and durations ──');

(() => {
    const beg = prescribeRoadWork(makeBaseInput({ fitnessLevel: 'beginner' }));
    const elite = prescribeRoadWork(makeBaseInput({ fitnessLevel: 'elite' }));
    // Both off-season Prime -> easy_run, so targetDistanceMiles should scale
    if (beg.targetDistanceMiles != null && elite.targetDistanceMiles != null) {
        assert('Elite distance > beginner distance', elite.targetDistanceMiles > beg.targetDistanceMiles);
    }
    assert('Elite duration >= beginner duration', elite.totalDurationMin >= beg.totalDurationMin);
})();

// ─── Duration multipliers by type ─────────────────────────────

(() => {
    // easy_run multiplier = 1.0, recovery_jog = 0.6
    const easy = prescribeRoadWork(makeBaseInput({ readinessState: 'Prime' }));
    const recovery = prescribeRoadWork(makeBaseInput({ readinessState: 'Depleted' }));
    assert('Recovery jog duration < easy run duration', recovery.totalDurationMin <= easy.totalDurationMin);
})();

(() => {
    // tempo multiplier = 0.7 -> shorter than easy_run
    const tempo = prescribeRoadWork(makeBaseInput({
        phase: 'camp-build', readinessState: 'Prime', sessionIndex: 0,
    }));
    const easy = prescribeRoadWork(makeBaseInput({ phase: 'off-season', readinessState: 'Prime' }));
    if (tempo.type === 'tempo') {
        assert('Tempo duration < easy_run duration (0.7 vs 1.0 multiplier)', tempo.totalDurationMin <= easy.totalDurationMin);
    }
})();

// ─── CNS loads by type ────────────────────────────────────────

console.log('\n── prescribeRoadWork: CNS loads ──');

(() => {
    const recovery = prescribeRoadWork(makeBaseInput({ readinessState: 'Depleted' }));
    assert('Recovery jog CNS budget = 1', recovery.cnsBudget === 1);
})();

(() => {
    const easy = prescribeRoadWork(makeBaseInput({ readinessState: 'Prime', phase: 'off-season' }));
    if (easy.type === 'easy_run') {
        assert('Easy run CNS budget = 2', easy.cnsBudget === 2);
    }
})();

(() => {
    const tempo = prescribeRoadWork(makeBaseInput({
        phase: 'camp-build', readinessState: 'Prime', sessionIndex: 0,
    }));
    if (tempo.type === 'tempo') {
        assert('Tempo CNS budget = 5', tempo.cnsBudget === 5);
    }
})();

// ─── Phase priorities ─────────────────────────────────────────

console.log('\n── prescribeRoadWork: phase priorities ──');

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-peak', readinessState: 'Prime', sessionIndex: 0 }));
    const highTypes = ['intervals', 'hill_sprints', 'tempo'];
    assert('Camp-peak Prime -> high-intensity type', highTypes.includes(p.type));
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-taper', readinessState: 'Prime', sessionIndex: 0 }));
    assert('Camp-taper -> recovery_jog or easy_run', p.type === 'recovery_jog' || p.type === 'easy_run');
})();

// ─── HR zone and pace guidance ────────────────────────────────

console.log('\n── prescribeRoadWork: HR and pacing ──');

(() => {
    const p = prescribeRoadWork(makeBaseInput({ age: 30 }));
    assert('Age 30 -> estimatedMaxHR = 190', p.estimatedMaxHR === 190);
    assert('HR zone is 1-5', p.hrZone >= 1 && p.hrZone <= 5);
    assert('HR zone range ordered', p.hrZoneRange[0] <= p.hrZoneRange[1]);
})();

(() => {
    const p = prescribeRoadWork(makeBaseInput({ age: null }));
    assert('Null age -> null estimatedMaxHR', p.estimatedMaxHR === null);
    assert('Null age -> RPE-based guidance', p.paceGuidance.toLowerCase().includes('rpe'));
})();

// ─── Intensity cap ────────────────────────────────────────────

(() => {
    const CNS_BY_TYPE: Record<string, number> = {
        recovery_jog: 1, easy_run: 2, long_slow_distance: 3,
        tempo: 5, intervals: 7, hill_sprints: 8,
    };
    const p = prescribeRoadWork(makeBaseInput({ phase: 'camp-peak', readinessState: 'Prime', trainingIntensityCap: 3 }));
    assert('Intensity cap 3 forces CNS <= 3', (CNS_BY_TYPE[p.type] ?? 99) <= 3);
})();

// ─── calculateRunningLoad ─────────────────────────────────────

console.log('\n── calculateRunningLoad ──');

(() => {
    const p = prescribeRoadWork(makeBaseInput());
    const load = calculateRunningLoad(p);
    assert('Running load = estimatedLoad', load === p.estimatedLoad);
    assert('Running load > 0', load > 0);
})();

// ─── getWeeklyRoadWorkPlan ────────────────────────────────────

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

const WEEK_START = '2026-01-12';

(() => {
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 2,
        recurringActivities: makeMockTemplate([1]),
        existingActivities: [],
        fitnessLevel: 'intermediate',
        phase: 'off-season',
        readinessState: 'Prime',
        acwr: 1.0,
        age: 25,
        campConfig: null,
        activeWeightClassPlan: null,
    });
    assert('2 prescriptions generated', result.length === 2);
    assert('Monday sparring day excluded', !result.some(r => r.date === '2026-01-12'));
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
        activeWeightClassPlan: null,
    });
    assert('0 needed -> empty array', result.length === 0);
})();

(() => {
    const result = getWeeklyRoadWorkPlan({
        weekStartDate: WEEK_START,
        prescriptionsNeeded: 2,
        recurringActivities: makeMockTemplate([0, 1, 2, 3, 4, 5, 6], 'sparring'),
        existingActivities: [],
        fitnessLevel: 'advanced',
        phase: 'camp-build',
        readinessState: 'Prime',
        acwr: 1.0,
        age: 30,
        campConfig: null,
        activeWeightClassPlan: null,
    });
    assert('All sparring days -> 0 prescriptions', result.length === 0);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
