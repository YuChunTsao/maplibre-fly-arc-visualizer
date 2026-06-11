export type GlobalParams = {
  from:    { center: [number, number]; zoom: number | null };
  to:      { center: [number, number]; zoom: number | null };
  minZoom: number;
  curve:   number;
  speed:   number;
};

export const DEFAULT_PARAMS: GlobalParams = {
  from:    { center: [139.6917, 35.6895], zoom: 6 },
  to:      { center: [-0.1276,  51.5074], zoom: 6 },
  minZoom: 3,
  curve:   1.42,
  speed:   0.4,
};

export function cloneParams(p: GlobalParams): GlobalParams {
  return {
    from:    { center: [p.from.center[0], p.from.center[1]], zoom: p.from.zoom },
    to:      { center: [p.to.center[0],   p.to.center[1]],   zoom: p.to.zoom   },
    minZoom: p.minZoom,
    curve:   p.curve,
    speed:   p.speed,
  };
}
