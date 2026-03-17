/**
 * Delivery pricing engine — fixed + progressive (per-km) modes.
 * Package size multipliers: light (0.8x), medium (1x), heavy (1.5x).
 * PASS GO LIVE: Delivery Radar Upgrade.
 */

export type PackageSize = "light" | "medium" | "heavy";
export type PricingMode = "fixed" | "progressive";

export const PACKAGE_SIZES: { value: PackageSize; label: string; icon: string; maxKg: number; multiplier: number }[] = [
  { value: "light", label: "Léger", icon: "📦", maxKg: 5, multiplier: 0.8 },
  { value: "medium", label: "Moyen", icon: "📫", maxKg: 20, multiplier: 1.0 },
  { value: "heavy", label: "Lourd", icon: "🏋️", maxKg: 100, multiplier: 1.5 },
];

export interface DeliveryPricingConfig {
  baseFee: number;
  perKmRate: number;
  peakSurcharge: number;
  currency: string;
}

const DEFAULT_CONFIG: DeliveryPricingConfig = {
  baseFee: 3.0,
  perKmRate: 1.2,
  peakSurcharge: 2.0,
  currency: "EUR",
};

/**
 * Calculate delivery fee.
 * Fixed = baseFee * sizeMultiplier
 * Progressive = baseFee + (distance * perKmRate) * sizeMultiplier
 */
export function calculateDeliveryFee(opts: {
  mode: PricingMode;
  distanceKm: number;
  packageSize: PackageSize;
  isPeakHour?: boolean;
  config?: Partial<DeliveryPricingConfig>;
}): { fee: number; breakdown: string; currency: string } {
  const cfg = { ...DEFAULT_CONFIG, ...opts.config };
  const sizeInfo = PACKAGE_SIZES.find(s => s.value === opts.packageSize) || PACKAGE_SIZES[1];
  const multiplier = sizeInfo.multiplier;

  let fee: number;
  let breakdown: string;

  if (opts.mode === "fixed") {
    fee = cfg.baseFee * multiplier;
    breakdown = `Base ${cfg.baseFee}€ × ${multiplier} (${sizeInfo.label})`;
  } else {
    const distanceCost = opts.distanceKm * cfg.perKmRate;
    fee = (cfg.baseFee + distanceCost) * multiplier;
    breakdown = `(${cfg.baseFee}€ + ${opts.distanceKm.toFixed(1)}km × ${cfg.perKmRate}€) × ${multiplier}`;
  }

  if (opts.isPeakHour) {
    fee += cfg.peakSurcharge;
    breakdown += ` + ${cfg.peakSurcharge}€ peak`;
  }

  return { fee: Math.round(fee * 100) / 100, breakdown, currency: cfg.currency };
}

/**
 * Auto-detect package size from weight.
 */
export function detectPackageSize(weightKg: number | null | undefined): PackageSize {
  if (!weightKg || weightKg <= 5) return "light";
  if (weightKg <= 20) return "medium";
  return "heavy";
}

/**
 * Haversine distance in km.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
