import { addDays, DayKey, localDayKey, parseDayKey, dayKey } from './dates';

export type PauseOutcome = 'prayed' | 'skipped' | 'closed';

export interface PauseEvent {
  /** epoch ms */
  at: number;
  outcome: PauseOutcome;
  prayerId: string;
  /** Package name (Android) or 'shielded-app' (iOS hides which app). */
  app: string;
  /** Seconds the Prayer Pause screen was open. */
  seconds: number;
}

export interface Stats {
  currentStreak: number;
  longestStreak: number;
  daysPrayed: number;
  prayersSaid: number;
  skips: number;
  /** Times the user chose to close the app instead of continuing. */
  timesPutDown: number;
  minutesInPrayer: number;
  /** Share of pauses that ended in "I've prayed" (0–1), or null with no pauses. */
  prayedRate: number | null;
}

/** Day keys (local calendar) on which the user prayed at least once. */
export function prayedDays(events: PauseEvent[]): Set<DayKey> {
  return new Set(events.filter((e) => e.outcome !== 'skipped').map((e) => localDayKey(new Date(e.at))));
}

/**
 * Consecutive days with prayer ending today, or ending yesterday if the user
 * has not prayed yet today (the streak is not broken until the day is over).
 */
export function currentStreak(days: Set<DayKey>, now: Date): number {
  let cursor = parseDayKey(localDayKey(now));
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function longestStreak(days: Set<DayKey>): number {
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = parseDayKey(k);
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function computeStats(events: PauseEvent[], now: Date): Stats {
  const days = prayedDays(events);
  const prayed = events.filter((e) => e.outcome === 'prayed').length;
  const closed = events.filter((e) => e.outcome === 'closed').length;
  const skips = events.filter((e) => e.outcome === 'skipped').length;
  const total = events.length;
  return {
    currentStreak: currentStreak(days, now),
    longestStreak: longestStreak(days),
    daysPrayed: days.size,
    prayersSaid: prayed + closed,
    skips,
    timesPutDown: closed,
    minutesInPrayer: Math.round(
      events.filter((e) => e.outcome !== 'skipped').reduce((s, e) => s + e.seconds, 0) / 60,
    ),
    prayedRate: total === 0 ? null : (prayed + closed) / total,
  };
}
