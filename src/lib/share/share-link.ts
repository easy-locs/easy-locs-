/**
 * Share link utility — native share or clipboard fallback.
 */
export async function shareLink(params: { title?: string; url: string }): Promise<{
  ok: boolean;
  mode?: "native" | "clipboard";
  error?: string;
}> {
  const { title = "Easy Locs", url } = params;
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
