import { hasAwsCredentials, sqsSendMessage } from "./aws-sdk-clients.ts";

const AWS_REGION = Deno.env.get("AWS_REGION") || "eu-west-1";
const AWS_ACCOUNT_ID = Deno.env.get("AWS_ACCOUNT_ID") || "";

export type SqsQueueName =
  | "easy-locs-ai-tasks"
  | "easy-locs-media-processing"
  | "easy-locs-scraping"
  | "easy-locs-analytics"
  | "easy-locs-email"
  | "easy-locs-dlq";

export function hasSqsCredentials(): boolean {
  return hasAwsCredentials() && !!AWS_ACCOUNT_ID;
}

function getQueueUrl(queueName: SqsQueueName): string {
  return `https://sqs.${AWS_REGION}.amazonaws.com/${AWS_ACCOUNT_ID}/${queueName}`;
}

export interface EnqueueResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function enqueueToSqs(
  queueName: SqsQueueName,
  payload: Record<string, unknown>,
  delaySeconds = 0,
): Promise<EnqueueResult> {
  if (!hasSqsCredentials()) {
    return { success: false, error: "AWS SQS credentials not configured" };
  }

  try {
    const queueUrl = getQueueUrl(queueName);
    const messageId = await sqsSendMessage(queueUrl, payload, delaySeconds);
    return { success: true, messageId };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[aws-sqs] Failed to enqueue to ${queueName}:`, msg);
    return { success: false, error: msg };
  }
}
