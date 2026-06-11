import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { DEFAULT_PARAMS, cloneParams } from './params';
import type { GlobalParams } from './params';
import { createMap, runScenario, applyProjection } from './map-controller';
import { ZoomChart } from './chart';
import { buildUI } from './ui';
import { NavigationControl } from 'maplibre-gl';

let isAnimating = false;
let pendingProjection: 'mercator' | 'globe' | null = null;
let globalParams: GlobalParams = cloneParams(DEFAULT_PARAMS);

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

const { mapContainer, chartCanvas, setStatus, setUIProjection, setAnimating } =
  buildUI(appEl, globalParams, {
    onParamsChange(params) {
      globalParams = params;
    },

    onRun() {
      if (isAnimating) return;
      startScenario();
    },

    onProjectionToggle(p) {
      if (isAnimating) return;
      setUIProjection(p);
      if (map.isStyleLoaded()) {
        applyProjection(map, p);
      } else {
        pendingProjection = p;
      }
    },
  });

const map = createMap(mapContainer.id);
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
  runScenario(
    map,
    globalParams,
    (zoom, t) => chart.addSample(zoom, t),
    () => {
      isAnimating = false;
      setAnimating(false);
      chart.stopRecording();
      setStatus('Complete');
    }
  );
}

map.once('load', () => {
  if (pendingProjection) {
    applyProjection(map, pendingProjection);
    pendingProjection = null;
  }

  map.addControl(new NavigationControl(), 'top-right');
});
