/**
 * Standalone test script for lib/engine/calculateCamp.ts
 *
 * Run with:  npx tsx lib/engine/calculateCamp.test.ts
 */

import {
    generateCampPlan,
    determineCampPhase,
    getCampTrainingModifiers,
    getCampWeekProfile,
    toCampEnginePhase,
} from './calculateCamp';
import type { CampPlanInput, CampConfig } from './types';

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

function makePlanInput(overrides: Partial<CampPlanInput> = {}): CampPlanInput {
    return {
        fightDate: '2026-06-13',      // ~12 weeks from camp start
        campStartDate: '2026-03-21',
        fitnessLevel: 'intermediate',
        hasConcurrentCut: false,
        userId: 'u1',
        ...overrides,
    };
}

// ─── generateCampPlan ─────────────────────────────────────────

console.log('\n── generateCampPlan ──');

// Test 1: Basic structure
(() => {
    const camp = generateCampPlan(makePlanInput());
    assert('Has valid id', camp.id.length > 0);
    assert('fightDate preserved', camp.fightDate === '2026-06-13');
    assert('campStartDate preserved', camp.campStartDate === '2026-03-21');
    assert('totalWeeks ≥ 4', camp.totalWeeks >= 4);
    assert('Status is active', camp.status === 'active');
})();

// Test 2: Phase dates are ordered correctly
(() => {
    const camp = generateCampPlan(makePlanInput());
    assert('Base starts on camp start', camp.basePhaseDates.start === camp.campStartDate);
    assert('Build starts after base ends', camp.buildPhaseDates.start > camp.basePhaseDates.end);
    assert('Peak starts after build ends', camp.peakPhaseDates.start > camp.buildPhaseDates.end);
    assert('Taper starts after peak ends', camp.taperPhaseDates.start > camp.peakPhaseDates.end);
    assert('Taper ends before or on fight date', camp.taperPhaseDates.end <= camp.fightDate);
})();

// Test 3: Base phase is roughly 40% of camp
(() => {
    const camp = generateCampPlan(makePlanInput());
    const totalDays = Math.round(
        (new Date(camp.fightDate).getTime() - new Date(camp.campStartDate).getTime()) / (1000 * 3600 * 24)
    );
    const baseDays = Math.round(
        (new Date(camp.basePhaseDates.end).getTime() - new Date(camp.basePhaseDates.start).getTime()) / (1000 * 3600 * 24)
    ) + 1;
    const baseRatio = baseDays / totalDays;
    assert('Base phase ≈ 40% of camp (±10%)', baseRatio >= 0.30 && baseRatio <= 0.50);
})();

// Test 4: 8-week camp (shorter)
(() => {
    const camp = generateCampPlan(makePlanInput({
        campStartDate: '2026-04-18',
        fightDate: '2026-06-13',
    }));
    assert('8-week camp has ≥ 4 weeks', camp.totalWeeks >= 4);
    assert('Build still starts after base', camp.buildPhaseDates.start > camp.basePhaseDates.end);
})();

// Test 5: hasConcurrentCut preserved
(() => {
    const camp = generateCampPlan(makePlanInput({ hasConcurrentCut: true }));
    assert('hasConcurrentCut preserved', camp.hasConcurrentCut === true);
})();

// ─── determineCampPhase ───────────────────────────────────────

console.log('\n── determineCampPhase ──');

const STANDARD_CAMP = generateCampPlan(makePlanInput());

// Test 6: First day of camp → base
(() => {
    const phase = determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.campStartDate);
    assert('First day → base phase', phase === 'base');
})();

// Test 7: Last day of camp → taper
(() => {
    const phase = determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.taperPhaseDates.end);
    assert('Last day → taper phase', phase === 'taper');
})();

// Test 8: Middle of build phase
(() => {
    const buildStart = STANDARD_CAMP.buildPhaseDates.start;
    const buildEnd = STANDARD_CAMP.buildPhaseDates.end;
    // Pick a date in the middle of build
    const buildMidDays = Math.floor(
        (new Date(buildEnd).getTime() - new Date(buildStart).getTime()) / (1000 * 3600 * 24 * 2)
    );
    const mid = new Date(buildStart + 'T00:00:00');
    mid.setDate(mid.getDate() + buildMidDays);
    const midStr = mid.toISOString().split('T')[0];
    const phase = determineCampPhase(STANDARD_CAMP, midStr);
    assert('Mid-build date → build phase', phase === 'build');
})();

// Test 9: Date before camp → null
(() => {
    const phase = determineCampPhase(STANDARD_CAMP, '2026-01-01');
    assert('Before camp → null', phase === null);
})();

// Test 10: Date after fight → null
(() => {
    const phase = determineCampPhase(STANDARD_CAMP, '2026-12-31');
    assert('After fight → null', phase === null);
})();

// ─── getCampTrainingModifiers ─────────────────────────────────

console.log('\n── getCampTrainingModifiers ──');

// Test 11: Volume decreases from build to taper
(() => {
    const build = getCampTrainingModifiers('build', 'intermediate', false);
    const taper = getCampTrainingModifiers('taper', 'intermediate', false);
    assert('Taper volume < build volume', taper.volumeMultiplier < build.volumeMultiplier);
})();

// Test 12: Peak intensity is highest
(() => {
    const base = getCampTrainingModifiers('base', 'advanced', false);
    const peak = getCampTrainingModifiers('peak', 'advanced', false);
    const taper = getCampTrainingModifiers('taper', 'advanced', false);
    assert('Peak intensity cap ≥ base', peak.intensityCap >= base.intensityCap);
    assert('Taper intensity cap < peak', taper.intensityCap < peak.intensityCap);
})();

// Test 13: Concurrent cut reduces S&C and conditioning sessions
(() => {
    const noCut = getCampTrainingModifiers('build', 'advanced', false);
    const withCut = getCampTrainingModifiers('build', 'advanced', true);
    assert('Cut reduces SC sessions', withCut.scSessionsPerWeek <= noCut.scSessionsPerWeek);
    assert('Cut reduces conditioning sessions', withCut.conditioningSessionsPerWeek <= noCut.conditioningSessionsPerWeek);
})();

// Test 14: Peak sparring exceeds base sparring
(() => {
    const base = getCampTrainingModifiers('base', 'elite', false);
    const peak = getCampTrainingModifiers('peak', 'elite', false);
    assert('Peak has more sparring days than base', peak.sparringDaysPerWeek > base.sparringDaysPerWeek);
})();

// Test 15: Elite gets more sessions than beginner
(() => {
    const beg = getCampTrainingModifiers('build', 'beginner', false);
    const eli = getCampTrainingModifiers('build', 'elite', false);
    assert('Elite runs more than beginner', eli.roadWorkSessionsPerWeek >= beg.roadWorkSessionsPerWeek);
})();

// ─── getCampWeekProfile ───────────────────────────────────────

console.log('\n── getCampWeekProfile ──');

// Test 16: Week 1 profile is base
(() => {
    const profile = getCampWeekProfile(STANDARD_CAMP, STANDARD_CAMP.campStartDate, 'intermediate');
    assert('Week 1 profile not null', profile !== null);
    if (profile) {
        assert('Week 1 campPhase = base', profile.campPhase === 'base');
        assert('Week 1 number = 1', profile.weekNumber === 1);
        assert('Week 1 has valid roadWorkFocus', profile.roadWorkFocus === 'long_slow_distance');
        assert('Week 1 has valid conditioningFocus', typeof profile.conditioningFocus === 'string');
        assert('Week 1 has valid scFocus', typeof profile.scFocus === 'string');
    }
})();

// Test 17: Week outside camp → null
(() => {
    const profile = getCampWeekProfile(STANDARD_CAMP, '2026-01-01', 'advanced');
    assert('Before camp → null profile', profile === null);
})();

// ─── toCampEnginePhase ────────────────────────────────────────

console.log('\n── toCampEnginePhase ──');

// Test 18: All camp phases map to correct engine phases
(() => {
    assert('base → camp-base', toCampEnginePhase('base') === 'camp-base');
    assert('build → camp-build', toCampEnginePhase('build') === 'camp-build');
    assert('peak → camp-peak', toCampEnginePhase('peak') === 'camp-peak');
    assert('taper → camp-taper', toCampEnginePhase('taper') === 'camp-taper');
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
