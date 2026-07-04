import type { GlobalParams } from './params';

export type UrlState = {
  params: GlobalParams;
  mode: 'playground' | 'compare';
  projection: 'mercator' | 'globe';
};

export function loadFromHash(): UrlState | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    const p = new URLSearchParams(hash);
    const mode = p.get('mode');
    if (mode !== 'playground' && mode !== 'compare') return null;
    const proj = p.get('proj');
    if (proj !== 'mercator' && proj !== 'globe') return null;
    const fromLng = req(p, 'fromLng');
    const fromLat = req(p, 'fromLat');
    const toLng = req(p, 'toLng');
    const toLat = req(p, 'toLat');
    const curve = req(p, 'curve');
    const speed = req(p, 'speed');
    return {
      params: {
        from: { center: [fromLng, fromLat], zoom: opt(p, 'fromZoom') },
        to: { center: [toLng, toLat], zoom: opt(p, 'toZoom') },
        mapMinZoom: opt(p, 'mapMinZoom'),
        minZoom: opt(p, 'minZoom'),
        maxDuration: opt(p, 'maxDuration'),
        duration: opt(p, 'duration'),
        curve,
        speed,
      },
      mode,
      projection: proj,
    };
  } catch {
    return null;
  }
}

export function saveToHash(
  params: GlobalParams,
  mode: 'playground' | 'compare',
  projection: 'mercator' | 'globe'
): void {
  const p = new URLSearchParams();
  p.set('mode', mode);
  p.set('proj', projection);
  p.set('fromLng', String(params.from.center[0]));
  p.set('fromLat', String(params.from.center[1]));
  if (params.from.zoom !== null) p.set('fromZoom', String(params.from.zoom));
  p.set('toLng', String(params.to.center[0]));
  p.set('toLat', String(params.to.center[1]));
  if (params.to.zoom !== null) p.set('toZoom', String(params.to.zoom));
  if (params.mapMinZoom !== null) p.set('mapMinZoom', String(params.mapMinZoom));
  if (params.minZoom !== null) p.set('minZoom', String(params.minZoom));
  if (params.maxDuration !== null) p.set('maxDuration', String(params.maxDuration));
  if (params.duration !== null) p.set('duration', String(params.duration));
  p.set('curve', String(params.curve));
  p.set('speed', String(params.speed));
  history.replaceState(null, '', '#' + p.toString());
}

function req(p: URLSearchParams, key: string): number {
  const raw = p.get(key);
  if (raw === null) throw new Error(`missing ${key}`);
  const v = parseFloat(raw);
  if (isNaN(v)) throw new Error(`invalid ${key}`);
  return v;
}

function opt(p: URLSearchParams, key: string): number | null {
  const raw = p.get(key);
  if (raw === null) return null;
  const v = parseFloat(raw);
  if (isNaN(v)) throw new Error(`invalid ${key}`);
  return v;
}
