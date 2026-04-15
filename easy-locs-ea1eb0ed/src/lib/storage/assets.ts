import { db as supabase } from "@/services/db";
import { getCurrentUser } from "@/lib/auth/profile";
import { awsConfig, getCloudFrontUrl } from "@/lib/aws/aws-client";

export async function uploadWorkspaceAsset(params: {
  workspaceId?: string;
  bucket: string;
  path: string;
  file: File;
  assetType: "avatar" | "menu_image" | "hero" | "attachment" | "document" | "logo";
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  let publicUrl: string;
  let s3Key: string | null = null;
  let storageProvider: "s3" | "supabase" = "supabase";

  if (awsConfig.hasCloudFront()) {
    try {
      const ct = params.file.type || "application/octet-stream";

      const { data, error } = await supabase.functions.invoke("s3-upload-proxy", {
        body: {
          bucket: params.bucket,
          path: params.path,
          contentType: ct,
          fileSize: params.file.size,
        },
      });

      if (!error && data?.success && data?.uploadUrl) {
        const putResp = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": ct },
          body: params.file,
        });

        if (putResp.ok) {
          s3Key = data.key;
          publicUrl = getCloudFrontUrl(data.key);
          storageProvider = "s3";
        } else {
          console.warn("[uploadWorkspaceAsset] S3 PUT failed, falling back to Supabase:", putResp.status);
          publicUrl = await uploadViaSupabase(params);
        }
      } else {
        console.warn("[uploadWorkspaceAsset] S3 proxy failed, falling back to Supabase:", error?.message || data?.error);
        publicUrl = await uploadViaSupabase(params);
      }
    } catch (e) {
      console.warn("[uploadWorkspaceAsset] S3 unavailable, falling back to Supabase:", e);
      publicUrl = await uploadViaSupabase(params);
    }
  } else {
    publicUrl = await uploadViaSupabase(params);
  }

  interface StorageAssetInsert {
    workspace_id: string | null;
    owner_user_id: string;
    bucket: string;
    path: string;
    asset_type: string;
    mime_type: string;
    file_size: number;
    metadata: Record<string, string>;
  }

  const assetRow: StorageAssetInsert = {
    workspace_id: params.workspaceId ?? null,
    owner_user_id: user.id,
    bucket: params.bucket,
    path: params.path,
    asset_type: params.assetType,
    mime_type: params.file.type,
    file_size: params.file.size,
    metadata: {
      public_url: publicUrl,
      storage_provider: storageProvider,
      ...(s3Key ? { s3_key: s3Key } : {}),
    },
  };

  const { data, error } = await supabase
    .from("storage_assets")
    .insert(assetRow)
    .select("*")
    .single();

  if (error) throw error;
  return { asset: data, publicUrl };
}

async function uploadViaSupabase(params: {
  bucket: string;
  path: string;
  file: File;
}): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, { upsert: true, contentType: params.file.type });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  return publicUrlData.publicUrl;
}
