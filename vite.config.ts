import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/maplibre-fly-arc-visualizer/',
  publicDir: 'libs',
  resolve: {
    alias: [
      {
        find: /^maplibre-gl-b$/,
        replacement: path.resolve(__dirname, './libs/maplibre-gl-compare.mjs'),
      },
    ],
  },
});
