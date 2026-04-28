/**
 * Standalone test script for lib/engine/performancePlanner.ts
 *
 * Run with:  npx tsx lib/engine/performancePlanner.test.ts
 */

import {
    assessPerformanceRisk,
    getGoalBasedFocusRotation,
    resolveTrainingBlockContext,
} from './performancePlanner.ts';
import { deriveReadinessProfile, deriveStimulusConstraintSet } from './readiness/profile.ts';

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

// ─── assessPerformanceRisk: severity levels ───────────────────

console.log('\n── assessPerformanceRisk: severity levels ──');

(() => {
    // severity 0 -> green
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0 });
    assert('Severity 0 -> green', result.level === 'green');
    assert('Green intensityCap = 9', result.intensityCap === 9);
    assert('Green volumeMultiplier = 1', result.volumeMultiplier === 1);
    assert('Green allows high impact', result.allowHighImpact === true);
})();

(() => {
    // severity 1 -> yellow (deload week)
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0, isDeloadWeek: true });
    assert('Deload week -> yellow', result.level === 'yellow');
    assert('Yellow volumeMultiplier = 0.9', result.volumeMultiplier === 0.9);
})();

(() => {
    // severity 1 -> yellow (Caution readiness)
    const result = assessPerformanceRisk({ readinessState: 'Caution', acwr: 1.0 });
    assert('Caution readiness -> yellow', result.level === 'yellow');
    assert('Yellow reasons mention caution', result.reasons.some(r => r.includes('caution')));
})();

(() => {
    // severity 2 -> orange (Depleted readiness)
    const result = assessPerformanceRisk({ readinessState: 'Depleted', acwr: 1.0 });
    assert('Depleted readiness -> orange', result.level === 'orange');
    assert('Orange disallows high impact', result.allowHighImpact === false);
    assert('Orange volumeMultiplier = 0.82', result.volumeMultiplier === 0.82);
})();

(() => {
    // severity 3 -> red (ACWR >= 1.55)
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.6 });
    assert('ACWR >= 1.55 -> red', result.level === 'red');
    assert('Red volumeMultiplier = 0.65', result.volumeMultiplier === 0.65);
    assert('Red disallows high impact', result.allowHighImpact === false);
})();

// ─── Risk triggers ────────────────────────────────────────────

console.log('\n── assessPerformanceRisk: risk triggers ──');

(() => {
    // ACWR thresholds: 1.28-1.42 -> severity 1, 1.42-1.55 -> severity 2
    const mid = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.35 });
    assert('ACWR 1.35 -> yellow', mid.level === 'yellow');

    const high = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.45 });
    assert('ACWR 1.45 -> orange', high.level === 'orange');
})();

(() => {
    // trainingIntensityCap <= 4 -> severity 3 (red)
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0, trainingIntensityCap: 4 });
    assert('Intensity cap 4 -> red', result.level === 'red');
    assert('Intensity cap 4 -> reason mentions body-mass safety', result.reasons.some(r => r.includes('body-mass safety')));
})();

(() => {
    // trainingIntensityCap 5-6 -> severity 2
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0, trainingIntensityCap: 6 });
    assert('Intensity cap 6 -> orange', result.level === 'orange');
})();

(() => {
    // trainingIntensityCap 7-8 -> severity 1
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0, trainingIntensityCap: 8 });
    assert('Intensity cap 8 -> yellow', result.level === 'yellow');
})();

(() => {
    // Sparring day -> severity 1
    const result = assessPerformanceRisk({ readinessState: 'Prime', acwr: 1.0, isSparringDay: true });
    assert('Sparring day -> yellow', result.level === 'yellow');
    assert('Sparring reason mentions support work', result.reasons.some(r => r.includes('support work')));
})();

(() => {
    const profile = deriveReadinessProfile({
        sleepQuality: 4,
        subjectiveReadiness: 4,
        confidenceLevel: 4,
        acwrRatio: 1.0,
        activationRPE: 7,
        expectedActivationRPE: 4,
        readinessHistory: [4, 4, 4],
    });
    const result = assessPerformanceRisk({
        readinessState: profile.readinessState,
        readinessProfile: profile,
        constraintSet: deriveStimulusConstraintSet(profile, { phase: 'camp-build', goalMode: 'fight_camp', daysOut: 21 }),
        acwr: 1.0,
    });
    assert('constraint-driven day requires substitution', result.requiresSubstitution === true);
    assert('constraint-driven day carries constraint set', result.constraintSet != null);
})();

// ─── getGoalBasedFocusRotation ────────────────────────────────

console.log('\n── getGoalBasedFocusRotation ──');

(() => {
    // Strength 4 days
    const rotation = getGoalBasedFocusRotation({ performanceGoalType: 'strength', scDayCount: 4 });
    assert('Strength 4-day has 4 entries', rotation.length === 4);
    assert('Strength includes lower', rotation.includes('lower'));
    assert('Strength includes upper_push', rotation.includes('upper_push'));
    assert('Strength includes upper_pull', rotation.includes('upper_pull'));
    assert('Strength includes full_body', rotation.includes('full_body'));
})();

(() => {
    // Conditioning 3 days
    const rotation = getGoalBasedFocusRotation({ performanceGoalType: 'conditioning', scDayCount: 3 });
    assert('Conditioning 3-day starts with conditioning', rotation[0] === 'conditioning');
})();

(() => {
    // Boxing skill 5 days
    const rotation = getGoalBasedFocusRotation({ performanceGoalType: 'boxing_skill', scDayCount: 5 });
    assert('Boxing skill 5-day includes conditioning', rotation.includes('conditioning'));
})();

(() => {
    // Deload week -> full_body, recovery, full_body
    const rotation = getGoalBasedFocusRotation({
        performanceGoalType: 'strength', scDayCount: 4, isDeloadWeek: true,
    });
    assert('Deload -> 3 entries', rotation.length === 3);
    assert('Deload starts with full_body', rotation[0] === 'full_body');
    assert('Deload includes recovery', rotation[1] === 'recovery');
    assert('Deload ends with full_body', rotation[2] === 'full_body');
})();

(() => {
    // Pivot block context -> last entry becomes recovery
    const rotation = getGoalBasedFocusRotation({
        performanceGoalType: 'weight_class_prep',
        scDayCount: 4,
        blockContext: {
            weekInBlock: 4,
            phase: 'pivot',
            volumeMultiplier: 0.72,
            intensityOffset: -1,
            focusBias: 'recovery',
            note: 'Pivot week',
        },
    });
    assert('Pivot last entry = recovery', rotation[rotation.length - 1] === 'recovery');
})();

// ─── resolveTrainingBlockContext ──────────────────────────────

console.log('\n── resolveTrainingBlockContext ──');

(() => {
    const block = resolveTrainingBlockContext({ performanceGoalType: 'conditioning', campPhase: 'taper' });
    assert('Taper -> pivot phase', block.phase === 'pivot');
    assert('Taper -> volume 0.72', block.volumeMultiplier === 0.72);
})();

(() => {
    const block = resolveTrainingBlockContext({ performanceGoalType: 'strength', campPhase: 'peak' });
    assert('Peak -> realize phase', block.phase === 'realize');
    assert('Peak -> intensity offset +1', block.intensityOffset === 1);
})();

(() => {
    const block = resolveTrainingBlockContext({ performanceGoalType: 'conditioning', campPhase: 'build' });
    assert('Build -> intensify phase', block.phase === 'intensify');
    assert('Build conditioning -> conditioning bias', block.focusBias === 'conditioning');
})();

(() => {
    const block = resolveTrainingBlockContext({ performanceGoalType: 'strength', campPhase: 'base' });
    assert('Base -> accumulate phase', block.phase === 'accumulate');
    assert('Base -> volume 1.05', block.volumeMultiplier === 1.05);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
