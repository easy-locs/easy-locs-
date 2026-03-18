/**
 * PresenceMobilitySelector — Map presence, entity type, and coverage config for listings.
 */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin, Radio, EyeOff, Store, Truck, Wrench, Car, Circle, Target, Waves } from "lucide-react";

export type PresenceMode = "off" | "pin" | "live";
export type EntityType = "fixed_store" | "mobile_seller" | "mobile_service" | "driver";
export type CoverageMode = "point" | "radius" | "live_radius";

export interface PresenceConfig {
  presence_mode: PresenceMode;
  entity_type: EntityType;
  coverage_mode: CoverageMode;
  coverage_radius_m: number | null;
}

const PRESENCE_OPTIONS: { value: PresenceMode; label: string; desc: string; icon: typeof MapPin }[] = [
  { value: "off", label: "Off", desc: "Not shown on map", icon: EyeOff },
  { value: "pin", label: "Pin", desc: "Fixed anchor location", icon: MapPin },
  { value: "live", label: "Live", desc: "Live GPS position", icon: Radio },
];

const ENTITY_OPTIONS: { value: EntityType; label: string; icon: typeof Store; emoji: string }[] = [
  { value: "fixed_store", label: "Fixed Store", icon: Store, emoji: "🏪" },
  { value: "mobile_seller", label: "Mobile Seller", icon: Truck, emoji: "🛒" },
  { value: "mobile_service", label: "Mobile Service", icon: Wrench, emoji: "🔧" },
  { value: "driver", label: "Driver", icon: Car, emoji: "🚗" },
];

const COVERAGE_OPTIONS: { value: CoverageMode; label: string; desc: string; icon: typeof Circle; needsRadius: boolean }[] = [
  { value: "point", label: "Point Only", desc: "Exact location marker", icon: Circle, needsRadius: false },
  { value: "radius", label: "Radius", desc: "Fixed coverage area", icon: Target, needsRadius: true },
  { value: "live_radius", label: "Live Radius", desc: "Dynamic coverage zone", icon: Waves, needsRadius: true },
];

const RADIUS_PRESETS = [500, 1000, 2000, 5000, 10000, 25000];

interface Props {
  config: PresenceConfig;
  onChange: (config: PresenceConfig) => void;
}

export default function PresenceMobilitySelector({ config, onChange }: Props) {
  const update = (patch: Partial<PresenceConfig>) => onChange({ ...config, ...patch });

  // Filter coverage options based on presence mode
  const availableCoverage = COVERAGE_OPTIONS.filter((opt) => {
    if (config.presence_mode === "pin") return opt.value !== "live_radius";
    if (config.presence_mode === "live") return true;
    return false;
  });

  const showCoverage = config.presence_mode !== "off";
  const showEntity = config.presence_mode !== "off";
  const showRadius = showCoverage && config.coverage_mode !== "point";

  return (
    <div className="space-y-5">
      {/* ── Presence Mode ── */}
      <div>
        <Label className="text-xs font-semibold mb-2 block">
          📍 Map visibility
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESENCE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = config.presence_mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  update({
                    presence_mode: opt.value,
                    coverage_mode: opt.value === "off" ? "point" : config.coverage_mode,
                    coverage_radius_m: opt.value === "off" ? null : config.coverage_radius_m,
                  })
                }
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  selected
                    ? "border-accent bg-accent/10 shadow-sm"
                    : "border-border/50 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <Icon className={`h-5 w-5 ${selected ? "text-accent" : "text-muted-foreground"}`} />
                <span className={`text-xs font-semibold ${selected ? "text-accent" : "text-foreground"}`}>
                  {opt.label}
                </span>
                <span className="text-[9px] text-muted-foreground leading-tight">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Entity Type ── */}
      {showEntity && (
        <div>
          <Label className="text-xs font-semibold mb-2 block">
            🏷️ Activity type
          </Label>
          <div className="flex flex-wrap gap-2">
            {ENTITY_OPTIONS.map((opt) => {
              const selected = config.entity_type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ entity_type: opt.value })}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selected
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span>{opt.emoji}</span> {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Coverage Mode ── */}
      {showCoverage && availableCoverage.length > 0 && (
        <div>
          <Label className="text-xs font-semibold mb-2 block">
            📡 Coverage type
          </Label>
          <div className="flex flex-wrap gap-2">
            {availableCoverage.map((opt) => {
              const Icon = opt.icon;
              const selected = config.coverage_mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    update({
                      coverage_mode: opt.value,
                      coverage_radius_m: opt.needsRadius ? config.coverage_radius_m || 1000 : null,
                    })
                  }
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all flex items-center gap-1.5 ${
                    selected
                      ? "border-accent bg-accent/10 text-accent shadow-sm"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Radius Value ── */}
      {showRadius && (
        <div>
          <Label className="text-xs font-semibold mb-2 block">
            📏 Coverage radius
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {RADIUS_PRESETS.map((r) => {
              const selected = config.coverage_radius_m === r;
              const label = r >= 1000 ? `${r / 1000}km` : `${r}m`;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => update({ coverage_radius_m: r })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    selected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={config.coverage_radius_m || ""}
              onChange={(e) => update({ coverage_radius_m: e.target.value ? Number(e.target.value) : null })}
              placeholder="Custom (meters)"
              className="max-w-[180px]"
              min={100}
              max={50000}
            />
            <span className="text-xs text-muted-foreground">meters</span>
          </div>
        </div>
      )}
    </div>
  );
}
