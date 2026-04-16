export type CopyResult = { ok: true } | { ok: false; reason: "unavailable" | "denied" };

export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (!navigator.clipboard?.writeText) {
    return { ok: false, reason: "unavailable" };
  }
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false, reason: "denied" };
  }
}
