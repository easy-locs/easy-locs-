/**
 * DynamicPricingSurge — Surge pricing engine based on demand, time, and conditions.
 * PASS86-II: Dynamic Pricing & Surge
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, Zap, MapPin, DollarSign, AlertTriangle, Sun, Cloud, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SurgeZone {
  id: string;
  name: string;
  baseFee: number;
  currentMultiplier: number;
  demand: "low" | "medium" | "high" | "critical";
  activeDrivers: number;
  pendingJobs: number;
}

interface SurgeConfig {
  enabled: boolean;
  maxMultiplier: number;
  minMultiplier: number;
  peakHours: { start: number; end: number; bonus: number }[];
  weatherMultiplier: { rain: number; storm: number };
  demandThresholds: { medium: number; high: number; critical: number };
  cooldownMinutes: number;
}

const DEFAULT_CONFIG: SurgeConfig = {
  enabled: true,
  maxMultiplier: 3.0,
  minMultiplier: 1.0,
  peakHours: [
    { start: 7, end: 9, bonus: 0.3 },
    { start: 12, end: 14, bonus: 0.2 },
    { start: 18, end: 21, bonus: 0.4 },
  ],
  weatherMultiplier: { rain: 0.3, storm: 0.6 },
  demandThresholds: { medium: 1.5, high: 2.5, critical: 4.0 },
  cooldownMinutes: 15,
};

export default function DynamicPricingSurge({ orgId }: { orgId: string }) {
  const [config, setConfig] = useState<SurgeConfig>(DEFAULT_CONFIG);
  const [weather, setWeather] = useState<"clear" | "rain" | "storm">("clear");
  const [showConfig, setShowConfig] = useState(false);

  // Simulated zones
  const [zones] = useState<SurgeZone[]>([
    { id: "z1", name: "Centre-ville", baseFee: 5, currentMultiplier: 1.8, demand: "high", activeDrivers: 3, pendingJobs: 8 },
    { id: "z2", name: "Gare", baseFee: 6, currentMultiplier: 2.2, demand: "critical", activeDrivers: 1, pendingJobs: 6 },
    { id: "z3", name: "Résidentiel Nord", baseFee: 4, currentMultiplier: 1.0, demand: "low", activeDrivers: 5, pendingJobs: 2 },
    { id: "z4", name: "Zone industrielle", baseFee: 7, currentMultiplier: 1.3, demand: "medium", activeDrivers: 2, pendingJobs: 3 },
  ]);

  const currentHour = new Date().getHours();
  const activePeak = config.peakHours.find(p => currentHour >= p.start && currentHour < p.end);

  const computeSurge = (zone: SurgeZone): number => {
    if (!config.enabled) return 1.0;
    let mult = 1.0;
    // Demand ratio
    const ratio = zone.pendingJobs / Math.max(1, zone.activeDrivers);
    if (ratio >= config.demandThresholds.critical) mult += 1.5;
    else if (ratio >= config.demandThresholds.high) mult += 0.8;
    else if (ratio >= config.demandThresholds.medium) mult += 0.3;
    // Peak hours
    if (activePeak) mult += activePeak.bonus;
    // Weather
    if (weather === "rain") mult += config.weatherMultiplier.rain;
    if (weather === "storm") mult += config.weatherMultiplier.storm;
    return Math.min(config.maxMultiplier, Math.max(config.minMultiplier, Math.round(mult * 10) / 10));
  };

  const getDemandConfig = (d: string) => {
    switch (d) {
      case "critical": return { label: "Critique", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.08)" };
      case "high": return { label: "Élevée", color: "hsl(var(--warning))", bg: "hsl(var(--warning) / 0.08)" };
      case "medium": return { label: "Modérée", color: "hsl(var(--info))", bg: "hsl(var(--info) / 0.08)" };
      default: return { label: "Faible", color: "hsl(var(--success))", bg: "hsl(var(--success) / 0.08)" };
    }
  };

  const weatherIcon = weather === "storm" ? CloudRain : weather === "rain" ? Cloud : Sun;
  const WeatherIcon = weatherIcon;

  const avgMultiplier = zones.length > 0 ? zones.reduce((s, z) => s + computeSurge(z), 0) / zones.length : 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: "hsl(var(--hud-text))" }}>
          <Zap className="h-3.5 w-3.5" style={{ color: "hsl(var(--warning))" }} />
          Tarification dynamique
        </h3>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
            className="w-8 h-4 rounded-full transition-all relative"
            style={{ background: config.enabled ? "hsl(var(--success))" : "hsl(var(--hud-border) / 0.2)" }}>
            <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
              style={{ left: config.enabled ? "calc(100% - 14px)" : "2px" }} />
          </button>
          <Button size="sm" variant="ghost" className="h-7 text-[9px] px-2" onClick={() => setShowConfig(!showConfig)}
            style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>⚙️</Button>
        </div>
      </div>

      {/* Live status */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-xl px-2 py-2 text-center"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <TrendingUp className="h-3.5 w-3.5 mx-auto mb-1" style={{ color: "hsl(var(--warning))" }} />
          <p className="text-sm font-bold" style={{ color: "hsl(var(--warning))" }}>×{avgMultiplier.toFixed(1)}</p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Multiplicateur moy.</p>
        </div>
        <div className="rounded-xl px-2 py-2 text-center"
          style={{ background: activePeak ? "hsl(var(--warning) / 0.05)" : "hsl(var(--hud-surface))", border: `1px solid ${activePeak ? "hsl(var(--warning) / 0.15)" : "hsl(var(--hud-border) / 0.08)"}` }}>
          <Clock className="h-3.5 w-3.5 mx-auto mb-1" style={{ color: activePeak ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.3)" }} />
          <p className="text-[10px] font-bold" style={{ color: activePeak ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim))" }}>
            {activePeak ? `+${(activePeak.bonus * 100).toFixed(0)}%` : "Normal"}
          </p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Heure</p>
        </div>
        <div className="rounded-xl px-2 py-2 text-center cursor-pointer"
          onClick={() => setWeather(w => w === "clear" ? "rain" : w === "rain" ? "storm" : "clear")}
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
          <WeatherIcon className="h-3.5 w-3.5 mx-auto mb-1" style={{ color: weather !== "clear" ? "hsl(var(--info))" : "hsl(var(--warning))" }} />
          <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>
            {weather === "storm" ? "🌧️ Orage" : weather === "rain" ? "🌦️ Pluie" : "☀️ Clair"}
          </p>
          <p className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Météo</p>
        </div>
      </div>

      {/* Peak hours indicator */}
      <div className="rounded-lg px-3 py-2"
        style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
        <p className="text-[8px] font-bold mb-1.5" style={{ color: "hsl(var(--hud-text-dim))" }}>HEURES DE POINTE</p>
        <div className="flex gap-1">
          {Array.from({ length: 24 }, (_, i) => {
            const peak = config.peakHours.find(p => i >= p.start && i < p.end);
            return (
              <div key={i} className="flex-1 rounded-sm transition-all"
                style={{
                  height: peak ? `${12 + peak.bonus * 20}px` : "6px",
                  background: i === currentHour ? "hsl(var(--hud-cyan))" : peak ? `hsl(var(--warning) / ${0.3 + peak.bonus})` : "hsl(var(--hud-border) / 0.1)",
                  marginTop: "auto",
                }} />
            );
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>0h</span>
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>12h</span>
          <span className="text-[7px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>23h</span>
        </div>
      </div>

      {/* Zone pricing */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text-dim))" }}>ZONES TARIFAIRES</p>
        {zones.map(zone => {
          const surge = computeSurge(zone);
          const demandCfg = getDemandConfig(zone.demand);
          const effectivePrice = (zone.baseFee * surge).toFixed(2);

          return (
            <div key={zone.id} className="rounded-xl px-3 py-2.5"
              style={{ background: "hsl(var(--hud-surface))", border: `1px solid hsl(var(--hud-border) / 0.06)` }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{zone.name}</p>
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full"
                      style={{ background: demandCfg.bg, color: demandCfg.color }}>
                      {demandCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                      🚗 {zone.activeDrivers} • ⏳ {zone.pendingJobs} jobs
                    </span>
                    <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                      Base: {zone.baseFee}€
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: surge > 1.5 ? "hsl(var(--warning))" : "hsl(var(--success))" }}>
                    {effectivePrice}€
                  </p>
                  <p className="text-[8px] font-semibold" style={{ color: surge > 1.5 ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.4)" }}>
                    ×{surge.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config panel */}
      {showConfig && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl p-3 space-y-3"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-cyan) / 0.15)" }}>
          <p className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>CONFIGURATION</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Multi. max</Label>
              <Input type="number" step={0.1} value={config.maxMultiplier}
                onChange={e => setConfig(c => ({ ...c, maxMultiplier: +e.target.value }))}
                className="h-7 text-[9px] mt-0.5"
                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
            </div>
            <div>
              <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Cooldown (min)</Label>
              <Input type="number" value={config.cooldownMinutes}
                onChange={e => setConfig(c => ({ ...c, cooldownMinutes: +e.target.value }))}
                className="h-7 text-[9px] mt-0.5"
                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
            </div>
          </div>

          <div>
            <Label className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim))" }}>Bonus météo pluie / orage</Label>
            <div className="flex gap-2 mt-0.5">
              <Input type="number" step={0.1} value={config.weatherMultiplier.rain}
                onChange={e => setConfig(c => ({ ...c, weatherMultiplier: { ...c.weatherMultiplier, rain: +e.target.value } }))}
                className="h-7 text-[9px] flex-1"
                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
              <Input type="number" step={0.1} value={config.weatherMultiplier.storm}
                onChange={e => setConfig(c => ({ ...c, weatherMultiplier: { ...c.weatherMultiplier, storm: +e.target.value } }))}
                className="h-7 text-[9px] flex-1"
                style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text))" }} />
            </div>
          </div>

          <Button size="sm" className="w-full text-[10px] h-7"
            onClick={() => { setShowConfig(false); toast.success("Configuration sauvegardée"); }}
            style={{ background: "hsl(var(--hud-cyan))", color: "hsl(var(--hud-bg))" }}>
            Appliquer
          </Button>
        </motion.div>
      )}

      {/* Surge warning */}
      {avgMultiplier > 1.5 && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2"
          style={{ background: "hsl(var(--warning) / 0.05)", border: "1px solid hsl(var(--warning) / 0.15)" }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--warning))" }} />
          <p className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>
            Surge actif — les prix sont majorés de {((avgMultiplier - 1) * 100).toFixed(0)}% en moyenne
          </p>
        </div>
      )}
    </div>
  );
}
