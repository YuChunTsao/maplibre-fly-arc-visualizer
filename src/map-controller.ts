import * as maplibregl from 'maplibre-gl';
import type { FlyToOptions, Map as MapLibreMap } from 'maplibre-gl';
import type { Scenario } from './scenarios';

let activeSetMinZoom: number | null = null;

export function createMap(containerId: string): MapLibreMap {
  return new maplibregl.Map({
    container: containerId,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [0, 0],
    zoom: 0,
  });
}

export function runScenario(
  map: MapLibreMap,
  scenario: Scenario,
  onZoomSample: (zoom: number, t: number) => void,
  onAnimationEnd: () => void,
): void {
  map.stop();

  // Clear any setMinZoom left by a previous scenario before starting the new one.
  if (activeSetMinZoom !== null) {
    map.setMinZoom(null);
    activeSetMinZoom = null;
  }

  map.jumpTo({ center: scenario.from.center, zoom: scenario.from.zoom });

  const startTime = Date.now();
  const moveHandler = () => onZoomSample(map.getZoom(), Date.now() - startTime);

  const endHandler = () => {
    map.off('move', moveHandler);
    // Restore unrestricted navigation after animation so UI controls work normally.
    if (scenario.minZoomSource.kind === 'set-min-zoom') {
      map.setMinZoom(null);
      activeSetMinZoom = null;
    }
    onAnimationEnd();
  };

  map.on('move', moveHandler);
  map.once('moveend', endHandler);

  const flyToOpts: FlyToOptions = {
    center: scenario.to.center,
    zoom: scenario.to.zoom,
    curve: scenario.curve,
    speed: scenario.speed,
    essential: true,
  };

  if (scenario.minZoomSource.kind === 'flyto-option') {
    flyToOpts.minZoom = scenario.minZoomSource.minZoom;
  } else if (scenario.minZoomSource.kind === 'set-min-zoom') {
    map.setMinZoom(scenario.minZoomSource.minZoom);
    activeSetMinZoom = scenario.minZoomSource.minZoom;
  }

  map.flyTo(flyToOpts);
}

export function applyProjection(
  map: MapLibreMap,
  projection: 'mercator' | 'globe',
): void {
  map.setProjection({ type: projection });
}
