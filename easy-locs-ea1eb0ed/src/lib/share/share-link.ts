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
      try {
        await navigator.share({ title, url });
        debugLog.success("share", "share_native_success", url);
        return { ok: true, mode: "native" };
      } catch (shareErr: unknown) {
        if (shareErr instanceof DOMException && shareErr.name === "AbortError") {
          debugLog.info("share", "share_dismissed", url);
        }
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      debugLog.success("share", "share_clipboard_success", url);
      return { ok: true, mode: "clipboard" };
    }

    debugLog.error("share", "share_unavailable", "Neither share nor clipboard API available", { url });
    return { ok: false, error: "Sharing is not available on this device" };
  } catch (error: unknown) {
    const msg = safeErrorMessage(error);
    debugLog.error("share", "share_failed", msg, { url });
    return { ok: false, error: msg };
  }
}
