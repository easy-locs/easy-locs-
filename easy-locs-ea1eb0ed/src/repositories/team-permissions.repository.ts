/**
 * team-permissions.repository — DB operations for TeamPermissionsPage.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchTeamData() {
  const [m, t] = await Promise.all([
    supabase.from("team_workspace_members").select("*").limit(200),
    supabase.from("permission_templates" as any).select("*").limit(50),
  ]);
  return { members: (m.data as any[]) ?? [], templates: (t.data as any[]) ?? [] };
}

export async function refreshMembers() {
  const { data } = await supabase.from("team_workspace_members").select("*").limit(200);
  return (data as any[]) ?? [];
}
