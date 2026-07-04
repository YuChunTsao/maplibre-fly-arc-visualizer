export type GlobalParams = {
  from: { center: [number, number]; zoom: number | null };
  to: { center: [number, number]; zoom: number | null };
  // Independent optional settings. If null → use application/map default behavior.
  mapMinZoom: number | null;
  minZoom: number | null;
  maxDuration: number | null;
  duration: number | null;
  curve: number;
  speed: number;
};

export const DEFAULT_PARAMS: GlobalParams = {
  from: { center: [139.6917, 35.6895], zoom: 10 },
  to: { center: [-0.1276, 51.5074], zoom: 10 },
  mapMinZoom: null,
  minZoom: null,
  maxDuration: null,
  duration: null,
  curve: 1.42,
  speed: 1.2,
};

export function cloneParams(p: GlobalParams): GlobalParams {
  return {
    from: { center: [p.from.center[0], p.from.center[1]], zoom: p.from.zoom },
    to: { center: [p.to.center[0], p.to.center[1]], zoom: p.to.zoom },
    mapMinZoom: p.mapMinZoom,
    minZoom: p.minZoom,
    maxDuration: p.maxDuration,
    duration: p.duration,
    curve: p.curve,
    speed: p.speed,
  };
}
