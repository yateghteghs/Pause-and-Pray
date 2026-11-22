import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Body, Card, H2, Label, NavRow, Screen } from '../components/ui';
import { colors, space } from '../components/theme';
import { COLOUR_HEX, liturgicalDay } from '../core/liturgical';
import { mysteryOfTheDay } from '../core/rosary';
import { verseOfTheDay } from '../core/prayers';
import { KIND_LABEL, readingsFor } from '../core/readings';
import { saintOfDay } from '../core/liturgical';
import { formatDayKey } from '../core/dates';
import { accountsAvailable } from '../features/auth';
import { computeStats } from '../core/stats';
import { formatTime } from '../core/schedule';
import { useAppState } from '../state/store';
import { IS_WEB_PREVIEW } from '../features/demo';

export default function Today() {
  const state = useAppState();
  const now = new Date();
  const day = useMemo(() => liturgicalDay(now, { country: state.country }), [state.country, now.toDateString()]);
  const mystery = mysteryOfTheDay(now);
  const verse = verseOfTheDay(now);
  const readings = readingsFor(now, { country: state.country });
  const saintDay = saintOfDay(now, { country: state.country });
  const stats = computeStats(state.events, now);

  if (!state.accountChoice && accountsAvailable) return <Redirect href="/welcome" />;
  if (!state.onboarded) return <Redirect href="/onboarding" />;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const upcoming = state.gate.schedule
    .filter((t) => t.enabled)
    .map((t) => ({ t, at: t.hour * 60 + t.minute }))
    .sort((a, b) => a.at - b.at);
  const next = upcoming.find((u) => u.at > minutesNow) ?? upcoming[0];


  return (
    <Screen>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[s.band, { backgroundColor: COLOUR_HEX[day.colour] }]} />
        <View style={{ padding: space.md, gap: space.xs }}>
          <Label>
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · {day.seasonLabel}
          </Label>
          <H2>{day.title}</H2>
          {day.saint?.observed && day.saint.about && !day.saint.life ? <Body muted>{day.saint.about}</Body> : null}
          <Text style={s.colour}>Liturgical colour: {day.colour}</Text>
        </View>
      </Card>

      {state.intentions.length ? (
        <Card>
          <Label>I'm praying for</Label>
          {state.intentions.map((i) => (
            <Body key={i}>• {i}</Body>
          ))}
          <Pressable accessibilityRole="button" onPress={() => router.push('/intentions')}>
            <Text style={s.link}>Change</Text>
          </Pressable>
        </Card>
      ) : (
        <Card style={{ paddingVertical: space.xs }}>
          <NavRow label="Choose three intentions" detail="What are you praying for?" onPress={() => router.push('/intentions')} />
        </Card>
      )}

      {readings ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/readings')}>
          <Card>
            <Label>Today's Mass readings</Label>
            {readings.readings.map((r) => (
              <View key={r.kind} style={s.readingRow}>
                <Text style={s.readingKind}>{KIND_LABEL[r.kind]}</Text>
                <Text style={s.readingRef}>{r.ref}</Text>
              </View>
            ))}
            {(() => {
              const g = readings.readings.find((r) => r.kind === 'gospel')?.verses[0];
              return g ? <Body style={{ fontStyle: 'italic' }}>{g.text}</Body> : null;
            })()}
            <Text style={s.link}>Read today's readings ›</Text>
          </Card>
        </Pressable>
      ) : (
        <Card>
          <Label>Word of God</Label>
          <Body style={{ fontStyle: 'italic' }}>“{verse.text}”</Body>
          <Body muted>{verse.ref} (Douay-Rheims)</Body>
        </Card>
      )}

      {saintDay ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/saint')}>
          <Card>
            <Label>{saintDay.when === 'today' ? 'Saint of the day' : `Next saint · ${formatDayKey(saintDay.when)}`}</Label>
            <H2>{saintDay.saint.title}</H2>
            <Text style={s.meta}>
              {saintDay.saint.lived} · {saintDay.saint.place}
            </Text>
            <Body muted>{saintDay.saint.life?.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.')}</Body>
            <Text style={s.link}>Read their story ›</Text>
          </Card>
        </Pressable>
      ) : null}

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
        <Label>Your prayer</Label>
        <View style={s.statsRow}>
          <Stat value={stats.currentStreak} label={stats.currentStreak === 1 ? 'day streak' : 'days streak'} />
          <Stat value={stats.prayersSaid} label="prayers" />
          <Stat value={stats.minutesInPrayer} label="minutes" />
        </View>
        {next ? <Body muted>Next: {next.t.label} at {formatTime(next.t)}</Body> : null}
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
  link: { color: colors.primary, fontWeight: '700', fontSize: 15, paddingTop: space.xs },
  meta: { fontSize: 13, color: colors.gold, fontWeight: '600' },
  readingRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  readingKind: { fontSize: 14, color: colors.muted },
  readingRef: { fontSize: 14, color: colors.ink, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
