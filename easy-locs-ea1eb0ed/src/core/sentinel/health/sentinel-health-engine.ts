import type { EngineHealthSnapshot, SentinelStatus } from "../types";
import { sentinelEngineRegistry } from "../registry/engine-registry";

let snapshotCounter = 0;

class SentinelHealthEngine {
  private _lastCheck = 0;
  private _checkCount = 0;
  private _degradedEngines = new Set<string>();
  private _unhealthyEngines = new Set<string>();

  checkAllHeartbeats(): { healthy: string[]; degraded: string[]; unhealthy: string[] } {
    const beats = sentinelEngineRegistry.collectHeartbeats();
    const staleChecks = sentinelEngineRegistry.checkHeartbeats();
    const staleSet = new Set(staleChecks.filter((h) => h.stale).map((h) => h.engine_id));
    const healthy: string[] = [];
    const degraded: string[] = [];
    const unhealthy: string[] = [];

    const enginesWithContracts = new Set(beats.map((b) => b.engine_id));
    for (const entry of sentinelEngineRegistry.getAll()) {
      if (!entry.enabled) continue;
      if (!enginesWithContracts.has(entry.engine_id) && staleSet.has(entry.engine_id)) {
        degraded.push(entry.engine_id);
        this._degradedEngines.add(entry.engine_id);
        sentinelEngineRegistry.updateStatus(entry.engine_id, "degraded");
      }
    }

    for (const beat of beats) {
      if (!beat.alive || beat.latency_ms < 0) {
        unhealthy.push(beat.engine_id);
        this._unhealthyEngines.add(beat.engine_id);
        this._degradedEngines.delete(beat.engine_id);
        sentinelEngineRegistry.updateStatus(beat.engine_id, "unhealthy");
      } else if (beat.error_rate > 0.1 || beat.latency_ms > 5000) {
        degraded.push(beat.engine_id);
        this._degradedEngines.add(beat.engine_id);
        this._unhealthyEngines.delete(beat.engine_id);
        sentinelEngineRegistry.updateStatus(beat.engine_id, "degraded");
      } else {
        healthy.push(beat.engine_id);
        this._degradedEngines.delete(beat.engine_id);
        this._unhealthyEngines.delete(beat.engine_id);
        sentinelEngineRegistry.updateStatus(beat.engine_id, "healthy");
        sentinelEngineRegistry.updateHeartbeat(beat.engine_id);
      }

      const snapshot: EngineHealthSnapshot = {
        snapshot_id: `SNAP_${Date.now()}_${++snapshotCounter}`,
        engine_id: beat.engine_id,
        recorded_at: Date.now(),
        heartbeat_ok: beat.alive,
        status: beat.alive ? (beat.error_rate > 0.1 ? "degraded" : "healthy") : "unhealthy",
        latency_ms: beat.latency_ms,
        error_rate: beat.error_rate,
        queue_lag: 0,
        notes: "",
      };
      sentinelEngineRegistry.recordHealthSnapshot(snapshot);
    }

    this._lastCheck = Date.now();
    this._checkCount++;

    return { healthy, degraded, unhealthy };
  }

  checkStaleHeartbeats(): Array<{ engine_id: string; last_heartbeat: number; max_age_sec: number }> {
    const stale = sentinelEngineRegistry.checkHeartbeats().filter((h) => h.stale);
    return stale.map((h) => ({
      engine_id: h.engine_id,
      last_heartbeat: h.last_heartbeat,
      max_age_sec: h.expected_interval * 2,
    }));
  }

  getGlobalStatus(): SentinelStatus {
    if (this._unhealthyEngines.size > 0) return "unhealthy";
    if (this._degradedEngines.size > 0) return "degraded";
    return "healthy";
  }

  getStats(): { checks: number; last_check: number; degraded: number; unhealthy: number; global_status: SentinelStatus } {
    return {
      checks: this._checkCount,
      last_check: this._lastCheck,
      degraded: this._degradedEngines.size,
      unhealthy: this._unhealthyEngines.size,
      global_status: this.getGlobalStatus(),
    };
  }
}

export const sentinelHealthEngine = new SentinelHealthEngine();
