import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/fly-arc-visualizer/',
  resolve: {
    alias: [
      {
        find: /^maplibre-gl-b$/,
        replacement: path.resolve(__dirname, './libs/maplibre-gl-compare.mjs'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['maplibre-gl-b'],
  },
});
