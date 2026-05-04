import fs from 'node:fs';
import path from 'node:path';
import { isEngineReplayLabEnabled } from '../../../src/config/devSurfaces.ts';
import { shouldHideBottomNavForFocusedRouteName } from '../../../src/navigation/chrome.ts';
import { appLinking } from '../../../src/navigation/linking.ts';
import {
  isValidLocalDateString,
  resolveActivityLogParams,
  resolveBarcodeScanParams,
  resolveExerciseDetailParams,
  resolveFoodDetailParams,
  resolveFoodSearchParams,
  resolveGuidedWorkoutParams,
  resolvePostWeighInRecoveryParams,
  resolveWorkoutDetailParams,
} from '../../../src/navigation/routeValidation.ts';
import { resolveGeneratedWorkoutFeatureFlags } from '../workout-programming/workoutProgrammingFallbacks.ts';
import type { FoodSearchResult } from '../../engine/types.ts';

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

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function collectScreenKeys(node: unknown, keys = new Set<string>()): Set<string> {
  if (!node || typeof node !== 'object') return keys;
  const screens = (node as { screens?: Record<string, unknown> }).screens;
  if (!screens || typeof screens !== 'object') return keys;

  for (const [key, value] of Object.entries(screens)) {
    keys.add(key);
    collectScreenKeys(value, keys);
  }

  return keys;
}

function foodFixture(overrides: Partial<FoodSearchResult> = {}): FoodSearchResult {
  return {
    key: 'custom:banana',
    user_id: null,
    source: 'custom',
    sourceType: 'custom',
    external_id: null,
    verified: true,
    searchRank: 1,
    off_barcode: null,
    name: 'Banana',
    brand: null,
    image_url: null,
    baseAmount: 100,
    baseUnit: 'g',
    gramsPerPortion: 118,
    portionOptions: [{ id: 'medium', label: '1 medium', amount: 1, unit: 'portion', grams: 118, isDefault: true }],
    serving_size_g: 118,
    serving_label: '1 medium',
    calories_per_serving: 105,
    protein_per_serving: 1.3,
    carbs_per_serving: 27,
    fat_per_serving: 0.4,
    is_supplement: false,
    badges: ['Custom'],
    ...overrides,
  };
}

console.log('\n-- navigation safety and preview surface guards --');

(() => {
  assert('Engine Replay Lab requires dev mode and development build profile', (
    isEngineReplayLabEnabled({ dev: true, buildProfile: 'development' }) === true
    && isEngineReplayLabEnabled({ dev: true, buildProfile: 'preview' }) === false
    && isEngineReplayLabEnabled({ dev: true, buildProfile: 'production' }) === false
    && isEngineReplayLabEnabled({ dev: false, buildProfile: 'development' }) === false
  ));

  assert('generated workout flags require development build profile even when set', (
    resolveGeneratedWorkoutFeatureFlags({ betaFlag: '1', previewFlag: '1', dev: true, buildProfile: 'preview' }).betaEnabled === false
    && resolveGeneratedWorkoutFeatureFlags({ previewFlag: '1', dev: true, buildProfile: 'production' }).previewEnabled === false
    && resolveGeneratedWorkoutFeatureFlags({ betaFlag: '1', previewFlag: '1', dev: true, buildProfile: 'development' }).betaEnabled === true
  ));
})();

(() => {
  const screenKeys = collectScreenKeys(appLinking.config);

  assert('production linking config does not expose internal replay lab or generated workout dev panels', (
    !screenKeys.has('EngineReplayLab')
    && !screenKeys.has('GeneratedWorkoutDevPreviewPanel')
    && !screenKeys.has('GeneratedWorkoutBetaContainer')
  ));

  assert('external links avoid complex internal-only route payloads', (
    !screenKeys.has('WorkoutSummary')
    && !screenKeys.has('FoodDetail')
    && !screenKeys.has('ExerciseDetail')
    && !screenKeys.has('PostWeighInRecovery')
  ));
})();

(() => {
  assert('local date validator rejects impossible calendar dates', (
    isValidLocalDateString('2026-05-04')
    && !isValidLocalDateString('2026-02-30')
    && !isValidLocalDateString('not-a-date')
  ));

  assert('guided workout deep-link params are sanitized and cannot query-auto-start', (() => {
    const linked = resolveGuidedWorkoutParams({
      readinessState: 'NotAState' as never,
      phase: 'unsafe-phase' as never,
      fitnessLevel: 'superhuman' as never,
      trainingDate: '2026-02-30',
      availableMinutes: '999' as never,
      autoStart: 'true' as never,
      entrySource: 'train',
    });
    const internal = resolveGuidedWorkoutParams({
      readinessState: 'Caution',
      phase: 'camp-build',
      fitnessLevel: 'advanced',
      trainingDate: '2026-05-04',
      availableMinutes: 45,
      autoStart: true,
      entrySource: 'train',
    });

    return linked.readinessState === 'Prime'
      && linked.phase === 'off-season'
      && linked.fitnessLevel === 'intermediate'
      && linked.trainingDate === undefined
      && linked.availableMinutes === undefined
      && linked.autoStart === false
      && internal.autoStart === true;
  })());

  assert('Today/Plan linked activity params require an activity id and valid date fallback', (
    resolveActivityLogParams({ activityId: '', date: '2026-05-04' }) === null
    && resolveActivityLogParams({ activityId: 'activity-1', date: 'bad-date' })?.activityId === 'activity-1'
  ));

  assert('Train workout detail params require canonical plan id and local date', (
    resolveWorkoutDetailParams({ weeklyPlanEntryId: '', date: '2026-05-04' }) === null
    && resolveWorkoutDetailParams({ weeklyPlanEntryId: 'entry-1', date: 'bad-date' }) === null
    && resolveWorkoutDetailParams({ weeklyPlanEntryId: 'entry-1', date: '2026-05-04' })?.readinessState === 'Prime'
  ));

  assert('Train exercise detail params require an exercise payload from the library', (
    resolveExerciseDetailParams({ exercise: null }) === null
    && resolveExerciseDetailParams({
      exercise: {
        id: 'push-up',
        name: 'Push-Up',
        type: 'strength',
        muscle_group: 'chest',
        equipment: 'bodyweight',
        cns_load: 2,
        sport_tags: [],
      },
    })?.exercise.id === 'push-up'
  ));

  assert('Fuel route params default unsafe meal/date input without crashing', (
    resolveFoodSearchParams({ mealType: 'dessert', date: '2026-02-30' }).mealType === 'snacks'
    && resolveBarcodeScanParams({ mealType: 'breakfast', date: '2026-05-04' }).date === '2026-05-04'
  ));

  assert('complex FoodDetail and post weigh-in recovery params are validated before screen use', (
    resolveFoodDetailParams({ foodItem: null, mealType: 'breakfast' }) === null
    && resolveFoodDetailParams({ foodItem: foodFixture(), mealType: 'dinner' })?.mealType === 'dinner'
    && resolvePostWeighInRecoveryParams({ weighInWeightLbs: -1, hoursToFight: 12 }) === null
    && resolvePostWeighInRecoveryParams({ weighInWeightLbs: 154.2, hoursToFight: 8 })?.hoursToFight === 8
  ));
})();

(() => {
  assert('guided workout and summary routes hide bottom navigation, then restore on normal routes', (
    shouldHideBottomNavForFocusedRouteName('GuidedWorkout')
    && shouldHideBottomNavForFocusedRouteName('WorkoutSummary')
    && !shouldHideBottomNavForFocusedRouteName('WorkoutHome')
    && !shouldHideBottomNavForFocusedRouteName(undefined)
  ));
})();

(() => {
  const app = read('App.tsx');
  const profile = read('src/screens/ProfileSettingsScreen.tsx');

  assert('root navigation is scoped by auth and journey gate state', (
    app.includes('navigationScopeKey')
    && app.includes("entryStatus === 'ready'")
    && app.includes('{...(navigationLinking ? { linking: navigationLinking } : {})}')
    && app.includes('key={navigationScopeKey}')
  ));

  assert('external links are disabled until auth, onboarding, and planning gates are ready', (
    app.includes("session && entryStatus === 'ready' && !passwordRecoveryActive ? appLinking : undefined")
  ));

  assert('sign-out and expired sessions clear journey state before remounting navigation', (
    app.includes("if (!nextSession)")
    && app.includes('setJourneyEntryState(null)')
    && app.includes('setSession(null)')
    && app.includes("sessionUserIdRef.current = null")
  ));

  assert('Profile version tap and tester reset use centralized dev-surface gate', (
    profile.includes('internalDevSurfacesEnabled')
    && profile.includes('isEngineReplayLabEnabled')
    && !profile.includes('__DEV__ ? <EngineReplayLab')
  ));
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
