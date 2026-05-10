// Compatibility only. Do not use for product workout generation.
// Athleticore support sessions should come from workout-programming GeneratedProgram snapshots.
import type { BlockPlanResult, GenerateBlockPlanInput } from './types.ts';
import { generateAdaptiveSmartWeekPlan } from './adaptiveTrainingAdapter.ts';
import { addDays } from './schedule/loadAndValidation.ts';

export {
  generateWorkout,
  generateWorkoutV2,
} from './calculateSC.ts';

// Compatibility only. Do not use for product workout generation.
export {
  generateAdaptiveSmartWeekPlan,
  generateAdaptiveSmartWeekPlan as generateLegacySmartWeekPlan,
  generateAdaptiveSmartWeekPlan as generateSmartWeekPlan,
} from './adaptiveTrainingAdapter.ts';

/**
 * Compatibility/simulation only.
 *
 * Block planning is backed by the legacy smart-week adapter and must not be
 * imported by product surfaces. Planned Athleticore support execution uses
 * GeneratedProgram weekly snapshots and WorkoutDetail attachment instead.
 */
export function generateLegacyBlockPlan(input: GenerateBlockPlanInput): BlockPlanResult {
  const weeks = Array.from({ length: Math.max(0, input.weeks) }, (_, index) => {
    const weekStartDate = addDays(input.startDate, index * 7);
    const weekPlan = generateAdaptiveSmartWeekPlan({
      ...input,
      weekStartDate,
    });

    return {
      weekStartDate,
      isDeloadWeek: weekPlan.isDeloadWeek,
      deloadReason: weekPlan.deloadReason,
      weeklyMixPlan: weekPlan.weeklyMixPlan,
    };
  });

  return { weeks };
}

export { generateLegacyBlockPlan as generateBlockPlan };
