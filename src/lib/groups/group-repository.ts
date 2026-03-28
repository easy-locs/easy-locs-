/**
 * group-repository — All group/channel/community DB reads/writes.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchGroups(userId: string) {
  const { data, error } = await supabase
    .from("orbit_groups")
    .select("*, orbit_group_members!inner(user_id, role)")
    .eq("orbit_group_members.user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(
  name: string,
  createdBy: string,
  groupType: string = "group",
  description?: string,
) {
  const { data, error } = await supabase
    .from("orbit_groups")
    .insert({
      name,
      created_by: createdBy,
      group_type: groupType,
      description: description ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  // Auto-add creator as admin
  await supabase.from("orbit_group_members").insert({
    group_id: data.id,
    user_id: createdBy,
    role: "admin",
  });

  return data;
}

export async function fetchGroupMessages(groupId: string, limit = 50) {
  const { data, error } = await supabase
    .from("orbit_group_messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).reverse();
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string) {
  const { data, error } = await supabase
    .from("orbit_group_messages")
    .insert({ group_id: groupId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchGroupMembers(groupId: string) {
  const { data, error } = await supabase
    .from("orbit_group_members")
    .select("*")
    .eq("group_id", groupId);
  if (error) throw error;
  return data ?? [];
}

export async function addGroupMember(groupId: string, userId: string, role = "member") {
  const { error } = await supabase
    .from("orbit_group_members")
    .insert({ group_id: groupId, user_id: userId, role });
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const { error } = await supabase
    .from("orbit_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function togglePinMessage(messageId: string, pinned: boolean) {
  const { error } = await supabase
    .from("orbit_group_messages")
    .update({ pinned })
    .eq("id", messageId);
  if (error) throw error;
}
