/**
 * thread-filter — Atomic unit: filter conversations_v2 rows to user's conversations.
 * Single responsibility: participant matching on JSONB participants array.
 */

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[THREADS][${step}] ${phase}:`, payload ?? {});
};

export function filterUserConversations(rawConvs: any[], userId: string): any[] {
  trace("filter.participant", "input", { rawCount: rawConvs.length, userId });

  const filtered = rawConvs.filter((conv: any) => {
    if (Array.isArray(conv.participants)) {
      const isParticipant = conv.participants.some((p: any) => {
        const pUserId = p?.userId || p?.user_id || p?.id;
        return pUserId === userId;
      });
      if (isParticipant) return true;
    }
    if (conv.metadata?.direct_user_ids && Array.isArray(conv.metadata.direct_user_ids)) {
      if (conv.metadata.direct_user_ids.includes(userId)) return true;
    }
    if (conv.created_by_orbit_id?.includes(userId.slice(0, 12))) return true;
    return false;
  });

  trace("filter.participant", "output", { filteredCount: filtered.length });
  return filtered;
}