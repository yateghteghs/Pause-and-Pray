#!/usr/bin/env node
/**
 * Resolves every reference in src/content/lectionary.json against
 * data/web-bible.json (World English Bible, Catholic Edition, public domain)
 * and writes the texts the app bundles: src/content/readings-text.json.
 *
 * Run after editing lectionary.json:  node scripts/build-readings.mjs
 * Fails if any reference cannot be found, so gaps never ship silently.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const bible = JSON.parse(readFileSync(new URL('data/web-bible.json', root), 'utf8'));
const lectionary = JSON.parse(readFileSync(new URL('src/content/lectionary.json', root), 'utf8'));

const BOOK_NAMES = { Psalm: 'Psalms', 'Song of Songs': 'Song of Solomon', Wisdom: 'Wisdom of Solomon' };

/**
 * The Lectionary counts a psalm's title as verse 1 (or 1–2); the WEB does not.
 * Lectionary verse = WEB verse + offset. Only psalms used so far are listed;
 * an unlisted psalm stops the build so its offset gets checked.
 */
const PSALM_OFFSET = {
  1: 0, 2: 0, 19: 1, 22: 1, 23: 0, 24: 0, 25: 0, 27: 0, 29: 0, 30: 1, 31: 1, 33: 0, 34: 1, 40: 1, 45: 1,
  46: 1, 47: 1, 51: 2, 67: 1, 71: 0, 72: 0, 78: 0, 80: 1, 84: 1, 85: 1, 89: 1, 93: 0, 95: 0, 96: 0, 97: 0,
  98: 0, 100: 0, 103: 0, 104: 0, 105: 0, 116: 0, 118: 0, 122: 0, 124: 0, 128: 0, 137: 0, 139: 0,
  145: 0, 147: 0,
};

/** "Matthew 9:35–10:1, 5a, 6-8" -> { book, spans: [[c1, v1, c2, v2], …] } in the reference's own numbering. */
export function parseRef(ref) {
  const m = /^((?:[1-4] )?[A-Za-z ]+?) (\d.*)$/.exec(ref.trim());
  if (!m) throw new Error(`Cannot parse reference: ${ref}`);
  const book = BOOK_NAMES[m[1]] ?? m[1];
  const spans = [];
  for (const segment of m[2].split(';')) {
    const s = segment.trim();
    const colon = s.indexOf(':');
    let chapter = Number(s.slice(0, colon));
    for (const item of s.slice(colon + 1).split(',')) {
      const [from, to] = item.trim().split(/[-–]/);
      const v1 = parseInt(from, 10);
      if (to === undefined) {
        spans.push([chapter, v1, chapter, v1]);
      } else if (to.includes(':')) {
        const [c2, v2] = to.split(':');
        spans.push([chapter, v1, Number(c2), parseInt(v2, 10)]);
        chapter = Number(c2);
      } else {
        spans.push([chapter, v1, chapter, parseInt(to, 10)]);
      }
    }
  }
  return { book, spans };
}

function versesOf(book, spans, offset = 0) {
  const chapters = bible[book];
  if (!chapters) throw new Error(`Book not in the WEB data: ${book}`);
  const out = [];
  for (const [c1, v1, c2, v2] of spans) {
    for (let c = c1; c <= c2; c++) {
      const verses = chapters[c - 1];
      if (!verses) throw new Error(`${book} has no chapter ${c}`);
      const start = c === c1 ? v1 - offset : 1;
      const end = c === c2 ? v2 - offset : verses.length;
      for (let v = Math.max(start, 1); v <= end; v++) {
        const text = verses[v - 1];
        if (text) out.push({ label: `${c}:${v}`, text });
        else if (v > verses.length) throw new Error(`${book} ${c}:${v} is past the end of the chapter`);
      }
    }
  }
  if (!out.length) throw new Error(`No verses found for ${book} ${JSON.stringify(spans)}`);
  return out;
}

const novenas = JSON.parse(readFileSync(new URL('src/content/novenas.json', root), 'utf8'));
// Novena days use the same resolver; they appear as entries with a single "reading".
for (const n of novenas.novenas) {
  n.days.forEach((d, i) => {
    lectionary.entries[`novena:${n.id}:${i + 1}`] = { readings: [{ kind: 'first', ref: d.ref }] };
  });
}

const texts = {};
for (const [key, entry] of Object.entries(lectionary.entries)) {
  for (const r of entry.readings) {
    if (texts[r.ref]) continue;
    const { book, spans } = parseRef(r.webRef ?? r.ref);
    let offset = 0;
    if (book === 'Psalms' && !r.webRef) {
      offset = PSALM_OFFSET[spans[0][0]];
      if (offset === undefined) throw new Error(`${key}: add Psalm ${spans[0][0]} to PSALM_OFFSET`);
    }
    texts[r.ref] = versesOf(book, spans, offset);
  }
}

writeFileSync(new URL('src/content/readings-text.json', root), JSON.stringify(texts));
console.log(`Resolved ${Object.keys(texts).length} passages for ${Object.keys(lectionary.entries).length} days.`);
