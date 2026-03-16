/**
 * SmartLockerNetwork — GGG2. Smart Locker Network.
 * Intelligent lockers: dynamic allocation, QR unlock, temperature control, usage analytics.
 * PASS105-GGG2
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Box, MapPin, Thermometer, QrCode, BarChart3,
  Lock, Unlock, Battery, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface SmartLocker {
  id: string;
  name: string;
  location: string;
  totalSlots: number;
  availableSlots: number;
  temperature: number;
  tempControlled: boolean;
  status: "online" | "maintenance" | "offline";
  batteryLevel: number;
  lastAccess: Date;
  dailyUses: number;
}

interface LockerSlot {
  id: string;
  lockerId: string;
  size: "S" | "M" | "L" | "XL";
  status: "empty" | "occupied" | "reserved" | "maintenance";
  orderId: string | null;
  expiresAt: Date | null;
  tempZone: "ambient" | "cool" | "frozen";
}

const LOCKERS: SmartLocker[] = [
  { id: "sl1", name: "Gare Centrale", location: "Hall Principal", totalSlots: 24, availableSlots: 8, temperature: 22, tempControlled: true, status: "online", batteryLevel: 94, lastAccess: new Date(Date.now() - 300000), dailyUses: 47 },
  { id: "sl2", name: "Centre Commercial Plateau", location: "Entrée Nord", totalSlots: 16, availableSlots: 3, temperature: 21, tempControlled: false, status: "online", batteryLevel: 78, lastAccess: new Date(Date.now() - 600000), dailyUses: 35 },
  { id: "sl3", name: "Campus Universitaire", location: "Bât. A", totalSlots: 12, availableSlots: 7, temperature: 23, tempControlled: false, status: "online", batteryLevel: 88, lastAccess: new Date(Date.now() - 1800000), dailyUses: 18 },
  { id: "sl4", name: "Pharmacie Liberté", location: "Parking", totalSlots: 8, availableSlots: 0, temperature: 4, tempControlled: true, status: "maintenance", batteryLevel: 32, lastAccess: new Date(Date.now() - 7200000), dailyUses: 12 },
  { id: "sl5", name: "Résidence HLM", location: "Entrée Principale", totalSlots: 10, availableSlots: 5, temperature: 22, tempControlled: false, status: "online", batteryLevel: 91, lastAccess: new Date(Date.now() - 900000), dailyUses: 22 },
];

const SLOTS: LockerSlot[] = [
  { id: "ls1", lockerId: "sl1", size: "M", status: "occupied", orderId: "CMD-2847", expiresAt: new Date(Date.now() + 3600000), tempZone: "ambient" },
  { id: "ls2", lockerId: "sl1", size: "L", status: "reserved", orderId: "CMD-2848", expiresAt: new Date(Date.now() + 7200000), tempZone: "cool" },
  { id: "ls3", lockerId: "sl1", size: "S", status: "empty", orderId: null, expiresAt: null, tempZone: "ambient" },
  { id: "ls4", lockerId: "sl2", size: "XL", status: "occupied", orderId: "CMD-2849", expiresAt: new Date(Date.now() + 1800000), tempZone: "frozen" },
  { id: "ls5", lockerId: "sl4", size: "M", status: "maintenance", orderId: null, expiresAt: null, tempZone: "cool" },
];

export default function SmartLockerNetwork({ orgId, className }: { orgId: string; className?: string }) {
  const [view, setView] = useState<"lockers" | "slots" | "analytics">("lockers");

  const totalSlots = LOCKERS.reduce((s, l) => s + l.totalSlots, 0);
  const totalAvail = LOCKERS.reduce((s, l) => s + l.availableSlots, 0);
  const occupancy = Math.round(((totalSlots - totalAvail) / totalSlots) * 100);
  const dailyTotal = LOCKERS.reduce((s, l) => s + l.dailyUses, 0);

  const statusCfg = (s: string) => ({
    online: { label: "En ligne", color: "--success", icon: "🟢" },
    maintenance: { label: "Maintenance", color: "--warning", icon: "🔧" },
    offline: { label: "Hors ligne", color: "--destructive", icon: "🔴" },
  }[s] || { label: s, color: "--muted-foreground", icon: "❓" });

  const slotCfg = (s: string) => ({
    empty: { label: "Libre", color: "--success" },
    occupied: { label: "Occupé", color: "--primary" },
    reserved: { label: "Réservé", color: "--warning" },
    maintenance: { label: "Maint.", color: "--destructive" },
  }[s] || { label: s, color: "--muted-foreground" });

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
        <Box className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        Réseau de casiers intelligents
      </h3>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Casiers", value: LOCKERS.length, color: "--primary" },
          { label: "Dispo", value: totalAvail, color: "--success" },
          { label: "Occup.", value: `${occupancy}%`, color: occupancy > 80 ? "--warning" : "--info" },
          { label: "Utilisation/j", value: dailyTotal, color: "--info" },
        ].map(k => (
          <div key={k.label} className="rounded-xl px-2 py-2 text-center"
            style={{ background: "hsl(var(--muted) / 0.3)", border: "1px solid hsl(var(--border) / 0.1)" }}>
            <p className="text-sm font-bold" style={{ color: `hsl(var(${k.color}))` }}>{k.value}</p>
            <p className="text-[7px]" style={{ color: "hsl(var(--muted-foreground))" }}>{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["lockers", "slots", "analytics"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold"
            style={{ background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent", color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
            {v === "lockers" ? "📦 Casiers" : v === "slots" ? "🔲 Emplacements" : "📊 Analytics"}
          </button>
        ))}
      </div>

      {view === "lockers" && (
        <div className="space-y-2">
          {LOCKERS.map(l => {
            const cfg = statusCfg(l.status);
            const fillPct = Math.round(((l.totalSlots - l.availableSlots) / l.totalSlots) * 100);
            return (
              <div key={l.id} className="rounded-xl p-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{l.name}</p>
                      {l.tempControlled && <Thermometer className="h-3 w-3" style={{ color: "hsl(var(--info))" }} />}
                    </div>
                    <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                      📍 {l.location} • 🔋 {l.batteryLevel}% • 🌡️ {l.temperature}°C
                    </p>
                    <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.5)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${fillPct}%`,
                        background: fillPct > 90 ? "hsl(var(--destructive))" : fillPct > 70 ? "hsl(var(--warning))" : "hsl(var(--success))",
                      }} />
                    </div>
                    <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {l.availableSlots}/{l.totalSlots} libres • {l.dailyUses} utilisations/j
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <Button size="sm" className="w-full text-[10px] h-8" variant="outline"
            onClick={() => { haptic("medium"); toast.success("QR Code généré pour déverrouillage"); }}
            style={{ borderColor: "hsl(var(--border) / 0.2)", color: "hsl(var(--primary))" }}>
            <QrCode className="h-3 w-3 mr-1" /> Générer QR de déverrouillage
          </Button>
        </div>
      )}

      {view === "slots" && (
        <div className="space-y-2">
          {SLOTS.map(s => {
            const cfg = slotCfg(s.status);
            return (
              <div key={s.id} className="rounded-xl p-3 flex items-center gap-3"
                style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>
                  {s.size}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>
                      {LOCKERS.find(l => l.id === s.lockerId)?.name} — {s.size}
                    </p>
                    <span className="text-[6px] font-bold px-1 py-0.5 rounded"
                      style={{ background: `hsl(var(${cfg.color}) / 0.1)`, color: `hsl(var(${cfg.color}))` }}>{cfg.label}</span>
                  </div>
                  <p className="text-[8px]" style={{ color: "hsl(var(--muted-foreground))" }}>
                    🌡️ {s.tempZone === "ambient" ? "Ambiant" : s.tempZone === "cool" ? "Frais 4°C" : "Surgelé -18°C"}
                    {s.orderId && ` • 📦 ${s.orderId}`}
                    {s.expiresAt && ` • ⏰ ${Math.round((s.expiresAt.getTime() - Date.now()) / 60000)}min`}
                  </p>
                </div>
                {s.status === "occupied" && (
                  <Button size="sm" className="text-[8px] h-6 px-2"
                    onClick={() => { haptic("light"); toast.success("Casier déverrouillé"); }}
                    style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                    <Unlock className="h-2.5 w-2.5 mr-0.5" /> Ouvrir
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === "analytics" && (
        <div className="space-y-2">
          {[
            { label: "Taux d'occupation moyen", value: `${occupancy}%`, trend: 5, icon: "📊" },
            { label: "Utilisations aujourd'hui", value: dailyTotal, trend: 12, icon: "📦" },
            { label: "Temps moyen de retrait", value: "14 min", trend: -8, icon: "⏱️" },
            { label: "Alertes température", value: 2, trend: -15, icon: "🌡️" },
            { label: "Casiers en maintenance", value: LOCKERS.filter(l => l.status === "maintenance").length, trend: 0, icon: "🔧" },
            { label: "Satisfaction client", value: "94%", trend: 3, icon: "⭐" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: "hsl(var(--muted) / 0.2)", border: "1px solid hsl(var(--border) / 0.08)" }}>
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1">
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{s.label}</p>
                <p className="text-[13px] font-bold" style={{ color: "hsl(var(--primary))" }}>{s.value}</p>
              </div>
              <span className="text-[9px] font-bold" style={{ color: s.trend > 0 ? "hsl(var(--success))" : s.trend < 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))" }}>
                {s.trend > 0 ? "↑" : s.trend < 0 ? "↓" : "—"} {Math.abs(s.trend)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
