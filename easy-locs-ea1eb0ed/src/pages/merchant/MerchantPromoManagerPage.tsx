import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import SubPageShell from "@/components/layout/SubPageShell";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function MerchantPromoManagerPage() {
  useUiEngine("merchant-merchantpromomanagerpage");
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("10");
  const [minimum, setMinimum] = useState("0");
  const [saving, setSaving] = useState(false);

  const { data: promos = [], refetch , isError } = useQuery({
    queryKey: ["merchant-promos", merchantId],
    enabled: !!merchantId,
    queryFn: () => merchantService.fetchPromos(merchantId!),
    staleTime: 5000,
  });

  const createPromo = async () => {
    if (!title.trim()) { toast.error("Enter promo title"); return; }
    try {
      setSaving(true);
      await merchantService.insertPromo(merchantId!, {
        title,
        description: null,
        discount_type: "percent",
        discount_value: Number(value || 0),
        minimum_order_amount: Number(minimum || 0),
      });
      setTitle(""); setValue("10"); setMinimum("0");
      toast.success("Promo created");
      refetch();
    } catch (err: any) {
      toast.error("Could not create promo");
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (promo: any) => {
    try {
      await merchantService.togglePromo(promo.id, promo.is_active);
      refetch();
    } catch { /* silent */ }
  };

  if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);

  return (
    <SubPageShell title="Promo Manager" subtitle="Discounts and campaigns" onBack={() => navigate("/merchant/dashboard")} contentClassName="space-y-4">
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Create Promo</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Promo title" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Discount %" />
            <input type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Minimum order" />
          </div>
          <button onClick={createPromo} disabled={saving} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
            {saving ? "Creating..." : "Create Promo"}
          </button>
        </div>

        <div className="space-y-3">
          {promos.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No promos yet</p>}
          {promos.map((promo: any) => (
            <div key={promo.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{promo.title}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {promo.discount_value}% off · Min {Number(promo.minimum_order_amount ?? 0).toFixed(2)} AED
                  </p>
                </div>
                <button onClick={() => togglePromo(promo)} className={`rounded-full px-3 py-1 text-[0.6875rem] font-bold ${promo.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {promo.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </SubPageShell>
  );
}
