import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { DEFAULT_PARAMS, cloneParams } from './params';
import type { GlobalParams } from './params';
import { createMap, runScenario, applyProjection } from './map-controller';
import { ZoomChart } from './chart';
import { buildUI } from './ui';
import * as maplibreglA from 'maplibre-gl';
import * as maplibreglB from 'maplibre-gl-b';
import { NavigationControl } from 'maplibre-gl';
import workerUrlA from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// Each MapLibre build needs its own worker wired up explicitly.
maplibreglA.setWorkerUrl(workerUrlA);
maplibreglB.setWorkerUrl(new URL('../libs/maplibre-gl-worker-dev.mjs', import.meta.url).href);

let isAnimating = false;
let pendingProjection: 'mercator' | 'globe' | null = null;
let globalParams: GlobalParams = cloneParams(DEFAULT_PARAMS);
let mapMinZoomLockActive = false;

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

const { mapContainerA, mapContainerB, chartCanvas, setStatus, setUIProjection, setAnimating } =
  buildUI(appEl, globalParams, {
    onParamsChange(params) {
      globalParams = params;
      if (mapMinZoomLockActive) {
        const v = globalParams.mapMinZoom ?? null;
        mapA.setMinZoom(v);
        mapB.setMinZoom(v);
      }
    },

    onRun() {
      if (isAnimating) return;
      startScenario();
    },

    onMapMinZoomLock(active) {
      mapMinZoomLockActive = active;
      const v = active ? (globalParams.mapMinZoom ?? null) : null;
      mapA.setMinZoom(v);
      mapB.setMinZoom(v);
    },

    onProjectionToggle(p) {
      if (isAnimating) return;
      setUIProjection(p);
      if (mapA.isStyleLoaded()) {
        applyProjection(mapA, p);
      } else {
        pendingProjection = p;
      }
      if (mapB.isStyleLoaded()) {
        applyProjection(mapB, p);
      }
    },
  });

const mapA = createMap(mapContainerA, maplibreglA, '#60a5fa');
const mapB = createMap(mapContainerB, maplibreglB, '#f97316');
const chart = new ZoomChart(chartCanvas);

function startScenario(): void {
  // Build an array of minZoom markers to pass to the chart (support both map and flyto simultaneously)
  const markers: Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }> = [];
  if (globalParams.mapMinZoom !== null && globalParams.mapMinZoom !== undefined) {
    markers.push({ value: globalParams.mapMinZoom, kind: 'map' });
  }
  if (globalParams.flyToMinZoom !== null && globalParams.flyToMinZoom !== undefined) {
    markers.push({ value: globalParams.flyToMinZoom, kind: 'flyto' });
  }
  // If no markers, pass an empty array (chart will show defaults when appropriate)
  chart.startRecording(markers as any);
  setStatus('Running…');
  isAnimating = true;
  setAnimating(true);

  let doneA = false;
  let doneB = false;

  const onAnimationEnd = () => {
    if (doneA && doneB) {
      isAnimating = false;
      setAnimating(false);
      chart.stopRecording();
      setStatus('Complete');
      if (mapMinZoomLockActive && globalParams.mapMinZoom !== null) {
        mapA.setMinZoom(globalParams.mapMinZoom);
        mapB.setMinZoom(globalParams.mapMinZoom);
      }
    }
  };

  // Run both scenarios in parallel
  runScenario(
    mapA,
    globalParams,
    (zoom, t) => chart.addSample(zoom, t, 'a'),
    () => {
      doneA = true;
      onAnimationEnd();
    }
  );

  runScenario(
    mapB,
    globalParams,
    (zoom, t) => chart.addSample(zoom, t, 'b'),
    () => {
      doneB = true;
      onAnimationEnd();
    }
  );
}

mapA.once('load', () => {
  if (pendingProjection) {
    applyProjection(mapA, pendingProjection);
    pendingProjection = null;
  }

  mapA.addControl(new NavigationControl(), 'top-right');
});

mapB.once('load', () => {
  mapB.addControl(new NavigationControl(), 'top-right');
});
