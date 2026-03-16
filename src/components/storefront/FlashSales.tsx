/**
 * FlashSales — Flash sales countdown, daily deals, limited stock, urgency.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Clock, Flame, Bell, Loader2, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Props {
  shopId: string;
  mode: "seller" | "buyer";
  catalogItems?: any[];
  onAddToCart?: (itemId: string, price: number) => void;
  formatPrice?: (n: number, c: string) => string;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  return <span className="font-mono font-bold text-destructive">{remaining}</span>;
}

export default function FlashSales({ shopId, mode, catalogItems = [], onAddToCart, formatPrice }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [stockLimit, setStockLimit] = useState("10");
  const [duration, setDuration] = useState("24");
  const [saleType, setSaleType] = useState("flash");

  const fmt = formatPrice || ((n: number, c: string) => `${n} ${c}`);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["flash-sales", shopId],
    queryFn: async () => {
      let q = (supabase as any).from("storefront_flash_sales").select("*").eq("shop_id", shopId);
      if (mode === "buyer") q = q.in("status", ["scheduled", "active"]);
      const { data } = await q.order("starts_at", { ascending: false });
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: isSubscribed } = useQuery({
    queryKey: ["deal-sub", shopId, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_deal_subscribers").select("id").eq("shop_id", shopId).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
    enabled: !!shopId && !!user && mode === "buyer",
  });

  const createSale = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title required");
      const item = catalogItems.find((i: any) => i.id === selectedItem);
      const starts = new Date();
      const ends = new Date(starts.getTime() + parseInt(duration) * 3600000);
      const originalPrice = item?.price || 0;
      const salePrice = originalPrice * (1 - parseInt(discountPercent) / 100);
      await (supabase as any).from("storefront_flash_sales").insert({
        shop_id: shopId, title, item_id: selectedItem || null, sale_type: saleType,
        discount_percent: parseInt(discountPercent), original_price: originalPrice, sale_price: salePrice,
        currency: item?.currency || "EUR", stock_limit: parseInt(stockLimit) || null,
        starts_at: starts.toISOString(), ends_at: ends.toISOString(), status: "active",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flash-sales"] }); toast.success("Flash sale created!"); setCreating(false); setTitle(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const subscribe = useMutation({
    mutationFn: async () => {
      if (isSubscribed) {
        await (supabase as any).from("storefront_deal_subscribers").delete().eq("shop_id", shopId).eq("user_id", user!.id);
      } else {
        await (supabase as any).from("storefront_deal_subscribers").insert({ shop_id: shopId, user_id: user!.id });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["deal-sub"] }); toast.success(isSubscribed ? "Unsubscribed" : "Subscribed to deals!"); },
  });

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;

  const activeSales = sales.filter((s: any) => s.status === "active" && new Date(s.ends_at) > new Date());

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-destructive" /> Flash Sales & Deals
          </h3>
          <div className="flex gap-2">
            {mode === "buyer" && user && (
              <Button size="sm" variant={isSubscribed ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => subscribe.mutate()}>
                <Bell className="h-3 w-3 mr-1" /> {isSubscribed ? "Subscribed" : "Notify me"}
              </Button>
            )}
            {mode === "seller" && !creating && (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setCreating(true)}>
                <Plus className="h-3 w-3 mr-1" /> New Sale
              </Button>
            )}
          </div>
        </div>

        {creating && (
          <div className="space-y-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sale title" className="h-8 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={saleType} onValueChange={setSaleType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flash" className="text-xs">⚡ Flash Sale</SelectItem>
                  <SelectItem value="daily_deal" className="text-xs">🔥 Daily Deal</SelectItem>
                  <SelectItem value="weekend" className="text-xs">🎉 Weekend Sale</SelectItem>
                  <SelectItem value="seasonal" className="text-xs">🍂 Seasonal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Product..." /></SelectTrigger>
                <SelectContent>
                  {catalogItems.map((i: any) => <SelectItem key={i.id} value={i.id} className="text-xs">{i.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Discount %</Label>
                <Input type="number" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Stock Limit</Label>
                <Input type="number" value={stockLimit} onChange={e => setStockLimit(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-[10px]">Hours</Label>
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs flex-1 bg-destructive text-destructive-foreground" disabled={createSale.isPending} onClick={() => createSale.mutate()}>
                {createSale.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />} Launch Sale
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {activeSales.length === 0 && !creating ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active deals right now</p>
        ) : (
          <div className="space-y-2">
            {(mode === "buyer" ? activeSales : sales).map((sale: any) => {
              const isActive = sale.status === "active" && new Date(sale.ends_at) > new Date();
              const stockLeft = sale.stock_limit ? sale.stock_limit - (sale.sold_count || 0) : null;
              const stockPercent = sale.stock_limit ? Math.max(0, ((sale.sold_count || 0) / sale.stock_limit) * 100) : 0;
              return (
                <div key={sale.id} className={`p-3 rounded-xl border ${isActive ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {isActive ? <Flame className="h-4 w-4 text-destructive animate-pulse" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-xs font-bold flex-1">{sale.title}</span>
                    <Badge className={`text-[9px] ${isActive ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      {sale.sale_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    {sale.discount_percent > 0 && (
                      <Badge className="text-[10px] bg-destructive text-destructive-foreground font-black">-{sale.discount_percent}%</Badge>
                    )}
                    {sale.original_price && (
                      <span className="text-[10px] text-muted-foreground line-through">{fmt(sale.original_price, sale.currency || "EUR")}</span>
                    )}
                    {sale.sale_price && (
                      <span className="text-sm font-black text-destructive">{fmt(sale.sale_price, sale.currency || "EUR")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isActive && <Countdown endsAt={sale.ends_at} />}
                    {stockLeft !== null && (
                      <div className="flex-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                          <span>{stockLeft} left</span>
                          <span>{sale.sold_count || 0} sold</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${stockPercent}%` }} />
                        </div>
                      </div>
                    )}
                    {mode === "buyer" && isActive && sale.item_id && onAddToCart && (
                      <Button size="sm" className="h-7 text-[10px] bg-destructive text-destructive-foreground" onClick={() => onAddToCart(sale.item_id, sale.sale_price)}>
                        <ShoppingCart className="h-3 w-3 mr-1" /> Buy Now
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
