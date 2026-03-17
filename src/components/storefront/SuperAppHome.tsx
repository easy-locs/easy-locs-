/**
 * SuperAppHome — PASS137-140: Role-based home hub.
 * Buyer: rails (trending, reorder, track) with strong CTAs
 * Merchant: orders, revenue, quick actions
 * Driver: active missions, earnings
 * New: discover + create shop
 * Max 3 visible sections per screen. Mobile-first.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Store, ShoppingBag, Truck, Package, RotateCcw, Search,
  Plus, BarChart3, ArrowRight, Clock, CheckCircle, TrendingUp,
  MapPin, Star, DollarSign, Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

type UserType = "buyer" | "merchant" | "driver" | "new";

/* ═══════════════════════════════════════════
   Quick Action Button (reusable)
   ═══════════════════════════════════════════ */
function QuickAction({ to, icon: Icon, label, sub, accent }: {
  to: string; icon: React.ElementType; label: string; sub: string; accent?: boolean;
}) {
  return (
    <Link to={to} className="block">
      <Button
        variant={accent ? "default" : "outline"}
        className={`w-full h-14 text-xs gap-2 justify-start ${accent ? "shadow-sm" : ""}`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary-foreground/20" : "bg-primary/10"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-primary-foreground" : "text-primary"}`} />
        </div>
        <div className="text-left">
          <p className="font-semibold">{label}</p>
          <p className={`text-[10px] ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</p>
        </div>
        <ArrowRight className={`h-3.5 w-3.5 ml-auto ${accent ? "text-primary-foreground/50" : "text-muted-foreground/50"}`} />
      </Button>
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Stat Pill (compact KPI for merchant/driver)
   ═══════════════════════════════════════════ */
function StatPill({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/50 px-3 py-3 flex-1">
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-sm font-bold text-foreground">{value}</span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */
export default function SuperAppHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          .select("id, status, delivery_fee, currency")
          .eq("driver_id", user!.id)
          .in("status", ["assigned", "accepted", "in_progress"])
          .limit(5),
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
        const [orderCountRes, pendingRes, revenueRes] = await Promise.all([
          (supabase as any).from("storefront_orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
          (supabase as any).from("storefront_orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "pending"),
          (supabase as any).from("storefront_orders").select("total").eq("shop_id", shop.id).in("status", ["completed", "accepted"]),
        ]);
        const revenue = (revenueRes.data || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
        shopStats = {
          totalOrders: orderCountRes.count || 0,
          pendingOrders: pendingRes.count || 0,
          revenue,
        };
      }

      // Driver stats
      let driverStats = null;
      if (userType === "driver") {
        const { data: completedJobs } = await (supabase as any).from("delivery_jobs")
          .select("delivery_fee").eq("driver_id", user!.id).eq("status", "completed");
        const earnings = (completedJobs || []).reduce((s: number, j: any) => s + (j.delivery_fee || 0), 0);
        driverStats = { active: activeDeliveries.length, earnings, completed: completedJobs?.length || 0 };
      }

      return { userType, shop, orders, activeDeliveries, shopStats, driverStats };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading) return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );

  const d = data || { userType: "new" as UserType, shop: null, orders: [], activeDeliveries: [], shopStats: null, driverStats: null };

  const statusIcon = (s: string) => {
    if (s === "pending") return <Clock className="h-3.5 w-3.5 text-warning" />;
    if (["accepted", "preparing"].includes(s)) return <Package className="h-3.5 w-3.5 text-primary" />;
    if (s === "shipped") return <Truck className="h-3.5 w-3.5 text-info" />;
    if (s === "completed") return <CheckCircle className="h-3.5 w-3.5 text-success" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* ═══ Section 1: Greeting ═══ */}
      <div>
        <h2 className="text-lg font-bold text-foreground">
          {d.userType === "merchant" ? "🏪 Your Business" : d.userType === "driver" ? "🚗 Driver Hub" : d.userType === "buyer" ? "👋 Welcome back" : "👋 Get started"}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {d.userType === "merchant" ? `${d.shopStats?.pendingOrders || 0} pending orders` : d.userType === "driver" ? `${d.driverStats?.active || 0} active deliveries` : d.userType === "buyer" ? "Track, reorder, discover" : "Find shops or start selling"}
        </p>
      </div>

      {/* ═══ Section 2: Stats (merchant/driver only) ═══ */}
      {d.userType === "merchant" && d.shopStats && (
        <div className="grid grid-cols-3 gap-2">
          <StatPill icon={ShoppingBag} label="Orders" value={d.shopStats.totalOrders} color="hsl(var(--primary))" />
          <StatPill icon={DollarSign} label="Revenue" value={fmtPrice(d.shopStats.revenue)} color="hsl(var(--success))" />
          <StatPill icon={Clock} label="Pending" value={d.shopStats.pendingOrders} color="hsl(var(--warning))" />
        </div>
      )}

      {d.userType === "driver" && d.driverStats && (
        <div className="grid grid-cols-3 gap-2">
          <StatPill icon={Truck} label="Active" value={d.driverStats.active} color="hsl(var(--primary))" />
          <StatPill icon={DollarSign} label="Earned" value={fmtPrice(d.driverStats.earnings)} color="hsl(var(--success))" />
          <StatPill icon={CheckCircle} label="Done" value={d.driverStats.completed} color="hsl(var(--accent))" />
        </div>
      )}

      {/* ═══ Section 3: Quick Actions (max 2-3, contextual) ═══ */}
      <div className="space-y-2">
        {d.userType === "buyer" && (
          <>
            <QuickAction to="/my-orders" icon={ShoppingBag} label="Track Orders" sub={`${d.orders.filter((o: any) => o.status !== "completed").length} active`} accent />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/discover?rail=trending" icon={TrendingUp} label="Trending" sub="Popular now" />
              <QuickAction to="/discover?rail=nearby" icon={MapPin} label="Nearby" sub="Around you" />
            </div>
          </>
        )}

        {d.userType === "merchant" && d.shop && (
          <>
            <QuickAction to="/dashboard/my-shop" icon={ShoppingBag} label="Manage Orders" sub={`${d.shopStats?.pendingOrders || 0} pending`} accent />
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to="/dashboard/my-shop" icon={Plus} label="Add Product" sub="Grow catalog" />
              <QuickAction to={`/s/${d.shop.slug}`} icon={Eye} label="View Shop" sub="Customer view" />
            </div>
          </>
        )}

        {d.userType === "driver" && (
          <>
            <QuickAction to="/dashboard/driver" icon={Truck} label="View Missions" sub={`${d.driverStats?.active || 0} waiting`} accent />
            <QuickAction to="/dashboard/tracking" icon={BarChart3} label="Earnings & Stats" sub="Performance overview" />
          </>
        )}

        {d.userType === "new" && (
          <div className="grid grid-cols-2 gap-2">
            <QuickAction to="/discover" icon={Search} label="Discover" sub="Browse shops" accent />
            <QuickAction to="/dashboard/my-shop" icon={Plus} label="Start Selling" sub="Create a shop" />
          </div>
        )}
      </div>

      {/* ═══ Merchant: Shop card with ownership feel ═══ */}
      {d.userType === "merchant" && d.shop && (
        <Card className="border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {d.shop.logo_url ? (
                <img src={d.shop.logo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{d.shop.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-4">Live</Badge>
                  <span className="text-[10px] text-muted-foreground">{d.shopStats?.totalOrders} orders</span>
                </div>
              </div>
              <Link to="/dashboard/my-shop">
                <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-primary">
                  Manage <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Buyer: Recent orders with reorder CTA ═══ */}
      {d.userType === "buyer" && d.orders.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-semibold">Recent Orders</h4>
              <Link to="/my-orders" className="text-[10px] text-primary font-medium hover:underline">View all →</Link>
            </div>
            {d.orders.slice(0, 3).map((o: any) => (
              <div key={o.id} className="flex items-center gap-2.5 py-2 border-b border-border last:border-0">
                {statusIcon(o.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">#{o.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-semibold">{fmtPrice(o.total, o.currency)}</span>
                {o.status === "completed" ? (
                  <Button
                    size="sm"
                    className="h-7 px-3 text-[10px] gap-1"
                    onClick={() => navigate(`/s/${o.shop_id}?reorder=${o.id}`)}
                  >
                    <RotateCcw className="h-3 w-3" /> Reorder
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[9px] capitalize h-5">{o.status}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
