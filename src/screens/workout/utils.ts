import type { DailyCheckin, TrainingSession } from '../../hooks/useWorkoutData';

export const WORKOUT_TABS = ['today', 'plan', 'history', 'analytics'] as const;

export type WorkoutTabKey = typeof WORKOUT_TABS[number];

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

export function getWorkoutFocusLabel(focus: string | null | undefined, sessionType: string): string {
  if (!focus) {
    return sessionType;
  }

  return FOCUS_LABELS[focus] ?? focus;
}
