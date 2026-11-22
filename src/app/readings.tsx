import { StyleSheet, Text, View } from 'react-native';
import { Body, Card, H1, Label, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { KIND_LABEL, READINGS_CREDIT, readingsFor } from '../core/readings';
import { verseOfTheDay } from '../core/prayers';
import { useAppState } from '../state/store';

export default function Readings() {
  const { country } = useAppState();
  const now = new Date();
  const day = readingsFor(now, { country });

  if (!day) {
    const verse = verseOfTheDay(now);
    return (
      <Screen>
        <H1>Today's readings</H1>
        <Body>Today's Mass readings are not in the app yet. They are being added and checked season by season.</Body>
        <Card>
          <Label>Word of God</Label>
          <Body style={{ fontStyle: 'italic' }}>“{verse.text}”</Body>
          <Body muted>{verse.ref} (Douay-Rheims)</Body>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Label>Mass of the day</Label>
      <H1>{day.title}</H1>
      {day.readings.map((r) => (
        <Card key={r.kind}>
          <Label>{KIND_LABEL[r.kind]}</Label>
          <Text style={s.ref}>{r.ref}</Text>
          <View style={{ gap: 6 }}>
            {r.verses.map((v) => (
              <Text key={v.label} style={[s.verse, r.kind === 'psalm' && s.psalm]}>
                <Text style={s.num}>{v.label.split(':')[1]} </Text>
                {v.text}
              </Text>
            ))}
          </View>
        </Card>
      ))}
      {day.note ? <Body muted>{day.note}</Body> : null}
      <Body muted>{READINGS_CREDIT} Verse numbers follow that Bible.</Body>
    </Screen>
  );
}

const s = StyleSheet.create({
  ref: { fontSize: 18, fontWeight: '700', color: colors.primary },
  verse: { fontSize: 17, lineHeight: 27, color: colors.ink },
  psalm: { paddingLeft: space.sm },
  num: { fontSize: 12, color: colors.gold, fontWeight: '700' },
});
