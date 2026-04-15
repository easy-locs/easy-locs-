/**
 * Gallery Save Service — Atomic service for saving media to device gallery.
 *
 * Supports: image, video, audio/voice.
 * Uses canonical source resolution.
 * Idempotent: tracks in-flight saves to prevent duplicates.
 *
 * RULE: This is the SINGLE entry point for gallery saves.
 * No component may download/save media without going through this service.
 */

import { resolveMediaViewerSource, type MediaSourceInput } from "@/domains/orbit/resolvers/media-source.resolver";
import { platformBus } from "@/lib/shared/platform-bus";
import { commandBus, type CommandBase, type CommandResult, createRequestId } from "@/lib/core/command-bus";

// ── Types ──

export interface GallerySaveCommand extends CommandBase {
  conversationId: string;
  attachmentId: string;
  messageId?: string;
  mediaType: "image" | "video" | "audio" | "voice" | "file";
  source: MediaSourceInput;
  fileName?: string;
}

export interface GallerySaveResult {
  saved: boolean;
  method: "download" | "capacitor" | "share";
  url: string;
}

// ── In-flight tracker (prevents concurrent saves of same attachment) ──

const inflightSaves = new Set<string>();

function getSaveKey(conversationId: string, attachmentId: string): string {
  return `${conversationId}::${attachmentId}`;
}

// ── Source Resolution ──

/**
 * Resolve the best downloadable source for gallery save.
 * Priority: remoteUrl > previewDataUrl > localUri > legacy fallbacks
 */
export function resolveGallerySaveSource(input: MediaSourceInput): string | null {
  // Same priority as viewer — prefer remote for quality
  return resolveMediaViewerSource(input);
}

// ── Atomic Save Services ──

async function downloadViaAnchor(url: string, fileName: string): Promise<void> {
  // Try fetch + blob for cross-origin
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Cleanup after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    }, 1000);
  } catch {
    // Fallback: direct anchor (may open in new tab for cross-origin)
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

async function saveViaCapacitor(url: string, fileName: string): Promise<boolean> {
  try {
    // Check if Capacitor Filesystem is available
    const { Filesystem, Directory } = await import("@capacitor/filesystem" as any);
    const resp = await fetch(url);
    const blob = await resp.blob();
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Main Save Handler ──

async function handleGallerySave(cmd: GallerySaveCommand): Promise<CommandResult<GallerySaveResult>> {
  const saveKey = getSaveKey(cmd.conversationId, cmd.attachmentId);

  // Concurrent save guard
  if (inflightSaves.has(saveKey)) {
    return {
      success: false,
      error: "save_already_in_flight",
      requestId: cmd.requestId,
    };
  }

  inflightSaves.add(saveKey);

  try {
    // Resolve best source
    const url = resolveGallerySaveSource(cmd.source);
    if (!url) {
      platformBus.emit("attachment:gallery_failed", {
        attachmentId: cmd.attachmentId,
        conversationId: cmd.conversationId,
        reason: "no_source",
      }, "system");
      return {
        success: false,
        error: "no_downloadable_source",
        requestId: cmd.requestId,
      };
    }

    // Derive filename
    const ext = getExtensionForType(cmd.mediaType);
    const fileName = cmd.fileName || `${cmd.mediaType}_${Date.now()}${ext}`;

    // Try Capacitor first (native), fallback to web download
    const savedNative = await saveViaCapacitor(url, fileName);
    const method = savedNative ? "capacitor" : "download";

    if (!savedNative) {
      await downloadViaAnchor(url, fileName);
    }

    // Emit success event
    platformBus.emit("attachment:gallery_saved", {
      attachmentId: cmd.attachmentId,
      conversationId: cmd.conversationId,
      messageId: cmd.messageId,
      mediaType: cmd.mediaType,
      method,
      url,
    }, "system");

    return {
      success: true,
      data: { saved: true, method, url },
      requestId: cmd.requestId,
    };
  } catch (err: any) {
    platformBus.emit("attachment:gallery_failed", {
      attachmentId: cmd.attachmentId,
      conversationId: cmd.conversationId,
      reason: err.message,
    }, "system");

    return {
      success: false,
      error: err.message || "save_failed",
      requestId: cmd.requestId,
    };
  } finally {
    inflightSaves.delete(saveKey);
  }
}

function getExtensionForType(mediaType: string): string {
  switch (mediaType) {
    case "image": return ".jpg";
    case "video": return ".mp4";
    case "audio":
    case "voice": return ".m4a";
    case "file": return "";
    default: return "";
  }
}

// ── Register Command ──

commandBus.register("attachment.command.save_to_gallery", handleGallerySave);

// ── Public API ──

export function saveMediaToGallery(params: {
  conversationId: string;
  attachmentId: string;
  messageId?: string;
  mediaType: "image" | "video" | "audio" | "voice" | "file";
  source: MediaSourceInput;
  fileName?: string;
  actorId: string;
}): Promise<CommandResult<GallerySaveResult>> {
  const cmd: GallerySaveCommand = {
    ...params,
    requestId: createRequestId(),
    timestamp: new Date().toISOString(),
  };
  return commandBus.execute("attachment.command.save_to_gallery", cmd);
}
