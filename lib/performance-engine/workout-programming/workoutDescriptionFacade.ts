import { filterIntelligenceForContentReview } from './contentReview.ts';
import { workoutIntelligenceCatalog } from './intelligenceData.ts';
import type {
  DescriptionToneVariant,
  GeneratedWorkout,
} from './types.ts';
import { generateWorkoutDescription } from './workoutDescriptionService.ts';
import { contentReviewOptions } from './workoutServiceShared.ts';
import type { WorkoutProgrammingServiceOptions } from './workoutProgrammingServiceTypes.ts';

export function getWorkoutDescription(
  workout: GeneratedWorkout,
  toneVariant?: DescriptionToneVariant,
  reviewOptions?: Pick<WorkoutProgrammingServiceOptions, 'contentReviewMode' | 'allowDraftContent'>,
) {
  const gate = filterIntelligenceForContentReview(
    workoutIntelligenceCatalog,
    contentReviewOptions(reviewOptions, reviewOptions?.contentReviewMode ?? 'production'),
  );
  const descriptionOptions = {
    templates: gate.intelligence.descriptionTemplates,
  };
  return generateWorkoutDescription(workout, toneVariant ? { ...descriptionOptions, toneVariant } : descriptionOptions);
}
