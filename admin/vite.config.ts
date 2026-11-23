import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ARTIFACT=1 builds one classic script for the browser preview (scripts/build-artifact.mjs).
const artifact = process.env.ARTIFACT === '1';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs: { allow: ['..'] } },
  build: artifact
    ? { outDir: 'dist-artifact-build', cssCodeSplit: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } } }
    : { outDir: 'dist' },
});
