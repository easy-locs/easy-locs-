import { db as supabase } from "@/services/db";

export async function uploadFile(params: {
  bucket: "property-media" | "lease-documents" | "avatars";
  path: string;
  file: File;
  upsert?: boolean;
}) {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, {
      upsert: params.upsert ?? true,
    });

  if (error) throw error;
  return data;
}

export function getPublicFileUrl(bucket: "property-media" | "avatars", path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
