import { moduleRegistry, type PillarId, type ModuleStatus } from "./module-registry";
import { platformBus } from "@/lib/shared/platform-bus";

export interface OSHealthReport {
  status: ModuleStatus;
  pillars: Record<PillarId, {
    status: ModuleStatus;
    activeModules: number;
    totalModules: number;
  }>;
  totalModules: number;
  activeModules: number;
  errorModules: number;
  platformBusStats: {
    registeredEventTypes: number;
    recentEventsCount: number;
  };
  timestamp: number;
}

export function getOSHealthReport(): OSHealthReport {
  const osHealth = moduleRegistry.getOSHealth();
  const pillars = (["dashboard", "radar", "orbit", "wallet", "me"] as PillarId[]).reduce(
    (acc, p) => {
      const pillarHealth = moduleRegistry.getPillarHealth(p);
      const mods = moduleRegistry.getModulesByPillar(p);
      acc[p] = {
        status: pillarHealth.status,
        activeModules: mods.filter((m) => m.status === "active").length,
        totalModules: mods.length,
      };
      return acc;
    },
    {} as OSHealthReport["pillars"]
  );

  return {
    status: osHealth.status,
    pillars,
    totalModules: osHealth.totalModules,
    activeModules: osHealth.activeModules,
    errorModules: osHealth.errorModules,
    platformBusStats: {
      registeredEventTypes: platformBus.getRegisteredEvents().length,
      recentEventsCount: platformBus.getLog().length,
    },
    timestamp: Date.now(),
  };
}

export function getModuleDependencyGraph(): { nodes: string[]; edges: [string, string][] } {
  const allModules = moduleRegistry.getAllModules();
  const nodes = allModules.map((m) => m.id);
  const edges: [string, string][] = [];

  for (const mod of allModules) {
    for (const dep of mod.dependencies) {
      edges.push([dep, mod.id]);
    }
  }

  return { nodes, edges };
}

export function detectCircularDependencies(): string[][] {
  const allModules = moduleRegistry.getAllModules();
  const adjList = new Map<string, string[]>();
  for (const mod of allModules) {
    adjList.set(mod.id, mod.dependencies);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const dep of adjList.get(node) || []) {
      dfs(dep, [...path]);
    }

    inStack.delete(node);
  }

  for (const mod of allModules) {
    dfs(mod.id, []);
  }

  return cycles;
}
