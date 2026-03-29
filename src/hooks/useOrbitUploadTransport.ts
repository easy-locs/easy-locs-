/**
 * useOrbitUploadTransport — Canonical upload transport hook.
 * Routes through the transport engine with compression policy, retry, and progress.
 */
import { TransportPolicy } from "@/families/media/transport/transport-policy";
import { transportUploadWithPrepare, type UploadResult } from "@/families/media/transport/transport-engine";

export function useOrbitUploadTransport() {
  const uploadSingleFile = async (params: {
    file: File;
    pathPrefix?: string;
    onProgress?: (progress: number) => void;
  }): Promise<{ path: string; publicUrl: string }> => {
    const { file, pathPrefix = "orbit-media", onProgress } = params;

    const decision = TransportPolicy.decide(file);

    const result = await transportUploadWithPrepare(file, {
      pathPrefix,
      compress: decision.shouldCompress,
      maxDimension: decision.maxDimension || undefined,
      quality: decision.quality || undefined,
      callbacks: {
        onProgress,
      },
    });

    return {
      path: result.path,
      publicUrl: result.publicUrl,
    };
  };

  return { uploadSingleFile };
}
