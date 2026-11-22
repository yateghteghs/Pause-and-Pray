/**
 * The Prayer Pause screen. Opened by the Android gate through the deep link
 * pauseandpray://pause?app=<package>, by an iOS shield notification, by a
 * prayer-time reminder (?time=<prayer time id>), or by "Pray now" (?mode=now).
 *
 * At a prayer time the apps stay paused until "I've prayed": there is no skip.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppGate from '../../modules/app-gate';
import { Button } from '../components/ui';
import { colors, space } from '../components/theme';
import { PausePlan, pausePlan, prayerTimePlan } from '../core/prayers';
import { duePrayer, formatTime } from '../core/schedule';
import { PauseOutcome } from '../core/stats';
import { getState, markPrayed, nextPauseCounter, recordPause, useAppState } from '../state/store';
import { gospelVerse } from '../core/readings';
import { recordGroupPrayer } from '../features/groups';
import { ListenButton } from '../components/ListenButton';

/** "I've prayed" becomes active after a short moment, so the tap follows the prayer. */
const PRAY_DELAY_MS = 5000;

export default function PrayerPause() {
  const { app, time, mode } = useLocalSearchParams<{ app?: string; time?: string; mode?: string }>();
  const state = useAppState();
  const started = useRef(0);
  /** The plan whose "I've prayed" button has unlocked after PRAY_DELAY_MS. */
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Read once per pause (the counter advances in the effect below).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const counter = useMemo(() => getState().pauseCounter, [app, time, mode]);
  // The screen is remounted for each new link (see getId in _layout), so this is when this pause opened.
  const [openedAt] = useState(() => Date.now());

  /** The prayer time this pause belongs to: the one in the link, or the one that is due. */
  const due = duePrayer(state.gate.schedule, openedAt, state.gate.lastPrayedAt);
  const prayerTime = state.gate.schedule.find((t) => t.id === time) ?? due?.time;
  /** A prayer time is waiting: the apps stay paused until the user prays. */
  const locked = Boolean(due);
  /** Opened by a paused app (Android ?app=, iOS shield notification). */
  const fromApp = mode !== 'now' && !time && (Boolean(app) || Platform.OS === 'ios');

  const plan = useMemo((): PausePlan => {
    if (prayerTime) {
      const group = state.groups.find((g) => g.id === prayerTime.groupId);
      return prayerTimePlan(prayerTime, new Date(openedAt), state.intentions, counter, group);
    }
    return pausePlan(state.intentions, counter, fromApp ? 'gate' : 'pray-now');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayerTime?.id, counter, openedAt]);

  // Advance the rotation so the next pause shows a different prayer.
  useEffect(() => {
    nextPauseCounter();
  }, [app, time, mode]);

  useEffect(() => {
    started.current = Date.now();
    const id = plan.prayerId;
    const t = setTimeout(() => setReadyFor(id), PRAY_DELAY_MS);
    return () => clearTimeout(t);
  }, [plan.prayerId]);
  const ready = readyFor === plan.prayerId;

  const gospel = useMemo(() => gospelVerse(new Date(openedAt), counter, { country: state.country }), [openedAt, counter, state.country]);

  const appLabel = app ? state.appLabels[app] ?? 'your app' : undefined;
  const minutes = state.gate.unlockMinutes;
  const everyOpen = state.gate.mode === 'every-open';

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function finish(outcome: PauseOutcome) {
    recordPause({
      at: Date.now(),
      outcome,
      prayerId: plan.prayerId,
      app: app ?? (Platform.OS === 'ios' ? 'shielded-app' : 'none'),
      seconds: Math.round((Date.now() - started.current) / 1000),
    });

    if (outcome === 'closed') {
      if (Platform.OS === 'android') BackHandler.exitApp();
      else router.replace('/');
      return;
    }

    if (outcome === 'prayed') {
      markPrayed();
      recordGroupPrayer().catch(() => {});
    }
    // Every-open mode: praying (or skipping, outside a prayer time) opens the app for a while.
    if (everyOpen && fromApp) AppGate.unlock(app ?? 'shielded-app', minutes);

    if (Platform.OS === 'android' && app && AppGate.openApp(app)) return;
    if (fromApp && Platform.OS === 'ios' && getState().gate.gatedApps.length) {
      setDone(everyOpen ? `Your apps are open for ${minutes} minutes. God bless you.` : 'Your apps are open again. God bless you.');
      return;
    }
    leave();
  }

  if (done) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.centre}>
          <Text style={s.title}>Thank you for praying</Text>
          <Text style={s.lead}>{done}</Text>
          <Button title="Done" onPress={() => router.replace('/')} />
        </View>
      </SafeAreaView>
    );
  }

  const kicker = prayerTime
    ? `${prayerTime.kind === 'personal' ? 'Your prayer time' : prayerTime.label} · ${formatTime(prayerTime)}`
    : fromApp
      ? 'Pause and pray before you scroll'
      : 'Pray now';

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.kicker}>{kicker}</Text>
        <ListenButton
          light
          label="Pray aloud"
          items={() =>
            plan.sections.map((x) => ({
              key: x.intention ? `intention:${x.intention}` : x.prayerId ? `prayer:${x.prayerId}` : `text:${x.title}`,
              text: x.intention ? `${x.heading ?? 'Praying for'} ${x.intention}.\n${x.text}` : `${x.title}.\n${x.text}`,
            }))
          }
        />
        {gospel ? (
          <View style={s.gospel}>
            <Text style={s.gospelText}>{gospel.verse.text}</Text>
            <Text style={s.gospelRef}>Today’s Gospel · {gospel.ref.split(' ')[0]} {gospel.verse.label}</Text>
          </View>
        ) : null}
        {plan.sections.map((section, i) =>
          section.intention ? (
            <View key={`i-${i}`} style={s.intention}>
              <Text style={s.intentionLabel}>{section.heading ?? 'Praying for'}</Text>
              <Text style={s.intentionText}>{section.intention}</Text>
              <Text style={s.intentionPrayer}>{section.text}</Text>
            </View>
          ) : (
            <View key={`p-${i}`} style={{ gap: space.sm }}>
              {i > 0 ? <Text style={s.intentionLabel}>Then pray</Text> : null}
              <Text style={s.title}>{section.title}</Text>
              <Text style={s.prayer}>{section.text}</Text>
            </View>
          ),
        )}
        {!state.intentions.length ? (
          <Text style={s.note}>Choose three intentions in Me and your pauses will pray for them.</Text>
        ) : null}
      </ScrollView>
      <View style={s.actions}>
        <Button title={ready ? "I've prayed" : 'Pray slowly…'} onPress={() => finish('prayed')} disabled={!ready} />
        {fromApp ? (
          <>
            <Button kind="secondary" title={`Put the phone down${appLabel ? ` (close ${appLabel})` : ''}`} onPress={() => finish('closed')} />
            {!locked && everyOpen ? <Button kind="ghost" title="Skip for now" onPress={() => finish('skipped')} /> : null}
          </>
        ) : (
          <Button kind="ghost" title={locked ? 'Not yet' : 'Close'} onPress={leave} />
        )}
        {fromApp && locked ? (
          <Text style={s.actionNote}>Your apps stay paused until you have prayed.</Text>
        ) : fromApp && everyOpen ? (
          <Text style={s.actionNote}>{appLabel ?? 'Your apps'} open for {minutes} minutes after you pray or skip.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { padding: space.lg, paddingTop: space.xl * 1.5, gap: space.md },
  centre: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.lg },
  intention: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: space.md, gap: 6 },
  intentionLabel: { color: '#CFE0D5', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  intentionText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  intentionPrayer: { color: '#FFFFFF', fontSize: 19, lineHeight: 29 },
  gospel: { borderLeftWidth: 3, borderLeftColor: '#E7D9A8', paddingLeft: space.md, gap: 6 },
  gospelText: { color: '#FFFFFF', fontSize: 19, lineHeight: 28, fontStyle: 'italic' },
  gospelRef: { color: '#E7D9A8', fontSize: 13, fontWeight: '600' },
  kicker: { color: '#E7D9A8', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  lead: { color: '#FFFFFF', fontSize: 18, lineHeight: 26 },
  prayer: { color: '#FFFFFF', fontSize: 21, lineHeight: 32 },
  note: { color: '#CFE0D5', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  actionNote: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  actions: { padding: space.lg, gap: space.sm, backgroundColor: '#FBF8F1', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
});
