/**
 * OpsCenter — Module 20: Internal operations dashboard.
 * System health, launch readiness, hardening, alerts.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity, ShieldCheck, Rocket, AlertTriangle, Store, Package, ShoppingBag,
  Users, Loader2, CheckCircle2, XCircle, TrendingUp
} from "lucide-react";

const fmtNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

export default function OpsCenter() {
  const { user } = useAuth();

  // Shops
  const { data: shops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ["ops-shops"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("storefront_pages").select("id, name, shop_visibility, created_at").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ["ops-orders"],
    queryFn: async () => {
      const shopIds = shops.map((s: any) => s.id);
      if (shopIds.length === 0) return [];
      const { data } = await (supabase as any).from("storefront_orders").select("id, status, total, created_at").in("shop_id", shopIds);
      return data || [];
    },
    enabled: shops.length > 0,
  });

  // Launch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["ops-audits"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("orbit_launch_audits").select("*").eq("user_id", user!.id).order("checked_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const totalRevenue = orders.filter((o: any) => o.status === "completed").reduce((s: number, o: any) => s + (o.total || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.status === "pending").length;
  const publicShops = shops.filter((s: any) => s.shop_visibility === "public").length;
  const avgScore = audits.length > 0 ? Math.round(audits.reduce((s: number, a: any) => s + (a.overall_score || 0), 0) / audits.length) : 0;

  const alerts: { label: string; type: "warning" | "error" | "info" }[] = [];
  if (pendingOrders > 5) alerts.push({ label: `${pendingOrders} pending orders need attention`, type: "warning" });
  if (shops.length > 0 && publicShops === 0) alerts.push({ label: "No shops are public yet", type: "info" });
  if (avgScore > 0 && avgScore < 60) alerts.push({ label: `Low launch readiness: ${avgScore}%`, type: "error" });

  const systemHealth = [
    { label: "Active Shops", value: publicShops, total: shops.length, icon: Store },
    { label: "Orders", value: orders.length, total: orders.length, icon: ShoppingBag },
    { label: "Launch Score", value: avgScore, total: 100, icon: Rocket },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto pb-8 px-4 pt-4 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Ops Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">ORBIT system health & operational status</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <Store className="h-4 w-4 text-primary mb-1" />
              <p className="text-xl font-bold">{shops.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Shops</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <ShoppingBag className="h-4 w-4 text-success mb-1" />
              <p className="text-xl font-bold">{orders.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-warning mb-1" />
              <p className="text-xl font-bold">{totalRevenue > 0 ? `€${fmtNum(totalRevenue)}` : "€0"}</p>
              <p className="text-[10px] text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Rocket className="h-4 w-4 text-info mb-1" />
              <p className="text-xl font-bold">{avgScore}%</p>
              <p className="text-[10px] text-muted-foreground">Avg Launch Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card>
            <CardContent className="p-3 space-y-2">
              <h3 className="text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Alerts
              </h3>
              {alerts.map((a, i) => (
                <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                  a.type === "error" ? "bg-destructive/10 text-destructive" :
                  a.type === "warning" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                }`}>
                  {a.type === "error" ? <XCircle className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                  {a.label}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* System Health */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <h3 className="text-xs font-semibold flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success" /> System Health
            </h3>
            {systemHealth.map(h => (
              <div key={h.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5"><h.icon className="h-3 w-3 text-muted-foreground" />{h.label}</span>
                  <span className="font-medium">{h.value}/{h.total}</span>
                </div>
                <Progress value={h.total > 0 ? (h.value / h.total) * 100 : 0} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending orders */}
        {pendingOrders > 0 && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">Pending Orders</h3>
                <Badge variant="destructive" className="text-[9px]">{pendingOrders} pending</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Go to your shop's Orders tab to review and accept pending orders.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
