import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Mirrors the "@/*" path in tsconfig.json, so tests can import app modules
// (and mock them) the same way the app does.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
