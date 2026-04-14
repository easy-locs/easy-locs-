import { platformBus } from "@/lib/shared/platform-bus";
import { FLOW_EVENT_MAP } from "@/lib/runtime/flow-completeness-validator";

export interface CycleDetectionResult {
  hasCycle: boolean;
  cycles: string[][];
  checkedAt: number;
  source: "static" | "runtime" | "combined";
}

export interface LoopAlert {
  eventType: string;
  count: number;
  windowMs: number;
  detectedAt: number;
}

const LOOP_THRESHOLD = 10;
const LOOP_WINDOW_MS = 1000;
const MAX_ALERTS = 100;

const eventEmissionCounts = new Map<string, number[]>();
const loopAlerts: LoopAlert[] = [];
let _installed = false;

export function trackEventForLoop(eventType: string): LoopAlert | null {
  const now = Date.now();

  if (!eventEmissionCounts.has(eventType)) {
    eventEmissionCounts.set(eventType, []);
  }
  const timestamps = eventEmissionCounts.get(eventType)!;
  timestamps.push(now);

  const cutoff = now - LOOP_WINDOW_MS;
  const filtered = timestamps.filter((t) => t > cutoff);
  eventEmissionCounts.set(eventType, filtered);

  if (filtered.length > LOOP_THRESHOLD) {
    const alert: LoopAlert = {
      eventType,
      count: filtered.length,
      windowMs: LOOP_WINDOW_MS,
      detectedAt: now,
    };

    loopAlerts.push(alert);
    if (loopAlerts.length > MAX_ALERTS) loopAlerts.shift();

    platformBus.emit(
      "system:flow_loop_detected",
      {
        eventType,
        count: filtered.length,
        windowMs: LOOP_WINDOW_MS,
      },
      "system",
    );

    eventEmissionCounts.set(eventType, []);

    return alert;
  }

  return null;
}

export interface EventDependencyGraph {
  edges: Map<string, Set<string>>;
}

const runtimeGraph: EventDependencyGraph = {
  edges: new Map(),
};

let _lastEmittedEvent: string | null = null;

export function trackEventDependency(eventType: string): void {
  if (_lastEmittedEvent && _lastEmittedEvent !== eventType) {
    if (!runtimeGraph.edges.has(_lastEmittedEvent)) {
      runtimeGraph.edges.set(_lastEmittedEvent, new Set());
    }
    runtimeGraph.edges.get(_lastEmittedEvent)!.add(eventType);
  }
  _lastEmittedEvent = eventType;
}

function buildStaticGraph(): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();

  for (const [flowName, events] of Object.entries(FLOW_EVENT_MAP)) {
    for (let i = 0; i < events.length - 1; i++) {
      if (!edges.has(events[i])) edges.set(events[i], new Set());
      edges.get(events[i])!.add(events[i + 1]);
    }
    if (events.length > 0) {
      const flowKey = `flow:${flowName}`;
      if (!edges.has(flowKey)) edges.set(flowKey, new Set());
      edges.get(flowKey)!.add(events[0]);
    }
  }

  return edges;
}

function findCyclesInGraph(edges: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = edges.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...path.slice(cycleStart), neighbor]);
          }
        }
      }
    }

    recursionStack.delete(node);
  }

  for (const node of edges.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

export function detectStaticCycles(): CycleDetectionResult {
  const staticEdges = buildStaticGraph();
  const cycles = findCyclesInGraph(staticEdges);
  return { hasCycle: cycles.length > 0, cycles, checkedAt: Date.now(), source: "static" };
}

export function detectCycles(): CycleDetectionResult {
  const combined = new Map<string, Set<string>>();

  const staticEdges = buildStaticGraph();
  for (const [from, toSet] of staticEdges) {
    if (!combined.has(from)) combined.set(from, new Set());
    for (const to of toSet) combined.get(from)!.add(to);
  }

  for (const [from, toSet] of runtimeGraph.edges) {
    if (!combined.has(from)) combined.set(from, new Set());
    for (const to of toSet) combined.get(from)!.add(to);
  }

  const cycles = findCyclesInGraph(combined);
  return { hasCycle: cycles.length > 0, cycles, checkedAt: Date.now(), source: "combined" };
}

export function getDependencyGraph(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [from, toSet] of runtimeGraph.edges) {
    result[from] = Array.from(toSet);
  }
  return result;
}

export function getLoopAlerts(): LoopAlert[] {
  return [...loopAlerts];
}

export function installFlowCycleDetector(): () => void {
  if (_installed) return () => {};
  _installed = true;

  const staticResult = detectStaticCycles();
  if (staticResult.hasCycle) {
    console.warn(
      `[flow-cycle-detector] Static analysis found ${staticResult.cycles.length} cycle(s):`,
      staticResult.cycles.map((c) => c.join(" → ")),
    );
    platformBus.emit(
      "system:flow_cycles_detected",
      {
        cycleCount: staticResult.cycles.length,
        cycles: staticResult.cycles.map((c) => c.join(" → ")),
        source: "static",
      },
      "system",
    );
  }

  const unsub = platformBus.onAll((event) => {
    trackEventForLoop(event.type);
    trackEventDependency(event.type);
  });

  const bootCycleCheck = setTimeout(() => {
    const result = detectCycles();
    if (result.hasCycle) {
      platformBus.emit(
        "system:flow_cycles_detected",
        {
          cycleCount: result.cycles.length,
          cycles: result.cycles.map((c) => c.join(" → ")),
          source: "combined",
        },
        "system",
      );
      if (import.meta.env?.DEV) {
        console.warn(
          `[flow-cycle-detector] Combined analysis found ${result.cycles.length} cycle(s):`,
          result.cycles.map((c) => c.join(" → ")),
        );
      }
    }
  }, 15_000);

  return () => {
    _installed = false;
    unsub();
    clearTimeout(bootCycleCheck);
  };
}

export function clearCycleDetector(): void {
  eventEmissionCounts.clear();
  loopAlerts.length = 0;
  runtimeGraph.edges.clear();
  _lastEmittedEvent = null;
}
