import type {
  ActivityType,
  BuildPhaseGoalRow,
  ConstraintTier,
  ObjectiveSecondaryConstraint,
} from '../../../lib/engine/types';

export type CommitmentType = Extract<ActivityType, 'boxing_practice' | 'sparring'>;

export type EditableCommitment = {
  id: string;
  dayOfWeek: number;
  activityType: CommitmentType;
  label: string;
  startTime: string;
  durationMin: string;
  expectedIntensity: number;
  tier: ConstraintTier;
};

export type SetupPhaseKey = 'objective' | 'availability' | 'commitments';

export type SetupPhase = {
  key: SetupPhaseKey;
  eyebrow: string;
  title: string;
  description: string;
};

export type BuildMetricOption = {
  value: string;
  label: string;
  description: string;
  unit: string;
  placeholder: string;
};

export type BuildPhaseRecommendation = {
  metric: BuildMetricOption;
  targetValue: number;
  targetHorizonWeeks: number;
  reason: string;
  goalStatement: string;
  secondaryConstraint: ObjectiveSecondaryConstraint;
};

export type GuidedBuildGoalCheckInput = {
  buildGoal: BuildPhaseGoalRow;
  recommendation: BuildPhaseRecommendation;
};
