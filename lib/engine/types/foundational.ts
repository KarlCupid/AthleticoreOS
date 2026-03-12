export type Phase =
  | 'off-season'
  | 'pre-camp'
  | 'fight-camp'
  | 'camp-base'
  | 'camp-build'
  | 'camp-peak'
  | 'camp-taper';

export type FightStatus = 'amateur' | 'pro';

export type ReadinessState = 'Prime' | 'Caution' | 'Depleted';

export type CyclePhase =
  | 'menstrual'
  | 'follicular'
  | 'ovulatory'
  | 'luteal-early'
  | 'luteal-late';

export type ExerciseType =
  | 'heavy_lift'
  | 'power'
  | 'mobility'
  | 'active_recovery'
  | 'conditioning'
  | 'sport_specific';

export type BlockType = 'Boxing' | 'S&C' | 'Recovery';

export type TimelineStatus = 'Scheduled' | 'Completed' | 'Skipped' | 'Audible';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'neck'
  | 'calves';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'bodyweight'
  | 'cable'
  | 'machine'
  | 'band'
  | 'medicine_ball'
  | 'sled'
  | 'heavy_bag'
  | 'other';

export type WorkoutType =
  | 'strength'
  | 'practice'
  | 'sparring'
  | 'conditioning'
  | 'recovery';

export type WorkoutFocus =
  | 'upper_push'
  | 'upper_pull'
  | 'lower'
  | 'full_body'
  | 'sport_specific'
  | 'recovery'
  | 'conditioning';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
