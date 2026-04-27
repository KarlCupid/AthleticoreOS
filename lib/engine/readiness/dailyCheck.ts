import type {
  PrimaryLimiter,
  ReadinessProfile,
  ReadinessState,
  StimulusConstraintSet,
  WorkoutPrescriptionV2,
  WorkoutSectionTemplate,
} from '../types.ts';

export type DailyPerformanceBand = 'Push' | 'Build' | 'Protect';

export interface DailyPerformanceCheckInput {
  sleepQuality: number;
  energyLevel: number;
  stressLevel: number;
  sorenessLevel: number;
  confidenceLevel: number;
  fuelHydrationStatus?: number | null;
  painLevel?: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampScale(value: number | null | undefined, fallback = 3): number {
  const safe = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return clamp(Math.round(safe), 1, 5);
}

function normalize1to5(value: number | null | undefined, fallback = 3): number {
  const safe = clampScale(value, fallback);
  return clamp(Math.round(((safe - 1) / 4) * 100), 0, 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function scaleToLegacyReadiness(score: number): number {
  if (score >= 82) return 5;
  if (score >= 68) return 4;
  if (score >= 46) return 3;
  if (score >= 28) return 2;
  return 1;
}

export function estimateDailyPerformanceReadinessScore(input: DailyPerformanceCheckInput): number {
  const sleep = normalize1to5(input.sleepQuality);
  const energy = normalize1to5(input.energyLevel);
  const confidence = normalize1to5(input.confidenceLevel);
  const stressReserve = 100 - normalize1to5(input.stressLevel);
  const sorenessReserve = 100 - normalize1to5(input.sorenessLevel);
  const fuel = input.fuelHydrationStatus == null ? null : normalize1to5(input.fuelHydrationStatus);
  const painReserve = input.painLevel == null ? 100 : 100 - normalize1to5(input.painLevel, 1);

  const neural = average([sleep, energy, confidence, stressReserve]);
  const structural = average([sorenessReserve, painReserve]);
  const metabolic = average(fuel == null ? [energy, sleep] : [energy, fuel, sleep]);
  let score = Math.round((neural * 0.4) + (structural * 0.3) + (metabolic * 0.3));

  if (input.sleepQuality <= 2) score = Math.min(score, 62);
  if (input.energyLevel <= 2) score = Math.min(score, 60);
  if (input.stressLevel >= 5) score = Math.min(score, 62);
  if (input.sorenessLevel >= 4) score = Math.min(score, 65);
  if (input.fuelHydrationStatus != null && input.fuelHydrationStatus <= 2) score = Math.min(score, 66);
  if ((input.painLevel ?? 1) >= 4) score = Math.min(score, 54);

  const hardLimiters = [
    input.sleepQuality <= 2,
    input.energyLevel <= 2,
    input.sorenessLevel >= 4,
    input.stressLevel >= 4,
    input.fuelHydrationStatus != null && input.fuelHydrationStatus <= 2,
    (input.painLevel ?? 1) >= 4,
  ].filter(Boolean).length;
  if (hardLimiters >= 3) score = Math.min(score, 44);

  return clamp(score, 8, 100);
}

export function deriveLegacyReadinessFromDailyCheck(input: DailyPerformanceCheckInput): number {
  return scaleToLegacyReadiness(estimateDailyPerformanceReadinessScore(input));
}

export function mapScoreToPerformanceBand(score: number): DailyPerformanceBand {
  if (score < 46) return 'Protect';
  if (score < 72) return 'Build';
  return 'Push';
}

export function mapReadinessStateToPerformanceBand(readinessState: ReadinessState): DailyPerformanceBand {
  if (readinessState === 'Depleted') return 'Protect';
  if (readinessState === 'Caution') return 'Build';
  return 'Push';
}

export function inferPrimaryLimiterFromDailyCheck(input: DailyPerformanceCheckInput): PrimaryLimiter {
  if (input.sleepQuality <= 2) return 'sleep';
  if (input.stressLevel >= 4) return 'stress';
  if (input.sorenessLevel >= 4 || (input.painLevel ?? 1) >= 4) return 'soreness';
  return 'none';
}

function formatSetScheme(exercise: WorkoutPrescriptionV2['exercises'][number]): string | undefined {
  if (!exercise.targetSets || !exercise.targetReps || !exercise.targetRPE) {
    return exercise.setScheme;
  }
  return `${exercise.targetSets} x ${exercise.targetReps} @ RPE ${exercise.targetRPE}`;
}

function templateShouldBeRemoved(
  template: WorkoutSectionTemplate | undefined,
  band: DailyPerformanceBand,
  constraintSet: StimulusConstraintSet,
): boolean {
  if (!template) return false;
  const blocked = constraintSet.blockedStimuli;

  if (band === 'Protect' && template === 'finisher') return true;
  if ((band === 'Protect' || blocked.includes('max_velocity') || blocked.includes('plyometric')) && template === 'power') {
    return true;
  }
  if ((blocked.includes('glycolytic_conditioning') || blocked.includes('tempo_conditioning')) && template === 'finisher') {
    return true;
  }

  return false;
}

function getAdjustedSetCount(
  targetSets: number,
  template: WorkoutSectionTemplate | undefined,
  band: DailyPerformanceBand,
): number {
  if (template === 'activation' || template === 'cooldown') return targetSets;
  if (band === 'Protect') return Math.max(1, Math.floor(targetSets * 0.7));
  if (band === 'Build' && ['secondary_strength', 'accessory', 'durability', 'finisher'].includes(template ?? '')) {
    return Math.max(1, targetSets - 1);
  }
  return targetSets;
}

function adaptExercise<T extends WorkoutPrescriptionV2['exercises'][number]>(
  exercise: T,
  band: DailyPerformanceBand,
  intensityCap: number,
): T {
  const targetSets = getAdjustedSetCount(exercise.targetSets, exercise.sectionTemplate, band);
  const targetRPE = Math.min(exercise.targetRPE, intensityCap);
  const weightScale = band === 'Protect'
    ? 0.9
    : band === 'Build' && targetRPE < exercise.targetRPE
      ? 0.95
      : 1;
  const suggestedWeight = typeof exercise.suggestedWeight === 'number'
    ? Math.round(exercise.suggestedWeight * weightScale)
    : exercise.suggestedWeight;
  const setPrescription = exercise.setPrescription?.map((entry) => ({
    ...entry,
    sets: getAdjustedSetCount(entry.sets, exercise.sectionTemplate, band),
    targetRPE: Math.min(entry.targetRPE, intensityCap),
  }));
  const next = {
    ...exercise,
    targetSets,
    targetRPE,
    suggestedWeight,
    setPrescription,
    loadingNotes: band === 'Push'
      ? exercise.loadingNotes
      : `${exercise.loadingNotes ? `${exercise.loadingNotes} ` : ''}Daily check: keep the work controlled today.`.trim(),
  };

  return {
    ...next,
    setScheme: formatSetScheme(next),
  } as T;
}

function flattenSections(sections: NonNullable<WorkoutPrescriptionV2['sections']>): WorkoutPrescriptionV2['exercises'] {
  return sections.flatMap((section) => section.exercises);
}

function maxExerciseRPE(exercises: WorkoutPrescriptionV2['exercises']): number {
  return exercises.reduce((max, exercise) => Math.max(max, exercise.targetRPE ?? 0), 0);
}

export function adaptPrescriptionToDailyReadiness(input: {
  prescription: WorkoutPrescriptionV2 | null;
  readinessProfile: ReadinessProfile;
  constraintSet: StimulusConstraintSet;
}): WorkoutPrescriptionV2 | null {
  const { prescription, readinessProfile, constraintSet } = input;
  if (!prescription) return null;

  const band = mapReadinessStateToPerformanceBand(readinessProfile.readinessState);
  const intensityCap = band === 'Protect'
    ? Math.min(5, constraintSet.hardCaps.intensityCap ?? 5)
    : band === 'Build'
      ? Math.min(7, constraintSet.hardCaps.intensityCap ?? 7)
      : constraintSet.hardCaps.intensityCap ?? 10;

  const sections = prescription.sections
    ?.map((section) => ({
      ...section,
      exercises: section.exercises
        .filter((exercise) => !templateShouldBeRemoved(exercise.sectionTemplate, band, constraintSet))
        .map((exercise) => adaptExercise(exercise, band, intensityCap)),
      decisionTrace: band === 'Push'
        ? section.decisionTrace
        : [...section.decisionTrace, `daily_check:${band.toLowerCase()}`],
    }))
    .filter((section) => section.exercises.length > 0);

  const sectionExercises = sections ? flattenSections(sections) : null;
  const exercises = sectionExercises ?? prescription.exercises
    .filter((exercise) => !templateShouldBeRemoved(exercise.sectionTemplate, band, constraintSet))
    .map((exercise) => adaptExercise(exercise, band, intensityCap));
  const safeExercises = exercises.length > 0
    ? exercises
    : prescription.exercises.map((exercise) => adaptExercise(exercise, band, intensityCap));

  const estimatedDurationMin = band === 'Protect'
    ? Math.max(10, Math.round(prescription.estimatedDurationMin * 0.72))
    : band === 'Build'
      ? Math.max(12, Math.round(prescription.estimatedDurationMin * 0.9))
      : prescription.estimatedDurationMin;
  const traceTag = `daily_check:${band.toLowerCase()}`;

  return {
    ...prescription,
    exercises: safeExercises,
    sections,
    estimatedDurationMin,
    readinessProfile,
    constraintSet,
    performanceRisk: prescription.performanceRisk
      ? {
          ...prescription.performanceRisk,
          intensityCap: Math.min(prescription.performanceRisk.intensityCap, intensityCap),
          volumeMultiplier: Math.min(prescription.performanceRisk.volumeMultiplier, constraintSet.volumeMultiplier),
          allowHighImpact: prescription.performanceRisk.allowHighImpact && constraintSet.hardCaps.allowImpact,
          protectMode: prescription.performanceRisk.protectMode || band === 'Protect',
          reasons: [...prescription.performanceRisk.reasons, `Daily check set session status to ${band}.`],
        }
      : {
          level: band === 'Protect' ? 'red' : band === 'Build' ? 'yellow' : 'green',
          intensityCap,
          volumeMultiplier: constraintSet.volumeMultiplier,
          cnsMultiplier: constraintSet.volumeMultiplier,
          allowHighImpact: constraintSet.hardCaps.allowImpact,
          reasons: [`Daily check set session status to ${band}.`],
          readinessProfile,
          constraintSet,
          protectMode: band === 'Protect',
        },
    safetyFlags: band === 'Push'
      ? prescription.safetyFlags
      : [
          ...(prescription.safetyFlags ?? []),
          {
            code: band === 'Protect' ? 'daily_check_protect' : 'daily_check_build',
            level: band === 'Protect' ? 'restricted' : 'caution',
            message: `Daily check set this session status to ${band}.`,
          },
        ],
    primaryAdaptation: band === 'Protect' ? 'recovery' : prescription.primaryAdaptation,
    message: `${prescription.message} Daily check status: ${band}.`,
    decisionTrace: prescription.decisionTrace.includes(traceTag)
      ? prescription.decisionTrace
      : [...prescription.decisionTrace, traceTag, `daily_check_intensity_cap:${intensityCap}`, `daily_check_max_rpe:${maxExerciseRPE(safeExercises)}`],
  };
}
