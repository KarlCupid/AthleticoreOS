import {
  generatedCompletionSurfacesToAnalyticsSessions,
  generatedCompletionSurfacesToHistoryEntries,
  mapGeneratedCompletionToAnalyticsSession,
  mapGeneratedCompletionToHistoryEntry,
  mergeWorkoutAnalyticsSessions,
  mergeWorkoutHistoryEntries,
  type GeneratedWorkoutCompletionSurface,
} from './historyAnalyticsAdapter.ts';
import type { WorkoutLogRow } from '../../engine/types.ts';
import type { ProgressionDecision, WorkoutCompletionLog } from './types.ts';

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

const progressionDecision: ProgressionDecision = {
  direction: 'progress',
  decision: 'progress',
  reason: 'All sets landed with manageable effort.',
  nextAdjustment: 'Add one rep to the main strength block.',
  safetyFlags: [],
  userMessage: 'Add one rep next time.',
};

const generatedCompletion: WorkoutCompletionLog = {
  id: 'completion-generated-1',
  workoutId: 'generated-workout-1',
  generatedWorkoutId: 'generated-workout-1',
  source: 'generated_workout',
  completedAt: '2026-05-01T17:30:00.000Z',
  workoutTypeId: 'bodyweight_strength',
  goalId: 'strength_foundation',
  completionStatus: 'partial',
  substitutionsUsed: ['incline_push_up'],
  plannedDurationMinutes: 35,
  actualDurationMinutes: 32,
  sessionRpe: 7,
  painScoreBefore: 2,
  painScoreAfter: 3,
  notes: 'Solid session.',
  exerciseResults: [
    {
      exerciseId: 'push_up',
      setsCompleted: 3,
      setsPrescribed: 3,
      repsCompleted: 24,
      repsPrescribed: 30,
      actualRpe: 7,
      completedAsPrescribed: true,
    },
    {
      exerciseId: 'split_squat',
      setsCompleted: 1,
      setsPrescribed: 3,
      repsCompleted: 8,
      repsPrescribed: 24,
      actualRpe: 8,
      completedAsPrescribed: false,
    },
  ],
};

const generatedSurface: GeneratedWorkoutCompletionSurface = {
  completion: generatedCompletion,
  progressionDecision,
};

const legacyHistory: WorkoutLogRow = {
  id: 'legacy-log-1',
  user_id: 'user-1',
  date: '2026-04-30',
  workout_type: 'strength',
  focus: 'full_body',
  total_volume: 1000,
  total_sets: 8,
  session_rpe: 6,
  duration_minutes: 40,
  notes: null,
};

function run() {
  console.log('\n-- workout programming history and analytics adapter --');

  const historyEntry = mapGeneratedCompletionToHistoryEntry(generatedSurface);
  assert('generated completion maps into history view', historyEntry.source === 'generated' && historyEntry.sourceLabel === 'Generated session');
  assert('history preserves generated workout type and goal', historyEntry.workoutTypeId === 'bodyweight_strength' && historyEntry.goalId === 'strength_foundation');
  assert('history preserves RPE and pain metrics', historyEntry.session_rpe === 7 && historyEntry.painScoreBefore === 2 && historyEntry.painScoreAfter === 3);
  assert('history preserves completion status', historyEntry.completionStatus === 'partial');
  assert('history preserves completed exercise count', historyEntry.exercisesCompleted === 2 && historyEntry.exercisesPrescribed === 2);
  assert('history preserves substitutions used', historyEntry.substitutionsUsed.includes('incline_push_up'));
  assert('progression recommendation appears in history entry', historyEntry.progressionDecision?.nextAdjustment === progressionDecision.nextAdjustment);

  const analyticsSession = mapGeneratedCompletionToAnalyticsSession(generatedSurface);
  assert('generated completion maps into analytics view', analyticsSession.source === 'generated' && analyticsSession.total_load === 224);
  assert('analytics preserves generated RPE and duration', analyticsSession.intensity_srpe === 7 && analyticsSession.duration_minutes === 32);
  assert('analytics preserves pain and completion metrics', analyticsSession.painScoreAfter === 3 && analyticsSession.completionStatus === 'partial');

  const mergedHistory = mergeWorkoutHistoryEntries([legacyHistory], [historyEntry], 10);
  assert('existing history still works when merged', mergedHistory.some((entry) => entry.id === legacyHistory.id && entry.source === 'legacy'));
  assert('generated history is merged beside legacy history', mergedHistory.some((entry) => entry.id === historyEntry.id));
  assert('history sorts most recent generated entries first', mergedHistory[0].id === historyEntry.id);

  const linkedGenerated = { ...historyEntry, linkedWorkoutLogId: legacyHistory.id };
  const dedupedHistory = mergeWorkoutHistoryEntries([legacyHistory], [linkedGenerated], 10);
  assert('generated and legacy history entries do not double count when linked', dedupedHistory.length === 1 && dedupedHistory[0].id === legacyHistory.id);

  const mergedAnalytics = mergeWorkoutAnalyticsSessions([
    {
      date: '2026-04-30',
      total_load: 240,
      duration_minutes: 40,
      intensity_srpe: 6,
      source: 'legacy' as const,
    },
  ], [analyticsSession]);
  assert('analytics can segment generated vs legacy sessions', mergedAnalytics.some((entry) => entry.source === 'generated') && mergedAnalytics.some((entry) => entry.source === 'legacy'));

  const dedupedAnalytics = mergeWorkoutAnalyticsSessions([
    {
      date: '2026-05-01',
      total_load: 224,
      duration_minutes: 32,
      intensity_srpe: 7,
      workoutCompletionId: 'completion-generated-1',
    },
  ], [analyticsSession]);
  assert('generated analytics sessions do not double count when already projected', dedupedAnalytics.length === 1);

  const {
    source: _source,
    completionStatus: _completionStatus,
    substitutionsUsed: _substitutionsUsed,
    ...completionWithoutSurfaceFields
  } = generatedCompletion;
  const parsedSurface: GeneratedWorkoutCompletionSurface = {
    completion: {
      ...completionWithoutSurfaceFields,
      generatedWorkoutId: 'generated-workout-1',
      notes: 'Status: completed\nSubstitutions used: box_squat, incline_push_up',
    },
    progressionDecision: null,
  };
  const parsedHistory = generatedCompletionSurfacesToHistoryEntries([parsedSurface])[0];
  const parsedAnalytics = generatedCompletionSurfacesToAnalyticsSessions([parsedSurface])[0];
  assert('adapter treats generated workout id as generated source', parsedHistory.source === 'generated' && parsedAnalytics.source === 'generated');
  assert('adapter can recover status and substitutions from persisted notes', parsedHistory.completionStatus === 'completed' && parsedHistory.substitutionsUsed.length === 2);
}

run();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
if (failed > 0) process.exit(1);
