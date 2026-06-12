import type { GlobalParams } from './params';
import { cloneParams } from './params';

export type UICallbacks = {
  onRun: () => void;
  onProjectionToggle: (projection: 'mercator' | 'globe') => void;
  onParamsChange: (params: GlobalParams) => void;
  onMapMinZoomLock: (active: boolean) => void;
  onModeChange: (mode: 'playground' | 'compare') => void;
};

export type UIControls = {
  mapContainerA: string; // id="map-a"
  mapContainerB: string; // id="map-b"
  chartCanvas: HTMLCanvasElement;
  setStatus: (msg: string) => void;
  setUIProjection: (p: 'mercator' | 'globe') => void;
  setAnimating: (animating: boolean) => void;
  setCodeOutput: (code: string) => void;
  setMode: (mode: 'playground' | 'compare') => void;
};

export function buildUI(
  appEl: HTMLElement,
  initialParams: GlobalParams,
  callbacks: UICallbacks
): UIControls {
  const panel = el('div', 'panel');

  // Title
  const titleEl = el('h1', 'title');
  titleEl.textContent = 'flyTo Arc Visualizer';
  panel.appendChild(titleEl);

  // Mode toggle
  let currentMode: 'playground' | 'compare' = 'playground';
  const modeBtn = document.createElement('button');
  modeBtn.className = 'mode-toggle-btn';
  modeBtn.textContent = 'Compare Mode →';
  modeBtn.addEventListener('click', () => {
    const newMode = currentMode === 'playground' ? 'compare' : 'playground';
    callbacks.onModeChange(newMode);
  });
  panel.appendChild(modeBtn);

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
  fromRow.appendChild(
    coordField('Lat', params.from.center[1], (v) => {
      params.from.center[1] = v;
      notify();
    })
  );
  fromRow.appendChild(
    coordField('Lng', params.from.center[0], (v) => {
      params.from.center[0] = v;
      notify();
    })
  );
  panel.appendChild(fromRow);
  panel.appendChild(
    optParamRow('Zoom', params.from.zoom, (v) => {
      params.from.zoom = v;
      notify();
    })
  );

  // To section
  panel.appendChild(sectionLabel('To'));
  const toRow = el('div', 'coord-row');
  toRow.appendChild(
    coordField('Lat', params.to.center[1], (v) => {
      params.to.center[1] = v;
      notify();
    })
  );
  toRow.appendChild(
    coordField('Lng', params.to.center[0], (v) => {
      params.to.center[0] = v;
      notify();
    })
  );
  panel.appendChild(toRow);
  panel.appendChild(
    optParamRow('Zoom', params.to.zoom, (v) => {
      params.to.zoom = v;
      notify();
    })
  );

  // Parameters section
  panel.appendChild(sectionLabel('Parameters'));
  // Independent minZooms (optional) — if null, use application/map default
  {
    const row = el('div', 'param-row');
    const lbl = el('span', 'param-label');
    const lblText = document.createTextNode('mapMinZoom');
    const hint = el('span', 'param-hint');
    hint.textContent = ' (via map.setMinZoom())';
    lbl.appendChild(lblText);
    lbl.appendChild(hint);
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'param-input';
    input.placeholder = 'auto';
    input.step = 'any';
    if (params.mapMinZoom !== null) input.value = String(params.mapMinZoom);
    input.addEventListener('change', () => {
      const raw = input.value.trim();
      params.mapMinZoom = raw === '' ? null : (isNaN(parseFloat(raw)) ? null : parseFloat(raw));
      notify();
    });
    row.appendChild(lbl);
    row.appendChild(input);
    panel.appendChild(row);
  }
  panel.appendChild(
    optParamRow('minZoom', params.minZoom, (v) => {
      params.minZoom = v;
      notify();
    })
  );
  panel.appendChild(
    paramRow('curve', params.curve, (v) => {
      params.curve = v;
      notify();
    })
  );
  panel.appendChild(
    paramRow('speed', params.speed, (v) => {
      params.speed = v;
      notify();
    })
  );

  const applyRow = el('div', 'apply-min-zoom-row');
  const applyCheck = document.createElement('input');
  applyCheck.type = 'checkbox';
  applyCheck.id = 'apply-min-zoom-check';
  applyCheck.checked = false;
  applyCheck.addEventListener('change', () => {
    callbacks.onMapMinZoomLock(applyCheck.checked);
  });
  const applyLabel = document.createElement('label');
  applyLabel.htmlFor = 'apply-min-zoom-check';
  applyLabel.textContent = 'apply mapMinZoom to map';
  applyRow.appendChild(applyCheck);
  applyRow.appendChild(applyLabel);
  panel.appendChild(applyRow);

  // Run button
  panel.appendChild(sectionLabel('Run'));
  const runRow = el('div', 'run-row');
  const runBtn = document.createElement('button');
  runBtn.className = 'run-btn';
  runBtn.textContent = 'Run';
  runBtn.addEventListener('click', () => callbacks.onRun());
  runRow.appendChild(runBtn);
  panel.appendChild(runRow);

  // Description
  panel.appendChild(sectionLabel('Description'));
  const descEl = el('p', 'description');
  descEl.textContent = 'Trigger flyTo using current parameters.';
  panel.appendChild(descEl);

  // Status
  const statusEl = el('div', 'status');
  statusEl.textContent = 'Ready';
  panel.appendChild(statusEl);

  // Right column
  const right = el('div', 'right');

  // Maps with labels
  const mapsContainer = el('div', 'maps-container');

  const mapAWrapper = el('div', 'map-wrapper');
  const mapALabel = el('div', 'map-label');
  mapALabel.textContent = 'official';
  const mapContainerA = el('div', 'map-container');
  mapContainerA.id = 'map-a';
  mapAWrapper.appendChild(mapALabel);
  mapAWrapper.appendChild(mapContainerA);
  mapsContainer.appendChild(mapAWrapper);

  const mapBWrapper = el('div', 'map-wrapper');
  mapBWrapper.style.display = 'none'; // hidden in playground mode by default
  const mapBLabel = el('div', 'map-label');
  mapBLabel.textContent = 'B · dev';
  const mapContainerB = el('div', 'map-container');
  mapContainerB.id = 'map-b';
  mapBWrapper.appendChild(mapBLabel);
  mapBWrapper.appendChild(mapContainerB);
  mapsContainer.appendChild(mapBWrapper);

  right.appendChild(mapsContainer);

  const chartCanvas = document.createElement('canvas');
  chartCanvas.className = 'chart-canvas';
  right.appendChild(chartCanvas);

  // Code output section (playground mode only)
  const codeOutputSection = el('div', 'code-output-section');
  const codeHeader = el('div', 'code-output-header');
  const codeTitleSpan = el('span', 'code-output-title');
  codeTitleSpan.textContent = 'flyTo Code';
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeEl.textContent ?? '').then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
    });
  });
  codeHeader.appendChild(codeTitleSpan);
  codeHeader.appendChild(copyBtn);
  const codeEl = document.createElement('pre');
  codeEl.className = 'code-output';
  codeEl.textContent = '// Run animation to generate code';
  codeOutputSection.appendChild(codeHeader);
  codeOutputSection.appendChild(codeEl);
  right.appendChild(codeOutputSection);

  appEl.appendChild(panel);
  appEl.appendChild(right);

  return {
    mapContainerA: 'map-a',
    mapContainerB: 'map-b',
    chartCanvas,
    setStatus(msg) {
      statusEl.textContent = msg;
    },
    setUIProjection(p) {
      for (const [key, btn] of Object.entries(projBtns) as [
        'mercator' | 'globe',
        HTMLButtonElement
      ][]) {
        btn.classList.toggle('active', key === p);
      }
    },
    setAnimating(animating) {
      runBtn.disabled = animating;
      for (const btn of Object.values(projBtns)) (btn as HTMLButtonElement).disabled = animating;
    },
    setCodeOutput(code) {
      codeEl.textContent = code;
    },
    setMode(mode) {
      currentMode = mode;
      modeBtn.textContent = mode === 'playground' ? 'Compare Mode →' : '← Playground';
      mapBWrapper.style.display = mode === 'compare' ? '' : 'none';
      mapALabel.textContent = mode === 'compare' ? 'A · official' : 'official';
      codeOutputSection.style.display = mode === 'playground' ? '' : 'none';
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
function optParamRow(
  label: string,
  initial: number | null,
  onChange: (v: number | null) => void
): HTMLElement {
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
    if (raw === '') {
      onChange(null);
      return;
    }
    const v = parseFloat(raw);
    if (!isNaN(v)) onChange(v);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  return wrap;
}
