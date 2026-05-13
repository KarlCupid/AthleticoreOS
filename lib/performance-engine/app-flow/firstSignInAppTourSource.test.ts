import fs from 'node:fs';
import path from 'node:path';
import {
  createFirstRunWalkthroughState,
  markFirstRunWalkthroughStepCompleted,
} from './firstRunWalkthroughState.ts';

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

const NOW = '2026-04-29T12:00:00.000Z';

console.log('\n-- first sign-in app tour retirement source --');

(() => {
  const dashboard = read('src/screens/DashboardScreen.tsx');
  const retiredCardPath = path.join(process.cwd(), 'src/components/first-run/FirstSignInAppTourCard.tsx');

  assert(
    'redundant first-look card is removed from Today',
    !fs.existsSync(retiredCardPath)
      && !dashboard.includes('FirstSignInAppTourCard')
      && !dashboard.includes('<FirstSignInAppTourCard')
      && !dashboard.includes('Start here. Athleticore shows what matters today, why it matters, what changed, and what to do next.'),
  );

  assert(
    'app tour state is resolved instead of rendered',
    dashboard.includes('shouldResolveRedundantAppTourStep')
      && dashboard.includes('DashboardScreen.resolveRedundantAppTourStep')
      && dashboard.includes('step: "app_tour"')
      && dashboard.includes('completeAndPersistFirstRunWalkthroughStep')
      && !dashboard.includes('pauseAndPersistFirstRunWalkthrough')
      && !dashboard.includes('resumeAndPersistFirstRunWalkthrough'),
  );

  assert(
    'first-run modal is no longer suppressed by a hidden app tour card',
    dashboard.includes('!shouldShowExistingUserOverhaulIntro(resolvedWalkthrough)')
      && !dashboard.includes('!shouldShowFirstSignInAppTour'),
  );

  assert(
    'existing user intro completes the retired app tour step',
    dashboard.includes('status: "completed"')
      && dashboard.includes('hasSeenAppTour: true')
      && dashboard.includes('"today_mission_intro", "app_tour"'),
  );
})();

(() => {
  let state = createFirstRunWalkthroughState({
    userId: 'first-sign-in-tour-user',
    appliesTo: 'first_sign_in',
    now: NOW,
  });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'welcome', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'journey_setup', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'protected_workout_setup', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'fight_context_setup', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'fueling_setup', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'readiness_baseline', now: NOW });
  state = markFirstRunWalkthroughStepCompleted({ state, step: 'today_mission_intro', now: NOW });

  const completed = markFirstRunWalkthroughStepCompleted({
    state,
    step: 'app_tour',
    now: NOW,
  });

  assert('app tour remains a resolvable state step', state.currentStep === 'app_tour');
  assert('resolving app tour completes the walkthrough', completed.status === 'completed' && completed.hasSeenAppTour);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
