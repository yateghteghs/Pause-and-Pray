import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Body, Button, Card, H2, Screen } from '../components/ui';
import { deleteAllData } from '../state/store';
import { scheduleReminders } from '../features/reminders';

export default function Privacy() {
  return (
    <Screen>
      <Card>
        <H2>What stays on your phone</H2>
        <Body>Your chosen apps, prayer times, streaks and prayer history. There is no account and no server copy.</Body>
      </Card>
      <Card>
        <H2>What the gate can see</H2>
        {Platform.OS === 'android' ? (
          <Body>
            The accessibility service reads only the name of the app that has just opened. It never reads screen content,
            what you type, or your messages.
          </Body>
        ) : (
          <Body>Apple's Screen Time hides which apps you picked, even from us.</Body>
        )}
      </Card>
      <Card>
        <H2>Why we are careful</H2>
        <Body>
          Using a Catholic prayer app reveals your religion. Under the Nigeria Data Protection Act 2023 and the GDPR that
          is sensitive personal data, so we keep it on your phone.
        </Body>
      </Card>
      <Button
        kind="secondary"
        title="Delete all my data"
        onPress={() =>
          Alert.alert('Delete all data?', 'This removes your streaks, history and settings from this phone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                deleteAllData();
                await scheduleReminders([], false);
                router.replace('/onboarding');
              },
            },
          ])
        }
      />
    </Screen>
  );
}
