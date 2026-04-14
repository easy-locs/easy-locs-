import { useEffect, useState, useCallback } from "react";
import { BackCard } from "@/components/ui/back-card";
import { adminOpsService } from "@/services/admin-ops.service";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function AdminRealtimeControlPage() {
  useUiEngine("adminrealtimecontrolpage");
  const [stats, setStats] = useState({
    ordersOpen: 0,
    dispatchOpen: 0,
    driversOnline: 0,
    supportOpen: 0,
  });

  const load = useCallback(async () => {
    const [ordersOpen, dispatchOpen, driversOnline, supportOpen] = await Promise.all([
      adminOpsService.countByStatus("orders", "status", ["paid", "preparing", "ready_for_dispatch", "assigned", "in_progress"]),
      adminOpsService.countByStatus("mobility_jobs", "status", ["searching", "offered", "accepted", "in_progress"]),
      adminOpsService.countWhere("driver_profiles", "is_online", true),
      adminOpsService.countByStatus("support_tickets", "status", ["open", "in_progress", "waiting_user"]),
    ]);

    setStats({ ordersOpen, dispatchOpen, driversOnline, supportOpen });
  }, []);

  useEffect(() => {
    load();

    const channel = createRealtimeChannel("admin-realtime-control");
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "mobility_jobs" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_profiles" }, load)
      .subscribe();

    return () => { removeRealtimeChannel(channel); };
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
