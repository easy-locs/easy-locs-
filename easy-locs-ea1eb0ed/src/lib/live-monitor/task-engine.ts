import { db } from '@/services/db';
import type { SystemTask, AIDecision, TaskPriority } from './monitor-types';

export const taskEngine = {
  async createTask(input: {
    type: string;
    priority: TaskPriority;
    assigned_engine: string;
    payload?: Record<string, unknown>;
  }): Promise<SystemTask> {
    const task: Omit<SystemTask, 'task_id'> = {
      type: input.type,
      priority: input.priority,
      status: 'pending',
      assigned_engine: input.assigned_engine,
      payload: input.payload ?? {},
      result: null,
      created_at: new Date().toISOString(),
      executed_at: null,
    };

    const { data } = await db('system_tasks').insert(task).select().single();
    return data as SystemTask;
  },

  async completeTask(taskId: string, result: string): Promise<void> {
    await db('system_tasks').update({
      status: 'completed',
      result,
      executed_at: new Date().toISOString(),
    }).eq('task_id', taskId);
  },

  async failTask(taskId: string, error: string): Promise<void> {
    await db('system_tasks').update({
      status: 'failed',
      result: error,
      executed_at: new Date().toISOString(),
    }).eq('task_id', taskId);
  },

  async getPending(): Promise<SystemTask[]> {
    const { data } = await db('system_tasks')
      .select('*')
      .eq('status', 'pending')
      .order('priority')
      .order('created_at');
    return (data ?? []) as SystemTask[];
  },

  async getRecent(limit = 50): Promise<SystemTask[]> {
    const { data } = await db('system_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as SystemTask[];
  },

  async recordDecision(decision: Omit<AIDecision, 'decision_id' | 'created_at'>): Promise<void> {
    await db('ai_decisions').insert({
      ...decision,
      created_at: new Date().toISOString(),
    });
  },

  async getDecisions(limit = 50): Promise<AIDecision[]> {
    const { data } = await db('ai_decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as AIDecision[];
  },

  async getUnexecutedDecisions(): Promise<AIDecision[]> {
    const { data } = await db('ai_decisions')
      .select('*')
      .eq('executed', false)
      .order('confidence', { ascending: false });
    return (data ?? []) as AIDecision[];
  },
};
