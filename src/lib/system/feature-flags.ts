import { supabase } from "@/integrations/supabase/client";

export async function getFeatureFlag(params: {
  workspaceId?: string;
  flagKey: string;
}): Promise<any> {
  const { data, error } = await (supabase as any)
    .from("system_feature_flags")
    .select("flag_value")
    .eq("workspace_id", params.workspaceId ?? null)
    .eq("flag_key", params.flagKey)
    .maybeSingle();

  if (error) throw error;
  return data?.flag_value ?? false;
}

export async function setFeatureFlag(params: {
  workspaceId?: string;
  flagKey: string;
  flagValue: any;
  description?: string;
}) {
  const { data, error } = await (supabase as any)
    .from("system_feature_flags")
    .upsert(
      {
        workspace_id: params.workspaceId ?? null,
        flag_key: params.flagKey,
        flag_value: params.flagValue,
        description: params.description ?? null,
      },
      { onConflict: "workspace_id,flag_key" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
