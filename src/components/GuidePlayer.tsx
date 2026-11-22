import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { playQueue, stopAudio } from '../features/audio';
import { hasPlus } from '../core/plans';
import { useAppState , markPrayed, recordPause } from '../state/store';
import { Button } from './ui';
import { colors, space } from './theme';
import { GuideStep, totalCount } from '../core/guides';
import { recordGroupPrayer } from '../features/groups';

/** Steps through a guided prayer one bead at a time. Finishing counts as praying. */
export function GuidePlayer({ steps, prayerId, finishTitle }: { steps: GuideStep[]; prayerId: string; finishTitle: string }) {
  const [index, setIndex] = useState(0);
  const [bead, setBead] = useState(1);
  const [finished, setFinished] = useState(false);
  /** Pray along: the voice says each prayer and moves on by itself. */
  const [aloud, setAloud] = useState(false);
  const { plus } = useAppState();
  const started = useRef<number | null>(null);
  const nextRef = useRef<() => void>(() => {});
  const step = steps[index];
  const total = totalCount(steps);
  const said = steps.slice(0, index).reduce((n, s) => n + s.count, 0) + bead - 1;

  function next() {
    started.current ??= Date.now();
    if (bead < step.count) return setBead(bead + 1);
    if (index < steps.length - 1) {
      setIndex(index + 1);
      setBead(1);
      return;
    }
    recordPause({
      at: Date.now(),
      outcome: 'prayed',
      prayerId,
      app: 'none',
      seconds: Math.round((Date.now() - (started.current ?? Date.now())) / 1000),
    });
    markPrayed();
    recordGroupPrayer().catch(() => {});
    setAloud(false);
    stopAudio();
    setFinished(true);
  }

  useEffect(() => {
    nextRef.current = next;
  });

  useEffect(() => {
    if (!aloud || finished) return;
    const s = steps[index];
    let cancelled = false;
    // Speak the title once per step; repeated beads say just the prayer.
    const text = bead === 1 ? `${s.title}.\n${s.text}` : s.text;
    playQueue([{ key: s.prayerId ? `prayer:${s.prayerId}` : `text:${s.title}`, text }], 'guide').then((completed) => {
      if (completed && !cancelled) nextRef.current();
    });
    return () => {
      cancelled = true;
    };
  }, [aloud, index, bead, finished, steps]);

  useEffect(() => () => void stopAudio(), []);

  function toggleAloud() {
    if (!hasPlus(plus)) return router.push('/plus');
    if (aloud) stopAudio();
    setAloud(!aloud);
  }

  function back() {
    if (bead > 1) return setBead(bead - 1);
    if (index > 0) {
      setIndex(index - 1);
      setBead(steps[index - 1].count);
    }
  }

  if (finished) {
    return (
      <View style={g.done}>
        <Text style={g.doneTitle}>{finishTitle}</Text>
        <Text style={g.doneBody}>Thank you for praying. God bless you.</Text>
        <Button title="Done" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={g.track} accessibilityLabel={`${said} of ${total} prayers said`}>
        <View style={[g.fill, { width: `${Math.round((said / total) * 100)}%` }]} />
      </View>
      <ScrollView contentContainerStyle={g.body}>
        {step.heading ? <Text style={g.heading}>{step.heading}</Text> : null}
        <Text style={g.title}>{step.title}</Text>
        <Text style={g.text}>{step.text}</Text>
        {step.count > 1 ? (
          <View style={g.beads} accessibilityLabel={`${bead} of ${step.count}`}>
            {Array.from({ length: step.count }, (_, i) => (
              <View key={i} style={[g.bead, i < bead && g.beadOn, i === bead - 1 && g.beadNow]} />
            ))}
            <Text style={g.beadCount}>
              {bead} of {step.count}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={g.actions}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: aloud }} onPress={toggleAloud} style={g.aloud}>
          <Ionicons name={aloud ? 'pause-circle' : 'volume-high-outline'} size={20} color={colors.primary} />
          <Text style={g.aloudText}>{aloud ? 'Praying along aloud · tap to pause' : 'Pray along aloud'}</Text>
        </Pressable>
        <Button
          title={index === steps.length - 1 && bead === step.count ? 'Amen' : step.count > 1 && bead < step.count ? 'Next bead' : 'Next'}
          onPress={next}
        />
        <Button kind="ghost" title="Back" onPress={back} disabled={index === 0 && bead === 1} />
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  track: { height: 4, backgroundColor: colors.line },
  fill: { height: 4, backgroundColor: colors.gold },
  body: { padding: space.lg, gap: space.md },
  heading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.gold },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink },
  text: { fontSize: 20, lineHeight: 31, color: colors.ink },
  beads: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: space.sm },
  bead: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.primary },
  beadOn: { backgroundColor: colors.primary },
  beadNow: { transform: [{ scale: 1.25 }] },
  beadCount: { marginLeft: space.sm, color: colors.muted, fontWeight: '600' },
  aloud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  aloudText: { color: colors.primary, fontWeight: '700' },
  actions: { padding: space.md, gap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  done: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md },
  doneTitle: { fontSize: 28, fontWeight: '700', color: colors.ink },
  doneBody: { fontSize: 17, color: colors.muted },
});
