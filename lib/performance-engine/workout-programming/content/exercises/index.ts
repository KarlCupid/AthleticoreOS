import type { Exercise } from '../../types.ts';
import { uniqueById } from '../helpers.ts';
import { cardioExercises } from './cardio.ts';
import { coreExercises } from './core.ts';
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
};

export const exerciseContentPacks = {
  lowerBody: lowerBodyExercises,
  upperBody: upperBodyExercises,
  core: coreExercises,
  cardio: cardioExercises,
  mobility: mobilityExercises,
  recovery: recoveryExercises,
  power: powerExercises,
};

export const exercises: Exercise[] = uniqueById(Object.values(exerciseContentPacks).flat());
