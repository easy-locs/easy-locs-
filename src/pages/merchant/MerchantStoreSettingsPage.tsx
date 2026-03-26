import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function MerchantStoreSettingsPage() {
  const navigate = useNavigate();
  const { merchantId } = useParams();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data: merchant, refetch } = useQuery({
    queryKey: ["merchant-store-settings", merchantId],
    enabled: !!merchantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("seed_merchants")
        .select("*")
        .eq("id", merchantId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10000,
  });

  useEffect(() => {
    if (merchant && !form) {
      setForm({
        support_phone: merchant.support_phone ?? "",
        support_email: merchant.support_email ?? "",
        delivery_radius_km: merchant.delivery_radius_km ?? 7,
        minimum_order_amount: merchant.minimum_order_amount ?? 0,
        promo_text: merchant.promo_text ?? "",
        promo_active: merchant.promo_active ?? false,
        opening_hours: merchant.opening_hours && typeof merchant.opening_hours === "object"
          ? merchant.opening_hours
          : DAYS.reduce((acc: any, d) => {
              acc[d] = { open: "10:00", close: "23:00", enabled: true };
              return acc;
            }, {}),
        delivery_zones: Array.isArray(merchant.delivery_zones) ? merchant.delivery_zones : [],
      });
    }
  }, [merchant, form]);

  if (!merchant || !form) {
    return (
      <div className="app-mobile-page flex flex-col bg-background p-4">
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const save = async () => {
    try {
      setSaving(true);
      const { error } = await (supabase as any)
        .from("seed_merchants")
        .update({
          support_phone: form.support_phone,
          support_email: form.support_email,
          delivery_radius_km: Number(form.delivery_radius_km || 0),
          minimum_order_amount: Number(form.minimum_order_amount || 0),
          promo_text: form.promo_text,
          promo_active: !!form.promo_active,
          opening_hours: form.opening_hours,
          delivery_zones: form.delivery_zones,
          updated_at: new Date().toISOString(),
        })
        .eq("id", merchant.id);
      if (error) throw error;
      toast.success("Store settings saved");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: string, key: string, value: any) => {
    setForm((prev: any) => ({
      ...prev,
      opening_hours: { ...prev.opening_hours, [day]: { ...prev.opening_hours[day], [key]: value } },
    }));
  };

  const addZone = () => setForm((prev: any) => ({ ...prev, delivery_zones: [...prev.delivery_zones, { name: "", fee: 0 }] }));
  const updateZone = (i: number, key: string, value: any) => setForm((prev: any) => ({
    ...prev,
    delivery_zones: prev.delivery_zones.map((z: any, idx: number) => idx === i ? { ...z, [key]: value } : z),
  }));
  const removeZone = (i: number) => setForm((prev: any) => ({
    ...prev,
    delivery_zones: prev.delivery_zones.filter((_: any, idx: number) => idx !== i),
  }));

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/merchant/dashboard")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Store Settings</h1>
          <p className="text-xs text-muted-foreground">{merchant.name}</p>
        </div>
      </header>

      <div className="px-4 pb-24 space-y-4">
        {/* Support */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Support</p>
          <input value={form.support_phone} onChange={(e) => setForm((p: any) => ({ ...p, support_phone: e.target.value }))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Support phone" />
          <input value={form.support_email} onChange={(e) => setForm((p: any) => ({ ...p, support_email: e.target.value }))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Support email" />
        </div>

        {/* Delivery Rules */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Delivery Rules</p>
          <input type="number" value={form.delivery_radius_km} onChange={(e) => setForm((p: any) => ({ ...p, delivery_radius_km: e.target.value }))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Delivery radius km" />
          <input type="number" value={form.minimum_order_amount} onChange={(e) => setForm((p: any) => ({ ...p, minimum_order_amount: e.target.value }))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Minimum order amount" />
        </div>

        {/* Promo */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Promotions</p>
            <button onClick={() => setForm((p: any) => ({ ...p, promo_active: !p.promo_active }))} className={`rounded-full px-3 py-1 text-xs font-bold ${form.promo_active ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              {form.promo_active ? "Active" : "Inactive"}
            </button>
          </div>
          <input value={form.promo_text} onChange={(e) => setForm((p: any) => ({ ...p, promo_text: e.target.value }))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Promo text" />
        </div>

        {/* Opening Hours */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Opening Hours</p>
          {DAYS.map((day) => (
            <div key={day} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground uppercase">{day}</p>
                <button onClick={() => updateDay(day, "enabled", !form.opening_hours[day]?.enabled)} className={`rounded-full px-3 py-1 text-[11px] font-bold ${form.opening_hours[day]?.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {form.opening_hours[day]?.enabled ? "Open" : "Closed"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.opening_hours[day]?.open ?? ""} onChange={(e) => updateDay(day, "open", e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Open" />
                <input value={form.opening_hours[day]?.close ?? ""} onChange={(e) => updateDay(day, "close", e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Close" />
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Zones */}
        <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Delivery Zones</p>
            <button onClick={addZone} className="rounded-xl bg-muted px-3 py-1 text-xs font-bold text-foreground">+ Add</button>
          </div>
          {form.delivery_zones.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No delivery zones yet</p>}
          {form.delivery_zones.map((zone: any, i: number) => (
            <div key={i} className="space-y-2 rounded-xl bg-muted p-3">
              <input value={zone.name} onChange={(e) => updateZone(i, "name", e.target.value)} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Zone name" />
              <input type="number" value={zone.fee} onChange={(e) => updateZone(i, "fee", Number(e.target.value))} className="w-full rounded-xl border border-border/20 bg-background px-3 py-2.5 text-sm" placeholder="Delivery fee" />
              <button onClick={() => removeZone(i)} className="rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold">Remove Zone</button>
            </div>
          ))}
        </div>

        <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold disabled:opacity-50">
          {saving ? "Saving..." : "Save Store Settings"}
        </button>
      </div>
    </div>
  );
}
