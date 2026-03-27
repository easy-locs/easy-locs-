import type { OrbitAttachmentItem, OrbitAttachmentKind } from "@/lib/orbit/orbit-attachment-types";

export function detectAttachmentKind(file: File): OrbitAttachmentKind {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  return "file";
}

export function formatBytes(size?: number | null) {
  if (!size || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[idx]}`;
}

export function buildAttachmentSummary(items: OrbitAttachmentItem[]) {
  const count = items.length;
  if (count === 0) return "";
  const imageCount = items.filter((x) => x.kind === "image").length;
  const videoCount = items.filter((x) => x.kind === "video").length;
  const fileCount = items.filter((x) => x.kind === "file" || x.kind === "pdf").length;
  const audioCount = items.filter((x) => x.kind === "audio").length;
  const parts: string[] = [];
  if (imageCount) parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
  if (videoCount) parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
  if (audioCount) parts.push(`${audioCount} audio`);
  if (fileCount) parts.push(`${fileCount} file${fileCount > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

export function normalizeMessageAttachments(raw: unknown): OrbitAttachmentItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any, index: number) => ({
      id: item?.id || `att-${index}`,
      kind: item?.kind || "file",
      name: item?.name || "Attachment",
      mimeType: item?.mimeType || null,
      sizeBytes: typeof item?.sizeBytes === "number" ? item.sizeBytes : null,
      url: item?.url || "",
      thumbnailUrl: item?.thumbnailUrl || null,
      width: typeof item?.width === "number" ? item.width : null,
      height: typeof item?.height === "number" ? item.height : null,
      durationSec: typeof item?.durationSec === "number" ? item.durationSec : null,
      viewOnce: !!item?.viewOnce,
    }))
    .filter((x) => !!x.url);
}
