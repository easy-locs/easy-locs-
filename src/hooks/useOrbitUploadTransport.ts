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

    const { data } = (supabase as any).storage
      .from("chat-attachments")
      .getPublicUrl(fileName);

    onProgress?.(100);

    return {
      path: fileName,
      publicUrl: data?.publicUrl as string,
    };
  };

  return { uploadSingleFile };
}
