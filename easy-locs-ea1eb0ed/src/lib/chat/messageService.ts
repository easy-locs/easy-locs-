import DOMPurify from "dompurify";
import { sendInAppNotification } from "@/lib/notifications/notification-dispatcher";
import { getCurrentUserId } from "@/families/identity";
import { insertMessage } from "@/repositories/communication.repository";
import { db } from "@/services/db";
import { executeFastPath } from "@/lib/runtime/path-discipline";

async function resolveOrbitId(userId: string): Promise<string> {
  const { data } = await db
    .from("orbit_profiles_v2")
    .select("orbit_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.orbit_id || `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;
}

export async function sendSystemMessage(input: {
  conversationId: string;
  senderOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await executeFastPath("message_send", async () => {
    const userId = await getCurrentUserId();
    const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

    await insertMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      senderOrbitId,
      type: "system",
      body: input.body,
      metadata: { schemaVersion: 1, ...(input.metadata ?? {}) },
    });
  });

  if (!result.ok) {
    console.error("sendSystemMessage failed after budget-exceeded fallback");
  }
}

export async function createCallSystemMessage(input: {
  conversationId: string;
  senderOrbitId?: string | null;
  receiverOrbitId?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const userId = await getCurrentUserId();
  const senderOrbitId = input.senderOrbitId || await resolveOrbitId(userId);

  try {
    await insertMessage({
      conversationId: input.conversationId,
      senderUserId: userId,
      senderOrbitId,
      type: "call",
      body: input.body,
      metadata: { schemaVersion: 1, ...(input.metadata ?? {}) },
    });
  } catch (error) {
    console.error("createCallSystemMessage error", error);
  }
}
