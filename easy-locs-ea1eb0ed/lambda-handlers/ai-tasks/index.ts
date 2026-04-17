import type { SQSEvent, SQSHandler } from "aws-lambda";

interface AiTaskPayload {
  _job_id?: string;
  _correlation_id?: string;
  _queue_name?: string;
  _from_queue?: boolean;
  _source?: string;
  user_id?: string;
  task?: string;
  messages?: Array<{ role: string; content: string }>;
  locale?: string;
  context?: Record<string, unknown>;
}

interface AiChatMessage {
  role: string;
  content: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function updateJobStatus(jobId: string, status: string, error?: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !jobId) return;
  const body: Record<string, string> = { status, completed_at: new Date().toISOString() };
  if (error) body.error = error;
  await fetch(`${SUPABASE_URL}/rest/v1/job_queue?id=eq.${jobId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

// LB Closeout #852 — the lambda no longer talks to OpenAI directly. AI calls
// go through the `ai-proxy` Edge Function, which routes through
// `dispatchAiCompletion` so quota / audit / sensitive routing are enforced
// consistently with every other AI surface in the system.
async function callAiProxy(messages: AiChatMessage[], taskType: string): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set in Lambda environment");
  }

  const systemPrompt = taskType === "translate"
    ? "You are a professional translator for a property management platform."
    : "You are an AI assistant for Easy-Locs, a property management platform.";

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`ai-proxy returned ${response.status}: ${errText}`);
  }

  const result = await response.json() as { response?: string };
  return result.response || "";
}

async function storeResult(userId: string, taskType: string, result: string, correlationId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/ai_task_results`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      user_id: userId === "service_role" ? null : userId,
      task_type: taskType,
      result,
      correlation_id: correlationId,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {});
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const payload: AiTaskPayload = JSON.parse(record.body);
    const jobId = payload._job_id || "";
    const correlationId = payload._correlation_id || "";

    try {
      const messages: AiChatMessage[] = payload.messages || [];
      const taskType = payload.task || "chat";

      const result = await callAiProxy(messages, taskType);
      await storeResult(payload.user_id || "unknown", taskType, result, correlationId);
      await updateJobStatus(jobId, "completed");

      console.log(`[ai-tasks] Completed job ${jobId} (${taskType}), result length: ${result.length}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ai-tasks] Failed job ${jobId}:`, message);
      await updateJobStatus(jobId, "dead", message);
      throw err;
    }
  }
};
