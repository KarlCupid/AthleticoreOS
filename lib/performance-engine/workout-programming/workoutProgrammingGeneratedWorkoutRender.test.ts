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
let workoutScreenHasBoxingEntry = false;
let workoutScreenNavigationEvents: Array<{ screen: string; params: Record<string, unknown> | undefined }> = [];

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
    Keyboard: {
      dismiss: () => undefined,
      addListener: () => ({ remove: () => undefined }),
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
  function boxingGeneratedEntry() {
    const snapshot = {
      snapshotKind: 'boxing_generated_program_entry',
      schemaVersion: 1,
      sourceOfTruth: 'GeneratedProgram',
      programId: 'render-program',
      sessionId: 'render-session',
      weekIndex: 1,
      dayIndex: 1,
      scheduledDate: '2026-05-03',
      label: 'Footwork agility',
      protectedAnchor: false,
      goalId: 'footwork_agility',
      preferredSessionTemplateId: 'footwork_agility',
      plannedIntensity: 'low',
      estimatedDurationMinutes: 20,
      athleticDevelopmentDomain: 'boxing_skill_support',
      supportDomainLabel: 'Skill support',
      expectedFuelPriority: 'boxing_practice',
      expectedCarbDemandClass: 'low',
      expectedRecoveryDemandClass: 'low',
      expectedHydrationDemandClass: 'baseline',
      sessionEnergyDemandScore: 20,
      sessionRecoveryDemandScore: 18,
      boxingSessionFamily: 'footwork_agility',
      boxingSessionRole: 'footwork_agility',
      sessionDoseCategory: 'microdose',
      sAndCRationale: 'Build sharper footwork without adding sparring load.',
      boxingRelevance: 'This supports boxing without replacing coach-led practice.',
      rationale: ['Footwork keeps the boxing week sharp without adding hard load.'],
      generatedWorkout: null,
      weekSummary: {
        weeklyBoxingHeadline: 'Build cleaner feet around protected boxing.',
        weeklyBoxingSummary: 'Athleticore generated support around boxing anchors.',
        primaryBoxingFocus: 'Footwork quality',
        hardDaySummary: '1 of 3 hard days planned.',
        protectedLoadSummary: 'Protected boxing anchors stay fixed.',
        generatedSupportSummary: 'One microdose keeps quality high.',
        nextBestAction: 'Run the footwork microdose before heavy fatigue.',
        coachSummaryBullets: ['Keep the microdose crisp.'],
        coachRationale: ['Render fixture for boxing weekly intelligence.'],
        userFacingWarnings: [],
        validationWarnings: [],
        hardDayCount: 1,
        hardDayCap: 3,
        generatedFullSessionCount: 0,
        generatedSupportSessionCount: 0,
        generatedMicrodoseCount: 1,
        protectedBoxingSessionCount: 1,
        protectedSparringCount: 0,
        protectedRoadworkCount: 0,
        qualityGaps: [],
      },
    };
    return {
      id: 'render-weekly-entry',
      user_id: 'render-user-id',
      week_start_date: '2026-05-03',
      date: '2026-05-03',
      day_of_week: 0,
      slot: 'single',
      day_order: 1,
      session_type: 'boxing_practice',
      focus: 'sport_specific',
      session_family: 'boxing_skill',
      sc_session_family: 'footwork',
      placement_source: 'generated',
      progression_intent: 'footwork_agility',
      estimated_duration_min: 20,
      target_intensity: 3,
      status: 'planned',
      prescription_snapshot: snapshot,
      is_deload: false,
      scheduled_activity_id: null,
    };
  }

  const workoutDataMock = {
    useWorkoutData: () => {
      const boxingEntry = workoutScreenHasBoxingEntry ? boxingGeneratedEntry() : null;
      return ({
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
      todayPlanEntry: boxingEntry,
      weeklyEntries: boxingEntry ? [boxingEntry] : [],
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
    });
    },
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
    if (request === 'react-native-safe-area-context') {
      return {
        SafeAreaProvider: View,
        useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
      };
    }
    if (request === 'react-native-reanimated') return reanimatedMock;
    if (request === '@expo/vector-icons') return { MaterialCommunityIcons: simpleComponent('Icon') };
    if (request === '@react-navigation/native') {
      return {
        useFocusEffect: noop,
        useNavigation: () => ({
          getParent: () => ({ navigate: (screen: string, params?: Record<string, unknown>) => { workoutScreenNavigationEvents.push({ screen, params }); } }),
          navigate: (screen: string, params?: Record<string, unknown>) => { workoutScreenNavigationEvents.push({ screen, params }); },
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
    if (request === '../CustomNumericInput') {
      return {
        CustomNumericInput: (props: Record<string, unknown>) => React.createElement(TextInput, {
          ...props,
          editable: !(props as { disabled?: boolean }).disabled,
        }),
        CustomNumericPadProvider: View,
        useCustomNumericPad: () => ({ isOpen: false, close: noop }),
      };
    }
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
        BoxingGeneratedWorkoutSessionCard: require('../../../src/components/workout/BoxingGeneratedWorkoutSessionCard.tsx').BoxingGeneratedWorkoutSessionCard,
      };
    }
    if (request === '../../lib/engine/presentation') return { buildTrainingFloorViewModel: () => ({ isDeload: false }) };
    if (request === '../../lib/api/fightCampService') return { getGuidedWorkoutContext: async () => ({ phase: 'build', fitnessLevel: 'beginner' }) };
    if (request === '../../lib/utils/date') return { todayLocalDate: () => '2026-05-03' };
    if (request === '../../lib/supabase') return { supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'render-user-id' } } } }) } } };
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

function setWorkoutScreenFlags(flags: { engineEnabled?: boolean; dev?: boolean }) {
  if (flags.engineEnabled) process.env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED = '1';
  else process.env.EXPO_PUBLIC_BOXING_WORKOUT_ENGINE_ENABLED = '0';

  global.__DEV__ = flags.dev ?? true;
}

function setWorkoutScreenData(flags: { boxingEntry?: boolean }) {
  workoutScreenHasBoxingEntry = flags.boxingEntry === true;
  workoutScreenNavigationEvents = [];
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
    BoxingGeneratedWorkoutSessionCard,
  } = require('../../../src/components/workout/BoxingGeneratedWorkoutSessionCard.tsx');

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
  assert('preview card renders prescriptions', hasRenderedText(preview, /Effort \d+\/10/i));
  assert('preview card renders coach brief', Boolean(preview.getByTestId('generated-workout-preview-brief')) && hasRenderedText(preview, new RegExp(escapeRegExp(validWorkout.description?.effortExplanation ?? ''), 'i')));
  assert('preview card renders success criteria in coach brief', Boolean(preview.getByTestId('generated-workout-preview-brief')) && hasRenderedText(preview, new RegExp(escapeRegExp(validWorkout.successCriteria[0]))));
  assert('preview card keeps details hidden by default', preview.queryByTestId('generated-workout-preview-why') === null && preview.queryByTestId('generated-workout-preview-substitutions') === null);
  assert('preview card exposes details disclosure', Boolean(preview.getByText('Show details')));
  fireEvent.press(preview.getByText('Show details'));
  assert('preview card renders safety fact tile by default', hasRenderedText(preview, /Safety/i));
  assert('preview card renders safety details after disclosure when session has specific notes', Boolean(preview.getByTestId('generated-workout-preview-safety')));
  assert('preview card renders substitutions and scaling together after disclosure', Boolean(preview.getByTestId('generated-workout-preview-substitutions')) && hasRenderedText(preview, /Substitutions \/ scaling/i) && hasRenderedText(preview, /Down:/i));
  const previewTrackingMetrics = validWorkout.trackingMetrics ?? validWorkout.trackingMetricIds;
  const hasNonObviousTracking = previewTrackingMetrics.some((metric) => !['session_rpe', 'duration_minutes', 'completion_status'].includes(metric));
  assert(
    'preview card renders non-obvious tracking metrics only after disclosure',
    hasNonObviousTracking
      ? Boolean(preview.getByTestId('generated-workout-preview-tracking'))
      : preview.queryByTestId('generated-workout-preview-tracking') === null,
  );
  assert('preview card renders completion message after disclosure', Boolean(preview.getByTestId('generated-workout-preview-completion')) && hasRenderedText(preview, new RegExp(escapeRegExp(validWorkout.description?.completionMessage ?? ''), 'i')));
  assert('preview card renders user-safe decision summary after disclosure', Boolean(preview.getByTestId('generated-workout-preview-why')) && hasRenderedText(preview, /Why this session/i));
  assert('preview card omits media panel when no reviewed media asset exists', preview.queryByTestId(`generated-workout-exercise-media-${exercise.exerciseId}`) === null);
  preview.unmount();

  const workoutWithReviewedMedia: GeneratedWorkout = {
    ...validWorkout,
    blocks: validWorkout.blocks.map((block, blockIndex) => ({
      ...block,
      exercises: block.exercises.map((item, exerciseIndex) => (
        blockIndex === 0 && exerciseIndex === 0
          ? {
              ...item,
              media: {
                thumbnailUrl: 'https://example.test/workout-media/render-demo.jpg',
                altText: `${item.name} setup and execution demonstration`,
                reviewStatus: 'approved',
                priority: 'high',
              },
            }
          : item
      )),
    })),
  };
  const mediaPreview = render(React.createElement(GeneratedWorkoutPreviewCard, { workout: workoutWithReviewedMedia }));
  fireEvent.press(mediaPreview.getByText('Show details'));
  assert('preview card exposes reviewed media safely when present', Boolean(
    mediaPreview.getByTestId(`generated-workout-exercise-media-${exercise.exerciseId}`)
      && mediaPreview.getByText('Demo thumbnail')
      && mediaPreview.getByText(`${exercise.name} setup and execution demonstration`),
  ));
  mediaPreview.unmount();

  const blocked = render(React.createElement(GeneratedWorkoutPreviewCard, { workout: blockedWorkout }));
  assert('preview card renders blocked workout safely', Boolean(
    blockedWorkout.blocked
      && blocked.getByTestId('generated-workout-preview-blocked')
      && blocked.getByText(/This support session needs review/i)
      && hasRenderedText(blocked, /Safety wins/i)
      && hasRenderedText(blocked, /Hard training is not the right call/i),
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

  const configure = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'configure',
    workout: null,
    progressionDecision: null,
  }));
  assert('beta session card renders configure state', Boolean(
    configure.getByTestId('boxing-generated-workout-card')
      && configure.getByLabelText('Build support session')
      && configure.getByText('Choose extra support only when it helps the week. Planned sessions open from Today and Train.'),
  ));
  act(() => { fireEvent.press(configure.getByLabelText('Build support session')); });
  assert('boxing configure state calls generate handler', eventLog.includes('generate'));
  configure.unmount();

  const inspect = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'inspect',
    workout: validWorkout,
    progressionDecision: null,
  }));
  assert('boxing session card renders inspect state', Boolean(inspect.getByLabelText('Start Athleticore support session')));
  act(() => { fireEvent.press(inspect.getByLabelText('Start Athleticore support session')); });
  assert('boxing inspect state calls start handler', eventLog.includes('start'));
  inspect.unmount();

  const blockedInspect = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'inspect',
    workout: blockedWorkout,
    progressionDecision: null,
  }));
  const blockedStart = blockedInspect.getByTestId('boxing-generated-workout-start');
  assert('start button is disabled for blocked workouts', Boolean(
    blockedStart.props.disabled === true
      && blockedStart.props.accessibilityState?.disabled === true
      && blockedInspect.getByLabelText('Review safer options'),
  ));
  blockedInspect.unmount();

  const started = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'started',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    lifecycleStatus: 'started',
    progressionDecision: null,
  }));
  assert('boxing session card renders started state', Boolean(started.getByTestId('boxing-generated-workout-checklist')));
  assert('boxing session card renders lifecycle controls', Boolean(started.getByTestId('boxing-generated-workout-lifecycle-controls') && started.getByLabelText('Pause Athleticore support session')));
  assert('completion controls render checklist', Boolean(started.getByTestId('boxing-generated-workout-checklist')));
  assert('completion controls render RPE', Boolean(started.getByLabelText('Decrease Session effort rating') && started.getByLabelText('Increase Session effort rating')));
  assert('completion controls render pain before/after', Boolean(started.getByLabelText('Decrease Pain before') && started.getByLabelText('Increase Pain after')));
  assert('completion controls render feedback tags', Boolean(started.getByTestId('boxing-generated-workout-feedback') && started.getByText('Too easy') && started.getByText('Pain or discomfort')));
  assert('completion controls render notes', Boolean(started.getByTestId('boxing-generated-workout-notes')));
  assert('completion controls render complete button', Boolean(started.getByLabelText('Complete Athleticore support session')));
  act(() => { fireEvent.press(started.getByLabelText('Mark all exercises complete')); });
  act(() => { fireEvent.changeText(started.getByLabelText('Workout notes'), 'Felt smooth and controlled.'); });
  act(() => { fireEvent.press(started.getByLabelText('Complete Athleticore support session')); });
  assert('boxing started state calls complete handler', eventLog.includes('complete'));
  started.unmount();

  const paused = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'started',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    lifecycleStatus: 'paused',
    progressionDecision: null,
  }));
  assert('boxing session card can resume a paused persisted session', Boolean(paused.getByLabelText('Resume Athleticore support session') && paused.getByText('Resume to complete')));
  act(() => { fireEvent.press(paused.getByLabelText('Resume Athleticore support session')); });
  assert('boxing paused state calls resume handler', eventLog.includes('resume'));
  paused.unmount();

  const completed = render(React.createElement(BoxingGeneratedWorkoutSessionCard, {
    ...baseBetaProps,
    stage: 'completed',
    workout: validWorkout,
    startedAt: '2026-05-03T12:00:00.000Z',
    progressionDecision: progressionDecision(),
  }));
  assert('boxing session card renders completed state', Boolean(completed.getByTestId('boxing-generated-workout-next-progression')));
  assert('progression recommendation renders after completion', Boolean(
    completed.getByText('Recommended next step')
      && completed.getByText('Progress')
      && completed.getByText('Progress carefully next time.'),
  ));
  completed.unmount();

  setWorkoutScreenData({ boxingEntry: true });
  setWorkoutScreenFlags({ engineEnabled: false, dev: true });
  const WorkoutScreenFlagsOff = loadWorkoutScreen();
  const flagsOff = render(React.createElement(WorkoutScreenFlagsOff));
  assert('boxing engine flag off still renders planned support session, not standalone generator or diagnostics flow', Boolean(
    flagsOff.getByTestId('planned-support-session-card')
      && flagsOff.queryByTestId('boxing-generated-workout-section') === null
      && flagsOff.queryByTestId('internal-workout-diagnostics-section') === null,
  ));
  assert('planned support session exposes a single Today execution CTA', Boolean(
    flagsOff.getAllByLabelText('Open support session').length === 1
      && flagsOff.queryByLabelText('Start session') === null
      && flagsOff.queryByLabelText('Generate attached workout') === null,
  ));
  await act(async () => { fireEvent.press(flagsOff.getByLabelText('Open support session')); });
  assert('planned support session primary CTA opens WorkoutDetail', Boolean(
    workoutScreenNavigationEvents.some((event) => event.screen === 'WorkoutDetail'
      && (event.params as { weeklyPlanEntryId?: string } | undefined)?.weeklyPlanEntryId === 'render-weekly-entry'),
  ));
  flagsOff.unmount();

  setWorkoutScreenData({ boxingEntry: true });
  setWorkoutScreenFlags({ engineEnabled: true, dev: true });
  const WorkoutScreenEngineOn = loadWorkoutScreen();
  const engineOn = render(React.createElement(WorkoutScreenEngineOn));
  assert('boxing engine flag on keeps Today entry-bound and suppresses standalone generator', Boolean(
    engineOn.getByTestId('planned-support-session-card')
      && engineOn.queryByTestId('boxing-generated-workout-section') === null
      && engineOn.queryByTestId('internal-workout-diagnostics-section') === null,
  ));
  engineOn.unmount();

  setWorkoutScreenData({ boxingEntry: true });
  setWorkoutScreenFlags({ engineEnabled: true, dev: false });
  const WorkoutScreenNonDevFlagsOn = loadWorkoutScreen();
  const nonDevFlagsOn = render(React.createElement(WorkoutScreenNonDevFlagsOn));
  assert('non-dev builds keep planned support entry-bound when rollout flag is enabled', Boolean(
    nonDevFlagsOn.getByTestId('planned-support-session-card')
      && nonDevFlagsOn.queryByTestId('boxing-generated-workout-section') === null
      && nonDevFlagsOn.queryByTestId('internal-workout-diagnostics-section') === null,
  ));
  nonDevFlagsOn.unmount();

  setWorkoutScreenFlags({ engineEnabled: true, dev: true });
  setWorkoutScreenData({ boxingEntry: false });
  const WorkoutScreenPreviewOn = loadWorkoutScreen();
  const previewOn = render(React.createElement(WorkoutScreenPreviewOn));
  assert('normal Train screen does not render planned support card, standalone generator, or internal diagnostics without a boxing plan entry', Boolean(
    previewOn.queryByTestId('planned-support-session-card') === null
      && previewOn.queryByTestId('boxing-generated-workout-section') === null
      && previewOn.queryByTestId('internal-workout-diagnostics-section') === null,
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
