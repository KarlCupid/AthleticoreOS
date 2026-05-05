import {
  buildPersonalizedWorkoutInputFromPerformanceState,
} from './appStateAdapter.ts';
import {
  archiveProgram as persistArchiveProgram,
  attachGeneratedWorkoutToProgramSession as persistAttachGeneratedWorkoutToProgramSession,
  listUserPrograms as persistListUserPrograms,
  loadGeneratedProgram as persistLoadGeneratedProgram,
  loadUserWorkoutProfile,
  markProgramSessionCompleted as persistMarkProgramSessionCompleted,
  NotFoundError,
  saveGeneratedProgram as persistGeneratedProgram,
  updateProgramSession as persistUpdateProgramSession,
  type ProgramSessionUpdate,
} from './persistenceService.ts';
import { generateWeeklyWorkoutProgram } from './programBuilder.ts';
import type {
  GeneratedProgram,
  GeneratedWorkout,
} from './types.ts';
import { mergeProfileRequest } from './workoutServiceShared.ts';
import type {
  WorkoutProgrammingPerformanceStateRequest,
  WorkoutProgrammingProgramRequest,
  WorkoutProgrammingServiceOptions,
} from './workoutProgrammingServiceTypes.ts';

export async function generateWeeklyProgramForUser(
  userId: string,
  request: WorkoutProgrammingProgramRequest,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  const profile = await loadUserWorkoutProfile(userId, options);
  const input = mergeProfileRequest(userId, profile, request);
  const program = generateWeeklyWorkoutProgram({
    ...request,
    ...input,
  });
  if (!options?.persistGeneratedProgram) return program;
  const userProgramId = await persistGeneratedProgram(userId, program, options);
  if (!userProgramId) return program;
  const fallbackProgram: GeneratedProgram = {
    ...program,
    persistenceId: userProgramId,
  };
  try {
    return await persistLoadGeneratedProgram(userId, userProgramId, options) ?? fallbackProgram;
  } catch (error) {
    if (error instanceof NotFoundError) return fallbackProgram;
    throw error;
  }
}

export async function saveGeneratedProgramForUser(
  userId: string,
  program: GeneratedProgram,
  options?: WorkoutProgrammingServiceOptions,
): Promise<string | null> {
  return persistGeneratedProgram(userId, program, options);
}

export async function loadGeneratedProgramForUser(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram | null> {
  return persistLoadGeneratedProgram(userId, userProgramId, options);
}

export async function listGeneratedProgramsForUser(
  userId: string,
  options?: WorkoutProgrammingServiceOptions & { limit?: number; status?: GeneratedProgram['status'] },
): Promise<GeneratedProgram[]> {
  return persistListUserPrograms(userId, options);
}

export async function updateGeneratedProgramSessionForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  update: ProgramSessionUpdate,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistUpdateProgramSession(userId, userProgramId, sessionId, update, options);
}

export async function attachGeneratedWorkoutToProgramSessionForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  workout: GeneratedWorkout,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistAttachGeneratedWorkoutToProgramSession(userId, userProgramId, sessionId, workout, options);
}

export async function markGeneratedProgramSessionCompletedForUser(
  userId: string,
  userProgramId: string,
  sessionId: string,
  completion: { completedAt?: string; workoutCompletionId?: string | null } = {},
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistMarkProgramSessionCompleted(userId, userProgramId, sessionId, completion, options);
}

export async function archiveGeneratedProgramForUser(
  userId: string,
  userProgramId: string,
  options?: WorkoutProgrammingServiceOptions,
): Promise<GeneratedProgram> {
  return persistArchiveProgram(userId, userProgramId, options);
}

export async function generateWeeklyProgramFromPerformanceState(
  request: WorkoutProgrammingPerformanceStateRequest & Partial<WorkoutProgrammingProgramRequest>,
): Promise<GeneratedProgram> {
  const mapped = buildPersonalizedWorkoutInputFromPerformanceState(request);
  const programRequest: Parameters<typeof generateWeeklyWorkoutProgram>[0] = {
    ...mapped.input,
    goalId: mapped.input.goalId,
  };
  if (request.secondaryGoalIds) programRequest.secondaryGoalIds = request.secondaryGoalIds;
  if (request.weekCount != null) programRequest.weekCount = request.weekCount;
  if (request.desiredProgramLengthWeeks != null) programRequest.desiredProgramLengthWeeks = request.desiredProgramLengthWeeks;
  if (request.sessionsPerWeek != null) programRequest.sessionsPerWeek = request.sessionsPerWeek;
  if (request.generatedSessionsPerWeek != null) programRequest.generatedSessionsPerWeek = request.generatedSessionsPerWeek;
  if (request.totalExposureTarget != null) programRequest.totalExposureTarget = request.totalExposureTarget;
  if (request.combatSportContext) programRequest.combatSportContext = request.combatSportContext;
  if (request.availableDays) programRequest.availableDays = request.availableDays;
  if (request.deloadStrategy) programRequest.deloadStrategy = request.deloadStrategy;
  if (mapped.input.protectedWorkouts) {
    programRequest.protectedWorkouts = mapped.input.protectedWorkouts;
  } else if (request.protectedWorkouts) {
    programRequest.protectedWorkouts = request.protectedWorkouts;
  }
  if (request.readinessTrend) programRequest.readinessTrend = request.readinessTrend;
  return generateWeeklyWorkoutProgram(programRequest);
}
