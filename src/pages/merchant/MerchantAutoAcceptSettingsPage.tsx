import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function MerchantAutoAcceptSettingsPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: merchant, isLoading } = useQuery({
    queryKey: ["merchant-auto-accept", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchants")
        .select("*")
        .eq("id", merchantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!merchantId,
    staleTime: 5000,
  });

  useEffect(() => {
    if (merchant) setEnabled(!!(merchant as any).auto_accept_orders);
  }, [merchant]);

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({ auto_accept_orders: enabled, updated_at: new Date().toISOString() })
        .eq("id", merchantId);
      if (error) throw error;
      toast.success("Auto accept updated");
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Auto Accept</h1>
          <p className="text-xs text-muted-foreground">Automatically accept incoming orders</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mx-4 h-16 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="px-4 space-y-4">
          <div className="rounded-2xl border border-border/20 bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Enable Auto Accept</p>
              <p className="text-xs text-muted-foreground">Orders are confirmed automatically</p>
            </div>
            <button
              onClick={() => setEnabled((v) => !v)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
              }`}
            >
              {enabled ? "On" : "Off"}
            </button>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold active:scale-[0.97] transition-transform"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
