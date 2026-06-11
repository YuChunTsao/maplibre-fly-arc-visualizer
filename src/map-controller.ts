import type * as maplibregl from 'maplibre-gl';
import type { FlyToOptions, Map as MapLibreMap } from 'maplibre-gl';
import type { GlobalParams } from './params';

type MapLib = typeof maplibregl;

let activeSetMinZoom: number | null = null;

export function createMap(containerId: string, lib: MapLib): MapLibreMap {
  return new lib.Map({
    container: containerId,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [0, 0],
    zoom: 0,
  }) as MapLibreMap;
}

export function runScenario(
  map: MapLibreMap,
  params: GlobalParams,
  onZoomSample: (zoom: number, t: number) => void,
  onAnimationEnd: () => void
): void {
  map.stop();

  // Clear any previously set minZoom
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
    // If we set a map minZoom for this run, clear it now.
    if (activeSetMinZoom !== null) {
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

  // Apply user-selected options independently: flyTo minZoom and/or map minZoom.
  if (params.flyToMinZoom !== null && params.flyToMinZoom !== undefined) {
    flyToOpts.minZoom = params.flyToMinZoom;
  }

  if (params.mapMinZoom !== null && params.mapMinZoom !== undefined) {
    const effective = params.mapMinZoom;
    map.setMinZoom(effective);
    activeSetMinZoom = effective;
  }

  map.flyTo(flyToOpts);
}

export function applyProjection(map: MapLibreMap, projection: 'mercator' | 'globe'): void {
  map.setProjection({ type: projection });
}
