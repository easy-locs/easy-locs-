import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage } from "@/lib/debug/debug-helpers";

export async function shareLink(params: { title?: string; url: string }): Promise<{
  ok: boolean;
  mode?: "native" | "clipboard";
  error?: string;
}> {
  const { title = "Easy Locs", url } = params;

  debugLog.info("share", "share_start", url);

  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      debugLog.success("share", "share_native_success", url);
      return { ok: true, mode: "native" };
    }

    await navigator.clipboard.writeText(url);
    debugLog.success("share", "share_clipboard_success", url);
    return { ok: true, mode: "clipboard" };
  } catch (error: any) {
    const msg = safeErrorMessage(error);
    debugLog.error("share", "share_failed", msg, { url });
    return { ok: false, error: msg };
  }
}
