import {
  DatabaseUnavailableError,
  UnauthorizedError,
  ValidationError,
} from './persistenceService.ts';
import {
  GENERATED_WORKOUT_FALLBACK_COPY,
  LOCAL_GENERATED_WORKOUT_BETA_USER_ID,
  canUseLocalCompletionFallback,
  canUseLocalGeneratedWorkoutFallback,
  formatGeneratedWorkoutPersistenceFallbackMessage,
  formatGeneratedWorkoutLocalCompletionMessage,
  generatedWorkoutCompletionOptionsForUser,
  generatedWorkoutFlowUserId,
  generatedWorkoutLifecycleOptionsForUser,
  normalizeGeneratedWorkoutError,
  resolveGeneratedWorkoutContentReviewOptions,
  resolveGeneratedWorkoutFeatureFlags,
} from './workoutProgrammingFallbacks.ts';

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

function run() {
  console.log('\n-- workout programming generated workout fallbacks --');

  assert('beta flag suppresses preview flag', (() => {
    const flags = resolveGeneratedWorkoutFeatureFlags({ betaFlag: '1', previewFlag: '1', dev: true });
    return flags.betaEnabled === true && flags.previewEnabled === false;
  })());

  assert('developer preview flag requires dev mode', (() => {
    const off = resolveGeneratedWorkoutFeatureFlags({ previewFlag: '1', dev: false });
    const on = resolveGeneratedWorkoutFeatureFlags({ previewFlag: '1', dev: true });
    return off.previewEnabled === false && on.previewEnabled === true;
  })());

  assert('beta persisted content review uses production-only approved content', (() => {
    const options = resolveGeneratedWorkoutContentReviewOptions('beta-persisted');
    return options.contentReviewMode === 'production' && options.allowDraftContent === false;
  })());

  assert('beta local fallback does not allow draft preview content', (() => {
    const options = resolveGeneratedWorkoutContentReviewOptions('beta-local-fallback');
    return options.contentReviewMode === 'production' && options.allowDraftContent === false;
  })());

  assert('developer preview can explicitly use preview draft content', (() => {
    const options = resolveGeneratedWorkoutContentReviewOptions('dev-preview');
    return options.contentReviewMode === 'preview' && options.allowDraftContent === true;
  })());

  assert('unknown errors normalize to display-safe copy', normalizeGeneratedWorkoutError({ internal: true }, 'Generated workout failed.') === 'Generated workout failed.');
  assert('safety and validation errors are not hidden', normalizeGeneratedWorkoutError(new ValidationError('No safe generated workout found.'), 'Generated workout failed.') === 'No safe generated workout found.');
  assert('unauthorized errors use user-safe copy', normalizeGeneratedWorkoutError(new UnauthorizedError('rls denied user abc'), 'Generated workout failed.') === 'You do not have access to this generated workout.');

  assert('local generated workout fallback is allowed only for unavailable persistence', canUseLocalGeneratedWorkoutFallback(new DatabaseUnavailableError('database unavailable')) === true);
  assert('local generated workout fallback rejects validation errors', canUseLocalGeneratedWorkoutFallback(new ValidationError('invalid generated workout')) === false);
  assert('local generated workout fallback does not hide safety errors that mention unavailable', canUseLocalGeneratedWorkoutFallback(new Error('Safety validation unavailable for this session')) === false);

  assert('local completion fallback requires an authenticated user and unavailable persistence', canUseLocalCompletionFallback({
    userId: 'user-1',
    error: new DatabaseUnavailableError('rpc unavailable'),
  }) === true);
  assert('local completion fallback is not allowed without a real user', canUseLocalCompletionFallback({
    userId: null,
    error: new DatabaseUnavailableError('rpc unavailable'),
  }) === false);

  assert('persistence fallback messages use consistent display copy', formatGeneratedWorkoutPersistenceFallbackMessage(
    'generatedLocallyPersistenceUnavailable',
    new DatabaseUnavailableError('rpc unavailable'),
    'Unable to save generated workout.',
  ) === GENERATED_WORKOUT_FALLBACK_COPY.generatedLocallyPersistenceUnavailable);
  assert('local completion fallback message is centralized', formatGeneratedWorkoutLocalCompletionMessage('stored on device') === 'Completed locally: stored on device');

  assert('local lifecycle options never request Supabase for local user ids', (() => {
    const options = generatedWorkoutLifecycleOptionsForUser(null, '2026-05-03T12:00:00.000Z') as Record<string, unknown>;
    return options.occurredAt === '2026-05-03T12:00:00.000Z' && !('useSupabase' in options);
  })());

  assert('authenticated lifecycle options request Supabase with the real user only', (() => {
    const options = generatedWorkoutLifecycleOptionsForUser('user-1', '2026-05-03T12:00:00.000Z') as Record<string, unknown>;
    return options.occurredAt === '2026-05-03T12:00:00.000Z' && options.useSupabase === true;
  })());

  assert('local completion options disable persistence', (() => {
    const options = generatedWorkoutCompletionOptionsForUser(null) as Record<string, unknown>;
    return options.persistGeneratedWorkout === false && !('useSupabase' in options);
  })());

  assert('local fallback user id is explicit and never used with Supabase options', generatedWorkoutFlowUserId(null) === LOCAL_GENERATED_WORKOUT_BETA_USER_ID);
  assert('real user id is preserved for authenticated generated workout flows', generatedWorkoutFlowUserId('user-1') === 'user-1');
}

run();
console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
