import type * as maplibregl from 'maplibre-gl';
import type { FlyToOptions, Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { GlobalParams } from './params';

type MapLib = typeof maplibregl;

export function createMap(containerId: string, lib: MapLib, trajectoryColor = '#888888'): MapLibreMap {
  const map = new lib.Map({
    container: containerId,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [0, 0],
    zoom: 0,
  }) as MapLibreMap;

  map.once('load', () => {
    map.addSource('trajectory', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
    });
    map.addLayer({
      id: 'trajectory-line',
      type: 'line',
      source: 'trajectory',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': trajectoryColor, 'line-width': 2, 'line-opacity': 0.85 },
    });
  });

  return map;
}

export function runScenario(
  map: MapLibreMap,
  params: GlobalParams,
  onZoomSample: (zoom: number, t: number) => void,
  onAnimationEnd: () => void
): void {
  map.stop();
  map.setMinZoom(null);

  const fromZoom = params.from.zoom ?? map.getZoom();
  map.jumpTo({ center: params.from.center, zoom: fromZoom });
  // jumpTo is synchronous: map.getZoom() now equals fromZoom.
  // So `params.to.zoom ?? map.getZoom()` means "same zoom as from" when unset.
  const toZoom = params.to.zoom ?? map.getZoom();

  const trajSource = map.getSource('trajectory') as GeoJSONSource | undefined;
  const coords: [number, number][] = [];
  trajSource?.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });

  const startTime = Date.now();
  const moveHandler = () => {
    onZoomSample(map.getZoom(), Date.now() - startTime);
    const { lng, lat } = map.getCenter();
    coords.push([lng, lat]);
    trajSource?.setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    });
  };

  const endHandler = () => {
    map.off('move', moveHandler);
    map.setMinZoom(null);
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
  if (params.minZoom !== null && params.minZoom !== undefined) {
    flyToOpts.minZoom = params.minZoom;
  }

  if (params.mapMinZoom !== null && params.mapMinZoom !== undefined) {
    map.setMinZoom(params.mapMinZoom);
  }

  map.flyTo(flyToOpts);
}

export function applyProjection(map: MapLibreMap, projection: 'mercator' | 'globe'): void {
  map.setProjection({ type: projection });
}
