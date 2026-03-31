/**
 * Command Bridge — Registers orbit command handlers in the central commandBus.
 * 
 * This bridges orbitDispatch executors into the commandBus system,
 * making the commandBus the canonical internal write spine.
 * 
 * STATUS: ACTIVE_CANONICAL
 * 
 * orbitDispatch remains the public facade.
 * commandBus becomes the internal write authority.
 * 
 * Import this file once at app init to register all handlers.
 */

import { commandBus, type CommandBase, type CommandResult } from "@/lib/core/command-bus";
import { platformBus } from "@/lib/shared/platform-bus";

// ── Command Types ──

export interface OrbitSendTextCmd extends CommandBase {
  conversationId: string;
  body: string;
  encrypted?: boolean;
  replyToMessageId?: string | null;
}

export interface OrbitSendMediaCmd extends CommandBase {
  conversationId: string;
  file: File;
  caption?: string;
  uploadFn: (file: File, path: string, onProgress: (p: number) => void) => Promise<string>;
  pathPrefix: string;
}

export interface OrbitSendVoiceCmd extends CommandBase {
  conversationId: string;
  blob: Blob;
  durationSeconds: number;
  localUrl: string;
  uploadFn: (file: File, path: string) => Promise<string>;
  pathPrefix: string;
}

export interface OrbitSendLocationCmd extends CommandBase {
  conversationId: string;
  lat: number;
  lng: number;
  mode: "static" | "live";
  label?: string;
  address?: string;
}

export interface OrbitRetryCmd extends CommandBase {
  messageId: string;
}

export interface OrbitCallCmd extends CommandBase {
  peerUserId: string;
  peerName: string;
  mode: "audio" | "video";
  conversationId?: string;
}

export interface OrbitEndCallCmd extends CommandBase {
  sessionId: string;
  reason?: string;
}

// ── Register Handlers ──
// Each handler delegates to the existing orbitDispatch executors.
// This ensures the commandBus is the write spine without duplicating logic.

let registered = false;

export function registerOrbitCommands() {
  if (registered) return;
  registered = true;

  // send_text
  commandBus.register<OrbitSendTextCmd>("message.command.send_text", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "send_text",
      conversationId: cmd.conversationId,
      body: cmd.body,
      encrypted: cmd.encrypted,
      replyToMessageId: cmd.replyToMessageId,
    });
    // NOTE: orbitDispatch executors already emit orbit:message_sent — do NOT re-emit here
    return {
      success: result.ok,
      data: { messageId: result.messageId },
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // send_media
  commandBus.register<OrbitSendMediaCmd>("message.command.send_media", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "send_media",
      conversationId: cmd.conversationId,
      file: cmd.file,
      caption: cmd.caption,
      uploadFn: cmd.uploadFn,
      pathPrefix: cmd.pathPrefix,
    });
    return {
      success: result.ok,
      data: { messageId: result.messageId },
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // send_voice
  commandBus.register<OrbitSendVoiceCmd>("message.command.send_voice", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "send_voice",
      conversationId: cmd.conversationId,
      blob: cmd.blob,
      durationSeconds: cmd.durationSeconds,
      localUrl: cmd.localUrl,
      uploadFn: cmd.uploadFn,
      pathPrefix: cmd.pathPrefix,
    });
    return {
      success: result.ok,
      data: { messageId: result.messageId },
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // send_location
  commandBus.register<OrbitSendLocationCmd>("message.command.send_location", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "send_location",
      conversationId: cmd.conversationId,
      lat: cmd.lat,
      lng: cmd.lng,
      mode: cmd.mode,
      label: cmd.label,
      address: cmd.address,
    });
    return {
      success: result.ok,
      data: { messageId: result.messageId },
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // retry_message
  commandBus.register<OrbitRetryCmd>("message.command.retry", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "retry_message",
      messageId: cmd.messageId,
    });
    return {
      success: result.ok,
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // start_call
  commandBus.register<OrbitCallCmd>("call.command.start", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "start_call",
      peerUserId: cmd.peerUserId,
      peerName: cmd.peerName,
      mode: cmd.mode,
      conversationId: cmd.conversationId,
    });
    return {
      success: result.ok,
      data: { sessionId: result.sessionId },
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  // end_call
  commandBus.register<OrbitEndCallCmd>("call.command.end", async (cmd) => {
    const { orbitDispatch } = await import("@/families/orbit-dispatch");
    const result = await orbitDispatch({
      type: "end_call",
      sessionId: cmd.sessionId,
      reason: cmd.reason,
    });
    return {
      success: result.ok,
      error: result.error,
      requestId: cmd.requestId,
    };
  });

  if (import.meta.env.DEV) {
    console.log("[command-bridge] Orbit commands registered in commandBus");
  }
}
