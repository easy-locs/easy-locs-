/**
 * ORBIT ULTRA STREAM ENGINE — Barrel export.
 *
 * Unified entry for all stream infrastructure:
 * - Flow core (queue + version)
 * - Preview engine (instant UI)
 * - Stream upload (chunked + progress)
 * - Voice stream (live waveform)
 * - Offline queue (crash-safe)
 * - Multi-device sync
 * - Self-heal
 */

// ── Flow Core ──
export { enqueue, createFlowId, applyVersion, getQueueDepth, getActiveQueues } from "./flow-core";

// ── Preview Engine ──
export { createPreview, emitPreview, emitProgress, emitReconcile } from "./preview-engine";
export type { PreviewMessage } from "./preview-engine";

// ── Stream Upload ──
export { streamUpload, createLocalPreviewUrl, revokeLocalPreviewUrl } from "./stream-upload";
export type { UploadResult } from "./stream-upload";

// ── Voice Stream ──
export { startVoiceStream } from "./voice-stream";
export type { VoiceStreamHandle } from "./voice-stream";

// ── Offline Queue ──
export { offlineQueue } from "./offline-queue";
export type { OfflineTask } from "./offline-queue";

// ── Multi-Device Sync ──
export { installMultiDeviceSync, broadcastToDevices, getDeviceId } from "./multi-device-sync";

// ── Self-Heal ──
export { startOrbitSelfHeal } from "./self-heal";
