import { useEffect, useId, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { colors, space } from './theme';
import { AudioItem } from '../core/audio';
import { hasPlus } from '../core/plans';
import { currentlyPlaying, onPlaybackChange, playQueue, stopAudio } from '../features/audio';
import { plusAvailable } from '../features/billing';
import { useAppState } from '../state/store';

/**
 * "Listen" for any text in the app (a Plus feature). Plays a recording when
 * one exists, otherwise the phone's voice. `light` is for dark backgrounds.
 */
export function ListenButton({ items, label = 'Listen', light }: { items: () => AudioItem[]; label?: string; light?: boolean }) {
  const { plus } = useAppState();
  const id = useId();
  const [now, setNow] = useState(currentlyPlaying);
  useEffect(() => onPlaybackChange(setNow), []);
  const playing = now?.owner === id;
  const credit = playing ? now?.credit : undefined;
  // Stop when the screen goes away, if this button is the one playing.
  useEffect(() => () => void (currentlyPlaying()?.owner === id && stopAudio()), [id]);

  if (!plusAvailable) return null;
  const unlocked = hasPlus(plus);
  const tint = light ? '#FFFFFF' : colors.primary;

  async function toggle() {
    if (!unlocked) return router.push('/plus');
    if (playing) return stopAudio();
    await playQueue(items(), id);
  }

  return (
    <View style={{ gap: 4, alignSelf: 'flex-start' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Stop reading aloud' : unlocked ? label : `${label} (Plus)`}
        onPress={toggle}
        style={({ pressed }) => [l.button, { borderColor: tint }, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name={playing ? 'stop-circle-outline' : 'volume-high-outline'} size={18} color={tint} />
        <Text style={[l.text, { color: tint }]}>{playing ? 'Stop' : label}</Text>
        {!unlocked ? <Text style={[l.badge, { color: tint, borderColor: tint }]}>Plus</Text> : null}
      </Pressable>
      {playing && credit ? <Text style={[l.credit, light && { color: '#DDE9E1' }]}>{credit}</Text> : null}
    </View>
  );
}

const l = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: space.md },
  text: { fontWeight: '700', fontSize: 14 },
  badge: { fontSize: 11, fontWeight: '700', borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2 },
  credit: { fontSize: 12, color: colors.muted },
});
