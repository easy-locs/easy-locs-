/** Canonical package sizes used by delivery creation and cart fee calculation. */
export type PackageSize = "small" | "medium" | "large";

export interface PackageSizeConfig {
  value: PackageSize;
  icon: string;
  label: string;
  /** Maximum weight in kg */
  maxKg: number;
  /** Fee multiplier applied to the base delivery price */
  multiplier: number;
}

export const PACKAGE_SIZES: PackageSizeConfig[] = [
  { value: "small",  icon: "📦", label: "Small",  maxKg: 3,  multiplier: 1.0 },
  { value: "medium", icon: "🛍️", label: "Medium", maxKg: 10, multiplier: 1.4 },
  { value: "large",  icon: "📫", label: "Large",  maxKg: 25, multiplier: 2.0 },
];

/** Great-circle distance between two WGS-84 coordinates, in kilometres. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface DeliveryFeeInput {
  /** Pricing strategy */
  mode: "flat" | "progressive";
  distanceKm: number;
  packageSize: PackageSize;
  isPeakHour?: boolean;
}

interface DeliveryFeeResult {
  fee: number;
}

const BASE_FEE = 3;
const PER_KM_RATE = 0.8;
const PEAK_SURCHARGE = 1.5;

/**
 * Compute the delivery fee for a given distance, package size, and time-of-day.
 * Uses a "progressive" model: base fee + distance rate × package multiplier,
 * with an optional peak-hour surcharge.
 */
export function calculateDeliveryFee(input: DeliveryFeeInput): DeliveryFeeResult {
  const config = PACKAGE_SIZES.find((s) => s.value === input.packageSize);
  const multiplier = config?.multiplier ?? 1;

  let fee: number;
  if (input.mode === "flat") {
    fee = BASE_FEE * multiplier;
  } else {
    fee = (BASE_FEE + input.distanceKm * PER_KM_RATE) * multiplier;
  }

  if (input.isPeakHour) {
    fee *= PEAK_SURCHARGE;
  }

  return { fee: Math.round(fee * 100) / 100 };
}
