import { db as supabase } from "@/services/db";

export async function insertIntoDlq(
  sourceSystem: string,
  operationType: string,
  payload: Record<string, unknown>,
  error: string,
  _maxRetries = 5
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error(
        `[dlq-client] No session — cannot submit to DLQ: source=${sourceSystem} op=${operationType} error=${error}`
      );
      return;
    }

    const { error: fnErr } = await supabase.functions.invoke("dlq-ingest", {
      body: {
        source_system: sourceSystem,
        operation_type: operationType,
        payload,
        error,
      },
    });

    if (fnErr) {
      console.error("[dlq-client] DLQ ingest failed:", fnErr);
    }
  } catch (e) {
    console.error("[dlq-client] Failed to submit to DLQ:", e);
  }
}
