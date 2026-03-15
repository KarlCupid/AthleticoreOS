import type { CampConfig, CampPhase } from './camp';
import type {
  AthleteGoalMode,
  BuildPhaseGoalRow,
  BuildPhaseGoalType,
  ObjectiveSecondaryConstraint,
  PerformanceGoalType,
  WeightCutInfluenceState,
  WeighInTiming,
} from './fightCampV1';
import type { Phase, ReadinessState, WorkoutFocus, WorkoutType } from './foundational';
import type { ACWRResult, HydrationResult } from './readiness';
import type { ScheduledActivityRow, WeeklyPlanEntryRow } from './schedule';
import type { FuelState, ResolvedNutritionTargets } from './nutrition';
import type { WorkoutPrescriptionV2 } from './training';
import type { DailyCutProtocolRow, WeightTrendResult } from './weight_cut';
import type { CampRiskAssessment } from '../calculateCampRisk';

export type TrainingSessionRole =
  | 'develop'
  | 'express'
  | 'recover'
  | 'spar_support'
  | 'cut_protect'
  | 'taper_sharpen';

export type MissionRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type MissionOverrideStatus =
  | 'following_plan'
  | 'override_available'
  | 'override_applied';

export type DirectiveSource =
  | 'weekly_plan_snapshot'
  | 'daily_engine'
  | 'weight_cut_protocol';

export interface PerformanceObjective {
  mode: AthleteGoalMode;
  goalType: BuildPhaseGoalType | PerformanceGoalType;
  primaryOutcome: string;
  secondaryConstraint: ObjectiveSecondaryConstraint;
  goalLabel: string | null;
  targetMetric: string;
  targetValue: number | null;
  targetUnit: string | null;
  deadline: string | null;
  horizonWeeks: number | null;
  successWindow: string | null;
}

export interface MacrocycleContext {
  date: string;
  phase: Phase;
  goalMode: AthleteGoalMode;
  performanceGoalType: PerformanceGoalType;
  performanceObjective: PerformanceObjective;
  buildGoal: BuildPhaseGoalRow | null;
  camp: CampConfig | null;
  campPhase: CampPhase | null;
  weightCutState: WeightCutInfluenceState;
  isOnActiveCut: boolean;
  weighInTiming: WeighInTiming | null;
  daysOut: number | null;
  isTravelWindow: boolean;
  currentWeightLbs: number | null;
  targetWeightLbs: number | null;
  remainingWeightLbs: number | null;
  weightTrend: WeightTrendResult | null;
}

export interface TrainingDirective {
  sessionRole: TrainingSessionRole;
  focus: WorkoutFocus | null;
  workoutType: WorkoutType | null;
  intent: string;
  reason: string;
  intensityCap: number | null;
  durationMin: number | null;
  volumeTarget: string;
  keyQualities: string[];
  source: DirectiveSource;
  prescription: WorkoutPrescriptionV2 | null;
}

export interface FuelDirective {
  state: FuelState;
  sessionDemandScore: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  preSessionCarbsG: number;
  intraSessionCarbsG: number;
  postSessionProteinG: number;
  intraSessionHydrationOz: number;
  hydrationBoostOz: number;
  sodiumTargetMg: number | null;
  compliancePriority: 'performance' | 'weight' | 'recovery' | 'consistency';
  source: DirectiveSource;
  message: string;
  reasons: string[];
}

export interface HydrationDirective {
  waterTargetOz: number;
  sodiumTargetMg: number | null;
  protocol: string;
  message: string;
}

export interface RecoveryDirective {
  emphasis: string;
  sleepTargetHours: number;
  modalities: string[];
  restrictions: string[];
}

export interface MissionRiskState {
  level: MissionRiskLevel;
  score: number;
  label: string;
  drivers: string[];
}

export interface DecisionTraceItem {
  subsystem: 'objective' | 'training' | 'fuel' | 'hydration' | 'recovery' | 'risk';
  title: string;
  detail: string;
  impact: 'kept' | 'adjusted' | 'restricted' | 'escalated';
}

export interface MissionOverride {
  status: MissionOverrideStatus;
  note: string;
}

export interface DailyMission {
  date: string;
  engineVersion: string;
  generatedAt: string;
  headline: string;
  summary: string;
  objective: PerformanceObjective;
  macrocycleContext: MacrocycleContext;
  trainingDirective: TrainingDirective;
  fuelDirective: FuelDirective;
  hydrationDirective: HydrationDirective;
  recoveryDirective: RecoveryDirective;
  riskState: MissionRiskState;
  decisionTrace: DecisionTraceItem[];
  overrideState: MissionOverride;
}

export interface DailyEngineSnapshotRow {
  id: string;
  user_id: string;
  date: string;
  engine_version: string;
  objective_context_snapshot: MacrocycleContext;
  nutrition_targets_snapshot: ResolvedNutritionTargets;
  workout_prescription_snapshot: WorkoutPrescriptionV2 | null;
  mission_snapshot: DailyMission;
  created_at: string;
  updated_at: string;
}

export interface MissionScheduledActivity {
  date: string;
  activity_type: ScheduledActivityRow['activity_type'];
  estimated_duration_min: number;
  expected_intensity: number;
  status?: ScheduledActivityRow['status'];
}

export interface BuildDailyMissionInput {
  date: string;
  macrocycleContext: MacrocycleContext;
  readinessState: ReadinessState;
  acwr: ACWRResult;
  nutritionTargets: ResolvedNutritionTargets;
  hydration: HydrationResult;
  scheduledActivities: MissionScheduledActivity[];
  cutProtocol: DailyCutProtocolRow | null;
  workoutPrescription: WorkoutPrescriptionV2 | null;
  weeklyPlanEntry: WeeklyPlanEntryRow | null;
  riskScore?: number | null;
  riskDrivers?: string[];
}

export interface BuildMicrocyclePlanInput {
  entries: WeeklyPlanEntryRow[];
  macrocycleContext: MacrocycleContext;
  readinessState: ReadinessState;
  acwr: ACWRResult;
  baseNutritionTargets: ResolvedNutritionTargets;
  hydration: HydrationResult;
}

export interface WeeklyMissionPlan {
  entries: Array<WeeklyPlanEntryRow & { daily_mission_snapshot: DailyMission | null }>;
  headline: string;
  summary: string;
}

export interface DailyEngineState {
  date: string;
  engineVersion: string;
  objectiveContext: MacrocycleContext;
  acwr: ACWRResult;
  readinessState: ReadinessState;
  cutProtocol: DailyCutProtocolRow | null;
  nutritionTargets: ResolvedNutritionTargets;
  hydration: HydrationResult;
  scheduledActivities: ScheduledActivityRow[];
  weeklyPlanEntries: WeeklyPlanEntryRow[];
  primaryScheduledActivity: ScheduledActivityRow | null;
  primaryPlanEntry: WeeklyPlanEntryRow | null;
  workoutPrescription: WorkoutPrescriptionV2 | null;
  mission: DailyMission;
  campRisk: CampRiskAssessment | null;
}
