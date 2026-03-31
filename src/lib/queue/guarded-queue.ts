/**
 * GUARDED QUEUE — Combines ActionGuard + SinglePath + Queue for ultimate safety.
 *
 * This is the canonical entry point for ALL critical write flows.
 * Pattern: UI → guardedEnqueue → Queue(priority) → SinglePath(lock) → ActionGuard(dedup) → execute
 *
 * Guarantees:
 * 1. Sequential execution per queue key (no race conditions)
 * 2. Priority ordering (payments before messages)
 * 3. Idempotency via requestId dedup
 * 4. Concurrency lock via single-path
 * 5. Offline persistence for retryable tasks
 * 6. Structured logging at every step
 */
import { enqueue, QUEUE_PRIORITY, type QueueTask, type QueueResult } from "./action-queue";
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";

// ── Pre-built guards (module singletons) ──

const guards = {
  "orbit.message.send": createActionGuard("orbit.message.send"),
  "orbit.call.start": createActionGuard("orbit.call.start"),
  "orbit.call.end": createActionGuard("orbit.call.end"),
  "wallet.payment.capture": createActionGuard("wallet.payment.capture"),
  "wallet.payment.refund": createActionGuard("wallet.payment.refund"),
  "wallet.transfer": createActionGuard("wallet.transfer"),
  "wallet.qr.pay": createActionGuard("wallet.qr.pay"),
  "wallet.topup": createActionGuard("wallet.topup"),
  "order.create": createActionGuard("order.create"),
  "order.submit": createActionGuard("order.submit"),
  "driver.assign": createActionGuard("driver.assign"),
  "upload.attachment": createActionGuard("upload.attachment"),
  "radar.track": createActionGuard("radar.track"),
  "me.profile.update": createActionGuard("me.profile.update"),
} as const;

type GuardedDomain = keyof typeof guards;

export interface GuardedEnqueueInput<T> {
  /** Queue key for sequential execution (e.g., "wallet:pay123") */
  queueKey: string;
  /** Unique task ID for dedup within queue */
  taskId: string;
  /** Domain.action key matching a pre-built guard */
  guardKey: GuardedDomain;
  /** Priority (use QUEUE_PRIORITY constants) */
  priority: number;
  /** Request ID for idempotency dedup (optional — auto-generated if omitted) */
  requestId?: string;
  /** The actual business logic to execute */
  execute: () => Promise<T>;
  /** Max retries with exponential backoff */
  maxRetries?: number;
  /** Can this task be saved offline for replay? */
  offlineCapable?: boolean;
  /** Serialized payload for offline replay */
  offlinePayload?: Record<string, unknown>;
  /** Single-path flow key (optional — if set, prevents concurrent execution) */
  singlePathKey?: string;
}

/**
 * The ultimate guarded enqueue — combines queue + guard + single-path.
 */
export async function guardedEnqueue<T>(
  input: GuardedEnqueueInput<T>,
): Promise<QueueResult<T>> {
  const guard = guards[input.guardKey];
  const [domain, ...actionParts] = input.guardKey.split(".");
  const action = actionParts.join(".");

  return enqueue<T>(input.queueKey, {
    id: input.taskId,
    domain,
    action,
    priority: input.priority,
    maxRetries: input.maxRetries,
    offlineCapable: input.offlineCapable,
    offlinePayload: input.offlinePayload,

    execute: async () => {
      // Layer 1: Single-path lock (if configured)
      let release: (() => void) | null = null;
      if (input.singlePathKey) {
        release = acquireSinglePath(input.singlePathKey);
        if (!release) {
          throw new Error("flow_locked");
        }
      }

      try {
        // Layer 2: Action guard (idempotency + structured logging)
        const result = await guard.execute(
          async () => input.execute(),
          { requestId: input.requestId },
        );

        if (!result.ok) {
          throw new Error(result.error ?? "guard_failed");
        }

        return result.data as T;
      } finally {
        release?.();
      }
    },
  });
}

// ── Convenience wrappers for each critical flow ──

export function enqueueSendMessage<T>(
  conversationId: string,
  clientMessageId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string; maxRetries?: number },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `orbit:${conversationId}`,
    taskId: clientMessageId,
    guardKey: "orbit.message.send",
    priority: QUEUE_PRIORITY.MESSAGE_SEND,
    singlePathKey: `orbit.message.send:${conversationId}:${clientMessageId}`,
    requestId: opts?.requestId,
    maxRetries: opts?.maxRetries ?? 2,
    offlineCapable: true,
    offlinePayload: { conversationId, clientMessageId },
    execute,
  });
}

export function enqueueCapturePayment<T>(
  paymentId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet:${paymentId}`,
    taskId: paymentId,
    guardKey: "wallet.payment.capture",
    priority: QUEUE_PRIORITY.PAYMENT_CAPTURE,
    singlePathKey: `wallet.capture:${paymentId}`,
    requestId: opts?.requestId ?? paymentId,
    execute,
  });
}

export function enqueueQrPayment<T>(
  qrSessionId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet.qr:${qrSessionId}`,
    taskId: qrSessionId,
    guardKey: "wallet.qr.pay",
    priority: QUEUE_PRIORITY.QR_PAYMENT,
    singlePathKey: `wallet.qr:${qrSessionId}`,
    requestId: opts?.requestId ?? qrSessionId,
    execute,
  });
}

export function enqueueCreateOrder<T>(
  draftId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `order:${draftId}`,
    taskId: draftId,
    guardKey: "order.create",
    priority: QUEUE_PRIORITY.ORDER_SUBMIT,
    singlePathKey: `order.create:${draftId}`,
    requestId: opts?.requestId ?? draftId,
    execute,
  });
}

export function enqueueAssignDriver<T>(
  orderId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `driver:${orderId}`,
    taskId: orderId,
    guardKey: "driver.assign",
    priority: QUEUE_PRIORITY.ASSIGN_DRIVER,
    singlePathKey: `driver.assign:${orderId}`,
    requestId: opts?.requestId ?? orderId,
    execute,
  });
}

export function enqueueWalletTransfer<T>(
  transferId: string,
  execute: () => Promise<T>,
  opts?: { requestId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet.transfer:${transferId}`,
    taskId: transferId,
    guardKey: "wallet.transfer",
    priority: QUEUE_PRIORITY.PAYMENT_CAPTURE,
    singlePathKey: `wallet.transfer:${transferId}`,
    requestId: opts?.requestId ?? transferId,
    execute,
  });
}

export function enqueueUpload<T>(
  conversationId: string,
  uploadId: string,
  execute: () => Promise<T>,
  opts?: { maxRetries?: number },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `upload:${conversationId}`,
    taskId: uploadId,
    guardKey: "upload.attachment",
    priority: QUEUE_PRIORITY.UPLOAD,
    maxRetries: opts?.maxRetries ?? 3,
    offlineCapable: true,
    offlinePayload: { conversationId, uploadId },
    execute,
  });
}

// Re-export for convenience
export { QUEUE_PRIORITY } from "./action-queue";
