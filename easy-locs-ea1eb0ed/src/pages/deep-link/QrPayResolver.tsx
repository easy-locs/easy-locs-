import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { fetchPaymentRequest } from "@/payments/payment-request-hooks";
import { resolvePayTarget } from "@/lib/wallet/resolvePayTarget";
import { storefrontService } from "@/services";
import { preTransactionCheck, postTransactionRecord } from "@/lib/security/anti-fraud-guard";
import { Loader2, ShieldCheck } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function QrPayResolver() {
  useUiEngine("deep-link-qrpayresolver");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();
  const resolved = useRef(false);

  const type = params.get("t");
  const id = params.get("id");
  const amount = params.get("a") ? Number(params.get("a")) : undefined;
  const currency = params.get("c") || params.get("currency") || "AED";

  useEffect(() => {
    if (resolved.current) return;
    if (!id || !type) {
      navigate("/discover", { replace: true });
      return;
    }

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    resolved.current = true;

    async function resolve() {
      try {
        if (type === "request") {
          const pr = await fetchPaymentRequest(id!);
          if (pr && pr.status === "pending") {
            openPayment({
              amount: pr.amount,
              currency: pr.currency,
              title: pr.title || "Payment request",
              subtitle: pr.subtitle || undefined,
              recipientId: pr.requester_id,
              recipientName: pr.title || "Payment request",
              contextType: "order",
              contextId: pr.id,
            });
          }
        } else {
          let resolvedUserId = id!;
          if (type === "shop") {
            const shopResult = await storefrontService.fetchUserIdBySlug(id!);
            if (!shopResult?.user_id) {
              navigate("/discover", { replace: true });
              return;
            }
            resolvedUserId = shopResult.user_id;
          }

          const target = await resolvePayTarget({
            userId: resolvedUserId,
            currency,
          });

          if (!target.targetUserId) {
            navigate("/discover", { replace: true });
            return;
          }

          if (user.id === target.targetUserId) {
            navigate("/discover", { replace: true });
            return;
          }

          const fraudCheck = preTransactionCheck(user.id, "payment", {
            recipientId: target.targetUserId,
            amount: amount || 0,
            currency,
          });
          if (!fraudCheck.pass) {
            navigate("/discover", { replace: true });
            return;
          }

          const verifiedName = target.displayName || "Recipient";

          openPayment({
            amount: amount || 0,
            currency: target.currency || currency,
            title: `Pay ${verifiedName}`,
            recipientId: target.targetUserId,
            recipientName: verifiedName,
            contextType: type === "shop" ? "shop" : "generic",
            contextId: id!,
          });

          postTransactionRecord(fraudCheck.idempotencyKey, { initiated: true });
        }
      } catch {
      }
      navigate("/discover", { replace: true });
    }

    resolve();
  }, [id, type, amount, currency, user, navigate, openPayment]);

  return (
    <div className="app-mobile-page bg-background flex flex-col items-center justify-center gap-3">
      <ShieldCheck className="h-6 w-6 text-primary" />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Verifying payment…</p>
    </div>
  );
}
