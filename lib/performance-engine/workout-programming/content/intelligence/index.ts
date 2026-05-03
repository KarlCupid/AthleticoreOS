import type { WorkoutIntelligenceCatalog } from '../../types.ts';
import { coachingCueSets } from './coachingCues.ts';
import { commonMistakeSets } from './commonMistakes.ts';
import { deloadRules } from './deloadRules.ts';
import { descriptionTemplates } from './descriptions.ts';
import { progressionRules } from './progressionRules.ts';
import { regressionRules } from './regressionRules.ts';
import { safetyFlags } from './safetyFlags.ts';
import { substitutionRules } from './substitutionRules.ts';
import { validationRules } from './validationRules.ts';

export {
  coachingCueSets,
  commonMistakeSets,
  deloadRules,
  descriptionTemplates,
  progressionRules,
  regressionRules,
  safetyFlags,
  substitutionRules,
  validationRules,
};

export const intelligenceContentPacks = {
  progressionRules,
  regressionRules,
  deloadRules,
  substitutionRules,
  safetyFlags,
  coachingCueSets,
  commonMistakeSets,
  descriptionTemplates,
  validationRules,
};

export const workoutIntelligenceContentCatalog: WorkoutIntelligenceCatalog = {
  progressionRules,
  regressionRules,
  deloadRules,
  substitutionRules,
  safetyFlags,
  coachingCueSets,
  commonMistakeSets,
  descriptionTemplates,
  validationRules,
};
