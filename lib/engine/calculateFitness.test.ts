/**
 * Standalone test script for lib/engine/calculateFitness.ts
 *
 * Run with:  npx tsx lib/engine/calculateFitness.test.ts
 */

import {
    assessFitnessFromQuestionnaire,
    deriveFitnessFromHistory,
    getFitnessModifiers,
} from './calculateFitness';
import type { FitnessAssessmentInput, TrainingSessionRow, WeeklyTargetsRow } from './types';

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

function makeInput(overrides: Partial<FitnessAssessmentInput> = {}): FitnessAssessmentInput {
    return {
        trainingYears: 1,
        weeklySessionCount: 3,
        maxPushUpsIn2Min: 30,
        mile5RunTimeSeconds: 750, // 12:30 — moderate
        sportExperienceYears: 1,
        hasSignificantInjuries: false,
        trainingBackground: 'recreational',
        ...overrides,
    };
}

function makeSession(overrides: Partial<TrainingSessionRow> = {}): TrainingSessionRow {
    return {
        id: Math.random().toString(),
        user_id: 'u1',
        date: '2026-01-01',
        duration_minutes: 60,
        intensity_srpe: 6,
        total_load: 360,
        ...overrides,
    };
}

const mockTargets: WeeklyTargetsRow = {
    id: 'wt1', user_id: 'u1',
    sc_sessions: 2, running_sessions: 1, road_work_sessions: 2,
    boxing_sessions: 3, conditioning_sessions: 1, recovery_sessions: 1,
    total_weekly_load_cap: 8000,
};

// ─── assessFitnessFromQuestionnaire ────────────────────────────

console.log('\n── assessFitnessFromQuestionnaire ──');

// Test 1: Complete beginner
(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 0.2,
        weeklySessionCount: 1,
        maxPushUpsIn2Min: 10,
        mile5RunTimeSeconds: 1200, // 20 min — very slow
        sportExperienceYears: 0,
        trainingBackground: 'none',
    }));
    assert('Complete beginner → beginner', result.level === 'beginner');
    assert('Composite score < 30', result.compositeScore < 30);
    assert('Returns 4 + categories', result.categories.length >= 4);
    assert('Volume multiplier ≤ 0.80', result.volumeMultiplier <= 0.80);
    assert('Recovery days ≥ 3', result.recommendedRecoveryDaysPerWeek >= 3);
})();

// Test 2: Intermediate profile
(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 2,
        weeklySessionCount: 4,
        maxPushUpsIn2Min: 40,
        mile5RunTimeSeconds: 690, // ~11:30
        sportExperienceYears: 2,
        trainingBackground: 'recreational',
    }));
    assert('Intermediate profile → at least intermediate', result.compositeScore >= 25);
    assert('Level is intermediate or higher', result.level === 'intermediate' || result.level === 'advanced');
})();

// Test 3: Advanced athlete
(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 5,
        weeklySessionCount: 6,
        maxPushUpsIn2Min: 65,
        mile5RunTimeSeconds: 570, // ~9:30
        sportExperienceYears: 4,
        trainingBackground: 'competitive',
    }));
    assert('Advanced athlete → composite ≥ 60', result.compositeScore >= 60);
    assert('Level is advanced or elite', result.level === 'advanced' || result.level === 'elite');
})();

// Test 4: Elite profile
(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 10,
        weeklySessionCount: 10,
        maxPushUpsIn2Min: 85,
        mile5RunTimeSeconds: 450, // 7:30
        sportExperienceYears: 8,
        trainingBackground: 'professional',
    }));
    assert('Elite athlete → composite ≥ 75', result.compositeScore >= 75);
    assert('Elite level', result.level === 'elite');
    assert('Volume multiplier ≥ 1.20', result.volumeMultiplier >= 1.20);
})();

// Test 5: Injury penalty reduces score
(() => {
    const without = assessFitnessFromQuestionnaire(makeInput({ hasSignificantInjuries: false }));
    const with_ = assessFitnessFromQuestionnaire(makeInput({ hasSignificantInjuries: true }));
    assert('Injury reduces composite score', with_.compositeScore <= without.compositeScore);
})();

// Test 6: Confidence levels
(() => {
    const highConf = assessFitnessFromQuestionnaire(makeInput({ mile5RunTimeSeconds: 600 }));
    const lowConf = assessFitnessFromQuestionnaire(makeInput({ mile5RunTimeSeconds: null, maxPushUpsIn2Min: 0 }));
    assert('With run time → high confidence', highConf.confidence === 'high');
    assert('Without run time, no push-ups → low confidence', lowConf.confidence === 'low');
})();

// Test 7: Summary string is meaningful
(() => {
    const result = assessFitnessFromQuestionnaire(makeInput());
    assert('Summary mentions level', result.summary.toLowerCase().includes(result.level));
    assert('Summary is non-empty', result.summary.length > 20);
})();

// ─── deriveFitnessFromHistory ──────────────────────────────────

console.log('\n── deriveFitnessFromHistory ──');

function makeWeeks(
    startDate: string,
    numWeeks: number,
    sessionsPerWeek: number,
    intensity = 7,
): TrainingSessionRow[] {
    const sessions: TrainingSessionRow[] = [];
    const base = new Date(startDate);
    for (let w = 0; w < numWeeks; w++) {
        for (let d = 0; d < sessionsPerWeek; d++) {
            const date = new Date(base);
            date.setDate(base.getDate() + w * 7 + d);
            sessions.push(makeSession({
                date: date.toISOString().split('T')[0],
                intensity_srpe: intensity,
                total_load: 60 * intensity,
            }));
        }
    }
    return sessions;
}

// Test 8: Not enough history → keep current
(() => {
    const result = deriveFitnessFromHistory(
        makeWeeks('2026-01-01', 1, 4), // only 1 week
        mockTargets,
        'intermediate',
    );
    assert('1 week history → keep intermediate', result === 'intermediate');
})();

// Test 9: High compliance + progression → upgrade
(() => {
    // 8 weeks of 9 sessions/week (target is 10) with increasing load
    const sessions: TrainingSessionRow[] = [];
    const base = new Date('2026-01-01');
    for (let w = 0; w < 8; w++) {
        for (let d = 0; d < 9; d++) {
            const date = new Date(base);
            date.setDate(base.getDate() + w * 7 + d);
            sessions.push(makeSession({
                date: date.toISOString().split('T')[0],
                intensity_srpe: 7,
                total_load: (w + 1) * 400 + d * 50, // increasing load
            }));
        }
    }
    const result = deriveFitnessFromHistory(sessions, { ...mockTargets, sc_sessions: 2, boxing_sessions: 3, running_sessions: 1, road_work_sessions: 1, conditioning_sessions: 1, recovery_sessions: 1 }, 'intermediate');
    // 9 sessions / 8 total targets per week = 112.5% compliance — should upgrade
    assert('High compliance + progression → upgrade or stay', result === 'advanced' || result === 'intermediate');
})();

// Test 10: Low compliance → downgrade (one step at a time)
(() => {
    // 8 sessions total across 8 weeks (1 per week) vs. 9/week target → 11% compliance
    const sessions: TrainingSessionRow[] = Array.from({ length: 8 }, (_, w) => {
        const d = new Date('2026-01-05');
        d.setDate(d.getDate() + w * 7);
        return makeSession({ date: d.toISOString().split('T')[0], intensity_srpe: 3, total_load: 180 });
    });
    const result = deriveFitnessFromHistory(sessions, mockTargets, 'advanced');
    // deriveFitnessFromHistory steps one level at a time: advanced → intermediate
    assert('Low compliance → downgrade to intermediate', result === 'intermediate');
})();

// Test 11: Elite already, high compliance → stays elite
(() => {
    const sessions = makeWeeks('2026-01-01', 8, 10, 8);
    const result = deriveFitnessFromHistory(sessions, { ...mockTargets, sc_sessions: 3, boxing_sessions: 4, road_work_sessions: 2, running_sessions: 1, conditioning_sessions: 2, recovery_sessions: 1 }, 'elite');
    assert('Elite at max level → stays elite', result === 'elite');
})();

// ─── getFitnessModifiers ───────────────────────────────────────

console.log('\n── getFitnessModifiers ──');

// Test 12: Each level returns distinct modifiers
(() => {
    const beg = getFitnessModifiers('beginner', 'off-season');
    const int = getFitnessModifiers('intermediate', 'off-season');
    const adv = getFitnessModifiers('advanced', 'off-season');
    const eli = getFitnessModifiers('elite', 'off-season');
    assert('Elite volume > advanced volume', eli.volumeMultiplier > adv.volumeMultiplier);
    assert('Advanced volume > intermediate volume', adv.volumeMultiplier > int.volumeMultiplier);
    assert('Intermediate volume > beginner volume', int.volumeMultiplier > beg.volumeMultiplier);
    assert('Beginner intensity cap ≤ 7', beg.intensityCap <= 7);
    assert('Elite intensity cap = 10', eli.intensityCap === 10);
})();

// Test 13: Taper phase reduces volume multiplier
(() => {
    const base = getFitnessModifiers('advanced', 'fight-camp');
    const taper = getFitnessModifiers('advanced', 'camp-taper');
    assert('Taper reduces volume vs fight-camp', taper.volumeMultiplier < base.volumeMultiplier);
    assert('Taper caps intensity to 7', taper.intensityCap <= 7);
})();

// Test 14: Off-season adds recovery days
(() => {
    const offSeason = getFitnessModifiers('advanced', 'off-season');
    const camp = getFitnessModifiers('advanced', 'camp-build');
    assert('Off-season recovery frequency ≥ camp', offSeason.recoveryDayFrequency >= camp.recoveryDayFrequency);
})();

// Test 15: Camp-build increases volume
(() => {
    const offSeason = getFitnessModifiers('intermediate', 'off-season');
    const campBuild = getFitnessModifiers('intermediate', 'camp-build');
    assert('Camp-build has higher volume than off-season', campBuild.volumeMultiplier > offSeason.volumeMultiplier);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
