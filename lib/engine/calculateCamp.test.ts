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
    getAutoTaperMultiplier,
    getCampSCModifier,
} from './calculateCamp.ts';
import type { CampPlanInput, CampConfig } from './types.ts';

// ─── Helpers ───────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${label}`);
        failed++;
    }
}

function makePlanInput(overrides: Partial<CampPlanInput> = {}): CampPlanInput {
    return {
        fightDate: '2026-06-13',
        campStartDate: '2026-03-21',
        fitnessLevel: 'intermediate',
        hasConcurrentCut: false,
        userId: 'u1',
        ...overrides,
    };
}

// ─── generateCampPlan ─────────────────────────────────────────

console.log('\n── generateCampPlan ──');

(() => {
    const camp = generateCampPlan(makePlanInput());
    assert('Has valid id', camp.id.length > 0);
    assert('Id contains userId', camp.id.includes('u1'));
    assert('Id contains fightDate', camp.id.includes('2026-06-13'));
    assert('fightDate preserved', camp.fightDate === '2026-06-13');
    assert('campStartDate preserved', camp.campStartDate === '2026-03-21');
    assert('totalWeeks >= 4', camp.totalWeeks >= 4);
    assert('Status is active', camp.status === 'active');
    assert('hasConcurrentCut preserved as false', camp.hasConcurrentCut === false);
})();

(() => {
    const camp = generateCampPlan(makePlanInput());
    assert('Base starts on camp start', camp.basePhaseDates.start === camp.campStartDate);
    assert('Build starts after base ends', camp.buildPhaseDates.start > camp.basePhaseDates.end);
    assert('Peak starts after build ends', camp.peakPhaseDates.start > camp.buildPhaseDates.end);
    assert('Taper starts after peak ends', camp.taperPhaseDates.start > camp.peakPhaseDates.end);
    assert('Taper ends before or on fight date', camp.taperPhaseDates.end <= camp.fightDate);
})();

(() => {
    const camp = generateCampPlan(makePlanInput({
        campStartDate: '2026-04-18',
        fightDate: '2026-06-13',
    }));
    assert('8-week camp has >= 4 weeks', camp.totalWeeks >= 4);
    assert('Short camp still has ordered phases', camp.buildPhaseDates.start > camp.basePhaseDates.end);
})();

(() => {
    const camp = generateCampPlan(makePlanInput({ hasConcurrentCut: true }));
    assert('hasConcurrentCut=true preserved', camp.hasConcurrentCut === true);
})();

// ─── determineCampPhase ───────────────────────────────────────

console.log('\n── determineCampPhase ──');

const STANDARD_CAMP = generateCampPlan(makePlanInput());

(() => {
    assert('First day → base phase',
        determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.campStartDate) === 'base');

    assert('Last day of base → base',
        determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.basePhaseDates.end) === 'base');

    assert('First day of build → build',
        determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.buildPhaseDates.start) === 'build');

    assert('First day of peak → peak',
        determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.peakPhaseDates.start) === 'peak');

    assert('Last taper day → taper',
        determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.taperPhaseDates.end) === 'taper');

    assert('Before camp → null',
        determineCampPhase(STANDARD_CAMP, '2026-01-01') === null);

    assert('After fight → null',
        determineCampPhase(STANDARD_CAMP, '2026-12-31') === null);
})();

// ─── getCampTrainingModifiers ─────────────────────────────────

console.log('\n── getCampTrainingModifiers ──');

(() => {
    // Volume multipliers
    const base = getCampTrainingModifiers('base', 'intermediate', false);
    assert('Base volumeMultiplier = 1.15', base.volumeMultiplier === 1.15);

    const build = getCampTrainingModifiers('build', 'intermediate', false);
    assert('Build volumeMultiplier = 1.10', build.volumeMultiplier === 1.10);

    const peak = getCampTrainingModifiers('peak', 'intermediate', false);
    assert('Peak volumeMultiplier = 0.85', peak.volumeMultiplier === 0.85);

    const taper = getCampTrainingModifiers('taper', 'intermediate', false);
    assert('Taper volumeMultiplier = 0.55', taper.volumeMultiplier === 0.55);

    // Intensity caps
    assert('Base intensityCap = 7', base.intensityCap === 7);
    assert('Build intensityCap = 9', build.intensityCap === 9);
    assert('Peak intensityCap = 9', peak.intensityCap === 9);
    assert('Taper intensityCap = 6', taper.intensityCap === 6);

    // Sparring days
    assert('Base sparring = 1', base.sparringDaysPerWeek === 1);
    assert('Build sparring = 2', build.sparringDaysPerWeek === 2);
    assert('Peak sparring = 3', peak.sparringDaysPerWeek === 3);
    assert('Taper sparring = 1', taper.sparringDaysPerWeek === 1);

    // Rest days
    assert('Base rest = 1', base.mandatoryRestDaysPerWeek === 1);
    assert('Taper rest = 2', taper.mandatoryRestDaysPerWeek === 2);

    // Concurrent cut reduces SC and conditioning
    const noCut = getCampTrainingModifiers('build', 'advanced', false);
    const withCut = getCampTrainingModifiers('build', 'advanced', true);
    assert('Cut reduces SC sessions', withCut.scSessionsPerWeek <= noCut.scSessionsPerWeek);
    assert('Cut reduces conditioning sessions', withCut.conditioningSessionsPerWeek <= noCut.conditioningSessionsPerWeek);

    // Elite gets more sessions than beginner
    const beg = getCampTrainingModifiers('build', 'beginner', false);
    const eli = getCampTrainingModifiers('build', 'elite', false);
    assert('Elite runs more than beginner', eli.roadWorkSessionsPerWeek >= beg.roadWorkSessionsPerWeek);
})();

// ─── getAutoTaperMultiplier ──────────────────────────────────

console.log('\n── getAutoTaperMultiplier ──');

(() => {
    assert('0 spar → 1.0', getAutoTaperMultiplier(0) === 1.0);
    assert('1 spar → 1.0', getAutoTaperMultiplier(1) === 1.0);

    const twoSpar = getAutoTaperMultiplier(2);
    // 1.0 - (2-1) * 0.175 = 0.825
    assert('2 spar → 0.825', Math.abs(twoSpar - 0.825) < 0.001);

    const threeSpar = getAutoTaperMultiplier(3);
    // 1.0 - (3-1) * 0.175 = 0.65
    assert('3 spar → 0.65', Math.abs(threeSpar - 0.65) < 0.001);

    const fourSpar = getAutoTaperMultiplier(4);
    // max(0.5, 1.0 - 3*0.175) = max(0.5, 0.475) = 0.5
    assert('4 spar → 0.5', fourSpar === 0.5);

    const fiveSpar = getAutoTaperMultiplier(5);
    // max(0.5, 1.0 - 4*0.175) = max(0.5, 0.3) = 0.5
    assert('5 spar → 0.5 (clamped)', fiveSpar === 0.5);
})();

// ─── toCampEnginePhase ────────────────────────────────────────

console.log('\n── toCampEnginePhase ──');

(() => {
    assert('base → camp-base', toCampEnginePhase('base') === 'camp-base');
    assert('build → camp-build', toCampEnginePhase('build') === 'camp-build');
    assert('peak → camp-peak', toCampEnginePhase('peak') === 'camp-peak');
    assert('taper → camp-taper', toCampEnginePhase('taper') === 'camp-taper');
})();

// ─── getCampSCModifier ────────────────────────────────────────

console.log('\n── getCampSCModifier ──');

(() => {
    const baseMod = getCampSCModifier('base', 1);
    assert('Base + 1 spar → allowHeavyLifts true', baseMod.allowHeavyLifts === true);
    assert('Base + 1 spar → recommendedFocus full_body', baseMod.recommendedFocus === 'full_body');
    // scVolumeMultiplier = 1.15 * 1.0 = 1.15
    assert('Base + 1 spar → scVolumeMultiplier = 1.15',
        Math.abs(baseMod.scVolumeMultiplier - 1.15) < 0.001);

    const peakMod = getCampSCModifier('peak', 3);
    assert('Peak + 3 spar → allowHeavyLifts false', peakMod.allowHeavyLifts === false);
    assert('Peak → recommendedFocus sport_specific', peakMod.recommendedFocus === 'sport_specific');

    const taperMod = getCampSCModifier('taper', 1);
    assert('Taper → recommendedFocus recovery', taperMod.recommendedFocus === 'recovery');

    // Build + 3 spar → heavy lifts disallowed (sparringDaysThisWeek > 2)
    const buildHeavySpar = getCampSCModifier('build', 3);
    assert('Build + 3 spar → allowHeavyLifts false', buildHeavySpar.allowHeavyLifts === false);

    // Build + 2 spar → heavy lifts allowed
    const buildLightSpar = getCampSCModifier('build', 2);
    assert('Build + 2 spar → allowHeavyLifts true', buildLightSpar.allowHeavyLifts === true);
})();

// ─── getCampWeekProfile ───────────────────────────────────────

console.log('\n── getCampWeekProfile ──');

(() => {
    const profile = getCampWeekProfile(STANDARD_CAMP, STANDARD_CAMP.campStartDate, 'intermediate');
    assert('Week 1 profile not null', profile !== null);
    if (profile) {
        assert('Week 1 campPhase = base', profile.campPhase === 'base');
        assert('Week 1 number = 1', profile.weekNumber === 1);
        assert('Week 1 roadWorkFocus = long_slow_distance', profile.roadWorkFocus === 'long_slow_distance');
        assert('Week 1 conditioningFocus = rowing', profile.conditioningFocus === 'rowing');
        assert('Week 1 scFocus = upper_push', profile.scFocus === 'upper_push');
    }

    const outside = getCampWeekProfile(STANDARD_CAMP, '2026-01-01', 'advanced');
    assert('Before camp → null profile', outside === null);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
