/**
 * ORBIT FLOW GATE — Anti-infiltration core + typed registries.
 *
 * Prevents:
 * - duplicate concurrent flows (double-tap, double-send)
 * - unauthorized cross-flow triggers
 * - writes outside pipelines
 * - duplicate pipeline executions
 * - serial collisions
 * - unregistered signals
 *
 * Every entry MUST: assertSingleFlow → enterFlow → pipeline → exitFlow
 */

const __DEV__ = typeof process !== "undefined"
  ? process.env.NODE_ENV !== "production"
  : true;

// ══════════════════════════════════════════════
// 0. TYPES
// ══════════════════════════════════════════════

export type EntryKey =
  | "message.sendText"
  | "message.edit"
  | "message.delete"
  | "message.retry"
  | "media.send"
  | "media.sendBatch"
  | "media.retryUpload"
  | "media.requestDownload"
  | "voice.send"
  | "voice.discard"
  | "location.send"
  | "location.startLive"
  | "location.stopLive"
  | "receipt.markRead"
  | "receipt.markSingleRead"
  | "receipt.clearMarkedUnread"
  | "conversation.openDirect"
  | "conversation.createGroup"
  | "conversation.updateGroup"
  | "call.startAudio"
  | "call.startVideo"
  | "call.accept"
  | "call.decline"
  | "call.end"
  | "draft.save"
  | "draft.clear"
  | "draft.restore"
  | "search.conversations"
  | "search.messages"
  | "presence.update"
  | "presence.typing";

export type PipelineKey = `pipeline.${string}`;

export type OwnerKey =
  | "orbitStore.messages"
  | "orbitStore.attachments"
  | "orbitStore.conversations"
  | "orbitStore.receipts"
  | "orbitStore.drafts"
  | "callStore.sessions";

export type OutputKey =
  | "message_inserted"
  | "message_updated"
  | "message_deleted"
  | "message_failed"
  | "message_reconciled"
  | "attachment_created"
  | "attachment_uploaded"
  | "attachment_download_ready"
  | "attachment_failed"
  | "conversation_created"
  | "conversation_updated"
  | "conversation_merged"
  | "conversation_read"
  | "message_delivered"
  | "call_started"
  | "call_incoming"
  | "call_accepted"
  | "call_declined"
  | "call_ended"
  | "call_failed"
  | "draft_saved"
  | "draft_cleared";

export type SerialKind =
  | "message.temp"
  | "message.idempotency"
  | "attachment.local"
  | "upload.job"
  | "receipt.batch"
  | "call.session"
  | "signal.event";

export type BatchKey =
  | "receipt.read"
  | "upload.multipart"
  | "location.live";

export type SignalKey =
  | "signal.message.incoming"
  | "signal.message.updated"
  | "signal.message.deleted"
  | "signal.receipt.read"
  | "signal.receipt.delivered"
  | "signal.call.incoming"
  | "signal.call.status"
  | "signal.call.terminated"
  | "signal.conversation.updated"
  | "signal.attachment.uploaded";

// ══════════════════════════════════════════════
// 1. PIPELINE REGISTRY (entry → pipeline mapping)
// ══════════════════════════════════════════════

export const PipelineRegistry: Record<EntryKey, PipelineKey> = {
  "message.sendText": "pipeline.message.sendText.v1",
  "message.edit": "pipeline.message.edit.v1",
  "message.delete": "pipeline.message.delete.v1",
  "message.retry": "pipeline.message.retry.v1",
  "media.send": "pipeline.media.send.v1",
  "media.sendBatch": "pipeline.media.sendBatch.v1",
  "media.retryUpload": "pipeline.media.retryUpload.v1",
  "media.requestDownload": "pipeline.media.requestDownload.v1",
  "voice.send": "pipeline.voice.send.v1",
  "voice.discard": "pipeline.voice.discard.v1",
  "location.send": "pipeline.location.send.v1",
  "location.startLive": "pipeline.location.startLive.v1",
  "location.stopLive": "pipeline.location.stopLive.v1",
  "receipt.markRead": "pipeline.receipt.markRead.v1",
  "receipt.markSingleRead": "pipeline.receipt.markSingleRead.v1",
  "receipt.clearMarkedUnread": "pipeline.receipt.clearMarkedUnread.v1",
  "conversation.openDirect": "pipeline.conversation.openDirect.v1",
  "conversation.createGroup": "pipeline.conversation.createGroup.v1",
  "conversation.updateGroup": "pipeline.conversation.updateGroup.v1",
  "call.startAudio": "pipeline.call.startAudio.v1",
  "call.startVideo": "pipeline.call.startVideo.v1",
  "call.accept": "pipeline.call.accept.v1",
  "call.decline": "pipeline.call.decline.v1",
  "call.end": "pipeline.call.end.v1",
  "draft.save": "pipeline.draft.save.v1",
  "draft.clear": "pipeline.draft.clear.v1",
  "draft.restore": "pipeline.draft.restore.v1",
  "search.conversations": "pipeline.search.conversations.v1",
  "search.messages": "pipeline.search.messages.v1",
  "presence.update": "pipeline.presence.update.v1",
  "presence.typing": "pipeline.presence.typing.v1",
};

// ══════════════════════════════════════════════
// 2. OWNER REGISTRY (domain → canonical owner)
// ══════════════════════════════════════════════

export const OwnerRegistry: Record<string, OwnerKey> = {
  message: "orbitStore.messages",
  attachment: "orbitStore.attachments",
  conversation: "orbitStore.conversations",
  receipt: "orbitStore.receipts",
  draft: "orbitStore.drafts",
  call: "callStore.sessions",
};

// ══════════════════════════════════════════════
// 3. SERIAL REGISTRY (unique ID issuance)
// ══════════════════════════════════════════════

const serialMap = new Set<string>();
const SERIAL_TTL = 120_000; // 2min auto-cleanup

/** Issue a unique serial. Throws on collision. */
export function issueSerial(kind: SerialKind, scope: string): string {
  const id = `${kind}:${scope}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  if (serialMap.has(id)) {
    throw new FlowGateError("serial_collision", id);
  }
  serialMap.add(id);
  setTimeout(() => serialMap.delete(id), SERIAL_TTL);
  return id;
}

/** Check if a serial was already issued. */
export function hasSerial(id: string): boolean {
  return serialMap.has(id);
}

// ══════════════════════════════════════════════
// 4. BATCH REGISTRY (grouped operations)
// ══════════════════════════════════════════════

export interface FlowBatch {
  id: string;
  items: unknown[];
  state: "open" | "flushing" | "closed";
}

const batchMap = new Map<string, FlowBatch>();

/** Open or get an existing batch for grouped operations. */
export function openBatch(key: BatchKey, scope: string): FlowBatch {
  const id = `${key}:${scope}`;
  if (batchMap.has(id)) return batchMap.get(id)!;
  const batch: FlowBatch = { id, items: [], state: "open" };
  batchMap.set(id, batch);
  return batch;
}

/** Close a batch and remove it from the registry. */
export function closeBatch(key: BatchKey, scope: string): FlowBatch | null {
  const id = `${key}:${scope}`;
  const batch = batchMap.get(id);
  if (!batch) return null;
  batch.state = "closed";
  batchMap.delete(id);
  return batch;
}

/** Get batch state without modifying. */
export function getBatch(key: BatchKey, scope: string): FlowBatch | null {
  return batchMap.get(`${key}:${scope}`) ?? null;
}

// ══════════════════════════════════════════════
// 5. SIGNAL REGISTRY (realtime event → owner mapping)
// ══════════════════════════════════════════════

export const SignalRegistry: Record<SignalKey, { owner: OwnerKey }> = {
  "signal.message.incoming": { owner: "orbitStore.messages" },
  "signal.message.updated": { owner: "orbitStore.messages" },
  "signal.message.deleted": { owner: "orbitStore.messages" },
  "signal.receipt.read": { owner: "orbitStore.receipts" },
  "signal.receipt.delivered": { owner: "orbitStore.receipts" },
  "signal.call.incoming": { owner: "callStore.sessions" },
  "signal.call.status": { owner: "callStore.sessions" },
  "signal.call.terminated": { owner: "callStore.sessions" },
  "signal.conversation.updated": { owner: "orbitStore.conversations" },
  "signal.attachment.uploaded": { owner: "orbitStore.attachments" },
};

/** Resolve the canonical owner for a realtime signal. */
export function resolveSignalOwner(signal: SignalKey): OwnerKey {
  const entry = SignalRegistry[signal];
  if (!entry) throw new FlowGateError("unknown_signal", signal);
  return entry.owner;
}

// ══════════════════════════════════════════════
// 6. FLOW TRACKING
// ══════════════════════════════════════════════

const activeFlows = new Map<string, number>();

/** Check that no instance of this flow is running. Throws if duplicate. */
export function assertSingleFlow(key: string): void {
  if (activeFlows.has(key)) {
    if (__DEV__) console.warn(`[FLOW BLOCKED] duplicate entry: ${key}`);
    throw new FlowGateError(`duplicate_flow`, key);
  }
}

/** Mark a flow as active. Supports re-entrant counting. */
export function enterFlow(key: string): void {
  const count = activeFlows.get(key) ?? 0;
  activeFlows.set(key, count + 1);
  if (__DEV__) console.debug(`[FLOW START] ${key} (depth: ${count + 1})`);
}

/** Mark a flow as complete. Must be called in finally block. */
export function exitFlow(key: string): void {
  const count = activeFlows.get(key) ?? 0;
  if (count <= 1) {
    activeFlows.delete(key);
  } else {
    activeFlows.set(key, count - 1);
  }
  if (__DEV__) console.debug(`[FLOW END] ${key}`);
}

/** Check if a flow is currently active. */
export function isFlowActive(key: string): boolean {
  return activeFlows.has(key);
}

/** Get all active flows (debug only). */
export function getActiveFlows(): string[] {
  return Array.from(activeFlows.keys());
}

// ══════════════════════════════════════════════
// 7. CROSS-FLOW PROTECTION
// ══════════════════════════════════════════════

const allowedCrossFlows: Record<string, string[]> = {
  "media.send": ["message.sendText"],
  "media.sendBatch": ["message.sendText"],
  "voice.send": ["message.sendText"],
  "location.send": [],
  "conversation.createGroup": ["message.sendText"],
  "receipt.markRead": ["receipt.clearMarkedUnread"],
};

/** Assert that a cross-flow trigger is allowed. */
export function assertCrossFlow(from: string, to: string): void {
  const allowed = allowedCrossFlows[from] || [];
  if (!allowed.includes(to)) {
    if (__DEV__) console.warn(`[CROSS FLOW BLOCKED] ${from} → ${to}`);
    throw new FlowGateError(`cross_flow_blocked`, `${from} → ${to}`);
  }
}

// ══════════════════════════════════════════════
// 8. PIPELINE DEDUP (anti duplicate execution)
// ══════════════════════════════════════════════

const processedIds = new Set<string>();
const PROCESSED_TTL = 60_000;

/** Prevent duplicate pipeline execution for same ID. */
export function preventDuplicateExecution(id: string): void {
  if (processedIds.has(id)) {
    throw new FlowGateError("duplicate_execution", id);
  }
  processedIds.add(id);
  setTimeout(() => processedIds.delete(id), PROCESSED_TTL);
}

/** Check if an ID has been processed recently. */
export function wasProcessed(id: string): boolean {
  return processedIds.has(id);
}

// ══════════════════════════════════════════════
// 9. GUARDED WRITE
// ══════════════════════════════════════════════

/**
 * Ensure writes only happen from within a flow pipeline.
 * Accepts either "flow:*" prefix or a valid OwnerKey.
 */
export function guardedWrite(owner: OwnerKey | string, fn: () => void): void {
  const isFlowSource = typeof owner === "string" && owner.startsWith("flow:");
  const isOwnerKey = Object.values(OwnerRegistry).includes(owner as OwnerKey);
  if (!isFlowSource && !isOwnerKey) {
    if (__DEV__) console.error(`[WRITE BLOCKED] unauthorized write from: ${owner}`);
    throw new FlowGateError("write_blocked", owner);
  }
  fn();
}

// ══════════════════════════════════════════════
// 10. FLOW WRAPPERS
// ══════════════════════════════════════════════

export interface FlowContext {
  serial: string;
  pipeline: PipelineKey;
  entry: EntryKey;
}

/**
 * Full typed flow executor.
 * Handles: assertSingleFlow → enterFlow → serial → handler → exitFlow
 */
export async function executeFlow<T>(
  entry: EntryKey,
  handler: (ctx: FlowContext) => Promise<T>,
): Promise<T> {
  const pipeline = PipelineRegistry[entry];
  if (!pipeline) throw new FlowGateError("no_pipeline", entry);

  assertSingleFlow(entry);
  enterFlow(entry);
  setFlowState(entry, FlowState.running);

  const serial = issueSerial("message.idempotency", entry);

  try {
    const result = await handler({ serial, pipeline, entry });
    setFlowState(entry, FlowState.completed);
    if (__DEV__) console.debug(`[FLOW COMPLETE] ${entry}`);
    return result;
  } catch (err) {
    setFlowState(entry, FlowState.failed);
    if (__DEV__) console.debug(`[FLOW FAILED] ${entry}`, err);
    throw err;
  } finally {
    exitFlow(entry);
  }
}

/**
 * Wrap an entire flow with gate protection (simpler variant).
 */
export async function withFlowGate<T>(
  flowKey: string,
  fn: () => Promise<T>,
): Promise<T> {
  assertSingleFlow(flowKey);
  enterFlow(flowKey);
  try {
    const result = await fn();
    if (__DEV__) console.debug(`[FLOW COMPLETE] ${flowKey}`);
    return result;
  } catch (err) {
    if (__DEV__) console.debug(`[FLOW FAILED] ${flowKey}`, err);
    throw err;
  } finally {
    exitFlow(flowKey);
  }
}

/** Synchronous version of withFlowGate. */
export function withFlowGateSync<T>(
  flowKey: string,
  fn: () => T,
): T {
  assertSingleFlow(flowKey);
  enterFlow(flowKey);
  try {
    const result = fn();
    if (__DEV__) console.debug(`[FLOW COMPLETE] ${flowKey}`);
    return result;
  } catch (err) {
    if (__DEV__) console.debug(`[FLOW FAILED] ${flowKey}`, err);
    throw err;
  } finally {
    exitFlow(flowKey);
  }
}

// ══════════════════════════════════════════════
// 11. FLOW STATE MACHINE
// ══════════════════════════════════════════════

export const FlowState = {
  idle: 0,
  running: 1,
  completed: 2,
  failed: 3,
} as const;

export type FlowStateValue = typeof FlowState[keyof typeof FlowState];

const flowStates = new Map<string, FlowStateValue>();

export function setFlowState(key: string, state: FlowStateValue): void {
  flowStates.set(key, state);
}

export function getFlowState(key: string): FlowStateValue {
  return flowStates.get(key) ?? FlowState.idle;
}

// ══════════════════════════════════════════════
// 12. AUDITOR
// ══════════════════════════════════════════════

/** Verify an entry has a registered pipeline. */
export function auditFlow(entry: EntryKey): boolean {
  if (!PipelineRegistry[entry]) {
    throw new FlowGateError("no_pipeline", entry);
  }
  if (__DEV__) console.log(`[AUDIT OK] ${entry} → ${PipelineRegistry[entry]}`);
  return true;
}

/** Audit all entries at once (startup check). */
export function auditAllFlows(): void {
  for (const entry of Object.keys(PipelineRegistry) as EntryKey[]) {
    auditFlow(entry);
  }
  if (__DEV__) console.log(`[AUDIT] All ${Object.keys(PipelineRegistry).length} flows verified.`);
}

// ══════════════════════════════════════════════
// 13. ERROR TYPE
// ══════════════════════════════════════════════

export class FlowGateError extends Error {
  public readonly code: string;
  public readonly detail: string;

  constructor(code: string, detail: string) {
    super(`[FlowGate] ${code}: ${detail}`);
    this.name = "FlowGateError";
    this.code = code;
    this.detail = detail;
  }
}
