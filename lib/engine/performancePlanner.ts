import type {
  CampPhase,
  PerformanceGoalType,
  PerformanceRiskState,
  ReadinessProfile,
  ReadinessState,
  StimulusConstraintSet,
  TrainingBlockContext,
  WorkoutFocus,
} from './types.ts';
import { deriveStimulusConstraintSet } from './readiness/profile.ts';

interface PerformanceRiskInput {
  readinessState: ReadinessState;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  acwr: number;
  isDeloadWeek?: boolean;
  trainingIntensityCap?: number | null;
  isSparringDay?: boolean;
  campPhase?: CampPhase | null;
  goalMode?: 'build_phase' | 'fight_camp';
  daysOut?: number | null;
  hasTechnicalSession?: boolean;
}

interface TrainingBlockInput {
  performanceGoalType: PerformanceGoalType;
  campPhase?: CampPhase | null;
  weeksSinceLastDeload?: number;
  isDeloadWeek?: boolean;
}

const GOAL_ROTATIONS: Record<PerformanceGoalType, Record<number, WorkoutFocus[]>> = {
  strength: {
    3: ['lower', 'upper_push', 'upper_pull'],
    4: ['lower', 'upper_push', 'upper_pull', 'full_body'],
    5: ['lower', 'upper_push', 'upper_pull', 'lower', 'full_body'],
    6: ['lower', 'upper_push', 'upper_pull', 'conditioning', 'lower', 'full_body'],
  },
  conditioning: {
    3: ['conditioning', 'lower', 'upper_pull'],
    4: ['conditioning', 'lower', 'upper_pull', 'full_body'],
    5: ['conditioning', 'lower', 'upper_pull', 'full_body', 'upper_push'],
    6: ['conditioning', 'lower', 'upper_pull', 'conditioning', 'full_body', 'upper_push'],
  },
  boxing_skill: {
    3: ['lower', 'upper_pull', 'upper_push'],
    4: ['lower', 'upper_pull', 'upper_push', 'full_body'],
    5: ['lower', 'upper_pull', 'upper_push', 'full_body', 'conditioning'],
    6: ['lower', 'upper_pull', 'upper_push', 'conditioning', 'full_body', 'lower'],
  },
  weight_class_prep: {
    3: ['full_body', 'conditioning', 'upper_pull'],
    4: ['full_body', 'conditioning', 'upper_pull', 'lower'],
    5: ['full_body', 'conditioning', 'upper_pull', 'lower', 'upper_push'],
    6: ['full_body', 'conditioning', 'upper_pull', 'lower', 'upper_push', 'full_body'],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function assessPerformanceRisk(input: PerformanceRiskInput): PerformanceRiskState {
  const {
    readinessState,
    readinessProfile = null,
    constraintSet = null,
    acwr,
    isDeloadWeek = false,
    trainingIntensityCap = null,
    isSparringDay = false,
    campPhase = null,
    goalMode = 'build_phase',
    daysOut = null,
    hasTechnicalSession = false,
  } = input;

  const resolvedConstraintSet = constraintSet ?? deriveStimulusConstraintSet(
    readinessProfile ?? {
      neuralReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 62 : 34,
      structuralReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 60 : 38,
      metabolicReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 58 : 36,
      overallReadiness: readinessState === 'Prime' ? 82 : readinessState === 'Caution' ? 60 : 36,
      trend: 'stable',
      dataConfidence: 'low',
      dataSufficiency: 'insufficient',
      cardioModifier: 1,
      proteinModifier: 1,
      flags: [],
      performanceAnchors: [],
      readinessState,
    },
    {
      phase: campPhase ? (`camp-${campPhase}` as const) : undefined,
      goalMode,
      daysOut,
      isSparringDay,
      hasTechnicalSession,
      isDeloadWeek,
      trainingIntensityCap,
    },
  );

  let severity = 0;
  const reasons: string[] = [];
  let requiresSubstitution = false;
  const useConstraintCap = constraintSet != null || readinessProfile != null;

  if (isDeloadWeek) {
    severity = Math.max(severity, 1);
    reasons.push('deload week is active');
  }

  if (readinessState === 'Caution') {
    severity = Math.max(severity, 1);
    reasons.push('readiness is caution');
  } else if (readinessState === 'Depleted') {
    severity = Math.max(severity, 2);
    reasons.push('readiness is depleted');
  }

  if (acwr >= 1.55) {
    severity = 3;
    reasons.push(`acute load is redlining (${acwr.toFixed(2)})`);
  } else if (acwr >= 1.42) {
    severity = Math.max(severity, 2);
    reasons.push(`acute load is elevated (${acwr.toFixed(2)})`);
  } else if (acwr >= 1.28) {
    severity = Math.max(severity, 1);
    reasons.push(`acute load is trending high (${acwr.toFixed(2)})`);
  }

  if (trainingIntensityCap != null) {
    if (trainingIntensityCap <= 4) {
      severity = 3;
      reasons.push(`body-mass safety cap is restrictive (${trainingIntensityCap}/10)`);
    } else if (trainingIntensityCap <= 6) {
      severity = Math.max(severity, 2);
      reasons.push(`body-mass safety cap is active (${trainingIntensityCap}/10)`);
    } else if (trainingIntensityCap <= 8) {
      severity = Math.max(severity, 1);
      reasons.push(`body-mass safety cap is shaping the day (${trainingIntensityCap}/10)`);
    }
  }

  if (isSparringDay && severity < 3) {
    severity = Math.max(severity, 1);
    reasons.push('sparring requires low-cost support work');
  }

  if (resolvedConstraintSet.blockedStimuli.length > 0) {
    requiresSubstitution = true;
    severity = Math.max(
      severity,
      useConstraintCap && resolvedConstraintSet.blockedStimuli.includes('hard_sparring') ? 2 : 1,
    );
    reasons.push(`stimulus substitution is active (${resolvedConstraintSet.blockedStimuli.join(', ')})`);
  }

  if ((readinessProfile?.flags ?? []).some((flag) => flag.level === 'red')) {
    severity = Math.max(severity, 3);
    reasons.push('red readiness flag is active');
  } else if ((readinessProfile?.flags ?? []).some((flag) => flag.level === 'yellow')) {
    severity = Math.max(severity, 1);
    reasons.push('yellow readiness flag is active');
  }

  if (severity <= 0) {
    return {
      level: 'green',
      intensityCap: useConstraintCap ? (resolvedConstraintSet.hardCaps.intensityCap ?? 9) : 9,
      volumeMultiplier: 1,
      cnsMultiplier: 1,
      allowHighImpact: resolvedConstraintSet.hardCaps.allowImpact,
      reasons: ['full performance window'],
      readinessProfile,
      constraintSet: resolvedConstraintSet,
      requiresSubstitution,
      protectMode: false,
    };
  }

  if (severity === 1) {
    return {
      level: 'yellow',
      intensityCap: useConstraintCap
        ? clamp(resolvedConstraintSet.hardCaps.intensityCap ?? trainingIntensityCap ?? 7, 5, 7)
        : clamp(trainingIntensityCap ?? 7, 6, 7),
      volumeMultiplier: 0.9,
      cnsMultiplier: 0.9,
      allowHighImpact: resolvedConstraintSet.hardCaps.allowImpact,
      reasons,
      readinessProfile,
      constraintSet: resolvedConstraintSet,
      requiresSubstitution: true,
      protectMode: false,
    };
  }

  if (severity === 2) {
    return {
      level: 'orange',
      intensityCap: useConstraintCap
        ? clamp(resolvedConstraintSet.hardCaps.intensityCap ?? trainingIntensityCap ?? 6, 4, 6)
        : clamp(trainingIntensityCap ?? 6, 5, 6),
      volumeMultiplier: 0.82,
      cnsMultiplier: 0.82,
      allowHighImpact: resolvedConstraintSet.hardCaps.allowImpact,
      reasons,
      readinessProfile,
      constraintSet: resolvedConstraintSet,
      requiresSubstitution: true,
      protectMode: false,
    };
  }

  return {
    level: 'red',
    intensityCap: useConstraintCap
      ? clamp(resolvedConstraintSet.hardCaps.intensityCap ?? trainingIntensityCap ?? 4, 2, 4)
      : clamp(trainingIntensityCap ?? 4, 2, 4),
    volumeMultiplier: 0.65,
    cnsMultiplier: 0.6,
    allowHighImpact: false,
    reasons,
    readinessProfile,
    constraintSet: resolvedConstraintSet,
    requiresSubstitution: true,
    protectMode: true,
  };
}

export function resolveTrainingBlockContext(input: TrainingBlockInput): TrainingBlockContext {
  const {
    performanceGoalType,
    campPhase = null,
    weeksSinceLastDeload = 0,
    isDeloadWeek = false,
  } = input;

  if (campPhase === 'taper' || isDeloadWeek) {
    return {
      weekInBlock: 4,
      phase: 'pivot',
      volumeMultiplier: 0.72,
      intensityOffset: -1,
      focusBias: performanceGoalType === 'weight_class_prep' ? 'recovery' : 'sport_specific',
      note: campPhase === 'taper'
        ? 'Taper week: keep output sharp, cut fatigue hard.'
        : 'Pivot week: consolidate progress and retest cleanly.',
    };
  }

  if (campPhase === 'peak') {
    return {
      weekInBlock: 3,
      phase: 'realize',
      volumeMultiplier: 0.88,
      intensityOffset: 1,
      focusBias: performanceGoalType === 'strength' ? 'full_body' : 'sport_specific',
      note: 'Peak week: maintain quality, express speed and power, avoid junk volume.',
    };
  }

  if (campPhase === 'build') {
    return {
      weekInBlock: 2,
      phase: 'intensify',
      volumeMultiplier: 1,
      intensityOffset: 1,
      focusBias: performanceGoalType === 'conditioning' ? 'conditioning' : 'full_body',
      note: 'Build week: push key adaptations without drifting past recoverable stress.',
    };
  }

  if (campPhase === 'base') {
    return {
      weekInBlock: 1,
      phase: 'accumulate',
      volumeMultiplier: 1.05,
      intensityOffset: 0,
      focusBias: performanceGoalType === 'conditioning' ? 'conditioning' : 'lower',
      note: 'Base week: accumulate quality volume and build work capacity.',
    };
  }

  const weekInBlock = (((weeksSinceLastDeload % 3) + 3) % 3) + 1;
  if (weekInBlock === 1) {
    return {
      weekInBlock: 1,
      phase: 'accumulate',
      volumeMultiplier: 0.96,
      intensityOffset: 0,
      focusBias: performanceGoalType === 'conditioning' ? 'conditioning' : 'lower',
      note: 'Block week 1: re-establish rhythm and accumulate clean volume.',
    };
  }

  if (weekInBlock === 2) {
    return {
      weekInBlock: 2,
      phase: 'intensify',
      volumeMultiplier: 1,
      intensityOffset: 1,
      focusBias: performanceGoalType === 'strength' ? 'lower' : null,
      note: 'Block week 2: add intensity to the highest-value sessions.',
    };
  }

  return {
    weekInBlock: 3,
    phase: 'realize',
    volumeMultiplier: 1.02,
    intensityOffset: 1,
    focusBias: performanceGoalType === 'weight_class_prep' ? 'conditioning' : 'full_body',
    note: 'Block week 3: express the block, then pivot before fatigue compounds.',
  };
}

export function getGoalBasedFocusRotation(input: {
  performanceGoalType: PerformanceGoalType;
  scDayCount: number;
  isDeloadWeek?: boolean;
  blockContext?: TrainingBlockContext | null;
}): WorkoutFocus[] {
  const { performanceGoalType, scDayCount, isDeloadWeek = false, blockContext = null } = input;

  if (isDeloadWeek) {
    return ['full_body', 'recovery', 'full_body'];
  }

  const rotation = GOAL_ROTATIONS[performanceGoalType][scDayCount]
    ?? GOAL_ROTATIONS[performanceGoalType][4];
  const result = [...rotation];

  if (blockContext?.phase === 'pivot' && result.length > 1) {
    result[result.length - 1] = 'recovery';
  }

  if (blockContext?.focusBias && result.length > 0 && !result.includes(blockContext.focusBias)) {
    result[0] = blockContext.focusBias;
  }

  return result;
}
