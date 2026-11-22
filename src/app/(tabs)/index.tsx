import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Body, Button, Card, H2, Label, NavRow, Screen } from '../../components/ui';
import { colors, space } from '../../components/theme';
import { COLOUR_HEX, liturgicalDay } from '../../core/liturgical';
import { computeStats } from '../../core/stats';
import { duePrayer, formatTime, nextPrayer } from '../../core/schedule';
import { previewPrayerTimeNow, useAppState } from '../../state/store';
import { IS_WEB_PREVIEW } from '../../features/demo';
import { accountsAvailable } from '../../features/auth';

/** Today: the day, your intentions and Pray now. Readings, prayers, the saint and stats are in the footer menu. */
export default function Today() {
  const state = useAppState();
  // Re-render each minute so a prayer time that arrives shows up here.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = new Date(nowMs);
  const day = liturgicalDay(now, { country: state.country });
  const stats = computeStats(state.events, now);

  if (!state.accountChoice && accountsAvailable) return <Redirect href="/welcome" />;
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const due = duePrayer(state.gate.schedule, nowMs, state.gate.lastPrayedAt);
  const next = nextPrayer(state.gate.schedule, nowMs);
  const firstName = state.account?.name?.split(' ')[0];

  return (
    <Screen>
      {due ? (
        <View style={s.due}>
          <Text style={s.dueKicker}>
            {due.time.kind === 'personal' ? 'Your prayer time' : due.time.label} · {formatTime(due.time)}
          </Text>
          <Text style={s.dueTitle}>It’s time to pray.</Text>
          <Text style={s.dueBody}>Your chosen apps are paused until you have prayed.</Text>
          <Button kind="secondary" title="Pray now" onPress={() => router.push({ pathname: '/pause', params: { time: due.time.id } })} />
        </View>
      ) : null}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[s.band, { backgroundColor: COLOUR_HEX[day.colour] }]} />
        <View style={{ padding: space.md, gap: space.xs }}>
          <Label>
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {day.seasonLabel}
          </Label>
          <H2>{day.title}</H2>
          <Text style={s.colour}>Liturgical colour: {day.colour}</Text>
        </View>
      </Card>

      <Card>
        <Label>{firstName ? `${firstName}, you’re praying for` : 'You’re praying for'}</Label>
        {state.intentions.length ? (
          state.intentions.map((i) => (
            <Body key={i}>• {i}</Body>
          ))
        ) : (
          <Body muted>Choose three intentions and your pauses will pray for them.</Body>
        )}
        <Button
          kind={due ? 'secondary' : 'primary'}
          title={state.intentions.length ? 'Pray now' : 'Choose intentions'}
          onPress={() =>
            state.intentions.length
              ? router.push({ pathname: '/pause', params: { mode: 'now' } })
              : router.push('/intentions')
          }
        />
        {state.intentions.length ? <Button kind="ghost" title="Change intentions" onPress={() => router.push('/intentions')} /> : null}
      </Card>

      <Card>
        <View style={s.statsRow}>
          <Stat value={stats.currentStreak} label={stats.currentStreak === 1 ? 'day streak' : 'days streak'} />
          <Stat value={stats.prayersSaid} label="prayers" />
          <Stat value={stats.minutesInPrayer} label="minutes" />
        </View>
        {next ? (
          <Body muted>
            Next prayer time: {next.time.kind === 'personal' ? 'your prayer' : next.time.label} at {formatTime(next.time)}
          </Body>
        ) : (
          <Body muted>No prayer times set. Add one in Me, then Settings.</Body>
        )}
      </Card>

      {IS_WEB_PREVIEW && state.gate.gatedApps.length ? (
        <Card style={{ paddingVertical: space.xs }}>
          <Label>Preview</Label>
          {!due ? (
            <NavRow
              label="Make it prayer time now"
              detail="Moves your first prayer time to now, to show the apps pausing"
              onPress={previewPrayerTimeNow}
            />
          ) : null}
          {state.gate.gatedApps.slice(0, 3).map((pkg) => (
            <NavRow
              key={pkg}
              label={`Open ${state.appLabels[pkg] ?? pkg}`}
              detail="See what happens when you open a paused app"
              onPress={() => router.push({ pathname: '/pause', params: { app: pkg } })}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  band: { height: 10 },
  due: { backgroundColor: colors.primary, borderRadius: 14, padding: space.md, gap: space.sm },
  dueKicker: { color: '#E7D9A8', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  dueTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  dueBody: { color: '#DDE9E1', fontSize: 15, lineHeight: 21 },
  colour: { fontSize: 13, color: colors.muted, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', paddingVertical: space.xs },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.muted },
});
