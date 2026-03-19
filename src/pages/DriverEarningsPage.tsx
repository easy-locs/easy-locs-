import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/currency";
import { Wallet, Truck, Clock, TrendingUp } from "lucide-react";

export default function DriverEarningsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ available: 0, pending: 0, today: 0, completed: 0, cancelled: 0, currency: "" });
  const [recentPayouts, setRecentPayouts] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    // Get driver wallet
    const { data: wallet } = await (supabase as any)
      .from("wallet_accounts")
      .select("*")
      .eq("owner_type", "driver")
      .eq("owner_user_id", user.id)
      .limit(1)
      .maybeSingle();

    const currency = wallet?.currency ?? "";

    // Get completed splits (settled payouts)
    const { data: settledSplits } = await (supabase as any)
      .from("wallet_order_splits")
      .select("net_amount, split_status, created_at")
      .eq("split_party_type", "driver")
      .eq("wallet_account_id", wallet?.id ?? "none")
      .order("created_at", { ascending: false })
      .limit(20);

    const settled = (settledSplits ?? []).filter((s: any) => s.split_status === "settled");
    const pending = (settledSplits ?? []).filter((s: any) => s.split_status === "pending");

    const today = new Date().toISOString().split("T")[0];
    const todayEarnings = settled.filter((s: any) => s.created_at?.startsWith(today)).reduce((sum: number, s: any) => sum + Number(s.net_amount ?? 0), 0);

    setStats({
      available: Number(wallet?.balance_cash ?? 0),
      pending: pending.reduce((sum: number, s: any) => sum + Number(s.net_amount ?? 0), 0),
      today: todayEarnings,
      completed: settled.length,
      cancelled: 0,
      currency,
    });

    setRecentPayouts(settled.slice(0, 10));

    // Active dispatch jobs
    const { data: jobs } = await (supabase as any)
      .from("dispatch_jobs")
      .select("*")
      .eq("assigned_driver_id", user.id)
      .in("status", ["assigned", "accepted", "picked_up", "in_progress"])
      .order("created_at", { ascending: false });

    setActiveJobs(jobs ?? []);
  };

  const c = stats.currency;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Wallet className="w-6 h-6" /> Driver Earnings
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <p className="text-xl font-bold text-foreground">{formatMoney(stats.available, c)}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
            <p className="text-xl font-bold text-foreground">{formatMoney(stats.pending, c)}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-foreground">{formatMoney(stats.today, c)}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5" /> Active Jobs</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activeJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-2 border rounded text-sm">
                <div>
                  <Badge variant="secondary">{job.status}</Badge>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{job.id?.slice(0, 8)}</span>
                </div>
                <span>{formatMoney(job.quoted_fee ?? 0, job.currency)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent payouts */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Payouts</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recentPayouts.map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
              <span className="font-medium text-green-600">+{formatMoney(Number(p.net_amount), c)}</span>
            </div>
          ))}
          {!recentPayouts.length && <p className="text-muted-foreground text-sm">No payouts yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}
