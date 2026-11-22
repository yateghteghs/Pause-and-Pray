import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Body, Card, H2, Label, NavRow, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { COLOUR_HEX, liturgicalDay } from '../core/liturgical';
import { mysteryOfTheDay } from '../core/rosary';
import { verseOfTheDay } from '../core/prayers';
import { computeStats } from '../core/stats';
import { formatTime } from '../core/schedule';
import { useAppState } from '../state/store';

export default function Today() {
  const state = useAppState();
  const now = new Date();
  const day = useMemo(() => liturgicalDay(now, { country: state.country }), [state.country, now.toDateString()]);
  const mystery = mysteryOfTheDay(now);
  const verse = verseOfTheDay(now);
  const stats = computeStats(state.events, now);

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const upcoming = state.gate.schedule
    .filter((t) => t.enabled)
    .map((t) => ({ t, at: t.hour * 60 + t.minute }))
    .sort((a, b) => a.at - b.at);
  const next = upcoming.find((u) => u.at > minutesNow) ?? upcoming[0];

  const saint = day.saint && day.saint.title !== day.title ? day.saint : undefined;

  return (
    <Screen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[s.band, { backgroundColor: COLOUR_HEX[day.colour] }]} />
        <View style={{ padding: space.md, gap: space.xs }}>
          <Label>
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {day.seasonLabel}
          </Label>
          <H2>{day.title}</H2>
          {day.saint?.observed && day.saint.about ? <Body muted>{day.saint.about}</Body> : null}
          {saint ? (
            <Body muted>
              Also today: {saint.title}
              {saint.about ? `. ${saint.about}` : ''}
            </Body>
          ) : null}
          <Text style={s.colour}>Liturgical colour: {day.colour}</Text>
        </View>
      </Card>

      <Card>
        <Label>Today's Rosary</Label>
        <H2>{mystery.title}</H2>
        {mystery.items.map((m, i) => (
          <Body key={m}>
            {i + 1}. {m}
          </Body>
        ))}
      </Card>

      <Card>
        <Label>Word of God</Label>
        <Body style={{ fontStyle: 'italic' }}>“{verse.text}”</Body>
        <Body muted>{verse.ref} (Douay-Rheims)</Body>
      </Card>

      <Card>
        <Label>Your prayer</Label>
        <View style={s.statsRow}>
          <Stat value={stats.currentStreak} label={stats.currentStreak === 1 ? 'day streak' : 'days streak'} />
          <Stat value={stats.prayersSaid} label="prayers" />
          <Stat value={stats.minutesInPrayer} label="minutes" />
        </View>
        {next ? <Body muted>Next: {next.t.label} at {formatTime(next.t)}</Body> : null}
      </Card>

      <Card style={{ paddingVertical: space.xs }}>
        <NavRow label="Pray now" detail="Open a Prayer Pause without a gated app" onPress={() => router.push('/pause')} />
        <NavRow label="Prayers" detail="Our Father, Angelus, Memorare and more" onPress={() => router.push('/prayers')} />
        <NavRow label="Stats" onPress={() => router.push('/stats')} />
        <NavRow
          label="Settings"
          detail={`${state.gate.gatedApps.length || 'No'} apps paused · ${state.gate.mode === 'every-open' ? 'every open' : 'prayer times only'}`}
          onPress={() => router.push('/settings')}
        />
      </Card>
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
  statsRow: { flexDirection: 'row', paddingVertical: space.sm },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 13, color: colors.muted },
});
