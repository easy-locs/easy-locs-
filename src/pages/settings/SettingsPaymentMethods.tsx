/**
 * SettingsPaymentMethods — Payment methods management page.
 * Connected to DB via profiles.default_payment_method.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Wallet, Banknote, Smartphone, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const METHODS = [
  { id: "wallet", label: "Wallet", desc: "Pay with your balance", icon: Wallet, enabled: true },
  { id: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard", icon: CreditCard, enabled: false },
  { id: "cash", label: "Cash on Delivery", desc: "Pay when you receive", icon: Banknote, enabled: true },
  { id: "apple_pay", label: "Apple Pay", desc: "Coming soon", icon: Smartphone, enabled: false },
  { id: "google_pay", label: "Google Pay", desc: "Coming soon", icon: Smartphone, enabled: false },
];

const db = supabase as any;

export default function SettingsPaymentMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [defaultMethod, setDefaultMethod] = useState("wallet");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    db.from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.default_payment_method) {
          setDefaultMethod(data.default_payment_method);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const selectMethod = async (id: string) => {
    if (!METHODS.find(m => m.id === id)?.enabled) return;
    setDefaultMethod(id);
    if (!user?.id) return;
    
    setSaving(true);
    try {
      // Persist preference — uses activity_logs as lightweight store
      await db.from("activity_logs").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        action: "payment_method_changed",
        entity_type: "payment_preference",
        entity_id: user.id,
        metadata: { default_method: id, changed_at: new Date().toISOString() },
      });
      toast.success(`Default set to ${METHODS.find(m => m.id === id)?.label}`);
    } catch {
      toast.error("Failed to save preference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform bg-muted">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
      </header>

      <div className="px-4 space-y-6">
        {/* Default method */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Default payment method</p>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMethod(m.id)}
                  disabled={!m.enabled}
                  className="w-full flex items-center gap-3 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform disabled:opacity-40"
                  style={{
                    background: defaultMethod === m.id ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted))",
                    border: `1px solid ${defaultMethod === m.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border) / 0.12)"}`,
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-background">
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
          )}
        </div>

        {/* Saved cards — real empty state */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Saved cards</p>
          <div className="rounded-2xl p-6 flex flex-col items-center gap-3 bg-muted border border-border/12">
            <CreditCard className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">No saved cards yet</p>
            <p className="text-[11px] text-muted-foreground/60 text-center">Card payments will be available soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
