import { db } from "@/services/db";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { resolveUserByEmail } from "@/lib/orbit/orbit-contacts-service";
import { toast } from "sonner";

export async function navigateToOrbitThread(opts: {
  targetEmail?: string;
  targetUserId?: string;
  targetName?: string;
}): Promise<string | null> {
  const { data: authData } = await db.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) {
    toast.error("Please sign in to send messages");
    return null;
  }

  let targetId = opts.targetUserId;

  if (!targetId && opts.targetEmail) {
    const resolved = await resolveUserByEmail(opts.targetEmail);
    if (resolved) {
      targetId = resolved.userId;
    }
  }

  if (!targetId) {
    toast.info("This contact isn't on Easy-Locs yet. An invite has been sent.");
    return "/orbit";
  }

  if (targetId === currentUserId) {
    toast.info("Cannot message yourself");
    return null;
  }

  try {
    const result = await getOrCreateDirectThread({
      currentUserId,
      targetUserId: targetId,
      targetName: opts.targetName || "Contact",
    });
    if (result?.conversationId) {
      return `/orbit?thread=${result.conversationId}`;
    }
  } catch (err) {
    console.warn("[navigate-to-thread] Failed:", err);
  }

  toast.error("Could not create conversation");
  return null;
}
