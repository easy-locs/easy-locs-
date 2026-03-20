import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function AdminPaymentGoLivePage() {
  const navigate = useNavigate();
  const [stripeReady, setStripeReady] = useState(true);
  const [walletReady, setWalletReady] = useState(true);
  const [cashReady, setCashReady] = useState(true);
  const [webhookReady, setWebhookReady] = useState(false);

  const goLive = () => {
    if (!stripeReady || !walletReady || !cashReady || !webhookReady) {
      toast.error("Complete all payment readiness checks first");
      return;
    }
    toast.success("Payment stack marked go-live ready");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Payment Go-Live" subtitle="Enable live payments" onBack={() => navigate("/admin")} />

      <div className="space-y-3">
        <ToggleRow label="Stripe configured" value={stripeReady} onToggle={() => setStripeReady((v) => !v)} />
        <ToggleRow label="Wallet ready" value={walletReady} onToggle={() => setWalletReady((v) => !v)} />
        <ToggleRow label="Cash flow ready" value={cashReady} onToggle={() => setCashReady((v) => !v)} />
        <ToggleRow label="Webhooks configured" value={webhookReady} onToggle={() => setWebhookReady((v) => !v)} />
      </div>

      <button onClick={goLive} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Confirm Payment Go Live
      </button>
    </div>
  );
}

function Header({ title, subtitle, onBack }: any) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between rounded-2xl border border-border/20 bg-card px-4 py-3 text-left">
      <span className="text-sm font-semibold">{label}</span>
      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}
