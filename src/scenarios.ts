export type MinZoomSource =
  | { kind: 'none' }
  | { kind: 'flyto-option'; minZoom: number }
  | { kind: 'set-min-zoom'; minZoom: number };

export type Scenario = {
  id: number;
  label: string;
  description: string;
  minZoomSource: MinZoomSource;
  ceilingTriggered: boolean;
  from: { center: [number, number]; zoom: number };
  to: { center: [number, number]; zoom: number };
  curve: number;
  speed: number;
};

const TOKYO: [number, number] = [139.6917, 35.6895];
const LONDON: [number, number] = [-0.1276, 51.5074];
const KYOTO: [number, number] = [135.7681, 35.0116];

const MIN_ZOOM = 3;
const DEFAULT_CURVE = 1.42;
const SHALLOW_CURVE = 0.5;

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    label: '#1 Baseline',
    description:
      'No minZoom. Default curve (1.42). Long flight (Tokyo → London). ' +
      'The arc zooms out freely — this is the reference shape.',
    minZoomSource: { kind: 'none' },
    ceilingTriggered: false,
    from: { center: TOKYO, zoom: 6 },
    to: { center: LONDON, zoom: 6 },
    curve: DEFAULT_CURVE,
    speed: 0.4,
  },
  {
    id: 2,
    label: '#2 flyTo + ceiling',
    description:
      `flyTo({ minZoom: ${MIN_ZOOM} }). Default curve (1.42). Long flight. ` +
      `Ceiling triggered — the natural arc would zoom below ${MIN_ZOOM}, so rho is clamped.`,
    minZoomSource: { kind: 'flyto-option', minZoom: MIN_ZOOM },
    ceilingTriggered: true,
    from: { center: TOKYO, zoom: 6 },
    to: { center: LONDON, zoom: 6 },
    curve: DEFAULT_CURVE,
    speed: 0.4,
  },
  {
    id: 3,
    label: '#3 flyTo + no ceiling',
    description:
      `flyTo({ minZoom: ${MIN_ZOOM} }). Default curve (1.42). Short flight (Tokyo → Kyoto). ` +
      `Ceiling not triggered — natural arc stays above ${MIN_ZOOM}, curve is fully preserved.`,
    minZoomSource: { kind: 'flyto-option', minZoom: MIN_ZOOM },
    ceilingTriggered: false,
    from: { center: TOKYO, zoom: 10 },
    to: { center: KYOTO, zoom: 10 },
    curve: DEFAULT_CURVE,
    speed: 0.8,
  },
  {
    id: 4,
    label: '#4 flyTo + shallow + ceiling',
    description:
      `flyTo({ minZoom: ${MIN_ZOOM}, curve: ${SHALLOW_CURVE} }). Long flight. ` +
      `Shallow curve but ceiling still triggered — rho clamped to respect minZoom.`,
    minZoomSource: { kind: 'flyto-option', minZoom: MIN_ZOOM },
    ceilingTriggered: true,
    from: { center: TOKYO, zoom: 6 },
    to: { center: LONDON, zoom: 6 },
    curve: SHALLOW_CURVE,
    speed: 0.4,
  },
  {
    id: 5,
    label: '#5 flyTo + shallow + no ceiling',
    description:
      `flyTo({ minZoom: ${MIN_ZOOM}, curve: ${SHALLOW_CURVE} }). Short flight. ` +
      `Shallow curve, ceiling not triggered — user's curve: ${SHALLOW_CURVE} is fully preserved.`,
    minZoomSource: { kind: 'flyto-option', minZoom: MIN_ZOOM },
    ceilingTriggered: false,
    from: { center: TOKYO, zoom: 10 },
    to: { center: KYOTO, zoom: 10 },
    curve: SHALLOW_CURVE,
    speed: 0.8,
  },
  {
    id: 6,
    label: '#6 setMinZoom + ceiling',
    description:
      `map.setMinZoom(${MIN_ZOOM}), then flyTo. Default curve (1.42). Long flight. ` +
      `Ceiling triggered — arc should be identical to #2 (same code path outcome).`,
    minZoomSource: { kind: 'set-min-zoom', minZoom: MIN_ZOOM },
    ceilingTriggered: true,
    from: { center: TOKYO, zoom: 6 },
    to: { center: LONDON, zoom: 6 },
    curve: DEFAULT_CURVE,
    speed: 0.4,
  },
  {
    id: 7,
    label: '#7 setMinZoom + no ceiling',
    description:
      `map.setMinZoom(${MIN_ZOOM}), then flyTo. Default curve (1.42). Short flight. ` +
      `Ceiling not triggered — should be identical to #3.`,
    minZoomSource: { kind: 'set-min-zoom', minZoom: MIN_ZOOM },
    ceilingTriggered: false,
    from: { center: TOKYO, zoom: 10 },
    to: { center: KYOTO, zoom: 10 },
    curve: DEFAULT_CURVE,
    speed: 0.8,
  },
  {
    id: 8,
    label: '#8 setMinZoom + shallow + ceiling',
    description:
      `map.setMinZoom(${MIN_ZOOM}), then flyTo({ curve: ${SHALLOW_CURVE} }). Long flight. ` +
      `Ceiling triggered — should match #4.`,
    minZoomSource: { kind: 'set-min-zoom', minZoom: MIN_ZOOM },
    ceilingTriggered: true,
    from: { center: TOKYO, zoom: 6 },
    to: { center: LONDON, zoom: 6 },
    curve: SHALLOW_CURVE,
    speed: 0.4,
  },
];
