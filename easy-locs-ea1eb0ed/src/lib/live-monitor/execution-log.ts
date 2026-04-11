import { db } from '@/services/db';
import type { EngineExecutionLog } from './monitor-types';

export const executionLog = {
  async record(entry: Omit<EngineExecutionLog, 'log_id' | 'timestamp'>): Promise<void> {
    await db('engine_execution_log').insert({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  },

  async success(engineName: string, actionType: string, durationMs: number, entityId?: string): Promise<void> {
    await this.record({
      engine_name: engineName,
      action_type: actionType,
      entity_id: entityId ?? null,
      status: 'success',
      duration_ms: durationMs,
    });
  },

  async fail(engineName: string, actionType: string, durationMs: number, error: string, entityId?: string): Promise<void> {
    await this.record({
      engine_name: engineName,
      action_type: actionType,
      entity_id: entityId ?? null,
      status: 'fail',
      duration_ms: durationMs,
      error_message: error,
    });
  },

  async getRecent(limit = 50): Promise<EngineExecutionLog[]> {
    const { data } = await db('engine_execution_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    return (data ?? []) as EngineExecutionLog[];
  },

  async getByEngine(engineName: string, limit = 50): Promise<EngineExecutionLog[]> {
    const { data } = await db('engine_execution_log')
      .select('*')
      .eq('engine_name', engineName)
      .order('timestamp', { ascending: false })
      .limit(limit);
    return (data ?? []) as EngineExecutionLog[];
  },

  async getErrors(limit = 50): Promise<EngineExecutionLog[]> {
    const { data } = await db('engine_execution_log')
      .select('*')
      .eq('status', 'fail')
      .order('timestamp', { ascending: false })
      .limit(limit);
    return (data ?? []) as EngineExecutionLog[];
  },

  async getStats(minutes = 5): Promise<{ total: number; success: number; failed: number; avgDuration: number }> {
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    const { data } = await db('engine_execution_log')
      .select('status, duration_ms')
      .gte('timestamp', since);

    const logs = (data ?? []) as { status: string; duration_ms: number }[];
    const success = logs.filter(l => l.status === 'success').length;
    const failed = logs.filter(l => l.status === 'fail').length;
    const avgDuration = logs.length > 0
      ? Math.round(logs.reduce((s, l) => s + l.duration_ms, 0) / logs.length)
      : 0;

    return { total: logs.length, success, failed, avgDuration };
  },
};
