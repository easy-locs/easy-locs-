/**
 * team-permissions.repository — DB operations for TeamPermissionsPage.
 */
import { db } from "@/services/db";

export async function fetchTeamData() {
  const [m, t] = await Promise.all([
    db("team_workspace_members").select("*").limit(200),
    db("permission_templates" as any).select("*").limit(50),
  ]);
  return { members: (m.data as any[]) ?? [], templates: (t.data as any[]) ?? [] };
}

export async function refreshMembers() {
  const { data } = await db("team_workspace_members").select("*").limit(200);
  return (data as any[]) ?? [];
}
