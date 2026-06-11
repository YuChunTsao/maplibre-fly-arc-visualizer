export type ZoomSample = { zoom: number; t: number };

const PAD = { top: 28, right: 20, bottom: 38, left: 48 };
const ZOOM_MIN = 0;
const ZOOM_MAX = 14;

export class ZoomChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private samples: ZoomSample[] = [];
  private minZoomMarkers: Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }> = [];
  private recording = false;
  private observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.redraw());
    this.observer.observe(canvas);
    this.redraw();
  }

  startRecording(minZoom: number | null | { value: number | null; kind: 'flyto' | 'map' | 'none' } | Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }>): void {
    this.samples = [];
    // normalize legacy inputs to array of markers for compatibility
    if (minZoom === null) {
      this.minZoomMarkers = [];
    } else if (typeof minZoom === 'number') {
      this.minZoomMarkers = [{ value: minZoom, kind: 'map' }];
    } else if (Array.isArray(minZoom)) {
      this.minZoomMarkers = minZoom;
    } else {
      this.minZoomMarkers = [minZoom];
    }
    this.recording = true;
    this.redraw();
  }

  addSample(zoom: number, t: number): void {
    if (!this.recording) return;
    this.samples.push({ zoom, t });
    this.redraw();
  }

  stopRecording(): void {
    this.recording = false;
    this.redraw();
  }

  private syncSize(): { W: number; H: number } {
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return { W, H };
  }

  private redraw(): void {
    const { W, H } = this.syncSize();
    const ctx = this.ctx;
    const { top, right, bottom, left } = PAD;
    const cW = W - left - right;
    const cH = H - top - bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    if (cW <= 0 || cH <= 0) return;

    const maxT = this.samples.length > 0 ? Math.max(...this.samples.map((s) => s.t), 1000) : 5000;

    const toX = (t: number) => left + (t / maxT) * cW;
    const toY = (zoom: number) => top + (1 - (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * cH;

    const tickInterval =
      maxT <= 3000 ? 500 : maxT <= 8000 ? 1000 : maxT <= 20000 ? 2000 : maxT <= 60000 ? 5000 : 10000;

    // Grid and axes
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let z = ZOOM_MIN; z <= ZOOM_MAX; z += 2) {
      const y = toY(z);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + cW, y);
      ctx.stroke();
    }
    for (let t = tickInterval; t <= maxT; t += tickInterval) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + cH);
      ctx.stroke();
    }

    ctx.strokeStyle = '#30363d';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + cH);
    ctx.lineTo(left + cW, top + cH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#6e7681';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let z = ZOOM_MIN; z <= ZOOM_MAX; z += 2) {
      ctx.fillText(String(z), left - 6, toY(z));
    }

    // X-axis tick marks and labels
    const axisBottom = top + cH;
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#6e7681';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let t = tickInterval; t <= maxT; t += tickInterval) {
      const x = toX(t);
      ctx.beginPath();
      ctx.moveTo(x, axisBottom);
      ctx.lineTo(x, axisBottom + 4);
      ctx.stroke();
      const seconds = t / 1000;
      ctx.fillText(Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`, x, axisBottom + 6);
    }

    // Axis titles
    ctx.fillStyle = '#6e7681';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('time (ms)', left + cW / 2, H - 6);

    ctx.save();
    ctx.translate(12, top + cH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('zoom', 0, 0);
    ctx.restore();

    // minZoom ceiling lines (support multiple markers — map and/or flyto)
    if (this.minZoomMarkers && this.minZoomMarkers.length > 0) {
      const mapColor = '#f97316'; // orange
      const flytoColor = '#60a5fa'; // blue
      let defaultLabelOffset = 0;
      for (let i = 0; i < this.minZoomMarkers.length; i++) {
        const marker = this.minZoomMarkers[i];
        const labelPrefix = marker.kind === 'flyto' ? 'flyTo minZoom' : 'map minZoom';
        const color = marker.kind === 'flyto' ? flytoColor : mapColor;
        if (marker.value !== null) {
          const y = toY(marker.value);
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(left, y);
          ctx.lineTo(left + cW, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = color;
          ctx.font = '10px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(`${labelPrefix} = ${marker.value}`, left + 4, y - 4);
        } else {
          // value === null → user uses default; show label stacked at top
          ctx.fillStyle = color;
          ctx.font = '10px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          const y = top + 12 + defaultLabelOffset;
          ctx.fillText(`${labelPrefix} = default`, left + 4, y);
          defaultLabelOffset += 14; // stack subsequent default labels
        }
      }
    }

    // Zoom curve
    if (this.samples.length >= 2) {
      ctx.strokeStyle = this.recording ? '#60a5fa' : '#34d399';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toX(this.samples[0].t), toY(this.samples[0].zoom));
      for (let i = 1; i < this.samples.length; i++) {
        ctx.lineTo(toX(this.samples[i].t), toY(this.samples[i].zoom));
      }
      ctx.stroke();
    }

    // Status badge
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    if (this.recording) {
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('● recording', W - right, top - 8);
    } else if (this.samples.length > 0) {
      ctx.fillStyle = '#34d399';
      ctx.fillText('✓ complete', W - right, top - 8);
    }
  }
}
