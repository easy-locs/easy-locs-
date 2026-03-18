import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth/profile";

export async function uploadWorkspaceAsset(params: {
  workspaceId?: string;
  bucket: string;
  path: string;
  file: File;
  assetType: "avatar" | "menu_image" | "hero" | "attachment" | "document" | "logo";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, { upsert: true, contentType: params.file.type });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(params.bucket).getPublicUrl(params.path);

  const { data, error } = await supabase
    .from("storage_assets" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      owner_user_id: user.id,
      bucket: params.bucket,
      path: params.path,
      asset_type: params.assetType,
      mime_type: params.file.type,
      file_size: params.file.size,
      metadata: { public_url: publicUrlData.publicUrl },
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return { asset: data, publicUrl: publicUrlData.publicUrl };
}
