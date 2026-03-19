/**
 * SettingsPaymentMethods — Payment methods management page.
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Wallet, Banknote, Smartphone, Plus, Check } from "lucide-react";
import { useState } from "react";

const METHODS = [
  { id: "wallet", label: "Wallet", desc: "Pay with your balance", icon: Wallet, enabled: true },
  { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard", icon: CreditCard, enabled: false },
  { id: "cash", label: "Cash on Delivery", desc: "Pay when you receive", icon: Banknote, enabled: true },
  { id: "apple_pay", label: "Apple Pay", desc: "Coming soon", icon: Smartphone, enabled: false },
  { id: "google_pay", label: "Google Pay", desc: "Coming soon", icon: Smartphone, enabled: false },
];

export default function SettingsPaymentMethods() {
  const navigate = useNavigate();
  const [defaultMethod, setDefaultMethod] = useState("wallet");

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
      </header>

      <div className="px-4 space-y-6">
        {/* Default method */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Default payment method</p>
          <div className="space-y-2">
            {METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => m.enabled && setDefaultMethod(m.id)}
                disabled={!m.enabled}
                className="w-full flex items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform disabled:opacity-40"
                style={{
                  background: defaultMethod === m.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted))",
                  border: `1px solid ${defaultMethod === m.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.12)"}`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--background))" }}>
                  <m.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground">{m.desc}</p>
                </div>
                {defaultMethod === m.id && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Saved cards */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Saved cards</p>
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3" style={{ background: "hsl(var(--muted))", border: "1px solid hsl(var(--border) / 0.12)" }}>
            <CreditCard className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">No saved cards yet</p>
            <button className="flex items-center gap-2 text-xs font-bold text-primary mt-1">
              <Plus className="w-3.5 h-3.5" />
              Add a card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
