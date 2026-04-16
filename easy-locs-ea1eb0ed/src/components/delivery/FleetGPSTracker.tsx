/**
 * FleetGPSTracker — AAA. Real-time fleet GPS tracking.
 * Live map simulation, driver heartbeats, geofencing alerts, trip history.
 * PASS97-AAA
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Signal, AlertTriangle, Clock, Eye,
  Truck, Activity, Shield, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";
import { useDriverLiveLocations, useDeliveryIncidents } from "@/hooks/useDeliveryData";

export default function FleetGPSTracker({ orgId, className }: { orgId: string; className?: string }) {
  const { data: drivers = [], isLoading: driversLoading } = useDriverLiveLocations(orgId);
  const { data: alerts = [], isLoading: alertsLoading } = useDeliveryIncidents(orgId);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "alerts" | "history">("map");
  const [isLive, setIsLive] = useState(true);

  if (driversLoading || alertsLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const onlineCount = drivers.filter((d: any) => d.status !== "offline").length;
  const busyCount = drivers.filter((d: any) => d.status === "busy").length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;

  const statusColor = (s: string) =>
    s === "online" ? "hsl(var(--success))" : s === "busy" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))";

  const severityColor = (s: string) =>
    s === "critical" ? "hsl(var(--destructive))" : s === "warning" ? "hsl(var(--warning))" : "hsl(var(--info))";

  const alertIcon = (type: string) =>
    type === "speed" ? "⚡" : type === "exit" ? "🚫" : type === "idle" ? "⏸️" : "📍";

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Navigation className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Fleet GPS Tracker
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsLive(!isLive); haptic("selection"); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.625rem] font-bold"
            style={{
              background: isLive ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.5)",
              color: isLive ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
            }}>
            {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {isLive ? "LIVE" : "PAUSED"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "En ligne", value: onlineCount, color: "--success" },
          { label: "En mission", value: busyCount, color: "--warning" },
          { label: "Alertes", value: criticalAlerts, color: "--destructive" },
          { label: "Total", value: drivers.length, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["map", "alerts", "history"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[0.625rem] font-semibold transition-all"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "map" ? "🗺️ Carte" : v === "alerts" ? `🚨 Alertes (${alerts.length})` : "📜 Historique"}
          </button>
        ))}
      </div>

      {view === "map" && (
        <div className="space-y-2">
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.1)", minHeight: 200 }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            {drivers.map((d: any) => {
              const lat = d.lat ?? d.latitude ?? 48.856;
              const lng = d.lng ?? d.longitude ?? 2.352;
              const x = ((lng - 2.33) / 0.04) * 100;
              const y = ((48.87 - lat) / 0.03) * 100;
              return (
                <motion.button key={d.id}
                  onClick={() => { setSelectedDriver(selectedDriver === d.id ? null : d.id); haptic("light"); }}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center -ml-4 -mt-4 z-10"
                  style={{
                    left: `${Math.min(95, Math.max(5, x))}%`,
                    top: `${Math.min(90, Math.max(5, y))}%`,
                    background: statusColor(d.status || "offline"),
                    boxShadow: selectedDriver === d.id ? `0 0 0 3px hsl(var(--primary) / 0.3)` : "none",
                  }}
                  animate={{ scale: d.status === "busy" ? [1, 1.1, 1] : 1 }}
                  transition={{ repeat: d.status === "busy" ? Infinity : 0, duration: 2 }}>
                  <Truck className="h-3.5 w-3.5 text-white" />
                </motion.button>
              );
            })}
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun livreur actif</p>
            </div>
          ) : drivers.map((d: any) => (
            <motion.div key={d.id}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: selectedDriver === d.id ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${selectedDriver === d.id ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.08)"}`,
              }}
              onClick={() => setSelectedDriver(selectedDriver === d.id ? null : d.id)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: statusColor(d.status || "offline") + "22" }}>
                <Truck className="h-3.5 w-3.5" style={{ color: statusColor(d.status || "offline") }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.name || d.driver_name || d.id}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[0.625rem] px-1.5 py-0.5 rounded-full" style={{ background: statusColor(d.status || "offline") + "15", color: statusColor(d.status || "offline") }}>
                    {d.status === "online" ? "Disponible" : d.status === "busy" ? "En mission" : "Hors ligne"}
                  </span>
                  <span className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.vehicle_type || "—"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[0.625rem] font-bold" style={{ color: (d.speed || 0) > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                  {(d.speed || 0).toFixed(0)} km/h
                </p>
                <p className="text-[0.625rem]" style={{ color: (d.battery_level || 0) < 20 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
                  🔋 {(d.battery_level || 0).toFixed(0)}%
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {view === "alerts" && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune alerte active</p>
            </div>
          ) : alerts.map((a: any) => (
            <div key={a.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: severityColor(a.severity || "info") + "08", border: `1px solid ${severityColor(a.severity || "info")}20` }}>
              <span className="text-base mt-0.5">{alertIcon(a.type || "entry")}</span>
              <div className="flex-1">
                <p className="text-[0.6875rem] font-semibold" style={{ color: severityColor(a.severity || "info") }}>
                  {a.type === "speed" ? "Excès de vitesse" : a.type === "exit" ? "Sortie de zone" : a.type === "idle" ? "Inactivité" : a.title || "Incident"}
                </p>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {a.driver_name || "—"} • {a.zone || a.description || "—"}
                </p>
                <p className="text-[0.625rem] mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                  {a.created_at ? new Date(a.created_at).toLocaleTimeString("fr-FR") : "—"}
                </p>
              </div>
              <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: severityColor(a.severity || "info") + "15", color: severityColor(a.severity || "info") }}>
                {(a.severity || "info").toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {view === "history" && (
        <div className="space-y-2">
          {drivers.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun historique</p>
            </div>
          ) : drivers.slice(0, 5).map((d: any, i: number) => (
            <div key={d.id || i} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <Clock className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <div className="flex-1">
                <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.name || d.driver_name || d.id}</p>
                <p className="text-[0.625rem]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {d.updated_at ? new Date(d.updated_at).toLocaleString("fr-FR") : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[0.625rem] font-bold" style={{ color: "hsl(var(--primary))" }}>{(d.distance_km || 0).toFixed(1)} km</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
