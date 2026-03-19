import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, MapPin, Truck, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminGrowthDashboard = () => {
  const [stats, setStats] = useState({
    imported: 0, claimed: 0, activated: 0, dormant: 0,
    totalOrders: 0, activeDrivers: 0, cities: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [imported, claimed, activated, dormant, orders, drivers, citiesRes] = await Promise.all([
      (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("status", "imported_not_claimed"),
      (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("status", "claimed"),
      (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).in("status", ["live", "active"]),
      (supabase as any).from("merchant_onboarding_profiles").select("id", { count: "exact", head: true }).eq("status", "dormant"),
      (supabase as any).from("orders").select("id", { count: "exact", head: true }),
      (supabase as any).from("driver_profiles").select("id", { count: "exact", head: true }).eq("is_online", true),
      (supabase as any).from("merchant_onboarding_profiles").select("city").not("city", "is", null),
    ]);

    const uniqueCities = new Set((citiesRes.data ?? []).map((c: any) => c.city));

    setStats({
      imported: imported.count ?? 0,
      claimed: claimed.count ?? 0,
      activated: activated.count ?? 0,
      dormant: dormant.count ?? 0,
      totalOrders: orders.count ?? 0,
      activeDrivers: drivers.count ?? 0,
      cities: uniqueCities.size,
    });
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const funnelRate = (from: number, to: number) =>
    from > 0 ? `${((to / from) * 100).toFixed(1)}%` : "—";

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Growth Dashboard</h1>
          <p className="text-sm text-muted-foreground">Marketplace expansion metrics</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Imported", value: stats.imported, icon: Store, color: "text-blue-500" },
          { label: "Claimed", value: stats.claimed, icon: Users, color: "text-yellow-500" },
          { label: "Activated", value: stats.activated, icon: TrendingUp, color: "text-green-500" },
          { label: "Dormant", value: stats.dormant, icon: Store, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Cities</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.cities}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Active Drivers</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.activeDrivers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Total Orders</p>
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activation Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.imported}</p>
              <p className="text-xs text-muted-foreground">Imported</p>
            </div>
            <span className="text-muted-foreground">→ {funnelRate(stats.imported, stats.claimed)}</span>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.claimed}</p>
              <p className="text-xs text-muted-foreground">Claimed</p>
            </div>
            <span className="text-muted-foreground">→ {funnelRate(stats.claimed, stats.activated)}</span>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{stats.activated}</p>
              <p className="text-xs text-muted-foreground">Activated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGrowthDashboard;
