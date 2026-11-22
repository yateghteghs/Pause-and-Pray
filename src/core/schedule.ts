import { isEasterTime } from './liturgical';

export type ScheduleId = 'morning' | 'angelus-6' | 'angelus-12' | 'mercy-15' | 'angelus-18' | 'night';

export interface PrayerTime {
  id: ScheduleId;
  label: string;
  /** Prayer shown at this time (resolved by marianAntiphon for the Angelus slots). */
  prayerId: string;
  hour: number;
  minute: number;
  enabled: boolean;
  /** Gate chosen apps for this many minutes from the start time (min 15, an iOS limit). */
  windowMinutes: number;
}

export const DEFAULT_SCHEDULE: PrayerTime[] = [
  { id: 'morning', label: 'Morning Offering', prayerId: 'morning-offering', hour: 6, minute: 30, enabled: false, windowMinutes: 30 },
  { id: 'angelus-6', label: 'Angelus (morning)', prayerId: 'angelus', hour: 6, minute: 0, enabled: true, windowMinutes: 15 },
  { id: 'angelus-12', label: 'Angelus (noon)', prayerId: 'angelus', hour: 12, minute: 0, enabled: true, windowMinutes: 15 },
  { id: 'mercy-15', label: 'Hour of Mercy', prayerId: 'divine-mercy-hour', hour: 15, minute: 0, enabled: true, windowMinutes: 15 },
  { id: 'angelus-18', label: 'Angelus (evening)', prayerId: 'angelus', hour: 18, minute: 0, enabled: true, windowMinutes: 15 },
  { id: 'night', label: 'Night Prayer', prayerId: 'night-prayer', hour: 21, minute: 30, enabled: false, windowMinutes: 30 },
];

export const MIN_WINDOW_MINUTES = 15;

/** The Regina Caeli replaces the Angelus from Easter Sunday to Pentecost. */
export function resolvePrayerId(time: PrayerTime, local: Date): string {
  if (time.prayerId === 'angelus' && isEasterTime(local)) return 'regina-caeli';
  return time.prayerId;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** The scheduled prayer time whose gate window contains `local`, if any. */
export function activeWindow(schedule: PrayerTime[], local: Date): PrayerTime | undefined {
  const now = minutesOfDay(local);
  return schedule.find((t) => {
    if (!t.enabled) return false;
    const start = t.hour * 60 + t.minute;
    const end = start + Math.max(t.windowMinutes, MIN_WINDOW_MINUTES);
    // Windows that cross midnight wrap around.
    return end <= 1440 ? now >= start && now < end : now >= start || now < end - 1440;
  });
}

export function formatTime(t: Pick<PrayerTime, 'hour' | 'minute'>): string {
  const h = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const suffix = t.hour < 12 ? 'am' : 'pm';
  return t.minute === 0 ? `${h}${suffix}` : `${h}:${String(t.minute).padStart(2, '0')}${suffix}`;
}
