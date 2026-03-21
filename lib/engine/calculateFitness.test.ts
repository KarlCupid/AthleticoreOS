/**
 * Standalone test script for lib/engine/calculateFitness.ts
 *
 * Run with:  npx tsx lib/engine/calculateFitness.test.ts
 */

import {
    assessFitnessFromQuestionnaire,
    deriveFitnessFromHistory,
    getFitnessModifiers,
} from './calculateFitness.ts';
import type { FitnessAssessmentInput, TrainingSessionRow, WeeklyTargetsRow } from './types.ts';

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

function makeInput(overrides: Partial<FitnessAssessmentInput> = {}): FitnessAssessmentInput {
    return {
        trainingYears: 1,
        weeklySessionCount: 3,
        maxPushUpsIn2Min: 30,
        mile5RunTimeSeconds: 750,
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

// ─── assessFitnessFromQuestionnaire: score thresholds ─────────

console.log('\n── assessFitnessFromQuestionnaire: thresholds ──');

(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 0.2,
        weeklySessionCount: 1,
        maxPushUpsIn2Min: 10,
        mile5RunTimeSeconds: 1200,
        sportExperienceYears: 0,
        trainingBackground: 'none',
    }));
    assert('Complete beginner -> beginner level', result.level === 'beginner');
    assert('Beginner composite < 25', result.compositeScore < 25);
})();

(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 2,
        weeklySessionCount: 4,
        maxPushUpsIn2Min: 40,
        mile5RunTimeSeconds: 690,
        sportExperienceYears: 2,
        trainingBackground: 'recreational',
    }));
    assert('Intermediate profile -> score >= 25', result.compositeScore >= 25);
    assert('Intermediate profile -> level intermediate or advanced',
        result.level === 'intermediate' || result.level === 'advanced');
})();

(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 5,
        weeklySessionCount: 6,
        maxPushUpsIn2Min: 65,
        mile5RunTimeSeconds: 570,
        sportExperienceYears: 4,
        trainingBackground: 'competitive',
    }));
    assert('Advanced athlete -> score >= 50', result.compositeScore >= 50);
    assert('Advanced athlete -> level advanced or elite',
        result.level === 'advanced' || result.level === 'elite');
})();

(() => {
    const result = assessFitnessFromQuestionnaire(makeInput({
        trainingYears: 10,
        weeklySessionCount: 10,
        maxPushUpsIn2Min: 85,
        mile5RunTimeSeconds: 450,
        sportExperienceYears: 8,
        trainingBackground: 'professional',
    }));
    assert('Elite athlete -> score >= 75', result.compositeScore >= 75);
    assert('Elite level', result.level === 'elite');
})();

// ─── Injury penalty ───────────────────────────────────────────

(() => {
    const without = assessFitnessFromQuestionnaire(makeInput({ hasSignificantInjuries: false }));
    const with_ = assessFitnessFromQuestionnaire(makeInput({ hasSignificantInjuries: true }));
    assert('Injury reduces composite by 10', with_.compositeScore === without.compositeScore - 10);
})();

// ─── Confidence levels ────────────────────────────────────────

(() => {
    const high = assessFitnessFromQuestionnaire(makeInput({ mile5RunTimeSeconds: 600 }));
    assert('With run time -> high confidence', high.confidence === 'high');
})();

(() => {
    const medium = assessFitnessFromQuestionnaire(makeInput({ mile5RunTimeSeconds: null, maxPushUpsIn2Min: 30 }));
    assert('No run time + push-ups -> medium confidence', medium.confidence === 'medium');
})();

(() => {
    const low = assessFitnessFromQuestionnaire(makeInput({ mile5RunTimeSeconds: null, maxPushUpsIn2Min: 0 }));
    assert('No run time + no push-ups -> low confidence', low.confidence === 'low');
})();

// ─── getFitnessModifiers: volume/intensity/recovery by level ──

console.log('\n── getFitnessModifiers ──');

(() => {
    const beg = getFitnessModifiers('beginner', 'off-season');
    assert('Beginner volume ~0.65 (base 0.70 minus off-season -0.05)', Math.abs(beg.volumeMultiplier - 0.65) < 0.001);
    assert('Beginner intensityCap = 7', beg.intensityCap === 7);
    assert('Beginner recovery freq = 4', beg.recoveryDayFrequency === 4);
})();

(() => {
    const int = getFitnessModifiers('intermediate', 'off-season');
    assert('Intermediate volume = 0.85', int.volumeMultiplier === 0.85);
    assert('Intermediate intensityCap = 8', int.intensityCap === 8);
})();

(() => {
    const adv = getFitnessModifiers('advanced', 'off-season');
    assert('Advanced volume = 1.05', adv.volumeMultiplier === 1.05);
    assert('Advanced intensityCap = 9', adv.intensityCap === 9);
})();

(() => {
    const eli = getFitnessModifiers('elite', 'off-season');
    assert('Elite volume = 1.25', eli.volumeMultiplier === 1.25);
    assert('Elite intensityCap = 10', eli.intensityCap === 10);
})();

// ─── Phase modifiers ──────────────────────────────────────────

(() => {
    const taper = getFitnessModifiers('advanced', 'camp-taper');
    const base = getFitnessModifiers('advanced', 'camp-build');
    assert('Taper volume < camp-build volume', taper.volumeMultiplier < base.volumeMultiplier);
    assert('Taper intensity cap <= 7', taper.intensityCap <= 7);
})();

(() => {
    const offSeason = getFitnessModifiers('advanced', 'off-season');
    const campBuild = getFitnessModifiers('advanced', 'camp-build');
    assert('Camp-build volume > off-season volume', campBuild.volumeMultiplier > offSeason.volumeMultiplier);
})();

(() => {
    const offSeason = getFitnessModifiers('intermediate', 'off-season');
    assert('Off-season adds recovery days', offSeason.recoveryDayFrequency >= 3);
})();

// ─── deriveFitnessFromHistory ─────────────────────────────────

console.log('\n── deriveFitnessFromHistory ──');

function makeWeeks(startDate: string, numWeeks: number, sessionsPerWeek: number, intensity = 7): TrainingSessionRow[] {
    const sessions: TrainingSessionRow[] = [];
    const base = new Date(startDate);
    for (let w = 0; w < numWeeks; w++) {
        for (let d = 0; d < sessionsPerWeek; d++) {
            const date = new Date(base);
            date.setDate(base.getDate() + w * 7 + d);
            sessions.push(makeSession({
                date: date.toISOString().split('T')[0],
                intensity_srpe: intensity,
                total_load: (w + 1) * 100 + d * 50,
            }));
        }
    }
    return sessions;
}

(() => {
    const result = deriveFitnessFromHistory(
        makeWeeks('2026-01-01', 1, 4),
        mockTargets,
        'intermediate',
    );
    assert('1 week history -> keep current', result === 'intermediate');
})();

(() => {
    const result = deriveFitnessFromHistory([], mockTargets, 'advanced');
    assert('Empty history -> keep current', result === 'advanced');
})();

(() => {
    // Low compliance (1 session/week vs 10 target) -> downgrade
    const sessions = Array.from({ length: 8 }, (_, w) => {
        const d = new Date('2026-01-05');
        d.setDate(d.getDate() + w * 7);
        return makeSession({ date: d.toISOString().split('T')[0], intensity_srpe: 3, total_load: 180 });
    });
    const result = deriveFitnessFromHistory(sessions, mockTargets, 'advanced');
    assert('Low compliance -> downgrade to intermediate', result === 'intermediate');
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
