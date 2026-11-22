import audio from '../../content/audio.json';
import prayers from '../../content/prayers.json';
import { AudioTrack, findTrack, prayerItem, speechText } from '../audio';

describe('read aloud text', () => {
  test('versicle markers are dropped and Hail Mary cues expanded', () => {
    const angelus = prayers.prayers.find((p) => p.id === 'angelus')!.text;
    const spoken = speechText(angelus);
    expect(spoken).not.toMatch(/^[VR]\. /m);
    expect(spoken).not.toContain('Hail Mary…');
    expect(spoken.match(/full of grace/g)).toHaveLength(3);
  });

  test('abbreviations are said in full', () => {
    expect(speechText('St. Joseph and Sts. Peter and Paul, Bl. Iwene, Fr. Moses')).toBe(
      'Saint Joseph and Saints Peter and Paul, Blessed Iwene, Father Moses',
    );
  });

  test('prayer items have a key recordings can match', () => {
    expect(prayerItem('hail-mary').key).toBe('prayer:hail-mary');
  });
});

describe('recordings', () => {
  const tracks: AudioTrack[] = [
    { key: 'prayer:hail-mary', language: 'en', url: 'https://example.org/en/hail-mary.m4a' },
    { key: 'prayer:hail-mary', language: 'ig', url: 'https://example.org/ig/hail-mary.m4a' },
  ];

  test('matched by key and language', () => {
    expect(findTrack(tracks, 'prayer:hail-mary', 'en-NG')?.url).toContain('/en/');
    expect(findTrack(tracks, 'prayer:hail-mary', 'ig')?.url).toContain('/ig/');
    expect(findTrack(tracks, 'prayer:hail-mary', 'yo')).toBeUndefined();
    expect(findTrack(tracks, 'prayer:our-father', 'en')).toBeUndefined();
  });

  test('bundled tracks point at real prayers and https files', () => {
    const ids = new Set(prayers.prayers.map((p) => `prayer:${p.id}`));
    for (const t of audio.tracks as AudioTrack[]) {
      expect(t.url).toMatch(/^https:\/\//);
      if (t.key.startsWith('prayer:')) expect(ids.has(t.key)).toBe(true);
    }
  });
});
