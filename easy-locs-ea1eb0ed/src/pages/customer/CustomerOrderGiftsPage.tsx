import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DEFAULT_GIFT_ORDER_STATE } from "@/lib/checkout/giftOrder";

export default function CustomerOrderGiftsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(DEFAULT_GIFT_ORDER_STATE);

  const save = () => {
    toast.success("Gift order details saved");
    navigate("/checkout");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Gift Order" subtitle="Send as a gift" onBack={() => navigate("/checkout")} />

      <div className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
        <ToggleRow
          label="Enable gift wrapping"
          value={state.enabled}
          onToggle={() => setState((prev) => ({ ...prev, enabled: !prev.enabled }))}
        />

        <input
          value={state.recipientName}
          onChange={(e) => setState((prev) => ({ ...prev, recipientName: e.target.value }))}
          placeholder="Recipient name"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />

        <input
          value={state.recipientPhone}
          onChange={(e) => setState((prev) => ({ ...prev, recipientPhone: e.target.value }))}
          placeholder="Recipient phone"
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm"
        />

        <textarea
          value={state.cardMessage}
          onChange={(e) => setState((prev) => ({ ...prev, cardMessage: e.target.value }))}
          placeholder="Gift message"
          rows={4}
          className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm resize-none"
        />

        <button onClick={save} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full">
          Save Gift Details
        </button>
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
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
    <button onClick={onToggle} className="w-full flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3 text-left">
      <span className="text-sm font-semibold">{label}</span>
      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${value ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-foreground"}`}>
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}
