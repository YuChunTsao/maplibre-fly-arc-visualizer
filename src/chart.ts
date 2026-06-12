export type ZoomSample = { zoom: number; t: number; series?: 'a' | 'b' };

const PAD = { top: 28, right: 20, bottom: 38, left: 48 };
const ZOOM_MIN = 0;
const ZOOM_MAX = 14;

export class ZoomChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private samplesA: ZoomSample[] = [];
  private samplesB: ZoomSample[] = [];
  private recordingA = false;
  private recordingB = false;
  private minZoomMarkers: Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }> = [];
  private observer: ResizeObserver;
  private singleSeries = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.redraw());
    this.observer.observe(canvas);
    this.redraw();
  }

  startRecording(minZoom: number | null | { value: number | null; kind: 'flyto' | 'map' | 'none' } | Array<{ value: number | null; kind: 'flyto' | 'map' | 'none' }>): void {
    this.samplesA = [];
    this.samplesB = [];
    this.recordingA = true;
    this.recordingB = true;
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
    this.redraw();
  }

  addSample(zoom: number, t: number, series: 'a' | 'b' = 'a'): void {
    if (series === 'a' && !this.recordingA) return;
    if (series === 'b' && !this.recordingB) return;
    if (series === 'a') {
      this.samplesA.push({ zoom, t, series: 'a' });
    } else {
      this.samplesB.push({ zoom, t, series: 'b' });
    }
    this.redraw();
  }

  setSingleSeriesMode(enabled: boolean): void {
    this.singleSeries = enabled;
    this.redraw();
  }

  stopRecording(): void {
    this.recordingA = false;
    this.recordingB = false;
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    if (cW <= 0 || cH <= 0) return;

    const allSamples = [...this.samplesA, ...this.samplesB];
    const maxT = allSamples.length > 0 ? Math.max(...allSamples.map((s) => s.t), 1000) : 5000;

    const toX = (t: number) => left + (t / maxT) * cW;
    const toY = (zoom: number) => top + (1 - (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * cH;

    const tickInterval =
      maxT <= 3000 ? 500 : maxT <= 8000 ? 1000 : maxT <= 20000 ? 2000 : maxT <= 60000 ? 5000 : 10000;

    // Grid and axes
    ctx.strokeStyle = '#e2e8f0';
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

    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + cH);
    ctx.lineTo(left + cW, top + cH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let z = ZOOM_MIN; z <= ZOOM_MAX; z += 2) {
      ctx.fillText(String(z), left - 6, toY(z));
    }

    // X-axis tick marks and labels
    const axisBottom = top + cH;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
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
    ctx.fillStyle = '#94a3b8';
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
          ctx.font = '11px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(`${labelPrefix} = ${marker.value}`, left + 4, y - 4);
        } else {
          // value === null → user uses default; show label stacked at top
          ctx.fillStyle = color;
          ctx.font = '11px system-ui';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          const y = top + 12 + defaultLabelOffset;
          ctx.fillText(`${labelPrefix} = default`, left + 4, y);
          defaultLabelOffset += 14; // stack subsequent default labels
        }
      }
    }

    // Zoom curves
    const colorA = '#60a5fa'; // blue (official)
    const colorB = '#f97316'; // orange (dev)

    // Series A
    if (this.samplesA.length >= 2) {
      ctx.strokeStyle = colorA;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toX(this.samplesA[0].t), toY(this.samplesA[0].zoom));
      for (let i = 1; i < this.samplesA.length; i++) {
        ctx.lineTo(toX(this.samplesA[i].t), toY(this.samplesA[i].zoom));
      }
      ctx.stroke();
    }

    // Series B
    if (this.samplesB.length >= 2) {
      ctx.strokeStyle = colorB;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(toX(this.samplesB[0].t), toY(this.samplesB[0].zoom));
      for (let i = 1; i < this.samplesB.length; i++) {
        ctx.lineTo(toX(this.samplesB[i].t), toY(this.samplesB[i].zoom));
      }
      ctx.stroke();
    }

    // Legend
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const legendX = W - right - 80;
    const legendY = top + 8;
    ctx.fillStyle = colorA;
    ctx.fillText('●', legendX, legendY);
    ctx.fillStyle = '#64748b';
    ctx.fillText(this.singleSeries ? 'official' : 'A · official', legendX + 8, legendY);
    if (!this.singleSeries) {
      ctx.fillStyle = colorB;
      ctx.fillText('●', legendX, legendY + 14);
      ctx.fillStyle = '#64748b';
      ctx.fillText('B · dev', legendX + 8, legendY + 14);
    }

    // Status badge
    ctx.font = '12px system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const isRecording = this.recordingA || this.recordingB;
    const hasData = this.samplesA.length > 0 || this.samplesB.length > 0;
    if (isRecording) {
      ctx.fillStyle = '#2563eb';
      ctx.fillText('● recording', W - right, top - 8);
    } else if (hasData) {
      ctx.fillStyle = '#16a34a';
      ctx.fillText('✓ complete', W - right, top - 8);
    }
  }
}
