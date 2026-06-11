import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/fly-arc-visualizer/',
  resolve: {
    alias: [
      {
        // Exact match only — prevents the alias from also rewriting
        // subpath imports like 'maplibre-gl/dist/maplibre-gl.css'.
        find: /^maplibre-gl$/,
        replacement: path.resolve(__dirname, '../maplibre-gl-js/dist/maplibre-gl-dev.mjs'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    fs: {
      allow: ['..'],
    },
  },
});
