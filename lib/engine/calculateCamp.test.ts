/**
 * Standalone test script for lib/engine/calculateCamp.ts
 *
 * Run with: npx tsx lib/engine/calculateCamp.test.ts
 */

import {
    determineCampPhase,
    generateCampPlan,
    getAutoTaperMultiplier,
    getCampSCModifier,
    getCampTrainingModifiers,
    getCampWeekProfile,
    getSparringDayGuidance,
    toCampEnginePhase,
} from './calculateCamp.ts';
import type { CampPlanInput } from './types.ts';

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

const SPARRING_GUIDANCE_LIBRARY = [
    { id: 'mobility-1', name: 'Hip Flow', type: 'mobility', equipment: 'bodyweight', cns_load: 1 },
    { id: 'mobility-2', name: 'T-Spine Reach', type: 'active_recovery', equipment: 'bodyweight', cns_load: 1 },
    { id: 'band-1', name: 'Band Pull Apart', type: 'accessory', equipment: 'band', cns_load: 2 },
    { id: 'band-2', name: 'Banded March', type: 'accessory', equipment: 'band', cns_load: 2 },
] as any[];

console.log('\n-- generateCampPlan --');

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
    assert('Short camp still has >= 4 weeks', camp.totalWeeks >= 4);
    assert('Short camp still has ordered phases', camp.buildPhaseDates.start > camp.basePhaseDates.end);
})();

(() => {
    const camp = generateCampPlan(makePlanInput({ hasConcurrentCut: true }));
    assert('hasConcurrentCut=true preserved', camp.hasConcurrentCut === true);
})();

console.log('\n-- determineCampPhase --');

const STANDARD_CAMP = generateCampPlan(makePlanInput());

(() => {
    assert('First day maps to base', determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.campStartDate) === 'base');
    assert('Last base day maps to base', determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.basePhaseDates.end) === 'base');
    assert('First build day maps to build', determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.buildPhaseDates.start) === 'build');
    assert('First peak day maps to peak', determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.peakPhaseDates.start) === 'peak');
    assert('Last taper day maps to taper', determineCampPhase(STANDARD_CAMP, STANDARD_CAMP.taperPhaseDates.end) === 'taper');
    assert('Before camp returns null', determineCampPhase(STANDARD_CAMP, '2026-01-01') === null);
    assert('After fight returns null', determineCampPhase(STANDARD_CAMP, '2026-12-31') === null);
})();

console.log('\n-- getCampTrainingModifiers --');

(() => {
    const base = getCampTrainingModifiers('base', 'intermediate', false);
    const build = getCampTrainingModifiers('build', 'intermediate', false);
    const peak = getCampTrainingModifiers('peak', 'intermediate', false);
    const taper = getCampTrainingModifiers('taper', 'intermediate', false);

    assert('Base volumeMultiplier = 1.15', base.volumeMultiplier === 1.15);
    assert('Build volumeMultiplier = 1.10', build.volumeMultiplier === 1.10);
    assert('Peak volumeMultiplier = 0.85', peak.volumeMultiplier === 0.85);
    assert('Taper volumeMultiplier = 0.55', taper.volumeMultiplier === 0.55);

    assert('Base intensityCap = 7', base.intensityCap === 7);
    assert('Build intensityCap = 9', build.intensityCap === 9);
    assert('Peak intensityCap = 9', peak.intensityCap === 9);
    assert('Taper intensityCap = 6', taper.intensityCap === 6);

    const peakCut = getCampTrainingModifiers('peak', 'intermediate', true);
    assert('Peak + concurrent cut caps intensity at 7', peakCut.intensityCap === 7);

    assert('Base sparring = 1', base.sparringDaysPerWeek === 1);
    assert('Build sparring = 2', build.sparringDaysPerWeek === 2);
    assert('Peak sparring = 3', peak.sparringDaysPerWeek === 3);
    assert('Taper sparring = 1', taper.sparringDaysPerWeek === 1);

    assert('Base rest = 1', base.mandatoryRestDaysPerWeek === 1);
    assert('Taper rest = 2', taper.mandatoryRestDaysPerWeek === 2);

    const noCut = getCampTrainingModifiers('build', 'advanced', false);
    const withCut = getCampTrainingModifiers('build', 'advanced', true);
    assert('Cut reduces SC sessions', withCut.scSessionsPerWeek <= noCut.scSessionsPerWeek);
    assert('Cut reduces conditioning sessions', withCut.conditioningSessionsPerWeek <= noCut.conditioningSessionsPerWeek);

    const beginner = getCampTrainingModifiers('build', 'beginner', false);
    const elite = getCampTrainingModifiers('build', 'elite', false);
    assert('Elite runs at least as much as beginner', elite.roadWorkSessionsPerWeek >= beginner.roadWorkSessionsPerWeek);
})();

console.log('\n-- getAutoTaperMultiplier --');

(() => {
    assert('0 spar gives 1.0', getAutoTaperMultiplier(0) === 1.0);
    assert('1 spar gives 1.0', getAutoTaperMultiplier(1) === 1.0);
    assert('2 spar gives 0.825', Math.abs(getAutoTaperMultiplier(2) - 0.825) < 0.001);
    assert('3 spar gives 0.65', Math.abs(getAutoTaperMultiplier(3) - 0.65) < 0.001);
    assert('4 spar gives 0.5', getAutoTaperMultiplier(4) === 0.5);
    assert('5 spar stays clamped at 0.5', getAutoTaperMultiplier(5) === 0.5);
    assert('Volume-aware taper uses rounds and intensity', Math.abs(getAutoTaperMultiplier(2, 4, 5) - 0.6) < 0.001);
})();

console.log('\n-- toCampEnginePhase --');

(() => {
    assert('base -> camp-base', toCampEnginePhase('base') === 'camp-base');
    assert('build -> camp-build', toCampEnginePhase('build') === 'camp-build');
    assert('peak -> camp-peak', toCampEnginePhase('peak') === 'camp-peak');
    assert('taper -> camp-taper', toCampEnginePhase('taper') === 'camp-taper');
})();

console.log('\n-- getCampSCModifier --');

(() => {
    const baseMod = getCampSCModifier('base', 1);
    assert('Base + 1 spar allows heavy lifts', baseMod.allowHeavyLifts === true);
    assert('Base + 1 spar recommends full_body', baseMod.recommendedFocus === 'full_body');
    assert('Base + 1 spar sc volume = 1.15', Math.abs(baseMod.scVolumeMultiplier - 1.15) < 0.001);

    const peakMod = getCampSCModifier('peak', 3);
    assert('Peak + 3 spar disallows heavy lifts', peakMod.allowHeavyLifts === false);
    assert('Peak recommends sport_specific', peakMod.recommendedFocus === 'sport_specific');

    const taperMod = getCampSCModifier('taper', 1);
    assert('Taper recommends recovery', taperMod.recommendedFocus === 'recovery');

    const buildHeavySpar = getCampSCModifier('build', 3);
    assert('Build + 3 spar disallows heavy lifts', buildHeavySpar.allowHeavyLifts === false);

    const buildLightSpar = getCampSCModifier('build', 2);
    assert('Build + 2 spar allows heavy lifts', buildLightSpar.allowHeavyLifts === true);

    const volumeAwarePeak = getCampSCModifier('peak', 2, 4, 5);
    assert('Volume-aware peak taper lowers SC volume', Math.abs(volumeAwarePeak.scVolumeMultiplier - 0.51) < 0.001);
})();

console.log('\n-- getSparringDayGuidance --');

(() => {
    const buildGuidance = getSparringDayGuidance('build', SPARRING_GUIDANCE_LIBRARY as any);
    assert('Build guidance includes activation work', buildGuidance.preActivation.length >= 3);
    assert('Build guidance keeps activation-only restriction', buildGuidance.scRestriction === 'activation_only');

    const taperGuidance = getSparringDayGuidance('taper', SPARRING_GUIDANCE_LIBRARY as any);
    assert('Taper guidance trims activation list', taperGuidance.preActivation.length <= 1);
    assert('Taper guidance trims recovery list', taperGuidance.postRecovery.length <= 1);
    assert('Taper guidance message stays minimal', taperGuidance.message.toLowerCase().includes('light mobility only'));
})();

console.log('\n-- getCampWeekProfile --');

(() => {
    const profile = getCampWeekProfile(STANDARD_CAMP, STANDARD_CAMP.campStartDate, 'intermediate');
    assert('Week 1 profile not null', profile !== null);
    if (profile) {
        assert('Week 1 phase = base', profile.campPhase === 'base');
        assert('Week 1 number = 1', profile.weekNumber === 1);
        assert('Week 1 roadWorkFocus = long_slow_distance', profile.roadWorkFocus === 'long_slow_distance');
        assert('Week 1 conditioningFocus = rowing', profile.conditioningFocus === 'rowing');
        assert('Week 1 scFocus = upper_push', profile.scFocus === 'upper_push');
    }

    const outside = getCampWeekProfile(STANDARD_CAMP, '2026-01-01', 'advanced');
    assert('Before camp returns null', outside === null);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
