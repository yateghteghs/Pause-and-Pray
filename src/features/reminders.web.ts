// The browser preview has no prayer-time notifications.
import { PrayerTime } from '../core/schedule';

export async function ensurePermission(): Promise<boolean> {
  return false;
}

export async function scheduleReminders(_schedule: PrayerTime[], _enabled: boolean): Promise<void> {}
