import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setMerchantOpenFlag } from "@/lib/merchant/availabilityEngine";

export default function MerchantLiveControlPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [saving, setSaving] = useState(false);
  const [promoActive, setPromoActive] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);

  const { data: merchant, isLoading, refetch } = useQuery({
    queryKey: ["merchant-live-control", merchantId],
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
    if (!merchant) return;
    setPromoActive(!!(merchant as any).promo_active);
    setOpenFlag(!!(merchant as any).is_open);
  }, [merchant]);

  const save = async () => {
    try {
      setSaving(true);

      await setMerchantOpenFlag({
        merchantId,
        isOpen: openFlag,
      });

      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({
          promo_active: promoActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchantId);

      if (error) throw error;

      toast.success("Live control updated");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update live controls");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Control</h1>
          <p className="text-xs text-muted-foreground">Store live visibility switches</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mx-4 h-32 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="px-4 space-y-4">
          <ToggleRow
            label="Store Open"
            value={openFlag}
            onToggle={() => setOpenFlag((v) => !v)}
          />
          <ToggleRow
            label="Promo Active"
            value={promoActive}
            onToggle={() => setPromoActive((v) => !v)}
          />
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Live Control"}
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <button onClick={onToggle} className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
          value ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
        }`}>
          {value ? "On" : "Off"}
        </span>
      </div>
    </button>
  );
}
