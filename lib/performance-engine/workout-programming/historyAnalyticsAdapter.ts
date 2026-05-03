import type { WorkoutLogRow } from '../../engine/types.ts';
import type {
  GeneratedWorkoutSessionCompletionStatus,
  ProgressionDecision,
  WorkoutCompletionLog,
} from './types.ts';

export type WorkoutHistoryEntrySource = 'legacy' | 'generated';

export interface GeneratedWorkoutCompletionSurface {
  completion: WorkoutCompletionLog;
  progressionDecision?: ProgressionDecision | null;
}

export interface GeneratedWorkoutHistoryEntry extends Partial<WorkoutLogRow> {
  id: string;
  date: string;
  workout_type: WorkoutLogRow['workout_type'];
  focus: WorkoutLogRow['focus'];
  total_volume: number;
  total_sets: number;
  session_rpe: number | null;
  duration_minutes: number | null;
  notes: string | null;
  source: 'generated';
  sourceLabel: 'Generated session';
  generatedWorkoutId: string | null;
  workoutCompletionId: string | null;
  workoutTypeId?: string | undefined;
  goalId?: string | undefined;
  completionStatus: GeneratedWorkoutSessionCompletionStatus | 'unknown';
  exercisesCompleted: number;
  exercisesPrescribed: number;
  substitutionsUsed: string[];
  painScoreBefore: number | null;
  painScoreAfter: number | null;
  progressionDecision?: ProgressionDecision | null;
  linkedWorkoutLogId?: string | null;
}

export type UnifiedWorkoutHistoryEntry =
  | (WorkoutLogRow & { source?: 'legacy'; sourceLabel?: 'Logged session' })
  | GeneratedWorkoutHistoryEntry;

export interface GeneratedWorkoutAnalyticsSession {
  date: string;
  total_load: number;
  duration_minutes: number;
  intensity_srpe: number;
  source: 'generated';
  sourceLabel: 'Generated session';
  generatedWorkoutId: string | null;
  workoutCompletionId: string | null;
  workoutTypeId?: string | undefined;
  goalId?: string | undefined;
  completionStatus: GeneratedWorkoutSessionCompletionStatus | 'unknown';
  painScoreBefore: number | null;
  painScoreAfter: number | null;
  exercisesCompleted: number;
  substitutionsUsed: string[];
  progressionDecision?: ProgressionDecision | null;
}

export type UnifiedWorkoutAnalyticsSession = {
  date: string;
  total_load: number;
  duration_minutes: number;
  intensity_srpe: number;
  source?: WorkoutHistoryEntrySource;
  sourceLabel?: string;
  workoutCompletionId?: string | null;
  generatedWorkoutId?: string | null;
};

function isoDate(value: string): string {
  return value.slice(0, 10);
}

function titleToken(value: string | undefined | null): string {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function legacyWorkoutType(workoutTypeId: string | undefined): WorkoutLogRow['workout_type'] {
  const normalized = String(workoutTypeId ?? '').toLowerCase();
  if (normalized.includes('conditioning') || normalized.includes('cardio') || normalized.includes('hiit')) return 'conditioning';
  if (normalized.includes('recovery') || normalized.includes('mobility') || normalized.includes('balance')) return 'recovery';
  if (normalized.includes('boxing') || normalized.includes('sport')) return 'practice';
  return 'strength';
}

function legacyWorkoutFocus(workoutTypeId: string | undefined, goalId: string | undefined): WorkoutLogRow['focus'] {
  const normalized = `${workoutTypeId ?? ''} ${goalId ?? ''}`.toLowerCase();
  if (normalized.includes('conditioning') || normalized.includes('cardio') || normalized.includes('hiit')) return 'conditioning';
  if (normalized.includes('recovery') || normalized.includes('mobility') || normalized.includes('balance')) return 'recovery';
  if (normalized.includes('boxing') || normalized.includes('sport')) return 'sport_specific';
  if (normalized.includes('upper')) return 'upper_push';
  if (normalized.includes('lower')) return 'lower';
  return 'full_body';
}

function parseNotesLine(notes: string | null | undefined, prefix: string): string | null {
  if (!notes) return null;
  const line = notes
    .split(/\r?\n/g)
    .find((item) => item.trim().toLowerCase().startsWith(prefix.toLowerCase()));
  if (!line) return null;
  return line.slice(prefix.length).trim();
}

function parseCompletionStatus(completion: WorkoutCompletionLog): GeneratedWorkoutSessionCompletionStatus | 'unknown' {
  if (completion.completionStatus) return completion.completionStatus;
  const notesStatus = parseNotesLine(completion.notes, 'Status:');
  if (
    notesStatus === 'completed'
    || notesStatus === 'partial'
    || notesStatus === 'stopped'
    || notesStatus === 'abandoned'
    || notesStatus === 'expired'
  ) {
    return notesStatus;
  }
  return 'unknown';
}

function parseSubstitutions(completion: WorkoutCompletionLog): string[] {
  if (completion.substitutionsUsed && completion.substitutionsUsed.length > 0) {
    return [...new Set(completion.substitutionsUsed.map((item) => item.trim()).filter(Boolean))];
  }

  const substitutions = parseNotesLine(completion.notes, 'Substitutions used:');
  if (!substitutions) return [];
  return [...new Set(substitutions.split(',').map((item) => item.trim()).filter(Boolean))];
}

function generatedWorkoutIdFor(completion: WorkoutCompletionLog): string | null {
  return completion.generatedWorkoutId ?? completion.workoutId ?? null;
}

function completionIdFor(completion: WorkoutCompletionLog): string | null {
  return completion.id ?? null;
}

function exercisesCompleted(completion: WorkoutCompletionLog): number {
  return completion.exerciseResults.filter((result) => (
    result.completedAsPrescribed
    || result.setsCompleted > 0
    || (result.repsCompleted ?? 0) > 0
    || (result.durationSecondsCompleted ?? 0) > 0
    || (result.durationMinutesCompleted ?? 0) > 0
  )).length;
}

function estimatedVolume(completion: WorkoutCompletionLog): number {
  return Math.round(completion.exerciseResults.reduce((sum, result) => {
    const load = result.loadUsed ?? 0;
    const reps = result.repsCompleted ?? result.repsPrescribed ?? 0;
    return sum + Math.max(0, result.setsCompleted) * Math.max(0, reps) * Math.max(0, load);
  }, 0));
}

function sourceId(completion: WorkoutCompletionLog): string {
  return completion.id ?? `${completion.workoutId}-${completion.completedAt}`;
}

export function isGeneratedWorkoutCompletion(completion: WorkoutCompletionLog): boolean {
  return completion.source === 'generated_workout' || Boolean(completion.generatedWorkoutId);
}

export function mapGeneratedCompletionToHistoryEntry(
  surface: GeneratedWorkoutCompletionSurface,
): GeneratedWorkoutHistoryEntry {
  const { completion, progressionDecision } = surface;
  const completionStatus = parseCompletionStatus(completion);
  const substitutionsUsed = parseSubstitutions(completion);
  const completedExerciseCount = exercisesCompleted(completion);
  const workoutTypeId = completion.workoutTypeId;
  const goalId = completion.goalId;

  return {
    id: `generated-${sourceId(completion)}`,
    user_id: '',
    date: isoDate(completion.completedAt),
    workout_type: legacyWorkoutType(workoutTypeId),
    focus: legacyWorkoutFocus(workoutTypeId, goalId),
    total_volume: estimatedVolume(completion),
    total_sets: completion.exerciseResults.reduce((sum, result) => sum + Math.max(0, result.setsCompleted), 0),
    session_rpe: completion.sessionRpe,
    duration_minutes: completion.actualDurationMinutes,
    notes: completion.notes ?? null,
    source: 'generated',
    sourceLabel: 'Generated session',
    generatedWorkoutId: generatedWorkoutIdFor(completion),
    workoutCompletionId: completionIdFor(completion),
    workoutTypeId,
    goalId,
    completionStatus,
    exercisesCompleted: completedExerciseCount,
    exercisesPrescribed: completion.exerciseResults.length,
    substitutionsUsed,
    painScoreBefore: completion.painScoreBefore ?? null,
    painScoreAfter: completion.painScoreAfter ?? null,
    progressionDecision: progressionDecision ?? null,
  };
}

export function mapGeneratedCompletionToAnalyticsSession(
  surface: GeneratedWorkoutCompletionSurface,
): GeneratedWorkoutAnalyticsSession {
  const { completion, progressionDecision } = surface;
  const duration = Math.max(0, Math.round(completion.actualDurationMinutes));
  const rpe = Math.max(1, Math.min(10, Math.round(completion.sessionRpe)));
  return {
    date: isoDate(completion.completedAt),
    total_load: duration * rpe,
    duration_minutes: duration,
    intensity_srpe: rpe,
    source: 'generated',
    sourceLabel: 'Generated session',
    generatedWorkoutId: generatedWorkoutIdFor(completion),
    workoutCompletionId: completionIdFor(completion),
    workoutTypeId: completion.workoutTypeId,
    goalId: completion.goalId,
    completionStatus: parseCompletionStatus(completion),
    painScoreBefore: completion.painScoreBefore ?? null,
    painScoreAfter: completion.painScoreAfter ?? null,
    exercisesCompleted: exercisesCompleted(completion),
    substitutionsUsed: parseSubstitutions(completion),
    progressionDecision: progressionDecision ?? null,
  };
}

export function generatedCompletionSurfacesToHistoryEntries(
  surfaces: GeneratedWorkoutCompletionSurface[],
): GeneratedWorkoutHistoryEntry[] {
  return surfaces.filter((surface) => isGeneratedWorkoutCompletion(surface.completion)).map(mapGeneratedCompletionToHistoryEntry);
}

export function generatedCompletionSurfacesToAnalyticsSessions(
  surfaces: GeneratedWorkoutCompletionSurface[],
): GeneratedWorkoutAnalyticsSession[] {
  return surfaces.filter((surface) => isGeneratedWorkoutCompletion(surface.completion)).map(mapGeneratedCompletionToAnalyticsSession);
}

export function mergeWorkoutHistoryEntries(
  legacyHistory: WorkoutLogRow[],
  generatedHistory: GeneratedWorkoutHistoryEntry[],
  limit = 20,
): UnifiedWorkoutHistoryEntry[] {
  const legacyIds = new Set(legacyHistory.map((entry) => entry.id));
  const safeGeneratedHistory = generatedHistory.filter((entry) => {
    if (!entry.linkedWorkoutLogId) return true;
    return !legacyIds.has(entry.linkedWorkoutLogId);
  });

  return [
    ...legacyHistory.map((entry) => ({ ...entry, source: 'legacy' as const, sourceLabel: 'Logged session' as const })),
    ...safeGeneratedHistory,
  ]
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.id.localeCompare(a.id);
    })
    .slice(0, limit);
}

export function mergeWorkoutAnalyticsSessions<T extends UnifiedWorkoutAnalyticsSession>(
  legacySessions: T[],
  generatedSessions: GeneratedWorkoutAnalyticsSession[],
): Array<T | GeneratedWorkoutAnalyticsSession> {
  const projectedGeneratedCompletionIds = new Set(
    legacySessions
      .map((session) => session.workoutCompletionId)
      .filter((id): id is string => Boolean(id)),
  );

  const safeGeneratedSessions = generatedSessions.filter((session) => {
    if (!session.workoutCompletionId) return true;
    return !projectedGeneratedCompletionIds.has(session.workoutCompletionId);
  });

  return [
    ...legacySessions.map((session) => ({ ...session, source: session.source ?? 'legacy' as const })),
    ...safeGeneratedSessions,
  ].sort((a, b) => a.date.localeCompare(b.date));
}

export function generatedHistoryDisplayTitle(entry: GeneratedWorkoutHistoryEntry): string {
  return titleToken(entry.workoutTypeId ?? entry.goalId ?? entry.focus ?? 'Generated session') || 'Generated Session';
}
