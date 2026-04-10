import { platformBus } from "@/lib/shared/platform-bus";

export type PillarId = "dashboard" | "radar" | "orbit" | "wallet" | "me";

export type ModuleCapability =
  | "search"
  | "geo"
  | "messaging"
  | "payments"
  | "identity"
  | "discovery"
  | "booking"
  | "commerce"
  | "property"
  | "delivery"
  | "analytics"
  | "media"
  | "trust"
  | "notifications"
  | "contacts"
  | "qr"
  | "settings";

export type ModuleStatus = "idle" | "booting" | "active" | "degraded" | "error";

export interface ModuleDescriptor {
  id: string;
  pillar: PillarId;
  label: string;
  capabilities: ModuleCapability[];
  dependencies: string[];
  staleTimeMs: number;
  status: ModuleStatus;
  lastActiveAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
}

export interface ModuleHealthSnapshot {
  moduleId: string;
  status: ModuleStatus;
  upSinceMs: number | null;
  errorCount: number;
  lastError: string | null;
  staleness: "fresh" | "stale" | "expired";
}

const PILLAR_MODULES: ModuleDescriptor[] = [
  {
    id: "dashboard-core",
    pillar: "dashboard",
    label: "Smart Home",
    capabilities: ["analytics", "notifications"],
    dependencies: [],
    staleTimeMs: 60_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "dashboard-suggestions",
    pillar: "dashboard",
    label: "Suggestions Engine",
    capabilities: ["analytics", "discovery"],
    dependencies: ["radar-core", "wallet-core"],
    staleTimeMs: 120_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "radar-core",
    pillar: "radar",
    label: "Hyper Radar",
    capabilities: ["search", "geo", "discovery"],
    dependencies: [],
    staleTimeMs: 30_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "radar-map",
    pillar: "radar",
    label: "Map Engine",
    capabilities: ["geo", "discovery"],
    dependencies: ["radar-core"],
    staleTimeMs: 15_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "radar-booking",
    pillar: "radar",
    label: "Booking Flow",
    capabilities: ["booking", "commerce"],
    dependencies: ["radar-core", "wallet-core"],
    staleTimeMs: 60_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "orbit-core",
    pillar: "orbit",
    label: "Communication Center",
    capabilities: ["messaging", "contacts", "notifications"],
    dependencies: [],
    staleTimeMs: 10_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "orbit-chat",
    pillar: "orbit",
    label: "Chat Engine",
    capabilities: ["messaging", "media"],
    dependencies: ["orbit-core"],
    staleTimeMs: 5_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "orbit-payments",
    pillar: "orbit",
    label: "Chat Payments",
    capabilities: ["payments", "messaging"],
    dependencies: ["orbit-core", "wallet-core"],
    staleTimeMs: 30_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "wallet-core",
    pillar: "wallet",
    label: "Wallet Hub",
    capabilities: ["payments", "qr"],
    dependencies: [],
    staleTimeMs: 15_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "wallet-transfers",
    pillar: "wallet",
    label: "Transfers",
    capabilities: ["payments", "contacts"],
    dependencies: ["wallet-core"],
    staleTimeMs: 30_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "wallet-trust",
    pillar: "wallet",
    label: "Trust Engine",
    capabilities: ["trust", "analytics"],
    dependencies: ["wallet-core"],
    staleTimeMs: 300_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "me-core",
    pillar: "me",
    label: "Command Center",
    capabilities: ["identity", "settings"],
    dependencies: [],
    staleTimeMs: 120_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "me-business",
    pillar: "me",
    label: "Business Manager",
    capabilities: ["commerce", "property", "analytics"],
    dependencies: ["me-core", "wallet-core"],
    staleTimeMs: 60_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
  {
    id: "me-delivery",
    pillar: "me",
    label: "Delivery Manager",
    capabilities: ["delivery", "geo"],
    dependencies: ["me-core", "radar-core"],
    staleTimeMs: 30_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  },
];

class ModuleRegistry {
  private modules = new Map<string, ModuleDescriptor>();
  private errorCounts = new Map<string, number>();
  private bootTimestamps = new Map<string, number>();

  constructor() {
    for (const mod of PILLAR_MODULES) {
      this.modules.set(mod.id, { ...mod });
    }
  }

  getModule(id: string): ModuleDescriptor | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ModuleDescriptor[] {
    return Array.from(this.modules.values());
  }

  getModulesByPillar(pillar: PillarId): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.pillar === pillar);
  }

  getModulesByCapability(capability: ModuleCapability): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.capabilities.includes(capability));
  }

  getDependents(moduleId: string): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.dependencies.includes(moduleId));
  }

  setStatus(moduleId: string, status: ModuleStatus, error?: string): void {
    const mod = this.modules.get(moduleId);
    if (!mod) return;

    const prev = mod.status;
    mod.status = status;

    if (status === "active") {
      mod.lastActiveAt = Date.now();
      if (!this.bootTimestamps.has(moduleId)) {
        this.bootTimestamps.set(moduleId, Date.now());
      }
    }

    if (status === "error" || status === "degraded") {
      mod.lastErrorAt = Date.now();
      mod.lastError = error || null;
      this.errorCounts.set(moduleId, (this.errorCounts.get(moduleId) || 0) + 1);
    }

    if (prev !== status) {
      platformBus.emit(
        "system:module_status_changed",
        { moduleId, from: prev, to: status, error },
        "system"
      );
    }
  }

  activateModule(moduleId: string): void {
    this.setStatus(moduleId, "active");
  }

  deactivateModule(moduleId: string): void {
    this.setStatus(moduleId, "idle");
  }

  getModuleHealth(moduleId: string): ModuleHealthSnapshot | null {
    const mod = this.modules.get(moduleId);
    if (!mod) return null;

    const bootTs = this.bootTimestamps.get(moduleId);
    const now = Date.now();
    const staleness: ModuleHealthSnapshot["staleness"] =
      mod.lastActiveAt && now - mod.lastActiveAt < mod.staleTimeMs
        ? "fresh"
        : mod.lastActiveAt && now - mod.lastActiveAt < mod.staleTimeMs * 3
          ? "stale"
          : "expired";

    return {
      moduleId,
      status: mod.status,
      upSinceMs: bootTs ? now - bootTs : null,
      errorCount: this.errorCounts.get(moduleId) || 0,
      lastError: mod.lastError,
      staleness,
    };
  }

  getPillarHealth(pillar: PillarId): {
    pillar: PillarId;
    status: ModuleStatus;
    modules: ModuleHealthSnapshot[];
  } {
    const mods = this.getModulesByPillar(pillar);
    const healths = mods
      .map((m) => this.getModuleHealth(m.id))
      .filter(Boolean) as ModuleHealthSnapshot[];

    let status: ModuleStatus = "active";
    if (healths.some((h) => h.status === "error")) status = "error";
    else if (healths.some((h) => h.status === "degraded")) status = "degraded";
    else if (healths.every((h) => h.status === "idle")) status = "idle";

    return { pillar, status, modules: healths };
  }

  getOSHealth(): {
    status: ModuleStatus;
    pillars: Record<PillarId, ModuleStatus>;
    totalModules: number;
    activeModules: number;
    errorModules: number;
  } {
    const pillars = (["dashboard", "radar", "orbit", "wallet", "me"] as PillarId[]).reduce(
      (acc, p) => {
        acc[p] = this.getPillarHealth(p).status;
        return acc;
      },
      {} as Record<PillarId, ModuleStatus>
    );

    const all = this.getAllModules();
    const activeCount = all.filter((m) => m.status === "active").length;
    const errorCount = all.filter((m) => m.status === "error").length;

    let status: ModuleStatus = "active";
    if (errorCount > 0) status = Object.values(pillars).every((s) => s === "error") ? "error" : "degraded";
    else if (activeCount === 0) status = "idle";

    return {
      status,
      pillars,
      totalModules: all.length,
      activeModules: activeCount,
      errorModules: errorCount,
    };
  }

  reset(): void {
    for (const mod of this.modules.values()) {
      mod.status = "idle";
      mod.lastActiveAt = null;
      mod.lastErrorAt = null;
      mod.lastError = null;
    }
    this.errorCounts.clear();
    this.bootTimestamps.clear();
  }
}

export const moduleRegistry = new ModuleRegistry();

export function installModuleLifecycle(): () => void {
  const unsubs: (() => void)[] = [];

  const PILLAR_PREFIX_MAP: Record<string, PillarId> = {
    dashboard: "dashboard",
    radar: "radar",
    orbit: "orbit",
    wallet: "wallet",
    me: "me",
  };

  for (const [prefix, pillar] of Object.entries(PILLAR_PREFIX_MAP)) {
    unsubs.push(
      platformBus.onPrefix(`${prefix}:`, () => {
        const mods = moduleRegistry.getModulesByPillar(pillar);
        const core = mods.find((m) => m.id === `${pillar}-core`);
        if (core && core.status === "idle") {
          moduleRegistry.activateModule(core.id);
        }
        if (core) {
          core.lastActiveAt = Date.now();
        }
      })
    );
    unsubs.push(
      platformBus.onPrefix(`${prefix}.`, () => {
        const mods = moduleRegistry.getModulesByPillar(pillar);
        const core = mods.find((m) => m.id === `${pillar}-core`);
        if (core && core.status === "idle") {
          moduleRegistry.activateModule(core.id);
        }
        if (core) {
          core.lastActiveAt = Date.now();
        }
      })
    );
  }

  return () => unsubs.forEach((fn) => fn());
}
