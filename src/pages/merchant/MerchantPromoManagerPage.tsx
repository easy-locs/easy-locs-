import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function MerchantPromoManagerPage() {
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("10");
  const [minimum, setMinimum] = useState("0");
  const [saving, setSaving] = useState(false);

  const { data: promos = [], refetch } = useQuery({
    queryKey: ["merchant-promos", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchant_promos")
        .select("*")
        .eq("merchant_id", merchantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5000,
  });

  const createPromo = async () => {
    if (!title.trim()) { toast.error("Enter promo title"); return; }
    try {
      setSaving(true);
      const { error } = await (supabase as any).from("seed_merchant_promos").insert({
        merchant_id: merchantId!,
        title,
        description: null,
        discount_type: "percent",
        discount_value: Number(value || 0),
        minimum_order_amount: Number(minimum || 0),
        is_active: true,
      });
      if (error) throw error;
      setTitle(""); setValue("10"); setMinimum("0");
      toast.success("Promo created");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not create promo");
    } finally {
      setSaving(false);
    }
  };

  const togglePromo = async (promo: any) => {
    const { error } = await (supabase as any)
      .from("seed_merchant_promos")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);
    if (!error) refetch();
  };

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/merchant/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Promo Manager</h1>
          <p className="text-xs text-muted-foreground">Discounts and campaigns</p>
        </div>
      </header>

      <div className="px-4 pb-24 space-y-4">
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
                  <p className="text-[11px] text-muted-foreground">
                    {promo.discount_value}% off · Min {Number(promo.minimum_order_amount ?? 0).toFixed(2)} AED
                  </p>
                </div>
                <button onClick={() => togglePromo(promo)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${promo.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                  {promo.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
