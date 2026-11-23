#!/usr/bin/env node
// Builds the demo console as one page (dist-artifact/index.html + app.js) for the
// shareable preview. Run with no Supabase variables set, so it uses sample data.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const env = { ...process.env, ARTIFACT: '1' };
delete env.VITE_SUPABASE_URL;
delete env.VITE_SUPABASE_ANON_KEY;
execSync('npx vite build', { cwd: root, stdio: 'inherit', env });

const built = join(root, 'dist-artifact-build');
const css = readdirSync(built).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(built, f), 'utf8')).join('\n');
const out = join(root, 'dist-artifact');
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
copyFileSync(join(built, 'app.js'), join(out, 'app.js'));
writeFileSync(
  join(out, 'index.html'),
  `<title>Pause & Pray Admin</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script src="app.js" defer></script>
`,
);
rmSync(built, { recursive: true, force: true });
console.log(`Admin preview built in ${out}`);
