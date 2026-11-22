/**
 * Liturgical calendar for the Roman Rite (ordinary form), computed on the phone.
 *
 * Covers: seasons and week numbers, liturgical colour, the moveable feasts,
 * fixed-date celebrations from content/calendar.json (universal + national
 * layer), the common transfer rules, and a simplified order of precedence.
 *
 * Simplifications (documented so the theological adviser can check them):
 *  - Clashes between two solemnities other than St. Joseph, the Annunciation
 *    and the Immaculate Conception are not resolved (they are rare).
 *  - Memorials falling on Lenten weekdays or 17–24 December are shown as
 *    commemorations, which is what the General Norms prescribe.
 *  - If the full precision of a published Ordo is needed later, swap this
 *    module for an open-source engine such as romcal behind the same API.
 */
import calendarData from '../content/calendar.json';
import {
  addDays,
  civilDate,
  diffDays,
  nextSunday,
  previousSunday,
  sameDay,
  utcDate,
  weekday,
  dayKey,
} from './dates';

export type Season = 'advent' | 'christmas' | 'ordinary' | 'lent' | 'triduum' | 'easter';
export type Colour = 'white' | 'red' | 'green' | 'violet' | 'rose';
export type Rank =
  | 'triduum'
  | 'solemnity'
  | 'commemoration'
  | 'sunday'
  | 'feast'
  | 'memorial'
  | 'optional'
  | 'weekday';

export interface Celebration {
  title: string;
  rank: Rank;
  colour: Colour;
  about?: string;
  /** false when the entry falls on this date but is outranked (shown, not celebrated). */
  observed: boolean;
}

export interface LiturgicalDay {
  date: string; // YYYY-MM-DD
  season: Season;
  seasonLabel: string;
  /** Week of the season (0 for the days after Ash Wednesday). */
  week: number;
  /** Name of the day as celebrated, e.g. "St. Cecilia" or "Tuesday of the 2nd Week of Advent". */
  title: string;
  rank: Rank;
  colour: Colour;
  /** Saint or feast to show on the Today card (may be the same as title). */
  saint?: Celebration;
  /** Every fixed or moveable celebration on this date, observed or not. */
  celebrations: Celebration[];
}

export interface CalendarOptions {
  /** ISO country code of the national calendar to layer on top of the universal one. */
  country?: 'NG' | string;
  epiphanyToSunday?: boolean;
  ascensionToSunday?: boolean;
  corpusChristiToSunday?: boolean;
}

interface FixedEntry {
  date: string;
  title: string;
  rank: Rank;
  colour: Colour;
  about?: string;
  /** Explicit precedence override (lower wins). */
  prec?: number;
  /** Feast of the Lord: may replace a Sunday in Ordinary or Christmas Time. */
  lord?: boolean;
}

// ---------------------------------------------------------------- moveable dates

/** Gregorian Easter Sunday (Anonymous Gregorian algorithm / Meeus). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

export interface MoveableDates {
  epiphany: Date;
  baptism: Date;
  ashWednesday: Date;
  firstSundayOfLent: Date;
  palmSunday: Date;
  holyThursday: Date;
  goodFriday: Date;
  holySaturday: Date;
  easter: Date;
  divineMercySunday: Date;
  ascension: Date;
  pentecost: Date;
  maryMotherOfTheChurch: Date;
  trinity: Date;
  corpusChristi: Date;
  sacredHeart: Date;
  immaculateHeart: Date;
  christTheKing: Date;
  firstSundayOfAdvent: Date;
  holyFamily: Date;
}

export function moveableDates(year: number, opts: CalendarOptions = {}): MoveableDates {
  const o = resolveOptions(opts);
  const easter = easterSunday(year);
  const epiphany = o.epiphanyToSunday ? nextSunday(utcDate(year, 1, 1)) : utcDate(year, 1, 6);
  let baptism: Date;
  if (o.epiphanyToSunday) {
    // Epiphany on 7 or 8 January pushes the Baptism to the Monday after.
    baptism = epiphany.getUTCDate() >= 7 ? addDays(epiphany, 1) : addDays(epiphany, 7);
  } else {
    baptism = nextSunday(utcDate(year, 1, 6));
  }
  const firstSundayOfAdvent = nextSunday(utcDate(year, 11, 26));
  const christmas = utcDate(year, 12, 25);
  const holyFamily = weekday(christmas) === 0 ? utcDate(year, 12, 30) : nextSunday(christmas);
  const ashWednesday = addDays(easter, -46);
  const pentecost = addDays(easter, 49);
  return {
    epiphany,
    baptism,
    ashWednesday,
    firstSundayOfLent: addDays(ashWednesday, 4),
    palmSunday: addDays(easter, -7),
    holyThursday: addDays(easter, -3),
    goodFriday: addDays(easter, -2),
    holySaturday: addDays(easter, -1),
    easter,
    divineMercySunday: addDays(easter, 7),
    ascension: addDays(easter, o.ascensionToSunday ? 42 : 39),
    pentecost,
    maryMotherOfTheChurch: addDays(pentecost, 1),
    trinity: addDays(pentecost, 7),
    corpusChristi: addDays(pentecost, o.corpusChristiToSunday ? 14 : 11),
    sacredHeart: addDays(pentecost, 19),
    immaculateHeart: addDays(pentecost, 20),
    christTheKing: addDays(firstSundayOfAdvent, -7),
    firstSundayOfAdvent,
    holyFamily,
  };
}

function resolveOptions(opts: CalendarOptions): Required<CalendarOptions> {
  const country = opts.country ?? 'NG';
  const national = (calendarData.national as Record<string, any>)[country];
  const t = national?.transfers ?? {};
  return {
    country,
    epiphanyToSunday: opts.epiphanyToSunday ?? t.epiphanyToSunday ?? false,
    ascensionToSunday: opts.ascensionToSunday ?? t.ascensionToSunday ?? false,
    corpusChristiToSunday: opts.corpusChristiToSunday ?? t.corpusChristiToSunday ?? false,
  };
}

// ---------------------------------------------------------------- labels

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ORDINAL_WORDS = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth',
];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function sundayName(n: number): string {
  return ORDINAL_WORDS[n] ?? ordinal(n);
}

const SEASON_LABELS: Record<Season, string> = {
  advent: 'Advent',
  christmas: 'Christmas Time',
  ordinary: 'Ordinary Time',
  lent: 'Lent',
  triduum: 'Paschal Triduum',
  easter: 'Easter Time',
};

const SEASON_COLOURS: Record<Season, Colour> = {
  advent: 'violet',
  christmas: 'white',
  ordinary: 'green',
  lent: 'violet',
  triduum: 'red',
  easter: 'white',
};

// ---------------------------------------------------------------- season

interface SeasonInfo {
  season: Season;
  week: number;
  title: string;
  rank: Rank;
  colour: Colour;
}

function seasonInfo(d: Date, m: MoveableDates): SeasonInfo {
  const y = d.getUTCFullYear();
  const w = weekday(d);
  const isSunday = w === 0;
  const dayName = WEEKDAYS[w];
  const christmas = utcDate(y, 12, 25);

  // Christmas Time, late December
  if (d >= christmas) {
    return christmasInfo(d, m);
  }
  // Advent
  if (d >= m.firstSundayOfAdvent) {
    const week = Math.floor(diffDays(d, m.firstSundayOfAdvent) / 7) + 1;
    const gaudete = isSunday && week === 3;
    return {
      season: 'advent',
      week,
      title: isSunday
        ? `${sundayName(week)} Sunday of Advent${gaudete ? ' (Gaudete Sunday)' : ''}`
        : d.getUTCDate() >= 17
          ? `${d.getUTCDate()} December (Advent weekday)`
          : `${dayName} of the ${ordinal(week)} Week of Advent`,
      rank: isSunday ? 'sunday' : 'weekday',
      colour: gaudete ? 'rose' : 'violet',
    };
  }
  // Christmas Time, early January (up to and including the Baptism of the Lord)
  if (d <= m.baptism) {
    return christmasInfo(d, m);
  }
  // Ordinary Time before Lent
  if (d < m.ashWednesday) {
    const baptismSunday = previousSunday(m.baptism, true);
    const week = Math.floor(diffDays(d, baptismSunday) / 7) + 1;
    return ordinaryInfo(d, week);
  }
  // Lent
  if (d < m.holyThursday) {
    if (d < m.firstSundayOfLent) {
      return {
        season: 'lent',
        week: 0,
        title: sameDay(d, m.ashWednesday) ? 'Ash Wednesday' : `${dayName} after Ash Wednesday`,
        rank: sameDay(d, m.ashWednesday) ? 'triduum' : 'weekday',
        colour: 'violet',
      };
    }
    const week = Math.floor(diffDays(d, m.firstSundayOfLent) / 7) + 1;
    if (week === 6) {
      return {
        season: 'lent',
        week,
        title: isSunday ? 'Palm Sunday of the Passion of the Lord' : `${dayName} of Holy Week`,
        rank: 'triduum',
        colour: isSunday ? 'red' : 'violet',
      };
    }
    const laetare = isSunday && week === 4;
    return {
      season: 'lent',
      week,
      title: isSunday
        ? `${sundayName(week)} Sunday of Lent${laetare ? ' (Laetare Sunday)' : ''}`
        : `${dayName} of the ${ordinal(week)} Week of Lent`,
      rank: isSunday ? 'sunday' : 'weekday',
      colour: laetare ? 'rose' : 'violet',
    };
  }
  // Paschal Triduum
  if (d < m.easter) {
    const names: Record<number, [string, Colour]> = {
      4: ['Holy Thursday', 'white'],
      5: ["Good Friday of the Lord's Passion", 'red'],
      6: ['Holy Saturday', 'violet'],
    };
    const [title, colour] = names[w];
    return { season: 'triduum', week: 0, title, rank: 'triduum', colour };
  }
  // Easter Time
  if (d <= m.pentecost) {
    const week = Math.floor(diffDays(d, m.easter) / 7) + 1;
    let title: string;
    if (sameDay(d, m.easter)) title = 'Easter Sunday of the Resurrection of the Lord';
    else if (sameDay(d, m.pentecost)) title = 'Pentecost Sunday';
    else if (sameDay(d, m.divineMercySunday)) title = 'Second Sunday of Easter (Divine Mercy Sunday)';
    else if (week === 1) title = `${dayName} within the Octave of Easter`;
    else if (isSunday) title = `${sundayName(week)} Sunday of Easter`;
    else title = `${dayName} of the ${ordinal(week)} Week of Easter`;
    const inOctave = diffDays(d, m.easter) <= 7;
    return {
      season: 'easter',
      week,
      title,
      rank: inOctave ? 'triduum' : isSunday ? 'sunday' : 'weekday',
      colour: sameDay(d, m.pentecost) ? 'red' : 'white',
    };
  }
  // Ordinary Time after Pentecost, counted back from Christ the King (34th week)
  const sundayOfWeek = previousSunday(d, true);
  const week = 34 - Math.floor(diffDays(m.christTheKing, sundayOfWeek) / 7);
  return ordinaryInfo(d, week);
}

function ordinaryInfo(d: Date, week: number): SeasonInfo {
  const w = weekday(d);
  return {
    season: 'ordinary',
    week,
    title:
      w === 0
        ? `${ordinal(week)} Sunday in Ordinary Time`
        : `${WEEKDAYS[w]} of the ${ordinal(week)} Week in Ordinary Time`,
    rank: w === 0 ? 'sunday' : 'weekday',
    colour: 'green',
  };
}

function christmasInfo(d: Date, m: MoveableDates): SeasonInfo {
  const w = weekday(d);
  const month = d.getUTCMonth() + 1;
  const date = d.getUTCDate();
  let title = 'Weekday of Christmas Time';
  if (month === 12 && date > 25) title = `${ordinal(date - 24)} Day in the Octave of Christmas`;
  else if (w === 0 && month === 1 && !sameDay(d, m.epiphany) && !sameDay(d, m.baptism)) {
    title = 'Second Sunday after Christmas';
  }
  return {
    season: 'christmas',
    week: 0,
    title,
    rank: w === 0 ? 'sunday' : 'weekday',
    colour: 'white',
  };
}

// ---------------------------------------------------------------- celebrations

function moveableCelebrations(d: Date, m: MoveableDates): FixedEntry[] {
  const list: (Omit<FixedEntry, 'date'> & { on: Date })[] = [
    { on: m.epiphany, title: 'The Epiphany of the Lord', rank: 'solemnity', colour: 'white', about: 'Christ is revealed to the nations, represented by the Magi from the East.' },
    { on: m.baptism, title: 'The Baptism of the Lord', rank: 'feast', colour: 'white', lord: true, about: 'Jesus is baptised in the Jordan and the Father calls him his beloved Son.' },
    // prec 1.2 lets a Sunday Ascension replace the 7th Sunday of Easter.
    { on: m.ascension, title: 'The Ascension of the Lord', rank: 'solemnity', colour: 'white', prec: 1.2, about: 'Forty days after Easter the risen Lord returns to the Father.' },
    { on: m.maryMotherOfTheChurch, title: 'The Blessed Virgin Mary, Mother of the Church', rank: 'memorial', colour: 'white', about: 'On the day after Pentecost the Church honours Mary, who prayed with the apostles as they awaited the Spirit.' },
    { on: m.trinity, title: 'The Most Holy Trinity', rank: 'solemnity', colour: 'white', about: 'One God in three Persons: Father, Son and Holy Spirit.' },
    { on: m.corpusChristi, title: 'The Most Holy Body and Blood of Christ', rank: 'solemnity', colour: 'white', about: 'Thanksgiving for the gift of the Eucharist.' },
    { on: m.sacredHeart, title: 'The Most Sacred Heart of Jesus', rank: 'solemnity', colour: 'white', about: "The love of Christ's heart, pierced for us." },
    { on: m.immaculateHeart, title: 'The Immaculate Heart of the Blessed Virgin Mary', rank: 'memorial', colour: 'white', about: 'Mary kept all these things, pondering them in her heart.' },
    { on: m.christTheKing, title: 'Our Lord Jesus Christ, King of the Universe', rank: 'solemnity', colour: 'white', about: 'The last Sunday of the Church year proclaims Christ as King of all.' },
    { on: m.holyFamily, title: 'The Holy Family of Jesus, Mary and Joseph', rank: 'feast', colour: 'white', lord: true, about: 'Jesus grew up in a family; the Church honours the home of Nazareth.' },
  ];
  return list.filter((e) => sameDay(e.on, d)).map(({ on, ...e }) => ({ ...e, date: dayKey(on) }));
}

/** Fixed-date entries (universal + national), with the standard transfers applied. */
function fixedCelebrations(d: Date, m: MoveableDates, country: string): FixedEntry[] {
  const y = d.getUTCFullYear();
  const entries: FixedEntry[] = [
    ...(calendarData.universal as FixedEntry[]),
    ...(((calendarData.national as Record<string, any>)[country]?.celebrations ?? []) as FixedEntry[]),
  ];
  const result: FixedEntry[] = [];
  for (const e of entries) {
    const [mm, dd] = e.date.split('-').map(Number);
    const actual = transferredDate(utcDate(y, mm, dd), e, m);
    if (actual && sameDay(actual, d)) result.push(e);
  }
  return result;
}

function transferredDate(date: Date, e: FixedEntry, m: MoveableDates): Date | null {
  const y = date.getUTCFullYear();
  const isSunday = weekday(date) === 0;
  const inHolyWeekOrOctave = date >= m.palmSunday && date <= m.divineMercySunday;
  if (e.date === '03-19') {
    if (date >= m.palmSunday && date <= m.divineMercySunday) return addDays(m.palmSunday, -1);
    if (isSunday) return addDays(date, 1);
  }
  if (e.date === '03-25') {
    if (inHolyWeekOrOctave) return addDays(m.divineMercySunday, 1);
    if (isSunday) return addDays(date, 1);
  }
  if (e.date === '12-08' && isSunday) return utcDate(y, 12, 9);
  // Ordinary memorials and feasts that fall in Holy Week or the Easter octave are omitted.
  if (inHolyWeekOrOctave && e.rank !== 'solemnity') return null;
  if (sameDay(date, m.ashWednesday) && e.rank !== 'solemnity') return null;
  return date;
}

// Precedence (lower number wins), after the Table of Liturgical Days.
function seasonPrecedence(s: SeasonInfo, d: Date): number {
  if (s.rank === 'triduum') return 1; // Triduum, Ash Wednesday, Holy Week, Easter octave
  if (s.rank === 'sunday') return s.season === 'ordinary' || s.season === 'christmas' ? 4 : 1.5;
  const privileged =
    s.season === 'lent' ||
    (s.season === 'advent' && d.getUTCDate() >= 17) ||
    (s.season === 'christmas' && d.getUTCMonth() === 11);
  return privileged ? 6 : 8;
}

function entryPrecedence(e: FixedEntry): number {
  if (e.prec !== undefined) return e.prec;
  switch (e.rank) {
    case 'solemnity':
      return 2;
    case 'commemoration':
      return 3; // All Souls
    case 'feast':
      return e.lord || LORD_FEASTS.has(e.date) ? 3.5 : 5;
    case 'memorial':
      return 7;
    default:
      return 9;
  }
}

const LORD_FEASTS = new Set(['02-02', '08-06', '09-14', '11-09']);

// ---------------------------------------------------------------- public API

export function liturgicalDay(local: Date, opts: CalendarOptions = {}): LiturgicalDay {
  const o = resolveOptions(opts);
  const d = civilDate(local);
  const y = d.getUTCFullYear();
  const m = moveableDates(y, o);
  const s = seasonInfo(d, m);

  const candidates = [...moveableCelebrations(d, m), ...fixedCelebrations(d, m, o.country)];
  const seasonPrec = seasonPrecedence(s, d);

  let winner: FixedEntry | null = null;
  let winnerPrec = seasonPrec;
  for (const c of candidates) {
    const p = entryPrecedence(c);
    if (p < winnerPrec) {
      winner = c;
      winnerPrec = p;
    }
  }

  const privilegedWeekday = seasonPrec === 6;
  const celebrations: Celebration[] = candidates.map((c) => ({
    title: c.title,
    rank: privilegedWeekday && (c.rank === 'memorial' || c.rank === 'optional') ? 'commemoration' : c.rank,
    colour: c.colour,
    about: c.about,
    observed: c === winner,
  }));

  const observed = celebrations.find((c) => c.observed);
  const saint =
    observed ??
    celebrations.find((c) => c.rank === 'optional' || c.rank === 'commemoration') ??
    celebrations[0];

  return {
    date: dayKey(d),
    season: s.season,
    seasonLabel: SEASON_LABELS[s.season],
    week: s.week,
    title: winner ? winner.title : s.title,
    rank: winner ? winner.rank : s.rank,
    colour: winner && winner.rank !== 'optional' ? winner.colour : s.colour,
    saint,
    celebrations,
  };
}

export function isEasterTime(local: Date, opts: CalendarOptions = {}): boolean {
  return liturgicalDay(local, opts).season === 'easter';
}

export const COLOUR_HEX: Record<Colour, string> = {
  white: '#F4EFE3',
  red: '#B3261E',
  green: '#2E7D32',
  violet: '#5B2C83',
  rose: '#D98BA6',
};

export { SEASON_COLOURS };
