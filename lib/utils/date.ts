function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizeDisplayDate(date: Date | string): Date {
  return typeof date === 'string'
    ? new Date(`${date}T12:00:00`)
    : date;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
}

export function todayLocalDate(): string {
  return formatLocalDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function formatDisplayDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions,
  locale: string = 'en-US',
): string {
  return normalizeDisplayDate(date).toLocaleDateString(locale, options);
}

export function formatShortWeekdayMonthDay(date: Date | string): string {
  return formatDisplayDate(date, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatLongWeekday(date: Date | string): string {
  return formatDisplayDate(date, { weekday: 'long' });
}

export function formatShortMonthDay(date: Date | string): string {
  return formatDisplayDate(date, { month: 'short', day: 'numeric' });
}

export function formatShortWeekday(date: Date | string): string {
  return formatDisplayDate(date, { weekday: 'short' });
}
