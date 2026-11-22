/**
 * The Prayer Pause screen. Opened by the Android gate through the deep link
 * pauseandpray://pause?app=<package>, by an iOS shield notification, or by a
 * prayer-time reminder (?time=<schedule id>).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppGate from '../../modules/app-gate';
import { Button } from '../components/ui';
import { colors, space } from '../components/theme';
import { pausePrayer, prayerById } from '../core/prayers';
import { resolvePrayerId } from '../core/schedule';
import { PauseOutcome } from '../core/stats';
import { getState, nextPauseCounter, recordPause, useAppState } from '../state/store';

/** "I've prayed" becomes active after a short moment, so the tap follows the prayer. */
const PRAY_DELAY_MS = 5000;

export default function PrayerPause() {
  const { app, time } = useLocalSearchParams<{ app?: string; time?: string }>();
  const state = useAppState();
  const started = useRef(Date.now());
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const prayer = useMemo(() => {
    const slot = state.gate.schedule.find((t) => t.id === time);
    if (slot) return prayerById(resolvePrayerId(slot, new Date())) ?? pausePrayer(0);
    return pausePrayer(getState().pauseCounter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, time]);

  // Advance the rotation so the next pause shows a different prayer.
  useEffect(() => {
    nextPauseCounter();
  }, [app, time]);

  useEffect(() => {
    started.current = Date.now();
    setReady(false);
    const t = setTimeout(() => setReady(true), PRAY_DELAY_MS);
    return () => clearTimeout(t);
  }, [prayer.id]);

  const appLabel = app ? state.appLabels[app] ?? 'your app' : undefined;
  const minutes = state.gate.unlockMinutes;

  function finish(outcome: PauseOutcome) {
    recordPause({
      at: Date.now(),
      outcome,
      prayerId: prayer.id,
      app: app ?? (Platform.OS === 'ios' ? 'shielded-app' : 'none'),
      seconds: Math.round((Date.now() - started.current) / 1000),
    });

    if (outcome === 'closed') {
      if (Platform.OS === 'android') BackHandler.exitApp();
      else router.replace('/');
      return;
    }

    // Both "I've prayed" and "Skip for now" unlock; only the stats differ.
    const target = app ?? 'shielded-app';
    AppGate.unlock(target, minutes);
    if (Platform.OS === 'android' && app && AppGate.openApp(app)) return;
    if (Platform.OS === 'ios' && getState().gate.gatedApps.length) {
      setDone(`Your apps are open for ${minutes} minutes. God bless you.`);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
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

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.kicker}>Pause and pray before you scroll</Text>
        <Text style={s.title}>{prayer.title}</Text>
        <Text style={s.prayer}>{prayer.text}</Text>
        {prayer.note ? <Text style={s.note}>{prayer.note}</Text> : null}
      </ScrollView>
      <View style={s.actions}>
        <Button title={ready ? "I've prayed" : 'Pray slowly…'} onPress={() => finish('prayed')} disabled={!ready} />
        {app || Platform.OS === 'ios' ? (
          <>
            <Button kind="secondary" title={`Put the phone down${appLabel ? ` (close ${appLabel})` : ''}`} onPress={() => finish('closed')} />
            <Button kind="ghost" title="Skip for now" onPress={() => finish('skipped')} />
          </>
        ) : (
          <Button kind="ghost" title="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        )}
        {app ? <Text style={s.actionNote}>{appLabel} opens for {minutes} minutes after you pray or skip.</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { padding: space.lg, paddingTop: space.xl * 1.5, gap: space.md },
  centre: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.lg },
  kicker: { color: '#E7D9A8', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '700' },
  lead: { color: '#FFFFFF', fontSize: 18, lineHeight: 26 },
  prayer: { color: '#FFFFFF', fontSize: 21, lineHeight: 32 },
  note: { color: '#CFE0D5', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  actionNote: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  actions: { padding: space.lg, gap: space.sm, backgroundColor: '#FBF8F1', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
});
