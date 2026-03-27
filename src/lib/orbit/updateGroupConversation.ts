import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function updateGroupConversation(
  conversationId: string,
  updates: {
    title?: string;
    description?: string | null;
    avatarUrl?: string | null;
    participants?: any[];
  }
) {
  const { data: current, error: readError } = await db
    .from("conversations_v2")
    .select("id, metadata")
    .eq("id", conversationId)
    .single();

  if (readError) throw readError;

  const metadata = {
    ...(current?.metadata || {}),
    ...(updates.description !== undefined
      ? { description: updates.description }
      : {}),
    ...(updates.avatarUrl !== undefined
      ? { group_avatar_url: updates.avatarUrl }
      : {}),
  };

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    metadata,
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.participants !== undefined) payload.participants = updates.participants;

  const { data, error } = await db
    .from("conversations_v2")
    .update(payload)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
