/**
 * Prayer times.
 *
 *  - personal: times the user sets ("my prayer time"); the prayer is for their intentions.
 *  - devotion: optional traditional hours (Angelus, Hour of Mercy, Morning Offering,
 *    Night Prayer), off until the user turns them on.
 *  - group: a prayer time shared by a prayer group the user belongs to.
 *
 * Every enabled time works the same way: when it comes, the chosen apps stay
 * paused until the user taps "I've prayed". Rules are mirrored in
 * modules/app-gate (Kotlin and Swift); keep them in step.
 */
import { isEasterTime } from './liturgical';

export type PrayerTimeKind = 'personal' | 'devotion' | 'group';

export interface PrayerTime {
  id: string;
  kind: PrayerTimeKind;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  /** Epoch ms. Occurrences before this (e.g. earlier today, when the time was added) do not count. */
  since: number;
  /** Devotions: the prayer said at this time. */
  prayerId?: string;
  /** Devotions whose time is part of the tradition (the Angelus, 3pm) cannot be moved. */
  fixedTime?: boolean;
  /** Group times: the group they belong to. */
  groupId?: string;
}

const DEVOTIONS: Omit<PrayerTime, 'since' | 'enabled'>[] = [
  { id: 'morning-offering', kind: 'devotion', label: 'Morning Offering', prayerId: 'morning-offering', hour: 6, minute: 30 },
  { id: 'angelus-6', kind: 'devotion', label: 'Angelus (morning)', prayerId: 'angelus', hour: 6, minute: 0, fixedTime: true },
  { id: 'angelus-12', kind: 'devotion', label: 'Angelus (noon)', prayerId: 'angelus', hour: 12, minute: 0, fixedTime: true },
  { id: 'mercy-15', kind: 'devotion', label: 'Hour of Mercy', prayerId: 'divine-mercy-hour', hour: 15, minute: 0, fixedTime: true },
  { id: 'angelus-18', kind: 'devotion', label: 'Angelus (evening)', prayerId: 'angelus', hour: 18, minute: 0, fixedTime: true },
  { id: 'night-prayer', kind: 'devotion', label: 'Night Prayer', prayerId: 'night-prayer', hour: 21, minute: 30 },
];

/** One personal prayer time (set during onboarding) and every devotion, switched off. */
export function defaultSchedule(nowMs: number): PrayerTime[] {
  return [
    { id: 'personal-1', kind: 'personal', label: 'My prayer time', hour: 7, minute: 0, enabled: true, since: nowMs },
    ...DEVOTIONS.map((d) => ({ ...d, enabled: false, since: nowMs })),
  ];
}

export function newPersonalTime(existing: PrayerTime[], hour: number, minute: number, nowMs: number): PrayerTime {
  let n = existing.filter((t) => t.kind === 'personal').length + 1;
  while (existing.some((t) => t.id === `personal-${n}`)) n++;
  return { id: `personal-${n}`, kind: 'personal', label: 'My prayer time', hour, minute, enabled: true, since: nowMs };
}

/** The Regina Caeli replaces the Angelus from Easter Sunday to Pentecost. */
export function resolvePrayerId(time: PrayerTime, local: Date): string | undefined {
  if (time.prayerId === 'angelus' && isEasterTime(local)) return 'regina-caeli';
  return time.prayerId;
}

/** The most recent moment (at or before now) this time came round, in local time. */
export function latestOccurrence(t: Pick<PrayerTime, 'hour' | 'minute'>, nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(t.hour, t.minute, 0, 0);
  if (d.getTime() > nowMs) d.setDate(d.getDate() - 1);
  return d.getTime();
}

export function nextOccurrence(t: Pick<PrayerTime, 'hour' | 'minute'>, nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(t.hour, t.minute, 0, 0);
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export interface DuePrayer {
  time: PrayerTime;
  /** When it came due (epoch ms). */
  at: number;
}

/**
 * The prayer time the user still owes: the latest enabled time that has come
 * round since they last tapped "I've prayed". One prayer settles every time
 * that is due.
 */
export function duePrayer(schedule: PrayerTime[], nowMs: number, lastPrayedAt: number): DuePrayer | undefined {
  let best: DuePrayer | undefined;
  for (const t of schedule) {
    if (!t.enabled) continue;
    const at = latestOccurrence(t, nowMs);
    if (at < t.since || at <= lastPrayedAt) continue;
    if (!best || at > best.at) best = { time: t, at };
  }
  return best;
}

export function nextPrayer(schedule: PrayerTime[], nowMs: number): DuePrayer | undefined {
  let best: DuePrayer | undefined;
  for (const t of schedule) {
    if (!t.enabled) continue;
    const at = nextOccurrence(t, nowMs);
    if (!best || at < best.at) best = { time: t, at };
  }
  return best;
}

export function formatTime(t: Pick<PrayerTime, 'hour' | 'minute'>): string {
  const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const suffix = t.hour < 12 ? 'am' : 'pm';
  return t.minute === 0 ? `${h}${suffix}` : `${h}:${String(t.minute).padStart(2, '0')}${suffix}`;
}

/** Old saved schedules (before prayer times locked until prayed) are replaced. */
export function isCurrentSchedule(schedule: unknown): schedule is PrayerTime[] {
  return Array.isArray(schedule) && schedule.every((t) => t && typeof t === 'object' && 'kind' in t && 'since' in t);
}
