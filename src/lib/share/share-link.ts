/**
 * Share link utility — native share or clipboard fallback.
 */
export async function shareLink(
  url: string,
  title = "Easy-Locs"
): Promise<{ ok: boolean; mode?: "native" | "clipboard"; error?: string }> {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return { ok: true, mode: "native" };
    }
    await navigator.clipboard.writeText(url);
    return { ok: true, mode: "clipboard" };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Share failed" };
  }
}
