import { redisLpush, isRedisAvailable } from "./redis-client.ts";

const REDIS_QUEUE_KEY = "jobqueue:pending";

interface RedisJob {
  id: string;
  queue_name: string;
  payload: Record<string, unknown>;
  priority: number;
  retry_count: number;
  max_retries: number;
  correlation_id: string;
  scheduled_at: string;
}

function generateCorrelationId(): string {
  return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function enqueueJobToRedis(job: {
  id: string;
  queue_name: string;
  payload: Record<string, unknown>;
  priority?: number;
  retry_count?: number;
  max_retries?: number;
  correlation_id?: string;
  scheduled_at?: string;
}): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  const redisJob: RedisJob = {
    id: job.id,
    queue_name: job.queue_name,
    payload: job.payload,
    priority: job.priority ?? 0,
    retry_count: job.retry_count ?? 0,
    max_retries: job.max_retries ?? 3,
    correlation_id: job.correlation_id ?? generateCorrelationId(),
    scheduled_at: job.scheduled_at ?? new Date().toISOString(),
  };

  const result = await redisLpush(REDIS_QUEUE_KEY, redisJob);
  return result !== null && result > 0;
}

export { REDIS_QUEUE_KEY };
