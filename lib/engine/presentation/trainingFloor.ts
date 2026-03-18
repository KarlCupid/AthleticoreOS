import type { DailyMission } from '../types/mission.ts';
import type { WorkoutPrescriptionV2 } from '../types/training.ts';
import type { TrainingFloorViewModel } from './types.ts';

export function buildTrainingFloorViewModel(
  prescription: WorkoutPrescriptionV2 | null,
  mission: DailyMission | null,
): TrainingFloorViewModel {
  return {
    sessionGoal:
      prescription?.sessionGoal ??
      mission?.trainingDirective.intent ??
      "Complete today's session",
    reasonSentence:
      mission?.trainingDirective.reason ?? 'Following the scheduled training plan.',
    activationRequired: prescription?.activationGuidance != null,
    activationGuidance: prescription?.activationGuidance ?? null,
    isDeload: prescription?.isDeloadWorkout ?? false,
    exerciseCount: prescription?.exercises?.length ?? 0,
    estimatedDurationMin: prescription?.estimatedDurationMin ?? 0,
    primaryAdaptation: prescription?.primaryAdaptation ?? 'mixed',
  };
}
