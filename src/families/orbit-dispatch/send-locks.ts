import type { OrbitCommand } from "./orbit-commands";

const SUBMIT_LOCK_TTL_MS = 650;
const IDEMPOTENCY_WINDOW_MS = 1200;

type SubmitLockRecord = {
  key: string;
  token: string;
  createdAt: number;
};

type InflightRequestRecord = {
  requestId: string;
  key: string;
  type: OrbitCommand["type"];
  createdAt: number;
};

const submitLocks = new Map<string, SubmitLockRecord>();
const inflightRequests = new Map<string, InflightRequestRecord>();
const idempotencyRegistry = new Map<string, number>();

function now() {
  return Date.now();
}

export function issueRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function isSendLikeCommand(cmd: OrbitCommand): boolean {
  return [
    "send_text", "reply", "send_media", "send_media_batch", "send_voice", "send_location",
    "start_call", "accept_call", "decline_call",
  ].includes(cmd.type);
}

export function getSubmitLockKey(cmd: OrbitCommand): string | null {
  if (!isSendLikeCommand(cmd)) return null;
  const conversationId = "conversationId" in cmd ? cmd.conversationId : null;
  if (!conversationId) return null;
  return `${cmd.type}:${conversationId}`;
}

export function acquireSubmitLock(cmd: OrbitCommand): SubmitLockRecord | null {
  const key = getSubmitLockKey(cmd);
  if (!key) return null;

  const existing = submitLocks.get(key);
  const timestamp = now();

  if (existing && timestamp - existing.createdAt < SUBMIT_LOCK_TTL_MS) {
    return null;
  }

  const record: SubmitLockRecord = {
    key,
    token: issueRequestId(),
    createdAt: timestamp,
  };

  submitLocks.set(key, record);

  setTimeout(() => {
    const current = submitLocks.get(key);
    if (current?.token === record.token) {
      submitLocks.delete(key);
    }
  }, SUBMIT_LOCK_TTL_MS);

  return record;
}

export function releaseSubmitLock(lock: SubmitLockRecord | null | undefined): void {
  if (!lock) return;
  const current = submitLocks.get(lock.key);
  if (current?.token === lock.token) {
    submitLocks.delete(lock.key);
  }
}

export function registerInflightRequest(requestId: string, cmd: OrbitCommand): InflightRequestRecord {
  const conversationId = "conversationId" in cmd ? cmd.conversationId : "global";
  const record: InflightRequestRecord = {
    requestId,
    key: `${cmd.type}:${conversationId}`,
    type: cmd.type,
    createdAt: now(),
  };
  inflightRequests.set(requestId, record);
  return record;
}

export function releaseInflightRequest(requestId: string): void {
  inflightRequests.delete(requestId);
}

function normalizeBody(body: string | undefined): string {
  return (body || "").trim().replace(/\s+/g, " ");
}

function buildIdempotencyKey(cmd: OrbitCommand): string | null {
  switch (cmd.type) {
    case "send_text":
    case "reply":
      return `${cmd.type}:${cmd.conversationId}:${normalizeBody(cmd.body)}`;
    case "send_media":
      return `${cmd.type}:${cmd.conversationId}:${cmd.file.name}:${cmd.file.size}`;
    case "send_media_batch":
      return `${cmd.type}:${cmd.conversationId}:${cmd.files.length}:${cmd.files.map(f => f.name).join(",")}`;
    case "send_voice":
      return `${cmd.type}:${cmd.conversationId}:${cmd.durationSeconds}:${cmd.blob.size}`;
    case "send_location":
      return `${cmd.type}:${cmd.conversationId}:${cmd.lat}:${cmd.lng}:${cmd.mode}`;
    default:
      return null;
  }
}

export function checkIdempotencyGuard(cmd: OrbitCommand): boolean {
  const key = buildIdempotencyKey(cmd);
  if (!key) return true;

  const timestamp = now();
  const existing = idempotencyRegistry.get(key);
  if (typeof existing === "number" && timestamp - existing < IDEMPOTENCY_WINDOW_MS) {
    return false;
  }

  idempotencyRegistry.set(key, timestamp);
  setTimeout(() => {
    const current = idempotencyRegistry.get(key);
    if (current === timestamp) {
      idempotencyRegistry.delete(key);
    }
  }, IDEMPOTENCY_WINDOW_MS);

  return true;
}

export function getSendLockDebugSnapshot() {
  return {
    submitLocks: Array.from(submitLocks.values()),
    inflightRequests: Array.from(inflightRequests.values()),
    idempotencyKeys: Array.from(idempotencyRegistry.entries()).map(([key, createdAt]) => ({ key, createdAt })),
  };
}

export function resetSendLocksForTests() {
  submitLocks.clear();
  inflightRequests.clear();
  idempotencyRegistry.clear();
}

export const SendLockTimings = {
  SUBMIT_LOCK_TTL_MS,
  IDEMPOTENCY_WINDOW_MS,
} as const;
