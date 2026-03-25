import type { DailyCheckin, TrainingSession } from '../../hooks/useWorkoutData';
import { getSessionFamilyLabel } from '../../../lib/engine/sessionLabels';

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
