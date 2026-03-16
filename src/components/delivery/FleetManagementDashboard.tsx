/**
 * FleetManagementDashboard — Real-time fleet overview: driver map, statuses, global KPIs.
 * PASS85-EE: Fleet Management Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Truck, MapPin, Activity, RefreshCw, Wifi, WifiOff, Clock, Star, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FleetDriver {
  id: string;
  user_id: string;
  status: string;
  vehicle_type: string;
  lat: number | null;
  lng: number | null;
  avg_rating: number | null;
  total_completed: number | null;
  acceptance_rate: number | null;
  online_since: string | null;
  last_heartbeat_at: string | null;
  current_job_id: string | null;
  full_name?: string;
}

interface FleetKPIs {
  totalDrivers: number;
  online: number;
  onDelivery: number;
  offline: number;
  avgRating: number;
  avgAcceptance: number;
  totalCompletedToday: number;
}

export default function FleetManagementDashboard({ orgId }: { orgId: string }) {
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [kpis, setKpis] = useState<FleetKPIs>({ totalDrivers: 0, online: 0, onDelivery: 0, offline: 0, avgRating: 0, avgAcceptance: 0, totalCompletedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const fetchFleet = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("driver_sessions")
      .select("*")
      .eq("org_id", orgId);

    if (error) { console.error("[Fleet] fetch error:", error); setLoading(false); return; }

    const driverList = (data || []) as FleetDriver[];

    // Fetch profile names
    const userIds = driverList.map(d => d.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, first_name, last_name")
        .in("id", userIds);

      if (profiles) {
        const nameMap = new Map(profiles.map(p => [p.id, p.name || [p.first_name, p.last_name].filter(Boolean).join(" ") || null]));
        driverList.forEach(d => { d.full_name = nameMap.get(d.user_id) || undefined; });
      }
    }

    setDrivers(driverList);

    // Compute KPIs
    const online = driverList.filter(d => d.status === "online").length;
    const onDelivery = driverList.filter(d => d.status === "on_delivery").length;
    const offline = driverList.filter(d => d.status === "offline").length;
    const ratings = driverList.filter(d => d.avg_rating != null).map(d => d.avg_rating!);
    const acceptances = driverList.filter(d => d.acceptance_rate != null).map(d => d.acceptance_rate!);

    setKpis({
      totalDrivers: driverList.length,
      online,
      onDelivery,
      offline,
      avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      avgAcceptance: acceptances.length > 0 ? acceptances.reduce((a, b) => a + b, 0) / acceptances.length : 0,
      totalCompletedToday: driverList.reduce((s, d) => s + (d.total_completed || 0), 0),
    });

    setLoading(false);
  }, [orgId]);

  useEffect(() => { fetchFleet(); }, [fetchFleet]);

  // Realtime subscription
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel("fleet-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_sessions", filter: `org_id=eq.${orgId}` }, () => fetchFleet())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, fetchFleet]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "online": return { label: "En ligne", emoji: "🟢", color: "hsl(var(--success))" };
      case "on_delivery": return { label: "En mission", emoji: "🚗", color: "hsl(var(--hud-cyan))" };
      default: return { label: "Hors ligne", emoji: "⚫", color: "hsl(var(--hud-text-dim) / 0.3)" };
    }
  };

  const getOnlineDuration = (since: string | null) => {
    if (!since) return "--";
    const diff = Date.now() - new Date(since).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
  };

  const getHeartbeatAge = (hb: string | null) => {
    if (!hb) return null;
    const age = (Date.now() - new Date(hb).getTime()) / 1000;
    if (age < 60) return "< 1 min";
    if (age < 300) return `${Math.floor(age / 60)} min`;
    return "⚠️ " + Math.floor(age / 60) + " min";
  };

  const selectedDriverData = drivers.find(d => d.id === selectedDriver);

  return (
    <div className="space-y-3">
      {/* Fleet KPIs */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Total", value: kpis.totalDrivers, color: "--hud-text", icon: Users },
          { label: "En ligne", value: kpis.online, color: "--success", icon: Wifi },
          { label: "En mission", value: kpis.onDelivery, color: "--hud-cyan", icon: Truck },
          { label: "Hors ligne", value: kpis.offline, color: "--hud-text-dim", icon: WifiOff },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <Icon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color: `hsl(var(${color}))` }} />
            <p className="text-sm font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Global performance */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: "Note moy.", value: kpis.avgRating > 0 ? `⭐ ${kpis.avgRating.toFixed(1)}` : "--", color: "--warning" },
          { label: "Taux accept.", value: kpis.avgAcceptance > 0 ? `${kpis.avgAcceptance.toFixed(0)}%` : "--", color: "--success" },
          { label: "Livraisons", value: kpis.totalCompletedToday, color: "--hud-cyan" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg px-2 py-1.5 text-center"
            style={{ background: `hsl(var(${color}) / 0.05)`, border: `1px solid hsl(var(${color}) / 0.1)` }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${color}))` }}>{value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Header & refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>
          🏢 Flotte ({drivers.length})
        </h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={fetchFleet}>
          <RefreshCw className="h-3 w-3" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }} />
        </Button>
      </div>

      {/* Driver list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Activity className="h-5 w-5 animate-pulse" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="h-6 w-6 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
          <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Aucun chauffeur dans la flotte</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {drivers.sort((a, b) => {
            const order = { on_delivery: 0, online: 1, offline: 2 };
            return (order[a.status as keyof typeof order] ?? 2) - (order[b.status as keyof typeof order] ?? 2);
          }).map(driver => {
            const cfg = getStatusConfig(driver.status);
            const isSelected = selectedDriver === driver.id;

            return (
              <motion.div key={driver.id} layout
                className="rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setSelectedDriver(isSelected ? null : driver.id)}
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${isSelected ? cfg.color + "40" : "hsl(var(--hud-border) / 0.06)"}` }}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-sm">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {driver.full_name || driver.user_id.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                        {driver.vehicle_type}
                      </span>
                      {driver.status !== "offline" && (
                        <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                          <Clock className="h-2 w-2 inline mr-0.5" />{getOnlineDuration(driver.online_since)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {driver.avg_rating != null && (
                      <span className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>
                        ⭐ {driver.avg_rating.toFixed(1)}
                      </span>
                    )}
                    {driver.lat != null && (
                      <MapPin className="h-3 w-3" style={{ color: "hsl(var(--success) / 0.5)" }} />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "hsl(var(--hud-border) / 0.06)" }}>
                        <div className="grid grid-cols-3 gap-1.5 pt-2">
                          {[
                            { label: "Complétées", value: driver.total_completed ?? 0 },
                            { label: "Taux accept.", value: driver.acceptance_rate != null ? `${driver.acceptance_rate.toFixed(0)}%` : "--" },
                            { label: "Heartbeat", value: getHeartbeatAge(driver.last_heartbeat_at) || "--" },
                          ].map(({ label, value }) => (
                            <div key={label} className="text-center py-1 rounded-lg"
                              style={{ background: "hsl(var(--hud-bg))" }}>
                              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{value}</p>
                              <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{label}</p>
                            </div>
                          ))}
                        </div>
                        {driver.lat != null && driver.lng != null && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                            style={{ background: "hsl(var(--hud-bg))" }}>
                            <MapPin className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--success))" }} />
                            <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim))" }}>
                              {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                            </span>
                          </div>
                        )}
                        {driver.current_job_id && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
                            style={{ background: "hsl(var(--hud-cyan) / 0.05)" }}>
                            <Truck className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--hud-cyan))" }} />
                            <span className="text-[9px]" style={{ color: "hsl(var(--hud-cyan))" }}>
                              Mission: {driver.current_job_id.slice(0, 8)}…
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
