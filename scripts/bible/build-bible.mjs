#!/usr/bin/env node
/**
 * Builds data/web-bible.json ({ book: chapters[verses[]] }) from two public-domain sources:
 *
 *  1. The 66 books of the World English Bible, from the structured JSON in the
 *     `world-english-bible` npm package (json/<book>.json).
 *  2. The deuterocanonical books (Tobit, Judith, 1–2 Maccabees, Wisdom, Sirach,
 *     Baruch), from the World English Bible Catholic Edition text in the
 *     `evangelization` npm package (Bibles/world-english-bible/World_English_Bible.md).
 *     That file is a PDF extraction: run the check printed at the end and read
 *     any passage you add from these books against a printed copy.
 *
 * The divine name: the WEB prints "Yahweh". In Catholic prayer the Church asks
 * for "the LORD" instead (Congregation for Divine Worship, 2008), which is what
 * the WEB Catholic Edition does, so the same substitution is made here. Because
 * the wording changes, the app credits the text as "adapted from the World English Bible".
 *
 * Usage: node scripts/bible/build-bible.mjs <world-english-bible/json dir> <World_English_Bible.md>
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [jsonDir, catholicMd] = process.argv.slice(2);
if (!jsonDir || !catholicMd) throw new Error('Usage: build-bible.mjs <json dir> <World_English_Bible.md>');

const FILE_TO_BOOK = {
  '1chronicles': '1 Chronicles', '1corinthians': '1 Corinthians', '1john': '1 John', '1kings': '1 Kings',
  '1peter': '1 Peter', '1samuel': '1 Samuel', '1thessalonians': '1 Thessalonians', '1timothy': '1 Timothy',
  '2chronicles': '2 Chronicles', '2corinthians': '2 Corinthians', '2john': '2 John', '2kings': '2 Kings',
  '2peter': '2 Peter', '2samuel': '2 Samuel', '2thessalonians': '2 Thessalonians', '2timothy': '2 Timothy',
  '3john': '3 John', songofsolomon: 'Song of Solomon',
};

export function divineName(text) {
  return text
    .replace(/\bLord Yahweh\b/g, 'Lord GOD') // as the Catholic Edition prints it
    .replace(/\bO Yahweh\b/g, 'O LORD')
    // Addressed to God: "But now, Yahweh, you are…" -> "But now, LORD, you are…"
    .replace(/, Yahweh(?=[,.!?;:])/g, ', LORD')
    .replace(/(^|[.!?“‘"]\s*)Yahweh(?=,)/g, '$1LORD')
    .replace(/(^|[.!?“‘"]\s*)Yahweh\b/g, '$1The LORD')
    .replace(/\bYahweh\b/g, 'the LORD')
    .replace(/\bYah\b/g, 'the LORD');
}

function tidy(text) {
  return text.replace(/\s+/g, ' ').trim();
}

const bible = {};

// 1. Structured WEB, 66 books
for (const file of readdirSync(jsonDir).filter((f) => f.endsWith('.json'))) {
  const key = file.replace('.json', '');
  const book = FILE_TO_BOOK[key] ?? key[0].toUpperCase() + key.slice(1);
  const chapters = [];
  for (const item of JSON.parse(readFileSync(join(jsonDir, file), 'utf8'))) {
    if (!item.value || !item.chapterNumber || !item.verseNumber) continue;
    const ch = (chapters[item.chapterNumber - 1] ??= []);
    ch[item.verseNumber - 1] = (ch[item.verseNumber - 1] ?? '') + item.value;
  }
  bible[book] = chapters.map((c) => (c ?? []).map((v) => (v ? divineName(tidy(v)) : v)));
}

// 2. Deuterocanonical books from the Catholic Edition text
const DEUTERO = new Set(['Tobit', 'Judith', '1 Maccabees', '2 Maccabees', 'Wisdom of Solomon', 'Sirach', 'Baruch']);
const HEADER = /^((?:[1-4] )?[A-Z][A-Za-z ]+?) (\d+):(\d+) (\d+) ((?:[1-4] )?[A-Z][A-Za-z ]+?) (\d+):(\d+)$/;
let book = null;
let chapter = 0;
let verse = 0;
let current = null;
const flush = () => {
  if (book && current != null && chapter > 0 && verse > 0) {
    (bible[book][chapter - 1] ??= [])[verse - 1] = tidy(
      current.replace(/[†*‡]/g, '').replace(/([,;:!?])(?=[A-Za-z“‘])/g, '$1 '),
    );
  }
  current = null;
};
for (const raw of readFileSync(catholicMd, 'utf8').split('\n')) {
  const line = raw.trim();
  if (!line) continue;
  const h = HEADER.exec(line);
  if (h) {
    if (h[1] !== book && h[2] === '1' && h[3] === '1') {
      flush();
      book = DEUTERO.has(h[1]) ? h[1] : null;
      if (book) bible[book] = [];
      chapter = 0;
      verse = 0;
    }
    continue;
  }
  if (!book) continue;
  if (/^\d+$/.test(line)) {
    if (Number(line) === chapter + 1) {
      flush();
      chapter += 1;
      verse = 0;
    }
    continue;
  }
  const v = /^(\d+) (.*)$/.exec(line);
  if (v && Number(v[1]) === verse + 1) {
    if (chapter === 0) chapter = 1;
    flush();
    verse += 1;
    current = v[2];
    continue;
  }
  if (current != null) {
    current = /[a-z]-$/.test(current) && /^[a-z]/.test(line) ? current.slice(0, -1) + line : `${current} ${line}`;
  }
}
flush();

writeFileSync(new URL('../../data/web-bible.json', import.meta.url), JSON.stringify(bible));

// Report: books, and deuterocanonical verses that may carry footnote text from the PDF.
console.log(`${Object.keys(bible).length} books`);
for (const b of DEUTERO) {
  const suspect = [];
  bible[b]?.forEach((c, ci) => (c ?? []).forEach((t, vi) => {
    if (t && (/§|\b\d+:\d+\b/.test(t) || t.length > 600)) suspect.push(`${ci + 1}:${vi + 1}`);
  }));
  console.log(`${b}: ${bible[b]?.length ?? 0} chapters${suspect.length ? `; check ${suspect.length} verses (${suspect.slice(0, 8).join(', ')}…)` : ''}`);
}
