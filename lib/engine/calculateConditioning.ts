/**
 * calculateConditioning.ts
 *
 * Conditioning programming engine for boxing-specific and general modalities.
 * All functions are pure and synchronous.
 */

import type {
  ConditioningExercise,
  ConditioningPrescription,
  ConditioningType,
  FitnessLevel,
  Phase,
  ReadinessState,
  WeeklyConditioningInput,
  CampConfig,
  WeightClassPlanRow,
  TimedWorkPrescription,
  CircuitRoundPrescription,
} from './types.ts';
import type { ReadinessProfile, StimulusConstraintSet } from './types/readiness.ts';
import { getBodyMassTrainingIntensityCap } from '../performance-engine/body-mass-weight-class/index.ts';
import { formatLocalDate, todayLocalDate } from '../utils/date.ts';

const BASE_BAG_ROUNDS: Record<FitnessLevel, number> = {
  beginner: 4,
  intermediate: 7,
  advanced: 10,
  elite: 12,
};

const BAG_WORK_INTERVAL: Record<FitnessLevel, number> = {
  beginner: 90,
  intermediate: 120,
  advanced: 180,
  elite: 180,
};

const BAG_REST_INTERVAL: Record<FitnessLevel, number> = {
  beginner: 90,
  intermediate: 60,
  advanced: 60,
  elite: 45,
};

const CIRCUIT_ROUNDS: Record<FitnessLevel, number> = {
  beginner: 2,
  intermediate: 5,
  advanced: 5,
  elite: 6,
};

const JUMP_ROPE_ROUNDS: Record<FitnessLevel, number> = {
  beginner: 4,
  intermediate: 6,
  advanced: 10,
  elite: 12,
};

const SPORT_DRILL_ROUNDS: Record<FitnessLevel, number> = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
  elite: 5,
};

const AGILITY_ROUNDS: Record<FitnessLevel, number> = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
  elite: 4,
};

const CONDITIONING_CNS: Record<ConditioningType, number> = {
  heavy_bag_rounds: 7,
  circuit: 5,
  jump_rope: 4,
  sled_work: 6,
  agility_drills: 4,
  sport_specific_drill: 5,
  assault_bike: 6,
  rowing: 5,
  swimming: 4,
  bike_erg: 5,
  ski_erg: 5,
  interval_medley: 6,
};

const PHASE_CONDITIONING_MAP: Record<Phase, ConditioningType[]> = {
  'off-season': ['circuit', 'assault_bike', 'rowing', 'jump_rope'],
  'pre-camp': ['circuit', 'heavy_bag_rounds', 'assault_bike', 'rowing'],
  'fight-camp': ['heavy_bag_rounds', 'sport_specific_drill', 'assault_bike', 'interval_medley'],
  'camp-base': ['circuit', 'rowing', 'assault_bike', 'heavy_bag_rounds'],
  'camp-build': ['heavy_bag_rounds', 'interval_medley', 'circuit', 'assault_bike'],
  'camp-peak': ['heavy_bag_rounds', 'sport_specific_drill', 'interval_medley'],
  'camp-taper': ['jump_rope', 'swimming', 'bike_erg'],
};

const CIRCUIT_EXERCISES: ConditioningExercise[] = [
  { name: 'Burpees', durationSec: null, reps: 10, rounds: 1, restSec: 15 },
  { name: 'Jump Squats', durationSec: null, reps: 15, rounds: 1, restSec: 15 },
  { name: 'Mountain Climbers', durationSec: 30, reps: null, rounds: 1, restSec: 10 },
  { name: 'Push-ups', durationSec: null, reps: 15, rounds: 1, restSec: 15 },
  { name: 'Plank Hold', durationSec: 30, reps: null, rounds: 1, restSec: 10 },
  { name: 'Sprawls', durationSec: null, reps: 10, rounds: 1, restSec: 15 },
  { name: 'Box Jumps', durationSec: null, reps: 10, rounds: 1, restSec: 20 },
];

const BEGINNER_CIRCUIT_EXERCISES: ConditioningExercise[] = [
  { name: 'Squat Jumps', durationSec: null, reps: 10, rounds: 1, restSec: 20 },
  { name: 'Push-ups', durationSec: null, reps: 8, rounds: 1, restSec: 20 },
  { name: 'High Knees', durationSec: 20, reps: null, rounds: 1, restSec: 15 },
  { name: 'Plank Hold', durationSec: 20, reps: null, rounds: 1, restSec: 15 },
];

const SPORT_SPECIFIC_EXERCISES: ConditioningExercise[] = [
  { name: 'Shadow Boxing (with resistance bands)', durationSec: 60, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
  { name: 'Defensive Footwork Drill', durationSec: 45, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
  { name: 'Slip Rope Drill', durationSec: 60, reps: null, rounds: 1, restSec: 20, format: 'intervals' },
  { name: 'Double-End Bag', durationSec: 90, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
  { name: 'Clinch Entry Practice', durationSec: 60, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
  { name: 'Reactive Counter Callouts', durationSec: 45, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
];

const AGILITY_EXERCISES: ConditioningExercise[] = [
  { name: 'Ladder Drills (In-In-Out)', durationSec: 20, reps: null, rounds: 1, restSec: 20, format: 'intervals' },
  { name: 'Cone Shuffle', durationSec: 15, reps: null, rounds: 1, restSec: 15, format: 'intervals' },
  { name: 'Lateral Bounds', durationSec: null, reps: 10, rounds: 1, restSec: 15, format: 'intervals' },
  { name: 'T-Drill', durationSec: 20, reps: null, rounds: 1, restSec: 30, format: 'intervals' },
];

const ASSAULT_BIKE_INTERVALS: ConditioningExercise[] = [
  { name: 'Assault Bike Sprint', durationSec: 30, reps: null, rounds: 1, restSec: 90, format: 'intervals' },
];

const ASSAULT_BIKE_EMOM: ConditioningExercise[] = [
  { name: 'Assault Bike Calories', durationSec: 45, reps: 10, rounds: 1, restSec: 15, format: 'emom' },
];

const ROWING_INTERVALS: ConditioningExercise[] = [
  { name: 'Row Sprint', durationSec: 45, reps: null, rounds: 1, restSec: 75, format: 'intervals' },
];

const ROWING_STEADY: ConditioningExercise[] = [
  { name: 'Steady Row', durationSec: 1500, reps: null, rounds: 1, restSec: 0, format: 'steady_state' },
];

const SWIMMING_SETS: ConditioningExercise[] = [
  { name: 'Pool Intervals (50 m repeats)', durationSec: 50, reps: 50, rounds: 1, restSec: 10, format: 'intervals' },
];

const SWIMMING_CONTINUOUS: ConditioningExercise[] = [
  { name: 'Continuous Swim', durationSec: 1200, reps: null, rounds: 1, restSec: 0, format: 'steady_state' },
];

const BIKE_ERG_INTERVALS: ConditioningExercise[] = [
  { name: 'Bike Erg Push', durationSec: 40, reps: null, rounds: 1, restSec: 80, format: 'intervals' },
];

const BIKE_ERG_EMOM: ConditioningExercise[] = [
  { name: 'Bike Erg Calories', durationSec: 45, reps: 12, rounds: 1, restSec: 15, format: 'emom' },
];

const SKI_ERG_INTERVALS: ConditioningExercise[] = [
  { name: 'Ski Erg Push', durationSec: 30, reps: null, rounds: 1, restSec: 90, format: 'intervals' },
];

const SKI_ERG_EMOM: ConditioningExercise[] = [
  { name: 'Ski Erg Calories', durationSec: 45, reps: 10, rounds: 1, restSec: 15, format: 'emom' },
];

const INTERVAL_MEDLEY_ROTATION: ConditioningExercise[] = [
  { name: 'Bike Erg', durationSec: 120, reps: null, rounds: 1, restSec: 0, format: 'intervals' },
  { name: 'Row Erg', durationSec: 120, reps: null, rounds: 1, restSec: 0, format: 'intervals' },
  { name: 'Recovery Walk / Easy Spin', durationSec: 60, reps: null, rounds: 1, restSec: 0, format: 'intervals' },
];

type ConditioningBuildResult = {
  rounds: number;
  workIntervalSec: number;
  restIntervalSec: number;
  totalDurationMin: number;
  exercises: ConditioningExercise[];
  format?: ConditioningPrescription['format'];
  timedWork?: TimedWorkPrescription;
  circuitRound?: CircuitRoundPrescription;
};

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function dateFromISO(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function getConditioningType(
  phase: Phase,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningType {
  if (readinessState === 'Depleted') return 'jump_rope';
  const list = PHASE_CONDITIONING_MAP[phase];
  return list[sessionIndex % list.length];
}

function applyPrimeRoundBonus(rounds: number, readinessState: ReadinessState): number {
  if (readinessState !== 'Prime') return rounds;
  return Math.max(1, Math.round(rounds * 1.15));
}

function clampRounds(rounds: number, constraintSet: StimulusConstraintSet | null, minimum = 1): number {
  if (constraintSet?.hardCaps.maxConditioningRounds == null) return Math.max(minimum, rounds);
  return Math.max(minimum, Math.min(rounds, constraintSet.hardCaps.maxConditioningRounds));
}

function roundExerciseLibrary(exercises: ConditioningExercise[], rounds: number): ConditioningExercise[] {
  return exercises.map((exercise) => ({
    ...exercise,
    rounds,
  }));
}

function buildSteadySegment(name: string, durationMin: number): ConditioningExercise {
  return {
    name,
    durationSec: durationMin * 60,
    reps: null,
    rounds: 1,
    restSec: 0,
    format: 'steady_state',
  };
}

function formatSecondsLabel(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? '1 min' : `${minutes} min`;
  }
  return `${seconds}s`;
}

function buildCircuitRound(exercises: ConditioningExercise[], roundCount: number): CircuitRoundPrescription {
  return {
    roundCount,
    restBetweenRoundsSec: 60,
    movements: exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      reps: exercise.reps,
      durationSec: exercise.durationSec,
      restSec: exercise.restSec,
    })),
  };
}

function buildHeavyBag(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = BASE_BAG_ROUNDS[fitnessLevel];
  if (readinessState === 'Caution') {
    rounds = Math.max(3, Math.round(rounds * 0.8));
  }
  rounds = clampRounds(rounds, constraintSet, 2);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const workIntervalSec = BAG_WORK_INTERVAL[fitnessLevel];
  const restIntervalSec = BAG_REST_INTERVAL[fitnessLevel];
  const totalDurationMin = Math.round((rounds * (workIntervalSec + restIntervalSec)) / 60);
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises: [{
      name: 'Heavy Bag Rounds',
      durationSec: workIntervalSec,
      reps: null,
      rounds,
      restSec: restIntervalSec,
      format: 'intervals',
    }],
    format: 'intervals',
  };
}

function buildCircuit(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = CIRCUIT_ROUNDS[fitnessLevel];
  if (readinessState === 'Caution') {
    rounds = Math.max(2, Math.round(rounds * 0.9));
  }
  rounds = clampRounds(rounds, constraintSet, 2);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const exercises = roundExerciseLibrary(
    (fitnessLevel === 'beginner' ? BEGINNER_CIRCUIT_EXERCISES : CIRCUIT_EXERCISES)
      .slice(0, fitnessLevel === 'beginner' ? 4 : 6),
    rounds,
  );
  const workIntervalSec = 30;
  const restIntervalSec = 15;
  const totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises,
    format: 'rounds',
    circuitRound: buildCircuitRound(exercises, rounds),
  };
}

function buildJumpRope(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = JUMP_ROPE_ROUNDS[fitnessLevel];
  if (readinessState === 'Caution') {
    rounds = Math.max(3, Math.round(rounds * 0.9));
  }
  rounds = clampRounds(rounds, constraintSet, 3);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const workIntervalSec = 60;
  const restIntervalSec = 30;
  const totalDurationMin = Math.round((rounds * (workIntervalSec + restIntervalSec)) / 60) + 3;
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises: [{
      name: 'Jump Rope',
      durationSec: workIntervalSec,
      reps: null,
      rounds,
      restSec: restIntervalSec,
      format: 'intervals',
    }],
    format: 'intervals',
  };
}

function buildSportSpecificDrill(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = SPORT_DRILL_ROUNDS[fitnessLevel];
  if (readinessState === 'Caution') {
    rounds = Math.max(2, Math.round(rounds * 0.9));
  }
  rounds = clampRounds(rounds, constraintSet, 2);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const exercises = roundExerciseLibrary(SPORT_SPECIFIC_EXERCISES.slice(0, Math.min(6, rounds + 2)), rounds);
  const workIntervalSec = 60;
  const restIntervalSec = 30;
  const totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises,
    format: 'intervals',
  };
}

function buildAgilityDrills(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = AGILITY_ROUNDS[fitnessLevel];
  if (readinessState === 'Caution') {
    rounds = Math.max(2, Math.round(rounds * 0.9));
  }
  rounds = clampRounds(rounds, constraintSet, 2);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const exercises = roundExerciseLibrary(AGILITY_EXERCISES.slice(0, 3), rounds);
  const workIntervalSec = 20;
  const restIntervalSec = 20;
  const totalDurationMin = Math.round((exercises.length * rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises,
    format: 'intervals',
  };
}

function buildSledWork(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = fitnessLevel === 'beginner' ? 4 : fitnessLevel === 'elite' ? 8 : 6;
  if (readinessState === 'Caution') {
    rounds = Math.max(3, Math.round(rounds * 0.85));
  }
  rounds = clampRounds(rounds, constraintSet, 3);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const workIntervalSec = 30;
  const restIntervalSec = 90;
  const totalDurationMin = Math.round((rounds * (workIntervalSec + restIntervalSec)) / 60) + 5;
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin,
    exercises: [{
      name: 'Sled Push (20m)',
      durationSec: null,
      reps: rounds,
      rounds: 1,
      restSec: restIntervalSec,
      format: 'for_time',
      timedWork: {
        format: 'for_time',
        totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
      },
    }],
    format: 'for_time',
    timedWork: {
      format: 'for_time',
      totalDurationSec: totalDurationMin * 60,
    },
  };
}

function buildAssaultBike(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningBuildResult {
  const useEmom = readinessState === 'Prime' && sessionIndex % 2 === 1;
  if (useEmom) {
    const roundCount = applyPrimeRoundBonus(
      fitnessLevel === 'beginner' ? 10 : fitnessLevel === 'intermediate' ? 12 : 15,
      readinessState,
    );
    const timedWork: TimedWorkPrescription = {
      format: 'emom',
      totalDurationSec: roundCount * 60,
      workIntervalSec: 60,
      roundCount,
    };
    return {
      rounds: roundCount,
      workIntervalSec: 60,
      restIntervalSec: 0,
      totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 7,
      exercises: [
        buildSteadySegment('Assault Bike Build-Up', 4),
        ...roundExerciseLibrary(ASSAULT_BIKE_EMOM, roundCount),
        buildSteadySegment('Easy Spin Flush', 3),
      ],
      format: 'emom',
      timedWork,
    };
  }

  const rounds = applyPrimeRoundBonus(
    fitnessLevel === 'beginner' ? 8 : fitnessLevel === 'intermediate' ? 10 : 12,
    readinessState,
  );
  const workIntervalSec = 30;
  const restIntervalSec = fitnessLevel === 'elite' ? 75 : 90;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 8,
    exercises: [
      buildSteadySegment('Assault Bike Ramp-Up', 4),
      ...roundExerciseLibrary(ASSAULT_BIKE_INTERVALS, rounds),
      buildSteadySegment('Easy Spin Flush', 4),
    ],
    format: 'intervals',
    timedWork,
  };
}

function buildRowing(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningBuildResult {
  const useSteady = readinessState === 'Caution' || fitnessLevel === 'beginner' || sessionIndex % 3 === 0;
  if (useSteady) {
    const totalDurationMin = fitnessLevel === 'beginner' ? 20 : fitnessLevel === 'intermediate' ? 25 : 30;
    const timedWork: TimedWorkPrescription = {
      format: 'timed_set',
      totalDurationSec: totalDurationMin * 60,
      workIntervalSec: totalDurationMin * 60,
      restIntervalSec: 0,
      roundCount: 1,
    };
    return {
      rounds: 1,
      workIntervalSec: totalDurationMin * 60,
      restIntervalSec: 0,
      totalDurationMin: totalDurationMin + 9,
      exercises: [
        buildSteadySegment('Row Ramp-Up', 5),
        ...ROWING_STEADY.map((exercise) => ({
          ...exercise,
          durationSec: totalDurationMin * 60,
          timedWork,
        })),
        buildSteadySegment('Easy Row Flush', 4),
      ],
      format: 'intervals',
      timedWork,
    };
  }

  const rounds = applyPrimeRoundBonus(fitnessLevel === 'intermediate' ? 8 : 10, readinessState);
  const workIntervalSec = 45;
  const restIntervalSec = 75;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 8,
    exercises: [
      buildSteadySegment('Row Primer', 4),
      ...roundExerciseLibrary(ROWING_INTERVALS, rounds),
      buildSteadySegment('Easy Row Flush', 4),
    ],
    format: 'intervals',
    timedWork,
  };
}

function buildSwimming(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningBuildResult {
  const useContinuous = readinessState === 'Caution' || sessionIndex % 2 === 0;
  if (useContinuous) {
    const totalDurationMin = fitnessLevel === 'beginner' ? 18 : fitnessLevel === 'intermediate' ? 20 : 25;
    const timedWork: TimedWorkPrescription = {
      format: 'timed_set',
      totalDurationSec: totalDurationMin * 60,
      workIntervalSec: totalDurationMin * 60,
      restIntervalSec: 0,
      roundCount: 1,
    };
    return {
      rounds: 1,
      workIntervalSec: totalDurationMin * 60,
      restIntervalSec: 0,
      totalDurationMin,
      exercises: SWIMMING_CONTINUOUS.map((exercise) => ({
        ...exercise,
        durationSec: totalDurationMin * 60,
        timedWork,
      })),
      format: 'intervals',
      timedWork,
    };
  }

  const rounds = applyPrimeRoundBonus(
    fitnessLevel === 'beginner' ? 8 : fitnessLevel === 'intermediate' ? 10 : 12,
    readinessState,
  );
  const workIntervalSec = 50;
  const restIntervalSec = 10;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 5,
    exercises: roundExerciseLibrary(SWIMMING_SETS, rounds),
    format: 'intervals',
    timedWork,
  };
}

function buildBikeErg(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningBuildResult {
  const useEmom = readinessState === 'Prime' && sessionIndex % 2 === 0;
  if (useEmom) {
    const roundCount = applyPrimeRoundBonus(
      fitnessLevel === 'beginner' ? 10 : fitnessLevel === 'intermediate' ? 12 : 15,
      readinessState,
    );
    const timedWork: TimedWorkPrescription = {
      format: 'emom',
      totalDurationSec: roundCount * 60,
      workIntervalSec: 60,
      roundCount,
    };
    return {
      rounds: roundCount,
      workIntervalSec: 60,
      restIntervalSec: 0,
      totalDurationMin: roundCount + 7,
      exercises: [
        buildSteadySegment('Bike Erg Build-Up', 4),
        ...roundExerciseLibrary(BIKE_ERG_EMOM, roundCount),
        buildSteadySegment('Easy Spin Flush', 3),
      ],
      format: 'emom',
      timedWork,
    };
  }

  const rounds = applyPrimeRoundBonus(
    fitnessLevel === 'beginner' ? 8 : fitnessLevel === 'intermediate' ? 10 : 12,
    readinessState,
  );
  const workIntervalSec = 40;
  const restIntervalSec = 80;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 8,
    exercises: [
      buildSteadySegment('Bike Erg Ramp-Up', 4),
      ...roundExerciseLibrary(BIKE_ERG_INTERVALS, rounds),
      buildSteadySegment('Easy Spin Flush', 4),
    ],
    format: 'intervals',
    timedWork,
  };
}

function buildSkiErg(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  sessionIndex: number,
): ConditioningBuildResult {
  const useEmom = readinessState === 'Prime' && sessionIndex % 3 === 0;
  if (useEmom) {
    const roundCount = applyPrimeRoundBonus(
      fitnessLevel === 'beginner' ? 8 : fitnessLevel === 'intermediate' ? 10 : 12,
      readinessState,
    );
    const timedWork: TimedWorkPrescription = {
      format: 'emom',
      totalDurationSec: roundCount * 60,
      workIntervalSec: 60,
      roundCount,
    };
    return {
      rounds: roundCount,
      workIntervalSec: 60,
      restIntervalSec: 0,
      totalDurationMin: roundCount + 7,
      exercises: [
        buildSteadySegment('Ski Erg Build-Up', 4),
        ...roundExerciseLibrary(SKI_ERG_EMOM, roundCount),
        buildSteadySegment('Breathing / Easy Flush', 3),
      ],
      format: 'emom',
      timedWork,
    };
  }

  const rounds = applyPrimeRoundBonus(
    fitnessLevel === 'beginner' ? 8 : fitnessLevel === 'intermediate' ? 10 : 12,
    readinessState,
  );
  const workIntervalSec = 30;
  const restIntervalSec = 90;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60) + 8,
    exercises: [
      buildSteadySegment('Ski Erg Ramp-Up', 4),
      ...roundExerciseLibrary(SKI_ERG_INTERVALS, rounds),
      buildSteadySegment('Breathing / Easy Flush', 4),
    ],
    format: 'intervals',
    timedWork,
  };
}

function buildIntervalMedley(
  fitnessLevel: FitnessLevel,
  readinessState: ReadinessState,
  constraintSet: StimulusConstraintSet | null,
): ConditioningBuildResult {
  let rounds = fitnessLevel === 'beginner' ? 3 : fitnessLevel === 'intermediate' ? 4 : fitnessLevel === 'advanced' ? 5 : 6;
  if (readinessState === 'Caution') {
    rounds = Math.max(3, rounds - 1);
  }
  rounds = clampRounds(rounds, constraintSet, 3);
  rounds = applyPrimeRoundBonus(rounds, readinessState);
  const exercises = roundExerciseLibrary(INTERVAL_MEDLEY_ROTATION, rounds);
  const workIntervalSec = 240;
  const restIntervalSec = 60;
  const timedWork: TimedWorkPrescription = {
    format: 'timed_set',
    totalDurationSec: rounds * (workIntervalSec + restIntervalSec),
    workIntervalSec,
    restIntervalSec,
    roundCount: rounds,
  };
  return {
    rounds,
    workIntervalSec,
    restIntervalSec,
    totalDurationMin: Math.round(timedWork.totalDurationSec / 60),
    exercises,
    format: 'intervals',
    timedWork,
  };
}

function buildConditioningPrescription(input: {
  type: ConditioningType;
  fitnessLevel: FitnessLevel;
  readinessState: ReadinessState;
  constraintSet: StimulusConstraintSet | null;
  sessionIndex: number;
}): ConditioningBuildResult {
  const { type, fitnessLevel, readinessState, constraintSet, sessionIndex } = input;

  switch (type) {
    case 'heavy_bag_rounds':
      return buildHeavyBag(fitnessLevel, readinessState, constraintSet);
    case 'circuit':
      return buildCircuit(fitnessLevel, readinessState, constraintSet);
    case 'jump_rope':
      return buildJumpRope(fitnessLevel, readinessState, constraintSet);
    case 'sport_specific_drill':
      return buildSportSpecificDrill(fitnessLevel, readinessState, constraintSet);
    case 'agility_drills':
      return buildAgilityDrills(fitnessLevel, readinessState, constraintSet);
    case 'sled_work':
      return buildSledWork(fitnessLevel, readinessState, constraintSet);
    case 'assault_bike':
      return buildAssaultBike(fitnessLevel, readinessState, sessionIndex);
    case 'rowing':
      return buildRowing(fitnessLevel, readinessState, sessionIndex);
    case 'swimming':
      return buildSwimming(fitnessLevel, readinessState, sessionIndex);
    case 'bike_erg':
      return buildBikeErg(fitnessLevel, readinessState, sessionIndex);
    case 'ski_erg':
      return buildSkiErg(fitnessLevel, readinessState, sessionIndex);
    case 'interval_medley':
      return buildIntervalMedley(fitnessLevel, readinessState, constraintSet);
    default:
      return {
        rounds: 3,
        workIntervalSec: 30,
        restIntervalSec: 30,
        totalDurationMin: 15,
        exercises: [],
      };
  }
}

function formatSummaryLabel(prescription: ConditioningBuildResult): string {
  if (prescription.format === 'emom' && prescription.timedWork) {
    return `EMOM ${Math.round(prescription.timedWork.totalDurationSec / 60)}`;
  }
  if (prescription.format === 'for_time' && prescription.timedWork) {
    return `for time (${Math.round(prescription.timedWork.totalDurationSec / 60)} min cap)`;
  }
  if (prescription.timedWork?.format === 'tabata') {
    return 'Tabata';
  }
  if (prescription.timedWork?.roundCount && prescription.workIntervalSec > 0) {
    const workLabel = formatSecondsLabel(prescription.workIntervalSec);
    const restLabel = prescription.restIntervalSec > 0 ? ` / ${formatSecondsLabel(prescription.restIntervalSec)} easy` : '';
    return `${prescription.timedWork.roundCount} x ${workLabel}${restLabel}`;
  }
  if (prescription.rounds <= 1 && prescription.totalDurationMin >= 15) {
    return `${prescription.totalDurationMin} min steady`;
  }
  return `${prescription.rounds} rounds x ${Math.round((prescription.workIntervalSec / 60) * 10) / 10} min`;
}

export function prescribeConditioning(input: {
  phase: Phase;
  fitnessLevel: FitnessLevel;
  readinessState: ReadinessState;
  readinessProfile?: ReadinessProfile | null;
  constraintSet?: StimulusConstraintSet | null;
  acwr: number;
  sessionIndex?: number;
  activeWeightClassPlan?: WeightClassPlanRow | null;
  campConfig?: CampConfig | null;
  trainingIntensityCap?: number | null;
  trainingIntensityCapOverride?: number | null;
}): ConditioningPrescription {
  const {
    phase,
    fitnessLevel,
    readinessState,
    constraintSet = null,
    acwr,
    sessionIndex = 0,
    activeWeightClassPlan,
    trainingIntensityCap,
    trainingIntensityCapOverride,
  } = input;

  let type = getConditioningType(phase, readinessState, sessionIndex);

  const resolvedIntensityCap = trainingIntensityCapOverride ?? trainingIntensityCap;
  const effectiveDate = todayLocalDate();
  const effectiveIntensityCap = resolvedIntensityCap !== undefined
    ? resolvedIntensityCap
    : getBodyMassTrainingIntensityCap(activeWeightClassPlan, effectiveDate);

  if (effectiveIntensityCap !== null && effectiveIntensityCap !== undefined) {
    if (CONDITIONING_CNS[type] > effectiveIntensityCap) {
      type = 'jump_rope';
    }
  }

  if (constraintSet) {
    if (constraintSet.blockedStimuli.includes('glycolytic_conditioning')) {
      type = constraintSet.allowedStimuli.includes('aerobic_conditioning') ? 'jump_rope' : 'agility_drills';
    }
    if (
      constraintSet.blockedStimuli.includes('tempo_conditioning')
      && ['circuit', 'interval_medley', 'assault_bike', 'rowing', 'bike_erg', 'ski_erg'].includes(type)
    ) {
      type = 'jump_rope';
    }
  }

  if ((readinessState === 'Depleted' && !constraintSet?.allowedStimuli.includes('aerobic_conditioning')) || acwr >= 1.4) {
    type = 'jump_rope';
  }

  const prescription = buildConditioningPrescription({
    type,
    fitnessLevel,
    readinessState,
    constraintSet,
    sessionIndex,
  });

  const intensityLabel: ConditioningPrescription['intensityLabel'] =
    readinessState === 'Depleted' ? 'light'
      : readinessState === 'Caution' ? 'moderate'
        : 'hard';

  const cnsBudget = CONDITIONING_CNS[type];
  const estimatedLoad = prescription.totalDurationMin * cnsBudget;

  const typeLabels: Record<ConditioningType, string> = {
    heavy_bag_rounds: 'Heavy Bag Rounds',
    circuit: 'Conditioning Circuit',
    jump_rope: 'Jump Rope',
    sled_work: 'Sled Work',
    agility_drills: 'Agility Drills',
    sport_specific_drill: 'Sport-Specific Drills',
    assault_bike: 'Assault Bike',
    rowing: 'Rowing',
    swimming: 'Swimming',
    bike_erg: 'Bike Erg',
    ski_erg: 'Ski Erg',
    interval_medley: 'Mixed Modality Intervals',
  };

  const phaseIntent: Partial<Record<Phase, string>> = {
    'camp-base': 'Building your aerobic conditioning base.',
    'camp-build': 'Increasing intensity to match fight-level demands.',
    'camp-peak': 'Sharpening sport-specific skills under fatigue.',
    'camp-taper': 'Maintaining feel while minimizing fatigue accumulation.',
    'fight-camp': 'Fight camp conditioning with more transferable engine work.',
    'off-season': 'Off-season conditioning with broader general-engine development.',
    'pre-camp': 'Pre-camp work balancing general output with sport carryover.',
  };

  const message = `${typeLabels[type]}: ${formatSummaryLabel(prescription)}. `
    + (phaseIntent[phase] ? `${phaseIntent[phase]} ` : '')
    + `Intensity: ${intensityLabel}.`;

  return {
    type,
    totalDurationMin: prescription.totalDurationMin,
    rounds: prescription.rounds,
    workIntervalSec: prescription.workIntervalSec,
    restIntervalSec: prescription.restIntervalSec,
    exercises: prescription.exercises,
    intensityLabel,
    message,
    cnsBudget,
    estimatedLoad,
    format: prescription.format,
    circuitRound: prescription.circuitRound,
    timedWork: prescription.timedWork,
  };
}

export function getWeeklyConditioningPlan(
  input: WeeklyConditioningInput,
): { date: string; prescription: ConditioningPrescription }[] {
  if (input.prescriptionsNeeded <= 0) return [];

  const {
    weekStartDate,
    prescriptionsNeeded,
    recurringActivities,
    existingActivities,
    fitnessLevel,
    phase,
    readinessState,
    acwr,
    campConfig,
    activeWeightClassPlan,
  } = input;

  const allTemplateActivities = recurringActivities.filter(
    (activity) => activity.is_active && activity.recurrence.frequency === 'weekly',
  );

  const candidateDays: { date: string; totalLoad: number }[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStartDate, offset);
    const dayOfWeek = dateFromISO(date).getDay();

    const templateForDay = allTemplateActivities.filter((activity) =>
      activity.recurrence.days_of_week?.includes(dayOfWeek),
    );
    const existingForDay = existingActivities.filter((activity) => activity.date === date);

    const hasHighCNS = [...templateForDay, ...existingForDay].some((activity) =>
      activity.activity_type === 'sparring' || activity.activity_type === 'sc',
    );
    if (hasHighCNS) continue;

    const totalLoad = existingForDay.reduce(
      (sum, activity) => sum + (activity.estimated_duration_min * activity.expected_intensity),
      0,
    );

    if (totalLoad < 900) {
      candidateDays.push({ date, totalLoad });
    }
  }

  candidateDays.sort((left, right) => left.totalLoad - right.totalLoad);

  const result: { date: string; prescription: ConditioningPrescription }[] = [];
  const usedDates = new Set<string>();

  for (let index = 0; index < Math.min(prescriptionsNeeded, candidateDays.length); index += 1) {
    const day = candidateDays[index];
    if (usedDates.has(day.date)) continue;

    const cappedIntensity = getBodyMassTrainingIntensityCap(activeWeightClassPlan, day.date);
    const prescription = prescribeConditioning({
      phase,
      fitnessLevel,
      readinessState,
      acwr,
      sessionIndex: index,
      trainingIntensityCapOverride: cappedIntensity,
      campConfig: campConfig ?? undefined,
    });

    result.push({ date: day.date, prescription });
    usedDates.add(day.date);
  }

  return result;
}
