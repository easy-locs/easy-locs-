/**
 * SuperAppHome — PASS130: Simple home depending on user type.
 * Buyer: recent orders + reorder + discover
 * Merchant: shop stats + quick actions
 * Driver: active deliveries
 * PASS131: Contextual quick actions integrated.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, ShoppingBag, Truck, Package, RotateCcw, Search,
  Plus, BarChart3, ArrowRight, Clock, CheckCircle, Loader2, Heart,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

type UserType = "buyer" | "merchant" | "driver" | "new";

export default function SuperAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Detect user type from existing data
  const { data, isLoading } = useQuery({
    queryKey: ["superapp-home", user?.id],
    queryFn: async () => {
      const [shopRes, ordersRes, driverRes] = await Promise.all([
        (supabase as any).from("storefront_pages").select("id, name, slug, logo_url").eq("user_id", user!.id).maybeSingle(),
        (supabase as any).from("storefront_orders")
          .select("id, status, total, currency, created_at, shop_id")
          .eq("buyer_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase as any).from("delivery_jobs")
          .select("id, status")
          .eq("driver_id", user!.id)
          .in("status", ["assigned", "picked_up", "in_transit"])
          .limit(3),
      ]);

      const shop = shopRes.data;
      const orders = ordersRes.data || [];
      const activeDeliveries = driverRes.data || [];

      let userType: UserType = "new";
      if (activeDeliveries.length > 0) userType = "driver";
      else if (shop) userType = "merchant";
      else if (orders.length > 0) userType = "buyer";

      // Merchant stats
      let shopStats = null;
      if (shop) {
        const [orderCountRes, pendingRes] = await Promise.all([
          (supabase as any).from("storefront_orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
          (supabase as any).from("storefront_orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "pending"),
        ]);
        shopStats = {
          totalOrders: orderCountRes.count || 0,
          pendingOrders: pendingRes.count || 0,
        };
      }

      return { userType, shop, orders, activeDeliveries, shopStats };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="py-8 text-center">
      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
    </div>
  );

  const d = data || { userType: "new" as UserType, shop: null, orders: [], activeDeliveries: [], shopStats: null };
  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-3 w-3 text-warning" />;
    if (["accepted", "preparing"].includes(s)) return <Package className="h-3 w-3 text-primary" />;
    if (s === "shipped") return <Truck className="h-3 w-3 text-info" />;
    if (s === "completed") return <CheckCircle className="h-3 w-3 text-success" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {d.userType === "merchant" ? "🏪 Your Shop" : d.userType === "driver" ? "🚗 Active Deliveries" : "👋 Welcome back"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {d.userType === "merchant" ? "Manage orders & grow your business" : d.userType === "driver" ? "Your active assignments" : "Find shops, track orders"}
        </p>
      </div>

      {/* ── PASS131: Contextual Quick Actions ── */}
      <div className="grid grid-cols-2 gap-2">
        {d.userType === "merchant" && d.shop && (
          <>
            <Link to="/dashboard/my-shop">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Orders</p>
                  <p className="text-[9px] text-muted-foreground">{d.shopStats?.pendingOrders || 0} pending</p>
                </div>
              </Button>
            </Link>
            <Link to={`/s/${d.shop.slug}`}>
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <Store className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">View Shop</p>
                  <p className="text-[9px] text-muted-foreground">{d.shopStats?.totalOrders || 0} total orders</p>
                </div>
              </Button>
            </Link>
          </>
        )}

        {d.userType === "buyer" && (
          <>
            <Link to="/my-orders">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <ShoppingBag className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">My Orders</p>
                  <p className="text-[9px] text-muted-foreground">Track & manage</p>
                </div>
              </Button>
            </Link>
            <Link to="/discover">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <Search className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Discover</p>
                  <p className="text-[9px] text-muted-foreground">Find new shops</p>
                </div>
              </Button>
            </Link>
          </>
        )}

        {d.userType === "driver" && (
          <>
            <Link to="/dashboard/driver">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <Truck className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Deliveries</p>
                  <p className="text-[9px] text-muted-foreground">{d.activeDeliveries.length} active</p>
                </div>
              </Button>
            </Link>
            <Link to="/dashboard/tracking">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <BarChart3 className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Stats</p>
                  <p className="text-[9px] text-muted-foreground">Earnings & history</p>
                </div>
              </Button>
            </Link>
          </>
        )}

        {d.userType === "new" && (
          <>
            <Link to="/discover">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <Search className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Discover</p>
                  <p className="text-[9px] text-muted-foreground">Browse shops</p>
                </div>
              </Button>
            </Link>
            <Link to="/dashboard/my-shop">
              <Button variant="outline" className="w-full h-12 text-xs gap-1.5 justify-start">
                <Plus className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <p className="font-semibold">Sell</p>
                  <p className="text-[9px] text-muted-foreground">Create a shop</p>
                </div>
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* ── Merchant: Quick shop card ── */}
      {d.userType === "merchant" && d.shop && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {d.shop.logo_url ? (
                <img src={d.shop.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{d.shop.name}</p>
                <p className="text-[10px] text-muted-foreground">{d.shopStats?.totalOrders} orders total</p>
              </div>
              <Link to="/dashboard/my-shop">
                <Button size="sm" variant="ghost" className="h-8 text-xs gap-1">
                  Manage <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Buyer: Recent orders with reorder ── */}
      {(d.userType === "buyer" || d.userType === "merchant") && d.orders.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold">Recent Orders</h4>
              <Link to="/my-orders" className="text-[10px] text-primary hover:underline">View all →</Link>
            </div>
            {d.orders.slice(0, 3).map((o: any) => (
              <div key={o.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                {statusIcon(o.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">#{o.id.slice(0, 8)}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className="text-[8px] capitalize">{o.status}</Badge>
                <span className="text-[11px] font-semibold">{fmtPrice(o.total, o.currency)}</span>
                {o.status === "completed" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[9px] gap-0.5"
                    onClick={() => navigate(`/s/${o.shop_id}?reorder=${o.id}`)}
                  >
                    <RotateCcw className="h-2.5 w-2.5" /> Reorder
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
