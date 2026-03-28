/**
 * useQrPaymentHandler — Atomic: QR decode → pay target resolution → payment execution.
 */
import { useCallback, useRef, useState } from "react";
import { decodeQr, isExpired, type UniversalQrPayload } from "@/lib/qr-engine";
import { resolvePayTarget } from "@/lib/wallet/resolvePayTarget";
import { generateIdempotencyKey, isDuplicatePayment, recordPaymentAttempt } from "@/lib/merchant-qr/merchant-qr-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { playScanBeep } from "@/lib/audio/scan-beep";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";

export type PendingQrPayment = {
  kind: "user" | "shop";
  recipientId: string;
  recipientName: string;
  walletId: string;
  currency: string;
  amount: number | null;
  contextId: string;
  payload: UniversalQrPayload;
  startedAt: number;
  timings: { decodeMs: number; recipientResolveMs: number; walletResolveMs: number };
};

export function useQrPaymentHandler(userId: string | undefined) {
  const [resolvedPayload, setResolvedPayload] = useState<UniversalQrPayload | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingQrPayment | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [payStepLabel, setPayStepLabel] = useState("");

  const decode = useCallback((raw: string): { payload: UniversalQrPayload | null; decodeMs: number } => {
    const t0 = performance.now();
    const payload = decodeQr(raw);
    return { payload, decodeMs: performance.now() - t0 };
  }, []);

  const validatePayload = useCallback((payload: UniversalQrPayload | null, raw: string): string | null => {
    if (!payload) {
      platformBus.emit("qr:scan_failed", { raw, reason: "unsupported_format" }, "system");
      return "Unsupported QR format";
    }
    if (isExpired(payload)) {
      platformBus.emit("qr:scan_expired", { action: payload.action }, "system");
      return "QR code expired";
    }
    return null;
  }, []);

  const resolveRecipient = useCallback(async (payload: UniversalQrPayload) => {
    const t0 = performance.now();
    const target = await resolvePayTarget(payload as any);
    return { target, resolveMs: performance.now() - t0 };
  }, []);

  const checkDuplicate = useCallback((recipientId: string, amount: number, contextId: string): boolean => {
    const key = generateIdempotencyKey(userId || "anon", recipientId, amount, contextId);
    if (isDuplicatePayment(key)) return true;
    recordPaymentAttempt(key);
    return false;
  }, [userId]);

  return {
    resolvedPayload, setResolvedPayload,
    pendingPayment, setPendingPayment,
    manualAmount, setManualAmount,
    payStepLabel, setPayStepLabel,
    decode, validatePayload, resolveRecipient, checkDuplicate,
  };
}
