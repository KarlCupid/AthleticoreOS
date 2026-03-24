import type {
  BuildPhaseGoalType,
  ObjectiveSecondaryConstraint,
} from '../../../lib/engine/types';
import type {
  BuildMetricOption,
  CommitmentType,
  SetupPhase,
} from './types';

export const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

export const DAY_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
export const DURATION_OPTIONS = [30, 45, 60, 75, 90];
export const COMMITMENT_DURATION_OPTIONS = [30, 45, 60, 75, 90, 105, 120];
export const DELOAD_OPTIONS = [4, 5, 6, 8];
export const ROUND_OPTIONS = [3, 4, 5, 6, 8, 10, 12];
export const ROUND_DURATION_OPTIONS = [120, 180, 240, 300];
export const REST_DURATION_OPTIONS = [30, 45, 60, 90];

export const BUILD_GOAL_OPTIONS: { value: BuildPhaseGoalType; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'boxing_skill', label: 'Boxing Skill' },
  { value: 'weight_class_prep', label: 'Weight Class Prep' },
];

export const COMMITMENT_OPTIONS: { value: CommitmentType; label: string }[] = [
  { value: 'boxing_practice', label: 'Boxing' },
  { value: 'sparring', label: 'Sparring' },
];

export const SECONDARY_CONSTRAINT_OPTIONS: {
  value: ObjectiveSecondaryConstraint;
  label: string;
  description: string;
}[] = [
  { value: 'protect_recovery', label: 'Protect Recovery', description: 'Keep progression high without burying recovery.' },
  { value: 'weight_trajectory', label: 'Weight Trajectory', description: 'Keep bodyweight moving in the intended direction.' },
  { value: 'skill_frequency', label: 'Skill Frequency', description: 'Protect boxing and sparring exposure while building.' },
  { value: 'schedule_reliability', label: 'Schedule Reliability', description: 'Bias toward plans that are easier to actually complete.' },
  { value: 'injury_risk', label: 'Injury Risk', description: 'Limit spike risk and protect return-to-train consistency.' },
];

export const BUILD_METRIC_OPTIONS: Record<BuildPhaseGoalType, BuildMetricOption[]> = {
  strength: [
    { value: 'estimated_1rm_lbs', label: 'Estimated 1RM', description: 'Best single-rep strength estimate for the main lift you care about.', unit: 'lbs', placeholder: '275' },
    { value: 'top_working_weight_lbs', label: 'Top Working Weight', description: 'Heaviest high-quality working weight you want to own consistently.', unit: 'lbs', placeholder: '225' },
    { value: 'strength_sessions_per_week', label: 'Strength Sessions / Week', description: 'How many quality strength sessions you want to consistently complete each week.', unit: 'sessions / week', placeholder: '3' },
  ],
  conditioning: [
    { value: 'hard_conditioning_sessions_per_week', label: 'Hard Conditioning Sessions / Week', description: 'How many hard conditioning sessions you want to sustain each week.', unit: 'sessions / week', placeholder: '3' },
    { value: 'conditioning_minutes_per_week', label: 'Conditioning Minutes / Week', description: 'Total weekly conditioning volume you want to reach.', unit: 'minutes / week', placeholder: '90' },
    { value: 'quality_rounds_completed', label: 'Quality Rounds Completed', description: 'Number of strong, on-pace rounds you want to be able to complete.', unit: 'rounds', placeholder: '8' },
  ],
  boxing_skill: [
    { value: 'boxing_sessions_per_week', label: 'Technical Boxing Sessions / Week', description: 'How many focused boxing sessions you want to consistently hit each week.', unit: 'sessions / week', placeholder: '4' },
    { value: 'sparring_rounds_per_week', label: 'Sparring Rounds / Week', description: 'How many productive sparring rounds you want to handle in a week.', unit: 'rounds / week', placeholder: '12' },
    { value: 'pad_rounds_per_session', label: 'Pad Rounds Per Session', description: 'How many high-quality pad rounds you want to own in a single session.', unit: 'rounds / session', placeholder: '6' },
  ],
  weight_class_prep: [
    { value: 'body_weight_lbs', label: 'Body Weight', description: 'Target bodyweight you want to reach before camp pressure sets in.', unit: 'lbs', placeholder: '155' },
    { value: 'weekly_weight_change_lbs', label: 'Weekly Weight Change', description: 'How much weight you want to lose or gain each week on average.', unit: 'lbs / week', placeholder: '1.5' },
    { value: 'nutrition_compliance_days_per_week', label: 'Nutrition Compliance Days / Week', description: 'How many days per week you want to hit your nutrition plan on target.', unit: 'days / week', placeholder: '6' },
  ],
};

export const BUILD_GOAL_OBJECTIVE_PLACEHOLDERS: Record<BuildPhaseGoalType, string> = {
  strength: 'Increase lower-body strength without giving up speed or freshness.',
  conditioning: 'Build the pace to hold strong output from the first round through the last.',
  boxing_skill: 'Sharpen technical execution so exchanges stay cleaner under pressure.',
  weight_class_prep: 'Move toward the target class steadily before the cut becomes urgent.',
};

export const DEFAULT_WINDOW = { startTime: '18:00', endTime: '20:00' };

export const SETUP_PHASES: SetupPhase[] = [
  {
    key: 'objective',
    eyebrow: 'Phase 1',
    title: 'Objective',
    description: 'Define what this plan is for, when it starts, and the target the engine should optimize around.',
  },
  {
    key: 'availability',
    eyebrow: 'Phase 2',
    title: 'Availability',
    description: 'Show us when training can happen so the engine only schedules work inside realistic windows.',
  },
  {
    key: 'commitments',
    eyebrow: 'Phase 3',
    title: 'Fixed Sessions',
    description: 'List classes, sparring, and coach-prescribed work that should be treated as fixed or preferred anchors.',
  },
  {
    key: 'planner',
    eyebrow: 'Phase 4',
    title: 'Planner Rules',
    description: 'Finish with scheduling preferences the engine should use after fixed work is placed.',
  },
];
