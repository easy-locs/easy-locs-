import { db } from '@/services/db';
import type { EngineHeartbeat, EngineStatus } from './monitor-types';

const ALIVE_THRESHOLD_MS = 30000;
const DEAD_THRESHOLD_MS = 60000;

const inMemoryHeartbeats = new Map<string, EngineHeartbeat>();

export const engineHeartbeat = {
  async ping(engineId: string, engineName: string, executionTimeMs?: number): Promise<void> {
    const existing = inMemoryHeartbeats.get(engineId);
    const now = new Date().toISOString();

    const hb: EngineHeartbeat = {
      engine_id: engineId,
      engine_name: engineName,
      last_ping_at: now,
      status: 'alive',
      execution_count_last_1min: (existing?.execution_count_last_1min ?? 0) + 1,
      execution_count_last_5min: (existing?.execution_count_last_5min ?? 0) + 1,
      avg_execution_time_ms: executionTimeMs ?? existing?.avg_execution_time_ms ?? 0,
    };

    inMemoryHeartbeats.set(engineId, hb);

    await db('engine_heartbeat').upsert(hb);
  },

  resolveStatus(lastPingAt: string): EngineStatus {
    const age = Date.now() - new Date(lastPingAt).getTime();
    if (age > DEAD_THRESHOLD_MS) return 'dead';
    if (age > ALIVE_THRESHOLD_MS) return 'slow';
    return 'alive';
  },

  async getAll(): Promise<EngineHeartbeat[]> {
    const { data } = await db('engine_heartbeat').select('*').order('engine_name');
    const heartbeats = (data ?? []) as EngineHeartbeat[];
    return heartbeats.map(hb => ({
      ...hb,
      status: this.resolveStatus(hb.last_ping_at),
    }));
  },

  async getStatus(): Promise<{ total: number; alive: number; slow: number; dead: number }> {
    const all = await this.getAll();
    return {
      total: all.length,
      alive: all.filter(h => h.status === 'alive').length,
      slow: all.filter(h => h.status === 'slow').length,
      dead: all.filter(h => h.status === 'dead').length,
    };
  },

  async getDead(): Promise<EngineHeartbeat[]> {
    const all = await this.getAll();
    return all.filter(h => h.status === 'dead');
  },

  async isHealthy(): Promise<boolean> {
    const status = await this.getStatus();
    return status.dead === 0;
  },

  getInMemory(): Map<string, EngineHeartbeat> {
    return inMemoryHeartbeats;
  },
};
