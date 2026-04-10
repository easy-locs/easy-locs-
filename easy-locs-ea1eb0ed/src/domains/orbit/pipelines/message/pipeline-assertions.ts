/**
 * pipeline-assertions — DEV-only guards enforcing canonical pipeline invariants.
 *
 * RULES ENFORCED:
 * 1. Preview must exist before upload starts
 * 2. Bubble family must remain stable through reconcile
 * 3. Single owner per domain — no competing state holders
 * 4. Latency profiling for critical paths
 *
 * These assertions are NO-OPs in production builds.
 */
import type { MessageType, AttachmentKind } from "@/domains/orbit/types";

// ══════════════════════════════════════════════
// 1. PREVIEW BEFORE UPLOAD
// ══════════════════════════════════════════════

export function assertPreviewBeforeUpload(context: {
  attachmentId: string;
  hasLocalUri: boolean;
  hasPreview: boolean;
  uploadStatus: string;
}): void {
  if (!import.meta.env.DEV) return;
  if (context.uploadStatus !== "local" && !context.hasLocalUri && !context.hasPreview) {
    console.error("[PIPELINE_ASSERT] PREVIEW_MISSING — upload started without local preview", context);
  }
}

// ══════════════════════════════════════════════
// 2. BUBBLE FAMILY STABILITY
// ══════════════════════════════════════════════

const MEDIA_FAMILIES: Record<string, string> = {
  image: "ImageBubble",
  video: "VideoBubble",
  voice: "VoiceBubble",
  audio: "VoiceBubble",
  file: "FileBubble",
  location_static: "LocationBubble",
  location_live: "LocationBubble",
  text: "TextBubble",
};

export function assertBubbleFamilyStable(
  prevType: MessageType,
  nextType: MessageType,
  messageId: string,
): void {
  if (!import.meta.env.DEV) return;
  const prevFamily = MEDIA_FAMILIES[prevType] || "TextBubble";
  const nextFamily = MEDIA_FAMILIES[nextType] || "TextBubble";
  if (prevFamily !== nextFamily) {
    console.error("[PIPELINE_ASSERT] BUBBLE_FAMILY_UNSTABLE", {
      messageId, prevType, nextType, prevFamily, nextFamily,
    });
  }
}

// ══════════════════════════════════════════════
// 3. ATTACHMENT KIND STABILITY
// ══════════════════════════════════════════════

export function assertAttachmentKindStable(
  prevKind: AttachmentKind,
  nextKind: AttachmentKind,
  attachmentId: string,
): void {
  if (!import.meta.env.DEV) return;
  if (prevKind !== nextKind) {
    console.error("[PIPELINE_ASSERT] ATTACHMENT_KIND_UNSTABLE", {
      attachmentId, prevKind, nextKind,
    });
  }
}

// ══════════════════════════════════════════════
// 4. SINGLE ACTIVE FLOW GUARD
// ══════════════════════════════════════════════

const activeFlows = new Map<string, number>();

export function assertSingleActiveFlow(flowKey: string): boolean {
  if (!import.meta.env.DEV) return true;
  const now = Date.now();
  const lastStart = activeFlows.get(flowKey);
  if (lastStart && now - lastStart < 500) {
    console.error("[PIPELINE_ASSERT] DUPLICATE_FLOW — concurrent execution detected", {
      flowKey, lastStartMs: now - lastStart,
    });
    return false;
  }
  activeFlows.set(flowKey, now);
  return true;
}

export function releaseFlow(flowKey: string): void {
  activeFlows.delete(flowKey);
}

// ══════════════════════════════════════════════
// 5. LATENCY PROFILER (DEV-only)
// ══════════════════════════════════════════════

const LATENCY_THRESHOLD_MS: Record<string, number> = {
  tap_to_preview: 100,
  preview_to_upload_start: 50,
  tap_to_call_ui: 150,
  tap_to_local_stream: 300,
};

interface LatencyMark {
  label: string;
  startMs: number;
  endMs?: number;
}

const pendingMarks = new Map<string, LatencyMark>();

export function markLatencyStart(label: string): void {
  if (!import.meta.env.DEV) return;
  pendingMarks.set(label, { label, startMs: performance.now() });
}

export function markLatencyEnd(label: string): void {
  if (!import.meta.env.DEV) return;
  const mark = pendingMarks.get(label);
  if (!mark) return;
  const elapsed = performance.now() - mark.startMs;
  const threshold = LATENCY_THRESHOLD_MS[label] ?? 200;
  
  if (elapsed > threshold) {
    console.warn(`[LATENCY] ${label}: ${elapsed.toFixed(1)}ms (threshold: ${threshold}ms)`);
  } else {
    console.debug(`[LATENCY] ${label}: ${elapsed.toFixed(1)}ms ✓`);
  }
  pendingMarks.delete(label);
}

// ══════════════════════════════════════════════
// 6. CONVERSATION SCOPE GUARD
// ══════════════════════════════════════════════

export function assertConversationScoped(
  messageConversationId: string,
  expectedConversationId: string,
  context: string,
): void {
  if (!import.meta.env.DEV) return;
  if (messageConversationId !== expectedConversationId) {
    console.error("[PIPELINE_ASSERT] CROSS_CONVERSATION_LEAK", {
      context, expected: expectedConversationId, actual: messageConversationId,
    });
  }
}
