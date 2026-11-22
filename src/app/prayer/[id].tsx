import { Stack, useLocalSearchParams } from 'expo-router';
import { Body, Card, H1, Screen } from '../../components/ui';
import { prayerById } from '../../core/prayers';

export default function PrayerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const prayer = prayerById(id);
  if (!prayer) return <Screen><Body>Prayer not found.</Body></Screen>;
  return (
    <Screen>
      <Stack.Screen options={{ title: prayer.title }} />
      <H1>{prayer.title}</H1>
      <Card>
        <Body style={{ fontSize: 19, lineHeight: 30 }}>{prayer.text}</Body>
      </Card>
      {prayer.note ? <Body muted>{prayer.note}</Body> : null}
    </Screen>
  );
}
