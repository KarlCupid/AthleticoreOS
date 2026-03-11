import { formatLocalDate } from '../../../lib/utils/date';

export interface ACWRTrainingSession {
  date: string;
  total_load: number;
}

export function computeACWRTimeSeries(sessions: ACWRTrainingSession[]): { x: number; y: number }[] {
  if (sessions.length < 7) return [];

  const loadByDate: Record<string, number> = {};
  sessions.forEach((session) => {
    loadByDate[session.date] = (loadByDate[session.date] || 0) + (session.total_load || 0);
  });

  const dates = Object.keys(loadByDate).sort();
  if (dates.length < 7) return [];

  const parseDate = (iso: string) => new Date(`${iso}T00:00:00`);
  const addDays = (iso: string, days: number) => {
    const date = parseDate(iso);
    date.setDate(date.getDate() + days);
    return formatLocalDate(date);
  };
  const daysBetween = (startIso: string, endIso: string) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((parseDate(endIso).getTime() - parseDate(startIso).getTime()) / msPerDay);
  };

  const results: { x: number; y: number }[] = [];

  for (let i = 6; i < dates.length; i++) {
    const currentDate = dates[i];
    const acuteStart = addDays(currentDate, -6);
    const chronicStart = addDays(currentDate, -27);

    const windowDates = dates.filter((date) => date >= chronicStart && date <= currentDate);
    const acute = dates
      .filter((date) => date >= acuteStart && date <= currentDate)
      .reduce((sum, date) => sum + (loadByDate[date] || 0), 0);

    const chronicTotal = windowDates.reduce((sum, date) => sum + (loadByDate[date] || 0), 0);
    const oldestInWindow = windowDates[0] ?? currentDate;
    const coveredDays = Math.max(1, Math.min(28, daysBetween(oldestInWindow, currentDate) + 1));
    const chronic = coveredDays > 0 ? (chronicTotal / coveredDays) * 7 : 0;

    const ratio = chronic > 0 ? acute / chronic : 0;
    results.push({ x: results.length, y: Math.round(ratio * 100) / 100 });
  }

  return results;
}
