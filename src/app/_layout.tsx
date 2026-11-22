import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { colors } from '../components/theme';
import { AppState as RNAppState, Platform } from 'react-native';
import { getState, importExtensionEvents, pushConfigToNative, setAccount } from '../state/store';
import { restoreAccount } from '../features/auth';
import { refreshGroups } from '../features/groups';
import { initBilling } from '../features/billing';
import { refreshTracks } from '../features/audio';
import { scheduleReminders } from '../features/reminders';

function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
}

export default function RootLayout() {
  useEffect(() => {
    // Native storage may have been cleared (reinstall, OS update): re-send the config.
    pushConfigToNative();
    initBilling().catch(() => {});
    refreshTracks().catch(() => {});
    restoreAccount()
      .then((account) => account && setAccount(account))
      .then(() => refreshGroups())
      .catch(() => {});
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="sign-up" options={{ title: 'Create account' }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="intentions" options={{ title: 'My intentions' }} />

        <Stack.Screen
          name="pause"
          getId={({ params }) => JSON.stringify(params ?? {})}
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="apps" options={{ title: 'Apps to pause' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="prayer/[id]" options={{ title: '' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="saint" options={{ title: 'Saint of the day' }} />
        <Stack.Screen name="plus" options={{ title: 'Plus', presentation: 'modal' }} />
        <Stack.Screen name="rosary" options={{ title: 'The Rosary' }} />
        <Stack.Screen name="chaplet" options={{ title: 'Divine Mercy Chaplet' }} />
        <Stack.Screen name="novena" options={{ title: 'Novena' }} />
        <Stack.Screen name="parish" options={{ title: 'Parish plan' }} />
        <Stack.Screen name="dashboard" options={{ title: 'Leader dashboard' }} />
        <Stack.Screen name="group/[id]" options={{ title: 'Group' }} />
        <Stack.Screen name="group/new" options={{ title: 'Start a group' }} />
        <Stack.Screen name="group/join" options={{ title: 'Join a group' }} />
      </Stack>
    </>
  );
}
