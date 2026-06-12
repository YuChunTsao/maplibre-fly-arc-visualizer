# MapLibre Fly Arc Visualizer

This repository is centered on an interactive playground that helps you experiment with and observe MapLibre GL `flyTo` animations in real time.

Key playground features

- Side-by-side maps: two map canvases run the same scenario in parallel so visual motion can be compared instantly.
- Live controls: change mapMinZoom, flyToMinZoom, curve, speed, origin/destination coordinates, and preset scenarios.
- Real-time sampling: a shared canvas chart plots zoom (y) vs time (x) for each map using distinct colors.
- Run/Stop and status: start simultaneous animations, monitor progress, and replay the last run in the UI.

## How to use the playground

1. Install dependencies:
   npm install
2. Start the dev server:
   npm run dev
   Open: http://localhost:5173/maplibre-fly-arc-visualizer/
3. Use the UI controls to set parameters and press Run. The playground will animate both maps and draw zoom curves for inspection.

## Quick commands

- npm run dev # start dev server (vite)
- npm run build # tsc + vite build
- npm run preview # preview production build
- npm run deploy # build + publish to GitHub Pages (gh-pages)
- npm run format # run Prettier

## Developer: swapping Version B (optional)

The playground works out-of-the-box using the official `maplibre-gl` package for both maps (A) and a bundled dev file for B if present. Contributors who need to compare a custom MapLibre build can replace Version B by providing a dev build in `libs/`.

Steps to use a local MapLibre dev build for Version B (optional):

1. Build maplibre-gl in its source repo (example):
   cd ../maplibre-gl-js
   npm run build-dist
2. Copy all required output files into this repo's `libs/` directory (all three files are required):
   cp dist/maplibre-gl-dev.mjs ../maplibre-fly-arc-visualizer/libs/maplibre-gl-compare.mjs
   cp dist/maplibre-gl-shared-dev.mjs ../maplibre-fly-arc-visualizer/libs/
   cp dist/maplibre-gl-worker-dev.mjs ../maplibre-fly-arc-visualizer/libs/
3. Restart the dev server and use the UI Run button. The playground will show A = official npm package, B = your local dev build.

## Key files

- package.json — scripts & dependencies
- src/params.ts — global parameters and defaults used by the UI and scenarios
- src/main.ts — coordinates both maps and orchestrates runs
- src/map-controller.ts — per-map creation and runScenario sampling
- src/ui.ts — DOM controls and playground layout
- src/chart.ts — ZoomChart that renders both series on a shared canvas
- libs/ — optional local MapLibre build files for Version B

## Notes

- TypeScript is strict: keep `tsc` passing (no unused imports/vars).
- Formatting: `npm run format` (Prettier).
