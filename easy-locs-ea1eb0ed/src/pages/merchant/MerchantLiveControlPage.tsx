import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { merchantService } from "@/services/merchant.service";
import { setMerchantOpenFlag } from "@/lib/merchant/availabilityEngine";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function MerchantLiveControlPage() {
  useUiEngine("merchant-merchantlivecontrolpage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [saving, setSaving] = useState(false);
  const [promoActive, setPromoActive] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);

  const { data: merchant, isLoading, refetch, isError } = useQuery({
    queryKey: ["merchant-live-control", merchantId],
    queryFn: () => merchantService.fetchMerchantById(merchantId),
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
      await setMerchantOpenFlag({ merchantId, isOpen: openFlag });
      await merchantService.updateMerchant(merchantId, { promo_active: promoActive });
      toast.success("Live control updated");
      refetch();
    } catch (err: any) {
      toast.error("Could not update live controls");
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return (
      <SubPageShell title="Live Control" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}>
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      </SubPageShell>
    );
  }

  return (
    <SubPageShell
      title="Live Control"
      subtitle="Store live visibility switches"
      onBack={() => navigate(`/merchant/dashboard/${merchantId}`)}
      noContentPad
    >
      {isLoading ? (
        <div className="mx-4 mt-4 h-32 rounded-2xl bg-muted animate-pulse" />
      ) : (
        <div className="px-4 pt-4 space-y-4">
          <ToggleRow label="Store Open" value={openFlag} onToggle={() => setOpenFlag((v) => !v)} />
          <ToggleRow label="Promo Active" value={promoActive} onToggle={() => setPromoActive((v) => !v)} />
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Live Control"}
          </button>
        </div>
      )}
    </SubPageShell>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <span className={`rounded-full px-3 py-1 text-[0.6875rem] font-bold ${
          value ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
        }`}>
          {value ? "On" : "Off"}
        </span>
      </div>
    </button>
  );
}
