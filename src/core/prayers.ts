import content from '../content/prayers.json';
import { civilDate, diffDays, utcDate } from './dates';

export interface Prayer {
  id: string;
  title: string;
  category: string;
  gate: boolean;
  text: string;
  note?: string;
  reviewStatus: string;
}

export interface Verse {
  ref: string;
  text: string;
}

export const PRAYERS: Prayer[] = content.prayers as Prayer[];
export const VERSES: Verse[] = content.scripture.verses;

export function prayerById(id: string): Prayer | undefined {
  return PRAYERS.find((p) => p.id === id);
}

/** Short prayers suitable for the Prayer Pause screen. */
export const GATE_PRAYERS: Prayer[] = PRAYERS.filter((p) => p.gate);

/**
 * Pick the prayer for a pause. Rotates through the gate prayers so the user
 * does not see the same one every time, deterministic for a given counter.
 */
export function pausePrayer(counter: number): Prayer {
  return GATE_PRAYERS[((counter % GATE_PRAYERS.length) + GATE_PRAYERS.length) % GATE_PRAYERS.length];
}

export function verseOfTheDay(local: Date): Verse {
  const day = civilDate(local);
  const n = diffDays(day, utcDate(2000, 1, 1));
  return VERSES[((n % VERSES.length) + VERSES.length) % VERSES.length];
}
