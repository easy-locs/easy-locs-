export type EngineStatus = 'alive' | 'slow' | 'dead';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EngineHeartbeat {
  engine_id: string;
  engine_name: string;
  last_ping_at: string;
  status: EngineStatus;
  execution_count_last_1min: number;
  execution_count_last_5min: number;
  avg_execution_time_ms: number;
}

export interface EngineExecutionLog {
  log_id: string;
  engine_name: string;
  action_type: string;
  entity_id: string | null;
  status: 'success' | 'fail';
  duration_ms: number;
  timestamp: string;
  error_message?: string;
}

export interface SystemMetrics {
  timestamp: string;
  total_requests: number;
  engine_executions: number;
  avg_latency: number;
  error_rate: number;
  active_users: number;
  processing_queue: number;
}

export interface SystemTask {
  task_id: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_engine: string;
  payload: Record<string, unknown>;
  result: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface AIDecision {
  decision_id: string;
  type: string;
  action: string;
  target: string;
  reason: string;
  confidence: number;
  executed: boolean;
  created_at: string;
}

export interface LiveDashboardState {
  totalEngines: number;
  activeEngines: number;
  deadEngines: number;
  warnings: number;
  recentActivity: EngineExecutionLog[];
  engineGrid: EngineHeartbeat[];
  cronStatus: { active: number; delayed: number; collisions: number };
  errorCount: number;
  metrics: SystemMetrics | null;
}

export interface SelfCheckResult {
  engine_name: string;
  passed: boolean;
  checks: { name: string; ok: boolean; message: string }[];
  timestamp: string;
}
