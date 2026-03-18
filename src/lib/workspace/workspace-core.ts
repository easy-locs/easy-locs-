import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser, updateMyProfile } from "@/lib/auth/profile";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createWorkspace(params: {
  name: string;
  workspaceType?: "business" | "personal" | "enterprise";
  currency?: string;
  city?: string;
  countryCode?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const slug = `${slugify(params.name)}-${user.id.slice(0, 6)}`;

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces" as any)
    .insert({
      name: params.name,
      slug,
      owner_user_id: user.id,
      workspace_type: params.workspaceType ?? "business",
    } as any)
    .select("*")
    .single();

  if (workspaceError) throw workspaceError;

  const { error: memberError } = await supabase
    .from("workspace_members" as any)
    .insert({
      workspace_id: (workspace as any).id,
      user_id: user.id,
      role: "owner",
      status: "active",
    } as any);

  if (memberError) throw memberError;

  const { error: settingsError } = await supabase
    .from("workspace_settings" as any)
    .insert({
      workspace_id: (workspace as any).id,
      currency: params.currency ?? "AED",
      city: params.city ?? "Dubai",
      country_code: params.countryCode ?? "AE",
    } as any);

  if (settingsError) throw settingsError;

  await updateMyProfile({ defaultWorkspaceId: (workspace as any).id });

  return workspace as any;
}

export async function getMyWorkspaces() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("workspace_members" as any)
    .select("*, workspaces (*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as any[];
}

export async function inviteWorkspaceMember(params: {
  workspaceId: string;
  userId: string;
  role?: string;
}) {
  const { data, error } = await supabase
    .from("workspace_members" as any)
    .insert({
      workspace_id: params.workspaceId,
      user_id: params.userId,
      role: params.role ?? "member",
      status: "active",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
