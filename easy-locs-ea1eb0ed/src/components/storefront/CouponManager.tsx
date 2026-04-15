/**
 * CouponManager — Seller-facing coupon CRUD for storefront shops.
 * Create, toggle, copy codes, view usage stats.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/services/db";
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
import { useI18n } from "@/lib/i18n";

interface CouponManagerProps {
  shopId: string;
}

const typeConfig = {
  percentage: { icon: Percent, color: "text-primary" },
  fixed: { icon: DollarSign, color: "text-emerald-600" },
  free_delivery: { icon: Truck, color: "text-blue-600" },
};

const fmtValue = (type: string, value: number, currency = "EUR") => {
  if (type === "percentage") return `${value}%`;
  if (type === "free_delivery") return "—";
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, minimumFractionDigits: 0 }).format(value); }
  catch { return `${value} ${currency}`; }
};

export default function CouponManager({ shopId }: CouponManagerProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

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
      const { data } = await db
        .from("storefront_coupons")
        .select("*")
        .eq("shop_id", shopId)
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const createCoupon = async () => {
    if (!code.trim()) return toast.error(t("coupon.code_required"));
    setCreating(true);
    try {
      const { error } = await db("storefront_coupons").insert({
        shop_id: shopId,
        user_id: user?.id,
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
      toast.success(t("coupon.created"));
      setShowCreate(false);
      setCode(""); setValue("10"); setMinOrder("0"); setMaxDiscount(""); setValidTo("");
      qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
    } catch (e: any) {
      toast.error(e.message?.includes("unique") ? t("coupon.code_exists") : t("coupon.create_failed"));
    } finally {
      setCreating(false);
    }
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await db("storefront_coupons").update({ active: !active, updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
  };

  const deleteCoupon = async (id: string) => {
    await db("storefront_coupons").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shop-coupons", shopId] });
    toast.success(t("coupon.deleted"));
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success(`${t("common.copy")}: ${c}`);
  };

  if (isLoading) return <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" /> {t("coupon.title")} ({coupons.length})
        </h3>
        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3 mr-1" /> {t("coupon.new")}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <Label className="text-[10px]">{t("coupon.code")}</Label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="SUMMER25" className="h-8 text-xs uppercase" />
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.type")}</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t("coupon.type_percentage")}</SelectItem>
                    <SelectItem value="fixed">{t("coupon.type_fixed")}</SelectItem>
                    <SelectItem value="free_delivery">{t("coupon.type_free_delivery")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.value")}</Label>
                <Input type="number" value={value} onChange={e => setValue(e.target.value)} className="h-8 text-xs" disabled={type === "free_delivery"} />
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.min_order")}</Label>
                <Input type="number" value={minOrder} onChange={e => setMinOrder(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.max_discount")}</Label>
                <Input type="number" value={maxDiscount} onChange={e => setMaxDiscount(e.target.value)} placeholder="∞" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.usage_limit")}</Label>
                <Input type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">{t("coupon.per_user")}</Label>
                <Input type="number" value={perUserLimit} onChange={e => setPerUserLimit(e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px]">{t("coupon.expires")}</Label>
                <Input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
            <Button size="sm" className="w-full text-xs" onClick={createCoupon} disabled={creating}>
              {creating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Tag className="h-3 w-3 mr-1" />}
              {t("coupon.create")}
            </Button>
          </CardContent>
        </Card>
      )}

      {coupons.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">{t("coupon.empty")}</CardContent></Card>
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
                      {isExpired && <Badge variant="outline" className="text-[10px]">{t("coupon.expired")}</Badge>}
                      {isMaxed && <Badge variant="outline" className="text-[10px]">{t("coupon.maxed")}</Badge>}
                      <Badge variant="secondary" className="text-[10px]">
                        {fmtValue(c.type, c.value, c.currency)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{t("coupon.used")}: {c.usage_count}/{c.usage_limit}</span>
                    {c.min_order > 0 && <span>{t("coupon.min")}: {fmtValue("fixed", c.min_order, c.currency)}</span>}
                    {c.valid_to && <span>{t("coupon.until")}: {new Date(c.valid_to).toLocaleDateString()}</span>}
                  </div>

                  <div className="flex items-center gap-1 mt-2">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] flex-1"
                      onClick={() => toggleCoupon(c.id, c.active)}>
                      {c.active ? <ToggleRight className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <ToggleLeft className="h-3.5 w-3.5 mr-1" />}
                      {c.active ? t("common.active") : t("common.disabled")}
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
