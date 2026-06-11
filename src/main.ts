import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { SCENARIOS } from './scenarios';
import type { Scenario } from './scenarios';
import { DEFAULT_PARAMS, cloneParams } from './params';
import type { GlobalParams } from './params';
import { createMap, runScenario, applyProjection } from './map-controller';
import { ZoomChart } from './chart';
import { buildUI } from './ui';

let isAnimating = false;
let pendingProjection: 'mercator' | 'globe' | null = null;
let globalParams: GlobalParams = cloneParams(DEFAULT_PARAMS);

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

const {
  mapContainer,
  chartCanvas,
  setActiveScenario,
  setStatus,
  setUIProjection,
  setAnimating,
} = buildUI(appEl, SCENARIOS, globalParams, {
  onParamsChange(params) {
    globalParams = params;
  },

  onScenarioSelect(id) {
    if (isAnimating) return;
    const scenario = SCENARIOS.find(s => s.id === id);
    if (scenario) startScenario(scenario);
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

function startScenario(scenario: Scenario): void {
  setActiveScenario(scenario.id);
  const minZoomLine = scenario.minZoomKind === 'none' ? null : globalParams.minZoom;
  chart.startRecording(minZoomLine);
  setStatus('Running…');
  isAnimating = true;
  setAnimating(true);
  runScenario(
    map,
    scenario,
    globalParams,
    (zoom, t) => chart.addSample(zoom, t),
    () => {
      isAnimating = false;
      setAnimating(false);
      chart.stopRecording();
      setStatus('Complete');
    },
  );
}

map.once('load', () => {
  if (pendingProjection) {
    applyProjection(map, pendingProjection);
    pendingProjection = null;
  }

  const first = SCENARIOS[0];
  if (first) startScenario(first);
});
