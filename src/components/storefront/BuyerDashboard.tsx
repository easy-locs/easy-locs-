/**
 * BuyerDashboard — PASS125: Unified buyer hub with orders, invoices, loyalty points.
 * Mobile-first, zero-friction, event-driven via realtime.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Clock, CheckCircle, Truck, Star, Package, Loader2, Trophy, FileText, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";

const fmtPrice = (n: number, c = "EUR") => {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n); }
  catch { return `${n} ${c}`; }
};

export default function BuyerDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["buyer-stats", user?.id],
    queryFn: async () => {
      const [ordersRes, wishlistRes, loyaltyRes, invoicesRes] = await Promise.all([
        (supabase as any).from("storefront_orders")
          .select("id, status, total, currency, created_at, shop_id")
          .eq("buyer_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any).from("storefront_wishlist")
          .select("id")
          .eq("user_id", user!.id),
        (supabase as any).from("storefront_loyalty_points")
          .select("points_balance")
          .eq("user_id", user!.id),
        (supabase as any).from("storefront_invoices")
          .select("id, invoice_number, total, currency, status, issued_at, buyer_name")
          .eq("buyer_email", user!.email)
          .order("issued_at", { ascending: false })
          .limit(5),
      ]);

      const orders = ordersRes.data || [];
      const active = orders.filter((o: any) => ["pending", "accepted", "preparing", "shipped"].includes(o.status));
      const completed = orders.filter((o: any) => o.status === "completed");
      const totalSpent = completed.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const loyaltyTotal = (loyaltyRes.data || []).reduce((s: number, l: any) => s + (l.points_balance || 0), 0);

      return {
        totalOrders: orders.length,
        activeOrders: active.length,
        completedOrders: completed.length,
        totalSpent,
        currency: orders[0]?.currency || "EUR",
        wishlistCount: (wishlistRes.data || []).length,
        recentOrders: orders.slice(0, 3),
        loyaltyPoints: loyaltyTotal,
        invoices: invoicesRes.data || [],
      };
    },
    enabled: !!user,
  });

  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>;

  const s = stats || { totalOrders: 0, activeOrders: 0, completedOrders: 0, totalSpent: 0, currency: "EUR", wishlistCount: 0, recentOrders: [], loyaltyPoints: 0, invoices: [] };

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-3 w-3 text-warning" />;
      case "accepted": case "preparing": return <Package className="h-3 w-3 text-primary" />;
      case "shipped": return <Truck className="h-3 w-3 text-info" />;
      case "completed": return <CheckCircle className="h-3 w-3 text-success" />;
      case "refunded": return <RotateCcw className="h-3 w-3 text-muted-foreground" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <ShoppingBag className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{s.totalOrders}</p>
            <p className="text-[9px] text-muted-foreground">Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Truck className="h-4 w-4 mx-auto text-info mb-1" />
            <p className="text-lg font-bold">{s.activeOrders}</p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Trophy className="h-4 w-4 mx-auto text-warning mb-1" />
            <p className="text-lg font-bold">{s.loyaltyPoints}</p>
            <p className="text-[9px] text-muted-foreground">Points</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">Total Spent</p>
            <p className="text-lg font-bold text-primary">{fmtPrice(s.totalSpent, s.currency)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Wishlist</p>
              <p className="text-sm font-semibold">{s.wishlistCount}</p>
            </div>
            <Heart className="h-4 w-4 text-destructive" />
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      {s.recentOrders.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold">Recent Orders</h4>
              <Link to="/my-orders" className="text-[10px] text-primary hover:underline">View all →</Link>
            </div>
            {s.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                {statusIcon(o.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className="text-[9px] capitalize">{o.status}</Badge>
                <span className="text-xs font-semibold">{fmtPrice(o.total, o.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {s.invoices.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-primary" /> My Invoices
            </h4>
            {s.invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center gap-2 py-1 border-b border-border last:border-0">
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono font-medium">{inv.invoice_number}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(inv.issued_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="text-[8px] h-4">{inv.status}</Badge>
                <span className="text-xs font-semibold">{fmtPrice(inv.total || 0, inv.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/discover">
          <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
            <Package className="h-3.5 w-3.5" /> Discover
          </Button>
        </Link>
        <Link to="/my-orders">
          <Button variant="outline" className="w-full h-10 text-xs gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> My Orders
          </Button>
        </Link>
      </div>
    </div>
  );
}
