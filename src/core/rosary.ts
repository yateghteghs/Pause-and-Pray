import content from '../content/prayers.json';
import { civilDate, weekday } from './dates';

export type MysterySet = 'joyful' | 'sorrowful' | 'glorious' | 'luminous';

/**
 * Weekday pattern given in Rosarium Virginis Mariae (2002), the one most
 * most parishes follow: Sun Glorious, Mon Joyful, Tue Sorrowful,
 * Wed Glorious, Thu Luminous, Fri Sorrowful, Sat Joyful.
 */
const BY_WEEKDAY: MysterySet[] = [
  'glorious',
  'joyful',
  'sorrowful',
  'glorious',
  'luminous',
  'sorrowful',
  'joyful',
];

export function mysterySetFor(local: Date): MysterySet {
  return BY_WEEKDAY[weekday(civilDate(local))];
}

export function mysteryOfTheDay(local: Date) {
  const set = mysterySetFor(local);
  const m = content.rosary.mysteries[set];
  return { set, title: m.title, items: m.items };
}
