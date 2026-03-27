import { supabase } from "@/integrations/supabase/client";

export function useOrbitUploadTransport() {
  const uploadSingleFile = async (params: {
    file: File;
    pathPrefix?: string;
    onProgress?: (progress: number) => void;
  }) => {
    const { file, pathPrefix = "orbit-media", onProgress } = params;

    const fileName = `${pathPrefix}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}-${file.name.replace(/\s+/g, "-")}`;

    onProgress?.(10);

    const { error } = await (supabase as any).storage
      .from("chat-attachments")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    onProgress?.(85);

    // Use signed URL (works for both public and private buckets)
    const { data: signedData } = await (supabase as any).storage
      .from("chat-attachments")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    // Fallback to public URL if signed URL fails
    const finalUrl = signedData?.signedUrl
      || (supabase as any).storage.from("chat-attachments").getPublicUrl(fileName)?.data?.publicUrl;

    onProgress?.(100);

    return {
      path: fileName,
      publicUrl: finalUrl as string,
    };
  };

  return { uploadSingleFile };
}
