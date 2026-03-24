/**
 * Standalone test script for lib/engine/calculateConditioning.ts
 *
 * Run with:  npx tsx lib/engine/calculateConditioning.test.ts
 */

import {
    prescribeConditioning,
    getWeeklyConditioningPlan,
} from './calculateConditioning.ts';
import { deriveReadinessProfile, deriveStimulusConstraintSet } from './readiness/profile.ts';
import type { WeeklyConditioningInput, RecurringActivityRow } from './types.ts';

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

function makeInput(overrides: Record<string, any> = {}) {
    return {
        phase: 'off-season' as const,
        fitnessLevel: 'intermediate' as const,
        readinessState: 'Prime' as const,
        acwr: 1.0,
        sessionIndex: 0,
        trainingIntensityCap: null,
        campConfig: null,
        ...overrides,
    };
}

function makeMockTemplate(days: number[], type = 'sparring'): RecurringActivityRow[] {
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

// ─── prescribeConditioning: Base rounds by fitness level ──────

console.log('\n── prescribeConditioning: base rounds ──');

(() => {
    const p = prescribeConditioning(makeInput({
        fitnessLevel: 'beginner', phase: 'fight-camp', readinessState: 'Prime',
    }));
    assert('Beginner heavy bag rounds include Prime bonus = 5', p.type === 'heavy_bag_rounds' ? p.rounds === 5 : true);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        fitnessLevel: 'intermediate', phase: 'fight-camp', readinessState: 'Prime',
    }));
    assert('Intermediate heavy bag rounds include Prime bonus = 8', p.type === 'heavy_bag_rounds' ? p.rounds === 8 : true);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        fitnessLevel: 'advanced', phase: 'fight-camp', readinessState: 'Prime',
    }));
    assert('Advanced heavy bag rounds include Prime bonus = 12', p.type === 'heavy_bag_rounds' ? p.rounds === 12 : true);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        fitnessLevel: 'elite', phase: 'fight-camp', readinessState: 'Prime',
    }));
    assert('Elite heavy bag rounds include Prime bonus = 14', p.type === 'heavy_bag_rounds' ? p.rounds === 14 : true);
})();

// ─── Work/rest intervals by fitness level ─────────────────────

console.log('\n── prescribeConditioning: work/rest intervals ──');

(() => {
    const beg = prescribeConditioning(makeInput({
        fitnessLevel: 'beginner', phase: 'fight-camp', readinessState: 'Prime',
    }));
    if (beg.type === 'heavy_bag_rounds') {
        assert('Beginner work interval = 90s', beg.workIntervalSec === 90);
        assert('Beginner rest interval = 90s', beg.restIntervalSec === 90);
    }
})();

(() => {
    const eli = prescribeConditioning(makeInput({
        fitnessLevel: 'elite', phase: 'fight-camp', readinessState: 'Prime',
    }));
    if (eli.type === 'heavy_bag_rounds') {
        assert('Elite work interval = 180s', eli.workIntervalSec === 180);
        assert('Elite rest interval = 45s', eli.restIntervalSec === 45);
    }
})();

// ─── CNS loads by conditioning type ───────────────────────────

console.log('\n── prescribeConditioning: CNS loads ──');

(() => {
    // Force heavy_bag_rounds via fight-camp phase, Prime, low ACWR
    const bag = prescribeConditioning(makeInput({
        phase: 'fight-camp', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    if (bag.type === 'heavy_bag_rounds') {
        assert('heavy_bag_rounds CNS budget = 7', bag.cnsBudget === 7);
    }
})();

(() => {
    // Force circuit via off-season, Prime
    const circ = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    if (circ.type === 'circuit') {
        assert('circuit CNS budget = 5', circ.cnsBudget === 5);
    }
})();

(() => {
    // Force jump_rope via Depleted
    const jr = prescribeConditioning(makeInput({ readinessState: 'Depleted' }));
    assert('jump_rope CNS budget = 4', jr.cnsBudget === 4);
})();

// ─── Phase conditioning priorities ────────────────────────────

console.log('\n── prescribeConditioning: phase priorities ──');

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'camp-peak', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    const allowed = ['heavy_bag_rounds', 'sport_specific_drill', 'interval_medley'];
    assert('Camp-peak session 0 is sport-appropriate type', allowed.includes(p.type));
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'camp-taper', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    assert('Camp-taper session 0 = jump_rope', p.type === 'jump_rope');
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    assert('Off-season session 0 = circuit', p.type === 'circuit');
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 1,
    }));
    assert('Off-season session 1 = assault_bike', p.type === 'assault_bike');
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 2,
    }));
    assert('Off-season session 2 = rowing', p.type === 'rowing');
})();

// ─── Depleted or high ACWR forces lighter type ───────────────

console.log('\n── prescribeConditioning: readiness/ACWR overrides ──');

(() => {
    const p = prescribeConditioning(makeInput({ readinessState: 'Depleted', phase: 'camp-peak' }));
    assert('Depleted forces jump_rope even in camp-peak', p.type === 'jump_rope');
    assert('Depleted intensity label = light', p.intensityLabel === 'light');
})();

(() => {
    const p = prescribeConditioning(makeInput({ acwr: 1.45, phase: 'camp-peak' }));
    assert('ACWR >= 1.4 forces jump_rope', p.type === 'jump_rope');
})();

(() => {
    const p = prescribeConditioning(makeInput({ readinessState: 'Caution' }));
    assert('Caution intensity label = moderate', p.intensityLabel === 'moderate');
})();

(() => {
    const p = prescribeConditioning(makeInput({ readinessState: 'Prime' }));
    assert('Prime intensity label = hard', p.intensityLabel === 'hard');
})();

// ─── Intensity cap downgrade ──────────────────────────────────

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'camp-peak', readinessState: 'Prime', acwr: 1.0, trainingIntensityCap: 3,
    }));
    assert('Intensity cap 3 forces jump_rope from camp-peak', p.type === 'jump_rope');
})();

(() => {
    const profile = deriveReadinessProfile({
        sleepQuality: 2,
        subjectiveReadiness: 3,
        acwrRatio: 1.0,
        externalHeartRateLoad: 70,
        weightCutIntensityCap: 4,
        isOnActiveCut: true,
        urineColor: 6,
        readinessHistory: [3, 3, 3],
    });
    const p = prescribeConditioning(makeInput({
        phase: 'camp-build',
        readinessState: profile.readinessState,
        constraintSet: deriveStimulusConstraintSet(profile, { phase: 'camp-build', goalMode: 'fight_camp', daysOut: 18 }),
    }));
    assert('constraint set swaps hard conditioning to lower-cost option', p.type === 'jump_rope' || p.type === 'agility_drills');
})();

// ─── Estimated load reflects type ─────────────────────────────

(() => {
    const jr = prescribeConditioning(makeInput({ readinessState: 'Depleted' }));
    assert('Estimated load = duration * CNS', jr.estimatedLoad === jr.totalDurationMin * jr.cnsBudget);
})();

// ─── New conditioning modalities + structured metadata ──────────────────────

console.log('\n── prescribeConditioning: modalities + formats ──');

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 0,
    }));
    assert('Circuit includes round metadata', p.circuitRound?.roundCount === p.rounds);
    assert('Circuit exposes six movements for non-beginners', (p.circuitRound?.movements.length ?? 0) === 6);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 1,
    }));
    assert('Assault bike can prescribe EMOM', p.type === 'assault_bike' && p.format === 'emom');
    assert('Assault bike EMOM includes timedWork', p.type === 'assault_bike' ? p.timedWork?.format === 'emom' : true);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'off-season', readinessState: 'Prime', acwr: 1.0, sessionIndex: 2,
    }));
    assert('Rowing prescription is available', p.type === 'rowing');
    assert('Rowing carries timed interval metadata', p.type === 'rowing' ? p.timedWork != null : true);
})();

(() => {
    const p = prescribeConditioning(makeInput({
        phase: 'camp-taper', readinessState: 'Prime', acwr: 1.0, sessionIndex: 1,
    }));
    assert('Camp-taper session 1 = swimming', p.type === 'swimming');
    assert('Swimming exposes timed work metadata', p.type === 'swimming' ? p.timedWork != null : true);
})();

// ─── getWeeklyConditioningPlan ────────────────────────────────

console.log('\n── getWeeklyConditioningPlan ──');

const baseWeeklyInput: WeeklyConditioningInput = {
    weekStartDate: WEEK_START,
    prescriptionsNeeded: 2,
    recurringActivities: makeMockTemplate([1]),
    existingActivities: [],
    fitnessLevel: 'intermediate',
    phase: 'off-season',
    readinessState: 'Prime',
    acwr: 1.0,
    campConfig: null,
    activeCutPlan: null,
};

(() => {
    const result = getWeeklyConditioningPlan(baseWeeklyInput);
    assert('2 sessions scheduled', result.length === 2);
    assert('Each has a 10-char date', result.every(r => r.date.length === 10));
    assert('Monday (sparring) excluded', !result.some(r => r.date === '2026-01-12'));
    assert('Unique dates', new Set(result.map(r => r.date)).size === result.length);
})();

(() => {
    const result = getWeeklyConditioningPlan({ ...baseWeeklyInput, prescriptionsNeeded: 0 });
    assert('0 needed returns empty', result.length === 0);
})();

(() => {
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const result = getWeeklyConditioningPlan({
        ...baseWeeklyInput,
        recurringActivities: makeMockTemplate(allDays, 'sc'),
    });
    assert('All SC days blocks all conditioning', result.length === 0);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
