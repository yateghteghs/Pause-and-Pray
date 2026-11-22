# Recording the prayers

Pause & Pray reads prayers aloud with the phone's own voice (a Plus feature). Each recording you add **replaces that voice for one item**, in one language, with no app update. Until an item is recorded, the phone's voice keeps working, so you can add recordings a few at a time.

## Who records

- A priest, a deacon or a religious sister or brother, or a parish choir for sung prayers, with a calm, unhurried voice.
- Several voices are fine (for example a priest for the Angelus, a youth for the Rosary), but keep one voice per prayer.
- Credit them in the app: each recording has a credit line such as "Prayed by Fr. Moses, St. Monica Parish".

## What to record

Record in three batches, most-used first. "Key" is what the app looks up; use it as the file name.

| Batch | Prayer | Key | Words |
|---|---|---|---|
| 1 | Sign of the Cross | `prayer:sign-of-the-cross` | 16 |
| 1 | Our Father | `prayer:our-father` | 56 |
| 1 | Hail Mary | `prayer:hail-mary` | 42 |
| 1 | Glory Be | `prayer:glory-be` | 30 |
| 1 | Apostles' Creed | `prayer:apostles-creed` | 112 |
| 1 | Fatima Prayer | `prayer:fatima-prayer` | 28 |
| 1 | Hail, Holy Queen | `prayer:hail-holy-queen` | 94 |
| 1 | Prayer after the Rosary | `prayer:rosary-closing` | 60 |
| 2 | The Angelus | `prayer:angelus` | 128 |
| 2 | Regina Caeli | `prayer:regina-caeli` | 93 |
| 2 | The Hour of Mercy | `prayer:divine-mercy-hour` | 60 |
| 2 | Eternal Father | `prayer:chaplet-eternal-father` | 32 |
| 2 | For the sake of his sorrowful Passion | `prayer:chaplet-sorrowful-passion` | 16 |
| 2 | Holy God | `prayer:chaplet-holy-god` | 17 |
| 2 | Morning Offering | `prayer:morning-offering` | 65 |
| 2 | Night Prayer | `prayer:night-prayer` | 66 |
| 3 | Memorare | `prayer:memorare` | 73 |
| 3 | Prayer to St. Michael | `prayer:st-michael` | 60 |
| 3 | Act of Contrition | `prayer:act-of-contrition` | 64 |
| 3 | Angel of God | `prayer:guardian-angel` | 29 |
| 3 | Come, Holy Spirit | `prayer:come-holy-spirit` | 38 |
| 3 | The Jesus Prayer | `prayer:jesus-prayer` | 12 |

Later batches: the 12 intention prayers (`intention:<label>`, see `src/content/intentions.json`), the novena days (`novena:my-intentions:1` to `:9`) and the saints' stories (`saint:MM-DD`). Mass readings need the Lectionary licence first if you record a modern translation; the World English Bible text in the app is public domain.

**Read the exact words in `src/content/prayers.json`**, after the theological adviser has approved them. For the Rosary and the Chaplet, record each prayer **once**: the app repeats it for each bead. Where the Angelus text shows "Hail Mary…", pray the full Hail Mary.

## How to record

- **Place:** a quiet room with soft furnishings, or an empty church outside service times (a church sounds beautiful but echoes; test first).
- **Equipment:** a modern phone held 20–30 cm away is enough to start; a USB or lavalier microphone is better.
- **Takes:** one file per prayer. Leave half a second of silence at the start and end. Re-record any stumbles.
- **Format:** M4A (AAC), mono, 64–96 kbps, 44.1 or 48 kHz. Keep each file under 2 MB.
- **Check:** listen on a phone speaker and on earphones before uploading.

## Permission (do this before recording)

Ask each voice to sign a short release. A plain template to adapt (have it checked by a lawyer):

> I, ______, give [Index Prima / SKYHub] permission to use my voice recordings of Catholic prayers in the Pause & Pray app and its promotion, worldwide and without time limit, with credit as "______". I can ask for my credit to be changed or the recordings to be removed at any time.
> Signed ______  Date ______

Traditional prayers need no licence. The Hour of Mercy and Chaplet wording follows the English translation of St. Faustina's *Diary*: clear that permission (see the README) before recording them.

## Putting recordings live

1. In Supabase, create a **public** Storage bucket named `audio`, with a folder per language (`en/`, `ig/`, `yo/`, `ha/`, `tiv/`).
2. Upload the files, named by key, e.g. `en/hail-mary.m4a`.
3. Run `supabase/migrations/0006_audio_tracks.sql` once, then add a row per file in the SQL editor:

```sql
insert into public.audio_tracks (key, language, url, credit) values
  ('prayer:hail-mary', 'en',
   'https://<project>.supabase.co/storage/v1/object/public/audio/en/hail-mary.m4a',
   'Prayed by Fr. Moses, St. Monica Parish');
```

The app picks them up the next time it opens. To ship recordings inside the app instead (they then work offline from the first launch), add the same entries to `src/content/audio.json`.

## Other languages

Record the same keys with the language code (`ig` Igbo, `yo` Yoruba, `ha` Hausa, `tiv` Tiv, `fr` French, `sw` Swahili). Translated prayer texts must be approved first, and the app's language setting will choose which recordings play.
