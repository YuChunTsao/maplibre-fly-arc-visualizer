import * as maplibregl from 'maplibre-gl';
import type { FlyToOptions, Map as MapLibreMap } from 'maplibre-gl';
import type { Scenario } from './scenarios';
import type { GlobalParams } from './params';

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
  params: GlobalParams,
  onZoomSample: (zoom: number, t: number) => void,
  onAnimationEnd: () => void
): void {
  map.stop();

  if (activeSetMinZoom !== null) {
    map.setMinZoom(null);
    activeSetMinZoom = null;
  }

  const fromZoom = params.from.zoom ?? map.getZoom();
  map.jumpTo({ center: params.from.center, zoom: fromZoom });
  // jumpTo is synchronous: map.getZoom() now equals fromZoom.
  // So `params.to.zoom ?? map.getZoom()` means "same zoom as from" when unset.
  const toZoom = params.to.zoom ?? map.getZoom();

  const startTime = Date.now();
  const moveHandler = () => onZoomSample(map.getZoom(), Date.now() - startTime);

  const endHandler = () => {
    map.off('move', moveHandler);
    if (scenario.minZoomKind === 'set-min-zoom') {
      map.setMinZoom(null);
      activeSetMinZoom = null;
    }
    onAnimationEnd();
  };

  map.on('move', moveHandler);
  map.once('moveend', endHandler);

  const flyToOpts: FlyToOptions = {
    center: params.to.center,
    zoom: toZoom,
    curve: params.curve,
    speed: params.speed,
    essential: true,
  };

  if (scenario.minZoomKind === 'flyto-option') {
    flyToOpts.minZoom = params.minZoom;
  } else if (scenario.minZoomKind === 'set-min-zoom') {
    map.setMinZoom(params.minZoom);
    activeSetMinZoom = params.minZoom;
  }

  map.flyTo(flyToOpts);
}

export function applyProjection(map: MapLibreMap, projection: 'mercator' | 'globe'): void {
  map.setProjection({ type: projection });
}
