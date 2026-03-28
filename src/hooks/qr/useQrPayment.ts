/**
 * useQrPayment — Handles QR decode → recipient resolution → payment flow.
 * Extracted from QrScannerPage. All payment logic in one hook.
 */
import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { decodeQr, resolveRoute, isExpired, type UniversalQrPayload } from "@/lib/qr-engine";
import { resolvePayTarget } from "@/lib/wallet/resolvePayTarget";
import { generateIdempotencyKey, isDuplicatePayment, recordPaymentAttempt } from "@/lib/merchant-qr/merchant-qr-engine";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { playPremiumSuccessBeep, hapticPremiumSuccess } from "@/lib/scan/feedback";
import type { ScanState } from "./useQrScanner";

export interface PendingQrPayment {
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
}

async function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    p.finally(() => { if (t) clearTimeout(t); }),
    new Promise<T>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); }),
  ]);
}

export function useQrPayment(
  setS: (s: ScanState) => void,
  setE: (m: string) => void,
) {
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const openPaymentRef = useRef(openPayment);
  openPaymentRef.current = openPayment;

  const [pendingPayment, setPendingPayment] = useState<PendingQrPayment | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [payStepLabel, setPayStepLabel] = useState("");
  const [txId, setTxId] = useState("");
  const [resolvedPayload, setResolvedPayload] = useState<UniversalQrPayload | null>(null);
  const [showPremiumSuccess, setShowPremiumSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState("");

  const completePayment = useCallback(async (draft: PendingQrPayment, amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) { setE("Missing amount"); setS("error"); return; }
    const iKey = generateIdempotencyKey(user?.id || "anon", draft.recipientId, amount, draft.contextId);
    if (isDuplicatePayment(iKey)) { setE("Duplicate payment — wait 30s"); setS("error"); return; }
    recordPaymentAttempt(iKey);
    setPayStepLabel("Opening payment…");
    setS("paying");
    const result = await openPaymentRef.current({
      amount,
      currency: draft.currency,
      title: `Pay ${draft.recipientName}`,
      subtitle: draft.kind === "shop" ? "Merchant payment" : "QR payment",
      recipientId: draft.recipientId,
      recipientName: draft.recipientName,
      contextType: draft.kind === "shop" ? "shop" : "generic",
      contextId: draft.contextId,
      metadata: { source: "qr_scan", qr_type: draft.payload.action, resolved_wallet_id: draft.walletId },
    });
    if (result.ok) {
      setPendingPayment(null); setManualAmount("");
      setSuccessAmount(`${amount} ${draft.currency}`);
      playPremiumSuccessBeep(); hapticPremiumSuccess();
      setShowPremiumSuccess(true);
      setTimeout(() => { setShowPremiumSuccess(false); setTxId(result.transactionId || ""); setS("paid"); }, 1600);
    } else if (result.error !== "Cancelled") {
      setE(result.error || "Payment failed"); setS("error");
    } else {
      setS("idle");
    }
  }, [user?.id, setE, setS]);

  const handleQrResult = useCallback(async (raw: string, navigateFn: (path: string, opts?: any) => void) => {
    const t0 = performance.now();
    const payload = decodeQr(raw);
    const decodeMs = performance.now() - t0;

    if (!payload) { platformBus.emit("qr:scan_failed", { raw, reason: "unsupported_format" }, "system"); setE("Unsupported QR format"); setS("error"); return; }
    if (isExpired(payload)) { setE("QR code expired"); setS("error"); return; }
    platformBus.emit("qr:scan_decoded", { action: payload.action, raw }, "system");

    if (payload.action === "pay_user") {
      if (!payload.userId?.trim()) { setE("Invalid QR"); setS("error"); return; }
      setPayStepLabel("Verifying payment…"); setS("paying");
      try {
        const resolved = await withTimeout(resolvePayTarget({ userId: payload.userId, currency: payload.currency || "AED" }), 6000, "Timeout");
        if (!resolved.targetUserId) { setE("Recipient not found"); setS("error"); return; }
        if (!resolved.displayName?.trim()) { setE("Recipient name unavailable"); setS("error"); return; }
        if (resolved.walletStatus === "locked") { setE("Recipient wallet locked"); setS("error"); return; }
        if (!resolved.targetWalletId) { setE("Recipient has no active wallet"); setS("error"); return; }
        if (user?.id && resolved.targetUserId === user.id) { setE("Cannot pay yourself"); setS("error"); return; }
        const draft: PendingQrPayment = {
          kind: "user", recipientId: resolved.targetUserId, recipientName: resolved.displayName!,
          walletId: resolved.targetWalletId, currency: resolved.currency || payload.currency || "AED",
          amount: typeof payload.amount === "number" && payload.amount > 0 ? payload.amount : null,
          contextId: resolved.targetUserId, payload, startedAt: t0,
          timings: { decodeMs, recipientResolveMs: resolved.timings?.recipientResolveMs ?? 0, walletResolveMs: resolved.timings?.walletResolveMs ?? 0 },
        };
        if (draft.amount) { await completePayment(draft, draft.amount); }
        else { setPendingPayment(draft); setManualAmount(""); setPayStepLabel("Amount required"); setS("resolved"); }
      } catch (err) { setE(err instanceof Error ? err.message : "Recipient not found"); setS("error"); }
      return;
    }

    if (payload.action === "pay_shop") {
      if (!payload.shopSlug?.trim()) { setE("Invalid QR"); setS("error"); return; }
      setPayStepLabel("Loading merchant…"); setS("paying");
      try {
        const shopResult: any = await withTimeout(
          Promise.resolve((supabase as any).from("storefront_pages").select("user_id, name, route_status").eq("slug", payload.shopSlug).neq("route_status", "broken").maybeSingle()),
          5000, "Timeout"
        );
        const shopOwnerId = shopResult?.data?.user_id as string | undefined;
        const shopName = shopResult?.data?.name?.trim() as string | undefined;
        if (!shopOwnerId) { setE("Merchant not found"); setS("error"); return; }
        if (!shopName) { setE("Merchant name unavailable"); setS("error"); return; }
        const resolved = await withTimeout(resolvePayTarget({ userId: shopOwnerId, currency: payload.currency || "AED" }), 6000, "Timeout");
        if (!resolved.targetWalletId) { setE("Merchant has no active wallet"); setS("error"); return; }
        const draft: PendingQrPayment = {
          kind: "shop", recipientId: shopOwnerId, recipientName: shopName,
          walletId: resolved.targetWalletId, currency: resolved.currency || payload.currency || "AED",
          amount: typeof payload.amount === "number" && payload.amount > 0 ? payload.amount : null,
          contextId: payload.shopSlug, payload, startedAt: t0,
          timings: { decodeMs, recipientResolveMs: resolved.timings?.recipientResolveMs ?? 0, walletResolveMs: resolved.timings?.walletResolveMs ?? 0 },
        };
        if (draft.amount) { await completePayment(draft, draft.amount); }
        else { setPendingPayment(draft); setManualAmount(""); setPayStepLabel("Amount required"); setS("resolved"); }
      } catch (err) { setE(err instanceof Error ? err.message : "Merchant not found"); setS("error"); }
      return;
    }

    if (payload.action === "profile" || payload.action === "add_contact" || payload.action === "shop") {
      setResolvedPayload(payload); setS("resolved"); return;
    }

    const route = resolveRoute(payload);
    if (route) { platformBus.emit("qr:navigation", { action: payload.action, route }, "system"); navigateFn(route, { replace: true }); return; }
    setE("Unsupported QR format"); setS("error");
  }, [user?.id, completePayment, setE, setS]);

  const submitManualAmount = useCallback(async (amount: number) => {
    if (!pendingPayment) return;
    await completePayment(pendingPayment, amount);
  }, [pendingPayment, completePayment]);

  const reset = useCallback(() => {
    setPendingPayment(null); setManualAmount(""); setPayStepLabel("");
    setTxId(""); setResolvedPayload(null);
  }, []);

  return {
    pendingPayment, manualAmount, setManualAmount, payStepLabel,
    txId, resolvedPayload, showPremiumSuccess, successAmount,
    handleQrResult, submitManualAmount, reset, completePayment,
  };
}
