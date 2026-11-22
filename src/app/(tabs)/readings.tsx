import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Body, Card, H1, Label, Screen } from '../../components/ui';
import { colors, space } from '../../components/theme';
import { KIND_LABEL, READINGS_CREDIT, readingsFor } from '../../core/readings';
import { verseOfTheDay } from '../../core/prayers';
import { useAppState } from '../../state/store';
import { ListenButton } from '../../components/ListenButton';
import { saintOfDay } from '../../core/liturgical';
import { formatDayKey } from '../../core/dates';

/** Saint of the day, at the top of the Readings tab; the full story opens on its own page. */
function SaintCard({ country }: { country: string }) {
  const found = saintOfDay(new Date(), { country });
  if (!found) return null;
  const { saint, when } = found;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push('/saint')}>
      <Card>
        <Label>{when === 'today' ? 'Saint of the day' : `Next saint · ${formatDayKey(when)}`}</Label>
        <Text style={s.saint}>{saint.title}</Text>
        <Text style={s.meta}>
          {saint.lived} · {saint.place}
        </Text>
        <Text style={s.link}>Read their story ›</Text>
      </Card>
    </Pressable>
  );
}

export default function Readings() {
  const { country } = useAppState();
  const now = new Date();
  const day = readingsFor(now, { country });

  if (!day) {
    const verse = verseOfTheDay(now);
    return (
      <Screen>
        <SaintCard country={country} />
        <H1>Today’s readings</H1>
        <Body>Today’s Mass readings are not in the app yet. They are being added and checked season by season.</Body>
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
      <SaintCard country={country} />
      <Label>Mass of the day</Label>
      <H1>{day.title}</H1>
      <ListenButton
        label="Listen to all the readings"
        items={() => day.readings.map((r) => ({ key: `reading:${r.ref}`, text: `${KIND_LABEL[r.kind]}. ${r.ref.replace(/(\d+):(\d+)/g, 'chapter $1, verse $2')}.\n${r.verses.map((v) => v.text).join(' ')}` }))}
      />
      {day.readings.map((r) => (
        <Card key={r.kind}>
          <Label>{KIND_LABEL[r.kind]}</Label>
          <Text style={s.ref}>{r.ref}</Text>
          <ListenButton items={() => [{ key: `reading:${r.ref}`, text: r.verses.map((v) => v.text).join(' ') }]} />
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
  saint: { fontSize: 19, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 13, color: colors.gold, fontWeight: '600' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  ref: { fontSize: 18, fontWeight: '700', color: colors.primary },
  verse: { fontSize: 17, lineHeight: 27, color: colors.ink },
  psalm: { paddingLeft: space.sm },
  num: { fontSize: 12, color: colors.gold, fontWeight: '700' },
});
