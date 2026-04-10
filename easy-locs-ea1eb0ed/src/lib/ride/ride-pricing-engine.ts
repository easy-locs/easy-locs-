import type {
  VehicleType,
  RidePricing,
  DeliveryPricing,
  DeliveryCategory,
  SurgeZone,
  TrafficCondition,
} from "@/domains/ride/ride-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";

interface VehicleTierConfig {
  baseFare: number;
  pricePerKm: number;
  pricePerMin: number;
  minFare: number;
  bookingFee: number;
  label: string;
}

const VEHICLE_TIERS: Record<VehicleType, VehicleTierConfig> = {
  standard:  { baseFare: 3.00, pricePerKm: 1.50, pricePerMin: 0.30, minFare: 5.00, bookingFee: 1.00, label: "Standard" },
  premium:   { baseFare: 5.00, pricePerKm: 2.50, pricePerMin: 0.50, minFare: 8.00, bookingFee: 1.50, label: "Premium" },
  xl:        { baseFare: 6.00, pricePerKm: 2.80, pricePerMin: 0.55, minFare: 10.00, bookingFee: 2.00, label: "XL" },
  moto:      { baseFare: 2.00, pricePerKm: 1.00, pricePerMin: 0.20, minFare: 3.00, bookingFee: 0.50, label: "Moto" },
  bike:      { baseFare: 1.50, pricePerKm: 0.80, pricePerMin: 0.15, minFare: 2.50, bookingFee: 0.50, label: "Bike" },
  electric:  { baseFare: 4.00, pricePerKm: 2.00, pricePerMin: 0.40, minFare: 6.00, bookingFee: 1.00, label: "Electric" },
  van:       { baseFare: 8.00, pricePerKm: 3.50, pricePerMin: 0.60, minFare: 12.00, bookingFee: 2.50, label: "Van" },
};

interface DeliveryCategoryConfig {
  baseFee: number;
  perKmRate: number;
  weightMultiplier: number;
  minFee: number;
}

const DELIVERY_CATEGORIES: Record<DeliveryCategory, DeliveryCategoryConfig> = {
  food:    { baseFee: 2.50, perKmRate: 0.80, weightMultiplier: 0, minFee: 3.00 },
  grocery: { baseFee: 3.00, perKmRate: 1.00, weightMultiplier: 0.10, minFee: 4.00 },
  parcel:  { baseFee: 4.00, perKmRate: 1.20, weightMultiplier: 0.20, minFee: 5.00 },
  errand:  { baseFee: 5.00, perKmRate: 1.50, weightMultiplier: 0.05, minFee: 6.00 },
  gift:    { baseFee: 3.50, perKmRate: 1.00, weightMultiplier: 0.05, minFee: 4.50 },
};

const SURGE_THRESHOLDS = [
  { ratio: 4.0, multiplier: 2.5, level: "extreme" as const },
  { ratio: 3.0, multiplier: 2.0, level: "high" as const },
  { ratio: 2.0, multiplier: 1.5, level: "medium" as const },
  { ratio: 1.5, multiplier: 1.2, level: "low" as const },
  { ratio: 0,   multiplier: 1.0, level: "none" as const },
];

const TRAFFIC_MULTIPLIERS: Record<TrafficCondition["level"], number> = {
  low: 1.0,
  moderate: 1.05,
  heavy: 1.15,
  gridlock: 1.30,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeSurge(demand: number, supply: number): SurgeZone {
  const ratio = supply > 0 ? demand / supply : demand > 0 ? 10 : 0;
  const threshold = SURGE_THRESHOLDS.find(t => ratio >= t.ratio) ?? SURGE_THRESHOLDS[SURGE_THRESHOLDS.length - 1];
  return {
    zoneId: "current",
    multiplier: threshold.multiplier,
    demand,
    supply,
    level: threshold.level,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  };
}

export function computeRidePricing(opts: {
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  surge?: SurgeZone;
  traffic?: TrafficCondition;
  tollFee?: number;
  tip?: number;
  discount?: number;
  currency?: CurrencyCode;
}): RidePricing {
  const tier = VEHICLE_TIERS[opts.vehicleType] ?? VEHICLE_TIERS.standard;
  const surgeMultiplier = opts.surge?.multiplier ?? 1;
  const trafficMult = opts.traffic ? TRAFFIC_MULTIPLIERS[opts.traffic.level] : 1;

  const distanceFare = round2(opts.distanceKm * tier.pricePerKm);
  const timeFare = round2(opts.durationMin * tier.pricePerMin * trafficMult);
  const baseFare = tier.baseFare;
  const rawPrice = baseFare + distanceFare + timeFare;
  const surgedPrice = round2(rawPrice * surgeMultiplier);
  const surgeFee = round2(surgedPrice - rawPrice);
  const tollFee = opts.tollFee ?? 0;
  const tip = opts.tip ?? 0;
  const discount = opts.discount ?? 0;
  const bookingFee = tier.bookingFee;

  const subtotal = round2(surgedPrice + bookingFee + tollFee);
  const totalPrice = round2(Math.max(tier.minFare, subtotal - discount + tip));

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeMultiplier,
    surgeFee,
    bookingFee,
    tollFee,
    tip,
    discount,
    subtotal,
    totalPrice,
    currency: opts.currency ?? "EUR",
    pricePerKm: tier.pricePerKm,
    pricePerMin: tier.pricePerMin,
    estimatedDistanceKm: opts.distanceKm,
    estimatedDurationMin: opts.durationMin,
  };
}

export function computeDeliveryPricing(opts: {
  category: DeliveryCategory;
  distanceKm: number;
  durationMin: number;
  weightKg?: number;
  rush?: boolean;
  surge?: SurgeZone;
  tip?: number;
  currency?: CurrencyCode;
}): DeliveryPricing {
  const cat = DELIVERY_CATEGORIES[opts.category] ?? DELIVERY_CATEGORIES.parcel;
  const surgeMultiplier = opts.surge?.multiplier ?? 1;
  const weight = opts.weightKg ?? 0;

  const distanceFee = round2(opts.distanceKm * cat.perKmRate);
  const weightFee = round2(weight * cat.weightMultiplier);
  const rushFee = opts.rush ? round2(cat.baseFee * 0.5) : 0;
  const rawPrice = cat.baseFee + distanceFee + weightFee + rushFee;
  const surgedPrice = round2(rawPrice * surgeMultiplier);
  const serviceFee = round2(surgedPrice * 0.10);
  const tip = opts.tip ?? 0;

  return {
    baseFee: cat.baseFee,
    distanceFee,
    weightFee,
    rushFee,
    surgeMultiplier,
    serviceFee,
    tip,
    totalPrice: round2(Math.max(cat.minFee, surgedPrice + serviceFee + tip)),
    currency: opts.currency ?? "EUR",
    estimatedDistanceKm: opts.distanceKm,
    estimatedDurationMin: opts.durationMin,
  };
}

export function estimateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return round2(R * c * 1.3);
}

export function estimateDuration(distanceKm: number, traffic: TrafficCondition["level"] = "moderate"): number {
  const avgSpeedKmH: Record<TrafficCondition["level"], number> = {
    low: 40,
    moderate: 30,
    heavy: 20,
    gridlock: 10,
  };
  return Math.ceil((distanceKm / avgSpeedKmH[traffic]) * 60);
}

export function getVehicleOptions(
  distanceKm: number,
  durationMin: number,
  surge?: SurgeZone,
  traffic?: TrafficCondition,
): Array<{
  type: VehicleType;
  label: string;
  price: RidePricing;
  etaMinutes: number;
  available: boolean;
}> {
  const types: VehicleType[] = ["moto", "standard", "premium", "xl", "electric", "van"];
  const baseEta = Math.max(3, Math.ceil(durationMin * 0.3));

  return types.map((type, i) => {
    const price = computeRidePricing({ vehicleType: type, distanceKm, durationMin, surge, traffic });
    return {
      type,
      label: VEHICLE_TIERS[type].label,
      price,
      etaMinutes: baseEta + i * 2,
      available: true,
    };
  });
}
