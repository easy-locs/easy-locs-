/**
 * OrbitDispatch — Canonical Action Pipeline.
 * Single entry point for ALL Orbit user actions.
 *
 * Pipeline per command:
 * 1. validate — reject invalid commands
 * 2. resolve identity — get auth user + orbit id
 * 3. optimistic (where applicable)
 * 4. transport — delegate to send family / call repository
 * 5. reconcile — handled by send family internally
 * 6. domain events — emitted by send family via platformBus
 *
 * This dispatcher is the ONLY layer that resolves identity context.
 * Send families receive a ready-to-use SendContext.
 */
import type {
  OrbitCommand,
  OrbitCommandResult,
  SendTextCommand,
  SendMediaCommand,
  SendVoiceCommand,
  SendLocationCommand,
  StartCallCommand,
  AcceptCallCommand,
  EndCallCommand,
  EditMessageCommand,
  ReplyCommand,
} from "./orbit-commands";
import { getCurrentUserId } from "@/families/identity";
import { getOrbitIdentity } from "@/hooks/useOrbitIdentity";
import type { SendContext } from "@/families/send/send-context";

// ── Idempotency ──
const recentKeys = new Set<string>();
const IDEMPOTENCY_TTL = 5_000;

function idempotencyKey(cmd: OrbitCommand): string {
  switch (cmd.type) {
    case "send_text":
    case "reply":
      return `${cmd.type}:${cmd.conversationId}:${(cmd as any).body?.slice(0, 60)}:${Math.floor(Date.now() / 1000)}`;
    case "send_media":
      return `send_media:${cmd.conversationId}:${cmd.file.name}:${cmd.file.size}`;
    case "send_voice":
      return `send_voice:${cmd.conversationId}:${cmd.durationSeconds}:${Date.now()}`;
    case "send_location":
      return `send_location:${cmd.conversationId}:${cmd.lat}:${cmd.lng}`;
    case "start_call":
      return `start_call:${cmd.peerUserId}:${cmd.mode}`;
    case "accept_call":
      return `accept_call:${cmd.sessionId}`;
    case "end_call":
      return `end_call:${cmd.sessionId}`;
    case "edit_message":
      return `edit_message:${cmd.messageId}:${Date.now()}`;
  }
}

function checkIdempotency(key: string): boolean {
  if (recentKeys.has(key)) return false;
  recentKeys.add(key);
  setTimeout(() => recentKeys.delete(key), IDEMPOTENCY_TTL);
  return true;
}

// ── Context resolution ──
async function resolveContext(conversationId: string): Promise<SendContext> {
  const userId = await getCurrentUserId();
  const orbit = getOrbitIdentity();
  return {
    conversationId,
    senderUserId: userId,
    senderOrbitId: orbit?.orbitId || `orbit_${userId.slice(0, 12)}`,
    receiverOrbitId: null, // resolved per-command if needed
    orgId: null,
  };
}

// ── Handlers ──

async function handleSendText(cmd: SendTextCommand): Promise<OrbitCommandResult> {
  const { sendText } = await import("@/families/send/send-text");
  const ctx = await resolveContext(cmd.conversationId);
  const data = await sendText(ctx, cmd.body, {
    encrypted: cmd.encrypted,
    replyToMessageId: cmd.replyToMessageId,
    category: cmd.category,
    locale: cmd.locale,
    securityLevel: cmd.securityLevel,
    disappearTTL: cmd.disappearTTL,
    _traceId: cmd._traceId,
  });
  return { ok: true, messageId: data?.id };
}

async function handleSendMedia(cmd: SendMediaCommand): Promise<OrbitCommandResult> {
  const { sendMediaOptimistic } = await import("@/families/send/send-media-optimistic");
  const ctx = await resolveContext(cmd.conversationId);
  let resultId: string | undefined;
  await sendMediaOptimistic(ctx, {
    file: cmd.file,
    caption: cmd.caption,
    viewOnce: cmd.viewOnce,
    disappearAt: cmd.disappearAt,
    uploadFn: cmd.uploadFn,
    pathPrefix: cmd.pathPrefix,
  }, {
    onOptimisticCreated: (id) => { resultId = id; },
  });
  return { ok: true, messageId: resultId };
}

async function handleSendVoice(cmd: SendVoiceCommand): Promise<OrbitCommandResult> {
  const { sendVoiceOptimistic } = await import("@/families/send/send-voice-optimistic");
  const ctx = await resolveContext(cmd.conversationId);
  const storagePath = `${cmd.pathPrefix}/${cmd.conversationId}/${Date.now()}.webm`;
  const mins = Math.floor(cmd.durationSeconds / 60);
  const secs = Math.round(cmd.durationSeconds % 60);
  const durationLabel = `${mins}:${secs.toString().padStart(2, "0")}`;
  await sendVoiceOptimistic(ctx, {
    blob: cmd.blob,
    localUrl: cmd.localUrl,
    durationSeconds: cmd.durationSeconds,
    durationLabel,
    uploadFn: cmd.uploadFn as any,
    storagePath,
  });
  return { ok: true };
}

async function handleSendLocation(cmd: SendLocationCommand): Promise<OrbitCommandResult> {
  const { sendLocationOptimistic } = await import("@/families/send/send-location-optimistic");
  const ctx = await resolveContext(cmd.conversationId);
  await sendLocationOptimistic(ctx, {
    lat: cmd.lat,
    lng: cmd.lng,
    type: cmd.mode,
    label: cmd.label,
    address: cmd.address,
  });
  return { ok: true };
}

async function handleStartCall(cmd: StartCallCommand): Promise<OrbitCommandResult> {
  const { createOutgoingCallSession } = await import("@/repositories/communication.repository");
  const userId = await getCurrentUserId();
  const orbit = getOrbitIdentity();
  const session = await createOutgoingCallSession({
    callerUserId: userId,
    callerOrbitId: orbit?.orbitId || `orbit_${userId.slice(0, 12)}`,
    receiverUserId: cmd.peerUserId,
    receiverOrbitId: cmd.peerOrbitId || null,
    conversationId: cmd.conversationId || null,
    mode: cmd.mode,
  });
  return { ok: true, sessionId: session?.id };
}

async function handleAcceptCall(cmd: AcceptCallCommand): Promise<OrbitCommandResult> {
  const { acceptCallSession } = await import("@/repositories/communication.repository");
  await acceptCallSession(cmd.sessionId);
  return { ok: true, sessionId: cmd.sessionId };
}

async function handleEndCall(cmd: EndCallCommand): Promise<OrbitCommandResult> {
  const { hangupCallSession } = await import("@/repositories/communication.repository");
  await hangupCallSession(cmd.sessionId, cmd.reason || "hangup");
  return { ok: true, sessionId: cmd.sessionId };
}

async function handleEditMessage(cmd: EditMessageCommand): Promise<OrbitCommandResult> {
  const { updateMessageFields } = await import("@/repositories/communication.repository");
  await updateMessageFields(cmd.messageId, { body: cmd.newBody });
  return { ok: true, messageId: cmd.messageId };
}

async function handleReply(cmd: ReplyCommand): Promise<OrbitCommandResult> {
  const { sendText } = await import("@/families/send/send-text");
  const ctx = await resolveContext(cmd.conversationId);
  const data = await sendText(ctx, cmd.body, {
    encrypted: cmd.encrypted,
    replyToMessageId: cmd.replyToMessageId,
    category: cmd.category,
    locale: cmd.locale,
    _traceId: cmd._traceId,
  });
  return { ok: true, messageId: data?.id };
}

// ── Dispatcher ──

const HANDLERS: Record<OrbitCommand["type"], (cmd: any) => Promise<OrbitCommandResult>> = {
  send_text: handleSendText,
  send_media: handleSendMedia,
  send_voice: handleSendVoice,
  send_location: handleSendLocation,
  start_call: handleStartCall,
  accept_call: handleAcceptCall,
  end_call: handleEndCall,
  edit_message: handleEditMessage,
  reply: handleReply,
};

/**
 * orbitDispatch — Execute a canonical Orbit command.
 * This is the ONLY function the UI layer should call for actions.
 */
export async function orbitDispatch(cmd: OrbitCommand): Promise<OrbitCommandResult> {
  // 1. Validate
  const handler = HANDLERS[cmd.type];
  if (!handler) {
    return { ok: false, error: `Unknown command type: ${cmd.type}` };
  }

  // 2. Idempotency
  const key = idempotencyKey(cmd);
  if (!checkIdempotency(key)) {
    if (import.meta.env.DEV) {
      console.warn(`[orbitDispatch] Duplicate command blocked: ${cmd.type}`);
    }
    return { ok: false, error: "duplicate_command" };
  }

  // 3. Execute pipeline
  try {
    return await handler(cmd);
  } catch (err: any) {
    console.error(`[orbitDispatch] ${cmd.type} failed:`, err);
    return { ok: false, error: err?.message || "Command failed" };
  }
}
