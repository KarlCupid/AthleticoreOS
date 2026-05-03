import { recommendNextProgression } from './personalizationEngine.ts';
import type { WorkoutCompletionLog, WorkoutReadinessBand } from './types.ts';

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

function strengthCompletion(overrides: Partial<WorkoutCompletionLog> = {}): WorkoutCompletionLog {
  return {
    workoutId: overrides.workoutId ?? `strength-${overrides.completedAt ?? 'current'}`,
    completedAt: overrides.completedAt ?? '2026-05-01T12:00:00.000Z',
    workoutTypeId: 'strength',
    goalId: 'beginner_strength',
    plannedDurationMinutes: 35,
    actualDurationMinutes: 35,
    sessionRpe: 6,
    painScoreBefore: 1,
    painScoreAfter: 1,
    exerciseResults: [
      {
        exerciseId: 'goblet_squat',
        setsCompleted: 3,
        setsPrescribed: 3,
        repsCompleted: 10,
        repsPrescribed: 10,
        loadUsed: 35,
        actualRpe: 6,
        completedAsPrescribed: true,
      },
    ],
    ...overrides,
  };
}

function zone2Completion(overrides: Partial<WorkoutCompletionLog> = {}): WorkoutCompletionLog {
  return {
    workoutId: overrides.workoutId ?? `zone2-${overrides.completedAt ?? 'current'}`,
    completedAt: overrides.completedAt ?? '2026-05-01T12:00:00.000Z',
    workoutTypeId: 'zone2_cardio',
    goalId: 'zone2_cardio',
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    sessionRpe: 3,
    heartRateZoneCompliance: 0.9,
    painScoreBefore: 0,
    painScoreAfter: 0,
    exerciseResults: [
      {
        exerciseId: 'stationary_bike_zone2',
        setsCompleted: 1,
        durationMinutesCompleted: 30,
        durationMinutesPrescribed: 30,
        heartRateZoneCompliance: 0.9,
        actualRpe: 3,
        completedAsPrescribed: true,
      },
    ],
    ...overrides,
  };
}

function withReadiness(readinessTrend: WorkoutReadinessBand[]) {
  return readinessTrend;
}

function run() {
  console.log('\n-- workout programming progression history --');

  {
    const decision = recommendNextProgression({
      completionLog: strengthCompletion(),
      recentWorkoutCompletions: [
        strengthCompletion({ completedAt: '2026-04-29T12:00:00.000Z', sessionRpe: 6 }),
        strengthCompletion({ completedAt: '2026-04-27T12:00:00.000Z', sessionRpe: 6.5 }),
      ],
    });
    assert('good 3-session trend progresses', decision.direction === 'progress' && /Three similar sessions/.test(decision.reason));
  }

  {
    const decision = recommendNextProgression({
      completionLog: strengthCompletion({ painScoreBefore: 2, painScoreAfter: 2 }),
      recentWorkoutCompletions: [
        strengthCompletion({ completedAt: '2026-04-29T12:00:00.000Z', painScoreBefore: 1, painScoreAfter: 3 }),
        strengthCompletion({ completedAt: '2026-04-27T12:00:00.000Z', painScoreBefore: 1, painScoreAfter: 3 }),
      ],
    });
    assert('pain trend blocks progression', decision.direction === 'regress' && decision.safetyFlags.includes('pain_trend_worsening'));
  }

  {
    const decision = recommendNextProgression({
      completionLog: strengthCompletion({ sessionRpe: 8, exerciseResults: [{ exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 10, repsPrescribed: 10, actualRpe: 8, completedAsPrescribed: true }] }),
      recentWorkoutCompletions: [
        strengthCompletion({ completedAt: '2026-04-29T12:00:00.000Z', sessionRpe: 9 }),
        strengthCompletion({ completedAt: '2026-04-27T12:00:00.000Z', sessionRpe: 9 }),
      ],
    });
    assert('high RPE trend triggers deload or intensity reduction', (decision.direction === 'deload' || decision.direction === 'reduceIntensity') && decision.safetyFlags.some((flag) => flag.includes('rpe') || flag.includes('fatigue')));
  }

  {
    const missed = strengthCompletion({
      exerciseResults: [{ exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 8, repsPrescribed: 10, actualRpe: 8, completedAsPrescribed: true }],
    });
    const decision = recommendNextProgression({
      completionLog: missed,
      recentWorkoutCompletions: [
        strengthCompletion({ completedAt: '2026-04-29T12:00:00.000Z', exerciseResults: [{ exerciseId: 'goblet_squat', setsCompleted: 3, setsPrescribed: 3, repsCompleted: 8, repsPrescribed: 10, actualRpe: 8, completedAsPrescribed: true }] }),
      ],
    });
    assert('repeated missed reps triggers regression', decision.direction === 'regress' && decision.affectedExerciseIds?.includes('goblet_squat') === true);
  }

  {
    const decision = recommendNextProgression({
      completionLog: strengthCompletion({ notes: 'Substitutions used: box_squat' }),
      recentWorkoutCompletions: [
        strengthCompletion({ completedAt: '2026-04-29T12:00:00.000Z', notes: 'Substitutions used: box_squat' }),
      ],
    });
    assert('repeated substitution triggers exercise swap', decision.direction === 'substitute' && /better-fit exercise/.test(decision.userMessage ?? ''));
  }

  {
    const decision = recommendNextProgression({
      completionLog: zone2Completion(),
      recentWorkoutCompletions: [
        zone2Completion({ completedAt: '2026-04-29T12:00:00.000Z', plannedDurationMinutes: 25, actualDurationMinutes: 25 }),
        zone2Completion({ completedAt: '2026-04-27T12:00:00.000Z', plannedDurationMinutes: 25, actualDurationMinutes: 25 }),
      ],
    });
    assert('Zone 2 compliance adds duration', decision.direction === 'progress' && /Add 3-5 minutes/.test(decision.nextAdjustment));
  }

  {
    const decision = recommendNextProgression({
      completionLog: strengthCompletion(),
      readinessTrend: withReadiness(['orange', 'red', 'yellow']),
    });
    assert('poor readiness trend routes to conservative next session', decision.direction === 'reduceVolume' && decision.safetyFlags.includes('readiness_trend_low'));
  }
}

run();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
