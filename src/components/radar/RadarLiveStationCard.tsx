/**
 * RadarLiveStationCard — Displays live zone intelligence on the Radar.
 * Shows weather, traffic, demand, rider supply, ETAs, surge, flood risk.
 * Adapts per category vertical.
 */
import { usePlatformBrain } from "@/hooks/usePlatformBrain";
import {
  Cloud, CloudRain, CloudLightning, Sun, Car, Bike, Users,
  Clock, Zap, AlertTriangle, TrendingUp, Store, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WEATHER_ICON: Record<string, React.ReactNode> = {
  clear: <Sun className="w-3 h-3 text-amber-400" />,
  cloudy: <Cloud className="w-3 h-3 text-muted-foreground" />,
  rain: <CloudRain className="w-3 h-3 text-blue-400" />,
  storm: <CloudLightning className="w-3 h-3 text-red-400" />,
};

interface Props {
  vertical?: string;
  compact?: boolean;
}

export default function RadarLiveStationCard({ vertical, compact = false }: Props) {
  const { arbitration: station } = usePlatformBrain();

  if (station.loading || (!station.zoneKey && !station.label)) {
    return (
      <div className="rounded-xl border border-border/20 bg-card/60 p-3 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-2" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
      </div>
    );
  }

  const showFoodEta = !vertical || vertical === "food" || vertical === "restaurant";
  const showGroceryEta = !vertical || vertical === "grocery";
  const showTaxiEta = !vertical || vertical === "taxi";
  const showParcelEta = !vertical || vertical === "parcel" || vertical === "delivery";

  return (
    <div className={cn(
      "rounded-xl border border-border/20 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm space-y-2",
      compact ? "p-2.5" : "p-3"
    )}>
      {/* Zone label + demand */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[10px] font-semibold text-foreground truncate">
            {station.label || station.zoneKey || "Zone"}
          </span>
        </div>
        {station.arbitration?.decisions?.some((d: any) => d.module === "demand" && d.demandLevel === "high") && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-orange-500">
            <TrendingUp className="w-2.5 h-2.5" /> High demand
          </span>
        )}
      </div>

      {/* Conditions row */}
      <div className="flex items-center gap-2 flex-wrap">
        {station.weatherType && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/40">
            {WEATHER_ICON[station.weatherType] ?? <Sun className="w-3 h-3" />}
            <span className="text-[9px] text-foreground capitalize">{station.weatherType}</span>
          </div>
        )}
        {station.trafficLevel && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/40">
            <Car className={cn("w-3 h-3",
              station.trafficLevel === "heavy" || station.trafficLevel === "severe" ? "text-orange-400" : "text-emerald-400"
            )} />
            <span className="text-[9px] text-foreground capitalize">{station.trafficLevel}</span>
          </div>
        )}
        {station.riderCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/40">
            <Bike className="w-3 h-3 text-primary" />
            <span className="text-[9px] text-foreground">{station.riderCount} riders</span>
          </div>
        )}
        {station.surge > 1.05 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
            <Zap className="w-2.5 h-2.5 text-destructive" />
            <span className="text-[9px] font-bold text-destructive">{Math.round((station.surge - 1) * 100)}%</span>
          </div>
        )}
      </div>

      {/* ETA chips */}
      {!compact && (
        <div className="flex gap-1.5 flex-wrap">
          {showFoodEta && station.etas.food != null && (
            <EtaBadge emoji="🍽️" label="Food" eta={station.etas.food} />
          )}
          {showGroceryEta && station.etas.grocery != null && (
            <EtaBadge emoji="🛒" label="Grocery" eta={station.etas.grocery} />
          )}
          {showTaxiEta && station.etas.taxi != null && (
            <EtaBadge emoji="🚕" label="Taxi" eta={station.etas.taxi} />
          )}
          {showParcelEta && station.etas.parcel != null && (
            <EtaBadge emoji="📦" label="Parcel" eta={station.etas.parcel} />
          )}
        </div>
      )}

      {/* Safety block */}
      {station.safetyBlock && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/5 border border-destructive/10">
          <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
          <span className="text-[9px] text-destructive">Deliveries restricted in this zone</span>
        </div>
      )}

      {/* Warnings */}
      {station.warnings.length > 0 && !station.safetyBlock && (
        <p className="text-[9px] text-orange-500 px-1">{station.warnings[0]}</p>
      )}
    </div>
  );
}

function EtaBadge({ emoji, label, eta }: { emoji: string; label: string; eta: number }) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
      <span className="text-[9px]">{emoji}</span>
      <span className="text-[9px] font-semibold text-foreground">{label}</span>
      <span className="text-[9px] text-primary font-bold">{eta}m</span>
    </div>
  );
}
