/**
 * Read aloud (Plus): plays a recording when there is one for the item and
 * language (content/audio.json or the audio_tracks table), and otherwise
 * reads the text with the phone's own voice (expo-speech). One thing plays
 * at a time; a queue plays items in order.
 */
import * as Speech from 'expo-speech';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import bundled from '../content/audio.json';
import { AudioItem, AudioTrack, findTrack, speechText, VOICE_RATES } from '../core/audio';
import { getJSON, setJSON } from '../storage/kv';
import { getState } from '../state/store';
import { accountsConfigured, supabase } from './auth';

const CACHE_KEY = 'pause-and-pray/audio-tracks/v1';
let tracks: AudioTrack[] = [...(bundled.tracks as AudioTrack[]), ...getJSON<AudioTrack[]>(CACHE_KEY, [])];
let player: AudioPlayer | null = null;
let session = 0;
let modeSet = false;

/** What is playing, and which caller (a Listen button, the guide) started it. */
export type NowPlaying = { owner: string; key: string; credit?: string } | null;
type Listener = (playing: NowPlaying) => void;
const listeners = new Set<Listener>();
let nowPlaying: NowPlaying = null;
let owner = '';

function announce(p: typeof nowPlaying) {
  nowPlaying = p;
  listeners.forEach((l) => l(p));
}

export function onPlaybackChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function currentlyPlaying() {
  return nowPlaying;
}

/** Fetches recordings added on the server since the app was released. */
export async function refreshTracks(): Promise<void> {
  if (!accountsConfigured) return;
  const { data, error } = await supabase().from('audio_tracks').select('key, language, url, credit');
  if (error || !data) return;
  const remote = data.map((t) => ({ key: t.key, language: t.language, url: t.url, credit: t.credit ?? undefined }));
  setJSON(CACHE_KEY, remote);
  tracks = [...(bundled.tracks as AudioTrack[]), ...remote];
}

export function hasRecording(key: string): boolean {
  return Boolean(findTrack(tracks, key, getState().voice.language));
}

/** Stops playback without announcing it (used when something new starts). */
async function halt(): Promise<void> {
  session++;
  player?.pause();
  player?.remove();
  player = null;
  await Speech.stop();
}

export async function stopAudio(): Promise<void> {
  await halt();
  announce(null);
}

function playOne(item: AudioItem, mySession: number): Promise<void> {
  const { language, rate } = getState().voice;
  const track = findTrack(tracks, item.key, language);
  return new Promise((resolve) => {
    if (mySession !== session) return resolve();
    announce({ owner, key: item.key, credit: track?.credit });
    if (track) {
      const p = createAudioPlayer(track.url);
      player = p;
      const sub = p.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          sub.remove();
          p.remove();
          if (player === p) player = null;
          resolve();
        }
      });
      p.play();
    } else {
      Speech.speak(speechText(item.text), {
        language,
        rate: VOICE_RATES[rate],
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    }
  });
}

/** Plays the items in order. Resolves when all have played, or when stopped. */
export async function playQueue(items: AudioItem[], by: string, onEach?: (index: number) => void): Promise<boolean> {
  await halt();
  owner = by;
  const mySession = ++session;
  if (!modeSet) {
    modeSet = true;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }
  for (let i = 0; i < items.length; i++) {
    if (mySession !== session) return false;
    onEach?.(i);
    await playOne(items[i], mySession);
  }
  if (mySession === session) announce(null);
  return mySession === session;
}
