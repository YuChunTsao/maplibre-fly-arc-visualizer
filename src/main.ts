import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import { SCENARIOS } from './scenarios';
import { createMap, runScenario, applyProjection } from './map-controller';
import { ZoomChart } from './chart';
import { buildUI } from './ui';

let isAnimating = false;
let pendingProjection: 'mercator' | 'globe' | null = null;

const appEl = document.getElementById('app');
if (!appEl) throw new Error('Missing #app');

const {
  mapContainer,
  chartCanvas,
  setActiveScenario,
  setStatus,
  setUIProjection,
  setAnimating,
} = buildUI(appEl, SCENARIOS, {
  onScenarioSelect(id) {
    if (isAnimating) return;
    const scenario = SCENARIOS.find(s => s.id === id);
    if (!scenario) return;

    setActiveScenario(id);
    const minZoomLine =
      scenario.minZoomSource.kind === 'none' ? null : scenario.minZoomSource.minZoom;
    chart.startRecording(minZoomLine);
    setStatus('Running…');
    isAnimating = true;
    setAnimating(true);

    runScenario(
      map,
      scenario,
      (zoom, t) => chart.addSample(zoom, t),
      () => {
        isAnimating = false;
        setAnimating(false);
        chart.stopRecording();
        setStatus('Complete');
      },
    );
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

map.once('load', () => {
  if (pendingProjection) {
    applyProjection(map, pendingProjection);
    pendingProjection = null;
  }

  // Auto-run scenario 1
  const first = SCENARIOS[0];
  if (!first) return;
  setActiveScenario(first.id);
  const minZoomLine = first.minZoomSource.kind === 'none' ? null : first.minZoomSource.minZoom;
  chart.startRecording(minZoomLine);
  setStatus('Running…');
  isAnimating = true;
  setAnimating(true);

  runScenario(
    map,
    first,
    (zoom, t) => chart.addSample(zoom, t),
    () => {
      isAnimating = false;
      setAnimating(false);
      chart.stopRecording();
      setStatus('Complete');
    },
  );
});
