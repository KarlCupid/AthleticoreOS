export type InteractionMode = 'standard' | 'focus' | 'gym-floor';

export interface CompassViewModel {
  headline: string;
  summaryLine: string;
  primaryCTALabel: string;
  primaryCTATarget: 'training' | 'plan' | 'checkin' | 'nutrition';
  secondaryCTALabel: string | null;
  secondaryCTATarget: 'training' | 'plan' | 'checkin' | 'nutrition' | null;
  reasonSentence: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  sessionLabel: string;
  sessionRoleLabel: string;
  hasPrescription: boolean;
}

export interface MorningFlowViewModel {
  checkinDone: boolean;
  sessionDone: boolean;
  nutritionLogged: boolean;
  nextStepLabel: string;
  nextStepTarget: 'checkin' | 'training' | 'nutrition';
  progressFraction: number;
}

export interface DecisionReasonViewModel {
  subsystem: string;
  title: string;
  sentence: string;
  impact: 'kept' | 'adjusted' | 'restricted' | 'escalated';
}

export interface QuickFuelIntent {
  id: string;
  label: string;
  calTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
}

export interface NutritionQuickActionViewModel {
  fuelDirectiveHeadline: string;
  preSessionCue: string | null;
  postSessionCue: string | null;
  intraSessionCue: string | null;
  quickIntentOptions: QuickFuelIntent[];
  isTrainingDay: boolean;
  safetyWarning: string | null;
}

export interface TrainingFloorViewModel {
  sessionGoal: string;
  reasonSentence: string;
  activationRequired: boolean;
  activationGuidance: string | null;
  isDeload: boolean;
  exerciseCount: number;
  estimatedDurationMin: number;
  primaryAdaptation: string;
}

export interface WeeklyReviewNarrativeViewModel {
  whatImproved: string;
  whatSlipped: string | null;
  whatChangesNext: string;
  narrativeSummary: string;
  highlightChart: 'training_compliance' | 'readiness_trend' | 'weight_trend' | 'load_summary';
  complianceMetrics: { label: string; planned: number; actual: number; pct: number }[];
  overallPct: number;
  streak: number;
}
