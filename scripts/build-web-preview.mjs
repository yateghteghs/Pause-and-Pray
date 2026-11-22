#!/usr/bin/env node
/**
 * Builds the browser preview of Pause & Pray into preview/dist:
 *   preview/dist/app.js       the Expo web bundle, with its few images inlined
 *   preview/dist/index.html   preview/index.html (the phone frame page)
 *
 * Usage: node scripts/build-web-preview.mjs
 */
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = mkdtempSync(join(tmpdir(), 'pause-pray-web-'));
execSync(`npx expo export --platform web --output-dir ${out}`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_OFFLINE: '1', CI: '1' },
});

const jsDir = join(out, '_expo/static/js/web');
const bundles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));
if (bundles.length !== 1) throw new Error(`Expected one bundle, found: ${bundles.join(', ')}`);
let js = readFileSync(join(jsDir, bundles[0]), 'utf8');

// Inline images and the icon font so the preview needs no server paths.
const MIME = { png: 'image/png', ttf: 'font/ttf' };
js = js.replace(/"(\/assets\/[^"]+\.(png|ttf))"/g, (match, path, ext) => {
  try {
    return `"data:${MIME[ext]};base64,${readFileSync(join(out, path)).toString('base64')}"`;
  } catch {
    return match;
  }
});

const dist = join(root, 'preview/dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'app.js'), js);
copyFileSync(join(root, 'preview/index.html'), join(dist, 'index.html'));
rmSync(out, { recursive: true, force: true });
console.log(`Preview built in ${dist} (${Math.round(js.length / 1024)} KB of JS)`);
