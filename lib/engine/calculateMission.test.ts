/**
 * Standalone test script for lib/engine/calculateMission.ts
 *
 * Run with:  npx tsx lib/engine/calculateMission.test.ts
 */

import { buildDailyAthleteSummary } from './calculateMission.ts';
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
            weightClassState: 'inactive',
            weighInTiming: null,
            daysOut: 30,
            isDeloadWeek: false,
            isTravelWindow: false,
            hasActiveWeightClassPlan: false,
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
    // intensityCap <= 4 + active body-mass context -> body_mass_protect
    const base = makeInput();
    const mission = buildDailyAthleteSummary(makeInput({
        macrocycleContext: {
            ...base.macrocycleContext,
            hasActiveWeightClassPlan: true,
        },
        constraintSet: {
            ...base.constraintSet,
            hardCaps: {
                ...base.constraintSet.hardCaps,
                intensityCap: 4,
            },
        },
    }));
    assert('intensityCap<=4 + body-mass context -> body_mass_protect', mission.trainingDirective.sessionRole === 'body_mass_protect');
    assert('intensityCap<=4 + body-mass context clamps duration into protect range', (mission.trainingDirective.durationMin ?? 0) >= 20 && (mission.trainingDirective.durationMin ?? 0) <= 30);
})();

(() => {
    // intensityCap <= 4 + no active body-mass context -> recover
    const base = makeInput();
    const mission = buildDailyAthleteSummary(makeInput({
        constraintSet: {
            ...base.constraintSet,
            hardCaps: {
                ...base.constraintSet.hardCaps,
                intensityCap: 3,
            },
        },
    }));
    assert('intensityCap<=4 + no active body-mass context -> recover', mission.trainingDirective.sessionRole === 'recover');
})();

(() => {
    // campPhase = taper -> taper_sharpen
    const mission = buildDailyAthleteSummary(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'taper',
        },
    }));
    assert('campPhase=taper -> taper_sharpen', mission.trainingDirective.sessionRole === 'taper_sharpen');
})();

(() => {
    // hasSparring -> spar_support
    const mission = buildDailyAthleteSummary(makeInput({
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
    const mission = buildDailyAthleteSummary(makeInput({
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
    const mission = buildDailyAthleteSummary(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
    }));
    assert('Default -> develop', mission.trainingDirective.sessionRole === 'develop');
})();

(() => {
    // no plan and no scheduled work -> rest day
    const mission = buildDailyAthleteSummary(makeInput({
        scheduledActivities: [],
        weeklyPlanEntry: null,
        workoutPrescription: null,
    }));
    assert('No planned work -> rest', mission.trainingDirective.sessionRole === 'rest');
    assert('No planned work -> workoutType null', mission.trainingDirective.workoutType === null);
    assert('No planned work -> zero duration', mission.trainingDirective.durationMin === 0);
    assert('No planned work -> no prescription', mission.trainingDirective.prescription == null);
})();

(() => {
    // elevated strain on a true rest day should stay a low displayed session risk
    const mission = buildDailyAthleteSummary(makeInput({
        scheduledActivities: [],
        weeklyPlanEntry: null,
        workoutPrescription: null,
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'redline', ratio: 1.7 }),
        riskScore: 40,
    }));
    assert('Rest day keeps session role = rest under strain', mission.trainingDirective.sessionRole === 'rest');
    assert('Rest day displays low session risk', mission.riskState.level === 'low');
    assert('Rest day retains underlying risk for replay', mission.riskState.underlyingLevel != null);
    assert('Rest day exposes display override flag', mission.riskState.displayOverride === 'rest_day_recovery_window');
    assert('Rest day reason still mentions no training scheduled', mission.trainingDirective.reason.toLowerCase().includes('no training is scheduled today'));
})();

(() => {
    // Soft intervention should cap output without auto-converting the day into recover
    const mission = buildDailyAthleteSummary(makeInput({
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
    assert('Soft intervention still caps intensity', (mission.trainingDirective.intensityCap ?? 10) <= 5);
})();

(() => {
    // Soft intervention on a combat day should downshift into support instead of preserving develop
    const mission = buildDailyAthleteSummary(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            campPhase: 'build',
        },
        scheduledActivities: [
            { date: '2026-03-10', activity_type: 'boxing_practice', estimated_duration_min: 60, expected_intensity: 6, status: 'planned' },
        ],
        weeklyPlanEntry: {
            session_type: 'sc',
            focus: 'lower',
            target_intensity: 7,
            estimated_duration_min: 60,
        },
        riskScore: 58,
    }));
    assert('Soft intervention on combat day routes to spar_support', mission.trainingDirective.sessionRole === 'spar_support');
    assert('Soft intervention on combat day clamps duration', (mission.trainingDirective.durationMin ?? 0) <= 30);
})();

(() => {
    // Fight-camp caution without red flags should cap output without forcing a recovery replacement.
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Caution',
        readinessProfile: {
            ...makeInput().readinessProfile,
            flags: [],
        },
        weeklyPlanEntry: {
            session_type: 'sc',
            focus: 'lower',
            target_intensity: 7,
            estimated_duration_min: 60,
        },
        riskScore: 24,
    }));
    assert('Fight camp low readiness without red flags avoids hard intervention', mission.trainingDirective.interventionState !== 'hard');
    assert('Fight camp low readiness without red flags preserves non-recovery training role', mission.trainingDirective.sessionRole !== 'recover' && mission.trainingDirective.sessionRole !== 'rest');
})();

(() => {
    // Red structural flags should protect the session even when the athlete has planned work.
    const redFlagProfile = deriveReadinessProfile({
        sleepQuality: 4,
        subjectiveReadiness: 3,
        confidenceLevel: 3,
        stressLevel: 2,
        sorenessLevel: 3,
        painLevel: 5,
        acwrRatio: 1.0,
        readinessHistory: [4, 4, 4, 4, 4, 4, 4],
    });
    const constraintSet = deriveStimulusConstraintSet(redFlagProfile, {
        phase: 'fight-camp',
        goalMode: 'fight_camp',
        daysOut: 24,
    });
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: redFlagProfile.readinessState,
        readinessProfile: redFlagProfile,
        constraintSet,
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
    assert('Fight camp red flag caps intensity to protection range', (mission.trainingDirective.intensityCap ?? 10) <= 4);
    assert('Fight camp red flag routes planned work to recovery', mission.trainingDirective.sessionRole === 'recover');
    assert('Fight camp red flag clears unsafe carried prescription', mission.trainingDirective.prescription == null);
})();

// ─── Risk state scoring ──────────────────────────────────────

console.log('\n── Risk state scoring ──');

(() => {
    // Low risk: Prime, safe ACWR, no cut
    const mission = buildDailyAthleteSummary(makeInput());
    assert('Low risk -> level=low', mission.riskState.level === 'low');
    assert('Low risk -> label includes good window', mission.riskState.label.toLowerCase().includes('good window'));
})();

(() => {
    // Moderate risk: Caution readiness adds +10
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Caution',
        riskScore: 25,
    }));
    assert('Caution readiness -> score >= 35', mission.riskState.score >= 35);
    assert('Moderate risk level', mission.riskState.level === 'moderate');
})();

(() => {
    // High risk: Depleted + caution ACWR (20 base + 10 caution + 20 Depleted = 50; use 26 to reach 56 → 'high')
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'caution', ratio: 1.35 }),
        riskScore: 26,
    }));
    assert('Depleted + caution ACWR -> score >= 55', mission.riskState.score >= 55);
    assert('High risk level', mission.riskState.level === 'high' || mission.riskState.level === 'critical');
})();

(() => {
    // Critical risk: Depleted + redline ACWR + active body-mass pressure
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'redline', ratio: 1.7 }),
        riskScore: 30,
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            weightClassState: 'driving',
            hasActiveWeightClassPlan: true,
        },
    }));
    assert('Critical risk -> score >= 75', mission.riskState.score >= 75);
    assert('Critical risk level', mission.riskState.level === 'critical');
})();

// ─── Intervention thresholds ──────────────────────────────────

console.log('\n── Intervention thresholds ──');

(() => {
    // Score >= 75 -> hard intervention, mandatory recovery, cap 3
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Depleted',
        acwr: makeAcwr({ status: 'redline', ratio: 1.9 }),
        riskScore: 50,
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            weightClassState: 'driving',
            hasActiveWeightClassPlan: true,
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
    assert('Intensity cap = 3', mission.trainingDirective.intensityCap === 3);
    assert('Forced session role = recover', mission.trainingDirective.sessionRole === 'recover');
    assert('Mandatory recovery rewrites workout type', mission.trainingDirective.workoutType === 'recovery');
    assert('Mandatory recovery clears carried prescription', mission.trainingDirective.prescription == null);
})();

(() => {
    // Score >= 55 but < 75 -> soft intervention, cap 5
    const mission = buildDailyAthleteSummary(makeInput({
        readinessState: 'Caution',
        acwr: makeAcwr({ status: 'caution', ratio: 1.4 }),
        riskScore: 35,
    }));
    assert('Soft intervention state', mission.trainingDirective.interventionState === 'soft');
    assert('Soft intervention not mandatory recovery', mission.trainingDirective.isMandatoryRecovery === false);
    assert('Soft intervention cap <= 5', (mission.trainingDirective.intensityCap ?? 10) <= 5);
})();

(() => {
    // Score < 55 -> no intervention
    const mission = buildDailyAthleteSummary(makeInput());
    assert('No intervention for low risk', mission.trainingDirective.interventionState === 'none');
    assert('No mandatory recovery for low risk', mission.trainingDirective.isMandatoryRecovery === false);
})();

// ─── Decision trace ──────────────────────────────────────────

console.log('\n── Decision trace ──');

(() => {
    const mission = buildDailyAthleteSummary(makeInput({
        acwr: makeAcwr({ status: 'redline', ratio: 1.7 }),
        riskScore: 30,
        readinessState: 'Depleted',
    }));
    const riskTrace = mission.decisionTrace.find(t => t.title === 'Risk control');
    assert('Decision trace includes risk control', riskTrace != null);
    assert('ACWR redline interpretation present', riskTrace?.humanInterpretation?.includes('above redline') ?? false);
})();

(() => {
    const mission = buildDailyAthleteSummary(makeInput({
        macrocycleContext: {
            ...makeInput().macrocycleContext,
            hasActiveWeightClassPlan: true,
        },
    }));
    const sodiumTrace = mission.decisionTrace.find(t => t.title === 'Sodium restriction');
    assert('Obsolete sodium restriction trace is not generated', sodiumTrace == null);
    assert('Hydration directive sanitizes unsafe copy', !mission.hydrationDirective.message.toLowerCase().includes('water dump'));
})();

// ─── Output structure ─────────────────────────────────────────

console.log('\n── Output structure ──');

(() => {
    const mission = buildDailyAthleteSummary(makeInput());
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
