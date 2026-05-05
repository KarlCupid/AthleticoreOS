import {
  generateWeeklyWorkoutProgram,
  validateGeneratedProgram,
} from './index.ts';
import type {
  AthleteTrainingArchetype,
  GeneratedProgram,
  PlannedSessionRole,
  ProtectedWorkoutInput,
  WorkoutReadinessBand,
} from './index.ts';

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
  archetype: AthleteTrainingArchetype;
  readinessBand?: WorkoutReadinessBand;
  protectedWorkouts?: ProtectedWorkoutInput[];
  availableDays?: number[];
  allowSameDaySupportSessions?: boolean;
  goalId?: string;
}): GeneratedProgram {
  return generateWeeklyWorkoutProgram({
    goalId: input.goalId ?? 'boxing_support',
    durationMinutes: 45,
    equipmentIds: ['bodyweight', 'dumbbells', 'resistance_band', 'stationary_bike', 'mat'],
    experienceLevel: input.archetype === 'combat_beginner' ? 'beginner' : 'intermediate',
    readinessBand: input.readinessBand ?? 'green',
    desiredProgramLengthWeeks: 2,
    availableDays: input.availableDays ?? [1, 2, 3, 4, 5, 6],
    protectedWorkouts: input.protectedWorkouts ?? [],
    combatSportContext: {
      archetype: input.archetype,
      allowSameDaySupportSessions: input.allowSameDaySupportSessions ?? false,
    },
  });
}

function week(program: GeneratedProgram, index = 0) {
  const result = program.weeks[index];
  if (!result) throw new Error(`Missing week ${index + 1}`);
  return result;
}

function generatedSessions(program: GeneratedProgram) {
  return week(program).sessions.filter((session) => !session.protectedAnchor);
}

function generatedRoles(program: GeneratedProgram): PlannedSessionRole[] {
  return generatedSessions(program).map((session) => session.sessionRole).filter((role): role is PlannedSessionRole => Boolean(role));
}

function generatedHardCount(program: GeneratedProgram): number {
  return generatedSessions(program).filter((session) => session.plannedIntensity === 'hard').length;
}

function hasBackToBackHardDays(program: GeneratedProgram): boolean {
  return program.weeks.some((programWeek) => {
    const hardDays = programWeek.sessions
      .filter((session) => session.plannedIntensity === 'hard')
      .map((session) => session.dayIndex);
    return hardDays.some((day) => hardDays.includes(day + 1));
  });
}

console.log('\n-- workout programming combat-first planner --');

(() => {
  const program = baseProgram({
    archetype: 'combat_competitive',
    protectedWorkouts: [
      { id: 'boxing-2', label: 'Boxing Skill', dayIndex: 2, durationMinutes: 75, intensity: 'moderate', modality: 'sport_skill' },
      { id: 'boxing-4', label: 'Boxing Skill', dayIndex: 4, durationMinutes: 75, intensity: 'moderate', modality: 'sport_skill' },
    ],
  });
  const validation = validateGeneratedProgram(program);
  const firstWeek = week(program);
  assert('two moderate protected combat sessions validate', validation.valid);
  assert('two moderate protected combat sessions remain anchors', firstWeek.weeklyVolumeSummary.protectedSessionCount === 2);
  assert('moderate protected combat sessions still get at least three generated support sessions', firstWeek.weeklyVolumeSummary.generatedSessionCount >= 3);
  assert('moderate protected combat sessions reach five total exposures', (firstWeek.weeklyVolumeSummary.totalExposureCount ?? 0) >= 5);
  assert('moderate protected combat sessions respect dynamic hard-day cap', firstWeek.hardDayCount <= (firstWeek.weeklyDose?.hardDayCap ?? 3));
  assert('moderate protected combat sessions avoid back-to-back hard days', !hasBackToBackHardDays(program));
})();

(() => {
  const program = baseProgram({
    archetype: 'combat_competitive',
    protectedWorkouts: [
      { id: 'sparring-2', label: 'Hard Sparring', dayIndex: 2, durationMinutes: 75, intensity: 'hard', modality: 'sparring' },
      { id: 'sparring-5', label: 'Hard Sparring', dayIndex: 5, durationMinutes: 75, intensity: 'hard', modality: 'sparring' },
    ],
  });
  const firstWeek = week(program);
  const roles = generatedRoles(program);
  assert('two hard sparring sessions validate', validateGeneratedProgram(program).valid);
  assert('two hard sparring sessions still generate useful support volume', firstWeek.weeklyVolumeSummary.generatedSessionCount >= 2);
  assert('two hard sparring sessions constrain hard generated work', generatedHardCount(program) <= 1);
  assert('two hard sparring sessions respect hard-day cap', firstWeek.hardDayCount <= (firstWeek.weeklyDose?.hardDayCap ?? 3));
  assert('two hard sparring sessions include low-load support', roles.some((role) => ['aerobic_base', 'mobility_prehab', 'recovery', 'accessory'].includes(role)));
})();

(() => {
  const program = baseProgram({
    archetype: 'combat_beginner',
    readinessBand: 'unknown',
    protectedWorkouts: [],
  });
  const roles = generatedRoles(program);
  assert('combat beginner with no anchors validates', validateGeneratedProgram(program).valid);
  assert('combat beginner gets enough generated frequency', week(program).weeklyVolumeSummary.generatedSessionCount >= 3);
  assert('combat beginner includes strength or power support', roles.some((role) => ['strength_power', 'max_strength', 'power'].includes(role)));
  assert('combat beginner includes aerobic or conditioning support', roles.some((role) => ['aerobic_base', 'conditioning_support'].includes(role)));
  assert('combat beginner includes mobility/prehab or recovery support', roles.some((role) => ['mobility_prehab', 'recovery'].includes(role)));
})();

(() => {
  const program = baseProgram({
    archetype: 'combat_competitive',
    readinessBand: 'red',
  });
  const validation = validateGeneratedProgram(program);
  assert('red readiness combat athlete validates', validation.valid);
  assert('red readiness blocks hard generated work', generatedHardCount(program) === 0);
  assert('red readiness keeps generated dose to recovery-sized volume', week(program).weeklyVolumeSummary.generatedSessionCount <= 1);
})();

(() => {
  const program = baseProgram({
    archetype: 'combat_competitive',
    readinessBand: 'yellow',
    protectedWorkouts: [
      { id: 'sparring-3', label: 'Hard Sparring', dayIndex: 3, durationMinutes: 75, intensity: 'hard', modality: 'sparring' },
    ],
  });
  const roles = generatedRoles(program);
  assert('yellow readiness with protected hard work validates', validateGeneratedProgram(program).valid);
  assert('yellow readiness reduces generated hard work', generatedHardCount(program) <= 1);
  assert('yellow readiness preserves low-load frequency', roles.some((role) => ['aerobic_base', 'mobility_prehab', 'recovery', 'accessory'].includes(role)));
})();

(() => {
  const program = baseProgram({
    archetype: 'combat_competitive',
    availableDays: [1, 3, 5],
    allowSameDaySupportSessions: true,
    protectedWorkouts: [
      { id: 'boxing-1', label: 'Boxing Skill', dayIndex: 1, durationMinutes: 75, intensity: 'moderate', modality: 'sport_skill' },
      { id: 'boxing-3', label: 'Boxing Skill', dayIndex: 3, durationMinutes: 75, intensity: 'moderate', modality: 'sport_skill' },
    ],
  });
  const firstWeek = week(program);
  assert('limited availability with same-day support validates', validateGeneratedProgram(program).valid);
  assert('limited availability stacks low-load generated support safely', firstWeek.sessions.some((session) => !session.protectedAnchor && [1, 3].includes(session.dayIndex)));
  assert('limited availability does not under-generate solely because protected days are occupied', firstWeek.weeklyVolumeSummary.generatedSessionCount >= 3);
})();

(() => {
  const program = generateWeeklyWorkoutProgram({
    goalId: 'beginner_strength',
    durationMinutes: 35,
    equipmentIds: ['bodyweight', 'dumbbells', 'mat'],
    experienceLevel: 'beginner',
    readinessBand: 'green',
    sessionsPerWeek: 2,
    desiredProgramLengthWeeks: 2,
    availableDays: [1, 4, 6],
    combatSportContext: { archetype: 'general_fitness_legacy' },
  });
  assert('explicit generic legacy mode validates', validateGeneratedProgram(program).valid);
  assert('explicit generic legacy mode keeps requested generated session count', program.weeks.every((item) => item.weeklyVolumeSummary.generatedSessionCount === 2));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
