/**
 * Fare Engine — Foundation for taxi & delivery pricing.
 * Country/city configurable, supports surge/night multipliers.
 */

export interface FareRules {
  baseFare: number;
  perKmRate: number;
  perMinRate: number;
  minFare: number;
  nightMultiplier: number;     // e.g. 1.3 for 30% surcharge
  demandMultiplier: number;    // dynamic surge, 1.0 = no surge
  platformFeePercent: number;  // e.g. 15
  currency: string;
}

export interface FareEstimate {
  baseFare: number;
  distanceFee: number;
  timeFee: number;
  subtotal: number;
  nightSurcharge: number;
  surgeSurcharge: number;
  platformFee: number;
  total: number;
  currency: string;
  breakdown: string;
  isNight: boolean;
  isSurge: boolean;
}

/* ═══ Default Rules by Country ═══ */
const DEFAULT_RULES: Record<string, Partial<FareRules>> = {
  FR: { baseFare: 2.50, perKmRate: 1.20, perMinRate: 0.35, minFare: 5.00, currency: "EUR" },
  AE: { baseFare: 5.00, perKmRate: 1.80, perMinRate: 0.50, minFare: 12.00, currency: "AED" },
  MA: { baseFare: 5.00, perKmRate: 3.50, perMinRate: 0.80, minFare: 10.00, currency: "MAD" },
  US: { baseFare: 2.50, perKmRate: 1.50, perMinRate: 0.25, minFare: 7.00, currency: "USD" },
  GB: { baseFare: 3.00, perKmRate: 1.40, perMinRate: 0.30, minFare: 6.00, currency: "GBP" },
  DE: { baseFare: 3.50, perKmRate: 1.80, perMinRate: 0.40, minFare: 6.00, currency: "EUR" },
  SA: { baseFare: 5.00, perKmRate: 1.60, perMinRate: 0.45, minFare: 10.00, currency: "SAR" },
  JP: { baseFare: 410, perKmRate: 80, perMinRate: 20, minFare: 500, currency: "JPY" },
};

const FALLBACK: FareRules = {
  baseFare: 3.00,
  perKmRate: 1.50,
  perMinRate: 0.30,
  minFare: 5.00,
  nightMultiplier: 1.3,
  demandMultiplier: 1.0,
  platformFeePercent: 15,
  currency: "EUR",
};

export function getFareRules(countryCode?: string, overrides?: Partial<FareRules>): FareRules {
  const country = countryCode?.toUpperCase() || "FR";
  const countryRules = DEFAULT_RULES[country] || {};
  return { ...FALLBACK, ...countryRules, ...overrides };
}

/** Check if current hour is "night" (22h–6h) */
export function isNightHour(timezone?: string): boolean {
  try {
    const h = parseInt(new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: timezone }).format(new Date()));
    return h >= 22 || h < 6;
  } catch {
    const h = new Date().getHours();
    return h >= 22 || h < 6;
  }
}

/**
 * Calculate fare estimate.
 */
export function calculateFare(opts: {
  distanceKm: number;
  durationMin: number;
  rules: FareRules;
  isNight?: boolean;
  surgeFactor?: number;
}): FareEstimate {
  const { distanceKm, durationMin, rules } = opts;
  const night = opts.isNight ?? false;
  const surge = opts.surgeFactor ?? rules.demandMultiplier;

  const distanceFee = distanceKm * rules.perKmRate;
  const timeFee = durationMin * rules.perMinRate;
  let subtotal = rules.baseFare + distanceFee + timeFee;

  let nightSurcharge = 0;
  if (night && rules.nightMultiplier > 1) {
    nightSurcharge = subtotal * (rules.nightMultiplier - 1);
  }

  let surgeSurcharge = 0;
  if (surge > 1) {
    surgeSurcharge = (subtotal + nightSurcharge) * (surge - 1);
  }

  const preTotal = subtotal + nightSurcharge + surgeSurcharge;
  const platformFee = preTotal * (rules.platformFeePercent / 100);
  let total = preTotal + platformFee;

  // Enforce minimum
  if (total < rules.minFare) total = rules.minFare;

  const r = (n: number) => Math.round(n * 100) / 100;

  return {
    baseFare: r(rules.baseFare),
    distanceFee: r(distanceFee),
    timeFee: r(timeFee),
    subtotal: r(subtotal),
    nightSurcharge: r(nightSurcharge),
    surgeSurcharge: r(surgeSurcharge),
    platformFee: r(platformFee),
    total: r(total),
    currency: rules.currency,
    isNight: night,
    isSurge: surge > 1,
    breakdown: `Base ${r(rules.baseFare)} + ${distanceKm.toFixed(1)}km × ${rules.perKmRate} + ${durationMin}min × ${rules.perMinRate}${night ? ` + night ×${rules.nightMultiplier}` : ""}${surge > 1 ? ` + surge ×${surge.toFixed(1)}` : ""}`,
  };
}

/**
 * Quick estimate for delivery (simpler: no time fee, uses delivery-pricing logic merged with fare engine)
 */
export function calculateDeliveryFare(opts: {
  distanceKm: number;
  weightKg?: number;
  rules: FareRules;
  isNight?: boolean;
}): FareEstimate {
  const weightMultiplier = !opts.weightKg || opts.weightKg <= 5 ? 0.8 : opts.weightKg <= 20 ? 1.0 : 1.5;
  return calculateFare({
    distanceKm: opts.distanceKm,
    durationMin: 0, // delivery doesn't charge per-minute
    rules: { ...opts.rules, perMinRate: 0, baseFare: opts.rules.baseFare * weightMultiplier },
    isNight: opts.isNight,
  });
}
