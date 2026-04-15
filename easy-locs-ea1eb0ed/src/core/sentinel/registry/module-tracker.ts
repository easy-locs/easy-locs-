import type { EngineRegistryEntry, SentinelStatus, EngineCriticality, EngineHealthSnapshot } from "../types";
import type { SentinelEngineContract, EngineHeartbeat } from "../contracts";

class SentinelModuleTracker {
  private modules = new Map<string, EngineRegistryEntry>();
  private contracts = new Map<string, SentinelEngineContract>();
  private healthHistory = new Map<string, EngineHealthSnapshot[]>();
  private readonly MAX_HISTORY = 100;

  register(entry: EngineRegistryEntry, contract?: SentinelEngineContract): void {
    this.modules.set(entry.engine_id, { ...entry, created_at: entry.created_at || Date.now(), updated_at: Date.now() });
    if (contract) {
      this.contracts.set(entry.engine_id, contract);
    }
  }

  unregister(engineId: string): boolean {
    this.contracts.delete(engineId);
    return this.modules.delete(engineId);
  }

  get(engineId: string): EngineRegistryEntry | undefined {
    return this.modules.get(engineId);
  }

  getContract(engineId: string): SentinelEngineContract | undefined {
    return this.contracts.get(engineId);
  }

  getAll(): EngineRegistryEntry[] {
    return Array.from(this.modules.values());
  }

  getByDomain(domain: string): EngineRegistryEntry[] {
    return this.getAll().filter((e) => e.owner_domain === domain);
  }

  getByCriticality(criticality: EngineCriticality): EngineRegistryEntry[] {
    return this.getAll().filter((e) => e.criticality === criticality);
  }

  getByStatus(status: SentinelStatus): EngineRegistryEntry[] {
    return this.getAll().filter((e) => e.status === status);
  }

  getCriticalEngines(): EngineRegistryEntry[] {
    return this.getAll().filter((e) => e.criticality === "critical" || e.criticality === "high");
  }

  updateStatus(engineId: string, status: SentinelStatus): void {
    const entry = this.modules.get(engineId);
    if (entry) {
      entry.status = status;
      entry.updated_at = Date.now();
    }
  }

  updateHeartbeat(engineId: string): void {
    const entry = this.modules.get(engineId);
    if (entry) {
      entry.last_heartbeat_at = Date.now();
      entry.updated_at = Date.now();
    }
  }

  recordHealthSnapshot(snapshot: EngineHealthSnapshot): void {
    const history = this.healthHistory.get(snapshot.engine_id) || [];
    history.push(snapshot);
    if (history.length > this.MAX_HISTORY) {
      history.splice(0, history.length - this.MAX_HISTORY);
    }
    this.healthHistory.set(snapshot.engine_id, history);
  }

  getHealthHistory(engineId: string, limit = 10): EngineHealthSnapshot[] {
    const history = this.healthHistory.get(engineId) || [];
    return history.slice(-limit);
  }

  checkHeartbeats(): Array<{ engine_id: string; stale: boolean; last_heartbeat: number; expected_interval: number }> {
    const results: Array<{ engine_id: string; stale: boolean; last_heartbeat: number; expected_interval: number }> = [];
    const now = Date.now();
    for (const entry of this.modules.values()) {
      if (!entry.enabled) continue;
      const maxAge = entry.heartbeat_interval_sec * 1000 * 2;
      const stale = now - entry.last_heartbeat_at > maxAge;
      results.push({
        engine_id: entry.engine_id,
        stale,
        last_heartbeat: entry.last_heartbeat_at,
        expected_interval: entry.heartbeat_interval_sec,
      });
    }
    return results;
  }

  collectHeartbeats(): EngineHeartbeat[] {
    const beats: EngineHeartbeat[] = [];
    for (const [id, contract] of this.contracts) {
      try {
        beats.push(contract.getHeartbeat());
      } catch {
        beats.push({
          engine_id: id,
          alive: false,
          timestamp: Date.now(),
          latency_ms: -1,
          error_rate: 1,
          uptime_ms: 0,
        });
      }
    }
    return beats;
  }

  get size(): number {
    return this.modules.size;
  }

  getSummary(): { total: number; healthy: number; degraded: number; unhealthy: number; disabled: number } {
    const all = this.getAll();
    return {
      total: all.length,
      healthy: all.filter((e) => e.status === "healthy").length,
      degraded: all.filter((e) => e.status === "degraded").length,
      unhealthy: all.filter((e) => e.status === "unhealthy").length,
      disabled: all.filter((e) => !e.enabled || e.status === "disabled").length,
    };
  }
}

export const sentinelEngineRegistry = new SentinelModuleTracker();
