/**
 * GUARDED ACTIONS — Wrappers that enforce idempotency + single-path on all critical flows.
 *
 * Every critical write-path MUST go through one of these guards.
 * No component or hook may bypass this layer.
 */
import { createActionGuard, acquireSinglePath } from "@/lib/guards/action-guard";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_EVENTS } from "@/domains/shared/canonical-events";

// ══════════════════════════════════════════════════
// ORBIT GUARDS
// ══════════════════════════════════════════════════

const sendMessageGuard = createActionGuard("orbit.message.send");
const startCallGuard = createActionGuard("orbit.call.start");

export async function guardedSendMessage<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`send_message:${requestId}`);
  if (!release) return { ok: false, error: "Send already in progress" };

  try {
    return await sendMessageGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

export async function guardedStartCall<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`start_call:${requestId}`);
  if (!release) return { ok: false, error: "Call start already in progress" };

  try {
    return await startCallGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

// ══════════════════════════════════════════════════
// WALLET GUARDS
// ══════════════════════════════════════════════════

const createPaymentGuard = createActionGuard("wallet.payment.create");
const capturePaymentGuard = createActionGuard("wallet.payment.capture");
const refundPaymentGuard = createActionGuard("wallet.payment.refund");
const walletTransferGuard = createActionGuard("wallet.transfer");
const qrPaymentGuard = createActionGuard("wallet.qr.payment");

export async function guardedCreatePayment<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`create_payment:${requestId}`);
  if (!release) return { ok: false, error: "Payment creation already in progress" };

  try {
    return await createPaymentGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

export async function guardedCapturePayment<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  return capturePaymentGuard.execute(async () => fn(), { requestId });
}

export async function guardedRefundPayment<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  return refundPaymentGuard.execute(async () => fn(), { requestId });
}

export async function guardedWalletTransfer<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`wallet_transfer:${requestId}`);
  if (!release) return { ok: false, error: "Transfer already in progress" };

  try {
    return await walletTransferGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

export async function guardedQrPayment<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`qr_payment:${requestId}`);
  if (!release) return { ok: false, error: "QR payment already in progress" };

  try {
    return await qrPaymentGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

// ══════════════════════════════════════════════════
// ORDER GUARDS
// ══════════════════════════════════════════════════

const createOrderGuard = createActionGuard("order.create");
const assignDriverGuard = createActionGuard("delivery.driver.assign");

export async function guardedCreateOrder<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`create_order:${requestId}`);
  if (!release) return { ok: false, error: "Order creation already in progress" };

  try {
    return await createOrderGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}

export async function guardedAssignDriver<T>(
  requestId: string,
  fn: () => Promise<T>,
): Promise<{ ok: boolean; data?: T; error?: string; deduplicated?: boolean }> {
  const release = acquireSinglePath(`assign_driver:${requestId}`);
  if (!release) return { ok: false, error: "Driver assignment already in progress" };

  try {
    return await assignDriverGuard.execute(async () => fn(), { requestId });
  } finally {
    release();
  }
}
