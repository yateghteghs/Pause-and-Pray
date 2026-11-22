import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Body, Button, Card, H2, Label, NavRow, Screen } from '../../components/ui';
import { colors, space } from '../../components/theme';
import { COLOUR_HEX, liturgicalDay } from '../../core/liturgical';
import { computeStats } from '../../core/stats';
import { formatTime } from '../../core/schedule';
import { useAppState } from '../../state/store';
import { IS_WEB_PREVIEW } from '../../features/demo';
import { accountsAvailable } from '../../features/auth';

/** Today: the day, your intentions and Pray now. Readings, prayers, the saint and stats are in the footer menu. */
export default function Today() {
  const state = useAppState();
  const now = new Date();
  const day = liturgicalDay(now, { country: state.country });
  const stats = computeStats(state.events, now);

  if (!state.accountChoice && accountsAvailable) return <Redirect href="/welcome" />;
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const upcoming = state.gate.schedule
    .filter((t) => t.enabled)
    .map((t) => ({ t, at: t.hour * 60 + t.minute }))
    .sort((a, b) => a.at - b.at);
  const next = upcoming.find((u) => u.at > minutesNow) ?? upcoming[0];
  const firstName = state.account?.name?.split(' ')[0];

  return (
    <Screen>
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
        {next ? <Body muted>Next prayer time: {next.t.label} at {formatTime(next.t)}</Body> : null}
      </Card>

      {IS_WEB_PREVIEW && state.gate.gatedApps.length ? (
        <Card style={{ paddingVertical: space.xs }}>
          <Label>Preview</Label>
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
  colour: { fontSize: 13, color: colors.muted, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', paddingVertical: space.xs },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.muted },
});
