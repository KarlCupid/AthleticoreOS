import type { GeneratedWorkout, ProgressionDecision } from './types.ts';
import {
  generatePreviewWorkout,
} from './workoutProgrammingService.ts';
import { workoutProgrammingServiceFixtures } from './workoutProgrammingServiceFixtures.ts';

declare const require: {
  (path: string): any;
  cache: Record<string, unknown>;
  extensions: Record<string, (module: { exports: unknown }, filename: string) => void>;
  resolve: (path: string) => string;
};
declare const process: {
  cwd: () => string;
  exit: (code?: number) => never;
  env: Record<string, string | undefined>;
};
declare const global: Record<string, unknown>;

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

function createHostComponent(React: any, hostName: string) {
  return function HostComponent(props: Record<string, unknown>) {
    return React.createElement(hostName, props, (props as { children?: unknown }).children);
  };
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return typeof style === 'object' ? style as Record<string, unknown> : {};
}

function installRenderMocks(): void {
  const React = require('react');
  const Module = require('module');
  const originalLoad = Module._load;

  const View = createHostComponent(React, 'View');
  const Text = createHostComponent(React, 'Text');
  const TextInput = createHostComponent(React, 'TextInput');
  const Image = createHostComponent(React, 'Image');

  const reactNativeMock = {
    View,
    Text,
    TextInput,
    Pressable: View,
    ScrollView: createHostComponent(React, 'RCTScrollView'),
    RefreshControl: View,
    ImageBackground: Image,
    Image,
    StyleSheet: {
      absoluteFillObject: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
      create: (styles: Record<string, unknown>) => styles,
      flatten: flattenStyle,
      hairlineWidth: 1,
    },
    Platform: {
      OS: 'ios',
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
  };

  const animationChain = {
    delay: () => animationChain,
    duration: () => animationChain,
    springify: () => animationChain,
  };
  const reanimatedDefault = {
    View,
    createAnimatedComponent: (component: unknown) => component,
  };
  const reanimatedMock = {
    __esModule: true,
    default: reanimatedDefault,
    View,
    FadeInDown: animationChain,
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withSpring: (value: unknown) => value,
  };
  const noop = () => undefined;
  const simpleComponent = (label?: string) => function SimpleComponent(props: Record<string, unknown>) {
    return React.createElement(
      View,
      props,
      (props as { children?: unknown }).children ?? (label ? React.createElement(Text, null, label) : null),
    );
  };
  const screenHeaderMock = {
    ScreenHeader: (props: Record<string, unknown>) => React.createElement(
      View,
      props,
      React.createElement(Text, null, props.kicker),
      React.createElement(Text, null, props.title),
      props.subtitle ? React.createElement(Text, null, props.subtitle) : null,
      props.rightAction,
      props.children,
    ),
  };
  const workoutDataMock = {
    useWorkoutData: () => ({
      loading: false,
      refreshing: false,
      loadData: noop,
      onRefresh: noop,
      prescription: null,
      todayActivities: [],
      workoutHistory: [],
      checkins: [],
      sessions: [],
      userId: 'render-user-id',
      dailyAthleteSummary: null,
      todayPlanEntry: null,
      weeklyEntries: [],
      historyLoaded: true,
      analyticsLoaded: true,
      historyLoading: false,
      analyticsLoading: false,
      initialLoadError: null,
      historyError: null,
      analyticsError: null,
      loadHistoryData: noop,
      loadAnalyticsData: noop,
      handleStartWorkout: noop,
      performanceContext: {
        bodyMass: null,
      },
    }),
    computeACWRTimeSeries: () => [],
  };
  const workoutUtilsMock = {
    WORKOUT_TABS: ['today', 'plan', 'history', 'analytics'],
    buildSleepData: () => [],
    buildTrainTodaySummary: () => ({
      effortTone: 'steady',
      durationLabel: null,
      sessionLabel: 'Training',
      goal: 'Keep the plan moving.',
      reason: 'Render test training summary.',
      effortTitle: 'Steady',
      effortDetail: 'Stay controlled.',
      guardrails: [],
    }),
    buildTrainingLoadData: () => [],
    buildWeightData: () => [],
    formatWorkoutTabLabel: (tab: string) => tab,
    getWorkoutFocusLabel: () => 'Training',
  };

  Module._load = function loadWithRenderMocks(request: string, parent: unknown, isMain: boolean) {
    if (request === 'react-native') return reactNativeMock;
    if (request === 'react-native-reanimated') return reanimatedMock;
    if (request === '@react-navigation/native') {
      return {
        useFocusEffect: noop,
        useNavigation: () => ({
          getParent: () => ({ navigate: noop }),
          navigate: noop,
        }),
      };
    }
    if (request === '../hooks/useWorkoutData') return workoutDataMock;
    if (request === '../theme/ReadinessThemeContext') {
      return {
        useReadinessTheme: () => ({
          themeColor: '#D4AF37',
          currentLevel: 'green',
        }),
      };
    }
    if (request === '../AnimatedPressable') return { AnimatedPressable: View };
    if (request === '../components/AnimatedPressable') return { AnimatedPressable: View };
    if (request === '../components/ScreenHeader') return screenHeaderMock;
    if (request === '../components/ScreenWrapper') return { ScreenWrapper: simpleComponent() };
    if (request === '../components/SkeletonLoader') return { SkeletonLoader: simpleComponent('Loading') };
    if (request === '../components/WorkoutAnalyticsTab') return { WorkoutAnalyticsTab: simpleComponent('Analytics') };
    if (request === '../components/WorkoutHistoryTab') return { WorkoutHistoryTab: simpleComponent('History') };
    if (request === '../components/WorkoutPrescriptionSection') return { WorkoutPrescriptionSection: simpleComponent('Prescription') };
    if (request === '../components/performance/UnifiedJourneySummaryCard') return { UnifiedJourneySummaryCard: simpleComponent('Journey') };
    if (request === '../components/workout') {
      return {
        GeneratedWorkoutPreviewCard: require('../../../src/components/workout/GeneratedWorkoutPreviewCard.tsx').GeneratedWorkoutPreviewCard,
        GeneratedWorkoutBetaSessionCard: require('../../../src/components/workout/GeneratedWorkoutBetaSessionCard.tsx').GeneratedWorkoutBetaSessionCard,
      };
    }
    if (request === '../../lib/engine/presentation') return { buildTrainingFloorViewModel: () => ({ isDeload: false }) };
    if (request === '../../lib/api/fightCampService') return { getGuidedWorkoutContext: async () => ({ phase: 'build', fitnessLevel: 'beginner' }) };
    if (request === '../../lib/utils/date') return { todayLocalDate: () => '2026-05-03' };
    if (request === '../../lib/supabase') return { supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } };
    if (request === '../../lib/engine/sessionLabels') return { getSessionFamilyLabel: () => 'Training' };
    if (request === '../../lib/engine/sessionOwnership') return { isGuidedEngineActivityType: () => false };
    if (request === './workout/utils') return workoutUtilsMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  for (const extension of ['.png', '.jpg', '.jpeg', '.webp']) {
    require.extensions[extension] = (module: { exports: unknown }, filename: string) => {
      module.exports = { uri: filename };
    };
  }

  global.IS_REACT_ACT_ENVIRONMENT = true;
}

function textContent(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  const maybeNode = node as { children?: unknown[] };
  return maybeNode.children ? maybeNode.children.map(textContent).join('') : '';
}

function hasRenderedText(screen: { toJSON: () => unknown }, pattern: RegExp): boolean {
  return pattern.test(textContent(screen.toJSON()));
}

function firstExercise(workout: GeneratedWorkout) {
  return workout.blocks.flatMap((block) => block.exercises)[0];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function progressionDecision(): ProgressionDecision {
  return {
    direction: 'progress',
    reason: 'The completed session stayed controlled with low pain.',
    nextAdjustment: 'Add one rep to the main strength work next time.',
    safetyFlags: [],
    userMessage: 'Progress carefully next time.',
    coachNotes: ['Render test fixture.'],
  };
}

function setWorkoutScreenFlags(flags: { beta?: boolean; preview?: boolean; dev?: boolean }) {
  if (flags.beta) process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA = '1';
  else delete process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_BETA;

  if (flags.preview) process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW = '1';
  else delete process.env.EXPO_PUBLIC_WORKOUT_PROGRAMMING_PREVIEW;

  global.__DEV__ = flags.dev ?? true;
}

function loadWorkoutScreen() {
  const modulePath = require.resolve('../../../src/screens/WorkoutScreen.tsx');
  delete require.cache[modulePath];
  return require('../../../src/screens/WorkoutScreen.tsx').WorkoutScreen;
}

async function run(): Promise<void> {
  console.log('\n-- workout programming generated workout render tests --');
  installRenderMocks();

  const React = require('react');
  const { render, fireEvent, act, cleanup } = require('@testing-library/react-native/pure');
  const {
    GeneratedWorkoutPreviewCard,
  } = require('../../../src/components/workout/GeneratedWorkoutPreviewCard.tsx');
  const {
    GeneratedWorkoutBetaSessionCard,
  } = require('../../../src/components/workout/GeneratedWorkoutBetaSessionCard.tsx');

  const validWorkout = await generatePreviewWorkout(workoutProgrammingServiceFixtures.beginnerBodyweightStrength, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });
  const blockedWorkout = await generatePreviewWorkout({
    ...workoutProgrammingServiceFixtures.beginnerBodyweightStrength,
    safetyFlags: ['red_flag_symptoms'],
  }, {
    persistGeneratedWorkout: false,
    contentReviewMode: 'preview',
  });

  const preview = render(React.createElement(GeneratedWorkoutPreviewCard, { workout: validWorkout }));
  const exercise = firstExercise(validWorkout);
  assert('GeneratedWorkoutPreviewCard renders a valid generated workout', Boolean(preview.getByTestId('generated-workout-preview-card')));
  assert('preview card renders session intent', preview.getAllByText(validWorkout.sessionIntent).length > 0);
  assert('preview card renders blocks', validWorkout.blocks.every((block) => Boolean(preview.getByText(block.title))));
  assert('preview card renders exercises', Boolean(exercise && preview.getByText(exercise.name)));
  assert('preview card renders prescriptions', hasRenderedText(preview, /Dose/i) && hasRenderedText(preview, /Effort \d+\/10/i));
  assert('preview card renders effort', Boolean(preview.getByTestId('generated-workout-preview-effort')));
  assert('preview card renders safety notes', Boolean(preview.getByTestId('generated-workout-preview-safety')) && hasRenderedText(preview, /Pause if pain becomes sharp/i));
  assert('preview card renders success criteria', Boolean(preview.getByTestId('generated-workout-preview-success')) && hasRenderedText(preview, new RegExp(escapeRegExp(validWorkout.successCriteria[0]))));
  assert('preview card renders substitutions', Boolean(preview.getByTestId('generated-workout-preview-substitutions')) && hasRenderedText(preview, /Substitutions/i));
  assert('preview card renders scaling options', Boolean(preview.getByTestId('generated-workout-preview-scaling')) && hasRenderedText(preview, /Down:/i));
  assert('preview card renders tracking metrics', Boolean(preview.getByTestId('generated-workout-preview-tracking')) && hasRenderedText(preview, new RegExp(escapeRegExp((validWorkout.trackingMetrics ?? validWorkout.trackingMetricIds)[0]), 'i')));
  assert('preview card renders completion message', Boolean(preview.getByTestId('generated-workout-preview-completion')) && hasRenderedText(preview, new RegExp(escapeRegExp(validWorkout.description?.completionMessage ?? ''), 'i')));
  assert('preview card renders user-safe decision summary', Boolean(preview.getByTestId('generated-workout-preview-why')) && hasRenderedText(preview, /Why this workout\?/i));
  preview.unmount();

  const blocked = render(React.createElement(GeneratedWorkoutPreviewCard, { workout: blockedWorkout }));
  assert('preview card renders blocked workout safely', Boolean(
    blockedWorkout.blocked
      && blocked.getByTestId('generated-workout-preview-blocked')
      && blocked.getByText(/This generated session is blocked/i)
      && hasRenderedText(blocked, /Safety wins/i)
      && hasRenderedText(blocked, /Hard training is not recommended/i),
  ));
  blocked.unmount();

  const eventLog: string[] = [];
  const baseBetaProps = {
    userAuthenticated: true,
    generatedWorkoutId: 'render-generated-workout-id',
    persisted: true,
    startedAt: null,
    loading: false,
    completing: false,
    error: null,
    defaultReadinessBand: 'green',
    onGenerate: () => { eventLog.push('generate'); },
    onStart: () => { eventLog.push('start'); },
    onPause: () => { eventLog.push('pause'); },
    onResume: () => { eventLog.push('resume'); },
    onAbandon: () => { eventLog.push('abandon'); },
    onComplete: () => { eventLog.push('complete'); },
    onReset: () => { eventLog.push('reset'); },
  };

  const configure = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'configure',
    workout: null,
    progressionDecision: null,
  }));
  assert('beta session card renders configure state', Boolean(
    configure.getByTestId('generated-workout-beta-card')
      && configure.getByLabelText('Generate workout')
      && configure.getByText('Choose the basics. The engine keeps safety and readiness in the request.'),
  ));
  act(() => { fireEvent.press(configure.getByLabelText('Generate workout')); });
  assert('beta configure state calls generate handler', eventLog.includes('generate'));
  configure.unmount();

  const inspect = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'inspect',
    workout: validWorkout,
    progressionDecision: null,
  }));
  assert('beta session card renders inspect state', Boolean(inspect.getByLabelText('Start generated workout')));
  act(() => { fireEvent.press(inspect.getByLabelText('Start generated workout')); });
  assert('beta inspect state calls start handler', eventLog.includes('start'));
  inspect.unmount();

  const blockedInspect = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'inspect',
    workout: blockedWorkout,
    progressionDecision: null,
  }));
  const blockedStart = blockedInspect.getByTestId('generated-workout-beta-start');
  assert('start button is disabled for blocked workouts', Boolean(
    blockedStart.props.disabled === true
      && blockedStart.props.accessibilityState?.disabled === true
      && blockedInspect.getByLabelText('Workout blocked by safety review'),
  ));
  blockedInspect.unmount();

  const started = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'started',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    lifecycleStatus: 'started',
    progressionDecision: null,
  }));
  assert('beta session card renders started state', Boolean(started.getByTestId('generated-workout-beta-checklist')));
  assert('beta session card renders lifecycle controls', Boolean(started.getByTestId('generated-workout-beta-lifecycle-controls') && started.getByLabelText('Pause generated workout')));
  assert('completion controls render checklist', Boolean(started.getByTestId('generated-workout-beta-checklist')));
  assert('completion controls render RPE', Boolean(started.getByLabelText('Decrease Session effort rating') && started.getByLabelText('Increase Session effort rating')));
  assert('completion controls render pain before/after', Boolean(started.getByLabelText('Decrease Pain before') && started.getByLabelText('Increase Pain after')));
  assert('completion controls render feedback tags', Boolean(started.getByTestId('generated-workout-beta-feedback') && started.getByText('Too easy') && started.getByText('Pain or discomfort')));
  assert('completion controls render notes', Boolean(started.getByTestId('generated-workout-beta-notes')));
  assert('completion controls render complete button', Boolean(started.getByLabelText('Complete generated workout')));
  act(() => { fireEvent.press(started.getByLabelText('Mark all exercises complete')); });
  act(() => { fireEvent.changeText(started.getByLabelText('Workout notes'), 'Felt smooth and controlled.'); });
  act(() => { fireEvent.press(started.getByLabelText('Complete generated workout')); });
  assert('beta started state calls complete handler', eventLog.includes('complete'));
  started.unmount();

  const paused = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'started',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    lifecycleStatus: 'paused',
    progressionDecision: null,
  }));
  assert('beta session card can resume a paused persisted session', Boolean(paused.getByLabelText('Resume generated workout') && paused.getByText('Resume to Complete')));
  act(() => { fireEvent.press(paused.getByLabelText('Resume generated workout')); });
  assert('beta paused state calls resume handler', eventLog.includes('resume'));
  paused.unmount();

  const completed = render(React.createElement(GeneratedWorkoutBetaSessionCard, {
    ...baseBetaProps,
    stage: 'completed',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    progressionDecision: progressionDecision(),
  }));
  assert('beta session card renders completed state', Boolean(completed.getByTestId('generated-workout-beta-next-progression')));
  assert('progression recommendation renders after completion', Boolean(
    completed.getByText('Recommended next step')
      && completed.getByText('Progress')
      && completed.getByText('Progress carefully next time.'),
  ));
  completed.unmount();

  setWorkoutScreenFlags({ beta: false, preview: false, dev: true });
  const WorkoutScreenFlagsOff = loadWorkoutScreen();
  const flagsOff = render(React.createElement(WorkoutScreenFlagsOff));
  assert('feature flag off does not render beta or preview flow', Boolean(
    flagsOff.queryByTestId('generated-workout-beta-section') === null
      && flagsOff.queryByTestId('generated-workout-preview-section') === null,
  ));
  flagsOff.unmount();

  setWorkoutScreenFlags({ beta: true, preview: true, dev: true });
  const WorkoutScreenBetaOn = loadWorkoutScreen();
  const betaOn = render(React.createElement(WorkoutScreenBetaOn));
  assert('beta feature flag on renders the beta section and suppresses preview', Boolean(
    betaOn.getByTestId('generated-workout-beta-section')
      && betaOn.queryByTestId('generated-workout-preview-section') === null,
  ));
  betaOn.unmount();

  setWorkoutScreenFlags({ beta: false, preview: true, dev: true });
  const WorkoutScreenPreviewOn = loadWorkoutScreen();
  const previewOn = render(React.createElement(WorkoutScreenPreviewOn));
  assert('preview feature flag on renders the preview section', Boolean(
    previewOn.getByTestId('generated-workout-preview-section')
      && previewOn.queryByTestId('generated-workout-beta-section') === null,
  ));
  previewOn.unmount();

  cleanup();
}

run()
  .then(() => {
    console.log(`\n-- Results: ${passed} passed, ${failed} failed --`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
