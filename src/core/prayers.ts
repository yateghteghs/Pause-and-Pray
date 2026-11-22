import content from '../content/prayers.json';
import intentionsContent from '../content/intentions.json';
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

// ------------------------------------------------------------------ intentions


export interface PauseSection {
  /** The intention this part prays for, or undefined for the closing prayer. */
  intention?: string;
  title: string;
  text: string;
}

export interface PausePlan {
  sections: PauseSection[];
  /** For stats: what was prayed. */
  prayerId: string;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** A prayer for one intention: written for the suggested ones, a template for the user's own. */
export function intentionPrayer(intention: string, variant = 0): string {
  const known = intentionsContent.suggestions.find((s) => s.label === intention);
  if (known) return known.prayers[mod(variant, known.prayers.length)];
  const template = intentionsContent.custom[mod(variant, intentionsContent.custom.length)];
  return template.replace('{intention}', `“${intention.trim().replace(/[.!?]+$/, '')}”`);
}

function closing(counter: number): Prayer {
  const ids = intentionsContent.closings;
  return prayerById(ids[mod(counter, ids.length)]) ?? GATE_PRAYERS[0];
}

/**
 * What the Prayer Pause shows.
 *  - "gate" (a paused app was opened): one intention, rotating with each pause,
 *    then a short traditional prayer. Quick enough to pray before scrolling.
 *  - "pray-now" (opened by the user): every intention, then the closing prayer.
 * With no intentions chosen, it falls back to the rotation of short prayers.
 */
export function pausePlan(intentions: string[], counter: number, mode: 'gate' | 'pray-now'): PausePlan {
  const chosen = intentions.filter((i) => i.trim());
  if (!chosen.length) {
    const p = pausePrayer(counter);
    return { sections: [{ title: p.title, text: p.text }], prayerId: p.id };
  }
  // Within a round, each intention gets its turn before any repeats; the next round uses the other wording.
  const round = Math.floor(counter / chosen.length);
  const picked = mode === 'gate' ? [chosen[mod(counter, chosen.length)]] : chosen;
  const sections: PauseSection[] = picked.map((intention) => ({
    intention,
    title: intention,
    text: intentionPrayer(intention, mode === 'gate' ? round : counter),
  }));
  const close = closing(counter);
  sections.push({ title: close.title, text: close.text });
  return {
    sections,
    prayerId: mode === 'gate' ? `intention:${picked[0]}` : 'intention:all',
  };
}
