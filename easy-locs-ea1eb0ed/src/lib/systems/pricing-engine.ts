import { platformBus } from "@/lib/shared/platform-bus";

export interface PricingInput {
  basePrice: number;
  currency: string;
  vertical: string;
  country: string;
  sellerType: "particulier" | "professionnel";
  transactionType: "order" | "booking" | "reservation" | "service_request";
  quantity: number;
  deliveryRequired: boolean;
  deliveryDistanceKm?: number;
  couponCode?: string;
  loyaltyTier?: "bronze" | "silver" | "gold" | "platinum";
}

export interface PricingBreakdown {
  subtotal: number;
  marketplaceCommission: number;
  marketplaceCommissionRate: number;
  serviceFee: number;
  serviceFeeRate: number;
  deliveryFee: number;
  paymentProcessingFee: number;
  discount: number;
  discountSource: string | null;
  loyaltyDiscount: number;
  taxAmount: number;
  taxRate: number;
  grandTotal: number;
  sellerPayout: number;
  platformRevenue: number;
  currency: string;
}

export interface CommissionTable {
  vertical: string;
  sellerType: "particulier" | "professionnel";
  rate: number;
  minFee: number;
  maxFee: number | null;
  currency: string;
}

const COMMISSION_TABLE: CommissionTable[] = [
  { vertical: "food", sellerType: "professionnel", rate: 0.15, minFee: 2, maxFee: null, currency: "AED" },
  { vertical: "food", sellerType: "particulier", rate: 0.10, minFee: 1, maxFee: null, currency: "AED" },
  { vertical: "hotel", sellerType: "professionnel", rate: 0.12, minFee: 5, maxFee: null, currency: "AED" },
  { vertical: "services", sellerType: "professionnel", rate: 0.10, minFee: 3, maxFee: 200, currency: "AED" },
  { vertical: "services", sellerType: "particulier", rate: 0.08, minFee: 2, maxFee: 100, currency: "AED" },
  { vertical: "retail", sellerType: "professionnel", rate: 0.12, minFee: 1, maxFee: null, currency: "AED" },
  { vertical: "retail", sellerType: "particulier", rate: 0.05, minFee: 1, maxFee: 50, currency: "AED" },
  { vertical: "property", sellerType: "professionnel", rate: 0.05, minFee: 10, maxFee: 500, currency: "AED" },
  { vertical: "marketplace", sellerType: "particulier", rate: 0.08, minFee: 1, maxFee: null, currency: "AED" },
  { vertical: "events", sellerType: "professionnel", rate: 0.10, minFee: 5, maxFee: null, currency: "AED" },
];

const DELIVERY_FEE_TABLE: Record<string, { baseFee: number; perKm: number; minFee: number; maxFee: number }> = {
  food: { baseFee: 5, perKm: 1.5, minFee: 5, maxFee: 30 },
  retail: { baseFee: 8, perKm: 2, minFee: 8, maxFee: 50 },
  marketplace: { baseFee: 10, perKm: 2.5, minFee: 10, maxFee: 60 },
};

const SERVICE_FEE_RATE = 0.03;
const PAYMENT_PROCESSING_RATE = 0.025;

const TAX_RATES: Record<string, number> = {
  AE: 0.05,
  FR: 0.20,
  US: 0,
  GB: 0.20,
  DE: 0.19,
};

const LOYALTY_DISCOUNTS: Record<string, number> = {
  bronze: 0,
  silver: 0.02,
  gold: 0.05,
  platinum: 0.10,
};

export function getCommissionRate(vertical: string, sellerType: "particulier" | "professionnel"): CommissionTable | null {
  return COMMISSION_TABLE.find((c) => c.vertical === vertical && c.sellerType === sellerType) ?? null;
}

export function calculateDeliveryFee(vertical: string, distanceKm: number): number {
  const table = DELIVERY_FEE_TABLE[vertical];
  if (!table) return 0;
  const raw = table.baseFee + table.perKm * distanceKm;
  return Math.min(Math.max(raw, table.minFee), table.maxFee);
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const subtotal = input.basePrice * input.quantity;

  const commEntry = getCommissionRate(input.vertical, input.sellerType);
  let marketplaceCommission = 0;
  let marketplaceCommissionRate = 0;
  if (commEntry) {
    marketplaceCommissionRate = commEntry.rate;
    marketplaceCommission = Math.max(subtotal * commEntry.rate, commEntry.minFee);
    if (commEntry.maxFee !== null) {
      marketplaceCommission = Math.min(marketplaceCommission, commEntry.maxFee);
    }
  }

  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const serviceFeeRate = SERVICE_FEE_RATE;

  let deliveryFee = 0;
  if (input.deliveryRequired && input.deliveryDistanceKm !== undefined) {
    deliveryFee = calculateDeliveryFee(input.vertical, input.deliveryDistanceKm);
  }

  let loyaltyDiscount = 0;
  if (input.loyaltyTier) {
    loyaltyDiscount = subtotal * (LOYALTY_DISCOUNTS[input.loyaltyTier] ?? 0);
  }

  const discount = loyaltyDiscount;
  const discountSource = loyaltyDiscount > 0 ? `loyalty_${input.loyaltyTier}` : null;

  const taxableAmount = subtotal + serviceFee + deliveryFee - discount;
  const countryCode = input.country.toUpperCase().slice(0, 2);
  const taxRate = TAX_RATES[countryCode] ?? 0.05;
  const taxAmount = taxableAmount * taxRate;

  const grandTotal = taxableAmount + taxAmount;
  const paymentProcessingFee = grandTotal * PAYMENT_PROCESSING_RATE;
  const sellerPayout = subtotal - marketplaceCommission;
  const platformRevenue = marketplaceCommission + serviceFee + paymentProcessingFee;

  return {
    subtotal,
    marketplaceCommission,
    marketplaceCommissionRate,
    serviceFee,
    serviceFeeRate,
    deliveryFee,
    paymentProcessingFee,
    discount,
    discountSource,
    loyaltyDiscount,
    taxAmount,
    taxRate,
    grandTotal,
    sellerPayout,
    platformRevenue,
    currency: input.currency,
  };
}

export function calculateRefund(
  originalBreakdown: PricingBreakdown,
  refundType: "full" | "partial",
  refundAmount?: number
): { refundToCustomer: number; reverseCommission: number; reverseTax: number } {
  if (refundType === "full") {
    return {
      refundToCustomer: originalBreakdown.grandTotal,
      reverseCommission: originalBreakdown.marketplaceCommission,
      reverseTax: originalBreakdown.taxAmount,
    };
  }
  const ratio = (refundAmount ?? 0) / originalBreakdown.grandTotal;
  return {
    refundToCustomer: refundAmount ?? 0,
    reverseCommission: originalBreakdown.marketplaceCommission * ratio,
    reverseTax: originalBreakdown.taxAmount * ratio,
  };
}

export function emitPricingCalculated(transactionId: string, breakdown: PricingBreakdown): void {
  platformBus.emit("transaction:created", {
    transactionId,
    amount: breakdown.grandTotal,
    commission: breakdown.marketplaceCommission,
    currency: breakdown.currency,
    breakdown,
  }, "pricing-engine");
}
