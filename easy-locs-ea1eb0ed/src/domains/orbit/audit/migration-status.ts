/**
 * Legacy Migration Status Registry — Documents which paths are canonical vs legacy.
 * 
 * This file is READ-ONLY documentation. It drives no runtime behavior.
 * Used by scanners and auditors to track migration progress.
 */

export const MIGRATION_STATUS = {
  // ═══ WRITE SIDE ═══
  writePaths: [
    {
      path: "orbitDispatch",
      status: "ACTIVE_CANONICAL" as const,
      role: "Public facade for all Orbit write commands",
      backed_by: "commandBus (via command-bridge.ts)",
    },
    {
      path: "commandBus",
      status: "ACTIVE_CANONICAL" as const,
      role: "Internal write spine — all commands registered here",
      note: "orbitDispatch delegates to commandBus handlers",
    },
    {
      path: "useMessageSender",
      status: "LEGACY_TO_REMOVE" as const,
      role: "Legacy message send hook — still referenced by HudChatPanel",
      migration: "Replace with orbitDispatch exclusively",
    },
    {
      path: "families/send/send-text.ts",
      status: "PASSIVE_WRAPPER" as const,
      role: "Direct DB insert used by executeSendText",
      migration: "Will be internal-only when useMessageSender is retired",
    },
  ],

  // ═══ READ SIDE ═══
  readPaths: [
    {
      path: "selectMessageBubbleModel",
      status: "ACTIVE_CANONICAL" as const,
      role: "Pure projection for message bubble rendering",
      consumers: ["useBubbleReadModel", "ChatMessageBubble"],
    },
    {
      path: "selectAttachmentRenderModel",
      status: "ACTIVE_CANONICAL" as const,
      role: "Pure projection for attachment rendering",
      consumers: ["MessageBubbleRouter"],
    },
    {
      path: "selectMediaViewerModel",
      status: "ACTIVE_CANONICAL" as const,
      role: "Pure projection for fullscreen media viewer",
      consumers: ["FullscreenMediaViewer"],
    },
    {
      path: "resolveSenderDisplay",
      status: "ACTIVE_CANONICAL" as const,
      role: "Canonical sender identity resolution",
      note: "Used by read models, not directly by components",
    },
    {
      path: "resolveMediaRenderableSource",
      status: "ACTIVE_CANONICAL" as const,
      role: "Canonical media source for bubble render (T0 optimized)",
    },
    {
      path: "resolveMediaViewerSource",
      status: "ACTIVE_CANONICAL" as const,
      role: "Canonical media source for viewer (quality optimized)",
    },
  ],

  // ═══ GALLERY SAVE ═══
  gallerySave: [
    {
      path: "saveMediaToGallery",
      status: "ACTIVE_CANONICAL" as const,
      role: "Single entry point for all gallery saves (image/video/audio)",
      backed_by: "commandBus → attachment.command.save_to_gallery",
    },
    {
      path: "FullscreenMediaViewer handleDownload",
      status: "ACTIVE_CANONICAL" as const,
      role: "Calls saveMediaToGallery — no inline download",
    },
  ],

  // ═══ EVENT BUS ═══
  eventBus: [
    {
      path: "platformBus",
      status: "ACTIVE_CANONICAL" as const,
      role: "Cross-module event propagation (sync)",
    },
    {
      path: "commandBus",
      status: "ACTIVE_CANONICAL" as const,
      role: "Write command dispatch with idempotency guard",
      note: "Not an event bus — executes commands, emits result events via platformBus",
    },
  ],
} as const;

export type MigrationStatus = "ACTIVE_CANONICAL" | "PASSIVE_WRAPPER" | "LEGACY_READ_ONLY" | "LEGACY_TO_REMOVE";
