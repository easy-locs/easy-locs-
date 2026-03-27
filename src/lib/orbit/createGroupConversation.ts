import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export type GroupParticipantInput = {
  userId: string;
  orbitId?: string | null;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: "owner" | "admin" | "member";
};

export type CreateGroupConversationInput = {
  title: string;
  participants: GroupParticipantInput[];
  createdByUserId: string;
  createdByOrbitId?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
};

export async function createGroupConversation(input: CreateGroupConversationInput) {
  const normalizedParticipants = input.participants.map((p) => ({
    userId: p.userId,
    orbitId: p.orbitId ?? null,
    email: p.email ?? null,
    displayName: p.displayName ?? null,
    avatarUrl: p.avatarUrl ?? null,
    role: p.role ?? "member",
  }));

  const ownerAlreadyIncluded = normalizedParticipants.some(
    (p) => p.userId === input.createdByUserId
  );

  const participants = ownerAlreadyIncluded
    ? normalizedParticipants.map((p) =>
        p.userId === input.createdByUserId ? { ...p, role: "owner" } : p
      )
    : [
        {
          userId: input.createdByUserId,
          orbitId: input.createdByOrbitId ?? null,
          email: null,
          displayName: null,
          avatarUrl: null,
          role: "owner" as const,
        },
        ...normalizedParticipants,
      ];

  const now = new Date().toISOString();

  const { data, error } = await db
    .from("conversations_v2")
    .insert({
      type: "group",
      title: input.title,
      participants,
      metadata: {
        group_avatar_url: input.avatarUrl ?? null,
        description: input.description ?? null,
        created_by_user_id: input.createdByUserId,
      },
      last_message_at: now,
      last_message_preview: null,
      updated_at: now,
      created_by_orbit_id: input.createdByOrbitId ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
