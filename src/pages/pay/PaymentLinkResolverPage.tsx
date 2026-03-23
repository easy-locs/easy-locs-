/**
 * PaymentLinkResolverPage — Paste link, JSON, email, orbit ID, or user ID to pay.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { decodeQr } from "@/lib/qr-engine";
import { AppCard } from "@/components/ui/AppCard";
import { AppActionButton } from "@/components/ui/AppActionButton";
import { toast } from "sonner";

export default function PaymentLinkResolverPage() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const resolve = async () => {
    const trimmed = value.trim();
    if (!trimmed) { toast.error("Paste a link, email, or user ID"); return; }
    setLoading(true);

    try {
      // Try as QR JSON payload
      const parsed = parsePaymentQrPayload(trimmed);
      if (parsed) {
        const params = new URLSearchParams();
        if (parsed.recipientUserId) params.set("userId", parsed.recipientUserId);
        if (parsed.recipientOrbitId) params.set("orbitId", parsed.recipientOrbitId);
        if (parsed.recipientEmail) params.set("email", parsed.recipientEmail);
        if (parsed.amount) params.set("amount", String(parsed.amount));
        if (parsed.currency) params.set("currency", parsed.currency);
        if (parsed.note) params.set("note", parsed.note);
        navigate(`/pay/confirm?${params.toString()}`);
        return;
      }

      // Try as email
      if (trimmed.includes("@")) {
        navigate(`/pay/confirm?email=${encodeURIComponent(trimmed.toLowerCase())}`);
        return;
      }

      // Try as orbit ID
      if (trimmed.startsWith("orbit_")) {
        navigate(`/pay/confirm?orbitId=${encodeURIComponent(trimmed)}`);
        return;
      }

      // Try as URL with params
      if (trimmed.startsWith("http")) {
        try {
          const url = new URL(trimmed);
          const userId = url.searchParams.get("id") || url.searchParams.get("userId");
          if (userId) {
            navigate(`/pay/confirm?userId=${encodeURIComponent(userId)}`);
            return;
          }
        } catch { /* not a valid URL */ }
      }

      // Default: treat as userId
      navigate(`/pay/confirm?userId=${encodeURIComponent(trimmed)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-[0.95] transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Payment Link</h1>
          <p className="text-xs text-muted-foreground">Paste a link, email, or user ID</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        <AppCard variant="base" padding="md">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste payment link, email, user ID, or QR data…"
            rows={4}
            className="w-full rounded-xl border border-border/20 bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-2 focus:ring-primary/20"
          />
        </AppCard>
        <AppActionButton full loading={loading} onClick={() => void resolve()}>
          <ArrowRight className="h-4 w-4" />
          Continue
        </AppActionButton>
      </div>
    </div>
  );
}
