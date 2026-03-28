/**
 * collaboration.repository — All DB operations for team collaboration page.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchUserOrgDetails(userId: string) {
  const { data: member } = await supabase.from("org_members").select("org_id").eq("user_id", userId).limit(1).single();
  if (!member) return null;
  const { data: org } = await supabase.from("orgs").select("*").eq("id", member.org_id).single();
  return org;
}

export async function fetchOrgMembers(orgId: string) {
  const { data } = await supabase.from("org_members").select("id, user_id, role, created_at").eq("org_id", orgId);
  if (!data) return [];
  const profiles = await Promise.all(
    data.map(async (m) => {
      const { data: p } = await supabase.from("profiles").select("email, name").eq("id", m.user_id).single();
      return { ...m, email: p?.email || "", name: p?.name || "" };
    })
  );
  return profiles;
}

export async function fetchCollabInvitations(orgId: string) {
  const { data } = await (supabase as any)
    .from("collaboration_invitations")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  return (data || []) as Array<{
    id: string; email: string; role: string; status: string;
    created_at: string; expires_at: string;
  }>;
}

export async function insertInvitation(orgId: string, invitedBy: string, email: string, role: string) {
  const { error } = await (supabase as any).from("collaboration_invitations").insert({
    org_id: orgId, invited_by: invitedBy, email, role,
  });
  if (error) throw error;
}

export async function deleteInvitation(id: string) {
  const { error } = await (supabase as any).from("collaboration_invitations").delete().eq("id", id);
  if (error) throw error;
}

export async function removeOrgMember(memberId: string) {
  const { error } = await supabase.from("org_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function updateOrgMemberRole(memberId: string, newRole: string) {
  const { error } = await supabase.from("org_members").update({ role: newRole } as any).eq("id", memberId);
  if (error) throw error;
}
