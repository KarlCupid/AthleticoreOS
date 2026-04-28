import { buildMissionDashboardViewModel } from './missionDashboard.ts';
import type {
  ACWRResult,
  DailyMission,
  MissionRiskLevel,
  ReadinessState,
  WeeklyComplianceReport,
} from '../types.ts';

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

function makeAcwr(overrides: Partial<ACWRResult> = {}): ACWRResult {
  return {
    ratio: 1,
    acute: 100,
    chronic: 100,
    acuteEWMA: 100,
    chronicEWMA: 100,
    status: 'safe',
    message: 'In range',
    daysOfData: 14,
    thresholds: {
      caution: 1.25,
      redline: 1.45,
      detrained: 0.8,
      confidence: 'high',
      personalizationFactors: [],
      source: 'ewma_personalized',
    },
    loadMetrics: {
      weeklyLoad: 700,
      monotony: 1,
      strain: 700,
      acuteEWMA: 100,
      chronicEWMA: 100,
      rollingFatigueRatio: 1,
      rollingFatigueScore: 20,
      fatigueBand: 'low',
      safetyThreshold: 1.25,
      thresholdSource: 'standard_chronic',
      dailyLoads: [100, 100, 100, 100, 100, 100, 100],
    },
    ...overrides,
  };
}

function makeWeeklyReport(overrides: Partial<WeeklyComplianceReport> = {}): WeeklyComplianceReport {
  return {
    sc: { planned: 3, actual: 2, pct: 67 },
    boxing: { planned: 2, actual: 2, pct: 100 },
    running: { planned: 1, actual: 1, pct: 100 },
    conditioning: { planned: 0, actual: 0, pct: 0 },
    recovery: { planned: 0, actual: 0, pct: 0 },
    totalLoadPlanned: 500,
    totalLoadActual: 450,
    overallPct: 90,
    streak: 3,
    message: 'On track',
    ...overrides,
  };
}

function makeMission(overrides: {
  readinessState?: ReadinessState;
  riskLevel?: MissionRiskLevel;
  interventionState?: 'none' | 'soft' | 'hard';
  sessionRole?: DailyMission['trainingDirective']['sessionRole'];
  goalMode?: DailyMission['macrocycleContext']['goalMode'];
  daysOut?: number | null;
  campPhase?: DailyMission['macrocycleContext']['campPhase'];
  isMandatoryRecovery?: boolean;
} = {}): DailyMission {
  const readinessState = overrides.readinessState ?? 'Prime';
  return {
    date: '2026-04-20',
    engineVersion: 'test',
    generatedAt: '2026-04-20T12:00:00Z',
    headline: 'Test mission',
    summary: 'Test summary',
    objective: {
      mode: overrides.goalMode ?? 'build_phase',
      goalType: 'strength',
      primaryOutcome: 'Build strength',
      secondaryConstraint: 'none',
      goalLabel: null,
      targetMetric: 'strength',
      targetValue: null,
      targetUnit: null,
      deadline: null,
      horizonWeeks: null,
      successWindow: null,
    },
    macrocycleContext: {
      date: '2026-04-20',
      phase: overrides.goalMode === 'fight_camp' ? 'camp-peak' : 'off-season',
      goalMode: overrides.goalMode ?? 'build_phase',
      performanceGoalType: 'strength',
      performanceObjective: {
        mode: overrides.goalMode ?? 'build_phase',
        goalType: 'strength',
        primaryOutcome: 'Build strength',
        secondaryConstraint: 'none',
        goalLabel: null,
        targetMetric: 'strength',
        targetValue: null,
        targetUnit: null,
        deadline: null,
        horizonWeeks: null,
        successWindow: null,
      },
      buildGoal: null,
      camp: null,
      campPhase: overrides.campPhase ?? null,
      weightCutState: 'none',
      isOnActiveCut: false,
      weighInTiming: null,
      daysOut: overrides.daysOut ?? null,
      isTravelWindow: false,
      currentWeightLbs: null,
      targetWeightLbs: null,
      remainingWeightLbs: null,
      weightTrend: null,
    },
    readinessProfile: {
      neuralReadiness: 80,
      structuralReadiness: 80,
      metabolicReadiness: 80,
      overallReadiness: 80,
      trend: 'stable',
      dataConfidence: 'high',
      dataSufficiency: 'established',
      cardioModifier: 1,
      proteinModifier: 1,
      flags: [],
      performanceAnchors: [],
      readinessState,
    },
    trainingDirective: {
      sessionRole: overrides.sessionRole ?? 'express',
      interventionState: overrides.interventionState ?? 'none',
      isMandatoryRecovery: overrides.isMandatoryRecovery ?? false,
      focus: 'full_body',
      workoutType: 'strength',
      intent: 'Push the key work',
      reason: 'Today matches the plan.',
      intensityCap: null,
      durationMin: 60,
      volumeTarget: 'normal',
      keyQualities: [],
      source: 'daily_engine',
      prescription: null,
    },
    fuelDirective: {
      state: 'strength_power',
      sessionDemandScore: 50,
      calories: 2500,
      protein: 180,
      carbs: 260,
      fat: 70,
      preSessionCarbsG: 30,
      intraSessionCarbsG: 0,
      postSessionProteinG: 35,
      intraSessionHydrationOz: 16,
      hydrationBoostOz: 0,
      sodiumTargetMg: null,
      compliancePriority: 'performance',
      adjustmentFlag: null,
      source: 'daily_engine',
      message: 'Fuel normally.',
      reasons: [],
      energyAvailability: null,
      fuelingFloorTriggered: false,
      safetyWarning: 'none',
    },
    hydrationDirective: {
      waterTargetOz: 100,
      sodiumTargetMg: null,
      protocol: 'normal',
      message: 'Hydrate normally.',
    },
    recoveryDirective: {
      emphasis: 'normal',
      sleepTargetHours: 8,
      modalities: [],
      restrictions: [],
    },
    riskState: {
      level: overrides.riskLevel ?? 'low',
      score: 20,
      label: 'Low',
      drivers: [],
      flags: [],
    },
    decisionTrace: [],
    overrideState: {
      status: 'following_plan',
      note: 'No override',
    },
  } as DailyMission;
}

const baseInput = {
  acwr: makeAcwr(),
  readinessState: 'Prime' as ReadinessState,
  checkinDone: true,
  sessionDone: false,
  hasActiveFightCamp: false,
  hasActiveCutPlan: false,
  todayPlanEntryIsDeload: false,
  weightTrend: null,
  weeklyReview: makeWeeklyReport(),
  recentTrainingSessions: [
    { date: '2026-04-13', total_volume: 100, session_rpe: 5, duration_minutes: 45 },
    { date: '2026-04-15', total_volume: 120, session_rpe: 5, duration_minutes: 45 },
    { date: '2026-04-17', total_volume: 150, session_rpe: 6, duration_minutes: 50 },
    { date: '2026-04-19', total_volume: 170, session_rpe: 6, duration_minutes: 50 },
  ],
  cutSafetyFlags: [],
};

console.log('\n-- mission dashboard --');

{
  const result = buildMissionDashboardViewModel({
    ...baseInput,
    mission: null,
    acwr: null,
    weeklyReview: null,
    recentTrainingSessions: [],
  });
  assert('No mission shows keep logging', result.mission === 'Keep logging');
  assert('No mission uses not-enough-data status', result.status === 'not_enough_data');
  assert('No mission does not invent why copy', result.why[0].includes('Not enough data'));
}

{
  const result = buildMissionDashboardViewModel({
    ...baseInput,
    mission: makeMission(),
  });
  assert('Safe build day is green', result.status === 'good_to_push');
  assert('Safe build day gives direct push mission', result.mission === 'Push hard today');
  assert('Safe build day explains progress without scores', result.why.join(' ').includes('Build phase'));
  assert('Safe build day avoids numeric readiness scores', !result.why.join(' ').match(/\b\d+\/100\b/));
}

{
  const result = buildMissionDashboardViewModel({
    ...baseInput,
    mission: makeMission({
      goalMode: 'fight_camp',
      campPhase: 'peak',
      daysOut: 12,
      readinessState: 'Depleted',
      riskLevel: 'moderate',
      interventionState: 'soft',
    }),
    readinessState: 'Depleted',
    hasActiveFightCamp: true,
  });
  assert('Fight camp fatigue becomes train smart, not automatic pull back', result.status === 'train_smart');
  assert('Fight camp controlled mission keeps intensity context', result.mission === 'Train, but keep it controlled');
  assert('Fight camp why normalizes fatigue', result.why.some((line) => line.includes('Fatigue is expected')));
}

{
  const result = buildMissionDashboardViewModel({
    ...baseInput,
    mission: makeMission({ riskLevel: 'critical', interventionState: 'hard' }),
    cutSafetyFlags: [{
      severity: 'danger',
      title: 'Recovery is falling behind',
      message: 'A safety flag is active today.',
      recommendation: 'Adjust today or prioritize recovery.',
    }],
  });
  assert('Critical safety pulls back', result.status === 'pull_back');
  assert('Critical safety shows risk alert', result.supportCards[0].kind === 'risk_alert');
  assert('Critical safety gives safe action', result.supportCards[0].action === 'Adjust today or prioritize recovery.');
}

{
  const result = buildMissionDashboardViewModel({
    ...baseInput,
    mission: makeMission(),
    acwr: makeAcwr({
      daysOfData: 3,
      thresholds: {
        caution: 1.25,
        redline: 1.45,
        detrained: 0.8,
        confidence: 'low',
        personalizationFactors: ['low_data'],
        source: 'ewma_personalized',
      },
    }),
    recentTrainingSessions: [],
  });
  const training = result.supportCards.find((card) => card.kind === 'training_trend');
  const performance = result.supportCards.find((card) => card.kind === 'performance_pulse');
  assert('Low training history asks for logs', training?.status === 'Keep logging');
  assert('Low performance history asks for logs', performance?.status === 'Keep logging');
}

console.log(`\n-- Results: ${passed} passed, ${failed} failed --\n`);
process.exit(failed > 0 ? 1 : 0);
