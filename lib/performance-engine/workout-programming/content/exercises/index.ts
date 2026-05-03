import type { Exercise } from '../../types.ts';
import { uniqueById } from '../helpers.ts';
import { cardioExercises } from './cardio.ts';
import { coreExercises } from './core.ts';
import {
  expandedCardioExercises,
  expandedCoreExercises,
  expandedLowerBodyExercises,
  expandedMobilityExercises,
  expandedPowerExercises,
  expandedRecoveryExercises,
  expandedUpperBodyExercises,
} from './expanded.ts';
import { lowerBodyExercises } from './lowerBody.ts';
import { mobilityExercises } from './mobility.ts';
import { powerExercises } from './power.ts';
import { recoveryExercises } from './recovery.ts';
import { upperBodyExercises } from './upperBody.ts';

export {
  cardioExercises,
  coreExercises,
  lowerBodyExercises,
  mobilityExercises,
  powerExercises,
  recoveryExercises,
  upperBodyExercises,
  expandedCardioExercises,
  expandedCoreExercises,
  expandedLowerBodyExercises,
  expandedMobilityExercises,
  expandedPowerExercises,
  expandedRecoveryExercises,
  expandedUpperBodyExercises,
};

export const exerciseContentPacks = {
  lowerBody: [...lowerBodyExercises, ...expandedLowerBodyExercises],
  upperBody: [...upperBodyExercises, ...expandedUpperBodyExercises],
  core: [...coreExercises, ...expandedCoreExercises],
  cardio: [...cardioExercises, ...expandedCardioExercises],
  mobility: [...mobilityExercises, ...expandedMobilityExercises],
  recovery: [...recoveryExercises, ...expandedRecoveryExercises],
  power: [...powerExercises, ...expandedPowerExercises],
};

export const exercises: Exercise[] = uniqueById(Object.values(exerciseContentPacks).flat());
