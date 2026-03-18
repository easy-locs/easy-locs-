/**
 * Apply a permission template to a workspace member.
 */
import { supabase } from "@/integrations/supabase/client";

export async function applyPermissionTemplate(params: {
  workspaceMemberId: string;
  templateKey: string;
}) {
  const { data: tpl, error: tplError } = await supabase
    .from("permission_templates" as any)
    .select("*")
    .eq("template_key", params.templateKey)
    .single();

  if (tplError || !tpl) throw tplError ?? new Error("Template not found");

  const { error } = await supabase
    .from("team_workspace_members")
    .update({ permissions: (tpl as any).permissions })
    .eq("id", params.workspaceMemberId);

  if (error) throw error;
  return { ok: true };
}
