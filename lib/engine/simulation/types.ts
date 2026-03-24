import type {
  ReadinessState,
} from '../types/foundational.ts';
// import {
//   ACWRResult,
// } from '../types/readiness.ts';

export interface ACWRThresholds {
  caution: number;
  redline: number;
  confidence: 'low' | 'medium' | 'high';
  personalizationFactors: string[];
}

export interface ACWRResult {
  ratio: number;
  acute: number;
  chronic: number;
  status: 'safe' | 'caution' | 'redline';
  message: string;
  daysOfData: number;
  thresholds: ACWRThresholds;
  loadMetrics: any;
}
import type {
  DailyMission,
  MacrocycleContext,
} from '../types/mission.ts';

export interface DailyEngineState {
  date: string;
  engineVersion: string;
  objectiveContext: MacrocycleContext;
  acwr: ACWRResult;
  readinessState: ReadinessState;
  readinessProfile: any;
  constraintSet: any;
  cutProtocol: any;
  nutritionTargets: any;
  hydration: any;
  scheduledActivities: any[];
  weeklyPlanEntries: any[];
  primaryScheduledActivity: any;
  primaryPlanEntry: any;
  primaryEnginePlanEntry: any;
  workoutPrescription: any;
  mission: DailyMission;
  campRisk: any;
  medStatus: any;
}

export type SimulationPersona = {
  name: string;
  description: string;
  
  // Probabilities and biases
  workoutCompliance: number; // 0.0 to 1.0
  rpeBias: number; // e.g., +1 means they always report 1 RPE higher than prescribed
  
  // Recovery traits
  averageSleepQuality: number; // 1-10
  averageReadiness: number; // 1-10
  readinessVolatility: number; // 0.0 (stable) to 1.0 (chaotic)
  
  // Nutrition traits
  nutritionCompliance: number; // 0.0 to 1.0
  cheatDayProbability: number; // probability of a "binge" day
  cheatDayCalorieBurden: number; // how many extra calories on a cheat day
};

export type FatigueState = {
  centralFatigue: number; // 0-100, affects readiness
  muscularDamage: number; // 0-100, affects ACWR/injury risk
  accumulationHistory: number[]; // recent 7d damage
};

export type MetabolicState = {
  currentWeightLbs: number;
  glycogenStores: number; // 0.0 to 1.0
  hydrationState: number; // 0.0 to 1.0
};

export type SimulationState = {
  fatigue: FatigueState;
  metabolism: MetabolicState;
  consecutiveDepletedDays: number;
};

export type DailySimulationLog = {
  date: string;
  engineState: DailyEngineState;
  stateBefore: SimulationState;
  stateAfter: SimulationState;
  personaAction: {
    readinessLogged: number;
    sleepLogged: number;
    didWarmup: boolean;
    sessionsCompleted: Array<{
      type: string;
      sessionName?: string; 
      prescribedRpe: number;
      actualRpe: number;
      prescribedDuration: number;
      actualDuration: number;
      tonnage?: number; 
    }>;
    nutritionAdherence: number;
    isCheatDay: boolean;
    actualCalories: number;
    actualProtein: number;
    actualCarbs: number;
    actualFat: number;
    cutPhase?: string; 
    waterTargetOz?: number;
    sodiumTargetMg?: number | null;
    fiberState?: string;
    interventionState?: 'none' | 'soft' | 'hard';
    isMandatoryRecovery?: boolean;
    weightDriftLbs?: number | null;
    cutInterventionReason?: string | null;
    workoutBlueprint?: string; 
    coachingInsight?: string; 
    athleteMonologue?: string;
    conditioningPrescription?: {
      type: string;
      totalDurationMin: number;
      rounds: number;
      workIntervalSec: number;
      restIntervalSec: number;
      intensityLabel: 'light' | 'moderate' | 'hard';
      message: string;
      cnsBudget: number;
      estimatedLoad: number;
      exercises: Array<{
        name: string;
        durationSec: number | null;
        reps: number | null;
        rounds: number;
        restSec: number;
      }>;
    } | null;
    conditioningLog?: {
      completedRounds: number;
      prescribedRounds: number;
      completedDurationMin: number;
      targetDurationMin: number;
      actualRpe: number | null;
      completionRate: number;
      note: string;
      drillLogs: Array<{
        name: string;
        targetRounds: number;
        completedRounds: number;
        durationSec: number | null;
        reps: number | null;
        restSec: number;
        completed: boolean;
        note: string;
      }>;
    } | null;
    exerciseLogs?: Array<{
      exerciseId: string;
      exerciseName: string;
      sectionTitle?: string | null;
      targetSets: number;
      completedSets: number;
      targetReps: number;
      actualReps: number;
      targetRpe: number;
      actualRpe: number | null;
      suggestedWeight: number | null;
      actualWeight: number | null;
      completed: boolean;
      note: string;
    }>;
  };
};

export type SimulationConfig = {
  startDate: string;
  weeks: number;
  seed?: number;
  persona: SimulationPersona;
  initialState: {
    weightLbs: number;
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
    goalMode: 'build_phase' | 'fight_camp';
    targetWeight?: number;
    fightDate?: string;
  };
};

export type SimulationResult = {
  config: SimulationConfig;
  dailyLogs: DailySimulationLog[];
};
