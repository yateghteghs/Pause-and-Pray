/**
 * Daily Mass readings: works out which Lectionary entry belongs to a day and
 * returns its references and texts.
 *
 * References: src/content/lectionary.json (Lectionary for Mass numbering).
 * Texts: src/content/readings-text.json, built by scripts/build-readings.mjs,
 * adapted from the World English Bible (public domain).
 */
import lectionary from '../content/lectionary.json';
import texts from '../content/readings-text.json';
import { addDays, civilDate, sameDay, utcDate, weekday } from './dates';
import { CalendarOptions, liturgicalDay, moveableDates } from './liturgical';

export type ReadingKind = 'first' | 'psalm' | 'second' | 'gospel';

export interface Verse {
  label: string;
  text: string;
}

export interface Reading {
  kind: ReadingKind;
  ref: string;
  verses: Verse[];
}

export interface DayReadings {
  key: string;
  title: string;
  readings: Reading[];
  note?: string;
}

export const READINGS_CREDIT =
  'Texts adapted from the World English Bible (public domain). References follow the Lectionary for Mass.';

export const KIND_LABEL: Record<ReadingKind, string> = {
  first: 'First Reading',
  psalm: 'Responsorial Psalm',
  second: 'Second Reading',
  gospel: 'Gospel',
};

const DAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** The liturgical year is named for the calendar year in which it ends. */
export function liturgicalYear(local: Date, opts: CalendarOptions = {}): number {
  const d = civilDate(local);
  const y = d.getUTCFullYear();
  return d >= moveableDates(y, opts).firstSundayOfAdvent ? y + 1 : y;
}

/** Sunday cycle: Year A, B or C. */
export function sundayCycle(local: Date, opts: CalendarOptions = {}): 'A' | 'B' | 'C' {
  return (['C', 'A', 'B'] as const)[liturgicalYear(local, opts) % 3];
}

/** Weekday cycle for Ordinary Time: Year I in odd years, Year II in even years. */
export function weekdayCycle(local: Date, opts: CalendarOptions = {}): 'I' | 'II' {
  return liturgicalYear(local, opts) % 2 === 1 ? 'I' : 'II';
}

/** Lectionary keys to try for a day, most specific first. */
export function readingKeys(local: Date, opts: CalendarOptions = {}): string[] {
  const day = liturgicalDay(local, opts);
  const d = civilDate(local);
  const y = d.getUTCFullYear();
  const m = moveableDates(y, opts);
  const w = weekday(d);
  const cycle = sundayCycle(local, opts);
  const keys: string[] = [];

  const observed = day.celebrations.find((c) => c.observed);
  if (observed && (observed.rank === 'solemnity' || observed.rank === 'feast')) {
    keys.push(`${observed.id}-${cycle}`, observed.id);
  }

  const name = DAY[w];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const sundayOr = (prefix: string) => (w === 0 ? `${prefix}-sun-${cycle}` : `${prefix}-${name}`);

  if (sameDay(d, m.easter)) keys.push('easter-sunday');
  else if (sameDay(d, m.pentecost)) keys.push('pentecost');
  else if (sameDay(d, m.ashWednesday)) keys.push('ash-wednesday');
  else if (sameDay(d, m.palmSunday)) keys.push(`palm-sunday-${cycle}`);
  else if (sameDay(d, m.holyThursday)) keys.push('holy-thursday');
  else if (sameDay(d, m.goodFriday)) keys.push('good-friday');
  else if (sameDay(d, m.holySaturday)) keys.push('holy-saturday');
  else {
    switch (day.season) {
      case 'advent':
        keys.push(w !== 0 && d.getUTCDate() >= 17 ? `advent-dec-${dd}` : sundayOr(`advent-${day.week}`));
        break;
      case 'christmas': {
        const month = d.getUTCMonth() + 1;
        if (month === 12) keys.push(`christmas-dec-${dd}`);
        else if (w === 0 && d < m.epiphany) keys.push('christmas-2-sun');
        else keys.push(`christmas-jan-${dd}`);
        break;
      }
      case 'lent':
        keys.push(day.week === 6 ? `holy-week-${name}` : sundayOr(`lent-${day.week}`));
        break;
      case 'easter':
        keys.push(sundayOr(`easter-${day.week}`));
        break;
      case 'ordinary':
        keys.push(w === 0 ? `ot-${day.week}-sun-${cycle}` : `ot-${day.week}-${name}-${weekdayCycle(local, opts)}`);
        break;
      default:
        break;
    }
  }
  return keys;
}

type Entry = { readings: { kind: string; ref: string }[]; note?: string };
const ENTRIES = lectionary.entries as Record<string, Entry>;
const TEXTS = texts as Record<string, Verse[]>;

/** Today's readings, or null for a day the Lectionary data does not cover yet. */
export function readingsFor(local: Date, opts: CalendarOptions = {}): DayReadings | null {
  const key = readingKeys(local, opts).find((k) => ENTRIES[k]);
  if (!key) return null;
  const entry = ENTRIES[key];
  return {
    key,
    title: liturgicalDay(local, opts).title,
    note: entry.note,
    readings: entry.readings.map((r) => ({
      kind: r.kind as ReadingKind,
      ref: r.ref,
      verses: TEXTS[r.ref] ?? [],
    })),
  };
}

/** One verse of today's Gospel for the Prayer Pause, rotating with each pause. */
export function gospelVerse(local: Date, counter: number, opts: CalendarOptions = {}): { ref: string; verse: Verse } | null {
  const gospel = readingsFor(local, opts)?.readings.find((r) => r.kind === 'gospel');
  if (!gospel || !gospel.verses.length) return null;
  // Prefer verses short enough to read at a glance.
  const short = gospel.verses.filter((v) => v.text.length <= 220);
  const pool = short.length ? short : gospel.verses;
  return { ref: gospel.ref, verse: pool[((counter % pool.length) + pool.length) % pool.length] };
}

/** Days ahead of `local` (within `days`) that have readings, for testing coverage. */
export function coveredDays(local: Date, days: number, opts: CalendarOptions = {}): number {
  let n = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(civilDate(local), i);
    if (readingsFor(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12), opts)) n++;
  }
  return n;
}

export { utcDate };
