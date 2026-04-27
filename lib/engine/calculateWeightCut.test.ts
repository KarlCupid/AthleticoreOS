/**
 * Standalone test script for lib/engine/calculateWeightCut.ts
 */

import {
  generateCutPlan,
  determineCutPhase,
  getDailyCutIntensityCap,
  computeDailyCutProtocol,
  computeCarbCycle,
  detectStall,
  validateCutSafety,
  computeRehydrationProtocol,
} from './calculateWeightCut.ts';
import type {
  WeightCutPlanRow,
  CutSafetyInput,
  WeightDataPoint,
} from './types.ts';

let passed = 0;
let failed = 0;
const TEST_AS_OF = '2026-01-01';

function assert(label: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function makePlan(overrides: Partial<WeightCutPlanRow> = {}): WeightCutPlanRow {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    start_weight: 180,
    target_weight: 170,
    weight_class_name: 'Lightweight',
    sport: 'mma',
    fight_date: '2026-06-15',
    weigh_in_date: '2026-06-14',
    plan_created_date: '2026-01-01',
    fight_status: 'amateur',
    max_water_cut_pct: 3,
    total_cut_lbs: 10,
    diet_phase_target_lbs: 6,
    water_cut_allocation_lbs: 4,
    chronic_phase_start: '2026-01-01',
    chronic_phase_end: '2026-04-15',
    intensified_phase_start: '2026-04-16',
    intensified_phase_end: '2026-06-06',
    fight_week_start: '2026-06-07',
    weigh_in_day: '2026-06-14',
    rehydration_start: '2026-06-15',
    status: 'active',
    completed_at: null,
    safe_weekly_loss_rate: 2.0,
    calorie_floor: 1500,
    baseline_cognitive_score: null,
    coach_notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    biological_sex: 'male',
    ...overrides,
  } as WeightCutPlanRow;
}

function makeSafetyInput(overrides: Partial<CutSafetyInput> = {}): CutSafetyInput {
  return {
    cutPhase: 'chronic',
    startWeightLbs: 180,
    currentWeightLbs: 176,
    weeklyVelocityLbs: -1.0,
    prescribedCalories: 2000,
    calorieFloor: 1500,
    readinessState: 'Prime',
    consecutiveDepletedDays: 0,
    acwr: 1.0,
    urineColor: null,
    bodyTempF: null,
    baselineCognitiveScore: null,
    latestCognitiveScore: null,
    waterCutAllocationLbs: 4,
    remainingLbsToTarget: 6,
    daysToWeighIn: 30,
    fightStatus: 'amateur',
    ...overrides,
  };
}

console.log('\n-- calculateWeightCut --');

(() => {
  // ── generateCutPlan ──────────────────────────────────────────
  console.log('\n  Section: generateCutPlan — validation');

  // target >= start → error
  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 170,
      targetWeight: 170,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'amateur',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Target == start weight returns valid=false', result.valid === false);
    assert('Error mentions target weight', result.validationErrors.some(e => e.includes('Target weight must be less')));
  }

  // past weigh-in → error
  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 170,
      fightDate: '2024-01-02',
      weighInDate: '2024-01-01',
      fightStatus: 'amateur',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Past weigh-in returns valid=false', result.valid === false);
  }

  // fight < weigh-in → error
  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 170,
      fightDate: '2027-06-13',
      weighInDate: '2027-06-14',
      fightStatus: 'amateur',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Fight before weigh-in returns valid=false', result.valid === false);
  }

  console.log('\n  Section: generateCutPlan — valid plan');

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 170,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'amateur',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Valid cut plan returns valid=true', result.valid === true);
    assert('Total cut lbs is 10', result.totalCutLbs === 10);
    assert('Total cut pct is ~5.6%', result.totalCutPct > 5 && result.totalCutPct < 6);
    assert('Amateur max water cut is 3%', result.maxWaterCutPct === 3);
    assert('Male calorie floor is 1500', result.calorieFloor === 1500);
    assert('Has non-zero intensified phase weeks', result.intensifiedPhaseWeeks > 0);
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 130,
      targetWeight: 125,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'amateur',
      biologicalSex: 'female',
      sport: 'boxing',
      athleteAge: 25,
    });
    assert('Female calorie floor is 1200', result.calorieFloor === 1200);
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 170,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'pro',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Professional max water cut is 5%', result.maxWaterCutPct === 5);
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 160,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'pro',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Extreme cut (>10%) returns a structured cut warning', result.cutWarning != null);
    assert('Extreme cut warning keeps the warning code', result.cutWarning?.code === 'extreme_cut');
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 158,
      fightDate: '2026-01-07',
      weighInDate: '2026-01-06',
      fightStatus: 'pro',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Short-horizon 12%+ cut escalates to medical severity', result.cutWarning?.severity === 'medical');
    assert('Medical cut warning requires acknowledgement', result.cutWarning?.requiresAcknowledgement === true);
  }

  {
    const result = generateCutPlan({
      asOfDate: '2026-03-01',
      startWeight: 180,
      targetWeight: 168,
      fightDate: '2026-05-02',
      weighInDate: '2026-05-01',
      fightStatus: 'amateur',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: 25,
    });
    assert('Cut plan records explicit asOfDate', result.asOfDate === '2026-03-01');
    assert('Cut plan phase starts from asOfDate, not wall clock', result.chronicPhaseDates?.start === '2026-03-01');
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 175,
      targetWeight: 160,
      fightDate: '2026-03-02',
      weighInDate: '2026-03-01',
      fightStatus: 'pro',
      biologicalSex: 'male',
      sport: 'boxing',
      athleteAge: 25,
    });
    assert('7-10% cut uses caution-band warning code', result.cutWarning?.code === 'cut_pct_over_7');
    assert('7-10% warning does not claim it exceeds 10%', result.cutWarning?.message.includes('below the common 10%') === true);
  }

  {
    const result = generateCutPlan({
      asOfDate: TEST_AS_OF,
      startWeight: 180,
      targetWeight: 170,
      fightDate: '2027-06-15',
      weighInDate: '2027-06-14',
      fightStatus: 'pro',
      biologicalSex: 'male',
      sport: 'mma',
      athleteAge: null,
    });
    assert('Unknown age uses teen-conservative water cap', result.maxWaterCutPct === 1.5);
    assert('Unknown age warning is surfaced', result.safetyWarningDetails.some((warning) => warning.code === 'unknown_age_weight_cut'));
  }
})();

(() => {
  // ── determineCutPhase ────────────────────────────────────────
  console.log('\n  Section: determineCutPhase');

  const plan = makePlan();

  assert('Past weigh-in is rehydration', determineCutPhase(plan, '2026-06-15') === 'rehydration');
  assert('Weigh-in day is weigh_in', determineCutPhase(plan, '2026-06-14') === 'weigh_in');
  assert('1 day out is fight_week_cut', determineCutPhase(plan, '2026-06-13') === 'fight_week_cut');
  assert('3 days out is fight_week_cut', determineCutPhase(plan, '2026-06-11') === 'fight_week_cut');
  assert('4 days out is fight_week_load', determineCutPhase(plan, '2026-06-10') === 'fight_week_load');
  assert('7 days out is fight_week_load', determineCutPhase(plan, '2026-06-07') === 'fight_week_load');
  assert('In intensified range is intensified', determineCutPhase(plan, '2026-04-20') === 'intensified');
  assert('Before intensified is chronic', determineCutPhase(plan, '2026-03-01') === 'chronic');
})();

(() => {
  // ── getDailyCutIntensityCap ──────────────────────────────────
  console.log('\n  Section: getDailyCutIntensityCap');

  const plan = makePlan();

  assert('weigh_in cap is 2', getDailyCutIntensityCap(plan, '2026-06-14') === 2);
  assert('fight_week_cut cap is 3', getDailyCutIntensityCap(plan, '2026-06-13') === 3);
  assert('fight_week_load cap is 4', getDailyCutIntensityCap(plan, '2026-06-10') === 4);
  assert('intensified cap is 8', getDailyCutIntensityCap(plan, '2026-04-20') === 8);
  assert('chronic cap is null', getDailyCutIntensityCap(plan, '2026-03-01') === null);
  assert('null plan returns null', getDailyCutIntensityCap(null, '2026-06-14') === null);
})();

(() => {
  console.log('\n  Section: computeDailyCutProtocol safety policy');

  const plan = makePlan();
  const protocol = computeDailyCutProtocol({
    plan,
    date: '2026-06-12',
    currentWeight: 174,
    weightHistory: [
      { date: '2026-06-05', weight: 176 },
      { date: '2026-06-12', weight: 174 },
    ],
    baseNutritionTargets: {
      tdee: 2600,
      adjustedCalories: 2300,
      protein: 180,
      carbs: 240,
      fat: 70,
      proteinModifier: 1,
      phaseMultiplier: -0.1,
      weightCorrectionDeficit: 0,
      message: 'test',
    },
    dayActivities: [],
    readinessState: 'Caution',
    acwr: 1,
    biologicalSex: 'male',
    cycleDay: null,
    weeklyVelocityLbs: -2,
    lastRefeedDate: null,
    lastDietBreakDate: null,
    baselineCognitiveScore: 100,
    latestCognitiveScore: 98,
    urineColor: 3,
    bodyTempF: 98.6,
    consecutiveDepletedDays: 0,
    safetyContext: {
      age: 17,
      sex: 'male',
      weighInTiming: 'next_day',
      competitionPhase: 'fight-camp',
      asOfDate: '2026-06-12',
    },
  });

  assert('Teen fight-week protocol surfaces teen safety flag', protocol.safetyFlags.some((flag) => flag.code === 'TEEN_FIGHT_WEEK_CUT'));
  assert('Teen fight-week protocol avoids hot-bath instruction', !protocol.morningProtocol.toLowerCase().includes('hot bath'));
  assert('Teen fight-week protocol avoids passive sweat instruction', !protocol.eveningProtocol.toLowerCase().includes('passive sweat'));
})();

(() => {
  const protocol = computeDailyCutProtocol({
    plan: makePlan(),
    date: '2026-06-13',
    currentWeight: 170.4,
    weightHistory: [
      { date: '2026-06-06', weight: 172 },
      { date: '2026-06-12', weight: 170.6 },
    ],
    baseNutritionTargets: {
      tdee: 2600,
      adjustedCalories: 2300,
      protein: 180,
      carbs: 240,
      fat: 70,
      proteinModifier: 1,
      phaseMultiplier: -0.1,
      weightCorrectionDeficit: 0,
      message: 'test',
    },
    dayActivities: [],
    readinessState: 'Prime',
    acwr: 1,
    biologicalSex: 'male',
    cycleDay: null,
    weeklyVelocityLbs: -1.4,
    lastRefeedDate: null,
    lastDietBreakDate: null,
    baselineCognitiveScore: 100,
    latestCognitiveScore: 98,
    urineColor: 2,
    bodyTempF: 98.6,
    consecutiveDepletedDays: 0,
    safetyContext: {
      age: 28,
      sex: 'male',
      weighInTiming: 'next_day',
      competitionPhase: 'fight-camp',
      asOfDate: '2026-06-13',
    },
  });

  assert('Target-band fight-week cut raises calories above minimal protocol', protocol.prescribedCalories > 1500);
  assert('Target-band fight-week cut surfaces hold flag', protocol.safetyFlags.some((flag) => flag.code === 'TARGET_REACHED_HOLD'));
  assert('Target-band fight-week cut explains removed final-drop tactics', protocol.interventionReason?.includes('final-drop tactics removed') === true);
  assert('Target-band fight-week cut avoids hot-bath instruction', !protocol.morningProtocol.toLowerCase().includes('hot bath'));
})();

(() => {
  // ── computeCarbCycle ─────────────────────────────────────────
  console.log('\n  Section: computeCarbCycle');

  const base = { baseCalories: 2000, baseProtein: 180, baseCarbs: 200, baseFat: 60 };

  // Non-intensified → passthrough
  {
    const result = computeCarbCycle({ ...base, isTrainingDay: true, hasHighIntensitySession: true, cutPhase: 'chronic' });
    assert('Non-intensified returns moderate cycle with unchanged calories', result.cycleType === 'moderate' && result.adjustedCalories === 2000);
  }

  // Intensified + high intensity → high (1.15x carbs)
  {
    const result = computeCarbCycle({ ...base, isTrainingDay: true, hasHighIntensitySession: true, cutPhase: 'intensified' });
    assert('Intensified + high intensity yields high cycle at 1.15x carbs', result.cycleType === 'high' && result.adjustedCarbs === Math.round(200 * 1.15));
  }

  // Intensified + training day → moderate (1.0x carbs)
  {
    const result = computeCarbCycle({ ...base, isTrainingDay: true, hasHighIntensitySession: false, cutPhase: 'intensified' });
    assert('Intensified + moderate training yields moderate cycle', result.cycleType === 'moderate' && result.adjustedCarbs === 200);
  }

  // Intensified + rest day → low (0.70x carbs, fat bonus)
  {
    const result = computeCarbCycle({ ...base, isTrainingDay: false, hasHighIntensitySession: false, cutPhase: 'intensified' });
    assert('Intensified + rest yields low cycle at 0.70x carbs', result.cycleType === 'low' && result.adjustedCarbs === Math.round(200 * 0.70));
    assert('Low cycle adds fat bonus for satiety', result.adjustedFat > base.baseFat);
  }
})();

(() => {
  // ── detectStall ──────────────────────────────────────────────
  console.log('\n  Section: detectStall');

  // < 7 data points → not stalled
  {
    const result = detectStall({
      weightHistory: [{ date: '2026-03-01', weight: 180 }, { date: '2026-03-02', weight: 180 }],
      daysAtDeficit: 30,
      lastRefeedDate: null,
      lastDietBreakDate: null,
    });
    assert('< 7 data points returns stalled=false', result.stalled === false);
  }

  // Active weight loss → not stalled
  {
    const history: WeightDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      history.push({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, weight: 180 - i * 0.5 });
    }
    const result = detectStall({ weightHistory: history, daysAtDeficit: 20, lastRefeedDate: null, lastDietBreakDate: null });
    assert('Active weight loss returns stalled=false', result.stalled === false);
  }

  // Flat weight + long deficit → diet_break
  {
    const flat: WeightDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      flat.push({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, weight: 175.0 });
    }
    const result = detectStall({ weightHistory: flat, daysAtDeficit: 35, lastRefeedDate: null, lastDietBreakDate: null });
    assert('Stalled + long deficit recommends diet_break with 7-day duration', result.recommendation === 'diet_break' && result.refeedDurationDays === 7);
  }

  // Flat weight + moderate deficit → refeed
  {
    const flat: WeightDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      flat.push({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, weight: 175.0 });
    }
    const result = detectStall({ weightHistory: flat, daysAtDeficit: 20, lastRefeedDate: null, lastDietBreakDate: null });
    assert('Stalled + moderate deficit recommends refeed with 2-day duration', result.recommendation === 'refeed' && result.refeedDurationDays === 2);
  }

  // Stalled but recent refeed → none
  {
    const flat: WeightDataPoint[] = [];
    for (let i = 0; i < 14; i++) {
      flat.push({ date: `2026-03-${String(i + 1).padStart(2, '0')}`, weight: 175.0 });
    }
    const result = detectStall({ weightHistory: flat, daysAtDeficit: 20, lastRefeedDate: '2026-03-12', lastDietBreakDate: null });
    assert('Stalled but recent refeed yields recommendation=none', result.stalled === true && result.recommendation === 'none');
  }
})();

(() => {
  // ── validateCutSafety ────────────────────────────────────────
  console.log('\n  Section: validateCutSafety');

  // RAPID_LOSS: weeklyVelocity < -(startWeight * 0.015) = -2.7 for 180 lbs
  {
    const flags = validateCutSafety(makeSafetyInput({ cutPhase: 'chronic', weeklyVelocityLbs: -3.0 }));
    assert('Rapid loss triggers RAPID_LOSS danger flag', flags.some(f => f.code === 'RAPID_LOSS' && f.severity === 'danger'));
  }

  // EXCEEDED_10PCT
  {
    const flags = validateCutSafety(makeSafetyInput({ currentWeightLbs: 160 }));
    assert('11% cut triggers EXCEEDED_10PCT danger flag', flags.some(f => f.code === 'EXCEEDED_10PCT' && f.severity === 'danger'));
  }

  // BELOW_CALORIE_FLOOR (diet phase only)
  {
    const flags = validateCutSafety(makeSafetyInput({ cutPhase: 'intensified', prescribedCalories: 1200 }));
    assert('Below calorie floor triggers BELOW_CALORIE_FLOOR', flags.some(f => f.code === 'BELOW_CALORIE_FLOOR'));
  }
  {
    const flags = validateCutSafety(makeSafetyInput({ cutPhase: 'fight_week_cut', prescribedCalories: 400 }));
    assert('Fight week below floor does NOT trigger BELOW_CALORIE_FLOOR', !flags.some(f => f.code === 'BELOW_CALORIE_FLOOR'));
  }

  // DEPLETED_SUSTAINED: 3 days → warning, 5 days → danger
  {
    const flags3 = validateCutSafety(makeSafetyInput({ consecutiveDepletedDays: 3 }));
    const flags5 = validateCutSafety(makeSafetyInput({ consecutiveDepletedDays: 5 }));
    assert('3 depleted days → warning', flags3.some(f => f.code === 'DEPLETED_SUSTAINED' && f.severity === 'warning'));
    assert('5 depleted days → danger', flags5.some(f => f.code === 'DEPLETED_SUSTAINED' && f.severity === 'danger'));
  }

  // ACWR codes during cut
  {
    const flagsR = validateCutSafety(makeSafetyInput({ cutPhase: 'intensified', acwr: 1.5 }));
    const flagsC = validateCutSafety(makeSafetyInput({ cutPhase: 'intensified', acwr: 1.3 }));
    assert('ACWR > 1.4 during cut triggers ACWR_REDLINE_DURING_CUT', flagsR.some(f => f.code === 'ACWR_REDLINE_DURING_CUT'));
    assert('ACWR 1.2-1.4 during cut triggers ACWR_CAUTION_DURING_CUT', flagsC.some(f => f.code === 'ACWR_CAUTION_DURING_CUT'));
  }

  // Dehydration codes (fight week)
  {
    const flagsS = validateCutSafety(makeSafetyInput({ cutPhase: 'fight_week_cut', urineColor: 7 }));
    const flagsM = validateCutSafety(makeSafetyInput({ cutPhase: 'fight_week_load', urineColor: 4 }));
    assert('Urine >= 6 triggers SEVERE_DEHYDRATION', flagsS.some(f => f.code === 'SEVERE_DEHYDRATION'));
    assert('Urine >= 4 triggers MODERATE_DEHYDRATION', flagsM.some(f => f.code === 'MODERATE_DEHYDRATION'));
  }

  // Cognitive decline (fight week)
  {
    const flagsSev = validateCutSafety(makeSafetyInput({ cutPhase: 'weigh_in', baselineCognitiveScore: 200, latestCognitiveScore: 280 }));
    const flagsMod = validateCutSafety(makeSafetyInput({ cutPhase: 'fight_week_cut', baselineCognitiveScore: 200, latestCognitiveScore: 250 }));
    assert('40% cognitive decline triggers SEVERE_COGNITIVE_DECLINE', flagsSev.some(f => f.code === 'SEVERE_COGNITIVE_DECLINE'));
    assert('25% cognitive decline triggers COGNITIVE_DECLINE', flagsMod.some(f => f.code === 'COGNITIVE_DECLINE'));
  }

  // Elevated temp
  {
    const flags = validateCutSafety(makeSafetyInput({ cutPhase: 'fight_week_cut', bodyTempF: 101.0 }));
    assert('Body temp > 100.4 triggers ELEVATED_TEMP', flags.some(f => f.code === 'ELEVATED_TEMP'));
  }

  // Water cut exceeds plan
  {
    const flags = validateCutSafety(makeSafetyInput({
      cutPhase: 'fight_week_load',
      waterCutAllocationLbs: 4,
      remainingLbsToTarget: 6,
      daysToWeighIn: 5,
    }));
    assert('Remaining > allocation*1.3 triggers WATER_CUT_EXCEEDS_PLAN', flags.some(f => f.code === 'WATER_CUT_EXCEEDS_PLAN'));
  }

  // Clean input → no flags
  {
    const flags = validateCutSafety(makeSafetyInput());
    assert('Clean input produces zero safety flags', flags.length === 0);
  }
})();

(() => {
  // ── computeRehydrationProtocol ───────────────────────────────
  console.log('\n  Section: computeRehydrationProtocol');

  // Male: 7% regain target
  {
    const result = computeRehydrationProtocol({
      currentWeight: 170,
      targetWeight: 170,
      biologicalSex: 'male',
      weighInTime: '2026-06-14T09:00:00',
      fightTime: '2026-06-14T19:00:00',
    });
    assert('Male target regain is ~7% of target weight', result.targetRegainLbs >= 11.5 && result.targetRegainLbs <= 12.5);
    assert('Rehydration has 3 phases', result.phases.length === 3);
    assert('Total sodium target is 4500mg', result.totalSodiumTargetMg === 4500);
  }

  // Female: 5% regain target
  {
    const result = computeRehydrationProtocol({
      currentWeight: 125,
      targetWeight: 125,
      biologicalSex: 'female',
      weighInTime: '2026-06-14T09:00:00',
      fightTime: '2026-06-14T19:00:00',
    });
    assert('Female target regain is ~5% of target weight', result.targetRegainLbs >= 6.0 && result.targetRegainLbs <= 6.5);
  }

  // Fluid target from weight deficit
  {
    const result = computeRehydrationProtocol({
      currentWeight: 165,
      targetWeight: 170,
      biologicalSex: 'male',
      weighInTime: '2026-06-14T09:00:00',
      fightTime: '2026-06-14T19:00:00',
    });
    // weightDeficit = 5 lbs → totalFluidTargetLiters = round(5 * 0.7 * 10)/10 = 3.5
    assert('5lb deficit yields 3.5L fluid target', result.totalFluidTargetLiters === 3.5);
    assert('Phase 2 gets 40% of fluid target (1.4L)', result.phases[1].fluidTargetLiters === 1.4);
  }

  {
    const result = computeRehydrationProtocol({
      currentWeight: 172,
      targetWeight: 170,
      biologicalSex: 'male',
      weighInTime: '2026-06-14T09:00:00',
      fightTime: '2026-06-14T19:00:00',
    });
    assert('Over-target weigh-in does not create fluid target from absolute weight gap', result.totalFluidTargetLiters === 0);
    assert('Over-target weigh-in phases do not prescribe extra fluid volume', result.phases.every((phase) => phase.fluidTargetLiters === 0 && phase.targetFluidOz === 0));
  }
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
