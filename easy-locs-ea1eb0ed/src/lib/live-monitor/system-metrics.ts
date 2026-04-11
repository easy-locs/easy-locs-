import { db } from '@/services/db';
import type { SystemMetrics } from './monitor-types';

export const systemMetrics = {
  async capture(): Promise<SystemMetrics> {
    const now = new Date().toISOString();
    const fiveMinAgo = new Date(Date.now() - 300000).toISOString();

    const { data: execData } = await db('engine_execution_log')
      .select('status, duration_ms')
      .gte('timestamp', fiveMinAgo);

    const logs = (execData ?? []) as { status: string; duration_ms: number }[];
    const total = logs.length;
    const errors = logs.filter(l => l.status === 'fail').length;
    const avgLatency = total > 0
      ? Math.round(logs.reduce((s, l) => s + l.duration_ms, 0) / total)
      : 0;

    const { count: taskCount } = await db('system_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const metrics: SystemMetrics = {
      timestamp: now,
      total_requests: total,
      engine_executions: total,
      avg_latency: avgLatency,
      error_rate: total > 0 ? Math.round((errors / total) * 100) : 0,
      active_users: 0,
      processing_queue: taskCount ?? 0,
    };

    await db('system_metrics').insert(metrics);

    return metrics;
  },

  async getLatest(): Promise<SystemMetrics | null> {
    const { data } = await db('system_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();
    return data as SystemMetrics | null;
  },

  async getHistory(minutes = 60): Promise<SystemMetrics[]> {
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    const { data } = await db('system_metrics')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp');
    return (data ?? []) as SystemMetrics[];
  },
};
