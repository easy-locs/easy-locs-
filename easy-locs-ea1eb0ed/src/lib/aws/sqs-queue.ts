export type SqsQueueName =
  | "easy-locs-ai-tasks"
  | "easy-locs-media-processing"
  | "easy-locs-scraping"
  | "easy-locs-analytics"
  | "easy-locs-email"
  | "easy-locs-dlq";

export interface EnqueueParams {
  queueName: SqsQueueName;
  payload: Record<string, unknown>;
  delaySeconds?: number;
}

export interface EnqueueResult {
  messageId?: string;
  success: boolean;
  error?: string;
}
