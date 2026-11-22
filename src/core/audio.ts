/**
 * Pure helpers for read aloud and recorded audio (no device APIs here).
 */
import content from '../content/prayers.json';

export interface AudioTrack {
  /** What it reads, e.g. "prayer:hail-mary", "saint:06-03". */
  key: string;
  /** BCP-47 language, e.g. "en", "ig", "yo", "ha". */
  language: string;
  url: string;
  /** Shown while it plays, e.g. "Prayed by Fr. Moses and St. Monica's choir". */
  credit?: string;
}

export interface AudioItem {
  key: string;
  text: string;
}

const HAIL_MARY = content.prayers.find((p) => p.id === 'hail-mary')!.text;

/**
 * Text as it should be spoken: no versicle markers, full prayers instead of
 * "Hail Mary…" cues, and abbreviations said in full.
 */
export function speechText(text: string): string {
  return text
    .replace(/^Hail Mary…$/gm, HAIL_MARY)
    .replace(/^[VR]\.\s+/gm, '')
    .replace(/\bSts\.\s/g, 'Saints ')
    .replace(/\bSt\.\s/g, 'Saint ')
    .replace(/\bBl\.\s/g, 'Blessed ')
    .replace(/\bFr\.\s/g, 'Father ')
    .replace(/…/g, '.')
    .replace(/\s+\n|\n+/g, '\n')
    .trim();
}

/** The recording for an item in the user's language, if there is one. */
export function findTrack(tracks: AudioTrack[], key: string, language: string): AudioTrack | undefined {
  const lang = language.toLowerCase().split('-')[0];
  return tracks.find((t) => t.key === key && t.language.toLowerCase().split('-')[0] === lang);
}

export function prayerItem(id: string): AudioItem {
  const p = content.prayers.find((x) => x.id === id);
  if (!p) throw new Error(`No prayer ${id}`);
  return { key: `prayer:${id}`, text: `${p.title}.\n${p.text}` };
}

export const VOICE_RATES = { slower: 0.8, normal: 0.95 } as const;
export type VoiceRate = keyof typeof VOICE_RATES;
