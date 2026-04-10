import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { ArrowLeft, Package, Clock, ChevronRight } from "lucide-react";

export default function DriverActiveMissionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["driver-active-missions-page", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("mobility_jobs")
        .select("*")
        .eq("rider_user_id", user!.id)
        .in("status", ["accepted", "rider_arriving_pickup", "picked_up", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 5000,
    refetchInterval: 8000,
  });

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => navigate("/driver/dashboard")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Active Missions</h1>
          <p className="text-[11px] text-muted-foreground">
            {rows.length > 0 ? `${rows.length} in progress` : "Current deliveries"}
          </p>
        </div>
        {rows.length > 0 && (
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{rows.length}</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3 pt-2">
        {isLoading && [1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse" />
        ))}

        {!isLoading && rows.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No active missions</p>
            <p className="text-xs text-muted-foreground mt-1">Accept missions from the live dispatch screen</p>
            <button
              onClick={() => navigate("/driver/live-missions")}
              className="mt-4 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold active:scale-95 transition-transform"
            >
              Go to Live Missions
            </button>
          </div>
        )}

        {!isLoading && rows.map((row: any) => (
          <button
            key={row.id}
            onClick={() => navigate(`/driver/missions-board/${row.id}`)}
            className="w-full rounded-2xl border border-border/15 bg-card p-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">#{String(row.id).slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <OrderStatusBadge status={row.status || "assigned"} />
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-4 flex flex-col items-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="w-px h-3 bg-border" />
                </div>
                <p className="text-xs text-foreground leading-snug min-w-0 truncate">{row.pickup_address || row.pickup_label || "Pickup"}</p>
              </div>
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-4 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <p className="text-xs text-foreground leading-snug min-w-0 truncate">{row.dropoff_address || row.dropoff_label || "Dropoff"}</p>
              </div>
            </div>

            {row.created_at && (
              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/10">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {row.current_price != null && (
                  <span className="ml-auto text-xs font-bold text-foreground">{row.current_price} {row.currency || "AED"}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
