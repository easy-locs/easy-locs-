import type {
  RevenueModule,
  RevenueStream,
  CommissionRule,
  ServiceFeeRule,
  WalletRevenueConfig,
  FlightRevenueConfig,
  HotelRevenueConfig,
  TaxiRevenueConfig,
  DeliveryRevenueConfig,
  MarketplaceRevenueConfig,
  SubscriptionPlan,
  SubscriptionTier,
  BoostPackage,
  PricingDecision,
  MarketTier,
} from "@/domains/revenue/revenue-types";
import type { CurrencyCode } from "@/domains/shared/canonical-types";
import { getCountryConfig } from "./country-pricing-strategy";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function ensurePositive(n: number): number {
  return Math.max(0, n);
}

const WALLET_CONFIG: WalletRevenueConfig = {
  transactionFeePercent: 0.015,
  transactionFeeFixed: 0.25,
  currencyConversionSpread: 0.025,
  topupFeePercent: 0.02,
  topupFeeFixed: 0.50,
  withdrawalFeePercent: 0.01,
  withdrawalFeeFixed: 1.00,
  internationalTransferFeePercent: 0.03,
  escrowFeePercent: 0.02,
};

const FLIGHT_CONFIG: FlightRevenueConfig = {
  bookingCommissionPercent: 0.06,
  priceMarginPercent: 0.03,
  serviceFeeFixed: 12.00,
  cancellationFeePercent: 0.10,
  changeFeeFixed: 25.00,
  insuranceCommissionPercent: 0.30,
  seatSelectionFee: 5.00,
  baggageFeeCommission: 0.15,
};

const HOTEL_CONFIG: HotelRevenueConfig = {
  bookingCommissionPercent: 0.12,
  serviceFeePercent: 0.08,
  serviceFeeFixed: 5.00,
  cancellationFeePercent: 0.15,
  lastMinuteMarginPercent: 0.05,
  loyaltyPointsValue: 0.01,
};

const TAXI_CONFIG: TaxiRevenueConfig = {
  rideCommissionPercent: 0.20,
  serviceFeeFixed: 1.50,
  surgeRevenueSharePercent: 0.25,
  cancellationFeeFixed: 3.00,
  waitTimeFeePerMin: 0.30,
  scheduledRidePremium: 2.00,
  premiumVehicleCommissionPercent: 0.25,
};

const DELIVERY_CONFIG: DeliveryRevenueConfig = {
  deliveryCommissionPercent: 0.25,
  serviceFeeFixed: 1.00,
  rushDeliveryPremiumPercent: 0.50,
  merchantCommissionPercent: 0.15,
  smallOrderFeeThreshold: 10.00,
  smallOrderFee: 2.00,
  longDistanceSurchargePerKm: 0.50,
  peakHourSurchargePercent: 0.20,
};

const MARKETPLACE_CONFIG: MarketplaceRevenueConfig = {
  saleCommissionPercent: 0.10,
  serviceFeePercent: 0.03,
  listingFeeFixed: 0,
  premiumListingFee: 5.00,
  promotedListingDailyFee: 3.00,
  featuredCategoryFee: 10.00,
  paymentProcessingPercent: 0.029,
  refundHandlingFee: 1.00,
};

const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: "free",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: "EUR",
    features: ["Basic listing", "5 products", "Standard support"],
    limits: { listings: 5, orders: 50, teamMembers: 1, storageGb: 1, apiCalls: 1000 },
    commissionDiscount: 0,
    boostCredits: 0,
  },
  starter: {
    tier: "starter",
    name: "Starter",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    currency: "EUR",
    features: ["25 listings", "Analytics", "Priority support", "Custom branding"],
    limits: { listings: 25, orders: 500, teamMembers: 2, storageGb: 5, apiCalls: 10000 },
    commissionDiscount: 0.10,
    boostCredits: 3,
  },
  pro: {
    tier: "pro",
    name: "Pro",
    monthlyPrice: 29.99,
    yearlyPrice: 299.99,
    currency: "EUR",
    features: ["Unlimited listings", "Advanced analytics", "API access", "Multi-store", "Boost credits"],
    limits: { listings: -1, orders: 5000, teamMembers: 5, storageGb: 25, apiCalls: 100000 },
    commissionDiscount: 0.20,
    boostCredits: 10,
  },
  business: {
    tier: "business",
    name: "Business",
    monthlyPrice: 79.99,
    yearlyPrice: 799.99,
    currency: "EUR",
    features: ["Everything in Pro", "Dedicated account manager", "Custom integrations", "SLA guarantee", "Bulk boost"],
    limits: { listings: -1, orders: -1, teamMembers: 25, storageGb: 100, apiCalls: 1000000 },
    commissionDiscount: 0.30,
    boostCredits: 30,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPrice: 249.99,
    yearlyPrice: 2499.99,
    currency: "EUR",
    features: ["Everything in Business", "White-label", "Dedicated infrastructure", "24/7 support", "Custom pricing"],
    limits: { listings: -1, orders: -1, teamMembers: -1, storageGb: -1, apiCalls: -1 },
    commissionDiscount: 0.50,
    boostCredits: 100,
  },
};

const BOOST_PACKAGES: BoostPackage[] = [
  { id: "boost_24h", name: "Quick Boost", durationDays: 1, price: 4.99, currency: "EUR", impressionMultiplier: 2, positionBoost: 5, badgeType: "promoted", applicableModules: ["marketplace", "services"] },
  { id: "boost_7d", name: "Weekly Spotlight", durationDays: 7, price: 19.99, currency: "EUR", impressionMultiplier: 3, positionBoost: 10, badgeType: "featured", applicableModules: ["marketplace", "services", "property"] },
  { id: "boost_30d", name: "Monthly Premium", durationDays: 30, price: 49.99, currency: "EUR", impressionMultiplier: 5, positionBoost: 20, badgeType: "premium", applicableModules: ["marketplace", "services", "property", "hotel"] },
  { id: "boost_sponsored", name: "Sponsored Listing", durationDays: 14, price: 34.99, currency: "EUR", impressionMultiplier: 4, positionBoost: 15, badgeType: "sponsored", applicableModules: ["marketplace", "services", "delivery"] },
];

export function computeWalletFees(opts: {
  type: "transaction" | "topup" | "withdrawal" | "conversion" | "international" | "escrow";
  amount: number;
  country?: string;
}): { fee: number; rate: number; breakdown: Record<string, number> } {
  const amount = ensurePositive(opts.amount);
  const adj = opts.country ? getCountryConfig(opts.country).feeAdjustment : 1;
  const cfg = WALLET_CONFIG;
  let fee = 0;
  const breakdown: Record<string, number> = {};

  switch (opts.type) {
    case "transaction": {
      const pctFee = round2(amount * cfg.transactionFeePercent * adj);
      fee = round2(pctFee + cfg.transactionFeeFixed * adj);
      breakdown.percentageFee = pctFee;
      breakdown.fixedFee = round2(cfg.transactionFeeFixed * adj);
      break;
    }
    case "topup": {
      const pctFee = round2(amount * cfg.topupFeePercent * adj);
      fee = round2(pctFee + cfg.topupFeeFixed * adj);
      breakdown.percentageFee = pctFee;
      breakdown.fixedFee = round2(cfg.topupFeeFixed * adj);
      break;
    }
    case "withdrawal": {
      const pctFee = round2(amount * cfg.withdrawalFeePercent * adj);
      fee = round2(pctFee + cfg.withdrawalFeeFixed * adj);
      breakdown.percentageFee = pctFee;
      breakdown.fixedFee = round2(cfg.withdrawalFeeFixed * adj);
      break;
    }
    case "conversion": {
      fee = round2(amount * cfg.currencyConversionSpread * adj);
      breakdown.conversionSpread = fee;
      break;
    }
    case "international": {
      fee = round2(amount * cfg.internationalTransferFeePercent * adj);
      breakdown.internationalFee = fee;
      break;
    }
    case "escrow": {
      fee = round2(amount * cfg.escrowFeePercent * adj);
      breakdown.escrowFee = fee;
      break;
    }
  }

  return { fee, rate: amount > 0 ? round2(fee / amount) : 0, breakdown };
}

export function computeFlightRevenue(opts: {
  bookingAmount: number;
  ancillaries?: { insurance?: number; seatSelection?: number; extraBaggage?: number };
  cancellation?: boolean;
  change?: boolean;
  country?: string;
}): PricingDecision {
  const bookingAmount = ensurePositive(opts.bookingAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;
  const cfg = FLIGHT_CONFIG;

  const commission = round2(bookingAmount * cfg.bookingCommissionPercent * commAdj);
  const margin = round2(bookingAmount * cfg.priceMarginPercent);
  const serviceFee = round2(cfg.serviceFeeFixed * (adj?.feeAdjustment ?? 1));

  let total = commission + margin + serviceFee;
  const breakdown: Record<string, number> = { commission, margin, serviceFee };

  if (opts.ancillaries?.insurance) {
    const ins = round2(opts.ancillaries.insurance * cfg.insuranceCommissionPercent);
    breakdown.insuranceCommission = ins;
    total += ins;
  }
  if (opts.ancillaries?.seatSelection) {
    breakdown.seatSelectionFee = cfg.seatSelectionFee;
    total += cfg.seatSelectionFee;
  }
  if (opts.ancillaries?.extraBaggage) {
    const bag = round2(opts.ancillaries.extraBaggage * cfg.baggageFeeCommission);
    breakdown.baggageCommission = bag;
    total += bag;
  }
  if (opts.cancellation) {
    const cancelFee = round2(bookingAmount * cfg.cancellationFeePercent);
    breakdown.cancellationFee = cancelFee;
    total += cancelFee;
  }
  if (opts.change) {
    breakdown.changeFee = cfg.changeFeeFixed;
    total += cfg.changeFeeFixed;
  }

  return {
    module: "flight",
    stream: "booking_commission",
    baseAmount: bookingAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeHotelRevenue(opts: {
  bookingAmount: number;
  nights: number;
  lastMinute?: boolean;
  cancellation?: boolean;
  country?: string;
}): PricingDecision {
  const bookingAmount = ensurePositive(opts.bookingAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;
  const cfg = HOTEL_CONFIG;

  const commission = round2(bookingAmount * cfg.bookingCommissionPercent * commAdj);
  const serviceFee = round2(bookingAmount * cfg.serviceFeePercent + cfg.serviceFeeFixed * (adj?.feeAdjustment ?? 1));

  let total = commission + serviceFee;
  const breakdown: Record<string, number> = { commission, serviceFee };

  if (opts.lastMinute) {
    const lastMinuteMargin = round2(bookingAmount * cfg.lastMinuteMarginPercent);
    breakdown.lastMinuteMargin = lastMinuteMargin;
    total += lastMinuteMargin;
  }
  if (opts.cancellation) {
    const cancelFee = round2(bookingAmount * cfg.cancellationFeePercent);
    breakdown.cancellationFee = cancelFee;
    total += cancelFee;
  }

  return {
    module: "hotel",
    stream: "booking_commission",
    baseAmount: bookingAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeTaxiRevenue(opts: {
  fareAmount: number;
  surgeAmount?: number;
  waitMinutes?: number;
  scheduled?: boolean;
  premium?: boolean;
  cancellation?: boolean;
  country?: string;
}): PricingDecision {
  const fareAmount = ensurePositive(opts.fareAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;
  const cfg = TAXI_CONFIG;

  const commRate = opts.premium ? cfg.premiumVehicleCommissionPercent : cfg.rideCommissionPercent;
  const commission = round2(fareAmount * commRate * commAdj);
  const serviceFee = round2(cfg.serviceFeeFixed * (adj?.feeAdjustment ?? 1));

  let total = commission + serviceFee;
  const breakdown: Record<string, number> = { commission, serviceFee };

  if (opts.surgeAmount && opts.surgeAmount > 0) {
    const surgeShare = round2(opts.surgeAmount * cfg.surgeRevenueSharePercent);
    breakdown.surgeRevenue = surgeShare;
    total += surgeShare;
  }
  if (opts.waitMinutes && opts.waitMinutes > 0) {
    const waitFee = round2(opts.waitMinutes * cfg.waitTimeFeePerMin);
    breakdown.waitFee = waitFee;
    total += waitFee;
  }
  if (opts.scheduled) {
    breakdown.scheduledPremium = cfg.scheduledRidePremium;
    total += cfg.scheduledRidePremium;
  }
  if (opts.cancellation) {
    breakdown.cancellationFee = cfg.cancellationFeeFixed;
    total += cfg.cancellationFeeFixed;
  }

  return {
    module: "taxi",
    stream: "ride_commission",
    baseAmount: fareAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeDeliveryRevenue(opts: {
  deliveryFee: number;
  orderValue: number;
  distanceKm: number;
  rushDelivery?: boolean;
  peakHour?: boolean;
  country?: string;
}): PricingDecision {
  const deliveryFee = ensurePositive(opts.deliveryFee);
  const orderValue = ensurePositive(opts.orderValue);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;
  const cfg = DELIVERY_CONFIG;

  const deliveryCommission = round2(deliveryFee * cfg.deliveryCommissionPercent * commAdj);
  const merchantCommission = round2(orderValue * cfg.merchantCommissionPercent * commAdj);
  const serviceFee = round2(cfg.serviceFeeFixed * (adj?.feeAdjustment ?? 1));

  let total = deliveryCommission + merchantCommission + serviceFee;
  const breakdown: Record<string, number> = { deliveryCommission, merchantCommission, serviceFee };

  if (orderValue < cfg.smallOrderFeeThreshold) {
    breakdown.smallOrderFee = cfg.smallOrderFee;
    total += cfg.smallOrderFee;
  }
  if (opts.rushDelivery) {
    const rushFee = round2(deliveryFee * cfg.rushDeliveryPremiumPercent);
    breakdown.rushPremium = rushFee;
    total += rushFee;
  }
  if (opts.peakHour) {
    const peakFee = round2(deliveryFee * cfg.peakHourSurchargePercent);
    breakdown.peakSurcharge = peakFee;
    total += peakFee;
  }
  if (opts.distanceKm > 5) {
    const distSurcharge = round2((opts.distanceKm - 5) * cfg.longDistanceSurchargePerKm);
    breakdown.longDistanceSurcharge = distSurcharge;
    total += distSurcharge;
  }

  return {
    module: "delivery",
    stream: "delivery_commission",
    baseAmount: deliveryFee + orderValue,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeMarketplaceRevenue(opts: {
  saleAmount: number;
  promoted?: boolean;
  premiumListing?: boolean;
  refund?: boolean;
  country?: string;
}): PricingDecision {
  const saleAmount = ensurePositive(opts.saleAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;
  const cfg = MARKETPLACE_CONFIG;

  const saleCommission = round2(saleAmount * cfg.saleCommissionPercent * commAdj);
  const serviceFee = round2(saleAmount * cfg.serviceFeePercent);
  const paymentFee = round2(saleAmount * cfg.paymentProcessingPercent);

  let total = saleCommission + serviceFee + paymentFee;
  const breakdown: Record<string, number> = { saleCommission, serviceFee, paymentFee };

  if (opts.promoted) {
    breakdown.promotedListingFee = cfg.promotedListingDailyFee;
    total += cfg.promotedListingDailyFee;
  }
  if (opts.premiumListing) {
    breakdown.premiumListingFee = cfg.premiumListingFee;
    total += cfg.premiumListingFee;
  }
  if (opts.refund) {
    breakdown.refundHandlingFee = cfg.refundHandlingFee;
    total += cfg.refundHandlingFee;
  }

  return {
    module: "marketplace",
    stream: "marketplace_commission",
    baseAmount: saleAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function getSubscriptionPlan(tier: SubscriptionTier, country?: string): SubscriptionPlan {
  const plan = { ...SUBSCRIPTION_PLANS[tier] };
  if (country) {
    const cfg = getCountryConfig(country);
    plan.monthlyPrice = round2(plan.monthlyPrice * cfg.feeAdjustment);
    plan.yearlyPrice = round2(plan.yearlyPrice * cfg.feeAdjustment);
    plan.currency = cfg.currency;
  }
  return plan;
}

export function getAllSubscriptionPlans(country?: string): SubscriptionPlan[] {
  const tiers: SubscriptionTier[] = ["free", "starter", "pro", "business", "enterprise"];
  return tiers.map(t => getSubscriptionPlan(t, country));
}

export function getBoostPackages(module?: RevenueModule, country?: string): BoostPackage[] {
  let packages = [...BOOST_PACKAGES];
  if (module) {
    packages = packages.filter(p => p.applicableModules.includes(module));
  }
  if (country) {
    const cfg = getCountryConfig(country);
    packages = packages.map(p => ({
      ...p,
      price: round2(p.price * cfg.feeAdjustment),
      currency: cfg.currency,
    }));
  }
  return packages;
}

export function computeSubscriptionRevenue(
  tier: SubscriptionTier,
  billingCycle: "monthly" | "yearly",
  country?: string,
): number {
  const plan = getSubscriptionPlan(tier, country);
  return billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function applyLoyaltyDiscount(
  decision: PricingDecision,
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum",
): PricingDecision {
  const discounts: Record<string, number> = { bronze: 0, silver: 0.05, gold: 0.10, platinum: 0.15 };
  const discount = discounts[loyaltyTier] ?? 0;
  if (discount === 0) return decision;

  const loyaltyDiscount = round2(decision.adjustedAmount * discount);
  return {
    ...decision,
    adjustedAmount: round2(decision.adjustedAmount - loyaltyDiscount),
    adjustmentFactors: { ...decision.adjustmentFactors, loyalty: 1 - discount },
    breakdown: { ...decision.breakdown, loyaltyDiscount },
  };
}

export const COMMISSION_RULES: CommissionRule[] = [
  { module: "flight", stream: "booking_commission", baseRate: 0.06, minRate: 0.04, maxRate: 0.10, description: "Flight booking commission", appliesTo: "booking_amount" },
  { module: "hotel", stream: "booking_commission", baseRate: 0.12, minRate: 0.08, maxRate: 0.18, description: "Hotel booking commission", appliesTo: "booking_amount" },
  { module: "taxi", stream: "ride_commission", baseRate: 0.20, minRate: 0.15, maxRate: 0.25, description: "Taxi ride commission", appliesTo: "fare_amount" },
  { module: "delivery", stream: "delivery_commission", baseRate: 0.25, minRate: 0.18, maxRate: 0.30, description: "Delivery commission", appliesTo: "delivery_fee" },
  { module: "delivery", stream: "commission", baseRate: 0.15, minRate: 0.10, maxRate: 0.20, description: "Merchant commission on order value", appliesTo: "order_value" },
  { module: "marketplace", stream: "marketplace_commission", baseRate: 0.10, minRate: 0.05, maxRate: 0.15, description: "Marketplace sale commission", appliesTo: "sale_amount" },
  { module: "services", stream: "commission", baseRate: 0.10, minRate: 0.05, maxRate: 0.15, description: "Service booking commission", appliesTo: "booking_amount" },
  { module: "property", stream: "booking_commission", baseRate: 0.05, minRate: 0.03, maxRate: 0.08, description: "Property rental commission", appliesTo: "rental_amount" },
  { module: "wallet", stream: "transaction_fee", baseRate: 0.015, minRate: 0.005, maxRate: 0.03, description: "Wallet transaction fee", appliesTo: "transaction_amount" },
  { module: "advertising", stream: "boost", baseRate: 1.0, minRate: 1.0, maxRate: 1.0, description: "Boost/sponsored listing fee (100% revenue)", appliesTo: "package_price" },
];

export function computePropertyRevenue(opts: {
  rentalAmount: number;
  shortTerm?: boolean;
  cancellation?: boolean;
  country?: string;
}): PricingDecision {
  const rentalAmount = ensurePositive(opts.rentalAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;

  const commRate = opts.shortTerm ? 0.08 : 0.05;
  const commission = round2(rentalAmount * commRate * commAdj);
  const serviceFee = round2(rentalAmount * 0.05);

  let total = commission + serviceFee;
  const breakdown: Record<string, number> = { commission, serviceFee };

  if (opts.cancellation) {
    const cancelFee = round2(rentalAmount * 0.10);
    breakdown.cancellationFee = cancelFee;
    total += cancelFee;
  }

  return {
    module: "property",
    stream: "booking_commission",
    baseAmount: rentalAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeServicesRevenue(opts: {
  bookingAmount: number;
  cancellation?: boolean;
  country?: string;
}): PricingDecision {
  const bookingAmount = ensurePositive(opts.bookingAmount);
  const adj = opts.country ? getCountryConfig(opts.country) : null;
  const commAdj = adj?.commissionAdjustment ?? 1;

  const commission = round2(bookingAmount * 0.10 * commAdj);
  const serviceFee = round2(bookingAmount * 0.03);
  const paymentFee = round2(bookingAmount * 0.029);

  let total = commission + serviceFee + paymentFee;
  const breakdown: Record<string, number> = { commission, serviceFee, paymentFee };

  if (opts.cancellation) {
    const cancelFee = round2(bookingAmount * 0.05);
    breakdown.cancellationFee = cancelFee;
    total += cancelFee;
  }

  return {
    module: "services",
    stream: "commission",
    baseAmount: bookingAmount,
    adjustedAmount: round2(total),
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: commAdj, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function computeAdvertisingRevenue(opts: {
  packagePrice: number;
  impressions?: number;
  clicks?: number;
  country?: string;
}): PricingDecision {
  const packagePrice = ensurePositive(opts.packagePrice);
  const adj = opts.country ? getCountryConfig(opts.country) : null;

  const revenue = round2(packagePrice);
  const breakdown: Record<string, number> = { packageRevenue: revenue };

  if (opts.impressions && opts.impressions > 0) {
    breakdown.estimatedCPM = round2(revenue / (opts.impressions / 1000));
  }
  if (opts.clicks && opts.clicks > 0) {
    breakdown.estimatedCPC = round2(revenue / opts.clicks);
  }

  return {
    module: "advertising",
    stream: "boost",
    baseAmount: packagePrice,
    adjustedAmount: revenue,
    country: opts.country ?? "unknown",
    currency: adj?.currency ?? "EUR",
    marketTier: adj?.marketTier ?? "mature",
    adjustmentFactors: { purchasingPower: 1, competition: 1, demand: 1, loyalty: 1 },
    breakdown,
  };
}

export function getModuleConfig(module: RevenueModule) {
  switch (module) {
    case "wallet": return WALLET_CONFIG;
    case "flight": return FLIGHT_CONFIG;
    case "hotel": return HOTEL_CONFIG;
    case "taxi": return TAXI_CONFIG;
    case "delivery": return DELIVERY_CONFIG;
    case "marketplace": return MARKETPLACE_CONFIG;
    default: return null;
  }
}
