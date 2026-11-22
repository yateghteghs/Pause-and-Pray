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
import { PausePlan, pausePlan, pausePrayer, prayerById } from '../core/prayers';
import { resolvePrayerId } from '../core/schedule';
import { PauseOutcome } from '../core/stats';
import { getState, nextPauseCounter, recordPause, useAppState } from '../state/store';
import { gospelVerse } from '../core/readings';

/** "I've prayed" becomes active after a short moment, so the tap follows the prayer. */
const PRAY_DELAY_MS = 5000;

export default function PrayerPause() {
  const { app, time, mode } = useLocalSearchParams<{ app?: string; time?: string; mode?: string }>();
  /** Opened by a paused app (Android ?app=, iOS shield notification), not by "Pray now" or a reminder. */
  const isGate = !time && mode !== 'now';
  const state = useAppState();
  const started = useRef(0);
  /** The plan whose "I've prayed" button has unlocked after PRAY_DELAY_MS. */
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const plan = useMemo((): PausePlan => {
    const slot = state.gate.schedule.find((t) => t.id === time);
    if (slot) {
      // Prayer times keep their own prayer (Angelus, Hour of Mercy…), then the intentions.
      const p = prayerById(resolvePrayerId(slot, new Date())) ?? pausePrayer(0);
      const forIntentions = pausePlan(state.intentions, getState().pauseCounter, 'pray-now');
      const sections = [{ title: p.title, text: p.text }];
      if (state.intentions.length) sections.push(...forIntentions.sections.filter((x) => x.intention));
      return { sections, prayerId: p.id };
    }
    return pausePlan(state.intentions, getState().pauseCounter, isGate ? 'gate' : 'pray-now');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, time, mode]);

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

  // Read once per pause (the counter advances in the effect above).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const counter = useMemo(() => getState().pauseCounter, [app, time, mode]);
  const gospel = useMemo(() => gospelVerse(new Date(), counter, { country: state.country }), [counter, state.country]);

  const appLabel = app ? state.appLabels[app] ?? 'your app' : undefined;
  const minutes = state.gate.unlockMinutes;

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

    // Both "I've prayed" and "Skip for now" unlock; only the stats differ.
    const target = app ?? 'shielded-app';
    AppGate.unlock(target, minutes);
    if (Platform.OS === 'android' && app && AppGate.openApp(app)) return;
    if (isGate && Platform.OS === 'ios' && getState().gate.gatedApps.length) {
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
        <Text style={s.kicker}>{isGate ? 'Pause and pray before you scroll' : 'Pray now'}</Text>
        {gospel ? (
          <View style={s.gospel}>
            <Text style={s.gospelText}>{gospel.verse.text}</Text>
            <Text style={s.gospelRef}>Today’s Gospel · {gospel.ref.split(' ')[0]} {gospel.verse.label}</Text>
          </View>
        ) : null}
        {plan.sections.map((section, i) =>
          section.intention ? (
            <View key={`i-${i}`} style={s.intention}>
              <Text style={s.intentionLabel}>Praying for</Text>
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
          <Text style={s.note}>Choose three intentions in Settings and your pauses will pray for them.</Text>
        ) : null}
      </ScrollView>
      <View style={s.actions}>
        <Button title={ready ? "I've prayed" : 'Pray slowly…'} onPress={() => finish('prayed')} disabled={!ready} />
        {isGate && (app || Platform.OS === 'ios') ? (
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
