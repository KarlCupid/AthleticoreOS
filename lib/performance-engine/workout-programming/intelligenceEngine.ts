import { workoutProgrammingCatalog } from './seedData.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import {
  generateSingleSessionWorkout,
  validateGeneratedWorkout,
} from './workoutProgrammingEngine.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import { createWorkoutValidationResult, workoutValidationRuleIds } from './validationEngine.ts';
import type {
  Exercise,
  ExerciseSubstitutionOption,
  GeneratedExercisePrescription,
  GeneratedWorkout,
  PersonalizedWorkoutInput,
  SubstitutionRule,
  WorkoutIntelligenceCatalog,
  WorkoutExperienceLevel,
  WorkoutProgrammingCatalog,
  WorkoutSafetyFlag,
  WorkoutValidationResult,
} from './types.ts';

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function flagIds(flags: WorkoutSafetyFlag[]): string[] {
  return flags.map((flag) => flag.id);
}

const descriptionToneVariants = new Set([
  'beginner_friendly',
  'coach_like',
  'clinical',
  'motivational',
  'minimal',
  'detailed',
  'athletic',
  'rehab_informed',
  'data_driven',
]);

const genericDescriptionFragments = [
  'adjust as needed',
  'do what feels right',
  'listen to your body',
  'workout summary',
  'summary template',
];

export function resolveSafetyFlags(
  input: PersonalizedWorkoutInput,
  intelligence: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): WorkoutSafetyFlag[] {
  const explicit = new Set([...(input.safetyFlags ?? []), ...(input.painFlags ?? [])]);
  if (input.readinessBand === 'red' || input.readinessBand === 'orange') explicit.add('poor_readiness');
  if (input.readinessBand === 'unknown' || !input.readinessBand) explicit.add('unknown_readiness');
  if (input.equipmentIds.length <= 1) explicit.add('equipment_limited');
  if (input.durationMinutes < 25) explicit.add('time_limited');

  return intelligence.safetyFlags.filter((flag) => explicit.has(flag.id));
}

export function validateWorkoutIntelligenceCatalog(
  catalog: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): WorkoutValidationResult {
  const errors: string[] = [];
  if (catalog.progressionRules.length < 20) errors.push('Expected at least 20 progression rules.');
  if (catalog.regressionRules.length < 20) errors.push('Expected at least 20 regression rules.');
  if (catalog.deloadRules.length < 10) errors.push('Expected at least 10 deload rules.');
  if (catalog.substitutionRules.length < 25) errors.push('Expected at least 25 substitution rules.');
  if (catalog.safetyFlags.length < 25) errors.push('Expected at least 25 safety flags.');
  if (catalog.coachingCueSets.length < 25) errors.push('Expected at least 25 coaching cue sets.');
  if (catalog.commonMistakeSets.length < 25) errors.push('Expected at least 25 common mistake sets.');
  if (catalog.descriptionTemplates.length < 20) errors.push('Expected at least 20 description templates.');
  if (catalog.validationRules.length < 25) errors.push('Expected 25 domain validation rules from QA spec.');
  const validationRuleIds = new Set(catalog.validationRules.map((rule) => rule.id));
  for (const ruleId of workoutValidationRuleIds()) {
    if (!validationRuleIds.has(ruleId)) errors.push(`Missing domain validation rule ${ruleId}.`);
  }

  for (const template of catalog.descriptionTemplates) {
    const templateId = template.descriptionTemplateId ?? template.id;
    const textFields = [
      template.summaryTemplate,
      template.sessionIntent,
      template.plainLanguageSummary,
      template.coachExplanation,
      template.effortExplanation,
      template.whyThisMatters,
      template.howItShouldFeel,
      template.scalingDown,
      template.scalingUp,
      template.breathingFocus,
      template.recoveryExpectation,
      template.completionMessage,
      template.nextSessionNote,
    ];
    const joined = [
      ...textFields.filter((value): value is string => Boolean(value)),
      ...(template.successCriteria ?? []),
      ...(template.formFocus ?? []),
      ...(template.commonMistakes ?? []),
      ...(template.safetyNotes ?? []),
    ].join(' ').toLowerCase();

    if (!template.descriptionTemplateId) errors.push(`${template.id} is missing descriptionTemplateId.`);
    if (!template.appliesToEntityType || !template.appliesToEntityId) errors.push(`${templateId} is missing entity scope.`);
    if (!template.toneVariant || !descriptionToneVariants.has(template.toneVariant)) errors.push(`${templateId} has unsupported tone variant.`);
    if (textFields.some((value) => !value?.trim())) errors.push(`${templateId} is missing full coaching language.`);
    if ((template.successCriteria?.length ?? 0) < 3) errors.push(`${templateId} needs at least three success criteria.`);
    if ((template.formFocus?.length ?? 0) < 2) errors.push(`${templateId} needs specific form focus cues.`);
    if ((template.safetyNotes?.length ?? 0) === 0) errors.push(`${templateId} needs safety notes.`);
    if (genericDescriptionFragments.some((fragment) => joined.includes(fragment))) errors.push(`${templateId} contains generic description language.`);
  }
  return createWorkoutValidationResult({ errors, failedRuleIds: errors.length ? ['intelligence_catalog_integrity'] : [] });
}

function exerciseById(catalog: WorkoutProgrammingCatalog, id: string): Exercise | null {
  return catalog.exercises.find((exercise) => exercise.id === id) ?? null;
}

const experienceRank: Record<WorkoutExperienceLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const demandRank = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  axial: 3,
  shear: 3,
  light: 1,
  heavy: 3,
  maximal: 4,
  variable: 2,
} as const;

const impactRank: Record<Exercise['impact'], number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

function intersects(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
  if (!left?.length || !right?.length) return false;
  return left.some((item) => right.includes(item));
}

function overlapCount(left: readonly string[] | undefined, right: readonly string[] | undefined): number {
  if (!left?.length || !right?.length) return 0;
  return left.filter((item) => right.includes(item)).length;
}

function equipmentCompatible(candidate: Exercise, equipmentIds: string[], requiredEquipmentIds: string[] = []): boolean {
  const available = new Set(['bodyweight', ...equipmentIds]);
  if (requiredEquipmentIds.length > 0 && !requiredEquipmentIds.every((id) => available.has(id))) return false;
  const required = candidate.equipmentRequiredIds?.length ? candidate.equipmentRequiredIds : candidate.equipmentIds;
  if (required.includes('bodyweight')) return true;
  if (required.every((id) => available.has(id))) return true;
  return candidate.equipmentIds.some((id) => available.has(id) && id !== 'open_space' && id !== 'track_or_road');
}

function violatesHardConstraint(candidate: Exercise, safetyFlagIds: string[]): boolean {
  if (intersects(candidate.contraindicationFlags, safetyFlagIds)) return true;
  if (safetyFlagIds.includes('no_jumping') && candidate.movementPatternIds.includes('jump_land')) return true;
  if (safetyFlagIds.includes('no_running') && candidate.id.includes('run')) return true;
  if (safetyFlagIds.includes('no_overhead_pressing') && candidate.movementPatternIds.includes('vertical_push')) return true;
  if (safetyFlagIds.includes('no_floor_work') && candidate.setupType === 'floor') return true;
  if (safetyFlagIds.includes('limited_space') && candidate.spaceRequired?.some((space) => ['lane', 'open_space', 'outdoor'].includes(space))) return true;
  if (safetyFlagIds.includes('low_impact_required') && impactRank[candidate.impact] > 1) return true;
  return false;
}

function jointDemand(candidate: Exercise, flagId: string): number {
  if (flagId === 'knee_caution') return demandRank[candidate.kneeDemand ?? 'low'];
  if (flagId === 'back_caution') return demandRank[candidate.spineLoading ?? 'low'];
  if (flagId === 'shoulder_caution') return demandRank[candidate.shoulderDemand ?? 'low'];
  if (flagId === 'wrist_caution') return demandRank[candidate.wristDemand ?? 'low'];
  return 0;
}

function readinessSensitive(safetyFlagIds: string[]): boolean {
  return safetyFlagIds.some((flag) => ['poor_readiness', 'unknown_readiness', 'high_fatigue', 'low_energy', 'high_soreness', 'poor_sleep'].includes(flag));
}

function compatibilityRationale(parts: string[], fallback: string): string {
  const uniqueParts = unique(parts).filter(Boolean);
  return uniqueParts.length ? uniqueParts.join(' ') : fallback;
}

function candidatesFromRule(rule: SubstitutionRule): string[] {
  return rule.acceptableReplacementIds ?? rule.substituteExerciseIds ?? [];
}

function ruleApplies(rule: SubstitutionRule, source: Exercise, safetyFlagIds: string[], equipmentIds: string[]): boolean {
  if (rule.sourceExerciseId !== source.id) return false;
  const supported = rule.supportedSafetyFlags ?? rule.conditionFlags ?? [];
  if (supported.length > 0 && !intersects(supported, safetyFlagIds)) return false;
  if (rule.excludedSafetyFlags?.some((flag) => safetyFlagIds.includes(flag))) return false;
  if (rule.requiredEquipmentIds?.length && !rule.requiredEquipmentIds.every((id) => equipmentIds.includes(id))) return false;
  if (rule.excludedEquipmentIds?.some((id) => equipmentIds.includes(id))) return false;
  return true;
}

export function rankExerciseSubstitutions(input: {
  sourceExerciseId: string;
  movementPatternIds?: string[];
  primaryMuscleIds?: string[];
  workoutTypeId?: string;
  goalId?: string;
  equipmentIds: string[];
  safetyFlagIds?: string[];
  experienceLevel?: WorkoutExperienceLevel;
  dislikedExerciseIds?: string[];
  catalog?: WorkoutProgrammingCatalog;
  intelligence?: WorkoutIntelligenceCatalog;
  limit?: number;
}): ExerciseSubstitutionOption[] {
  const catalog = input.catalog ?? workoutProgrammingCatalog;
  const intelligence = input.intelligence ?? workoutIntelligenceCatalog;
  const source = exerciseById(catalog, input.sourceExerciseId);
  if (!source) return [];

  const safetyFlagIds = input.safetyFlagIds ?? [];
  const experienceLevel = input.experienceLevel ?? 'beginner';
  const disliked = new Set(input.dislikedExerciseIds ?? []);
  const activeRules = intelligence.substitutionRules.filter((rule) => ruleApplies(rule, source, safetyFlagIds, input.equipmentIds));
  const priorityByExercise = new Map<string, { rule: SubstitutionRule; priority: number }>();
  for (const rule of activeRules) {
    const priority = rule.replacementPriority ?? candidatesFromRule(rule);
    priority.forEach((exerciseId, index) => {
      const current = priorityByExercise.get(exerciseId);
      if (!current || index < current.priority) priorityByExercise.set(exerciseId, { rule, priority: index });
    });
    for (const exerciseId of candidatesFromRule(rule)) {
      if (!priorityByExercise.has(exerciseId)) priorityByExercise.set(exerciseId, { rule, priority: priority.length });
    }
  }

  const relationshipCandidates = [
    ...(source.substitutionExerciseIds ?? []),
    ...(source.regressionExerciseIds ?? []),
    ...(source.progressionExerciseIds ?? []),
  ];
  const broadCandidates = catalog.exercises
    .filter((candidate) => candidate.id !== source.id)
    .filter((candidate) => intersects(candidate.movementPatternIds, input.movementPatternIds ?? source.movementPatternIds)
      || intersects(candidate.primaryMuscleIds, input.primaryMuscleIds ?? source.primaryMuscleIds)
      || intersects(candidate.workoutTypeIds, [input.workoutTypeId ?? ''])
      || intersects(candidate.goalIds, [input.goalId ?? '']))
    .map((candidate) => candidate.id);

  const candidateIds = unique([
    ...Array.from(priorityByExercise.keys()),
    ...relationshipCandidates,
    ...broadCandidates,
  ]);

  const scored = candidateIds.map<ExerciseSubstitutionOption | null>((candidateId) => {
    const candidate = exerciseById(catalog, candidateId);
    if (!candidate || candidate.id === source.id) return null;
    const ruleMatch = priorityByExercise.get(candidate.id);
    const activeRule = ruleMatch?.rule;
    if (disliked.has(candidate.id)) return null;
    if (!equipmentCompatible(candidate, input.equipmentIds, activeRule?.requiredEquipmentIds)) return null;
    if (violatesHardConstraint(candidate, safetyFlagIds)) return null;
    if ((activeRule?.excludedEquipmentIds ?? []).some((id) => candidate.equipmentIds.includes(id))) return null;
    if (activeRule?.skillLevelMatch === 'same' && candidate.minExperience !== source.minExperience) return null;
    if ((activeRule?.skillLevelMatch ?? 'same_or_lower') === 'same_or_lower' && experienceRank[candidate.minExperience] > experienceRank[experienceLevel]) return null;

    let score = 0;
    const rationaleParts: string[] = [];

    const patternOverlap = overlapCount(candidate.movementPatternIds, input.movementPatternIds ?? source.movementPatternIds);
    if (patternOverlap > 0) {
      score += 35 + patternOverlap * 4;
      rationaleParts.push(`Preserves the ${candidate.movementPatternIds.find((id) => source.movementPatternIds.includes(id)) ?? 'same'} movement intent.`);
    }

    const muscleOverlap = overlapCount(candidate.primaryMuscleIds, input.primaryMuscleIds ?? source.primaryMuscleIds);
    if (muscleOverlap > 0) {
      score += 18 + muscleOverlap * 4;
      rationaleParts.push('Keeps the main tissue target similar.');
    }

    score += 18;
    if (candidate.equipmentRequiredIds?.includes('bodyweight')) score += 2;
    if (activeRule) {
      score += 22;
      score += Math.max(0, 16 - (ruleMatch?.priority ?? 10) * 4);
      rationaleParts.push(activeRule.reason ?? activeRule.rationale ?? 'Matches an authored substitution rule.');
    }

    if (experienceRank[candidate.minExperience] <= experienceRank[experienceLevel]) score += 10;
    if (candidate.minExperience === 'beginner' && experienceLevel === 'beginner') score += 6;

    if (input.workoutTypeId && candidate.workoutTypeIds.includes(input.workoutTypeId)) {
      score += 12;
      rationaleParts.push('Stays inside the same workout type.');
    }
    if (input.goalId && candidate.goalIds.includes(input.goalId)) {
      score += 10;
      rationaleParts.push('Supports the same training goal.');
    }

    if (candidate.loadability === source.loadability) score += 7;
    if (source.loadability && candidate.loadability && demandRank[candidate.loadability] < demandRank[source.loadability]) score += safetyFlagIds.length ? 5 : 0;

    for (const flagId of safetyFlagIds) {
      const sourceDemand = jointDemand(source, flagId);
      const candidateDemand = jointDemand(candidate, flagId);
      if (sourceDemand > 0 && candidateDemand < sourceDemand) {
        score += 14 + (sourceDemand - candidateDemand) * 3;
        rationaleParts.push(`Reduces ${flagId.replace('_caution', '')} demand for the active caution.`);
      } else if (candidateDemand > sourceDemand && sourceDemand > 0) {
        score -= 10;
      }
    }

    if (readinessSensitive(safetyFlagIds)) {
      if (candidate.technicalComplexity === 'low') score += 12;
      if (candidate.fatigueCost === 'low') score += 10;
      if (candidate.fatigueCost === 'high') score -= 14;
      rationaleParts.push('Uses a lower-complexity option for today readiness.');
    }

    if (safetyFlagIds.includes('no_jumping') || safetyFlagIds.includes('low_impact_required')) {
      if (impactRank[candidate.impact] < impactRank[source.impact]) {
        score += 12;
        rationaleParts.push('Lowers impact while keeping the session moving.');
      }
    }

    const option: ExerciseSubstitutionOption = {
      exerciseId: candidate.id,
      name: candidate.name,
      rationale: compatibilityRationale(rationaleParts, 'Keeps the training intent with available equipment and safer constraints.'),
      score,
    };
    if (activeRule?.id) option.matchedRuleId = activeRule.id;
    if (activeRule?.prescriptionAdjustment) option.prescriptionAdjustment = activeRule.prescriptionAdjustment;
    if (activeRule?.coachingNote) option.coachingNote = activeRule.coachingNote;
    return option;
  }).filter((candidate): candidate is ExerciseSubstitutionOption => candidate !== null);

  return scored
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
    .slice(0, input.limit ?? 3);
}

function substitutionsFor(
  exercise: GeneratedExercisePrescription,
  workout: GeneratedWorkout,
  input: PersonalizedWorkoutInput,
  safetyFlagIds: string[],
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
): ExerciseSubstitutionOption[] {
  return rankExerciseSubstitutions({
    sourceExerciseId: exercise.exerciseId,
    movementPatternIds: exercise.movementPatternIds,
    primaryMuscleIds: exercise.primaryMuscleIds,
    workoutTypeId: workout.workoutTypeId,
    goalId: workout.goalId,
    equipmentIds: input.equipmentIds,
    safetyFlagIds,
    experienceLevel: input.experienceLevel,
    catalog,
    intelligence,
    limit: 3,
    ...(input.dislikedExerciseIds ? { dislikedExerciseIds: input.dislikedExerciseIds } : {}),
  });
}

function scaleExercise(
  exercise: GeneratedExercisePrescription,
  direction: 'down' | 'up',
): GeneratedExercisePrescription {
  const sets = exercise.prescription.sets;
  const durationMinutes = exercise.prescription.durationMinutes;
  const durationSeconds = exercise.prescription.durationSeconds;
  return {
    ...exercise,
    prescription: {
      ...exercise.prescription,
      sets: sets == null ? sets : Math.max(1, sets + (direction === 'down' ? -1 : 1)),
      durationMinutes: durationMinutes == null ? durationMinutes : Math.max(3, durationMinutes + (direction === 'down' ? -5 : 5)),
      durationSeconds: durationSeconds == null ? durationSeconds : Math.max(20, durationSeconds + (direction === 'down' ? -10 : 10)),
      targetRpe: Math.min(8, Math.max(1, exercise.prescription.targetRpe + (direction === 'down' ? -1 : 1))),
    },
  };
}

function enrichWorkout(
  workout: GeneratedWorkout,
  input: PersonalizedWorkoutInput,
  safetyFlagIds: string[],
  catalog: WorkoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog,
): GeneratedWorkout {
  const disliked = new Set(input.dislikedExerciseIds ?? []);
  const blocks = workout.blocks.map((block) => ({
    ...block,
    exercises: block.exercises
      .filter((exercise) => !disliked.has(exercise.exerciseId))
      .map((exercise) => {
        const cues = intelligence.coachingCueSets.find((set) => set.exerciseId === exercise.exerciseId)?.cues ?? [];
        const mistakes = intelligence.commonMistakeSets.find((set) => set.exerciseId === exercise.exerciseId)?.mistakes ?? [];
        const shouldScaleDown = safetyFlagIds.includes('poor_readiness')
          || safetyFlagIds.includes('unknown_readiness')
          || safetyFlagIds.includes('pain_increased_last_session');
        const scaled = shouldScaleDown ? scaleExercise(exercise, 'down') : exercise;
        return {
          ...scaled,
          substitutions: substitutionsFor(scaled, workout, input, safetyFlagIds, catalog, intelligence),
          scalingOptions: {
            down: 'Reduce one set or five minutes and lower target RPE by one.',
            up: 'Add one set or five minutes only if pain is stable and RPE was below target.',
          },
          coachingCues: cues,
          commonMistakes: mistakes,
        };
      }),
  }));

  return {
    ...workout,
    blocks,
    safetyFlags: unique([...workout.safetyFlags, ...safetyFlagIds]),
    explanations: [
      ...workout.explanations,
      safetyFlagIds.includes('poor_readiness')
        ? 'Poor readiness capped intensity and volume before exercise selection was accepted.'
        : 'Readiness did not require a hard block, but missing data remains treated conservatively.',
      'Each exercise includes scaling and substitution options for real-world adjustment.',
    ],
  };
}

export function generatePersonalizedWorkout(
  input: PersonalizedWorkoutInput,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
  intelligence: WorkoutIntelligenceCatalog = workoutIntelligenceCatalog,
): GeneratedWorkout {
  const resolvedSafety = resolveSafetyFlags(input, intelligence);
  const blocking = resolvedSafety.find((flag) => flag.severity === 'block');
  if (blocking) {
    const blockedWorkout: GeneratedWorkout = {
      schemaVersion: 'generated-workout-v1',
      workoutTypeId: 'recovery',
      goalId: input.goalId,
      templateId: 'blocked_by_safety',
      formatId: 'checklist',
      experienceLevel: input.experienceLevel,
      requestedDurationMinutes: input.durationMinutes,
      estimatedDurationMinutes: 0,
      equipmentIds: [],
      safetyFlags: flagIds(resolvedSafety),
      blocks: [],
      trackingMetricIds: ['pain_score_before', 'pain_score_after', 'notes'],
      successCriteria: ['Do not train hard until the blocking safety flag is resolved.'],
      explanations: [`Workout generation was blocked by ${blocking.label}. Safety wins over performance goals.`],
      blocked: true,
      validationWarnings: [`Blocked by ${blocking.id}.`],
    };
    const description = generateWorkoutDescription(blockedWorkout, {
      descriptionTemplateId: 'description_readiness_adjusted',
      templates: intelligence.descriptionTemplates,
      toneVariant: 'clinical',
    });
    return {
      ...blockedWorkout,
      sessionIntent: description.sessionIntent,
      userFacingSummary: description.plainLanguageSummary,
      description,
      coachingNotes: [description.coachExplanation, description.effortExplanation],
      safetyNotes: description.safetyNotes,
    };
  }

  const safetyFlagIds = unique([
    ...(input.safetyFlags ?? []),
    ...flagIds(resolvedSafety),
    ...resolvedSafety.flatMap((flag) => flag.contraindicationTags),
  ]);
  const base = generateSingleSessionWorkout({
    ...input,
    durationMinutes: input.preferredDurationMinutes ?? input.durationMinutes,
    safetyFlags: safetyFlagIds,
  }, catalog);
  const enriched = enrichWorkout(base, input, safetyFlagIds, catalog, intelligence);
  const validation = validateGeneratedWorkout(enriched, catalog);
  if (!validation.isValid) {
    throw new Error(`Personalized workout failed domain validation: ${validation.errors.join(' | ')}`);
  }
  return {
    ...enriched,
    validationWarnings: validation.warnings,
    validationErrors: validation.errors,
  };
}

export function validatePersonalizedWorkoutSafety(
  workout: GeneratedWorkout,
  catalog: WorkoutProgrammingCatalog = workoutProgrammingCatalog,
): WorkoutValidationResult {
  if (workout.blocked) return createWorkoutValidationResult();
  const errors = validateGeneratedWorkout(workout, catalog).errors;
  const selected = workout.blocks.flatMap((block) => block.exercises);
  for (const exercise of selected) {
    const source = exerciseById(catalog, exercise.exerciseId);
    if (!source) continue;
    const contraindicated = source.contraindicationFlags.filter((flag) => workout.safetyFlags.includes(flag));
    if (contraindicated.length > 0) {
      errors.push(`${source.name} violates safety flags: ${contraindicated.join(', ')}.`);
    }
  }
  return createWorkoutValidationResult({
    errors,
    failedRuleIds: errors.length ? ['personalized_safety_compatibility'] : [],
  });
}
