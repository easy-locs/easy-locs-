import { useEffect, useState, useCallback } from "react";
import { BackCard } from "@/components/ui/back-card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function AdminRealtimeControlPage() {
  const [stats, setStats] = useState({
    ordersOpen: 0,
    dispatchOpen: 0,
    driversOnline: 0,
    supportOpen: 0,
  });

  const load = useCallback(async () => {
    const [ordersRes, dispatchRes, driversRes, supportRes] = await Promise.all([
      (supabase as any).from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress"]),
      (supabase as any).from("dispatch_jobs").select("*", { count: "exact", head: true }).in("status", ["open", "broadcast", "assigned", "picked_up"]),
      (supabase as any).from("driver_profiles").select("*", { count: "exact", head: true }).eq("is_online", true),
      (supabase as any).from("support_tickets").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress", "waiting_user"]),
    ]);

    setStats({
      ordersOpen: ordersRes.count ?? 0,
      dispatchOpen: dispatchRes.count ?? 0,
      driversOnline: driversRes.count ?? 0,
      supportOpen: supportRes.count ?? 0,
    });
  }, []);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("admin-realtime-control")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_profiles" }, load)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [load]);

  const cards = [
    { label: "Orders Open", value: stats.ordersOpen },
    { label: "Dispatch Open", value: stats.dispatchOpen },
    { label: "Drivers Online", value: stats.driversOnline },
    { label: "Support Open", value: stats.supportOpen },
  ];

  return (
    <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
      <BackCard />
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Realtime Control</h1>
        <p className="text-sm text-muted-foreground">Live operations pulse</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>
      <Button onClick={load} variant="outline" className="w-full rounded-xl">
        <RefreshCw className="h-4 w-4 mr-2" /> Refresh now
      </Button>
    </div>
  );
}
