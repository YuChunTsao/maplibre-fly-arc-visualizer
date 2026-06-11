import type { Scenario } from './scenarios';
import type { GlobalParams } from './params';
import { cloneParams } from './params';

export type UICallbacks = {
  onScenarioSelect:  (id: number) => void;
  onProjectionToggle:(projection: 'mercator' | 'globe') => void;
  onParamsChange:    (params: GlobalParams) => void;
};

export type UIControls = {
  mapContainer:      HTMLElement;
  chartCanvas:       HTMLCanvasElement;
  setActiveScenario: (id: number) => void;
  setStatus:         (msg: string) => void;
  setUIProjection:   (p: 'mercator' | 'globe') => void;
  setAnimating:      (animating: boolean) => void;
};

export function buildUI(
  appEl: HTMLElement,
  scenarios: Scenario[],
  initialParams: GlobalParams,
  callbacks: UICallbacks,
): UIControls {
  const panel = el('div', 'panel');

  // Title
  const titleEl = el('h1', 'title');
  titleEl.textContent = 'flyTo Arc Visualizer';
  panel.appendChild(titleEl);

  // Projection toggle
  panel.appendChild(sectionLabel('Projection'));
  const projRow = el('div', 'proj-toggle');
  const projBtns = {} as Record<'mercator' | 'globe', HTMLButtonElement>;
  for (const p of ['mercator', 'globe'] as const) {
    const btn = document.createElement('button');
    btn.className = 'proj-btn' + (p === 'mercator' ? ' active' : '');
    btn.textContent = p.charAt(0).toUpperCase() + p.slice(1);
    btn.addEventListener('click', () => callbacks.onProjectionToggle(p));
    projBtns[p] = btn;
    projRow.appendChild(btn);
  }
  panel.appendChild(projRow);

  // Mutable params copy — mutated by input handlers
  const params: GlobalParams = cloneParams(initialParams);
  const notify = () => callbacks.onParamsChange(cloneParams(params));

  // From section
  // Note: MapLibre center is [lng, lat]; UI labels show Lat/Lng in natural order.
  panel.appendChild(sectionLabel('From'));
  const fromRow = el('div', 'coord-row');
  fromRow.appendChild(coordField('Lat', params.from.center[1], v => { params.from.center[1] = v; notify(); }));
  fromRow.appendChild(coordField('Lng', params.from.center[0], v => { params.from.center[0] = v; notify(); }));
  panel.appendChild(fromRow);
  panel.appendChild(optParamRow('Zoom', params.from.zoom, v => { params.from.zoom = v; notify(); }));

  // To section
  panel.appendChild(sectionLabel('To'));
  const toRow = el('div', 'coord-row');
  toRow.appendChild(coordField('Lat', params.to.center[1], v => { params.to.center[1] = v; notify(); }));
  toRow.appendChild(coordField('Lng', params.to.center[0], v => { params.to.center[0] = v; notify(); }));
  panel.appendChild(toRow);
  panel.appendChild(optParamRow('Zoom', params.to.zoom, v => { params.to.zoom = v; notify(); }));

  // Parameters section
  panel.appendChild(sectionLabel('Parameters'));
  panel.appendChild(paramRow('minZoom', params.minZoom, v => { params.minZoom = v; notify(); }));
  panel.appendChild(paramRow('curve',   params.curve,   v => { params.curve   = v; notify(); }));
  panel.appendChild(paramRow('speed',   params.speed,   v => { params.speed   = v; notify(); }));

  // Scenario buttons
  panel.appendChild(sectionLabel('Scenarios'));
  const scenList = el('div', 'scenario-list');
  const scenBtns: HTMLButtonElement[] = [];
  for (const s of scenarios) {
    const btn = document.createElement('button');
    btn.className = 'scenario-btn';
    btn.dataset.id = String(s.id);
    btn.textContent = s.label;
    btn.addEventListener('click', () => callbacks.onScenarioSelect(s.id));
    scenBtns.push(btn);
    scenList.appendChild(btn);
  }
  panel.appendChild(scenList);

  // Description
  panel.appendChild(sectionLabel('Description'));
  const descEl = el('p', 'description');
  descEl.textContent = scenarios[0]?.description ?? '';
  panel.appendChild(descEl);

  // Status
  const statusEl = el('div', 'status');
  statusEl.textContent = 'Ready';
  panel.appendChild(statusEl);

  // Right column
  const right = el('div', 'right');
  const mapContainer = el('div', 'map-container');
  mapContainer.id = 'map';
  const chartCanvas = document.createElement('canvas');
  chartCanvas.className = 'chart-canvas';
  right.appendChild(mapContainer);
  right.appendChild(chartCanvas);

  appEl.appendChild(panel);
  appEl.appendChild(right);

  return {
    mapContainer,
    chartCanvas,
    setActiveScenario(id) {
      for (const btn of scenBtns) {
        btn.classList.toggle('active', btn.dataset.id === String(id));
      }
      const scenario = scenarios.find(s => s.id === id);
      if (scenario) descEl.textContent = scenario.description;
    },
    setStatus(msg) { statusEl.textContent = msg; },
    setUIProjection(p) {
      for (const [key, btn] of Object.entries(projBtns) as ['mercator' | 'globe', HTMLButtonElement][]) {
        btn.classList.toggle('active', key === p);
      }
    },
    setAnimating(animating) {
      for (const btn of scenBtns) btn.disabled = animating;
      for (const btn of Object.values(projBtns)) (btn as HTMLButtonElement).disabled = animating;
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function sectionLabel(text: string): HTMLElement {
  const e = el('div', 'section-label');
  e.textContent = text;
  return e;
}

/** Compact label+input for Lat/Lng (two fit side-by-side in .coord-row). */
function coordField(label: string, initial: number, onChange: (v: number) => void): HTMLElement {
  const wrap = el('div', 'coord-field');
  const lbl = el('span', 'coord-label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'coord-input';
  input.value = String(initial);
  input.step = 'any';
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) onChange(v);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

/** Full-width label+input for a required number (minZoom, curve, speed). */
function paramRow(label: string, initial: number, onChange: (v: number) => void): HTMLElement {
  const wrap = el('div', 'param-row');
  const lbl = el('span', 'param-label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'param-input';
  input.value = String(initial);
  input.step = 'any';
  input.addEventListener('change', () => {
    const v = parseFloat(input.value);
    if (!isNaN(v)) onChange(v);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}

/** Full-width label+input for an optional number (zoom). Empty string → null. */
function optParamRow(label: string, initial: number | null, onChange: (v: number | null) => void): HTMLElement {
  const wrap = el('div', 'param-row');
  const lbl = el('span', 'param-label');
  lbl.textContent = label;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'param-input';
  input.placeholder = 'auto';
  input.step = 'any';
  if (initial !== null) input.value = String(initial);
  input.addEventListener('change', () => {
    const raw = input.value.trim();
    if (raw === '') { onChange(null); return; }
    const v = parseFloat(raw);
    if (!isNaN(v)) onChange(v);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}
