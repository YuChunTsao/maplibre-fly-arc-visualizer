import type { Scenario } from './scenarios';

export type UICallbacks = {
  onScenarioSelect: (id: number) => void;
  onProjectionToggle: (projection: 'mercator' | 'globe') => void;
};

export type UIControls = {
  mapContainer: HTMLElement;
  chartCanvas: HTMLCanvasElement;
  setActiveScenario: (id: number) => void;
  setStatus: (msg: string) => void;
  setUIProjection: (p: 'mercator' | 'globe') => void;
  setAnimating: (animating: boolean) => void;
};

export function buildUI(
  appEl: HTMLElement,
  scenarios: Scenario[],
  callbacks: UICallbacks,
): UIControls {
  const panel = el('div', 'panel');

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
    setStatus(msg) {
      statusEl.textContent = msg;
    },
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
