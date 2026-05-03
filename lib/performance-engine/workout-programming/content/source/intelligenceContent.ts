import { applyDefaultContentReviewMetadataToIntelligence } from '../../contentReview.ts';
import type { WorkoutIntelligenceCatalog } from '../../types.ts';
import {
  coachingCueSets,
  commonMistakeSets,
  deloadRules,
  descriptionTemplates,
  progressionRules,
  regressionRules,
  safetyFlags,
  substitutionRules,
  validationRules,
} from '../intelligence/index.ts';

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
} from '../intelligence/index.ts';

const baseWorkoutIntelligenceCatalog: WorkoutIntelligenceCatalog = {
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

export const workoutIntelligenceCatalog: WorkoutIntelligenceCatalog = applyDefaultContentReviewMetadataToIntelligence(baseWorkoutIntelligenceCatalog);
