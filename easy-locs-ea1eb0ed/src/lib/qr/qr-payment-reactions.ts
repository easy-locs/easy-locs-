/**
 * QR Payment Reactions — Closes Phase B blocker B3.
 *
 * Installs platform bus listeners for the QR payment lifecycle so that:
 *  - `qr:payment_initiated`  → light telemetry breadcrumb (no-op side-effect)
 *  - `qr:payment_completed`  → invalidate wallet/order caches + create success notification
 *  - `qr:payment_failed`     → create explicit error notification
 *
 * Registered at stage-1 of `useMasterAppBootstrap`, alongside
 * `installPlatformReactions()` and `installStorefrontReactions()`.
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";
import { insertNotification } from "@/lib/notification-service/notification-service";
import { structuredLogger } from "@/lib/observability/structured-logger";

interface QrPaymentEventPayload {
  amount?: number;
  currency?: string;
  targetId?: string;
  transactionId?: string;
  reference?: string;
  reason?: string;
}

const QR_INVALIDATION_KEYS: readonly string[] = [
  "wallet-balance",
  "wallet-transactions",
  "my-orders",
];

async function getQueryClient() {
  try {
    const { getActionQueryClient } = await import("@/lib/run-action");
    return getActionQueryClient();
  } catch {
    return null;
  }
}

async function invalidateWalletAndOrderCaches(): Promise<void> {
  const qc = await getQueryClient();
  if (!qc) return;
  for (const key of QR_INVALIDATION_KEYS) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await db.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * QR lifecycle event aliases. The canonical platform-bus name uses colon notation
 * (`qr:payment_*`); the FIX_PLAN spec also references the dot-notation form
 * (`qr.payment.*`). We listen on both so the wiring is deterministic regardless
 * of which notation an emitter chooses.
 */
const QR_INITIATED_EVENTS = ["qr:payment_initiated", "qr.payment.initiated"] as const;
const QR_COMPLETED_EVENTS = ["qr:payment_completed", "qr.payment.completed"] as const;
const QR_FAILED_EVENTS = ["qr:payment_failed", "qr.payment.failed"] as const;

const handleInitiated = (event: PlatformEvent) => {
  const p = event.payload as QrPaymentEventPayload;
  structuredLogger.info("payment", "payment_initiated", `QR payment initiated`, {
    amount: p?.amount,
    currency: p?.currency,
    targetId: p?.targetId,
    transactionId: p?.transactionId,
  });
};

/** Dedup key for completed-notification — guards against the same event being
 *  delivered under both colon and dot notation in the same tick. */
const recentCompleted = new Set<string>();
const recentFailed = new Set<string>();
const DEDUP_WINDOW_MS = 1500;

function dedupKey(p: QrPaymentEventPayload, _event: PlatformEvent): string {
  return p?.transactionId ?? p?.reference ?? p?.targetId ?? "anon";
}

const handleCompleted = (event: PlatformEvent) => {
  const p = event.payload as QrPaymentEventPayload;
  const key = dedupKey(p, event);
  if (recentCompleted.has(key)) return;
  recentCompleted.add(key);
  setTimeout(() => recentCompleted.delete(key), DEDUP_WINDOW_MS);

  void invalidateWalletAndOrderCaches();
  void (async () => {
    const userId = await currentUserId();
    if (!userId) return;
    await insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.qr.completed",
      title: "QR payment completed",
      body: `Payment of ${p?.amount ?? ""} ${p?.currency ?? "AED"} was completed successfully.`,
      data: {
        targetId: p?.targetId,
        transactionId: p?.transactionId,
        reference: p?.reference,
      },
    });
  })();
};

const handleFailed = (event: PlatformEvent) => {
  const p = event.payload as QrPaymentEventPayload;
  const key = dedupKey(p, event);
  if (recentFailed.has(key)) return;
  recentFailed.add(key);
  setTimeout(() => recentFailed.delete(key), DEDUP_WINDOW_MS);

  structuredLogger.error(
    "payment",
    "payment_failed",
    `QR payment failed: ${p?.reason ?? "unknown"}`
  );
  void (async () => {
    const userId = await currentUserId();
    if (!userId) return;
    await insertNotification({
      user_id: userId,
      actor: "client",
      domain: "wallet",
      type: "payment.qr.failed",
      title: "QR payment failed",
      body: p?.reason
        ? `Your QR payment did not go through: ${p.reason}`
        : "Your QR payment did not go through. Please try again.",
      priority: "high",
      data: {
        targetId: p?.targetId,
        transactionId: p?.transactionId,
        reference: p?.reference,
        reason: p?.reason,
      },
    });
  })();
};

export function installQrPaymentReactions(): () => void {
  const unsubs: Array<() => void> = [];

  for (const evt of QR_INITIATED_EVENTS) {
    unsubs.push(platformBus.on(evt, handleInitiated));
  }
  for (const evt of QR_COMPLETED_EVENTS) {
    unsubs.push(platformBus.on(evt, handleCompleted));
  }
  for (const evt of QR_FAILED_EVENTS) {
    unsubs.push(platformBus.on(evt, handleFailed));
  }

  return () => unsubs.forEach((fn) => fn());
}
