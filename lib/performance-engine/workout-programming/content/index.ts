import type { WorkoutProgrammingCatalog } from '../types.ts';
import { exercises } from './exercises/index.ts';
import { prescriptionTemplates } from './prescriptions/index.ts';
import { sessionTemplates } from './sessions/index.ts';
import {
  assessmentMetrics,
  equipmentTypes,
  movementPatterns,
  muscleGroups,
  trackingMetrics,
  trainingGoals,
  workoutFormats,
  workoutTypes,
} from './taxonomy/index.ts';

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
};
export { exerciseContentPacks } from './exercises/index.ts';
export { prescriptionContentPacks } from './prescriptions/index.ts';
export { sessionContentPacks } from './sessions/index.ts';
export {
  intelligenceContentPacks,
  workoutIntelligenceContentCatalog,
} from './intelligence/index.ts';

export const workoutProgrammingContentCatalog: WorkoutProgrammingCatalog = {
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
