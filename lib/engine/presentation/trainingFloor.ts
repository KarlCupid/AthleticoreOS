import type { DailyAthleteSummary } from '../types/mission.ts';
import type { WorkoutPrescriptionV2 } from '../types/training.ts';
import type { TrainingFloorViewModel } from './types.ts';
import { humanizeCoachCopy, humanizeCoachSentence } from './coachCopy.ts';

export function buildTrainingFloorViewModel(
  prescription: WorkoutPrescriptionV2 | null,
  mission: DailyAthleteSummary | null,
): TrainingFloorViewModel {
  return {
    sessionGoal:
      humanizeCoachCopy(
        prescription?.sessionGoal ??
        mission?.trainingDirective.intent ??
        "Complete today's workout",
      ) || "Complete today's workout",
    reasonSentence:
      humanizeCoachSentence(
        mission?.trainingDirective.reason,
        'This fits your plan today.',
      ),
    activationRequired: prescription?.activationGuidance != null,
    activationGuidance: prescription?.activationGuidance ?? null,
    isDeload: prescription?.isDeloadWorkout ?? false,
    exerciseCount: prescription?.exercises?.length ?? 0,
    estimatedDurationMin: prescription?.estimatedDurationMin ?? 0,
    primaryAdaptation: prescription?.primaryAdaptation ?? 'mixed',
  };
}
