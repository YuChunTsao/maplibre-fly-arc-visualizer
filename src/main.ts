import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { DEFAULT_PARAMS, cloneParams } from './params';
import type { GlobalParams } from './params';
import { loadFromHash, saveToHash } from './url-params';
import { createMap, runScenario, applyProjection } from './map-controller';
import { ZoomChart } from './chart';
import { buildUI } from './ui';
import * as maplibreglA from 'maplibre-gl';
import * as maplibreglB from 'maplibre-gl-b';
import { NavigationControl } from 'maplibre-gl';
import workerUrlA from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// Each MapLibre build needs its own worker wired up explicitly.
maplibreglA.setWorkerUrl(workerUrlA);

// For dev version, construct URL based on base path
const base = import.meta.env.BASE_URL;
maplibreglB.setWorkerUrl(`${base}maplibre-gl-worker-dev.mjs`);

const _initial = loadFromHash();
let isAnimating = false;
let globalParams: GlobalParams = _initial ? cloneParams(_initial.params) : cloneParams(DEFAULT_PARAMS);
let mode: 'playground' | 'compare' = _initial?.mode ?? 'playground';
let projection: 'mercator' | 'globe' = _initial?.projection ?? 'mercator';
let pendingProjection: 'mercator' | 'globe' | null = projection !== 'mercator' ? projection : null;
let mapMinZoomLockActive = false;
let isSyncing = false;

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

const {
  mapContainerA,
  mapContainerB,
  chartCanvas,
  setStatus,
  setUIProjection,
  setAnimating,
  setCodeOutput,
  setMode,
} = buildUI(appEl, { params: globalParams, mode, projection }, {
  onParamsChange(params) {
    globalParams = params;
    saveToHash(globalParams, mode, projection);
    if (mapMinZoomLockActive) {
      const v = globalParams.mapMinZoom ?? null;
      mapA.setMinZoom(v);
      if (mode === 'compare') mapB.setMinZoom(v);
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
    if (mode === 'compare') mapB.setMinZoom(v);
  },

  onProjectionToggle(p) {
    if (isAnimating) return;
    projection = p;
    saveToHash(globalParams, mode, projection);
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

  onModeChange(newMode) {
    mode = newMode;
    saveToHash(globalParams, mode, projection);
    setMode(newMode);
    chart.setSingleSeriesMode(newMode === 'playground');
    if (newMode === 'compare') {
      mapB.jumpTo({
        center: mapA.getCenter(),
        zoom: mapA.getZoom(),
        bearing: mapA.getBearing(),
        pitch: mapA.getPitch(),
      });
      attachSync();
    } else {
      detachSync();
    }
  },
});

saveToHash(globalParams, mode, projection);
window.addEventListener('hashchange', () => window.location.reload());

const mapA = createMap(mapContainerA, maplibreglA, '#60a5fa');
const mapB = createMap(mapContainerB, maplibreglB, '#f97316');
const chart = new ZoomChart(chartCanvas);
chart.setSingleSeriesMode(true);

function syncAtoB() {
  if (isSyncing || isAnimating) return;
  isSyncing = true;
  mapB.jumpTo({ center: mapA.getCenter(), zoom: mapA.getZoom(), bearing: mapA.getBearing(), pitch: mapA.getPitch() });
  isSyncing = false;
}

function syncBtoA() {
  if (isSyncing || isAnimating) return;
  isSyncing = true;
  mapA.jumpTo({ center: mapB.getCenter(), zoom: mapB.getZoom(), bearing: mapB.getBearing(), pitch: mapB.getPitch() });
  isSyncing = false;
}

function attachSync() {
  if (mode === 'compare') {
    mapA.on('move', syncAtoB);
    mapB.on('move', syncBtoA);
  }
}
function detachSync() {
  mapA.off('move', syncAtoB);
  mapB.off('move', syncBtoA);
}

function generateCodeSnippet(params: GlobalParams): string {
  const { center, zoom } = params.to;
  const lines: string[] = ['map.flyTo({'];
  lines.push(`  center: [${center[0]}, ${center[1]}],`);
  if (zoom !== null) lines.push(`  zoom: ${zoom},`);
  lines.push(`  curve: ${params.curve},`);
  lines.push(`  speed: ${params.speed},`);
  if (params.minZoom !== null) lines.push(`  minZoom: ${params.minZoom},`);
  if (params.maxDuration !== null) lines.push(`  maxDuration: ${params.maxDuration},`);
  if (params.duration !== null) lines.push(`  duration: ${params.duration},`);
  lines.push('});');
  if (params.mapMinZoom !== null) {
    lines.push('');
    lines.push('// Set separately — affects flight ceiling');
    lines.push(`map.setMinZoom(${params.mapMinZoom});`);
  }
  return lines.join('\n');
}

function startScenario(): void {
  // Build an array of minZoom markers to pass to the chart (support both map and flyto simultaneously)
  const markers: Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }> = [];
  if (globalParams.mapMinZoom !== null && globalParams.mapMinZoom !== undefined) {
    markers.push({ value: globalParams.mapMinZoom, kind: 'map' });
  }
  if (globalParams.minZoom !== null && globalParams.minZoom !== undefined) {
    markers.push({ value: globalParams.minZoom, kind: 'flyto' });
  }
  chart.startRecording(markers as any);
  setStatus('Running…');
  isAnimating = true;
  setAnimating(true);
  detachSync();

  if (mode === 'playground') {
    runScenario(
      mapA,
      globalParams,
      (zoom, t) => chart.addSample(zoom, t, 'a'),
      () => {
        isAnimating = false;
        setAnimating(false);
        chart.stopRecording();
        setStatus('Complete');
        if (mapMinZoomLockActive && globalParams.mapMinZoom !== null) {
          mapA.setMinZoom(globalParams.mapMinZoom);
        }
        setCodeOutput(generateCodeSnippet(globalParams));
      }
    );
  } else {
    let doneA = false;
    let doneB = false;

    const onAnimationEnd = () => {
      if (doneA && doneB) {
        isAnimating = false;
        setAnimating(false);
        chart.stopRecording();
        attachSync();
        setStatus('Complete');
        if (mapMinZoomLockActive && globalParams.mapMinZoom !== null) {
          mapA.setMinZoom(globalParams.mapMinZoom);
          mapB.setMinZoom(globalParams.mapMinZoom);
        }
      }
    };

    runScenario(mapA, globalParams, (zoom, t) => chart.addSample(zoom, t, 'a'), () => {
      doneA = true;
      onAnimationEnd();
    });
    runScenario(mapB, globalParams, (zoom, t) => chart.addSample(zoom, t, 'b'), () => {
      doneB = true;
      onAnimationEnd();
    });
  }
}

let mapsLoaded = 0;
function onMapLoaded() {
  mapsLoaded++;
  if (mapsLoaded === 2) attachSync();
}

mapA.once('load', () => {
  if (pendingProjection) {
    applyProjection(mapA, pendingProjection);
    pendingProjection = null;
  }
  mapA.addControl(new NavigationControl(), 'top-right');
  onMapLoaded();
});

mapB.once('load', () => {
  mapB.addControl(new NavigationControl(), 'top-right');
  onMapLoaded();
});
