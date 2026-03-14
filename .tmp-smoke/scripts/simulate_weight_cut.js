"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calculateWeightCut_1 = require("../lib/engine/calculateWeightCut");
const calculateNutrition_1 = require("../lib/engine/calculateNutrition");
// ─── Helpers ───────────────────────────────────────────────────
function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
}
function daysBetween(a, b) {
    return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
const profiles = [
    {
        id: 'light-cut-m',
        name: 'Small Cut (Male)',
        sex: 'male',
        startWeight: 175,
        targetWeight: 170,
        heightInches: 70,
        age: 28,
        activityLevel: 'moderate',
        weeks: 4,
        compliance: 0.95
    },
    {
        id: 'mod-cut-f',
        name: 'Moderate Cut (Female)',
        sex: 'female',
        startWeight: 145,
        targetWeight: 135,
        heightInches: 64,
        age: 25,
        activityLevel: 'very_active',
        weeks: 8,
        compliance: 0.9
    },
    {
        id: 'agg-cut-m',
        name: 'Aggressive Cut (Male)',
        sex: 'male',
        startWeight: 205,
        targetWeight: 185,
        heightInches: 72,
        age: 30,
        activityLevel: 'extra_active',
        weeks: 10,
        compliance: 1.0
    },
    {
        id: 'extreme-cut',
        name: 'Dangerous Cut',
        sex: 'male',
        startWeight: 160,
        targetWeight: 140,
        heightInches: 68,
        age: 22,
        activityLevel: 'moderate',
        weeks: 3,
        compliance: 1.0
    },
    {
        id: 'stalled-cut',
        name: 'Weight Stall Scenario',
        sex: 'male',
        startWeight: 185,
        targetWeight: 175,
        heightInches: 71,
        age: 27,
        activityLevel: 'moderate',
        weeks: 8,
        compliance: 0.95,
        stallLikelihood: 0.8
    }
];
async function runSimulation(profile) {
    console.log(`\n🚀 Starting Simulation: ${profile.name} (${profile.id})`);
    const todayStr = new Date().toISOString().split('T')[0];
    const weighInDate = addDays(todayStr, profile.weeks * 7);
    const fightDate = addDays(weighInDate, 1);
    // 1. Generate Plan
    const planInput = {
        startWeight: profile.startWeight,
        targetWeight: profile.targetWeight,
        fightDate,
        weighInDate,
        fightStatus: 'pro',
        biologicalSex: profile.sex,
        sport: 'boxing'
    };
    const planResult = (0, calculateWeightCut_1.generateCutPlan)(planInput);
    if (!planResult.valid) {
        console.error(`❌ Plan Invalid for ${profile.id}:`, planResult.validationErrors);
        return;
    }
    console.log(`✅ Plan Valid. Total Cut: ${planResult.totalCutLbs} lbs (${planResult.totalCutPct.toFixed(1)}%)`);
    if (planResult.extremeCutWarning)
        console.warn(`⚠️ EXTREME CUT DETECTED`);
    // Convert Plan Result to Row format for engine consumption
    const planRow = {
        id: 'sim-plan-id',
        user_id: 'sim-user-id',
        start_weight: profile.startWeight,
        target_weight: profile.targetWeight,
        weight_class_name: 'Sim Class',
        sport: 'boxing',
        fight_date: fightDate,
        weigh_in_date: weighInDate,
        plan_created_date: todayStr,
        fight_status: 'pro',
        max_water_cut_pct: planResult.maxWaterCutPct,
        total_cut_lbs: planResult.totalCutLbs,
        diet_phase_target_lbs: planResult.dietPhaseTargetLbs,
        water_cut_allocation_lbs: planResult.waterCutAllocationLbs,
        chronic_phase_start: planResult.chronicPhaseDates?.start || null,
        chronic_phase_end: planResult.chronicPhaseDates?.end || null,
        intensified_phase_start: planResult.intensifiedPhaseDates.start,
        intensified_phase_end: planResult.intensifiedPhaseDates.end,
        fight_week_start: planResult.fightWeekDates.start,
        weigh_in_day: weighInDate,
        rehydration_start: weighInDate,
        status: 'active',
        completed_at: null,
        safe_weekly_loss_rate: planResult.safeWeeklyLossRateLbs,
        calorie_floor: planResult.calorieFloor,
        baseline_cognitive_score: 100,
        coach_notes: null,
        created_at: todayStr,
        updated_at: todayStr
    };
    // 2. Multi-day loop
    let currentWeight = profile.startWeight;
    const weightHistory = [];
    const dailyLogs = [];
    let consecutiveDepletedDays = 0;
    const totalDays = daysBetween(todayStr, weighInDate) + 2; // Simulation goes until 1 day post fight
    for (let d = 0; d < totalDays; d++) {
        const currentDate = addDays(todayStr, d);
        // Simulate current weight with history
        weightHistory.push({ date: currentDate, weight: Math.round(currentWeight * 10) / 10 });
        const recentHistory = weightHistory.slice(-14);
        // Calculate base nutrition first (since computeDailyCutProtocol needs it)
        const baseNutrition = (0, calculateNutrition_1.calculateNutritionTargets)({
            weightLbs: currentWeight,
            heightInches: profile.heightInches,
            age: profile.age,
            biologicalSex: profile.sex,
            activityLevel: profile.activityLevel,
            phase: 'fight-camp',
            nutritionGoal: 'cut',
            coachProteinOverride: null,
            coachCarbsOverride: null,
            coachFatOverride: null,
            coachCaloriesOverride: null,
            weightCorrectionDeficit: 0
        });
        // Determine weekly velocity (simplified for sim)
        const weeklyVelocity = weightHistory.length >= 7
            ? (weightHistory[weightHistory.length - 1].weight - weightHistory[weightHistory.length - 7].weight)
            : -1.0;
        // Simulate Readiness (cycling Prime/Caution, sometimes Depleted)
        const readiness = (d % 7 === 0) ? 'Depleted' : (d % 3 === 0) ? 'Caution' : 'Prime';
        if (readiness === 'Depleted')
            consecutiveDepletedDays++;
        else
            consecutiveDepletedDays = 0;
        // Engine Call: Daily Protocol
        const protocolInput = {
            plan: planRow,
            date: currentDate,
            currentWeight,
            weightHistory: recentHistory,
            baseNutritionTargets: baseNutrition,
            dayActivities: [{ activity_type: 'boxing_practice', expected_intensity: 7, estimated_duration_min: 90 }],
            readinessState: readiness,
            acwr: 1.1,
            biologicalSex: profile.sex,
            cycleDay: profile.sex === 'female' ? (d % 28) + 1 : null,
            weeklyVelocityLbs: weeklyVelocity,
            lastRefeedDate: null,
            lastDietBreakDate: null,
            baselineCognitiveScore: 100,
            latestCognitiveScore: 98,
            urineColor: 2,
            bodyTempF: 98.6,
            consecutiveDepletedDays
        };
        const protocol = (0, calculateWeightCut_1.computeDailyCutProtocol)(protocolInput);
        // Physical Simulation: Update Weight
        const intakeAdjusted = protocol.prescribedCalories * profile.compliance;
        const tdee = baseNutrition.tdee;
        // Calorie physics (3500 cal = 1 lb)
        let dailyChange = (intakeAdjusted - tdee) / 3500;
        // Water cut logic (Fight Week)
        if (protocol.cutPhase === 'fight_week_cut') {
            // Significantly drop weight due to water restriction
            dailyChange -= (planResult.waterCutAllocationLbs / 3);
        }
        else if (protocol.cutPhase === 'weigh_in') {
            // Final drop
            dailyChange -= 1.0;
        }
        else if (protocol.cutPhase === 'rehydration') {
            // Regain weight
            dailyChange += (planResult.waterCutAllocationLbs * 0.8 / 2);
        }
        // Stall simulation
        if (profile.stallLikelihood && Math.random() < profile.stallLikelihood && d > 20 && d < 40) {
            dailyChange = 0.05; // Slight gain/plateau
        }
        currentWeight += dailyChange;
        dailyLogs.push({
            day: d,
            date: currentDate,
            weight: currentWeight.toFixed(1),
            phase: protocol.cutPhase,
            intake: protocol.prescribedCalories,
            flags: protocol.safetyFlags.map(f => f.code)
        });
        if (d % 7 === 0 || d === totalDays - 1) {
            console.log(`Day ${d} (${protocol.cutPhase}): ${currentWeight.toFixed(1)} lbs | Calories: ${protocol.prescribedCalories} | Flags: ${protocol.safetyFlags.length}`);
        }
    }
    console.log(`🏁 Simulation Complete for ${profile.id}. Final Weight: ${currentWeight.toFixed(1)} lbs`);
}
async function main() {
    for (const profile of profiles) {
        await runSimulation(profile);
    }
}
main().catch(console.error);
