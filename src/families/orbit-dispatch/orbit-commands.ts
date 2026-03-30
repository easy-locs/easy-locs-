/**
 * OrbitCommand — Canonical command types for the Orbit Action Pipeline.
 * Every user action is expressed as a typed command.
 * No business logic here — pure type definitions.
 */

export type OrbitCommand =
  | SendTextCommand
  | SendMediaCommand
  | SendMediaBatchCommand
  | SendVoiceCommand
  | SendLocationCommand
  | StartCallCommand
  | AcceptCallCommand
  | EndCallCommand
  | EditMessageCommand
  | ReplyCommand
  | GroupCreateCommand
  | GroupUpdateCommand
  | PresenceUpdateCommand
  | TypingUpdateCommand;

// ── Base ──
interface BaseCommand {
  /** Auto-generated trace ID for end-to-end tracking */
  _traceId?: string;
}

// ── Messaging ──
export interface SendTextCommand extends BaseCommand {
  type: "send_text";
  conversationId: string;
  body: string;
  encrypted?: boolean;
  replyToMessageId?: string | null;
  category?: string;
  locale?: string;
  securityLevel?: string;
  disappearTTL?: string | null;
}

export interface SendMediaCommand extends BaseCommand {
  type: "send_media";
  conversationId: string;
  file: File;
  caption?: string;
  viewOnce?: boolean;
  disappearAt?: string | null;
  /** Injected upload function */
  uploadFn: (file: File, path: string, onProgress: (p: number) => void) => Promise<string>;
  pathPrefix: string;
}

export interface SendMediaBatchCommand extends BaseCommand {
  type: "send_media_batch";
  conversationId: string;
  files: File[];
  caption?: string;
  viewOnce?: boolean;
  /** Injected upload function */
  uploadFn: (file: File, path: string, onProgress: (p: number) => void) => Promise<string>;
  pathPrefix: string;
}

export interface SendVoiceCommand extends BaseCommand {
  type: "send_voice";
  conversationId: string;
  blob: Blob;
  durationSeconds: number;
  localUrl: string;
  /** Injected upload function */
  uploadFn: (file: File, path: string) => Promise<string>;
  pathPrefix: string;
}

export interface SendLocationCommand extends BaseCommand {
  type: "send_location";
  conversationId: string;
  lat: number;
  lng: number;
  mode: "static" | "live";
  label?: string;
  address?: string;
  liveDurationMinutes?: number;
}

// ── Calls ──
export interface StartCallCommand extends BaseCommand {
  type: "start_call";
  peerUserId: string;
  peerOrbitId?: string | null;
  peerName: string;
  conversationId?: string | null;
  mode: "audio" | "video";
}

export interface AcceptCallCommand extends BaseCommand {
  type: "accept_call";
  sessionId: string;
}

export interface EndCallCommand extends BaseCommand {
  type: "end_call";
  sessionId: string;
  reason?: string;
}

// ── Message Actions ──
export interface EditMessageCommand extends BaseCommand {
  type: "edit_message";
  messageId: string;
  conversationId: string;
  newBody: string;
}

export interface ReplyCommand extends BaseCommand {
  type: "reply";
  conversationId: string;
  replyToMessageId: string;
  body: string;
  encrypted?: boolean;
  category?: string;
  locale?: string;
}

// ── Result ──
export interface OrbitCommandResult {
  ok: boolean;
  messageId?: string;
  sessionId?: string;
  requestId?: string;
  error?: string;
}
