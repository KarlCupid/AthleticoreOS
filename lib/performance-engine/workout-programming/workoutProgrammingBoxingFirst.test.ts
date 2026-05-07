import {
  generateWeeklyWorkoutProgram,
  inferProtectedWorkoutModality,
  validateGeneratedProgram,
} from './index.ts';
import { generateWeeklyProgramFromPerformanceState } from './workoutProgramService.ts';
import type {
  BoxingSessionFamily,
  BoxingTrainingContext,
  BoxingTrainingTrack,
  GeneratedProgram,
  ProtectedWorkoutInput,
  WorkoutReadinessBand,
} from './index.ts';
import { mergeProfileRequest } from './workoutServiceShared.ts';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  PASS ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

function baseProgram(input: {
  track: BoxingTrainingTrack;
  readinessBand?: WorkoutReadinessBand;
  protectedWorkouts?: ProtectedWorkoutInput[];
  availableDays?: number[];
  allowSameDaySupportSessions?: boolean;
  fightCampWeeksOut?: number;
  generatedSessionsPerWeek?: number;
  totalExposureTarget?: number;
  goalId?: string;
}): GeneratedProgram {
  const boxingTrainingContext: BoxingTrainingContext = {
    track: input.track,
    allowSameDaySupportSessions: input.allowSameDaySupportSessions ?? false,
  };
  if (input.fightCampWeeksOut != null) boxingTrainingContext.fightCampWeeksOut = input.fightCampWeeksOut;
  if (input.generatedSessionsPerWeek != null) boxingTrainingContext.generatedSessionsPerWeek = input.generatedSessionsPerWeek;
  if (input.totalExposureTarget != null) boxingTrainingContext.totalExposureTarget = input.totalExposureTarget;
  const request: Parameters<typeof generateWeeklyWorkoutProgram>[0] = {
    goalId: input.goalId ?? 'boxing_support',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band', 'stationary_bike', 'mat', 'track_or_road', 'open_space', 'medicine_ball'],
    experienceLevel: input.track === 'aspiring_boxer' ? 'beginner' : 'intermediate',
    readinessBand: input.readinessBand ?? 'green',
    desiredProgramLengthWeeks: 2,
    availableDays: input.availableDays ?? [1, 2, 3, 4, 5, 6],
    protectedWorkouts: input.protectedWorkouts ?? [],
    boxingTrainingContext,
    deloadStrategy: 'none',
  };
  if (input.generatedSessionsPerWeek != null) request.generatedSessionsPerWeek = input.generatedSessionsPerWeek;
  if (input.totalExposureTarget != null) request.totalExposureTarget = input.totalExposureTarget;
  return generateWeeklyWorkoutProgram(request);
}

function week(program: GeneratedProgram, index = 0) {
  const result = program.weeks[index];
  if (!result) throw new Error(`Missing week ${index + 1}`);
  return result;
}

function generatedSessions(program: GeneratedProgram) {
  return week(program).sessions.filter((session) => !session.protectedAnchor && !session.workout?.blocked);
}

function generatedFamilies(program: GeneratedProgram): BoxingSessionFamily[] {
  return generatedSessions(program).map((session) => session.boxingSessionFamily).filter((family): family is BoxingSessionFamily => Boolean(family));
}

function generatedHardCount(program: GeneratedProgram): number {
  return generatedSessions(program).filter((session) => session.plannedIntensity === 'hard').length;
}

function hasHardGeneratedOnProtectedSparringDay(program: GeneratedProgram): boolean {
  return program.weeks.some((programWeek) => {
    const sparringDays = new Set(programWeek.sessions
      .filter((session) => session.protectedAnchor && session.protectedWorkoutModality === 'sparring')
      .map((session) => session.dayIndex));
    return programWeek.sessions.some((session) => !session.protectedAnchor && session.plannedIntensity === 'hard' && sparringDays.has(session.dayIndex));
  });
}

function hasFamily(program: GeneratedProgram, family: BoxingSessionFamily): boolean {
  return generatedFamilies(program).includes(family);
}

function printGolden(label: string, program: GeneratedProgram): void {
  const firstWeek = week(program);
  console.log(`\nGOLDEN ${label}`);
  console.log(`track=${firstWeek.weeklyDose?.track} hardCap=${firstWeek.weeklyDose?.hardDayCap} hardCount=${firstWeek.hardDayCount}`);
  console.log(`ledger=${JSON.stringify(firstWeek.boxingLoadLedger)}`);
  console.log(`gaps=${firstWeek.qualityGaps?.slice(0, 5).map((gap) => `${gap.quality}:${gap.priority}`).join(', ')}`);
  console.log(`variance=${firstWeek.variancePlan?.varianceLevel} ${firstWeek.variancePlan?.reason}`);
  for (const session of firstWeek.sessions) {
    console.log([
      `day=${session.dayIndex}`,
      session.protectedAnchor ? 'protected' : 'generated',
      `modality=${session.protectedWorkoutModality ?? session.boxingSessionFamily ?? 'n/a'}`,
      `role=${session.boxingSessionRole ?? session.sessionRole ?? 'n/a'}`,
      `dose=${session.sessionDoseCategory ?? 'anchor'}`,
      `intensity=${session.plannedIntensity ?? 'n/a'}`,
    ].join(' '));
  }
  console.log(`rationale=${firstWeek.coachRationale?.slice(0, 3).join(' | ')}`);
  console.log(`warnings=${firstWeek.userFacingWarnings?.join(' | ')}`);
}

console.log('\n-- workout programming boxing-first planner --');

(() => {
  const program = baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'boxing-2', label: 'Boxing Skill', dayIndex: 2, durationMinutes: 75, intensity: 'moderate' },
      { id: 'pads-4', label: 'Pads', dayIndex: 4, durationMinutes: 60, intensity: 'moderate' },
    ],
  });
  const firstWeek = week(program);
  assert('A modalities infer boxing_skill and pad_work', firstWeek.sessions.some((session) => session.protectedWorkoutModality === 'boxing_skill') && firstWeek.sessions.some((session) => session.protectedWorkoutModality === 'pad_work'));
  assert('A protected boxing count is two', firstWeek.weeklyVolumeSummary.protectedBoxingSessionCount === 2);
  assert('A generated support sessions are at least three', (firstWeek.weeklyVolumeSummary.generatedSupportSessionCount ?? 0) + (firstWeek.weeklyVolumeSummary.generatedMicrodoseCount ?? 0) >= 3);
  assert('A total exposures reach at least five', (firstWeek.weeklyVolumeSummary.totalExposureCount ?? 0) >= 5);
  assert('A hard-day cap respected', firstWeek.hardDayCount <= (firstWeek.weeklyDose?.hardDayCap ?? 3));
  assert('A validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
      { id: 'sparring-5', label: 'Hard Sparring', dayIndex: 5, durationMinutes: 75, intensity: 'hard' },
    ],
  });
  const families = generatedFamilies(program);
  assert('B modality infers sparring', week(program).sessions.filter((session) => session.protectedWorkoutModality === 'sparring').length === 2);
  assert('B generated support volume remains useful', (week(program).weeklyVolumeSummary.generatedSupportSessionCount ?? 0) + (week(program).weeklyVolumeSummary.generatedMicrodoseCount ?? 0) >= 2);
  assert('B generated hard count capped', generatedHardCount(program) <= 1);
  assert('B no hard generated stacking onto sparring', !hasHardGeneratedOnProtectedSparringDay(program));
  assert('B includes roadwork/mobility/durability/recovery support', families.some((family) => ['roadwork_zone2', 'mobility_prehab', 'shoulder_scap_durability', 'hip_ankle_mobility', 'recovery_reset'].includes(family)));
  assert('B validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({ track: 'aspiring_boxer', readinessBand: 'unknown' });
  const families = generatedFamilies(program);
  assert('C beginner generated exposures are at least three', week(program).weeklyVolumeSummary.generatedSessionCount >= 3);
  assert('C includes boxing progression support', families.some((family) => ['boxing_skill_microdose', 'shadowboxing_quality', 'footwork_agility'].includes(family)));
  assert('C includes strength/power or durability', families.some((family) => ['strength_power', 'max_strength_lower', 'shoulder_scap_durability', 'hip_ankle_mobility'].includes(family)));
  assert('C includes roadwork or mobility/prehab', families.some((family) => ['roadwork_zone2', 'mobility_prehab', 'hip_ankle_mobility'].includes(family)));
  assert('C no sparring generated', !families.some((family) => family.includes('sparring')));
})();

(() => {
  const amateur = baseProgram({ track: 'amateur_open' });
  const pro = baseProgram({ track: 'pro_8_10_round' });
  const amateurRationale = week(amateur).coachRationale?.join(' ') ?? '';
  const proRationale = week(pro).coachRationale?.join(' ') ?? '';
  assert('D amateur/pro plans have different tracks', week(amateur).weeklyDose?.track !== week(pro).weeklyDose?.track);
  assert('D amateur emphasizes pace/agility/repeat output', /repeat-output|agility|Amateur/i.test(amateurRationale));
  assert('D pro emphasizes pacing/aerobic/durability/recovery', /pacing durability|aerobic|durability|Pro/i.test(proRationale));
  assert('D both validate', validateGeneratedProgram(amateur).valid && validateGeneratedProgram(pro).valid);
})();

(() => {
  const program = baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'roadwork-1', label: 'Roadwork', dayIndex: 1, durationMinutes: 45, intensity: 'low' },
    ],
  });
  const families = generatedFamilies(program);
  assert('E protected roadwork count increments', week(program).weeklyDose?.protectedRoadworkCount === 1);
  assert('E additional roadwork target reduced', week(program).weeklyDose?.roadworkAerobicTarget === 0);
  assert('E strength/power and boxing support still generated', families.some((family) => ['strength_power', 'max_strength_lower'].includes(family)) && families.some((family) => ['footwork_agility', 'shadowboxing_quality', 'mobility_prehab'].includes(family)));
  assert('E validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({ track: 'pro_12_round', fightCampWeeksOut: 1 });
  const families = generatedFamilies(program);
  assert('F taper has no reckless hard S&C', generatedHardCount(program) === 0);
  assert('F taper is maintenance/recovery/mobility/technical-light only', families.every((family) => ['recovery_reset', 'shoulder_scap_durability', 'shadowboxing_quality', 'mobility_prehab'].includes(family)));
  assert('F validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({ track: 'amateur_open', readinessBand: 'red' });
  assert('G red readiness has zero hard generated work', generatedHardCount(program) === 0);
  assert('G red readiness is recovery/microdose only', generatedSessions(program).every((session) => ['recovery_reset', 'microdose'].includes(session.sessionDoseCategory ?? '')));
  assert('G validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({
    track: 'pro_development',
    readinessBand: 'orange',
    protectedWorkouts: [
      { id: 'sparring-3', label: 'Hard Sparring', dayIndex: 3, durationMinutes: 75, intensity: 'hard' },
    ],
  });
  assert('H orange readiness with sparring reduces hard generated work', generatedHardCount(program) === 0);
  assert('H orange readiness preserves useful low-load frequency', generatedSessions(program).length >= 2);
  assert('H validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const grappling = { id: 'grappling', label: 'Grappling', dayIndex: 2, durationMinutes: 75, intensity: 'moderate' as const };
  const program = baseProgram({ track: 'amateur_open', protectedWorkouts: [grappling] });
  const legacy = baseProgram({ track: 'general_fitness_legacy', goalId: 'beginner_strength', protectedWorkouts: [grappling], generatedSessionsPerWeek: 2 });
  assert('I grappling infers external non-boxing load', inferProtectedWorkoutModality(grappling) === 'external_non_boxing_load');
  assert('I explicit boxing context plans around external load', week(program).sessions.some((session) => session.protectedWorkoutModality === 'external_non_boxing_load') && week(program).weeklyVolumeSummary.generatedSessionCount >= 3);
  assert('I explicit general fitness legacy remains conservative', week(legacy).weeklyDose?.track === 'general_fitness_legacy' && week(legacy).weeklyVolumeSummary.generatedSessionCount === 2);
})();

(() => {
  const program = baseProgram({
    track: 'amateur_open',
    availableDays: [1, 3, 5],
    allowSameDaySupportSessions: true,
    protectedWorkouts: [
      { id: 'boxing-1', label: 'Boxing Skill', dayIndex: 1, durationMinutes: 75, intensity: 'moderate' },
      { id: 'boxing-3', label: 'Boxing Skill', dayIndex: 3, durationMinutes: 75, intensity: 'moderate' },
    ],
  });
  assert('J low-load support stacks safely', week(program).sessions.some((session) => !session.protectedAnchor && [1, 3].includes(session.dayIndex)));
  assert('J protected duration counted', (week(program).weeklyVolumeSummary.estimatedMinutes ?? 0) >= 150);
  assert('J does not under-generate because protected days are occupied', week(program).weeklyVolumeSummary.generatedSessionCount >= 3);
})();

(() => {
  const merged = mergeProfileRequest('service-user', {
    userId: 'service-user',
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
    safetyFlags: [],
    dislikedExerciseIds: [],
    likedExerciseIds: [],
    preferredDurationMinutes: 35,
    readinessBand: 'green',
    painFlags: [],
  }, {
    goalId: 'boxing_support',
    boxingTrainingContext: { track: 'amateur_open', generatedSessionsPerWeek: 5, totalExposureTarget: 7 },
    generatedSessionsPerWeek: 5,
    totalExposureTarget: 7,
  });
  assert('K merge preserves boxingTrainingContext', merged.boxingTrainingContext?.track === 'amateur_open');
  assert('K merge preserves generatedSessionsPerWeek and totalExposureTarget', merged.generatedSessionsPerWeek === 5 && merged.totalExposureTarget === 7);
})();

(() => {
  const beginner = baseProgram({ track: 'aspiring_boxer' });
  const open = baseProgram({ track: 'amateur_open' });
  const taper = baseProgram({ track: 'pro_8_10_round', fightCampWeeksOut: 1 });
  assert('L variance plan exists', Boolean(week(open).variancePlan));
  assert('L beginner/taper lower variance than open/development', week(beginner).variancePlan?.varianceLevel === 'low' && week(taper).variancePlan?.varianceLevel === 'low' && week(open).variancePlan?.varianceLevel === 'moderate');
  assert('L variance preserves adaptation families', hasFamily(open, 'max_strength_lower') || hasFamily(open, 'strength_power'));
})();

(async () => {
  const program = await generateWeeklyProgramFromPerformanceState({
    request: {
      goalId: 'boxing_support',
      boxingTrainingContext: { track: 'amateur_open', generatedSessionsPerWeek: 4, totalExposureTarget: 6 },
      generatedSessionsPerWeek: 4,
      totalExposureTarget: 6,
      equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band', 'mat', 'track_or_road'],
      experienceLevel: 'intermediate',
      readinessBand: 'green',
    },
    desiredProgramLengthWeeks: 1,
  });
  assert('K performance-state passthrough preserves boxing context', week(program).weeklyDose?.track === 'amateur_open' && week(program).weeklyDose?.totalExposureTarget === 6);

  printGolden('beginner starting boxing', baseProgram({ track: 'aspiring_boxer', goalId: 'boxing_support' }));
  printGolden('amateur open skill and pads', baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'boxing-2', label: 'Boxing Skill', dayIndex: 2, durationMinutes: 75, intensity: 'moderate' },
      { id: 'pads-4', label: 'Pads', dayIndex: 4, durationMinutes: 60, intensity: 'moderate' },
    ],
  }));
  printGolden('amateur open hard sparring', baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
      { id: 'sparring-5', label: 'Hard Sparring', dayIndex: 5, durationMinutes: 75, intensity: 'hard' },
    ],
  }));
  printGolden('pro 8-10 round track', baseProgram({ track: 'pro_8_10_round' }));
  printGolden('pro 12 round taper one week out', baseProgram({ track: 'pro_12_round', fightCampWeeksOut: 1 }));

  console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
