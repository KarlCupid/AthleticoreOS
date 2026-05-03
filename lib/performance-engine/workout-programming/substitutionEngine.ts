import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  Exercise,
  ExerciseSelectionScoreTrace,
  ExerciseSubstitutionOption,
  SubstitutionRule,
  WorkoutExperienceLevel,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
} from './types.ts';

export const SUBSTITUTION_SCORE_WEIGHTS = {
  movementPatternIntent: 35,
  movementPatternOverlap: 4,
  primaryMuscleIntent: 18,
  primaryMuscleOverlap: 4,
  equipmentCompatible: 18,
  bodyweightSimplicity: 2,
  authoredRule: 22,
  authoredPriorityMax: 16,
  experienceCompatible: 10,
  beginnerMatch: 6,
  workoutTypeMatch: 12,
  goalMatch: 10,
  loadabilityMatch: 7,
  lowerLoadabilityWithSafety: 5,
  jointDemandReduction: 14,
  jointDemandReductionPerLevel: 3,
  higherJointDemandPenalty: -10,
  readinessLowComplexity: 12,
  readinessLowFatigue: 10,
  readinessHighFatiguePenalty: -14,
  lowerImpact: 12,
} as const;

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

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function intersects(left: readonly string[] | undefined, right: readonly string[] | undefined): boolean {
  if (!left?.length || !right?.length) return false;
  return left.some((item) => right.includes(item));
}

function overlapCount(left: readonly string[] | undefined, right: readonly string[] | undefined): number {
  if (!left?.length || !right?.length) return 0;
  return left.filter((item) => right.includes(item)).length;
}

function exerciseById(catalog: WorkoutProgrammingCatalog, id: string): Exercise | null {
  return catalog.exercises.find((exercise) => exercise.id === id) ?? null;
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
    const scoreBreakdown: Record<string, number> = {};
    const rationaleParts: string[] = [];
    const includedReasons: string[] = [];
    const add = (key: string, value: number, reason?: string) => {
      if (value === 0) return;
      score += value;
      scoreBreakdown[key] = (scoreBreakdown[key] ?? 0) + value;
      if (reason && value > 0) includedReasons.push(reason);
    };
    const patternOverlap = overlapCount(candidate.movementPatternIds, input.movementPatternIds ?? source.movementPatternIds);
    if (patternOverlap > 0) {
      add('movementPatternMatch', SUBSTITUTION_SCORE_WEIGHTS.movementPatternIntent + patternOverlap * SUBSTITUTION_SCORE_WEIGHTS.movementPatternOverlap, `Preserves ${patternOverlap} movement pattern(s).`);
      rationaleParts.push(`Preserves the ${candidate.movementPatternIds.find((id) => source.movementPatternIds.includes(id)) ?? 'same'} movement intent.`);
    }

    const muscleOverlap = overlapCount(candidate.primaryMuscleIds, input.primaryMuscleIds ?? source.primaryMuscleIds);
    if (muscleOverlap > 0) {
      add('primaryMuscleMatch', SUBSTITUTION_SCORE_WEIGHTS.primaryMuscleIntent + muscleOverlap * SUBSTITUTION_SCORE_WEIGHTS.primaryMuscleOverlap, 'Keeps the main tissue target similar.');
      rationaleParts.push('Keeps the main tissue target similar.');
    }

    add('equipmentMatch', SUBSTITUTION_SCORE_WEIGHTS.equipmentCompatible, 'Compatible with available equipment.');
    if (candidate.equipmentRequiredIds?.includes('bodyweight')) add('bodyweightSimplicity', SUBSTITUTION_SCORE_WEIGHTS.bodyweightSimplicity, 'Requires only bodyweight setup.');
    if (activeRule) {
      add('authoredRule', SUBSTITUTION_SCORE_WEIGHTS.authoredRule, 'Matched an authored substitution rule.');
      add('authoredPriority', Math.max(0, SUBSTITUTION_SCORE_WEIGHTS.authoredPriorityMax - (ruleMatch?.priority ?? 10) * 4), 'Ranked highly by the authored replacement priority.');
      rationaleParts.push(activeRule.reason ?? activeRule.rationale ?? 'Matches an authored substitution rule.');
    }

    if (experienceRank[candidate.minExperience] <= experienceRank[experienceLevel]) add('experienceMatch', SUBSTITUTION_SCORE_WEIGHTS.experienceCompatible, 'Compatible with experience level.');
    if (candidate.minExperience === 'beginner' && experienceLevel === 'beginner') add('beginnerMatch', SUBSTITUTION_SCORE_WEIGHTS.beginnerMatch, 'Beginner-friendly replacement.');
    if (input.workoutTypeId && candidate.workoutTypeIds.includes(input.workoutTypeId)) {
      add('workoutTypeMatch', SUBSTITUTION_SCORE_WEIGHTS.workoutTypeMatch, 'Stays inside the same workout type.');
      rationaleParts.push('Stays inside the same workout type.');
    }
    if (input.goalId && candidate.goalIds.includes(input.goalId)) {
      add('goalMatch', SUBSTITUTION_SCORE_WEIGHTS.goalMatch, 'Supports the same training goal.');
      rationaleParts.push('Supports the same training goal.');
    }
    if (candidate.loadability === source.loadability) add('loadabilityMatch', SUBSTITUTION_SCORE_WEIGHTS.loadabilityMatch, 'Keeps similar loadability.');
    if (source.loadability && candidate.loadability && demandRank[candidate.loadability] < demandRank[source.loadability]) add('lowerLoadabilityWithSafety', safetyFlagIds.length ? SUBSTITUTION_SCORE_WEIGHTS.lowerLoadabilityWithSafety : 0, 'Reduces loading when safety flags are active.');

    let jointDemandPenalty = 0;
    for (const flagId of safetyFlagIds) {
      const sourceDemand = jointDemand(source, flagId);
      const candidateDemand = jointDemand(candidate, flagId);
      if (sourceDemand > 0 && candidateDemand < sourceDemand) {
        add('jointDemandReduction', SUBSTITUTION_SCORE_WEIGHTS.jointDemandReduction + (sourceDemand - candidateDemand) * SUBSTITUTION_SCORE_WEIGHTS.jointDemandReductionPerLevel, `Reduces ${flagId.replace('_caution', '')} demand.`);
        rationaleParts.push(`Reduces ${flagId.replace('_caution', '')} demand for the active caution.`);
      } else if (candidateDemand > sourceDemand && sourceDemand > 0) {
        jointDemandPenalty += SUBSTITUTION_SCORE_WEIGHTS.higherJointDemandPenalty;
      }
    }
    add('jointDemandPenalty', jointDemandPenalty);

    let fatigueCostPenalty = 0;
    let technicalComplexityPenalty = 0;
    if (readinessSensitive(safetyFlagIds)) {
      if (candidate.technicalComplexity === 'low') add('readinessLowComplexity', SUBSTITUTION_SCORE_WEIGHTS.readinessLowComplexity, 'Simpler option for today readiness.');
      if (candidate.fatigueCost === 'low') add('readinessLowFatigue', SUBSTITUTION_SCORE_WEIGHTS.readinessLowFatigue, 'Lower fatigue option for today readiness.');
      if (candidate.fatigueCost === 'high') {
        fatigueCostPenalty += SUBSTITUTION_SCORE_WEIGHTS.readinessHighFatiguePenalty;
        add('readinessHighFatiguePenalty', fatigueCostPenalty);
      }
      rationaleParts.push('Uses a lower-complexity option for today readiness.');
    }

    if (safetyFlagIds.includes('no_jumping') || safetyFlagIds.includes('low_impact_required')) {
      if (impactRank[candidate.impact] < impactRank[source.impact]) {
        add('lowerImpact', SUBSTITUTION_SCORE_WEIGHTS.lowerImpact, 'Lowers impact while keeping the session moving.');
        rationaleParts.push('Lowers impact while keeping the session moving.');
      }
    }

    const scoreTrace: ExerciseSelectionScoreTrace = {
      exerciseId: candidate.id,
      slotId: `substitution:${source.id}`,
      totalScore: score,
      scoreBreakdown,
      includedReasons: unique([...includedReasons, ...rationaleParts]),
      excludedReasons: [],
      safetyFlagsApplied: safetyFlagIds,
      equipmentMatch: true,
      movementPatternMatch: patternOverlap > 0,
      goalMatch: Boolean(input.goalId && candidate.goalIds.includes(input.goalId)),
      workoutTypeMatch: Boolean(input.workoutTypeId && candidate.workoutTypeIds.includes(input.workoutTypeId)),
      experienceMatch: experienceRank[candidate.minExperience] <= experienceRank[experienceLevel],
      fatigueCostPenalty,
      technicalComplexityPenalty,
      jointDemandPenalty,
      preferenceAdjustment: 0,
      substitutionAdjustment: (scoreBreakdown.authoredRule ?? 0) + (scoreBreakdown.authoredPriority ?? 0),
      finalDecision: 'substitution_candidate',
    };

    const option: ExerciseSubstitutionOption = {
      exerciseId: candidate.id,
      name: candidate.name,
      rationale: compatibilityRationale(rationaleParts, 'Keeps the training intent with available equipment and safer constraints.'),
      score,
      scoreTrace,
    };
    if (activeRule?.id) option.matchedRuleId = activeRule.id;
    if (activeRule?.prescriptionAdjustment) option.prescriptionAdjustment = activeRule.prescriptionAdjustment;
    if (activeRule?.coachingNote) option.coachingNote = activeRule.coachingNote;
    return option;
  }).filter((candidate): candidate is ExerciseSubstitutionOption => candidate !== null);

  return scored
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
    .slice(0, input.limit ?? 3)
    .map((option, index) => ({
      ...option,
      scoreTrace: {
        ...option.scoreTrace!,
        finalDecision: index === 0 ? 'substitution_selected' : 'substitution_candidate',
      },
    }));
}
