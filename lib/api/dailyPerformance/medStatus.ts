import type { MEDStatus, WeeklyPlanEntryRow } from '../../engine/index.ts';
import { daysBetween, getWeekWindow } from './dateWindow';

function inferPowerTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.primaryAdaptation === 'power') return true;
  return entry.focus === 'sport_specific'
    || entry.focus === 'full_body';
}

function inferStrengthTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'strength' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'strength') return true;
  return entry.session_type === 'sc'
    || entry.focus === 'lower'
    || entry.focus === 'upper_push'
    || entry.focus === 'upper_pull'
    || entry.focus === 'full_body';
}

function inferConditioningTouch(entry: WeeklyPlanEntryRow): boolean {
  if (entry.prescription_snapshot?.doseCredits?.some((credit) => credit.bucket === 'conditioning' && credit.credit > 0)) return true;
  if (entry.prescription_snapshot?.primaryAdaptation === 'conditioning') return true;
  return entry.session_type === 'conditioning'
    || entry.session_type === 'road_work'
    || entry.focus === 'conditioning';
}

function summarizeMedExposure(
  targetTouches: number,
  scheduledTouches: number,
  dayIndex: number,
): {
  targetTouches: number;
  scheduledTouches: number;
  remainingTouches: number;
  status: 'met' | 'pending' | 'at_risk' | 'missed';
} {
  const remainingTouches = Math.max(0, targetTouches - scheduledTouches);
  if (scheduledTouches >= targetTouches) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'met' };
  }
  if (dayIndex >= 5 && remainingTouches > 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'missed' };
  }
  if (dayIndex >= 4 && remainingTouches >= 1) {
    return { targetTouches, scheduledTouches, remainingTouches, status: 'at_risk' };
  }
  return { targetTouches, scheduledTouches, remainingTouches, status: 'pending' };
}

export function deriveMEDStatus(entries: WeeklyPlanEntryRow[], date: string): MEDStatus {
  const weekStart = getWeekWindow(date).weekStart;
  const dayIndex = Math.max(0, daysBetween(weekStart, date));
  const activeEntries = entries.filter((entry) => entry.status !== 'skipped');
  const powerTouches = activeEntries.filter(inferPowerTouch).length;
  const strengthTouches = activeEntries.filter(inferStrengthTouch).length;
  const conditioningTouches = activeEntries.filter(inferConditioningTouch).length;

  const power = summarizeMedExposure(1, powerTouches, dayIndex);
  const strength = summarizeMedExposure(2, strengthTouches, dayIndex);
  const conditioning = summarizeMedExposure(2, conditioningTouches, dayIndex);
  const statuses = [power.status, strength.status, conditioning.status];
  const overall = statuses.includes('missed')
    ? 'missed'
    : statuses.includes('at_risk')
      ? 'at_risk'
      : 'on_track';

  return {
    power,
    strength,
    conditioning,
    overall,
    summary: overall === 'on_track'
      ? 'Minimum effective dose exposures are on track this week.'
      : overall === 'at_risk'
        ? 'At least one key quality is drifting toward a missed weekly exposure.'
        : 'The current week is missing at least one minimum effective dose target.',
  };
}
