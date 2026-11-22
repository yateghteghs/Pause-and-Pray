/**
 * Calendar-date helpers. Liturgical dates are civil dates with no time zone,
 * so all arithmetic is done on UTC midnights to avoid daylight-saving bugs.
 */

export type DayKey = string; // "YYYY-MM-DD"

const DAY_MS = 86_400_000;

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** The civil date of a local timestamp, as a UTC-midnight Date. */
export function civilDate(local: Date): Date {
  return utcDate(local.getFullYear(), local.getMonth() + 1, local.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(d: Date): number {
  return d.getUTCDay();
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export function dayKey(d: Date): DayKey {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Day key of a local timestamp (the user's own calendar day). */
export function localDayKey(local: Date): DayKey {
  return dayKey(civilDate(local));
}

export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return utcDate(y, m, d);
}

/** First Sunday strictly after d (or d itself when inclusive and d is a Sunday). */
export function nextSunday(d: Date, inclusive = false): Date {
  const w = weekday(d);
  if (w === 0 && inclusive) return d;
  return addDays(d, 7 - w);
}

export function previousSunday(d: Date, inclusive = false): Date {
  const w = weekday(d);
  if (w === 0 && inclusive) return d;
  return addDays(d, w === 0 ? -7 : -w);
}

/** "Monday 30 November" style label for a day key, in the user's locale. */
export function formatDayKey(key: DayKey): string {
  return parseDayKey(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
