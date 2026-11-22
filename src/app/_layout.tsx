import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { colors } from '../components/theme';
import { AppState as RNAppState, Platform } from 'react-native';
import { getState, importExtensionEvents, pushConfigToNative } from '../state/store';
import { scheduleReminders } from '../features/reminders';

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
}

export default function RootLayout() {
  useEffect(() => {
    // Native storage may have been cleared (reinstall, OS update): re-send the config.
    pushConfigToNative();
    const s = getState();
    if (s.onboarded) scheduleReminders(s.gate.schedule, s.remindersEnabled).catch(() => {});
    if (Platform.OS === 'web') return;
    openFromNotification(Notifications.getLastNotificationResponse());
    importExtensionEvents();
    const sub = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    const appSub = RNAppState.addEventListener('change', (s) => s === 'active' && importExtensionEvents());
    return () => {
      sub.remove();
      appSub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Pause & Pray' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="pause" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="apps" options={{ title: 'Apps to pause' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="prayers" options={{ title: 'Prayers' }} />
        <Stack.Screen name="prayer/[id]" options={{ title: '' }} />
        <Stack.Screen name="stats" options={{ title: 'Your prayer' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      </Stack>
    </>
  );
}
