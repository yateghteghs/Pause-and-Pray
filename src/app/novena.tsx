import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Body, Button, Card, H1, H2, Label, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { NOVENAS, novenaProgress } from '../core/guides';
import { hasPlus } from '../core/plans';
import { intentionPrayer, prayerById } from '../core/prayers';
import { localDayKey } from '../core/dates';
import { markPrayed, recordPause, setNovena, useAppState } from '../state/store';
import { recordGroupPrayer } from '../features/groups';

export default function NovenaScreen() {
  const { plus, novena, intentions } = useAppState();
  if (!hasPlus(plus)) return <Redirect href="/plus" />;

  const n = NOVENAS.find((x) => x.id === (novena?.id ?? 'my-intentions')) ?? NOVENAS[0];
  const today = localDayKey(new Date());

  if (!novena) {
    return (
      <Screen>
        <Label>Novena</Label>
        <H1>{n.title}</H1>
        <Body>{n.about}</Body>
        <Body muted>Each day takes about five minutes: a verse of Scripture, a short reflection, your intentions and three traditional prayers.</Body>
        <Button title="Begin day 1 today" onPress={() => setNovena({ id: n.id, startedOn: today, daysDone: [] })} />
      </Screen>
    );
  }

  const progress = novenaProgress(novena.daysDone, today);
  const day = n.days[Math.min(progress.nextDay, 9) - 1];
  const complete = progress.nextDay > 9;

  return (
    <Screen>
      <Label>{n.title}</Label>
      <View style={s.days}>
        {n.days.map((d) => (
          <View key={d.day} style={[s.day, d.day <= novena.daysDone.length && s.dayDone]}>
            <Text style={[s.dayText, d.day <= novena.daysDone.length && { color: '#fff' }]}>{d.day}</Text>
          </View>
        ))}
      </View>

      {complete ? (
        <Card>
          <H2>You have prayed all nine days.</H2>
          <Body>Thank God for hearing you, and keep trusting him with your intentions.</Body>
          <Button kind="secondary" title="Start the novena again" onPress={() => setNovena({ id: n.id, startedOn: today, daysDone: [] })} />
        </Card>
      ) : progress.doneToday ? (
        <Card>
          <H2>Day {novena.daysDone.length} prayed today.</H2>
          <Body>Come back tomorrow for day {progress.nextDay}.</Body>
        </Card>
      ) : (
        <>
          <H1>Day {day.day}</H1>
          <Card>
            <Text style={s.verse}>{day.verse}</Text>
            <Text style={s.ref}>{day.ref}</Text>
          </Card>
          <Body>{day.reflection}</Body>
          {intentions.map((i, k) => (
            <Card key={i}>
              <Label>Praying for</Label>
              <Body style={{ fontWeight: '700' }}>{i}</Body>
              <Body>{intentionPrayer(i, day.day + k)}</Body>
            </Card>
          ))}
          {['our-father', 'hail-mary', 'glory-be'].map((id) => {
            const p = prayerById(id)!;
            return (
              <Card key={id}>
                <Label>{p.title}</Label>
                <Body>{p.text}</Body>
              </Card>
            );
          })}
          <Button
            title={`I have prayed day ${day.day}`}
            onPress={() => {
              setNovena({ ...novena, daysDone: [...novena.daysDone, today] });
              recordPause({ at: Date.now(), outcome: 'prayed', prayerId: `novena:${n.id}:${day.day}`, app: 'none', seconds: 0 });
              markPrayed();
              recordGroupPrayer().catch(() => {});
            }}
          />
        </>
      )}
      <Body muted>Scripture adapted from the World English Bible (public domain).</Body>
    </Screen>
  );
}

const s = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: colors.primary },
  dayText: { fontWeight: '700', color: colors.primary },
  verse: { fontSize: 18, lineHeight: 27, fontStyle: 'italic', color: colors.ink },
  ref: { color: colors.gold, fontWeight: '700', paddingTop: space.xs },
});
