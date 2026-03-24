/**
 * Standalone test script for lib/engine/calculateMission.ts
 *
 * Run with:  npx tsx lib/engine/calculateMission.test.ts
 */

import { buildDailyMission } from './calculateMission.ts';
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

function makeAcwr(overrides: Record<string, any> = {}) {
    return {
        ratio: 1.05,
        acute: 900,
        chronic: 750,
        status: 'safe',
        message: 'Load is in range.',
        daysOfData: 28,
        thresholds: {
            caution: 1.3,
            redline: 1.5,
            confidence: 'high',
            personalizationFactors: [],
        },
        loadMetrics: {
            acuteLoad: 900,
            chronicLoad: 750,
            acuteToChronicRatio: 1.05,
            strain: 0,
            monotony: 0,
        },
        ...overrides,
    };
}

function makeInput(overrides: Record<string, any> = {}) {
    const readinessProfile = deriveReadinessProfile({
        sleepQuality: 4,
        subjectiveReadiness: 4,
        confidenceLevel: 4,
        stressLevel: 2,
        sorenessLevel: 2,
        acwrRatio: 1.05,
        readinessHistory: [4, 4, 4],
    });
    const constraintSet = deriveStimulusConstraintSet(readinessProfile, {
        phase: 'fight-camp',
        goalMode: 'fight_camp',
        daysOut: 30,
    });
    return {
        date: '2026-03-10',
        macrocycleContext: {
            date: '2026-03-10',
            phase: 'fight-camp',
            goalMode: 'fight_camp',
            performanceGoalType: 'fight_camp',
            performanceObjective: {
                goalType: 'fight_camp',
                primaryOutcome: 'Arrive sharp',
            },
            buildGoal: null,
            camp: null,
            campPhase: 'peak',
            weightCutState: 'inactive',
            weighInTiming: null,
            daysOut: 30,
            isDeloadWeek: false,
            isTravelWindow: false,
            isOnActiveCut: false,
            currentWeightLbs: 174,
            targetWeightLbs: 170,
            remainingWeightLbs: 4,
            weightTrend: null,
        },
        readinessState: 'Prime',
        readinessProfile,
        constraintSet,
        acwr: makeAcwr(),
        nutritionTargets: {
            tdee: 2600,
            adjustedCalories: 2200,
            protein: 180,
            carbs: 200,
            fat: 70,
            proteinModifier: 1,
            phaseMultiplier: 0,
            weightCorrectionDeficit: 0,
            message: 'Base targets active.',
            source: 'base',
            fuelState: 'strength_power',
            prioritySession: 'heavy_sc',
            deficitClass: 'steady_maintain',
            recoveryNutritionFocus: 'none',
            sessionDemandScore: 5,
            hydrationBoostOz: 16,
            hydrationPlan: {
                dailyTargetOz: 120,
                sodiumTargetMg: null,
                emphasis: 'performance',
                notes: [],
            },
            sessionFuelingPlan: {
                priority: 'heavy_sc',
                priorityLabel: 'Heavy S&C',
                sessionLabel: 'Strength session',
                preSession: { label: 'Before training', timing: '60-90 min', carbsG: 45, proteinG: 25, notes: [] },
                intraSession: { fluidsOz: 20, electrolytesMg: 600, carbsG: 10, notes: [] },
                betweenSessions: null,
                postSession: { label: 'After training', timing: 'Within 60 min', carbsG: 40, proteinG: 35, notes: [] },
                hydrationNotes: [],
                coachingNotes: [],
            },
            reasonLines: ['Base targets active.'],
            energyAvailability: 35,
            fuelingFloorTriggered: false,
            deficitBankDelta: 0,
            safetyWarning: 'none',
            traceLines: ['Base targets active.'],
        },
        hydration: {
            dailyWaterOz: 120,
            waterLoadOz: null,
            shedCapPercent: 2,
            shedCapLbs: 3,
            message: 'Hydration normal.',
        },
        scheduledActivities: [
            {
                date: '2026-03-10',
                activity_type: 'sc',
                estimated_duration_min: 60,
                expected_intensity: 7,
                status: 'planned',
            },
        ],
        cutProtocol: null,
        workoutPrescription: null,
        weeklyPlanEntry: null,
        medStatus: null,
        riskScore: 8,
        riskDrivers: [],
        ...overrides,
    } as any;
}

// ─── Session role inference ───────────────────────────────────

console.log('\n── Session role inference ──');

(() => {
    // intensityCap <= 4 + active cut -> cut_protect
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            isOnActiveCut: true,
        },
        cutProtocol: {
            cut_phase: 'fight_week_cut',
            training_intensity_cap: 4,
            sodium_target_mg: 500,
            water_target_oz: 96,
        },
    }));
    assert('intensityCap<=4 + cut -> cut_protect', mission.trainingDirective.sessionRole === 'cut_protect');
})();

(() => {
    // intensityCap <= 4 + no cut -> recover
    const mission = buildDailyMission(makeInput({
        cutProtocol: {
            cut_phase: 'baseline',
            training_intensity_cap: 3,
        },
    }));
    assert('intensityCap<=4 + no cut -> recover', mission.trainingDirective.sessionRole === 'recover');
})();

(() => {
    // campPhase = taper -> taper_sharpen
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'taper',
        },
    }));
    assert('campPhase=taper -> taper_sharpen', mission.trainingDirective.sessionRole === 'taper_sharpen');
})();

(() => {
    // hasSparring -> spar_support
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
        scheduledActivities: [
            { date: '2026-03-10', activity_type: 'sparring', estimated_duration_min: 60, expected_intensity: 8, status: 'planned' },
        ],
    }));
    assert('hasSparring -> spar_support', mission.trainingDirective.sessionRole === 'spar_support');
})();

(() => {
    // boxing practice alone should not force spar_support
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
        scheduledActivities: [
            { date: '2026-03-10', activity_type: 'boxing_practice', estimated_duration_min: 60, expected_intensity: 6, status: 'planned' },
        ],
        weeklyPlanEntry: {
            session_type: 'sc',
            focus: 'sport_specific',
        },
    }));
    assert('boxing_practice alone does not trigger spar_support', mission.trainingDirective.sessionRole === 'develop');
})();

(() => {
    // default with no special conditions -> develop
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
    }));
    assert('Default -> develop', mission.trainingDirective.sessionRole === 'develop');
})();

(() => {
    // Soft intervention should cap output without auto-converting the day into recover
    const mission = buildDailyMission(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
        weeklyPlanEntry: {
            session_type: 'sc',
            focus: 'lower',
            target_intensity: 7,
            estimated_duration_min: 60,
        },
        riskScore: 58,
    }));
    assert('Soft intervention keeps planned role instead of auto-recover', mission.trainingDirective.sessionRole === 'develop');
    assert('Soft intervention still caps intensity', (mission.trainingDirective.intensityCap ?? 10) <= 4);
})();

// ─── Risk state scoring ──────────────────────────────────────

console.log('\n── Risk state scoring ──');

(() => {
    // Low risk: Prime, safe ACWR, no cut
    const mission = buildDailyMission(makeInput());
    assert('Low risk -> level=low', mission.riskState.level === 'low');
    assert('Low risk -> label includes good window', mission.riskState.label.toLowerCase().includes('good window'));
})();

(() => {
    // Moderate risk: Caution readiness adds +10
    const mission = buildDailyMission(makeInput({
        readinessState: 'Caution',
        riskScore: 25,
    }));
    assert('Caution readiness -> score >= 35', mission.riskState.score >= 35);
    assert('Moderate risk level', mission.riskState.level === 'moderate');
})();

(() => {
    // High risk: Depleted + caution ACWR (20 base + 10 caution + 20 Depleted = 50; use 26 to reach 56 → 'high')
    const mission = buildDailyMission(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'caution', ratio: 1.35 }),
        riskScore: 26,
    }));
    assert('Depleted + caution ACWR -> score >= 55', mission.riskState.score >= 55);
    assert('High risk level', mission.riskState.level === 'high' || mission.riskState.level === 'critical');
})();

(() => {
    // Critical risk: Depleted + redline ACWR + fight week cut
    const mission = buildDailyMission(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'redline', ratio: 1.7 }),
        riskScore: 30,
        cutProtocol: {
            cut_phase: 'fight_week_cut',
            training_intensity_cap: 3,
        },
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            weightCutState: 'driving',
            isOnActiveCut: true,
        },
    }));
    assert('Critical risk -> score >= 75', mission.riskState.score >= 75);
    assert('Critical risk level', mission.riskState.level === 'critical');
})();

// ─── Intervention thresholds ──────────────────────────────────

console.log('\n── Intervention thresholds ──');

(() => {
    // Score >= 75 -> hard intervention, mandatory recovery, cap 2
    const mission = buildDailyMission(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'redline', ratio: 1.9 }),
        riskScore: 50,
        cutProtocol: {
            cut_phase: 'fight_week_cut',
            training_intensity_cap: 3,
        },
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            weightCutState: 'driving',
            isOnActiveCut: true,
        },
        weeklyPlanEntry: {
            session_type: 'sc',
            focus: 'lower',
            target_intensity: 8,
            estimated_duration_min: 60,
        },
        workoutPrescription: {
            focus: 'lower',
            workoutType: 'strength',
            estimatedDurationMin: 60,
            summary: 'Heavy lower',
            exercises: [],
        },
    }));
    assert('Hard intervention state', mission.trainingDirective.interventionState === 'hard');
    assert('Mandatory recovery', mission.trainingDirective.isMandatoryRecovery === true);
    assert('Intensity cap = 2', mission.trainingDirective.intensityCap === 2);
    assert('Forced session role = recover', mission.trainingDirective.sessionRole === 'recover');
    assert('Mandatory recovery rewrites workout type', mission.trainingDirective.workoutType === 'recovery');
    assert('Mandatory recovery clears carried prescription', mission.trainingDirective.prescription == null);
})();

(() => {
    // Score >= 55 but < 75 -> soft intervention, cap 4
    const mission = buildDailyMission(makeInput({
        readinessState: 'Caution',
        acwr: makeAcwr({ status: 'caution', ratio: 1.4 }),
        riskScore: 35,
    }));
    assert('Soft intervention state', mission.trainingDirective.interventionState === 'soft');
    assert('Soft intervention not mandatory recovery', mission.trainingDirective.isMandatoryRecovery === false);
    assert('Soft intervention cap <= 4', (mission.trainingDirective.intensityCap ?? 10) <= 4);
})();

(() => {
    // Score < 55 -> no intervention
    const mission = buildDailyMission(makeInput());
    assert('No intervention for low risk', mission.trainingDirective.interventionState === 'none');
    assert('No mandatory recovery for low risk', mission.trainingDirective.isMandatoryRecovery === false);
})();

// ─── Decision trace ──────────────────────────────────────────

console.log('\n── Decision trace ──');

(() => {
    const mission = buildDailyMission(makeInput({
        acwr: makeAcwr({ status: 'redline', ratio: 1.7 }),
        riskScore: 30,
        readinessState: 'Depleted',
    }));
    const riskTrace = mission.decisionTrace.find(t => t.title === 'Risk control');
    assert('Decision trace includes risk control', riskTrace != null);
    assert('ACWR redline interpretation present', riskTrace?.humanInterpretation?.includes('digging a hole') ?? false);
})();

(() => {
    const mission = buildDailyMission(makeInput({
        cutProtocol: {
            cut_phase: 'fight_week_cut',
            training_intensity_cap: 4,
            sodium_target_mg: 400,
            sodium_instruction: 'Minimal sodium. Water dump starts now.',
        },
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            isOnActiveCut: true,
        },
    }));
    const sodiumTrace = mission.decisionTrace.find(t => t.title === 'Sodium restriction');
    assert('Sodium restriction trace present', sodiumTrace != null);
    assert('Sodium interpretation present', sodiumTrace?.humanInterpretation?.includes('Stay away from salt') ?? false);
})();

// ─── Output structure ─────────────────────────────────────────

console.log('\n── Output structure ──');

(() => {
    const mission = buildDailyMission(makeInput());
    assert('Has headline', typeof mission.headline === 'string' && mission.headline.length > 0);
    assert('Has summary', typeof mission.summary === 'string' && mission.summary.length > 0);
    assert('Has engineVersion', mission.engineVersion === 'daily-engine-v3');
    assert('Has date', mission.date === '2026-03-10');
    assert('Has readinessProfile', mission.readinessProfile != null);
    assert('Has recoveryDirective', mission.recoveryDirective != null);
    assert('Has fuelDirective', mission.fuelDirective != null);
    assert('Has hydrationDirective', mission.hydrationDirective != null);
    assert('Training directive includes constraintSet', mission.trainingDirective.constraintSet != null);
    assert('Fuel directive includes session fueling plan', mission.fuelDirective.sessionFuelingPlan != null);
    assert('Legacy pre-session carbs come from session fueling plan', mission.fuelDirective.preSessionCarbsG === mission.fuelDirective.sessionFuelingPlan?.preSession.carbsG);
})();

// ─── Summary ───────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exit(failed > 0 ? 1 : 0);
