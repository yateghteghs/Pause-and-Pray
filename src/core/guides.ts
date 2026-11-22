/**
 * Guided prayers prayed bead by bead: the Rosary and the Divine Mercy Chaplet.
 * Each step is one prayer, said `count` times (a decade is one step of 10).
 */
import content from '../content/prayers.json';
import novenaContent from '../content/novenas.json';
import texts from '../content/readings-text.json';
import { MysterySet } from './rosary';
import { addDays, DayKey, diffDays, parseDayKey } from './dates';
import { prayerById } from './prayers';

export interface GuideStep {
  /** Small line above the prayer, e.g. "First Sorrowful Mystery". */
  heading?: string;
  title: string;
  text: string;
  /** How many times the prayer is said on this step (beads). */
  count: number;
  /** The prayer in prayers.json, if any (recordings are keyed by it). */
  prayerId?: string;
}

const ORDINALS = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

function prayer(id: string, count = 1, heading?: string): GuideStep {
  const p = prayerById(id);
  if (!p) throw new Error(`Missing prayer ${id}`);
  return { heading, title: p.title, text: p.text, count, prayerId: id };
}

export function rosarySteps(set: MysterySet): GuideStep[] {
  const mysteries = content.rosary.mysteries[set];
  const setName = mysteries.title.replace(' Mysteries', '');
  const steps: GuideStep[] = [
    prayer('sign-of-the-cross', 1, 'Begin'),
    prayer('apostles-creed', 1, 'On the crucifix'),
    prayer('our-father'),
    prayer('hail-mary', 3, 'For faith, hope and charity'),
    prayer('glory-be'),
  ];
  mysteries.items.forEach((mystery, i) => {
    const heading = `${ORDINALS[i]} ${setName} Mystery`;
    steps.push(
      { heading, title: mystery, text: 'Picture this mystery and stay with it as you pray the decade.', count: 1 },
      prayer('our-father', 1, heading),
      prayer('hail-mary', 10, heading),
      prayer('glory-be', 1, heading),
      prayer('fatima-prayer', 1, heading),
    );
  });
  steps.push(prayer('hail-holy-queen', 1, 'Closing prayers'), prayer('rosary-closing', 1, 'Closing prayers'), prayer('sign-of-the-cross', 1, 'End'));
  return steps;
}

export function chapletSteps(): GuideStep[] {
  const steps: GuideStep[] = [
    prayer('sign-of-the-cross', 1, 'Begin'),
    prayer('our-father'),
    prayer('hail-mary'),
    prayer('apostles-creed'),
  ];
  for (let i = 0; i < 5; i++) {
    const heading = `${ORDINALS[i]} decade`;
    steps.push(prayer('chaplet-eternal-father', 1, `${heading} · large bead`), prayer('chaplet-sorrowful-passion', 10, `${heading} · small beads`));
  }
  steps.push(prayer('chaplet-holy-god', 3, 'Closing'), prayer('sign-of-the-cross', 1, 'End'));
  return steps;
}

/** Total beads (prayers said) in a guide, for the progress bar. */
export function totalCount(steps: GuideStep[]): number {
  return steps.reduce((n, s) => n + s.count, 0);
}

// ------------------------------------------------------------------ novenas

export interface NovenaDay {
  day: number;
  ref: string;
  verse: string;
  reflection: string;
}

export interface Novena {
  id: string;
  title: string;
  about: string;
  days: NovenaDay[];
}

const TEXTS = texts as Record<string, { label: string; text: string }[]>;

export const NOVENAS: Novena[] = novenaContent.novenas.map((n) => ({
  id: n.id,
  title: n.title,
  about: n.about,
  days: n.days.map((d, i) => ({
    day: i + 1,
    ref: d.ref,
    verse: (TEXTS[d.ref] ?? []).map((v) => v.text).join(' '),
    reflection: d.reflection,
  })),
}));

export interface NovenaProgress {
  /** 1-9: the day to pray next, or 10 when the novena is complete. */
  nextDay: number;
  /** True when today's day has already been prayed. */
  doneToday: boolean;
}

/** One day per calendar day; missed days are caught up one at a time. */
export function novenaProgress(daysDone: DayKey[], today: DayKey): NovenaProgress {
  return { nextDay: Math.min(daysDone.length + 1, 10), doneToday: daysDone.includes(today) };
}

/** Day the novena ends if prayed daily from `start`. */
export function novenaEndDate(start: DayKey): DayKey {
  const d = addDays(parseDayKey(start), 8);
  return d.toISOString().slice(0, 10);
}

export function daysSince(start: DayKey, today: DayKey): number {
  return diffDays(parseDayKey(today), parseDayKey(start));
}
