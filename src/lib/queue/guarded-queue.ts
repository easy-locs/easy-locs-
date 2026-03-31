/**
 * GUARDED QUEUE — Combines ActionGuard + SinglePath + Queue for ultimate safety.
 * FULL PROD HARDENED v2.
 *
 * Pattern: UI → guardedEnqueue → Queue(priority) → SinglePath(lock) → ActionGuard(dedup) → execute(ctx)
 *
 * Guarantees:
 * 1. Sequential execution per queue key (no race conditions)
 * 2. Priority ordering (payments before messages)
 * 3. Idempotency via requestId dedup
 * 4. Concurrency lock via single-path
 * 5. Offline persistence for retryable tasks
 * 6. Structured logging at every step
 * 7. Full context propagation (requestId + correlationId) to execute(ctx)
 * 8. Non-retryable errors (flow_locked, invalid_state) skip retry
 */
import { enqueue, QUEUE_PRIORITY, type QueueTask, type QueueResult, type QueueExecutionContext } from "./action-queue";
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
  /** Correlation ID for tracing (optional — auto-generated if omitted) */
  correlationId?: string;
  /** The actual business logic to execute — receives full context */
  execute: (ctx: QueueExecutionContext) => Promise<T>;
  /** Max retries with exponential backoff */
  maxRetries?: number;
  /** Can this task be saved offline for replay? */
  offlineCapable?: boolean;
  /** Serialized payload for offline replay — MUST contain enough data to reconstruct the action */
  offlinePayload?: Record<string, unknown>;
  /** Single-path flow key (optional — if set, prevents concurrent execution) */
  singlePathKey?: string;
}

/**
 * The ultimate guarded enqueue — combines queue + guard + single-path.
 * FIX #3: requestId + correlationId propagated all the way to execute(ctx).
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
    requestId: input.requestId,
    correlationId: input.correlationId,

    execute: async (queueCtx: QueueExecutionContext) => {
      // Layer 1: Single-path lock (if configured)
      let release: (() => void) | null = null;
      if (input.singlePathKey) {
        release = acquireSinglePath(input.singlePathKey);
        if (!release) {
          throw new Error("flow_locked"); // Non-retryable — won't waste retries
        }
      }

      try {
        // Layer 2: Action guard (idempotency + structured logging)
        const result = await guard.execute(
          async () => input.execute(queueCtx), // FIX #3: Pass queue context through
          {
            requestId: queueCtx.requestId,
            correlationId: queueCtx.correlationId,
          },
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
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; maxRetries?: number },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `orbit:${conversationId}`,
    taskId: clientMessageId,
    guardKey: "orbit.message.send",
    priority: QUEUE_PRIORITY.MESSAGE_SEND,
    singlePathKey: `orbit.message.send:${conversationId}:${clientMessageId}`,
    requestId: opts?.requestId,
    correlationId: opts?.correlationId,
    maxRetries: opts?.maxRetries ?? 2,
    offlineCapable: true,
    offlinePayload: { conversationId, clientMessageId },
    execute,
  });
}

export function enqueueCapturePayment<T>(
  paymentId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; amount?: number; currency?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet:${paymentId}`,
    taskId: paymentId,
    guardKey: "wallet.payment.capture",
    priority: QUEUE_PRIORITY.PAYMENT_CAPTURE,
    singlePathKey: `wallet.capture:${paymentId}`,
    requestId: opts?.requestId ?? paymentId,
    correlationId: opts?.correlationId,
    // FIX #6: Full offline payload for real replay
    offlinePayload: opts?.amount ? { paymentId, amount: opts.amount, currency: opts.currency } : undefined,
    offlineCapable: !!opts?.amount,
    execute,
  });
}

export function enqueueQrPayment<T>(
  qrSessionId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; amount?: number; recipientId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet.qr:${qrSessionId}`,
    taskId: qrSessionId,
    guardKey: "wallet.qr.pay",
    priority: QUEUE_PRIORITY.QR_PAYMENT,
    singlePathKey: `wallet.qr:${qrSessionId}`,
    requestId: opts?.requestId ?? qrSessionId,
    correlationId: opts?.correlationId,
    offlinePayload: opts?.amount ? { qrSessionId, amount: opts.amount, recipientId: opts.recipientId } : undefined,
    offlineCapable: !!opts?.amount,
    execute,
  });
}

export function enqueueCreateOrder<T>(
  draftId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; orderData?: Record<string, unknown> },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `order:${draftId}`,
    taskId: draftId,
    guardKey: "order.create",
    priority: QUEUE_PRIORITY.ORDER_SUBMIT,
    singlePathKey: `order.create:${draftId}`,
    requestId: opts?.requestId ?? draftId,
    correlationId: opts?.correlationId,
    offlinePayload: opts?.orderData ? { draftId, ...opts.orderData } : undefined,
    offlineCapable: !!opts?.orderData,
    execute,
  });
}

export function enqueueAssignDriver<T>(
  orderId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; driverId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `driver:${orderId}`,
    taskId: orderId,
    guardKey: "driver.assign",
    priority: QUEUE_PRIORITY.ASSIGN_DRIVER,
    singlePathKey: `driver.assign:${orderId}`,
    requestId: opts?.requestId ?? orderId,
    correlationId: opts?.correlationId,
    offlinePayload: opts?.driverId ? { orderId, driverId: opts.driverId } : undefined,
    offlineCapable: !!opts?.driverId,
    execute,
  });
}

export function enqueueWalletTransfer<T>(
  transferId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { requestId?: string; correlationId?: string; amount?: number; toUserId?: string },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `wallet.transfer:${transferId}`,
    taskId: transferId,
    guardKey: "wallet.transfer",
    priority: QUEUE_PRIORITY.PAYMENT_CAPTURE,
    singlePathKey: `wallet.transfer:${transferId}`,
    requestId: opts?.requestId ?? transferId,
    correlationId: opts?.correlationId,
    offlinePayload: opts?.amount ? { transferId, amount: opts.amount, toUserId: opts.toUserId } : undefined,
    offlineCapable: !!opts?.amount,
    execute,
  });
}

export function enqueueUpload<T>(
  conversationId: string,
  uploadId: string,
  execute: (ctx: QueueExecutionContext) => Promise<T>,
  opts?: { maxRetries?: number; correlationId?: string; fileName?: string; fileSize?: number },
): Promise<QueueResult<T>> {
  return guardedEnqueue({
    queueKey: `upload:${conversationId}`,
    taskId: uploadId,
    guardKey: "upload.attachment",
    priority: QUEUE_PRIORITY.UPLOAD,
    maxRetries: opts?.maxRetries ?? 3,
    correlationId: opts?.correlationId,
    offlineCapable: true,
    // FIX #6: Full payload for offline replay
    offlinePayload: { conversationId, uploadId, fileName: opts?.fileName, fileSize: opts?.fileSize },
    execute,
  });
}

// Re-export for convenience
export { QUEUE_PRIORITY } from "./action-queue";
