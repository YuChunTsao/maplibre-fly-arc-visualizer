# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive visualization tool for comparing two versions of MapLibre GL's `flyTo` animation arc behavior side-by-side. Users tweak `mapMinZoom`, `flyToMinZoom`, `curve`, and `speed`, then both maps animate simultaneously with zoom curves overlaid on a shared canvas chart.

**Version A (baseline)** is the official npm release (default: `6.0.0-13`), loaded from `node_modules/maplibre-gl`.

**Version B (dev)** is a custom build committed at `libs/maplibre-gl-compare.mjs` — typically your modifications to maplibre-gl-js. Replace this file with your own built `.mjs` to compare behavior.

## Commands

```bash
npm run dev       # Dev server at http://localhost:5173/maplibre-fly-arc-visualizer/
npm run build     # tsc then vite build → dist/
npm run preview   # Preview the production build locally
npm run format    # Prettier formatting
npm run deploy    # Build + push to GitHub Pages
```

No test suite is configured.

## Comparing Versions

To compare your maplibre-gl changes against the official baseline:

1. Build your modified maplibre-gl:
   ```bash
   cd ../maplibre-gl-js
   npm run build-dist
   ```

2. Copy the dev build to this project. The dev build is split into chunks, so you must
   copy **all three** files into `libs/` — the shared and worker chunks are required
   (without the worker chunk, Version B's map renders blank):
   ```bash
   cp dist/maplibre-gl-dev.mjs        ../maplibre-fly-arc-visualizer/libs/maplibre-gl-compare.mjs
   cp dist/maplibre-gl-shared-dev.mjs ../maplibre-fly-arc-visualizer/libs/
   cp dist/maplibre-gl-worker-dev.mjs ../maplibre-fly-arc-visualizer/libs/
   ```

3. Run the visualizer:
   ```bash
   npm run dev
   ```

4. Use the UI to set parameters and click Run. Both maps animate in parallel; the chart overlays both zoom curves (blue = official A, orange = your changes B).

To compare against a different baseline, edit `package.json` and change the `maplibre-gl` version, then `npm install`.

## Architecture

The app has six modules with clear single responsibilities:

- **`src/params.ts`** — `GlobalParams` type and defaults (Tokyo→London). Single source of truth for all animation parameters. `cloneParams()` deep-clones state.

- **`src/main.ts`** — Application orchestrator. Imports both `maplibreglA` (npm) and `maplibreglB` (local build), creates both maps, and runs both `startScenario()` animations in parallel. Coordinates completion of both before stopping animation state.

- **`src/map-controller.ts`** — `createMap(containerId, lib)` + `runScenario()` + `applyProjection()`. Accepts a maplibre library instance (`lib`) to support multiple builds. `runScenario()` samples zoom on every `move` event and passes values to the chart with a series tag ('a' or 'b').

- **`src/ui.ts`** — Vanilla DOM panel builder. No framework. Exposes `UIControls` with both `mapContainerA` and `mapContainerB` (side-by-side), chart canvas, and setters for status/button state. Helper functions: `el()`, `coordField()`, `paramRow()`, `optParamRow()`.

- **`src/chart.ts`** — `ZoomChart` class. Canvas-based, device-pixel-ratio-aware dual-series chart. Stores `samplesA` and `samplesB` separately; `addSample(zoom, t, series)` tags each sample. Draws two curves (blue = A/official, orange = B/dev) and a legend. Uses `ResizeObserver` for responsive redraws.

- **`libs/maplibre-gl-compare.mjs`** — Version B build file (committed to repo). Replace with your own maplibre-gl dev build to compare.

**Data flow:** UI input → `globalParams` → Run button → parallel `startScenario()` runs → both maps' move events → `ZoomChart.addSample(zoom, t, series)` → canvas redraw with both curves overlaid.

## Code Style

- Prettier: 100-char lines, single quotes, trailing commas (es5), semicolons
- TypeScript strict mode; `noUnusedLocals` and `noUnusedParameters` are enforced — unused imports/vars will fail `tsc`
- TS-only project. `tsc` runs with `noEmit` (type-check only) — vite does the bundling. Never commit or generate `src/*.js`; if any appear, they are stray emit and should be deleted.
- No framework — vanilla DOM only
