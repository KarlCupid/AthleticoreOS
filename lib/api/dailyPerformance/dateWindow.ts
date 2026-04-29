export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

export function addDays(date: string, delta: number): string {
  const target = new Date(`${date}T00:00:00`);
  target.setDate(target.getDate() + delta);
  return target.toISOString().slice(0, 10);
}

export function getWeekWindow(date: string): { weekStart: string; weekEnd: string } {
  const target = new Date(`${date}T00:00:00`);
  const day = target.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  target.setDate(target.getDate() + mondayOffset);
  const weekStart = target.toISOString().slice(0, 10);
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
  };
}
