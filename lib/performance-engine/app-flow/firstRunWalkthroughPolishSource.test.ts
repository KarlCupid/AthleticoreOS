import fs from 'node:fs';
import path from 'node:path';

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

console.log('\n-- first-run walkthrough polish source --');

const onboarding = read('src/screens/OnboardingScreen.tsx');
const dashboard = read('src/screens/DashboardScreen.tsx');
const firstLookCard = read('src/components/first-run/FirstSignInAppTourCard.tsx');
const existingIntroCard = read('src/components/first-run/ExistingUserOverhaulIntroCard.tsx');
const walkthroughUiSource = [
  onboarding,
  dashboard,
  firstLookCard,
  existingIntroCard,
].join('\n');
const lowerUiSource = walkthroughUiSource.toLowerCase();

assert(
  'welcome copy is warm and journey-connected',
  onboarding.includes('Welcome to Athleticore.')
    && onboarding.includes("We'll help you train, fuel, recover, and adapt around your real fight timeline.")
    && onboarding.includes('Start from where you are and keep the work connected.'),
);

assert(
  'protected workout copy is coach-like',
  onboarding.includes('These sessions stay locked in. Athleticore will build around them.')
    && dashboard.includes('need to stay locked in')
    && existingIntroCard.includes('Protected workouts stay anchored while the supporting work adapts.'),
);

assert(
  'fueling and readiness copy is clear',
  onboarding.includes("We'll use this to guide fueling around your training, recovery, and fight timeline.")
    && dashboard.includes('Fueling targets move with your training load, recovery needs, and fight timeline.')
    && dashboard.includes("Log today's check-in so readiness can shape the work safely."),
);

assert(
  'body-mass and weight-class copy stays safety-first',
  onboarding.includes('We need a little body-mass history before making a confident call.')
    && dashboard.includes('We need a little history before making a confident call.')
    && existingIntroCard.includes('Weight-class guidance stays safety-first and asks for more context when it needs it.'),
);

assert(
  'Today Mission intro copy leads with daily guidance',
  onboarding.includes('Each day, Athleticore gives you a mission: what matters today, why it matters, what changed, and what to do next.')
    && dashboard.includes('Start here. Athleticore shows what matters today, why it matters, what changed, and what to do next.')
    && existingIntroCard.includes("Today's Mission now brings the key pieces together so you know what to do and why."),
);

assert(
  'skip resume and complete controls use accessible copy',
  firstLookCard.includes('Save for later')
    && firstLookCard.includes('Resume walkthrough')
    && firstLookCard.includes('accessibilityLabel="Save walkthrough for later"')
    && firstLookCard.includes('Finish first-run walkthrough')
    && existingIntroCard.includes('accessibilityLabel="Dismiss guided journey intro"')
    && existingIntroCard.includes('Open Today\'s Mission'),
);

assert(
  'buttons remain visible and touchable on small screens',
  firstLookCard.includes('minHeight: 48')
    && firstLookCard.includes('minHeight: 44')
    && firstLookCard.includes("flexWrap: 'wrap'")
    && existingIntroCard.includes('minHeight: 48')
    && existingIntroCard.includes('minHeight: 44')
    && existingIntroCard.includes("flexWrap: 'wrap'"),
);

assert(
  'current theme and components are used',
  firstLookCard.includes("from '../Card'")
    && firstLookCard.includes("from '../AnimatedPressable'")
    && firstLookCard.includes("from '../../theme/theme'")
    && existingIntroCard.includes("from '../Card'")
    && existingIntroCard.includes("from '../AnimatedPressable'")
    && existingIntroCard.includes("from '../../theme/theme'")
    && onboarding.includes("from '../theme/theme'"),
);

assert(
  'robotic and unsafe user-facing phrases are absent',
  ![
    'phase transition state initialized',
    'protected sessions detected',
    'nutrition preferences collected',
    'insufficient body mass data',
    'weight cut',
    'water cut',
    'dehydration',
    'sweat suit',
    'sauna',
    'diuretic',
    'laxative',
    'proceed anyway',
    'push through',
    'compliance is poor',
    'user failed',
  ].some((phrase) => lowerUiSource.includes(phrase)),
);

assert(
  'old cold walkthrough labels are gone from user-facing cards',
  !firstLookCard.includes('APP TOUR')
    && !firstLookCard.includes('Resume tour')
    && !firstLookCard.includes('Skip for now')
    && !existingIntroCard.includes('No critical setup gaps found.')
    && !existingIntroCard.includes('Review missing context'),
);

console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
process.exit(failed > 0 ? 1 : 0);
