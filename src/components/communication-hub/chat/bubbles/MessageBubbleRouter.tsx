/**
 * MessageBubbleRouter — Canonical type-based routing for message content.
 * 
 * Routes by message_type to the correct dedicated bubble component:
 *   image  → ImageBubble
 *   video  → VideoBubble  
 *   voice  → VoiceBubble
 *   audio  → VoiceBubble
 *   file   → FileBubble
 *   location_static / location_live → BubbleLocationBlock
 *   text (default) → null (caller renders text content)
 *
 * RULE: Uses canonical resolveMediaRenderableSource / resolveMediaViewerSource.
 *       No inline URL resolution allowed.
 */
import { memo } from "react";
import { ImageBubble } from "./ImageBubble";
import { VideoBubble } from "./VideoBubble";
import { VoiceBubble } from "./VoiceBubble";
import { FileBubble } from "./FileBubble";
import { BubbleLocationBlock } from "../BubbleLocationBlock";
import {
  resolveMediaRenderableSource,
  resolveMediaViewerSource,
  buildMediaSourceInput,
} from "@/domains/orbit/resolvers/media-source.resolver";
import type { ChatMessage } from "../../types";

interface AttachmentInfo {
  kind: string;
  localUri?: string | null;
  remoteUrl?: string | null;
  previewDataUrl?: string | null;
  mimeType?: string | null;
  size?: number | null;
  duration?: number | null;
  uploadStatus?: string;
  uploadProgress?: number;
}

interface Props {
  msg: ChatMessage;
  isMe: boolean;
  /** Resolved attachment info from orbitStore (if available) */
  attachment?: AttachmentInfo | null;
  currentUserId?: string;
  blurred?: boolean;
}

/**
 * Detect media type from message_type, attachment kind, metadata, or URL heuristics.
 * Returns a canonical media kind or null if this is a text message.
 */
function detectMediaKind(
  msg: ChatMessage,
  attachment?: AttachmentInfo | null,
): "image" | "video" | "voice" | "file" | "location" | null {
  const msgType = msg.message_type;

  // Canonical type-based routing
  if (msgType === "image") return "image";
  if (msgType === "video") return "video";
  if (msgType === "voice" || msgType === "audio") return "voice";
  if (msgType === "file") return "file";
  if (msgType === "location_static" || msgType === "location_live") return "location";

  // Handle generic "media" type from DB — resolve from metadata
  if (msgType === "media") {
    const meta = (msg as any).metadata_json ?? (msg as any).metadata;
    const mk = meta?.media?.media_kind || meta?.media?.kind || meta?.media_kind;
    if (mk === "image") return "image";
    if (mk === "video") return "video";
    if (mk === "audio" || mk === "voice") return "voice";
    if (mk === "file") return "file";
    // Fallback: detect from mime
    const mime = (meta?.media?.mimeType || meta?.media?.mime_type || "").toLowerCase();
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "voice";
    if (meta?.media?.url || msg.attachment_url) return "file";
  }

  // Attachment kind-based routing
  if (attachment) {
    if (attachment.kind === "image") return "image";
    if (attachment.kind === "video") return "video";
    if (attachment.kind === "voice" || attachment.kind === "audio") return "voice";
    if (attachment.kind === "file") return "file";
  }

  // Legacy heuristic fallbacks
  if ((msg as any).audio_url) return "voice";

  const url = msg.attachment_url;
  if (url) {
    const clean = url.split("?")[0].toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp|heic|avif)$/.test(clean)) return "image";
    if (/\.(mp4|mov|webm|avi|mkv)$/.test(clean)) return "video";
    if (/\.(mp3|ogg|wav|m4a|aac|opus|flac)$/.test(clean)) return "voice";
    return "file";
  }

  return null;
}

function MessageBubbleRouterInner({ msg, isMe, attachment, currentUserId, blurred }: Props) {
  const kind = detectMediaKind(msg, attachment);
  if (!kind) return null; // Not a media message — caller handles text

  // Location: extract coordinates from canonical metadata first, then fallback to content regex
  if (kind === "location") {
    const meta = (msg as any).metadata_json ?? (msg as any).metadata;
    const locPayload = meta?.location;
    const metaLat = locPayload?.lat ?? meta?.lat;
    const metaLng = locPayload?.lng ?? meta?.lng;
    const metaLabel = locPayload?.label ?? locPayload?.address ?? null;
    const metaMode = locPayload?.mode ?? (msg.message_type === "location_live" ? "live" : "static");

    if (metaLat != null && metaLng != null) {
      return <BubbleLocationBlock lat={String(metaLat)} lng={String(metaLng)} label={metaLabel || msg.content?.split("\n")[0] || null} mode={metaMode} messageId={msg.id} />;
    }

    // Fallback: parse OSM link from content
    const osmMatch = msg.content?.match(/openstreetmap\.org\/\?mlat=([\d.-]+)&mlon=([\d.-]+)/);
    const lat = osmMatch?.[1];
    const lng = osmMatch?.[2];
    const label = msg.content?.split("\n")[0] || null;
    if (lat && lng) {
      return <BubbleLocationBlock lat={lat} lng={lng} label={label} mode={metaMode} messageId={msg.id} />;
    }
    return null;
  }

  // ══ CANONICAL MEDIA SOURCE RESOLUTION ══
  const meta = (msg as any).metadata_json ?? (msg as any).metadata;
  const sourceInput = buildMediaSourceInput(attachment, msg.attachment_url, meta);
  const renderUrl = resolveMediaRenderableSource(sourceInput);
  const viewerUrl = resolveMediaViewerSource(sourceInput);

  if (!renderUrl) return null;

  switch (kind) {
    case "image":
      return (
        <div className={`mb-1 ${blurred ? "blur-lg transition-all" : ""}`}>
          <ImageBubble
            renderSrc={renderUrl}
            viewerSrc={viewerUrl || renderUrl}
            isMe={isMe}
            fileName={extractFileName(renderUrl)}
            uploadProgress={attachment?.uploadProgress}
            uploadStatus={attachment?.uploadStatus}
            mediaKind="image"
          />
        </div>
      );

    case "video":
      return (
        <div className={`mb-1 ${blurred ? "blur-lg transition-all" : ""}`}>
          <VideoBubble
            src={renderUrl}
            viewerSrc={viewerUrl || renderUrl}
            isMe={isMe}
            fileName={extractFileName(renderUrl)}
            duration={attachment?.duration ?? (msg as any).video_duration_seconds}
            thumbnailUrl={attachment?.previewDataUrl ?? undefined}
            uploadProgress={attachment?.uploadProgress}
            uploadStatus={attachment?.uploadStatus}
          />
        </div>
      );

    case "voice":
      return (
        <VoiceBubble
          src={(msg as any).audio_url || renderUrl}
          durationSeconds={attachment?.duration ?? (msg as any).audio_duration_seconds ?? 0}
          isMe={isMe}
          messageId={msg.id}
          uploadProgress={attachment?.uploadProgress}
          uploadStatus={attachment?.uploadStatus}
        />
      );

    case "file":
      return (
        <div className="mb-1">
          <FileBubble
            src={renderUrl}
            isMe={isMe}
            fileName={extractFileName(renderUrl)}
            fileSize={attachment?.size ?? undefined}
            mimeType={attachment?.mimeType ?? undefined}
            uploadProgress={attachment?.uploadProgress}
            uploadStatus={attachment?.uploadStatus}
          />
        </div>
      );

    default:
      return null;
  }
}

function extractFileName(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/");
    return parts[parts.length - 1] || undefined;
  } catch {
    return url.split("/").pop() || undefined;
  }
}

export const MessageBubbleRouter = memo(MessageBubbleRouterInner);
MessageBubbleRouter.displayName = "MessageBubbleRouter";
