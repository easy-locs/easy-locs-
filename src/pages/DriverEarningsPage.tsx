/**
 * DriverEarningsPage — Canonical: reads from mobility_jobs + wallet.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currency";
import { Wallet, Truck, Clock, TrendingUp, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function DriverEarningsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ available: 0, pending: 0, today: 0, completed: 0, cancelled: 0, active: 0, currency: "" });
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) loadData();
    const ch = supabase.channel("driver-earnings-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_order_splits" }, () => { if (user?.id) loadData(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, () => { if (user?.id) loadData(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: wallet } = await (supabase as any).from("wallet_accounts").select("*").eq("owner_type", "driver").eq("owner_user_id", user.id).limit(1).maybeSingle();
    const currency = wallet?.currency ?? "";

    const { data: allSplits } = await (supabase as any).from("wallet_order_splits").select("net_amount, split_status, created_at").eq("split_party_type", "driver").eq("wallet_account_id", wallet?.id ?? "none").order("created_at", { ascending: false }).limit(50);
    const settled = (allSplits ?? []).filter((s: any) => s.split_status === "settled");
    const pending = (allSplits ?? []).filter((s: any) => s.split_status === "pending");

    const today = new Date().toISOString().split("T")[0];
    const todayEarnings = settled.filter((s: any) => s.created_at?.startsWith(today)).reduce((sum: number, s: any) => sum + Number(s.net_amount ?? 0), 0);

    const { data: jobs } = await (supabase as any).from("mobility_jobs").select("*").eq("rider_user_id", user.id).in("status", ["accepted", "rider_arriving_pickup", "rider_arrived_pickup", "picked_up", "in_progress", "rider_arriving_dropoff"]).order("created_at", { ascending: false });
    const { count: completedCount } = await (supabase as any).from("mobility_jobs").select("id", { count: "exact", head: true }).eq("rider_user_id", user.id).eq("status", "completed");
    const { count: cancelledCount } = await (supabase as any).from("mobility_jobs").select("id", { count: "exact", head: true }).eq("rider_user_id", user.id).eq("status", "cancelled");

    setStats({
      available: Number(wallet?.balance_cash ?? 0),
      pending: pending.reduce((sum: number, s: any) => sum + Number(s.net_amount ?? 0), 0),
      today: todayEarnings,
      completed: completedCount ?? 0,
      cancelled: cancelledCount ?? 0,
      active: (jobs ?? []).length,
      currency,
    });
    setRecentPayouts(settled.slice(0, 10));
    setActiveJobs(jobs ?? []);
    setLoading(false);
  };

  const c = stats.currency;

  return (
    <div className="app-mobile-page bg-background p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Wallet className="w-6 h-6" /> Driver Earnings</h1>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}><RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 text-center"><TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" /><p className="text-xl font-bold text-foreground">{formatMoney(stats.available, c)}</p><p className="text-xs text-muted-foreground">Available</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" /><p className="text-xl font-bold text-foreground">{formatMoney(stats.pending, c)}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-foreground">{formatMoney(stats.today, c)}</p><p className="text-xs text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex justify-center gap-3"><div className="text-center"><p className="text-lg font-bold text-foreground flex items-center gap-1"><CheckCircle className="w-4 h-4 text-primary" /> {stats.completed}</p><p className="text-xs text-muted-foreground">Done</p></div><div className="text-center"><p className="text-lg font-bold text-foreground flex items-center gap-1"><XCircle className="w-4 h-4 text-destructive" /> {stats.cancelled}</p><p className="text-xs text-muted-foreground">Cancelled</p></div></div></CardContent></Card>
      </div>
      {activeJobs.length > 0 && (
        <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5" /> Active ({activeJobs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">{activeJobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-3 border border-border rounded-lg text-sm">
              <div className="space-y-1"><div className="flex items-center gap-2"><Badge variant="secondary">{job.status}</Badge><span className="text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8)}</span></div></div>
              <span className="font-medium">{formatMoney(Number(job.current_price ?? job.quoted_price ?? 0), job.currency)}</span>
            </div>
          ))}</CardContent>
        </Card>
      )}
      <Card><CardHeader><CardTitle className="text-lg">Recent Payouts</CardTitle></CardHeader>
        <CardContent className="space-y-2">{recentPayouts.map((p, i) => (
          <div key={i} className="flex items-center justify-between p-2 border border-border rounded text-sm">
            <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            <span className="font-medium text-primary">+{formatMoney(Number(p.net_amount), c)}</span>
          </div>
        ))}{!recentPayouts.length && <p className="text-muted-foreground text-sm text-center py-4">No payouts yet</p>}</CardContent>
      </Card>
    </div>
  );
}
