/**
 * CouponsPromotions — Promo codes, flash sales, bundles
 * Seller: create/manage coupons, flash sales, bundles
 * Buyer: apply coupons, see active promotions
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Zap, Package, Plus, Loader2, Percent, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  onApplyCoupon?: (discount: { type: string; value: number; code: string }) => void;
}

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function CouponsPromotions({ shopId, mode, onApplyCoupon }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"coupons" | "flash" | "bundles">("coupons");

  // Coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_coupons")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Flash sales
  const { data: flashSales = [] } = useQuery({
    queryKey: ["flash-sales", shopId],
    queryFn: async () => {
      const query = (supabase as any).from("storefront_flash_sales")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      const { data } = await query;
      return data || [];
    },
  });

  // Bundles
  const { data: bundles = [] } = useQuery({
    queryKey: ["bundles", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_bundles")
        .select("*").eq("shop_id", shopId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Create coupon
  const [couponForm, setCouponForm] = useState({ code: "", type: "percentage", value: 10, minOrder: 0, maxUses: "" });
  const createCoupon = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_coupons").insert({
        shop_id: shopId, user_id: user!.id,
        code: couponForm.code.toUpperCase(),
        type: couponForm.type,
        value: couponForm.value,
        min_order: couponForm.minOrder || 0,
        usage_limit: couponForm.maxUses ? Number(couponForm.maxUses) : null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setCouponForm({ code: "", type: "percentage", value: 10, minOrder: 0, maxUses: "" });
      toast.success("Coupon created");
    },
  });

  // Create flash sale
  const [flashForm, setFlashForm] = useState({ title: "", discount: 20, endsIn: 24 });
  const createFlash = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_flash_sales").insert({
        shop_id: shopId,
        title: flashForm.title,
        discount_percent: flashForm.discount,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + flashForm.endsIn * 3600000).toISOString(),
        status: "active",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flash-sales"] });
      setFlashForm({ title: "", discount: 20, endsIn: 24 });
      toast.success("Flash sale created");
    },
  });

  // Create bundle
  const [bundleForm, setBundleForm] = useState({ title: "", price: 0, currency: "EUR" });
  const createBundle = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("storefront_bundles").insert({
        shop_id: shopId, user_id: user!.id,
        title: bundleForm.title, bundle_price: bundleForm.price, currency: bundleForm.currency,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bundles"] });
      setBundleForm({ title: "", price: 0, currency: "EUR" });
      toast.success("Bundle created");
    },
  });

  // Buyer: apply coupon
  const [couponInput, setCouponInput] = useState("");
  const applyCoupon = () => {
    const found = coupons.find((c: any) => c.code === couponInput.toUpperCase() && c.active);
    if (!found) { toast.error("Invalid coupon code"); return; }
    if (found.usage_limit && found.usage_count >= found.usage_limit) { toast.error("Coupon expired"); return; }
    onApplyCoupon?.({ type: found.type, value: found.value, code: found.code });
    toast.success(`Coupon ${found.code} applied! ${found.type === "percentage" ? found.value + "% off" : fmtPrice(found.value) + " off"}`);
  };

  // Delete
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => { await (supabase as any).from("storefront_coupons").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["coupons"] }); toast.success("Deleted"); },
  });

  if (isLoading) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>;

  // BUYER MODE
  if (mode === "buyer") {
    const activeFlash = flashSales.filter((f: any) => f.status === "active" && new Date(f.ends_at) > new Date());
    const activeBundles = bundles.filter((b: any) => b.active);

    return (
      <div className="space-y-3">
        {/* Apply coupon */}
        <Card>
          <CardContent className="p-3">
            <h4 className="text-xs font-semibold flex items-center gap-1 mb-2"><Ticket className="h-3 w-3 text-primary" /> Have a coupon?</h4>
            <div className="flex gap-2">
              <Input value={couponInput} onChange={e => setCouponInput(e.target.value)}
                placeholder="Enter code" className="text-xs h-8 flex-1 uppercase" />
              <Button size="sm" className="h-8 text-xs" onClick={applyCoupon} disabled={!couponInput.trim()}>Apply</Button>
            </div>
          </CardContent>
        </Card>

        {/* Active flash sales */}
        {activeFlash.length > 0 && (
          <div className="space-y-2">
            {activeFlash.map((f: any) => (
              <Card key={f.id} className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-destructive" />
                    <div className="flex-1">
                      <p className="text-xs font-bold">{f.title}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> Ends {new Date(f.ends_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="bg-destructive/20 text-destructive text-[10px]">-{f.discount_percent}%</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bundles */}
        {activeBundles.length > 0 && activeBundles.map((b: any) => (
          <Card key={b.id}>
            <CardContent className="p-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-xs font-semibold">{b.title}</p>
                {b.description && <p className="text-[9px] text-muted-foreground">{b.description}</p>}
              </div>
              <span className="text-sm font-bold text-primary">{fmtPrice(b.bundle_price, b.currency)}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // SELLER MODE
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" /> Promotions
        </h3>
        <div className="flex gap-1">
          {(["coupons", "flash", "bundles"] as const).map(v => (
            <Button key={v} size="sm" variant={tab === v ? "default" : "ghost"} className="text-[10px] h-6 px-2"
              onClick={() => setTab(v)}>
              {v === "coupons" ? "Coupons" : v === "flash" ? "Flash Sales" : "Bundles"}
            </Button>
          ))}
        </div>
      </div>

      {/* COUPONS */}
      {tab === "coupons" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Create Coupon</h4>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="CODE" value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value }))}
                  className="text-xs h-8 uppercase" />
                <Select value={couponForm.type} onValueChange={v => setCouponForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage" className="text-xs">% Off</SelectItem>
                    <SelectItem value="fixed" className="text-xs">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" placeholder="Value" value={couponForm.value}
                  onChange={e => setCouponForm(p => ({ ...p, value: Number(e.target.value) }))} className="text-xs h-8" />
                <Input type="number" placeholder="Min order" value={couponForm.minOrder}
                  onChange={e => setCouponForm(p => ({ ...p, minOrder: Number(e.target.value) }))} className="text-xs h-8" />
                <Input type="number" placeholder="Max uses" value={couponForm.maxUses}
                  onChange={e => setCouponForm(p => ({ ...p, maxUses: e.target.value }))} className="text-xs h-8" />
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => createCoupon.mutate()}
                disabled={!couponForm.code.trim() || createCoupon.isPending}>
                <Plus className="h-3 w-3 mr-1" /> Create Coupon
              </Button>
            </CardContent>
          </Card>

          {coupons.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-2.5 flex items-center gap-2">
                <Percent className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold">{c.code}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {c.type === "percentage" ? `${c.value}% off` : fmtPrice(c.value)} • Used {c.usage_count || 0}{c.usage_limit ? `/${c.usage_limit}` : ""}
                  </p>
                </div>
                <Badge variant={c.active ? "default" : "secondary"} className="text-[7px]">{c.active ? "Active" : "Off"}</Badge>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteCoupon.mutate(c.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FLASH SALES */}
      {tab === "flash" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Create Flash Sale</h4>
              <Input placeholder="Sale title" value={flashForm.title} onChange={e => setFlashForm(p => ({ ...p, title: e.target.value }))} className="text-xs" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Discount %" value={flashForm.discount}
                  onChange={e => setFlashForm(p => ({ ...p, discount: Number(e.target.value) }))} className="text-xs h-8" />
                <Input type="number" placeholder="Duration (hours)" value={flashForm.endsIn}
                  onChange={e => setFlashForm(p => ({ ...p, endsIn: Number(e.target.value) }))} className="text-xs h-8" />
              </div>
              <Button size="sm" className="w-full text-xs" onClick={() => createFlash.mutate()}
                disabled={!flashForm.title.trim() || createFlash.isPending}>
                <Zap className="h-3 w-3 mr-1" /> Launch Flash Sale
              </Button>
            </CardContent>
          </Card>

          {flashSales.map((f: any) => {
            const active = f.status === "active" && new Date(f.ends_at) > new Date();
            return (
              <Card key={f.id} className={active ? "border-destructive/20" : ""}>
                <CardContent className="p-2.5 flex items-center gap-2">
                  <Zap className={`h-3.5 w-3.5 ${active ? "text-destructive" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{f.title}</p>
                    <p className="text-[9px] text-muted-foreground">-{f.discount_percent}% • Ends {new Date(f.ends_at).toLocaleString()}</p>
                  </div>
                  <Badge className={`text-[7px] ${active ? "bg-destructive/20 text-destructive" : ""}`}>{active ? "Live" : "Ended"}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* BUNDLES */}
      {tab === "bundles" && (
        <div className="space-y-3">
          <Card>
            <CardContent className="p-3 space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Create Bundle</h4>
              <Input placeholder="Bundle title" value={bundleForm.title} onChange={e => setBundleForm(p => ({ ...p, title: e.target.value }))} className="text-xs" />
              <Input type="number" placeholder="Bundle price" value={bundleForm.price || ""}
                onChange={e => setBundleForm(p => ({ ...p, price: Number(e.target.value) }))} className="text-xs h-8" />
              <Button size="sm" className="w-full text-xs" onClick={() => createBundle.mutate()}
                disabled={!bundleForm.title.trim() || createBundle.isPending}>
                <Package className="h-3 w-3 mr-1" /> Create Bundle
              </Button>
            </CardContent>
          </Card>

          {bundles.map((b: any) => (
            <Card key={b.id}>
              <CardContent className="p-2.5 flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{b.title}</p>
                  {b.description && <p className="text-[9px] text-muted-foreground">{b.description}</p>}
                </div>
                <span className="text-xs font-bold text-primary">{fmtPrice(b.bundle_price, b.currency)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
