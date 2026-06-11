export type ZoomSample = { zoom: number; t: number };

const PAD = { top: 28, right: 20, bottom: 38, left: 48 };
const ZOOM_MIN = 0;
const ZOOM_MAX = 14;

export class ZoomChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private samples: ZoomSample[] = [];
  private minZoomLine: number | null = null;
  private recording = false;
  private observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.observer = new ResizeObserver(() => this.redraw());
    this.observer.observe(canvas);
    this.redraw();
  }

  startRecording(minZoomLine: number | null): void {
    this.samples = [];
    this.minZoomLine = minZoomLine;
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

    const maxT = this.samples.length > 0
      ? Math.max(...this.samples.map(s => s.t), 1000)
      : 5000;

    const toX = (t: number) => left + (t / maxT) * cW;
    const toY = (zoom: number) => top + (1 - (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * cH;

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

    // minZoom ceiling line
    if (this.minZoomLine !== null) {
      const y = toY(this.minZoomLine);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + cW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f97316';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`minZoom = ${this.minZoomLine}`, left + 4, y - 4);
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
