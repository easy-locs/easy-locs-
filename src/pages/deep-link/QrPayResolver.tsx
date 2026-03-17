/**
 * /pay/qr — Legacy QR Pay resolver page.
 * Reads QR params from URL, converts to unified payload, resolves.
 */
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedPayment } from "@/payments/UnifiedPaymentSystem";
import { fetchPaymentRequest } from "@/payments/payment-request-hooks";
import { decodeQr, resolveRoute } from "@/lib/qr-engine";
import { Loader2 } from "lucide-react";

export default function QrPayResolver() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPayment } = useUnifiedPayment();

  const type = params.get("t"); // user | shop | request
  const id = params.get("id");
  const amount = params.get("a") ? Number(params.get("a")) : undefined;
  const currency = params.get("c") || "AED";
  const name = params.get("n") || "";

  useEffect(() => {
    if (!id || !type) {
      navigate("/discover", { replace: true });
      return;
    }

    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
      return;
    }

    async function resolve() {
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
        openPayment({
          amount: amount || 0,
          currency,
          title: `Pay ${name}`.trim(),
          recipientId: id!,
          recipientName: name || null,
          contextType: type === "shop" ? "shop" : "generic",
          contextId: id!,
        });
      }
      navigate("/discover", { replace: true });
    }

    resolve();
  }, [id, type, amount, currency, name, user, navigate, openPayment]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
