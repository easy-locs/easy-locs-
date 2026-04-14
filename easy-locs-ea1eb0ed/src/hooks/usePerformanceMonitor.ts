import { useCallback, useRef } from "react";
import type { ProfilerOnRenderCallback } from "react";
import { reportAnomaly } from "@/lib/runtime/anomaly-detector";

interface RenderSample {
  componentName: string;
  actualDuration: number;
  baseDuration: number;
  phase: "mount" | "update";
  timestamp: number;
}

interface PerformanceReport {
  componentName: string;
  avgActualDuration: number;
  maxActualDuration: number;
  renderCount: number;
  regressions: number;
}

const SLOW_RENDER_THRESHOLD_MS = 16;
const VERY_SLOW_RENDER_THRESHOLD_MS = 50;
const MAX_SAMPLES = 200;
const globalSamples: RenderSample[] = [];

function computeReport(componentName: string): PerformanceReport | null {
  const samples = globalSamples.filter(s => s.componentName === componentName);
  if (samples.length === 0) return null;
  const avg = samples.reduce((sum, s) => sum + s.actualDuration, 0) / samples.length;
  const max = Math.max(...samples.map(s => s.actualDuration));
  const regressions = samples.filter(s => s.actualDuration > SLOW_RENDER_THRESHOLD_MS).length;
  return { componentName, avgActualDuration: avg, maxActualDuration: max, renderCount: samples.length, regressions };
}

export function usePerformanceMonitor(componentName: string) {
  const lastDuration = useRef<number>(0);

  const onRender: ProfilerOnRenderCallback = useCallback((
    _id,
    phase,
    actualDuration,
    baseDuration,
  ) => {
    const sample: RenderSample = {
      componentName,
      actualDuration,
      baseDuration,
      phase: phase as "mount" | "update",
      timestamp: Date.now(),
    };

    globalSamples.push(sample);
    if (globalSamples.length > MAX_SAMPLES) globalSamples.splice(0, globalSamples.length - MAX_SAMPLES);

    if (actualDuration > VERY_SLOW_RENDER_THRESHOLD_MS) {
      reportAnomaly(
        "slow_flow",
        `component:${componentName}`,
        `${componentName} ${phase} took ${actualDuration.toFixed(1)}ms (baseline: ${baseDuration.toFixed(1)}ms)`,
        actualDuration > VERY_SLOW_RENDER_THRESHOLD_MS * 4 ? "high" : "medium",
        { componentName, phase, actualDuration, baseDuration },
      );
    } else if (
      phase === "update" &&
      lastDuration.current > 0 &&
      actualDuration > lastDuration.current * 3 &&
      actualDuration > SLOW_RENDER_THRESHOLD_MS
    ) {
      reportAnomaly(
        "slow_flow",
        `component:${componentName}`,
        `${componentName} render regression: ${actualDuration.toFixed(1)}ms (was ${lastDuration.current.toFixed(1)}ms)`,
        "medium",
        { componentName, phase, actualDuration, previousDuration: lastDuration.current },
      );
    }

    lastDuration.current = actualDuration;
  }, [componentName]);

  const getReport = useCallback((): PerformanceReport | null => {
    return computeReport(componentName);
  }, [componentName]);

  return { onRender, getReport };
}

export function getAllPerformanceReports(): PerformanceReport[] {
  const names = new Set(globalSamples.map(s => s.componentName));
  return Array.from(names).map(n => computeReport(n)).filter(Boolean) as PerformanceReport[];
}

export function clearPerformanceSamples(): void {
  globalSamples.splice(0, globalSamples.length);
}
