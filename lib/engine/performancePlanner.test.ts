import {
    assessPerformanceRisk,
    getGoalBasedFocusRotation,
    resolveTrainingBlockContext,
} from './performancePlanner';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
    if (condition) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        console.error(`  ✗ FAIL: ${label}`);
    }
}

console.log('\n── performancePlanner ──');

(() => {
    const result = assessPerformanceRisk({
        readinessState: 'Prime',
        acwr: 1.0,
    });
    assert('Green window returns full performance state', result.level === 'green' && result.intensityCap === 9);
})();

(() => {
    const result = assessPerformanceRisk({
        readinessState: 'Depleted',
        acwr: 1.52,
        trainingIntensityCap: 4,
    });
    assert('Cut + depleted + high ACWR produces red risk', result.level === 'red');
    assert('Red risk bans high impact', result.allowHighImpact === false);
})();

(() => {
    const block = resolveTrainingBlockContext({
        performanceGoalType: 'conditioning',
        campPhase: 'peak',
    });
    assert('Peak camp resolves realize phase', block.phase === 'realize');
    assert('Peak camp keeps sport-specific bias', block.focusBias === 'sport_specific');
})();

(() => {
    const rotation = getGoalBasedFocusRotation({
        performanceGoalType: 'strength',
        scDayCount: 4,
    });
    assert('Strength rotation includes lower day', rotation.includes('lower'));
    assert('Strength rotation includes upper push day', rotation.includes('upper_push'));
})();

(() => {
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
    assert('Pivot rotation ends with recovery', rotation[rotation.length - 1] === 'recovery');
})();

console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
process.exit(failed > 0 ? 1 : 0);
