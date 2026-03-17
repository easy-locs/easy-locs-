/**
 * DeliveryPricingCalculator — Real-time pricing preview for delivery creation.
 * Shows fixed vs progressive pricing with package size impact.
 * PASS GO LIVE: Delivery Radar Upgrade.
 */
import { useState, useMemo } from "react";
import { calculateDeliveryFee, type PricingMode, type PackageSize } from "@/lib/delivery-pricing";
import PackageSizePicker from "./PackageSizePicker";
import { cn } from "@/lib/utils";
import { Truck, Zap } from "lucide-react";

interface Props {
  distanceKm: number;
  onPricingChange: (fee: number, mode: PricingMode, packageSize: PackageSize) => void;
  initialSize?: PackageSize;
  initialMode?: PricingMode;
}

export default function DeliveryPricingCalculator({
  distanceKm,
  onPricingChange,
  initialSize = "medium",
  initialMode = "fixed",
}: Props) {
  const [mode, setMode] = useState<PricingMode>(initialMode);
  const [size, setSize] = useState<PackageSize>(initialSize);
  const [isPeak, setIsPeak] = useState(false);

  const pricing = useMemo(() => {
    const result = calculateDeliveryFee({ mode, distanceKm, packageSize: size, isPeakHour: isPeak });
    onPricingChange(result.fee, mode, size);
    return result;
  }, [mode, distanceKm, size, isPeak]);

  return (
    <div className="space-y-3">
      {/* Pricing mode toggle */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Mode tarifaire
        </label>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => setMode("fixed")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all min-h-[44px]",
              mode === "fixed" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            Prix fixe
          </button>
          <button
            type="button"
            onClick={() => setMode("progressive")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all min-h-[44px]",
              mode === "progressive" ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Par km
          </button>
        </div>
      </div>

      {/* Package size */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Taille du colis
        </label>
        <div className="mt-1.5">
          <PackageSizePicker value={size} onChange={setSize} />
        </div>
      </div>

      {/* Peak hour toggle */}
      <button
        type="button"
        onClick={() => setIsPeak(!isPeak)}
        className={cn(
          "w-full py-2 rounded-xl border text-xs font-medium transition-all min-h-[44px]",
          isPeak
            ? "border-orange-500/30 bg-orange-500/10 text-orange-500"
            : "border-border text-muted-foreground"
        )}
      >
        {isPeak ? "🔥 Heure de pointe (+2€)" : "Heure normale"}
      </button>

      {/* Price preview */}
      <div className="rounded-xl p-3 text-center" style={{ background: "hsl(var(--accent) / 0.08)", border: "1px solid hsl(var(--accent) / 0.15)" }}>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Frais de livraison estimés</p>
        <p className="text-2xl font-black text-accent mt-1">
          {pricing.fee.toFixed(2)} {pricing.currency}
        </p>
        <p className="text-[9px] text-muted-foreground mt-1">{pricing.breakdown}</p>
        {distanceKm > 0 && mode === "progressive" && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Distance : {distanceKm.toFixed(1)} km
          </p>
        )}
      </div>
    </div>
  );
}
