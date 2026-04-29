import fs from 'node:fs';
import path from 'node:path';
import {
  createFirstRunWalkthroughState,
  markFirstRunWalkthroughStepCompleted,
  pauseFirstRunWalkthrough,
  resumeFirstRunWalkthrough,
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

console.log('\n-- first sign-in app tour source --');

(() => {
  const dashboard = read('src/screens/DashboardScreen.tsx');
  const card = read('src/components/first-run/FirstSignInAppTourCard.tsx');

  assert(
    'first sign-in tour appears when app tour is due',
    dashboard.includes('shouldShowFirstSignInAppTour')
      && dashboard.includes('state.currentStep === "app_tour"')
      && dashboard.includes('<FirstSignInAppTourCard'),
  );

  assert(
    'tour does not appear after completion',
    dashboard.includes('state.hasSeenAppTour')
      && dashboard.includes('state.status === "completed"')
      && dashboard.includes('state.status === "dismissed"'),
  );

  assert(
    'tour can be skipped and resumed',
    dashboard.includes('pauseAndPersistFirstRunWalkthrough')
      && dashboard.includes('resumeAndPersistFirstRunWalkthrough')
      && card.includes('testID="first-sign-in-tour-skip"')
      && card.includes('testID="first-sign-in-tour-resume"'),
  );

  assert(
    'tour controls are wired',
    card.includes("'first-sign-in-tour-complete' : 'first-sign-in-tour-next'")
      && card.includes('testID="first-sign-in-tour-back"')
      && card.includes('testID="first-sign-in-tour-open-step"')
      && dashboard.includes('completeAndPersistFirstRunWalkthroughStep'),
  );

  assert(
    'tour is inline and does not hide primary Today Mission CTA',
    dashboard.indexOf('<TodayMissionPanel') < dashboard.indexOf('<FirstSignInAppTourCard')
      && card.includes('<Card')
      && !card.includes('<Modal')
      && read('src/components/dashboard/TodayMissionPanel.tsx').includes('testID="today-mission-primary-cta"'),
  );
})();

(() => {
  const dashboard = read('src/screens/DashboardScreen.tsx');

  assert(
    'Today Mission tour step appears',
    dashboard.includes('title: "Today')
      && dashboard.includes('This is where Athleticore shows what matters today, why it matters, what changed, and what to do next.'),
  );

  assert(
    'Training tour step appears',
    dashboard.includes('id: "training"')
      && dashboard.includes('Your plan adapts around your phase, readiness, and protected sessions.'),
  );

  assert(
    'Fueling tour step appears',
    dashboard.includes('id: "fueling"')
      && dashboard.includes('Fueling targets adjust with your training load and fight timeline.'),
  );

  assert(
    'Check-In tour step appears',
    dashboard.includes('id: "check_in"')
      && dashboard.includes('A quick check-in helps Athleticore know when to push, trim, or protect recovery.'),
  );

  assert(
    'Journey tour step appears',
    dashboard.includes('id: "journey"')
      && dashboard.includes("You're not starting over each time the plan changes."),
  );

  assert(
    'Fight Hub step appears only when relevant or available',
    dashboard.includes('showFightHubTourStep')
      && dashboard.includes('if (includeFightHub)')
      && dashboard.includes('id: "fight_hub"')
      && dashboard.includes('Add tentative or confirmed fights here. Athleticore will adjust the journey around the time available.'),
  );
})();

(() => {
  const card = read('src/components/first-run/FirstSignInAppTourCard.tsx');

  assert(
    'current theme and components are preserved',
    card.includes("from '../Card'")
      && card.includes("from '../AnimatedPressable'")
      && card.includes("from '../../theme/theme'")
      && card.includes('COLORS.accent')
      && card.includes('SPACING.lg')
      && card.includes('RADIUS.full'),
  );

  assert(
    'tour works on small screens without hidden button traps',
    card.includes('flexWrap: \'wrap\'')
      && card.includes('minHeight: 48')
      && card.includes('minHeight: 44')
      && card.includes('flexShrink: 1'),
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

  const paused = pauseFirstRunWalkthrough({
    state,
    currentStep: 'app_tour',
    now: NOW,
  });
  const resumed = resumeFirstRunWalkthrough({ state: paused, now: NOW });
  const completed = markFirstRunWalkthroughStepCompleted({
    state: resumed,
    step: 'app_tour',
    now: NOW,
  });

  assert('app tour can be resumed if dismissed', paused.status === 'skipped' && resumed.status === 'in_progress');
  assert('completion persists as app tour seen', completed.status === 'completed' && completed.hasSeenAppTour);
})();

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
