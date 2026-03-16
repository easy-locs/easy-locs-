/**
 * CouponManager — Seller-facing coupon CRUD for storefront shops.
 * Create, toggle, copy codes, view usage stats.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tag, Plus, Copy, ToggleLeft, ToggleRight, Loader2, Percent, DollarSign, Truck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CouponManagerProps {
  shopId: string;
}

const typeConfig = {
  percentage: { label: "% Off", icon: Percent, color: "text-primary" },
  fixed: { label: "Fixed", icon: DollarSign, color: "text-emerald-600" },
  free_delivery: { label: "Free Delivery", icon: Truck, color: "text-blue-600" },
};

const fmtValue = (type: string, value: number, currency = "EUR") => {
  if (type === "percentage") return `${value}%`;
  if (type === "free_delivery") return "Free";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0 }).format(value); }
  catch { return `${value} ${currency}`; }
};

export default function CouponManager({ shopId }: CouponManagerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [usageLimit, setUsageLimit] = useState("100");
  const [perUserLimit, setPerUserLimit] = useState("1");
  const [validTo, setValidTo] = useState("");

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["shop-coupons", shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("storefront_coupons")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createCoupon = async () => {
    if (!code.trim()) return toast.error("Code required");
    setCreating(true);
    try {
      const { error } = await (supabase as any).from("storefront_coupons").insert({
        shop_id: shopId,
        user_id: user!.id,
        code: code.trim().toUpperCase(),
        type,
        value: parseFloat(value) || 0,
        min_order: parseFloat(minOrder) || 0,
        max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
        usage_limit: parseInt(usageLimit) || 100,
        per_user_limit: parseInt(perUserLimit) || 1,
        valid_to: validTo || null,
      });
      if (error) throw error;
      toast.success("Coupon created");
      setShowCreate(false);
      setCode(""); setValue("10"); setMinOrder("0"); setMaxDiscount(""); setValidTo("");
      qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
    } catch (e: any) {
      toast.error(e.message?.includes("unique") ? "Code already exists" : "Failed to create coupon");
    } finally {
      setCreating(false);
    }
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await (supabase as any).from("storefront_coupons").update({ active: !active, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
  };

  const deleteCoupon = async (id: string) => {
    await (supabase as any).from("storefront_coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
    toast.success("Coupon deleted");
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`Copied: ${c}`);
  };

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> Coupons ({coupons.length})
        </h3>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3 mr-1" /> New
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px]">Code</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SUMMER25" className="h-8 text-xs uppercase" />
              </div>
              <div>
                <Label className="text-[10px]">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="free_delivery">Free Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Value</Label>
                <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-8 text-xs" disabled={type === "free_delivery"} />
              </div>
              <div>
                <Label className="text-[10px]">Min Order</Label>
                <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Max Discount</Label>
                <Input type="number" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="∞" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Usage Limit</Label>
                <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Per User</Label>
                <Input type="number" value={perUserLimit} onChange={e => setPerUserLimit(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">Expires</Label>
                <Input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Button size="sm" className="w-full text-xs" onClick={createCoupon} disabled={creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
              Create Coupon
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Coupon list */}
      {coupons.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No coupons yet</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {coupons.map((c: any) => {
            const cfg = typeConfig[c.type as keyof typeof typeConfig] || typeConfig.percentage;
            const TypeIcon = cfg.icon;
            const isExpired = c.valid_to && new Date(c.valid_to) < new Date();
            const isMaxed = c.usage_count >= c.usage_limit;

            return (
              <Card key={c.id} className={cn(!c.active && "opacity-60")}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={cn("h-4 w-4", cfg.color)} />
                      <span className="text-sm font-mono font-bold">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="p-0.5 hover:bg-muted rounded">
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {isExpired && <Badge variant="outline" className="text-[9px]">Expired</Badge>}
                      {isMaxed && <Badge variant="outline" className="text-[9px]">Maxed</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {fmtValue(c.type, c.value, c.currency)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>Used: {c.usage_count}/{c.usage_limit}</span>
                    {c.min_order > 0 && <span>Min: {fmtValue("fixed", c.min_order, c.currency)}</span>}
                    {c.valid_to && <span>Until: {new Date(c.valid_to).toLocaleDateString()}</span>}
                  </div>

                  <div className="flex items-center gap-1 mt-2">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1"
                      onClick={() => toggleCoupon(c.id, c.active)}>
                      {c.active ? <ToggleRight className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <ToggleLeft className="h-3.5 w-3.5 mr-1" />}
                      {c.active ? "Active" : "Disabled"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive"
                      onClick={() => deleteCoupon(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
