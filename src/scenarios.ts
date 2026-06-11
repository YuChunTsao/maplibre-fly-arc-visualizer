export type MinZoomKind = 'none' | 'flyto-option' | 'set-min-zoom';

export type Scenario = {
  id:          number;
  label:       string;
  description: string;
  minZoomKind: MinZoomKind;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    label: '#1 No minZoom',
    description:
      'flyTo with no minZoom constraint. The arc zooms out freely — this is the reference shape.',
    minZoomKind: 'none',
  },
  {
    id: 2,
    label: '#2 flyTo option',
    description:
      'flyTo({ minZoom }). Ceiling triggered if the natural arc would zoom below minZoom — rho is clamped.',
    minZoomKind: 'flyto-option',
  },
  {
    id: 3,
    label: '#3 setMinZoom',
    description:
      'map.setMinZoom(minZoom), then flyTo. Same ceiling behaviour as #2 when triggered.',
    minZoomKind: 'set-min-zoom',
  },
];
