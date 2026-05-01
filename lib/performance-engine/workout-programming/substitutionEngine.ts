import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import { workoutProgrammingCatalog } from './seedData.ts';
import type {
  Exercise,
  ExerciseSubstitutionOption,
  SubstitutionRule,
  WorkoutExperienceLevel,
  WorkoutIntelligenceCatalog,
  WorkoutProgrammingCatalog,
} from './types.ts';

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
