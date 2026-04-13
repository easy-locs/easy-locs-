/**
 * group.update — Canonical group update pipeline.
 */
import { supabase } from "@/integrations/supabase/client";
import { v2db } from "@/lib/shared/db-v2";
import { platformBus } from "@/lib/shared/platform-bus";



export async function updateOrbitGroup(params: {
  groupId: string;
  conversationId: string;
  title?: string;
  avatarUrl?: string | null;
  addMembers?: string[];
  removeMembers?: string[];
}): Promise<void> {
  const updates: Record<string, any> = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.avatarUrl !== undefined) updates.avatar_url = params.avatarUrl;

  if (Object.keys(updates).length > 0) {
    const { error } = await v2db("conversations_v2")
      .update(updates)
      .eq("id", params.conversationId);
    if (error) throw error;
  }

  platformBus.emit("orbit:group_updated", {
    groupId: params.groupId,
    conversationId: params.conversationId,
    changes: updates,
  }, "orbit");
}
