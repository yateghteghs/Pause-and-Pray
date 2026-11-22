/**
 * Seasonal campaigns ("40 days of Pause & Pray", Advent) with an optional
 * sponsor line: "Made possible by …". Dates follow the liturgical calendar.
 */
import content from '../content/campaigns.json';
import { addDays, civilDate, dayKey, DayKey, diffDays, localDayKey, utcDate } from './dates';
import { CalendarOptions, moveableDates } from './liturgical';
import { PauseEvent } from './stats';

export interface Sponsor {
  name: string;
  message?: string;
  url?: string;
}

export interface CampaignDef {
  id: string;
  season: 'advent' | 'lent';
  title: string;
  goal: string;
  sponsor: Sponsor | null;
}

export interface CampaignStatus {
  id: string;
  /** e.g. "lent-2027": the campaign in a given year (sponsors are set per year). */
  key: string;
  title: string;
  goal: string;
  start: DayKey;
  end: DayKey;
  totalDays: number;
  state: 'upcoming' | 'active';
  /** Active: today's day number (1-based). Upcoming: days until it starts. */
  dayNumber: number;
  daysUntil: number;
  /** Days within the campaign so far on which the user prayed. */
  daysPrayed: number;
  sponsor: Sponsor | null;
}

export const CAMPAIGNS = content.campaigns as CampaignDef[];

function datesFor(def: CampaignDef, year: number, opts: CalendarOptions): { start: Date; end: Date } {
  const m = moveableDates(year, opts);
  if (def.season === 'lent') return { start: m.ashWednesday, end: m.holySaturday };
  return { start: m.firstSundayOfAdvent, end: utcDate(year, 12, 24) };
}

/** The campaign running today, or the next one if it starts within `notice` days. */
export function currentCampaign(
  local: Date,
  events: PauseEvent[],
  sponsors: Record<string, Sponsor> = {},
  opts: CalendarOptions = {},
  notice = 7,
): CampaignStatus | undefined {
  const today = civilDate(local);
  const prayedDays = new Set(events.filter((e) => e.outcome !== 'skipped').map((e) => localDayKey(new Date(e.at))));
  const candidates: CampaignStatus[] = [];
  for (const def of CAMPAIGNS) {
    for (const year of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
      const { start, end } = datesFor(def, year, opts);
      const totalDays = diffDays(end, start) + 1;
      const untilStart = diffDays(start, today);
      if (today > end || untilStart > notice) continue;
      const active = untilStart <= 0;
      let daysPrayed = 0;
      if (active) {
        for (let d = start; d <= today; d = addDays(d, 1)) if (prayedDays.has(dayKey(d))) daysPrayed++;
      }
      const key = `${def.id}-${year}`;
      candidates.push({
        id: def.id,
        key,
        title: def.title,
        goal: def.goal,
        start: dayKey(start),
        end: dayKey(end),
        totalDays,
        state: active ? 'active' : 'upcoming',
        dayNumber: active ? diffDays(today, start) + 1 : 0,
        daysUntil: Math.max(untilStart, 0),
        daysPrayed,
        sponsor: sponsors[key] ?? sponsors[def.id] ?? def.sponsor,
      });
    }
  }
  return candidates.sort((a, b) => (a.state === b.state ? a.start.localeCompare(b.start) : a.state === 'active' ? -1 : 1))[0];
}
