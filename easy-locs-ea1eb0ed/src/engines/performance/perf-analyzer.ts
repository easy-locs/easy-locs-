import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface PerfSnapshot {
  timestamp: number;
  heapUsed: number;
  domNodes: number;
  longTasks: number;
  resourceCount: number;
  fps: number;
}

export class PerfAnalyzer extends BaseEngine {
  private snapshots: PerfSnapshot[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private currentFps = 60;
  private rafId: number | null = null;

  constructor() {
    super({
      id: "perf-analyzer",
      name: "Performance Analyzer",
      category: "performance",
      intervalMs: 30_000,
    });
  }

  start(): void {
    super.start();
    this.startFPSMonitor();
  }

  stop(): void {
    super.stop();
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private startFPSMonitor(): void {
    this.lastFrameTime = performance.now();
    const measure = (now: number) => {
      this.frameCount++;
      if (now - this.lastFrameTime >= 1000) {
        this.currentFps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }
      if (this.isRunning) this.rafId = requestAnimationFrame(measure);
    };
    this.rafId = requestAnimationFrame(measure);
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const mem = (performance as any).memory;
    const heapUsed = mem ? mem.usedJSHeapSize : 0;
    const domNodes = document.querySelectorAll("*").length;
    const resources = performance.getEntriesByType("resource").length;

    let longTasks = 0;
    try {
      const entries = performance.getEntriesByType("longtask");
      longTasks = entries.filter((e: any) => e.startTime > performance.now() - this.intervalMs).length;
    } catch {}

    const snapshot: PerfSnapshot = {
      timestamp: Date.now(),
      heapUsed,
      domNodes,
      longTasks,
      resourceCount: resources,
      fps: this.currentFps,
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 120) this.snapshots = this.snapshots.slice(-120);

    if (this.currentFps < 30) findings.push(`Low FPS: ${this.currentFps}`);
    if (domNodes > 5000) findings.push(`DOM bloat: ${domNodes} nodes`);
    if (longTasks > 5) findings.push(`${longTasks} long tasks (>50ms) in last cycle`);
    if (heapUsed > 200 * 1048576) findings.push(`High heap: ${Math.round(heapUsed / 1048576)}MB`);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getSnapshots() {
    return [...this.snapshots];
  }
}
