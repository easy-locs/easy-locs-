import { db } from "@/services/db";

export interface DownloadedImage {
  originalUrl: string;
  hostedUrl: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  failed: boolean;
  failReason: string | null;
}

export async function downloadAndHostImages(
  urls: string[],
  entityId: string,
): Promise<DownloadedImage[]> {
  if (urls.length === 0) return [];

  try {
    const { data, error } = await db.functions.invoke("process-onboarding-media", {
      body: { urls, entityId },
    });

    if (error) throw error;

    const results: DownloadedImage[] = data?.results ?? [];
    return results;
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : "Edge function call failed";
    console.error("[media.download.service] Edge function error:", reason);
    return urls.map((url) => ({
      originalUrl: url,
      hostedUrl: url,
      thumbUrl: null,
      width: 0,
      height: 0,
      fileSize: 0,
      format: "unknown",
      failed: true,
      failReason: reason,
    }));
  }
}

export async function downloadAndHostSingleImage(
  url: string | null | undefined,
  entityId: string,
  label: string,
): Promise<{ hostedUrl: string | null; meta: DownloadedImage | null }> {
  if (!url) return { hostedUrl: null, meta: null };
  const results = await downloadAndHostImages([url], `${entityId}/${label}`);
  const result = results[0];
  if (!result || result.failed) return { hostedUrl: url, meta: result ?? null };
  return { hostedUrl: result.hostedUrl, meta: result };
}
