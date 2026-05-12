import {
  generateSingleSessionWorkout,
  generateWeeklyWorkoutProgram,
  inferProtectedWorkoutModality,
  auditBoxingExerciseMediaReadiness,
  auditBoxingExerciseMediaReleaseReadiness,
  contributionForGeneratedSession,
  evaluateBoxingProgressionForFamily,
  templateIdForBoxingFamily,
  validateGeneratedProgram,
  validateWorkoutProgrammingCatalog,
  workoutProgrammingCatalog,
} from './index.ts';
import { generateWeeklyProgramFromPerformanceState } from './workoutProgramService.ts';
import type {
  BoxingSessionFamily,
  BoxingAthleteSupportDomain,
  BoxingTrainingContext,
  BoxingTrainingTrack,
  GeneratedProgram,
  GeneratedWorkout,
  ProtectedWorkoutInput,
  WorkoutCompletionLog,
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
  safetyFlags?: string[];
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
    safetyFlags: input.safetyFlags ?? [],
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

function generatedDomainCount(program: GeneratedProgram, domain: BoxingAthleteSupportDomain): number {
  return generatedSessions(program).filter((session) => session.athleticDevelopmentDomain === domain).length;
}

function generatedTemplateIds(program: GeneratedProgram): string[] {
  return generatedSessions(program)
    .map((session) => session.workout?.templateId)
    .filter((templateId): templateId is string => Boolean(templateId));
}

function hasTemplateFallbackTrace(workout: GeneratedWorkout | null): boolean {
  return workout?.decisionTrace?.some((entry) => (
    /fallback|rejected|preferred_session_template_rejected|boxing_family_template_rejected/i.test(entry.step)
    || /could not be used|fallback/i.test(entry.reason)
  )) ?? false;
}

function boxingIntentTemplatesBound(program: GeneratedProgram): boolean {
  return generatedSessions(program).every((session) => {
    if (!session.boxingSessionFamily || !session.workout) return true;
    return session.workout.templateId === templateIdForBoxingFamily(session.boxingSessionFamily)
      || hasTemplateFallbackTrace(session.workout);
  });
}

function completion(update: Partial<WorkoutCompletionLog>): WorkoutCompletionLog {
  return {
    workoutId: update.workoutId ?? 'workout',
    completedAt: update.completedAt ?? '2026-05-01T00:00:00.000Z',
    plannedDurationMinutes: update.plannedDurationMinutes ?? 30,
    actualDurationMinutes: update.actualDurationMinutes ?? 30,
    sessionRpe: update.sessionRpe ?? 5,
    exerciseResults: update.exerciseResults ?? [],
    ...update,
  };
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
      `template=${session.workout?.templateId ?? 'protected'}`,
    ].join(' '));
  }
  console.log(`rationale=${firstWeek.coachRationale?.slice(0, 3).join(' | ')}`);
  console.log(`warnings=${firstWeek.userFacingWarnings?.join(' | ')}`);
}

console.log('\n-- workout programming boxing-first planner --');

(() => {
  const cases: Array<[string, NonNullable<ProtectedWorkoutInput['modality']>, ReturnType<typeof inferProtectedWorkoutModality>]> = [
    ['Boxing Skill', 'sport_skill', 'boxing_skill'],
    ['Pads', 'sport_skill', 'pad_work'],
    ['Heavy Bag', 'sport_skill', 'bag_work'],
    ['Shadowboxing', 'sport_skill', 'shadowboxing'],
    ['Grappling', 'sport_skill', 'external_non_boxing_load'],
    ['MMA Practice', 'sport_skill', 'external_non_boxing_load'],
    ['Wrestling', 'sport_skill', 'external_non_boxing_load'],
    ['Muay Thai', 'sport_skill', 'external_non_boxing_load'],
  ];
  for (const [label, modality, expected] of cases) {
    assert(`A0 deprecated sport_skill ${label} -> ${expected}`, inferProtectedWorkoutModality({
      label,
      modality,
    }) === expected);
  }
})();

(() => {
  const familyCases: Array<{
    family: BoxingSessionFamily;
    goalId: string;
    expectedTemplateIds: string[];
    experienceLevel?: 'beginner' | 'intermediate';
  }> = [
    { family: 'boxing_skill_microdose', goalId: 'boxing_skill_microdose', expectedTemplateIds: ['boxing_skill_microdose'], experienceLevel: 'beginner' },
    { family: 'footwork_agility', goalId: 'footwork_agility', expectedTemplateIds: ['footwork_agility'], experienceLevel: 'beginner' },
    { family: 'shadowboxing_quality', goalId: 'shadowboxing_quality', expectedTemplateIds: ['shadowboxing_quality'], experienceLevel: 'beginner' },
    { family: 'roadwork_zone2', goalId: 'roadwork_aerobic_base', expectedTemplateIds: ['boxing_roadwork_zone2'], experienceLevel: 'beginner' },
    { family: 'roadwork_tempo', goalId: 'roadwork_tempo', expectedTemplateIds: ['boxing_roadwork_tempo'] },
    { family: 'roadwork_intervals', goalId: 'roadwork_intervals', expectedTemplateIds: ['boxing_roadwork_intervals'] },
    { family: 'alactic_repeat_power', goalId: 'alactic_repeat_power', expectedTemplateIds: ['boxing_alactic_repeat_power'] },
    { family: 'glycolytic_round_tolerance', goalId: 'glycolytic_round_tolerance', expectedTemplateIds: ['boxing_glycolytic_round_tolerance'] },
    { family: 'rotational_power', goalId: 'rotational_power', expectedTemplateIds: ['boxing_rotational_power'] },
    { family: 'trunk_durability', goalId: 'trunk_rotation_durability', expectedTemplateIds: ['boxing_trunk_durability'], experienceLevel: 'beginner' },
    { family: 'shoulder_scap_durability', goalId: 'shoulder_scap_durability', expectedTemplateIds: ['boxing_shoulder_scap_durability'], experienceLevel: 'beginner' },
    { family: 'neck_trap_durability', goalId: 'neck_trap_durability', expectedTemplateIds: ['boxing_neck_trap_durability'], experienceLevel: 'beginner' },
    { family: 'hip_ankle_mobility', goalId: 'hip_ankle_mobility', expectedTemplateIds: ['boxing_hip_ankle_mobility'], experienceLevel: 'beginner' },
    { family: 'recovery_reset', goalId: 'recovery_reset', expectedTemplateIds: ['boxing_recovery_reset'], experienceLevel: 'beginner' },
  ];
  for (const item of familyCases) {
    const workout: GeneratedWorkout = generateSingleSessionWorkout({
      goalId: item.goalId,
      durationMinutes: item.family === 'roadwork_zone2' ? 35 : 30,
      equipmentIds: ['bodyweight', 'open_space', 'mat', 'track_or_road', 'medicine_ball', 'resistance_band', 'stationary_bike'],
      experienceLevel: item.experienceLevel ?? 'intermediate',
      readinessBand: 'green',
      intendedBoxingSessionFamily: item.family,
      intendedSessionDoseCategory: item.family === 'boxing_skill_microdose' ? 'microdose' : 'support_session',
      preferredSessionTemplateId: templateIdForBoxingFamily(item.family),
    });
    assert(`B0 ${item.family} uses boxing-specific template`, item.expectedTemplateIds.includes(workout.templateId));
    assert(`B0 ${item.family} respects intent-template binding`, workout.templateId === templateIdForBoxingFamily(item.family) || hasTemplateFallbackTrace(workout));
    assert(`B0 ${item.family} validates`, workout.validation?.isValid === true);
    assert(`B0 ${item.family} is not generic fallback`, !['mobility_flow', 'zone2_cardio', 'low_impact_conditioning', 'boxing_support'].includes(workout.templateId));
  }
})();

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
  assert('A protected boxing covers practice so skill support is capped', generatedDomainCount(program, 'boxing_skill_support') <= 1);
  assert('A S&C support includes strength/power', generatedDomainCount(program, 'strength') + generatedDomainCount(program, 'power') >= 1);
  assert('A S&C support includes roadwork or conditioning', generatedDomainCount(program, 'roadwork') + generatedDomainCount(program, 'conditioning') >= 1);
  assert('A S&C support includes durability or mobility', generatedDomainCount(program, 'durability') + generatedDomainCount(program, 'mobility') >= 1);
  assert('A summary says protected anchors cover boxing practice', /covered|protected boxing anchor/i.test(firstWeek.weeklyAthleticDevelopmentSummary ?? '') && /cover boxing practice/i.test(firstWeek.protectedBoxingPracticeSummary ?? ''));
  assert('A total exposures reach at least five', (firstWeek.weeklyVolumeSummary.totalExposureCount ?? 0) >= 5);
  assert('A hard-day cap respected', firstWeek.hardDayCount <= (firstWeek.weeklyDose?.hardDayCap ?? 3));
  assert('A validation passes', validateGeneratedProgram(program).valid);
  assert('A selected templates include boxing support', generatedTemplateIds(program).some((templateId) => templateId.startsWith('boxing_') || templateId === 'footwork_agility'));
  assert('A planner intents bind to templates or explain fallback', boxingIntentTemplatesBound(program));
  assert('A UI-ready boxing copy exists', Boolean(firstWeek.weeklyBoxingHeadline && firstWeek.weeklyBoxingSummary && firstWeek.nextBestAction && firstWeek.coachSummaryBullets?.length));
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
  assert('B generated hard conditioning is capped', (week(program).weeklyDose?.generatedConditioningHardCap ?? 99) === 0);
  assert('B no hard generated stacking onto sparring', !hasHardGeneratedOnProtectedSparringDay(program));
  assert('B no generated sparring template', !generatedTemplateIds(program).some((templateId) => /sparring/i.test(templateId)));
  assert('B includes roadwork/mobility/durability/recovery support', families.some((family) => ['roadwork_zone2', 'mobility_prehab', 'shoulder_scap_durability', 'hip_ankle_mobility', 'recovery_reset'].includes(family)));
  assert('B nutrition demand stays supportive around sparring', generatedSessions(program).every((session) => session.expectedFuelPriority !== 'conditioning_intervals' || session.plannedIntensity !== 'hard'));
  assert('B selected support is boxing-relevant', generatedTemplateIds(program).some((templateId) => templateId.startsWith('boxing_')));
  assert('B intent-template binding holds or warns', boxingIntentTemplatesBound(program));
  assert('B validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = generateWeeklyWorkoutProgram({
    goalId: 'boxing_support',
    durationMinutes: 60,
    preferredDurationMinutes: 60,
    equipmentIds: ['bodyweight', 'dumbbells', 'barbell', 'kettlebell', 'resistance_band', 'medicine_ball', 'sled', 'battle_rope', 'assault_bike', 'rowing_machine', 'jump_rope', 'mat', 'track_or_road', 'open_space'],
    experienceLevel: 'advanced',
    readinessBand: 'green',
    workoutEnvironment: 'gym',
    desiredProgramLengthWeeks: 4,
    sessionsPerWeek: 6,
    availableDays: [2, 3, 4, 5, 6, 7],
    protectedWorkouts: [
      { id: 'sparring-wed', label: 'Sparring', dayIndex: 2, durationMinutes: 60, protectedDurationMinutes: 60, intensity: 'hard', estimatedRpe: 7, countsAsHardDay: true, modality: 'sparring' },
      { id: 'sparring-sat', label: 'Sparring', dayIndex: 5, durationMinutes: 60, protectedDurationMinutes: 60, intensity: 'hard', estimatedRpe: 7, countsAsHardDay: true, modality: 'sparring' },
    ],
    boxingTrainingContext: {
      track: 'amateur_open',
      buildPhaseGoalType: 'conditioning',
      buildPhaseSecondaryConstraint: 'protect_recovery',
      allowSameDaySupportSessions: false,
      sparringSessionsPerWeek: 2,
      roundCount: 3,
      roundMinutes: 3,
      restSeconds: 60,
    },
    startDate: '2026-05-12',
    deloadStrategy: 'none',
  });
  const firstWeek = week(program);
  const families = generatedFamilies(program);
  assert('B2 conditioning build with Tuesday unavailable does not generate Tuesday training', !firstWeek.sessions.some((session) => !session.protectedAnchor && session.dayIndex === 1));
  assert('B2 conditioning build keeps protected Wednesday and Saturday sparring anchored', firstWeek.sessions.filter((session) => session.protectedAnchor && session.protectedWorkoutModality === 'sparring').map((session) => session.dayIndex).join(',') === '2,5');
  assert('B2 conditioning build includes low-load roadwork instead of recovery-only support', families.includes('roadwork_zone2') && generatedDomainCount(program, 'roadwork') >= 1);
  assert('B2 conditioning build creates future weeks for plan look-ahead', program.weeks.length === 4 && program.sessions.some((session) => session.weekIndex === 4));
  assert('B2 conditioning build validates', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({ track: 'aspiring_boxer', readinessBand: 'unknown' });
  const families = generatedFamilies(program);
  assert('C beginner generated exposures are at least three', week(program).weeklyVolumeSummary.generatedSessionCount >= 3);
  assert('C includes boxing progression support', families.some((family) => ['boxing_skill_microdose', 'shadowboxing_quality', 'footwork_agility'].includes(family)));
  assert('C includes strength/power or durability', families.some((family) => ['strength_power', 'max_strength_lower', 'shoulder_scap_durability', 'hip_ankle_mobility'].includes(family)));
  assert('C includes roadwork or mobility/prehab', families.some((family) => ['roadwork_zone2', 'mobility_prehab', 'hip_ankle_mobility'].includes(family)));
  assert('C aspiring boxer is not only skill drills', new Set(generatedSessions(program).map((session) => session.athleticDevelopmentDomain)).size >= 3);
  assert('C no sparring generated', !families.some((family) => family.includes('sparring')));
  assert('C uses boxing-specific templates', generatedTemplateIds(program).some((templateId) => templateId.startsWith('boxing_') || ['footwork_agility', 'shadowboxing_quality'].includes(templateId)));
  assert('C exposes boxing-specific next action', /boxing|session|readiness|support/i.test(week(program).nextBestAction ?? ''));
})();

(() => {
  const amateur = baseProgram({ track: 'amateur_open' });
  const pro = baseProgram({ track: 'pro_8_10_round' });
  const amateurRationale = week(amateur).coachRationale?.join(' ') ?? '';
  const proRationale = week(pro).coachRationale?.join(' ') ?? '';
  assert('D amateur/pro plans have different tracks', week(amateur).weeklyDose?.track !== week(pro).weeklyDose?.track);
  assert('D amateur emphasizes pace/agility/repeat output', /repeat-output|agility|Amateur/i.test(amateurRationale));
  assert('D pro emphasizes pacing/aerobic/durability/recovery', /pacing durability|aerobic|durability|Pro/i.test(proRationale));
  assert('D pro has S&C support bias', (week(pro).weeklyVolumeSummary.generatedSAndCSessionCount ?? 0) >= (week(pro).weeklyVolumeSummary.generatedSkillSupportCount ?? 0));
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
  assert('E selected templates remain plausible', generatedTemplateIds(program).some((templateId) => templateId.startsWith('boxing_') || templateId === 'lower_strength'));
  assert('E validation passes', validateGeneratedProgram(program).valid);
})();

(() => {
  const program = baseProgram({ track: 'pro_12_round', fightCampWeeksOut: 1 });
  const families = generatedFamilies(program);
  assert('F taper has no reckless hard S&C', generatedHardCount(program) === 0);
  assert('F taper is maintenance/recovery/mobility/technical-light only', families.every((family) => ['recovery_reset', 'shoulder_scap_durability', 'shadowboxing_quality', 'mobility_prehab'].includes(family)));
  assert('F taper templates are recovery/mobility/technical-light', generatedTemplateIds(program).every((templateId) => ['boxing_recovery_reset', 'boxing_shoulder_scap_durability', 'shadowboxing_quality'].includes(templateId)));
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

(() => {
  const easyRoadwork = [
    completion({ workoutId: 'road-1', goalId: 'roadwork_aerobic_base', workoutTypeId: 'zone2_cardio', sessionRpe: 4, actualDurationMinutes: 35 }),
    completion({ workoutId: 'road-2', goalId: 'roadwork_aerobic_base', workoutTypeId: 'zone2_cardio', sessionRpe: 5, actualDurationMinutes: 38 }),
  ];
  const roadworkDecision = evaluateBoxingProgressionForFamily({ family: 'roadwork_zone2', recentWorkoutCompletions: easyRoadwork });
  const hardAlacticDecision = evaluateBoxingProgressionForFamily({
    family: 'alactic_repeat_power',
    recentWorkoutCompletions: [completion({ workoutId: 'alactic-hard', goalId: 'alactic_repeat_power', sessionRpe: 9.5 })],
    feedbackTags: ['too_hard'],
  });
  const shoulderDecision = evaluateBoxingProgressionForFamily({
    family: 'shoulder_scap_durability',
    recentWorkoutCompletions: [completion({ workoutId: 'shoulder', goalId: 'shoulder_scap_durability', sessionRpe: 5, painScoreBefore: 1, painScoreAfter: 4 })],
  });
  const missedDecision = evaluateBoxingProgressionForFamily({
    family: 'roadwork_zone2',
    recentWorkoutCompletions: [
      completion({ workoutId: 'missed-1', goalId: 'roadwork_aerobic_base', completionStatus: 'abandoned', sessionRpe: 7 }),
      completion({ workoutId: 'missed-2', goalId: 'roadwork_aerobic_base', completionStatus: 'stopped', sessionRpe: 6 }),
    ],
    feedbackTags: ['missed'],
  });
  assert('M roadwork easy completions progress volume', roadworkDecision.action === 'progress_volume' && (roadworkDecision.doseTargetDelta ?? 0) > 0);
  assert('M hard alactic too hard does not intensify', ['repeat', 'regress'].includes(hardAlacticDecision.action));
  assert('M shoulder pain increase triggers regress or coach review', ['regress', 'coach_review'].includes(shoulderDecision.action));
  assert('M missed sessions reduce variance or deload', missedDecision.action === 'deload' && missedDecision.varianceLevelOverride === 'low');
})();

(() => {
  const noRunning = generateSingleSessionWorkout({
    goalId: 'roadwork_aerobic_base',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'stationary_bike', 'mat', 'open_space'],
    experienceLevel: 'beginner',
    safetyFlags: ['no_running'],
    readinessBand: 'green',
    intendedBoxingSessionFamily: 'roadwork_zone2',
    preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_zone2'),
  });
  const selectedExerciseIds = noRunning.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));
  const modalities = noRunning.blocks.flatMap((block) => block.exercises.map((exercise) => {
    const payload = exercise.prescription.payload as { modality?: string };
    return payload.modality ?? '';
  }));
  assert('N no_running roadwork uses non-running fallback', !selectedExerciseIds.some((id) => /run|roadwork/.test(id)) && !modalities.includes('run'));

  const shoulderSafe = generateSingleSessionWorkout({
    goalId: 'shoulder_scap_durability',
    durationMinutes: 25,
    equipmentIds: ['bodyweight', 'resistance_band', 'mat', 'open_space'],
    experienceLevel: 'beginner',
    safetyFlags: ['shoulder_caution'],
    readinessBand: 'green',
    intendedBoxingSessionFamily: 'shoulder_scap_durability',
    preferredSessionTemplateId: templateIdForBoxingFamily('shoulder_scap_durability'),
  });
  const shoulderExerciseIds = shoulderSafe.blocks.flatMap((block) => block.exercises.map((exercise) => exercise.exerciseId));
  assert('N shoulder caution produces safe shoulder durability', shoulderSafe.validation?.isValid === true && !shoulderExerciseIds.some((id) => /overhead|press_heavy|max/.test(id)));
})();

(() => {
  const limited = baseProgram({
    track: 'amateur_open',
    availableDays: [1, 3],
    allowSameDaySupportSessions: true,
    protectedWorkouts: [
      { id: 'boxing-1', label: 'Boxing Skill', dayIndex: 1, durationMinutes: 75, intensity: 'moderate' },
      { id: 'boxing-3', label: 'Boxing Skill', dayIndex: 3, durationMinutes: 75, intensity: 'moderate' },
    ],
  });
  assert('O only two days avoids unsafe hard stacking', generatedHardCount(limited) <= 1 && !hasHardGeneratedOnProtectedSparringDay(limited));
  assert('O limited availability still stacks low-load support', generatedSessions(limited).some((session) => [1, 3].includes(session.dayIndex) && session.plannedIntensity !== 'hard'));

  const packed = baseProgram({
    track: 'amateur_elite',
    allowSameDaySupportSessions: true,
    protectedWorkouts: [
      { id: 'boxing-1', label: 'Boxing Skill', dayIndex: 1, durationMinutes: 75, intensity: 'moderate' },
      { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
      { id: 'pads-3', label: 'Pads', dayIndex: 3, durationMinutes: 60, intensity: 'moderate' },
      { id: 'boxing-4', label: 'Boxing Skill', dayIndex: 4, durationMinutes: 75, intensity: 'moderate' },
      { id: 'sparring-5', label: 'Hard Sparring', dayIndex: 5, durationMinutes: 75, intensity: 'hard' },
      { id: 'bag-6', label: 'Heavy Bag', dayIndex: 6, durationMinutes: 45, intensity: 'moderate' },
    ],
  });
  assert('O heavy protected boxing week avoids extra conditioning', generatedFamilies(packed).every((family) => !['glycolytic_round_tolerance', 'roadwork_intervals', 'alactic_repeat_power'].includes(family)) && generatedHardCount(packed) <= 1);
})();

(() => {
  const incompatible = generateSingleSessionWorkout({
    goalId: 'roadwork_intervals',
    durationMinutes: 12,
    equipmentIds: ['bodyweight'],
    experienceLevel: 'beginner',
    safetyFlags: ['poor_readiness', 'no_running'],
    readinessBand: 'red',
    intendedBoxingSessionFamily: 'roadwork_intervals',
    preferredSessionTemplateId: templateIdForBoxingFamily('roadwork_intervals'),
  });
  assert('P incompatible boxing template safely falls back with warning', incompatible.workoutTypeId === 'recovery' && hasTemplateFallbackTrace(incompatible));

  const redPro = baseProgram({ track: 'pro_development', readinessBand: 'red' });
  assert('P red readiness plus pro track has zero hard generated work', generatedHardCount(redPro) === 0 && validateGeneratedProgram(redPro).valid);

  const legacy = baseProgram({ track: 'general_fitness_legacy', goalId: 'beginner_strength', generatedSessionsPerWeek: 2 });
  assert('P explicit legacy preserves non-boxing track', week(legacy).weeklyDose?.track === 'general_fitness_legacy' && week(legacy).weeklyVolumeSummary.generatedSessionCount === 2);
})();

(() => {
  const program = baseProgram({
    track: 'amateur_open',
    protectedWorkouts: [
      { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard' },
      { id: 'sparring-4', label: 'Hard Sparring', dayIndex: 4, durationMinutes: 75, intensity: 'hard' },
    ],
  });
  const downgraded = generatedSessions(program).find((session) => session.rationale?.some((line) => /downgraded|converted/.test(line)));
  assert('Q hard downgrade credits actual low-load support', !downgraded || (contributionForGeneratedSession(downgraded).glycolyticRounds === 0 && contributionForGeneratedSession(downgraded).mobilityMinutes > 0));
})();

(() => {
  const report = auditBoxingExerciseMediaReadiness(workoutProgrammingCatalog);
  assert('R boxing media readiness counts boxing exercises', report.boxingExerciseCount > 0);
  assert('R boxing missing media exposes alt text, reason, and safe text fallback', report.needingMediaCount > 0 && report.items.filter((item) => item.needsMedia).every((item) => item.hasAltText && item.hasMissingReason && item.safeTextOnlyFallbackAvailable));
  const releaseReport = auditBoxingExerciseMediaReleaseReadiness(workoutProgrammingCatalog, { productionMode: true });
  assert('R boxing media release readiness accepts safe text-only pending media', releaseReport.ready && releaseReport.issues.length === 0);
  const brokenCatalog = {
    ...workoutProgrammingCatalog,
    exercises: workoutProgrammingCatalog.exercises.map((exercise) => exercise.id === 'boxing_stance_breathing_reset'
      ? {
        ...exercise,
        media: {
          ...exercise.media,
          altText: '',
          missingReason: '',
          priority: 'high' as const,
        },
        setupInstructions: [],
      }
      : exercise),
  };
  const brokenReport = auditBoxingExerciseMediaReleaseReadiness(brokenCatalog, { productionMode: true });
  assert('R boxing media release readiness fails missing alt reason or text fallback', !brokenReport.ready && brokenReport.issues.some((issue) => issue.id === 'boxing_stance_breathing_reset'));
})();

(() => {
  const validation = validateWorkoutProgrammingCatalog();
  assert('I0 content validation catalog passes', validation.isValid === true);
  if (!validation.isValid) {
    console.error(validation.errors.join('\n'));
  }
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
