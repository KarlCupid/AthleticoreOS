import { applyDefaultContentReviewMetadataToCatalog } from '../../contentReview.ts';
import type { WorkoutProgrammingCatalog } from '../../types.ts';
import {
  assessmentMetrics,
  equipmentTypes,
  exercises,
  movementPatterns,
  muscleGroups,
  prescriptionTemplates,
  sessionTemplates,
  trackingMetrics,
  trainingGoals,
  workoutFormats,
  workoutTypes,
} from '../index.ts';

export {
  assessmentMetrics,
  equipmentTypes,
  exercises,
  movementPatterns,
  muscleGroups,
  prescriptionTemplates,
  sessionTemplates,
  trackingMetrics,
  trainingGoals,
  workoutFormats,
  workoutTypes,
} from '../index.ts';

const baseWorkoutProgrammingCatalog: WorkoutProgrammingCatalog = {
  workoutTypes,
  trainingGoals,
  workoutFormats,
  movementPatterns,
  muscleGroups,
  equipmentTypes,
  exercises,
  prescriptionTemplates,
  sessionTemplates,
  trackingMetrics,
  assessmentMetrics,
};

export const workoutProgrammingCatalog: WorkoutProgrammingCatalog = applyDefaultContentReviewMetadataToCatalog(baseWorkoutProgrammingCatalog);
