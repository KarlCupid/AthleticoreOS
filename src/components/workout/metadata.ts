import type { WorkoutType, WorkoutFocus } from '../../../lib/engine/types/foundational';
import type {
  ExerciseRole,
  ExerciseSetPrescription,
  LoadingStrategy,
  WorkoutSectionTemplate,
} from '../../../lib/engine/types/training';
import type { WorkoutRenderMode } from './types';

type LabelMeta = {
  label: string;
};

type LoadingStrategyEducation = {
  summary: string;
  details: string | null;
  loggingInstruction: string | null;
  example: string | null;
};

const LOADING_STRATEGY_LABELS: Record<LoadingStrategy, LabelMeta> = {
  top_set_backoff: { label: 'Top Set + Backoff' },
  straight_sets: { label: 'Straight Sets' },
  density_block: { label: 'Density Block' },
  intervals: { label: 'Intervals' },
  recovery_flow: { label: 'Recovery Flow' },
  emom: { label: 'EMOM' },
  amrap: { label: 'AMRAP' },
  tabata: { label: 'Tabata' },
  timed_sets: { label: 'Timed Sets' },
  for_time: { label: 'For Time' },
  circuit_rounds: { label: 'Circuit' },
};

const LOADING_STRATEGY_EDUCATION: Record<LoadingStrategy, LoadingStrategyEducation> = {
  top_set_backoff: {
    summary: 'Do 1 hard top set first, then lower the weight and finish the backoff sets.',
    details: null,
    loggingInstruction: null,
    example: null,
  },
  straight_sets: {
    summary: 'Use the same working setup across sets and let consistency drive the work.',
    details: 'Straight sets are about repeatable quality. If the target RPE climbs too fast, adjust instead of forcing sloppy reps.',
    loggingInstruction: null,
    example: null,
  },
  density_block: {
    summary: 'Keep moving with short transitions and stack quality work inside the block.',
    details: 'Density work builds output by keeping the pace honest without turning the session messy. Smooth transitions matter more than racing.',
    loggingInstruction: null,
    example: null,
  },
  intervals: {
    summary: 'Alternate work and recovery exactly as prescribed.',
    details: 'Intervals let you push hard in the work windows and recover enough to repeat good efforts. Respecting the rest is part of the session.',
    loggingInstruction: null,
    example: null,
  },
  recovery_flow: {
    summary: 'Move continuously at an easy effort and leave feeling better than you started.',
    details: 'Recovery flow is there to restore range, rhythm, and blood flow without adding fatigue. The goal is to finish fresher, not smoked.',
    loggingInstruction: null,
    example: null,
  },
  emom: {
    summary: 'Start each minute on time and finish the work before the next minute begins.',
    details: 'EMOM keeps your pacing honest by giving you the same window each minute. If you cannot finish cleanly on time, the load or reps are too aggressive.',
    loggingInstruction: null,
    example: null,
  },
  amrap: {
    summary: 'Accumulate quality rounds or reps for the full block without rushing sloppy work.',
    details: 'AMRAP is about sustainable output, not panic pacing. Keep every round repeatable so your technique stays clean deep into the block.',
    loggingInstruction: null,
    example: null,
  },
  tabata: {
    summary: 'Hit short hard bursts, then recover quickly and stay sharp for the next one.',
    details: 'Tabata gives you very small work windows, so every rep needs intent. The short rest is there to challenge repeatability, not to encourage sloppy work.',
    loggingInstruction: null,
    example: null,
  },
  timed_sets: {
    summary: 'Work for the full interval, then recover exactly as prescribed.',
    details: 'Timed sets teach you to hold output for the whole work window. The goal is steady quality from the first second to the last.',
    loggingInstruction: null,
    example: null,
  },
  for_time: {
    summary: 'Move through the full task quickly, but keep technique in control.',
    details: 'For-time work adds urgency, but the fastest path is still clean movement. Breaking down or rushing sloppy reps usually slows you down.',
    loggingInstruction: null,
    example: null,
  },
  circuit_rounds: {
    summary: 'Cycle through each movement, then take the planned rest before the next round.',
    details: 'Circuits spread fatigue across different movements so you can keep moving. The goal is smooth round-to-round consistency, not chaos.',
    loggingInstruction: null,
    example: null,
  },
};

const SECTION_TEMPLATE_META: Record<WorkoutSectionTemplate, LabelMeta> = {
  activation: { label: 'Activation' },
  power: { label: 'Power' },
  main_strength: { label: 'Main Strength' },
  secondary_strength: { label: 'Secondary Strength' },
  accessory: { label: 'Accessory' },
  durability: { label: 'Durability' },
  finisher: { label: 'Finisher' },
  cooldown: { label: 'Cooldown' },
};

const EXERCISE_ROLE_META: Record<ExerciseRole, LabelMeta> = {
  prep: { label: 'Prep' },
  explosive: { label: 'Explosive' },
  anchor: { label: 'Anchor' },
  secondary: { label: 'Secondary' },
  accessory: { label: 'Accessory' },
  durability: { label: 'Durability' },
  finisher: { label: 'Finisher' },
  recovery: { label: 'Recovery' },
};

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  practice: 'Practice',
  sparring: 'Sparring',
  conditioning: 'Conditioning',
  recovery: 'Recovery',
};

const PRIMARY_ADAPTATION_LABELS: Record<string, string> = {
  strength: 'Strength',
  power: 'Power',
  conditioning: 'Conditioning',
  recovery: 'Recovery',
  mixed: 'Mixed',
};

const FOCUS_LABELS: Record<WorkoutFocus | 'strength', string> = {
  upper_push: 'Upper Push',
  upper_pull: 'Upper Pull',
  lower: 'Lower',
  full_body: 'Full Body',
  sport_specific: 'Sport Specific',
  recovery: 'Recovery',
  conditioning: 'Conditioning',
  strength: 'Strength',
};

const CAMP_PHASE_LABELS: Record<string, string> = {
  'camp-base': 'Base',
  'camp-build': 'Build',
  'camp-peak': 'Peak',
  'camp-taper': 'Taper',
  'fight-camp': 'Fight Camp',
  'off-season': 'Off-Season',
  'pre-camp': 'Pre-Camp',
};

export type ExerciseCardDisplayMeta = {
  strategyLabel: string | null;
  howItWorksLabel: string | null;
  howItWorksSummary: string | null;
  howItWorksDetails: string | null;
  howItWorksLoggingInstruction: string | null;
  howItWorksExample: string | null;
  focusCueLabel: string | null;
  focusCue: string | null;
};

type SetTargetLike = Pick<ExerciseSetPrescription, 'sets' | 'reps' | 'targetRPE'>;

type LoadingStrategyEducationInput = {
  strategy: LoadingStrategy | null | undefined;
  loadingNotes?: string | null;
  setPrescriptions?: SetTargetLike[] | null;
  currentWeight?: number | null;
  formatWeight?: ((value: number) => string) | null;
};

export function formatDisplayLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getLoadingStrategyMeta(strategy: LoadingStrategy | null | undefined): LabelMeta | null {
  if (!strategy) return null;
  return LOADING_STRATEGY_LABELS[strategy] ?? { label: formatDisplayLabel(strategy) };
}

function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function formatWeightValue(
  value: number,
  formatWeight?: ((weight: number) => string) | null,
): string {
  if (formatWeight) return `${formatWeight(value)} lb`;
  return `${value % 1 === 0 ? String(value) : value.toFixed(1)} lb`;
}

function formatBackoffWeightExample(
  currentWeight: number | null | undefined,
  formatWeight?: ((weight: number) => string) | null,
): string | null {
  if (currentWeight == null || !Number.isFinite(currentWeight) || currentWeight <= 0) {
    return null;
  }

  const lowerBound = roundToNearestHalf(currentWeight * 0.9);
  const upperBound = roundToNearestHalf(currentWeight * 0.94);
  const formattedLower = formatWeight ? formatWeight(lowerBound) : (lowerBound % 1 === 0 ? String(lowerBound) : lowerBound.toFixed(1));
  const formattedUpper = formatWeight ? formatWeight(upperBound) : (upperBound % 1 === 0 ? String(upperBound) : upperBound.toFixed(1));
  return `If your top set is ${formatWeightValue(currentWeight, formatWeight)}, your backoff sets should usually be about ${formattedLower}-${formattedUpper} lb.`;
}

export function getLoadingStrategyEducation(input: LoadingStrategyEducationInput): LoadingStrategyEducation | null {
  if (!input.strategy) return null;

  if (input.strategy === 'top_set_backoff') {
    const [topSet, backoff] = input.setPrescriptions ?? [];
    const details = topSet && backoff
      ? [
          `1. Build to your top set: ${formatSetPrescriptionTarget(topSet)}.`,
          '2. Log that set at the weight you actually used.',
          `3. Drop the weight 6-10% for your backoff work: ${formatSetPrescriptionTarget(backoff)}.`,
          '4. Log each backoff set at the lighter weight you actually used.',
        ].join('\n')
      : 'Build to your top set first, then lower the weight 6-10% for the backoff work.';

    return {
      ...LOADING_STRATEGY_EDUCATION.top_set_backoff,
      details,
      loggingInstruction: 'What to log: save the real weight, reps, and RPE you used for the top set, then the lighter backoff sets you actually performed.',
      example: formatBackoffWeightExample(input.currentWeight, input.formatWeight),
    };
  }

  const education = LOADING_STRATEGY_EDUCATION[input.strategy];
  if (education) return education;
  if (!input.loadingNotes) return null;

  return {
    summary: input.loadingNotes,
    details: input.loadingNotes,
    loggingInstruction: null,
    example: null,
  };
}

export function getSectionTemplateMeta(template: WorkoutSectionTemplate | null | undefined): LabelMeta | null {
  if (!template) return null;
  return SECTION_TEMPLATE_META[template] ?? { label: formatDisplayLabel(template) };
}

export function getExerciseRoleMeta(role: ExerciseRole | null | undefined): LabelMeta | null {
  if (!role) return null;
  return EXERCISE_ROLE_META[role] ?? { label: formatDisplayLabel(role) };
}

export function getWorkoutTypeLabel(workoutType: WorkoutType | null | undefined): string {
  if (!workoutType) return '';
  return WORKOUT_TYPE_LABELS[workoutType] ?? formatDisplayLabel(workoutType);
}

export function getPrimaryAdaptationLabel(primaryAdaptation: string | null | undefined): string {
  if (!primaryAdaptation) return '';
  return PRIMARY_ADAPTATION_LABELS[primaryAdaptation] ?? formatDisplayLabel(primaryAdaptation);
}

export function getFocusLabel(focus: WorkoutFocus | 'strength' | null | undefined): string {
  if (!focus) return '';
  return FOCUS_LABELS[focus] ?? formatDisplayLabel(focus);
}

export function getCampPhaseLabel(campPhase: string | null | undefined): string {
  if (!campPhase) return '';
  return CAMP_PHASE_LABELS[campPhase] ?? formatDisplayLabel(campPhase);
}

export function getExerciseCardDisplayMeta(input: {
  mode: WorkoutRenderMode;
  loadingStrategy: LoadingStrategy | null | undefined;
  loadingNotes: string | null | undefined;
  setPrescriptions: SetTargetLike[] | null | undefined;
  currentWeight?: number | null;
  formatWeight?: ((value: number) => string) | null;
  coachingCues: string[] | null | undefined;
}): ExerciseCardDisplayMeta {
  const strategyMeta = getLoadingStrategyMeta(input.loadingStrategy);
  const education = input.mode === 'interactive'
    ? getLoadingStrategyEducation({
        strategy: input.loadingStrategy,
        loadingNotes: input.loadingNotes,
        setPrescriptions: input.setPrescriptions,
        currentWeight: input.currentWeight,
        formatWeight: input.formatWeight,
      })
    : null;

  return {
    strategyLabel: strategyMeta?.label ?? null,
    howItWorksLabel: education ? 'How this works' : null,
    howItWorksSummary: education?.summary ?? null,
    howItWorksDetails: education?.details ?? null,
    howItWorksLoggingInstruction: education?.loggingInstruction ?? null,
    howItWorksExample: education?.example ?? null,
    focusCueLabel: (input.coachingCues?.length ?? 0) > 0 ? 'Focus cue' : null,
    focusCue: input.coachingCues?.[0] ?? null,
  };
}

export function formatSetPrescriptionTarget(entry: SetTargetLike): string {
  return `${entry.sets} x ${entry.reps} @ RPE ${entry.targetRPE}`;
}

export function getLoadingStrategyActionHint(input: {
  loadingStrategy: LoadingStrategy | null | undefined;
  setPrescriptions: SetTargetLike[] | null | undefined;
  workingSetsLogged: number;
}): string | null {
  const { loadingStrategy, setPrescriptions, workingSetsLogged } = input;

  if (loadingStrategy !== 'top_set_backoff' || !setPrescriptions || setPrescriptions.length < 2) {
    return null;
  }

  const [topSet, backoff] = setPrescriptions;
  if (workingSetsLogged <= 0) {
    return `Now: log your top set at the weight you reach for ${formatSetPrescriptionTarget(topSet)}.`;
  }

  return `Now: lower the weight 6-10% and log ${formatSetPrescriptionTarget(backoff)}.`;
}
