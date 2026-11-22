/**
 * Local notifications for the Angelus, the Hour of Mercy and the other
 * prayer times. Nothing leaves the phone.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PrayerTime } from '../core/schedule';

const CHANNEL = 'prayer-times';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Prayer times',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const BODIES: Record<string, string> = {
  angelus: 'The Angel of the Lord declared unto Mary…',
  'divine-mercy-hour': 'It is three o’clock, the Hour of Mercy. Jesus, I trust in you.',
  'morning-offering': 'Offer this day to God before the scrolling starts.',
  'night-prayer': 'End the day with God. Into your hands, O Lord…',
};

export async function scheduleReminders(schedule: PrayerTime[], enabled: boolean): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  if (!(await ensurePermission())) return;
  for (const t of schedule.filter((s) => s.enabled)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t.label,
        body: BODIES[t.prayerId] ?? 'Pause and pray.',
        data: { url: `/pause?time=${t.id}` },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
        channelId: CHANNEL,
      },
    });
  }
}
