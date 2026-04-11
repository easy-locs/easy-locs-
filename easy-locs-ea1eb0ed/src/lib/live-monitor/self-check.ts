import { db } from '@/services/db';
import type { SelfCheckResult } from './monitor-types';
import { engineHeartbeat } from './engine-heartbeat';

export const selfCheck = {
  async runForEngine(engineName: string): Promise<SelfCheckResult> {
    const checks: { name: string; ok: boolean; message: string }[] = [];

    const dbCheck = await this.checkDbAccess();
    checks.push(dbCheck);

    const heartbeatCheck = await this.checkHeartbeat(engineName);
    checks.push(heartbeatCheck);

    const memoryCheck = this.checkMemory();
    checks.push(memoryCheck);

    return {
      engine_name: engineName,
      passed: checks.every(c => c.ok),
      checks,
      timestamp: new Date().toISOString(),
    };
  },

  async checkDbAccess(): Promise<{ name: string; ok: boolean; message: string }> {
    try {
      await db('engine_heartbeat').select('engine_id').limit(1);
      return { name: 'db_access', ok: true, message: 'Database accessible' };
    } catch (e) {
      return { name: 'db_access', ok: false, message: `Database error: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  },

  async checkHeartbeat(engineName: string): Promise<{ name: string; ok: boolean; message: string }> {
    const all = await engineHeartbeat.getAll();
    const engine = all.find(h => h.engine_name === engineName);

    if (!engine) {
      return { name: 'heartbeat', ok: false, message: `No heartbeat found for ${engineName}` };
    }

    if (engine.status === 'dead') {
      return { name: 'heartbeat', ok: false, message: `Engine ${engineName} is DEAD (last ping: ${engine.last_ping_at})` };
    }

    return { name: 'heartbeat', ok: true, message: `Engine ${engineName} is ${engine.status}` };
  },

  checkMemory(): { name: string; ok: boolean; message: string } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      if (mem) {
        const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
        if (usagePercent > 90) {
          return { name: 'memory', ok: false, message: `Memory usage critical: ${usagePercent.toFixed(1)}%` };
        }
        return { name: 'memory', ok: true, message: `Memory: ${usagePercent.toFixed(1)}%` };
      }
    }
    return { name: 'memory', ok: true, message: 'Memory check not available in this environment' };
  },

  async runAll(engineNames: string[]): Promise<SelfCheckResult[]> {
    return Promise.all(engineNames.map(name => this.runForEngine(name)));
  },
};
