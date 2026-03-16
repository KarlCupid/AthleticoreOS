import type { 
  DailySimulationLog, 
  SimulationConfig, 
  SimulationResult,
  SimulationState
} from './types.ts';
import { 
  buildDailyMission, 
  calculateACWR,
  getGlobalReadinessState,
  getBoxingIntensityScalar,
  calculateNutritionTargets,
  resolveDailyNutritionTargets,
  calculateCampRisk,
  generateWorkout,
  generateCutPlan,
  computeDailyCutProtocol
} from '../index.ts';
import { EXERCISE_SEED } from '../../data/exerciseSeed.ts';
import type { ExerciseLibraryRow } from '../types.ts';
import type {
  DailyEngineState,
  MacrocycleContext,
  PerformanceObjective,
} from '../types/mission.ts';
import type {
  ReadinessState,
  ReadinessDetail,
  ReadinessFactors,
  ACWRResult,
} from '../types/readiness.ts';
import type {
  Phase,
} from '../types/foundational.ts';
import type {
  ScheduledActivityRow,
} from '../types/training.ts';

function addIsoDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function buildSimulationCutPlan(input: {
  startDate: string;
  fightDate: string;
  startWeight: number;
  targetWeight: number;
}) {
  const { startDate, fightDate, startWeight, targetWeight } = input;
  const plan = generateCutPlan({
    startWeight,
    targetWeight,
    fightDate: addIsoDays(fightDate, 1),
    weighInDate: fightDate,
    fightStatus: 'pro',
    biologicalSex: 'male',
    sport: 'boxing',
  });

  return {
    id: 'sim-cut-plan',
    user_id: 'sim-user',
    start_weight: startWeight,
    target_weight: targetWeight,
    weight_class_name: 'Simulation',
    sport: 'boxing',
    fight_date: addIsoDays(fightDate, 1),
    weigh_in_date: fightDate,
    plan_created_date: startDate,
    fight_status: 'pro',
    max_water_cut_pct: plan.maxWaterCutPct,
    total_cut_lbs: plan.totalCutLbs,
    diet_phase_target_lbs: plan.dietPhaseTargetLbs,
    water_cut_allocation_lbs: plan.waterCutAllocationLbs,
    chronic_phase_start: plan.chronicPhaseDates?.start ?? startDate,
    chronic_phase_end: plan.chronicPhaseDates?.end ?? plan.intensifiedPhaseDates.start,
    intensified_phase_start: plan.intensifiedPhaseDates.start,
    intensified_phase_end: plan.intensifiedPhaseDates.end,
    fight_week_start: plan.fightWeekDates.start,
    weigh_in_day: fightDate,
    rehydration_start: addIsoDays(fightDate, 1),
    status: 'active',
    completed_at: null,
    safe_weekly_loss_rate: plan.safeWeeklyLossRateLbs,
    calorie_floor: plan.calorieFloor,
    baseline_cognitive_score: 100,
    coach_notes: null,
    created_at: `${startDate}T00:00:00Z`,
    updated_at: `${startDate}T00:00:00Z`,
  };
}

function normalizeCutProtocol(protocol: any) {
  if (!protocol) return null;
  return {
    ...protocol,
    cut_phase: protocol.cutPhase,
    days_to_weigh_in: protocol.daysToWeighIn,
    weight_drift_lbs: protocol.weightDriftLbs,
    prescribed_calories: protocol.prescribedCalories,
    prescribed_protein: protocol.prescribedProtein,
    prescribed_carbs: protocol.prescribedCarbs,
    prescribed_fat: protocol.prescribedFat,
    water_target_oz: protocol.waterTargetOz,
    sodium_target_mg: protocol.sodiumTargetMg,
    sodium_instruction: protocol.sodiumInstruction,
    fiber_instruction: protocol.fiberInstruction,
    training_recommendation: protocol.trainingRecommendation,
    training_intensity_cap: protocol.trainingIntensityCap,
    intervention_reason: protocol.interventionReason,
    morning_protocol: protocol.morningProtocol,
    afternoon_protocol: protocol.afternoonProtocol,
    evening_protocol: protocol.eveningProtocol,
    rehydration_protocol: protocol.rehydrationProtocol,
  };
}


/**
 * Core loop to run a simulation for a specific persona
 */
export async function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  const { startDate, weeks, persona, initialState } = config;
  const days = weeks * 7;
  const dailyLogs: DailySimulationLog[] = [];

  // 1. Initialize Simulation State
  let simState: SimulationState = {
    fatigue: {
      centralFatigue: 0,
      muscularDamage: 0,
      accumulationHistory: []
    },
    metabolism: {
      currentWeightLbs: initialState.weightLbs,
      glycogenStores: 1.0,
      hydrationState: 1.0
    },
    consecutiveDepletedDays: 0
  };

  // Simulated Ledgers (History)
  let sessionHistory: any[] = [];
  let recentExerciseIds: string[] = [];
  let recentMuscleVolume: Record<string, number> = {};
  const simulationCutPlan = initialState.goalMode === 'fight_camp' && initialState.targetWeight && initialState.fightDate
    ? buildSimulationCutPlan({
        startDate,
        fightDate: initialState.fightDate,
        startWeight: initialState.weightLbs,
        targetWeight: initialState.targetWeight,
      })
    : null;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Deep clone state Before
    const stateBefore: SimulationState = JSON.parse(JSON.stringify(simState));

    // --- STEP 1: Simulate Morning State ---
    
    // Readiness is impacted by central fatigue
    const fatiguePenalty = (simState.fatigue.centralFatigue / 20); // up to -5 points
    const baseReadiness = persona.averageReadiness - fatiguePenalty;
    const readinessLogged = Math.max(1, Math.min(10, Math.round(baseReadiness + (Math.random() - 0.5) * persona.readinessVolatility * 10)));
    
    // Sleep is impacted by overtraining/fatigue spikes
    const sleepPenalty = simState.fatigue.centralFatigue > 80 ? 2 : 0;
    const sleepLogged = Math.max(1, Math.min(10, Math.round(persona.averageSleepQuality - sleepPenalty + (Math.random() - 0.5) * persona.readinessVolatility * 10)));

    if (readinessLogged <= 3) {
      simState.consecutiveDepletedDays++;
    } else {
      simState.consecutiveDepletedDays = 0;
    }

    // --- STEP 2: Engine Decision Loop ---

    const prescribedIntensity = 5; // Lower baseline for mock variety

    // Compute ACWR based on simulated muscular damage (proxy for load)
    const mockACWR: ACWRResult = {
      ratio: 1.0 + (simState.fatigue.muscularDamage / 100), // Simple proxy
      status: simState.fatigue.muscularDamage > 80 ? 'redline' : simState.fatigue.muscularDamage > 50 ? 'caution' : 'safe',
      acute: simState.fatigue.muscularDamage,
      chronic: 50,
      daysOfData: i,
      message: 'Simulated Biological ACWR',
      thresholds: { caution: 1.2, redline: 1.5, confidence: 'high', personalizationFactors: [] },
      loadMetrics: { acuteLoad: simState.fatigue.muscularDamage, chronicLoad: 50, dailyLoads: [] }
    } as any;

    const baselineTdee = simState.metabolism.currentWeightLbs * 15.5; // Activity-adjusted baseline for a fighter
    const currentExercises: ExerciseLibraryRow[] = EXERCISE_SEED.map((ex, idx) => ({ ...ex, id: `seed-${idx}` }));

    // --- STEP 1: External Loads & Camp Context ---
    const dayOfWeek = (i % 7) + 1; // 1=Mon, 7=Sun
    const isFightWeek = i >= (days - 7);
    const daysOut = Math.max(0, days - i);
    const isOnActiveCut = initialState.goalMode === 'fight_camp' && daysOut <= 14;
    const simulatedCampPhase = daysOut <= 7 ? 'taper' : daysOut <= 14 ? 'peak' : 'build';
    const boxingScalar = getBoxingIntensityScalar({ isOnActiveCut, daysOut });
    
    // Boxing Template (Recurring Schedule)
    const boxingTemplate = [
      { day: 1, name: 'Technical Bag Work', type: 'boxing_practice', intensity: 6, duration: 60 },
      { day: 2, name: 'Pad Work & Drills', type: 'boxing_practice', intensity: 7, duration: 45 },
      { day: 4, name: 'Hard Sparring', type: 'sparring', intensity: 9, duration: 60 },
      { day: 5, name: 'Technical Sparring', type: 'sparring', intensity: 6, duration: 45 },
    ];

    const todayBoxing = boxingTemplate.find(bt => bt.day === dayOfWeek);
    const scheduledActivities: ScheduledActivityRow[] = [];
    
    if (todayBoxing) {
      todayBoxing.intensity = Math.max(2, Math.round(todayBoxing.intensity * boxingScalar));
      scheduledActivities.push({
        id: `boxing-${i}`,
        user_id: 'sim-user',
        activity_type: todayBoxing.type as any,
        name: todayBoxing.name,
        expected_intensity: todayBoxing.intensity,
        duration_min: todayBoxing.duration,
        scheduled_date: dateStr,
        status: 'scheduled',
        is_recurring: true
      } as any);
    }

    const readinessState = getGlobalReadinessState({
      sleep: sleepLogged,
      readiness: readinessLogged,
      acwr: mockACWR.ratio,
      weightPenalty: 0 
    });

    const performanceObjective: PerformanceObjective = {
      mode: initialState.goalMode,
      goalType: 'strength',
      primaryOutcome: initialState.goalMode === 'fight_camp' ? 'Fight Readiness' : 'Build Strength',
      secondaryConstraint: 'protect_recovery',
      goalLabel: 'Simulated Goal',
      targetMetric: 'fight_readiness',
      targetValue: null,
      targetUnit: null,
      deadline: initialState.fightDate || null,
      horizonWeeks: weeks,
      successWindow: null
    };

    const macrocycleContext: MacrocycleContext = {
      date: dateStr,
      phase: i < (days - 7) ? 'camp-build' : 'camp-peak',
      goalMode: initialState.goalMode,
      performanceGoalType: 'strength',
      performanceObjective,
      buildGoal: null,
      camp: initialState.goalMode === 'fight_camp' ? {
        id: 'sim-camp',
        user_id: 'sim-user',
        fightDate: initialState.fightDate || '',
        targetWeight: initialState.targetWeight || 170,
        weightCutState: isOnActiveCut ? 'driving' : 'none',
        totalWeeks: weeks,
        createdAt: '',
        updatedAt: ''
      } as any : null,
      campPhase: simulatedCampPhase as any,
      weightCutState: isOnActiveCut ? 'driving' : 'none',
      isOnActiveCut,
      weighInTiming: null,
      daysOut,
      isTravelWindow: false,
      currentWeightLbs: simState.metabolism.currentWeightLbs,
      targetWeightLbs: initialState.targetWeight || null,
      remainingWeightLbs: (initialState.targetWeight && simState.metabolism.currentWeightLbs) ? (simState.metabolism.currentWeightLbs - initialState.targetWeight) : null,
      weightTrend: null
    };

    // Trigger Weight Cut Protocol (Simulation 6.0)
    let cutProtocol: any = null;
    if (simulationCutPlan && isOnActiveCut) {
      const rawCutProtocol = computeDailyCutProtocol({
        plan: simulationCutPlan as any,
        date: dateStr,
        currentWeight: simState.metabolism.currentWeightLbs,
        weightHistory: dailyLogs.slice(-14).map((log) => ({
          date: log.date,
          weight: log.stateAfter.metabolism.currentWeightLbs,
        })),
        baseNutritionTargets: { 
          tdee: baselineTdee,
          adjustedCalories: baselineTdee,
          protein: 180,
          carbs: 300,
          fat: 80,
          fuelState: 'aerobic'
        } as any,
        dayActivities: scheduledActivities as any,
        readinessState,
        acwr: mockACWR.ratio,
        cycleDay: null,
        weeklyVelocityLbs: -1.5,
        lastRefeedDate: null,
        lastDietBreakDate: null,
        baselineCognitiveScore: 100,
        latestCognitiveScore: isFightWeek ? 85 : 100,
        urineColor: isFightWeek ? 5 : 2,
        bodyTempF: 98.6,
        consecutiveDepletedDays: simState.consecutiveDepletedDays,
        biologicalSex: 'male'
      });
      cutProtocol = normalizeCutProtocol(rawCutProtocol);
    }

    const simulatedRiskDrivers: string[] = [];
    const simulatedRiskScore = Math.max(0, Math.round(simState.fatigue.centralFatigue - 45));
    if (simState.fatigue.centralFatigue >= 85) {
      simulatedRiskDrivers.push('Central fatigue is above 85 and needs intervention.');
    }
    if (simState.metabolism.glycogenStores <= 0.3) {
      simulatedRiskDrivers.push('Glycogen stores are critically depleted.');
    }

    const mission = buildDailyMission({
      date: dateStr,
      macrocycleContext,
      readinessState,
      acwr: mockACWR,
      nutritionTargets: {
        tdee: baselineTdee,
        adjustedCalories: baselineTdee,
        protein: 180,
        carbs: 300,
        fat: 80,
        proteinModifier: 1.0,
        phaseMultiplier: 1.0,
        weightCorrectionDeficit: 0,
        message: 'Base Simulation TDEE',
        source: 'base',
        fuelState: 'aerobic',
        sessionDemandScore: 50,
        hydrationBoostOz: 0,
        reasonLines: []
      } as any,
      hydration: { dailyWaterOz: cutProtocol?.water_target_oz || 128, message: 'Simulated' } as any,
      scheduledActivities: scheduledActivities.map(a => ({
        date: a.scheduled_date,
        activity_type: a.activity_type,
        estimated_duration_min: a.duration_min,
        expected_intensity: a.expected_intensity
      })),
      cutProtocol: cutProtocol as any,
      workoutPrescription: generateWorkout({
        readinessState,
        phase: i < (days - 7) ? 'camp-build' : 'camp-peak',
        acwr: mockACWR.ratio,
        exerciseLibrary: currentExercises,
        recentExerciseIds,
        recentMuscleVolume: recentMuscleVolume as any,
        trainingDate: dateStr,
        fitnessLevel: initialState.fitnessLevel as any
      }) as any,
      weeklyPlanEntry: null,
      riskScore: simulatedRiskScore,
      riskDrivers: simulatedRiskDrivers
    });

    // --- STEP 2.5: Weight Cut & Fatigue Physics (Simulation 6.0) ---
    if (cutProtocol) {
      // Acute Weight Shift Physics
      if (cutProtocol.cutPhase === 'fight_week_cut') {
        const waterLoss = (Math.random() * 1.5) + 1.0; 
        simState.metabolism.currentWeightLbs -= waterLoss;
        // Severe fatigue penalty for dehydration/fog
        simState.fatigue.centralFatigue = Math.min(100, simState.fatigue.centralFatigue + 20);
      } else if (cutProtocol.cutPhase === 'rehydration') {
        const waterRegain = (Math.random() * 4) + 3; 
        simState.metabolism.currentWeightLbs += waterRegain;
      }

      // Glycogen Stores impact
      if (cutProtocol.cutPhase === 'intensified' || cutProtocol.cutPhase === 'fight_week_cut') {
        simState.metabolism.glycogenStores = Math.max(0.1, simState.metabolism.glycogenStores - 0.2);
        simState.consecutiveDepletedDays++;
      } else {
        simState.consecutiveDepletedDays = 0;
      }
    }

    const workoutBlueprint = mission.trainingDirective.prescription ? mission.trainingDirective.prescription.exercises.map((e: any) => 
      `${e.exercise.name} (${e.targetSets}x${e.targetReps} @ RPE ${e.targetRPE})`
    ).join(' | ') : 'Rest Day';

    // --- STEP 3: Persona Reaction & Biological Physics ---

    // A. Nutrition (Simulation 5.0: Variety & Role Adaptation)
    const isCheatDay = Math.random() < (persona.cheatDayProbability || 0);
    const nutritionComplied = !isCheatDay && Math.random() < persona.nutritionCompliance;
    
    // Base targets from engine
    let actualCalories = mission.fuelDirective.calories;
    let actualProtein = mission.fuelDirective.protein;
    let actualCarbs = mission.fuelDirective.carbs;
    let actualFat = mission.fuelDirective.fat;

    // Apply "Compliant Variance" (+/- 10%)
    const variance = 0.9 + (Math.random() * 0.2); 
    if (nutritionComplied) {
      actualCalories *= variance;
      actualProtein *= variance;
      actualCarbs *= variance;
      actualFat *= variance;
    } else if (isCheatDay) {
      actualCalories += (persona.cheatDayCalorieBurden || 1000);
      actualCarbs += 150; // Cheat days are usually carb-heavy
      actualFat += 50;
    } else {
      // Non-compliant but not cheat: higher variance
      const badVariance = 0.7 + (Math.random() * 0.6); // 70% to 130%
      actualCalories *= badVariance;
      actualProtein *= badVariance;
      actualCarbs *= badVariance;
      actualFat *= badVariance;
    }

    // Role Adaptation: Develop days get a carb boost, recovery days get more protein ratio
    if (mission.trainingDirective.sessionRole === 'develop') {
      actualCarbs += 30; // Extra fueling for hard work
    } else if (mission.trainingDirective.sessionRole === 'recover') {
      actualCarbs -= 20; // Lower demand
    }

    // Physics Check (Simulation 3.0/5.0)
    // actualCalories, actualProtein, etc are already defined above

    // Physics: Use dynamic baselineTdee for deficit calculation
    const calorieDelta = actualCalories - baselineTdee; 
    const weightChange = (calorieDelta / 3500) + (Math.random() * 0.1 - 0.05); 
    simState.metabolism.currentWeightLbs += weightChange;

    // Boxing execution follows the shared taper rule, then mission intervention can shut it down.
    if (todayBoxing) {
      if (mission.trainingDirective.isMandatoryRecovery) {
        todayBoxing.intensity = 0;
        todayBoxing.name = `SKIPPED: ${todayBoxing.name} (Mandatory Recovery)`;
      } else if (simState.fatigue.centralFatigue > 90) {
        todayBoxing.intensity = 0;
        todayBoxing.name = `SKIPPED: ${todayBoxing.name} (Extreme Fatigue)`;
      } else if (mission.trainingDirective.intensityCap != null) {
        todayBoxing.intensity = Math.min(todayBoxing.intensity, mission.trainingDirective.intensityCap);
      }
    }

    // B. Training (Simulation 5.0: Healing Physics)
    const trainingComplied = Math.random() < persona.workoutCompliance;
    
    // Use the capped intensity from the mission as the limit
    const missionCap = mission.trainingDirective.intensityCap;
    const baseIntensity = missionCap ?? prescribedIntensity;
    
    let actualRpe = trainingComplied ? Math.max(0, Math.min(10, baseIntensity + persona.rpeBias)) : 0;
    
    // Limit the overshoot by Grinders in moderate/high risk scenarios
    if (missionCap !== null && actualRpe > missionCap + 1.5) {
      actualRpe = missionCap + 1.5; 
    }

    if (trainingComplied) {
      const duration = mission.trainingDirective.durationMin || 60;
      const isRecoverySession = mission.trainingDirective.workoutType === 'recovery' || mission.trainingDirective.sessionRole === 'recover';
      
      if (isRecoverySession && actualRpe <= 5.5) {
        // Healing Physics: Stronger subtraction to break redline loops
        // Lower RPE = higher recovery power
        const recoveryPower = (6 - actualRpe) * (duration / 60) * 4; 
        simState.fatigue.centralFatigue = Math.max(0, simState.fatigue.centralFatigue - recoveryPower);
        simState.fatigue.muscularDamage = Math.max(0, simState.fatigue.muscularDamage - (recoveryPower * 2));
      } else {
        // Standard Accumulation
        const fatigueGenerated = (Math.pow(actualRpe, 2) * (duration / 60)) / 2;
        simState.fatigue.centralFatigue = Math.min(100, simState.fatigue.centralFatigue + fatigueGenerated);
        simState.fatigue.muscularDamage = Math.min(100, simState.fatigue.muscularDamage + (fatigueGenerated * 1.2));
      }
    }

    // C. Natural Recovery (Overnight)
    // Add Biological Variance (+/- 20% to recovery efficiency)
    const recoveryEfficiency = 0.8 + (Math.random() * 0.4);
    simState.fatigue.centralFatigue = Math.max(0, simState.fatigue.centralFatigue - (sleepLogged * 2.5 * recoveryEfficiency));
    simState.fatigue.muscularDamage = Math.max(0, simState.fatigue.muscularDamage - (sleepLogged * 1.5 * recoveryEfficiency));

    const completedSession = trainingComplied ? {
      type: mission.trainingDirective.workoutType || 'unknown',
      sessionName: mission.trainingDirective.focus || 'Strength & Conditioning',
      prescribedRpe: baseIntensity,
      actualRpe,
      prescribedDuration: mission.trainingDirective.durationMin || 60,
      actualDuration: mission.trainingDirective.durationMin || 60,
      tonnage: actualRpe * 1000 // Mock tonnage
    } : null;

    // --- STEP 4: Narrative Auditor (Simulation 3.0) ---
    let coachingInsight = '';
    let athleteMonologue = '';

    if (mission.riskState.level === 'moderate' || mission.riskState.level === 'high' || mission.riskState.level === 'critical') {
      coachingInsight = `Engine detected high risk (${mission.riskState.level}): ${mission.riskState.drivers[0]}. Pulled back to ${mission.trainingDirective.sessionRole} role.`;
      athleteMonologue = `I'm feeling pretty beat up. My ${mission.riskState.drivers[0].toLowerCase()} is catching up to me. Glad the engine saw it.`;
    } else if (readinessLogged > 8) {
      coachingInsight = `Athlete is in Prime shape. Prescribing high-intensity ${mission.trainingDirective.focus} work to capitalize on readiness.`;
      athleteMonologue = `Feeling like a beast today. Ready to smash this session.`;
    } else {
      coachingInsight = `Steady state progression. Maintaining ${mission.trainingDirective.sessionRole} volume to build consistency.`;
      athleteMonologue = `Just another day at the office. Grinding through the plan.`;
    }

    if (isCheatDay) {
      coachingInsight += ` | Note: Large caloric surplus detected today. Engine will monitor weight trend for metabolic correction.`;
      athleteMonologue += ` | Had a bit of a binge today. Feeling guilty but the food was worth it.`;
    }

    // --- STEP 5: Log the Day ---
    dailyLogs.push({
      date: dateStr,
      engineState: {
        date: dateStr,
        engineVersion: 'sim-v3',
        objectiveContext: macrocycleContext,
        acwr: mockACWR,
        readinessState,
        cutProtocol: null,
        nutritionTargets: mission.fuelDirective as any,
        hydration: mission.hydrationDirective as any,
        scheduledActivities: [],
        weeklyPlanEntries: [],
        primaryScheduledActivity: null,
        primaryPlanEntry: null,
        primaryEnginePlanEntry: null,
        workoutPrescription: null,
        mission,
        campRisk: null
      },
      stateBefore,
      stateAfter: JSON.parse(JSON.stringify(simState)),
      personaAction: {
        readinessLogged,
        sleepLogged,
        didWarmup: trainingComplied && (Math.random() < 0.8),
        sessionsCompleted: [
          ...(completedSession ? [completedSession] : []),
          ...(todayBoxing && todayBoxing.intensity > 0 ? [{
            type: todayBoxing.type,
            sessionName: todayBoxing.name,
            prescribedRpe: todayBoxing.intensity,
            actualRpe: todayBoxing.intensity, // Assume boxing compliance for now
            prescribedDuration: todayBoxing.duration,
            actualDuration: todayBoxing.duration
          }] : [])
        ],
        nutritionAdherence: persona.nutritionCompliance,
        isCheatDay,
        actualCalories: Math.round(actualCalories),
        actualProtein: Math.round(actualProtein),
        actualCarbs: Math.round(actualCarbs),
        actualFat: Math.round(actualFat),
        cutPhase: cutProtocol?.cutPhase || 'none',
        waterTargetOz: cutProtocol?.waterTargetOz || 0,
        sodiumTargetMg: cutProtocol?.sodiumTargetMg || null,
        fiberState: cutProtocol?.fiberInstruction || 'Normal',
        interventionState: mission.trainingDirective.interventionState,
        isMandatoryRecovery: mission.trainingDirective.isMandatoryRecovery,
        weightDriftLbs: cutProtocol?.weightDriftLbs ?? null,
        cutInterventionReason: cutProtocol?.interventionReason ?? null,
        workoutBlueprint,
        coachingInsight,
        athleteMonologue
      } as any
    });

    if (completedSession) {
      sessionHistory.push(completedSession);
      
      // Update Rolling History
      if (mission.trainingDirective.prescription) {
        const newlyDoneIds = mission.trainingDirective.prescription.exercises.map((e: any) => e.exercise.id);
        recentExerciseIds = [...newlyDoneIds, ...recentExerciseIds].slice(0, 20); // Keep last 20 IDs (~3 sessions)
        
        // Update Muscle Volume (approximate sets)
        mission.trainingDirective.prescription.exercises.forEach((e: any) => {
          const mg = e.exercise.muscle_group;
          recentMuscleVolume[mg] = (recentMuscleVolume[mg] || 0) + e.targetSets;
        });
      }
    }

    // Decay Muscle Volume slightly each day to simulate recovery
    Object.keys(recentMuscleVolume).forEach(mg => {
      recentMuscleVolume[mg] = Math.max(0, recentMuscleVolume[mg] * 0.8);
    });
  }

  return {
    config,
    dailyLogs
  };
}
