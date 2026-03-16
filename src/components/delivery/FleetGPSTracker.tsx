/**
 * FleetGPSTracker — AAA. Real-time fleet GPS tracking.
 * Live map simulation, driver heartbeats, geofencing alerts, trip history.
 * PASS97-AAA
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Signal, AlertTriangle, Clock, Eye,
  Truck, Activity, Shield, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { haptic } from "@/lib/haptics";

interface DriverPosition {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: "online" | "busy" | "offline";
  lastHeartbeat: Date;
  vehicleType: string;
  currentJobId?: string;
  batteryLevel: number;
}

interface GeofenceAlert {
  id: string;
  driverId: string;
  driverName: string;
  type: "entry" | "exit" | "speed" | "idle";
  zone: string;
  timestamp: Date;
  severity: "info" | "warning" | "critical";
}

interface TripRecord {
  id: string;
  driverName: string;
  startTime: Date;
  endTime?: Date;
  distanceKm: number;
  route: Array<{ lat: number; lng: number }>;
}

const MOCK_DRIVERS: DriverPosition[] = [
  { id: "d1", name: "Mamadou K.", lat: 48.8566, lng: 2.3522, speed: 32, heading: 45, status: "busy", lastHeartbeat: new Date(), vehicleType: "scooter", currentJobId: "j1", batteryLevel: 78 },
  { id: "d2", name: "Fatou D.", lat: 48.8606, lng: 2.3376, speed: 0, heading: 0, status: "online", lastHeartbeat: new Date(Date.now() - 30000), vehicleType: "vélo", batteryLevel: 92 },
  { id: "d3", name: "Ibrahima S.", lat: 48.8530, lng: 2.3499, speed: 45, heading: 180, status: "busy", lastHeartbeat: new Date(), vehicleType: "voiture", currentJobId: "j3", batteryLevel: 54 },
  { id: "d4", name: "Aïcha M.", lat: 48.8480, lng: 2.3600, speed: 0, heading: 0, status: "offline", lastHeartbeat: new Date(Date.now() - 600000), vehicleType: "scooter", batteryLevel: 12 },
];

const MOCK_ALERTS: GeofenceAlert[] = [
  { id: "a1", driverId: "d1", driverName: "Mamadou K.", type: "speed", zone: "Zone Centre", timestamp: new Date(Date.now() - 120000), severity: "warning" },
  { id: "a2", driverId: "d3", driverName: "Ibrahima S.", type: "exit", zone: "Périmètre Nord", timestamp: new Date(Date.now() - 300000), severity: "critical" },
  { id: "a3", driverId: "d2", driverName: "Fatou D.", type: "idle", zone: "Zone Sud", timestamp: new Date(Date.now() - 60000), severity: "info" },
];

export default function FleetGPSTracker({ orgId, className }: { orgId: string; className?: string }) {
  const [drivers, setDrivers] = useState<DriverPosition[]>(MOCK_DRIVERS);
  const [alerts, setAlerts] = useState<GeofenceAlert[]>(MOCK_ALERTS);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "alerts" | "history">("map");
  const [isLive, setIsLive] = useState(true);

  // Simulate heartbeat updates
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => {
        if (d.status === "offline") return d;
        const dLat = (Math.random() - 0.5) * 0.001;
        const dLng = (Math.random() - 0.5) * 0.001;
        return {
          ...d,
          lat: d.lat + dLat,
          lng: d.lng + dLng,
          speed: d.status === "busy" ? Math.max(0, d.speed + (Math.random() - 0.5) * 10) : 0,
          lastHeartbeat: new Date(),
          batteryLevel: Math.max(0, d.batteryLevel - Math.random() * 0.5),
        };
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const onlineCount = drivers.filter(d => d.status !== "offline").length;
  const busyCount = drivers.filter(d => d.status === "busy").length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;

  const statusColor = (s: string) =>
    s === "online" ? "hsl(var(--success))" : s === "busy" ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))";

  const severityColor = (s: string) =>
    s === "critical" ? "hsl(var(--destructive))" : s === "warning" ? "hsl(var(--warning))" : "hsl(var(--info))";

  const alertIcon = (type: string) =>
    type === "speed" ? "⚡" : type === "exit" ? "🚫" : type === "idle" ? "⏸️" : "📍";

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Navigation className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Fleet GPS Tracker
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsLive(!isLive); haptic("selection"); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold"
            style={{
              background: isLive ? "hsl(var(--success) / 0.1)" : "hsl(var(--muted) / 0.5)",
              color: isLive ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
            }}>
            {isLive ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
            {isLive ? "LIVE" : "PAUSED"}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "En ligne", value: onlineCount, color: "--success" },
          { label: "En mission", value: busyCount, color: "--warning" },
          { label: "Alertes", value: criticalAlerts, color: "--destructive" },
          { label: "Total", value: drivers.length, color: "--primary" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["map", "alerts", "history"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "map" ? "🗺️ Carte" : v === "alerts" ? `🚨 Alertes (${alerts.length})` : "📜 Historique"}
          </button>
        ))}
      </div>

      {/* Map View — Visual Grid Simulation */}
      {view === "map" && (
        <div className="space-y-2">
          {/* Map placeholder */}
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.1)", minHeight: 200 }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            {drivers.map(d => {
              const x = ((d.lng - 2.33) / 0.04) * 100;
              const y = ((48.87 - d.lat) / 0.03) * 100;
              return (
                <motion.button key={d.id}
                  onClick={() => { setSelectedDriver(selectedDriver === d.id ? null : d.id); haptic("light"); }}
                  className="absolute w-8 h-8 rounded-full flex items-center justify-center -ml-4 -mt-4 z-10"
                  style={{
                    left: `${Math.min(95, Math.max(5, x))}%`,
                    top: `${Math.min(90, Math.max(5, y))}%`,
                    background: statusColor(d.status),
                    boxShadow: selectedDriver === d.id ? `0 0 0 3px hsl(var(--primary) / 0.3)` : "none",
                  }}
                  animate={{ scale: d.status === "busy" ? [1, 1.1, 1] : 1 }}
                  transition={{ repeat: d.status === "busy" ? Infinity : 0, duration: 2 }}>
                  <Truck className="h-3.5 w-3.5 text-white" />
                </motion.button>
              );
            })}
          </div>

          {/* Driver List */}
          {drivers.map(d => (
            <motion.div key={d.id}
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: selectedDriver === d.id ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.2)",
                border: `1px solid ${selectedDriver === d.id ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.08)"}`,
              }}
              onClick={() => setSelectedDriver(selectedDriver === d.id ? null : d.id)}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: statusColor(d.status) + "22" }}>
                <Truck className="h-3.5 w-3.5" style={{ color: statusColor(d.status) }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{d.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: statusColor(d.status) + "15", color: statusColor(d.status) }}>
                    {d.status === "online" ? "Disponible" : d.status === "busy" ? "En mission" : "Hors ligne"}
                  </span>
                  <span className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{d.vehicleType}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color: d.speed > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
                  {d.speed.toFixed(0)} km/h
                </p>
                <p className="text-[8px]" style={{ color: d.batteryLevel < 20 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
                  🔋 {d.batteryLevel.toFixed(0)}%
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Alerts View */}
      {view === "alerts" && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--success) / 0.3)" }} />
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucune alerte active</p>
            </div>
          ) : alerts.map(a => (
            <div key={a.id} className="rounded-xl p-3 flex items-start gap-3"
              style={{ background: severityColor(a.severity) + "08", border: `1px solid ${severityColor(a.severity)}20` }}>
              <span className="text-base mt-0.5">{alertIcon(a.type)}</span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold" style={{ color: severityColor(a.severity) }}>
                  {a.type === "speed" ? "Excès de vitesse" : a.type === "exit" ? "Sortie de zone" : a.type === "idle" ? "Inactivité" : "Entrée zone"}
                </p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {a.driverName} • {a.zone}
                </p>
                <p className="text-[9px] mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                  {a.timestamp.toLocaleTimeString("fr-FR")}
                </p>
              </div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: severityColor(a.severity) + "15", color: severityColor(a.severity) }}>
                {a.severity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* History View */}
      {view === "history" && (
        <div className="space-y-2">
          {[
            { driver: "Mamadou K.", dist: 12.4, time: "45 min", date: "Aujourd'hui 14:30" },
            { driver: "Fatou D.", dist: 8.2, time: "32 min", date: "Aujourd'hui 11:15" },
            { driver: "Ibrahima S.", dist: 22.1, time: "1h 05", date: "Hier 17:45" },
          ].map((t, i) => (
            <div key={i} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <Clock className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{t.driver}</p>
                <p className="text-[9px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.date}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold" style={{ color: "hsl(var(--primary))" }}>{t.dist} km</p>
                <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>{t.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
