import type { DailyCheckin, TrainingSession } from '../../hooks/useWorkoutData';
import { getSessionFamilyLabel } from '../../../lib/engine/sessionLabels';
import type { DailyCutProtocolRow } from '../../../lib/engine/types';
import type { TrainingFloorViewModel } from '../../../lib/engine/presentation/types';

export const WORKOUT_TABS = ['today', 'plan', 'history', 'analytics'] as const;

export type WorkoutTabKey = typeof WORKOUT_TABS[number];

export interface TrainTodaySummary {
  sessionLabel: string;
  goal: string;
  reason: string;
  durationLabel: string | null;
  effortTitle: string;
  effortDetail: string;
  effortTone: 'calm' | 'steady' | 'push' | 'caution';
  guardrails: string[];
}

export interface ProgressSummaryCard {
  key: 'consistency' | 'load_balance' | 'recovery';
  title: string;
  headline: string;
  body: string;
  tone: 'neutral' | 'success' | 'warning';
}

export interface WorkoutProgressSummary {
  hasPrimaryData: boolean;
  cards: ProgressSummaryCard[];
}

export const FOCUS_LABELS: Record<string, string> = {
  upper_push: 'Upper Push',
  upper_pull: 'Upper Pull',
  lower: 'Lower Body',
  full_body: 'Full Body',
  sport_specific: 'Sport Specific',
  recovery: 'Recovery',
  conditioning: 'Conditioning',
};

export function buildWeightData(checkins: DailyCheckin[]) {
  return checkins
    .filter((checkin) => checkin.morning_weight !== null)
    .map((checkin, index) => ({
      x: index,
      y: Number(checkin.morning_weight),
      label: checkin.date.slice(5),
    }));
}

export function buildSleepData(checkins: DailyCheckin[]) {
  return checkins.map((checkin, index) => ({
    x: index,
    y: checkin.sleep_quality,
    label: checkin.date.slice(5),
  }));
}

export function buildTrainingLoadData(sessions: TrainingSession[]) {
  return sessions.map((session, index) => ({
    x: index,
    y: session.total_load || 0,
    label: session.date.slice(5),
  }));
}

export function getWorkoutFocusLabel(
  focus: string | null | undefined,
  sessionType: string,
  prescription?: { sessionFamily?: string | null; workoutType?: string | null; focus?: string | null } | null,
): string {
  return getSessionFamilyLabel({
    sessionType,
    workoutType: (prescription?.workoutType as any) ?? null,
    focus: (prescription?.focus as any) ?? focus,
    prescription: prescription as any,
  });
}

export function formatWorkoutTabLabel(tab: WorkoutTabKey): string {
  if (tab === 'plan') return 'Week';
  if (tab === 'analytics') return 'Progress';
  if (tab === 'history') return 'Recent';
  return 'Today';
}

function getEffortGuidance(input: {
  cutProtocol: DailyCutProtocolRow | null;
  targetIntensity: number | null;
}): Pick<TrainTodaySummary, 'effortTitle' | 'effortDetail' | 'effortTone'> {
  const { cutProtocol, targetIntensity } = input;
  const cap = cutProtocol?.training_intensity_cap ?? null;

  if (cap != null) {
    if (cap <= 4) {
      return {
        effortTitle: 'Keep it easy today',
        effortDetail: `Stay at RPE ${cap}/10 or lower. You should finish feeling better than when you started.`,
        effortTone: 'caution',
      };
    }

    if (cap <= 6) {
      return {
        effortTitle: 'Stay smooth and controlled',
        effortDetail: `Work up to about RPE ${cap}/10 and keep every rep smooth.`,
        effortTone: 'steady',
      };
    }

    return {
      effortTitle: 'Push with control',
      effortDetail: `You can work up to about RPE ${cap}/10 today. Push, but shut it down before form slips.`,
      effortTone: 'push',
    };
  }

  if (targetIntensity == null) {
    return {
      effortTitle: 'Train with clean reps',
      effortDetail: 'Move well, finish strong, and leave a little in the tank if your form starts to fade.',
      effortTone: 'steady',
    };
  }

  if (targetIntensity <= 4) {
    return {
      effortTitle: 'Keep it easy today',
      effortDetail: `This is a lighter workout. Stay around RPE ${targetIntensity}/10 and focus on clean reps.`,
      effortTone: 'calm',
    };
  }

  if (targetIntensity <= 6) {
    return {
      effortTitle: 'Settle into good work',
      effortDetail: `Aim for about RPE ${targetIntensity}/10. You should feel challenged, but never rushed or sloppy.`,
      effortTone: 'steady',
    };
  }

  return {
    effortTitle: 'This is one of your harder sessions',
    effortDetail: `You can work up to about RPE ${targetIntensity}/10 today. Push, but keep every rep clean.`,
    effortTone: 'push',
  };
}

function buildGuardrails(input: {
  cutProtocol: DailyCutProtocolRow | null;
  floorVM: Partial<TrainingFloorViewModel> | null;
}): string[] {
  const { cutProtocol, floorVM } = input;
  const guardrails: string[] = [];
  const cap = cutProtocol?.training_intensity_cap ?? null;
  const activationGuidance = floorVM?.activationGuidance?.trim();
  const cutRecommendation = cutProtocol?.training_recommendation?.trim();

  if (cap != null) {
    guardrails.push(`Cap the effort at RPE ${cap}/10 today.`);
  }

  if (activationGuidance) {
    guardrails.push(activationGuidance);
  }

  if (cutRecommendation) {
    guardrails.push(cutRecommendation);
  }

  return guardrails.slice(0, 2);
}

export function buildTrainTodaySummary(input: {
  floorVM: Partial<TrainingFloorViewModel> | null;
  sessionLabel: string | null;
  cutProtocol: DailyCutProtocolRow | null;
  targetIntensity: number | null;
  durationMin: number | null;
}): TrainTodaySummary {
  const { floorVM, sessionLabel, cutProtocol, targetIntensity, durationMin } = input;
  const goal = floorVM?.sessionGoal?.trim() || 'Get good work done today.';
  const reason = floorVM?.reasonSentence?.trim() || 'Stick with today\'s plan and keep it clean.';
  const resolvedDuration = durationMin ?? floorVM?.estimatedDurationMin ?? 0;

  return {
    sessionLabel: sessionLabel?.trim() || 'Today\'s training',
    goal,
    reason,
    durationLabel: resolvedDuration > 0 ? `${resolvedDuration} min` : null,
    ...getEffortGuidance({ cutProtocol, targetIntensity }),
    guardrails: buildGuardrails({ cutProtocol, floorVM }),
  };
}

function buildConsistencyCard(input: {
  trainingDays: number;
  checkinCount: number;
}): ProgressSummaryCard {
  const { trainingDays, checkinCount } = input;

  if (trainingDays >= 12) {
    return {
      key: 'consistency',
      title: 'Consistency',
      headline: 'You are building real momentum',
      body: `You logged ${trainingDays} training days recently. Keep stacking simple wins instead of chasing perfect weeks.`,
      tone: 'success',
    };
  }

  if (trainingDays >= 5) {
    return {
      key: 'consistency',
      title: 'Consistency',
      headline: 'Your routine is taking shape',
      body: `You logged ${trainingDays} training days recently. Stay with the rhythm and keep showing up.`,
      tone: 'neutral',
    };
  }

  if (trainingDays > 0) {
    return {
      key: 'consistency',
      title: 'Consistency',
      headline: 'You are getting started',
      body: `You have ${trainingDays} logged training day${trainingDays === 1 ? '' : 's'} so far. A couple more workouts will make the pattern clearer.`,
      tone: 'neutral',
    };
  }

  if (checkinCount > 0) {
    return {
      key: 'consistency',
      title: 'Consistency',
      headline: 'You are checking in, but not logging training yet',
      body: 'Start logging your workouts here so Train can show your rhythm and progress.',
      tone: 'warning',
    };
  }

  return {
    key: 'consistency',
    title: 'Consistency',
    headline: 'No training rhythm yet',
    body: 'Finish your first workout and this tab will start showing your recent pattern.',
    tone: 'warning',
  };
}

function buildLoadBalanceCard(acwrData: Array<{ x: number; y: number }>): ProgressSummaryCard {
  const latestRatio = acwrData.length > 0 ? acwrData[acwrData.length - 1].y : null;

  if (latestRatio == null || !Number.isFinite(latestRatio)) {
    return {
      key: 'load_balance',
      title: 'Load Balance',
      headline: 'Need a little more history',
      body: 'Once you log a bit more training, this will show whether your workload looks balanced or is climbing too fast.',
      tone: 'neutral',
    };
  }

  if (latestRatio < 0.8) {
    return {
      key: 'load_balance',
      title: 'Load Balance',
      headline: 'Your load is lighter than your normal',
      body: `Workload trend: ${latestRatio.toFixed(2)}. This can help recovery, but rebuild gradually if it lasts.`,
      tone: 'neutral',
    };
  }

  if (latestRatio <= 1.3) {
    return {
      key: 'load_balance',
      title: 'Load Balance',
      headline: 'Your load looks well balanced',
      body: `Workload trend: ${latestRatio.toFixed(2)}. Keep building this way instead of forcing extra work.`,
      tone: 'success',
    };
  }

  if (latestRatio <= 1.5) {
    return {
      key: 'load_balance',
      title: 'Load Balance',
      headline: 'Your load is climbing',
      body: `Workload trend: ${latestRatio.toFixed(2)}. Push with control and pay attention to recovery this week.`,
      tone: 'warning',
    };
  }

  return {
    key: 'load_balance',
    title: 'Load Balance',
    headline: 'Your load is running hot',
    body: `Workload trend: ${latestRatio.toFixed(2)}. This is a good time to respect caps, shorten workouts, or take the lighter option.`,
    tone: 'warning',
  };
}

function buildRecoveryCard(sleepData: Array<{ x: number; y: number }>): ProgressSummaryCard {
  if (sleepData.length === 0) {
    return {
      key: 'recovery',
      title: 'Recovery Trend',
      headline: 'No recovery trend yet',
      body: 'Log sleep quality after check-ins and this section will show whether recovery is holding up.',
      tone: 'neutral',
    };
  }

  const recent = sleepData.slice(-7);
  const averageSleep = recent.reduce((sum, day) => sum + day.y, 0) / recent.length;

  if (averageSleep >= 4) {
    return {
      key: 'recovery',
      title: 'Recovery Trend',
      headline: 'Recovery looks solid',
      body: `Average sleep quality is ${averageSleep.toFixed(1)}/5 over your recent logs. Keep protecting that baseline.`,
      tone: 'success',
    };
  }

  if (averageSleep >= 3) {
    return {
      key: 'recovery',
      title: 'Recovery Trend',
      headline: 'Recovery is holding, but not great',
      body: `Average sleep quality is ${averageSleep.toFixed(1)}/5. A lighter day or earlier night would likely help.`,
      tone: 'neutral',
    };
  }

  return {
    key: 'recovery',
    title: 'Recovery Trend',
    headline: 'Recovery needs more help right now',
    body: `Average sleep quality is ${averageSleep.toFixed(1)}/5. Keep the work controlled until sleep starts to rebound.`,
    tone: 'warning',
  };
}

export function buildWorkoutProgressSummary(input: {
  trainingLoadData: Array<{ x: number; y: number; label?: string }>;
  acwrData: Array<{ x: number; y: number }>;
  sleepData: Array<{ x: number; y: number; label?: string }>;
  checkinDates: Set<string>;
}): WorkoutProgressSummary {
  const { trainingLoadData, acwrData, sleepData, checkinDates } = input;
  const hasPrimaryData = trainingLoadData.length > 0 || acwrData.length > 0 || sleepData.length > 0 || checkinDates.size > 0;

  return {
    hasPrimaryData,
    cards: [
      buildConsistencyCard({
        trainingDays: trainingLoadData.length,
        checkinCount: checkinDates.size,
      }),
      buildLoadBalanceCard(acwrData),
      buildRecoveryCard(sleepData),
    ],
  };
}
