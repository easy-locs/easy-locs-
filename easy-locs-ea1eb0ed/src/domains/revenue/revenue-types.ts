import type { CurrencyCode } from "@/domains/shared/canonical-types";

export type RevenueModule =
  | "wallet"
  | "flight"
  | "hotel"
  | "property"
  | "taxi"
  | "delivery"
  | "marketplace"
  | "services"
  | "orbit"
  | "advertising"
  | "subscription";

export type RevenueStream =
  | "commission"
  | "service_fee"
  | "transaction_fee"
  | "subscription"
  | "boost"
  | "listing_fee"
  | "wallet_fee"
  | "delivery_fee"
  | "escrow_fee"
  | "booking_commission"
  | "price_margin"
  | "ride_commission"
  | "delivery_commission"
  | "marketplace_commission"
  | "currency_conversion_fee"
  | "topup_fee"
  | "withdrawal_fee"
  | "promoted_listing_fee"
  | "premium_feature_fee"
  | "insurance_fee"
  | "cancellation_fee";

export type SubscriptionTier = "free" | "starter" | "pro" | "business" | "enterprise";

export type MarketTier = "emerging" | "developing" | "mature" | "premium";

export interface RevenueEvent {
  id: string;
  module: RevenueModule;
  stream: RevenueStream;
  amount: number;
  currency: CurrencyCode;
  originalAmount: number;
  originalCurrency: CurrencyCode;
  userId: string;
  merchantId?: string;
  entityId: string;
  entityType: string;
  country: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CommissionRule {
  module: RevenueModule;
  stream: RevenueStream;
  baseRate: number;
  minRate: number;
  maxRate: number;
  description: string;
  appliesTo: string;
}

export interface ServiceFeeRule {
  module: RevenueModule;
  fixedFee: number;
  percentageFee: number;
  minFee: number;
  maxFee: number;
  currency: CurrencyCode;
  description: string;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: CurrencyCode;
  features: string[];
  limits: {
    listings: number;
    orders: number;
    teamMembers: number;
    storageGb: number;
    apiCalls: number;
  };
  commissionDiscount: number;
  boostCredits: number;
}

export interface BoostPackage {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  currency: CurrencyCode;
  impressionMultiplier: number;
  positionBoost: number;
  badgeType: "featured" | "promoted" | "sponsored" | "premium";
  applicableModules: RevenueModule[];
}

export interface CountryPricingConfig {
  country: string;
  countryName: string;
  currency: CurrencyCode;
  marketTier: MarketTier;
  purchasingPowerIndex: number;
  commissionAdjustment: number;
  feeAdjustment: number;
  minTransactionAmount: number;
  taxRate: number;
  paymentProcessingRate: number;
  currencyConversionSpread: number;
  topupFeePercent: number;
  withdrawalFeePercent: number;
}

export interface WalletRevenueConfig {
  transactionFeePercent: number;
  transactionFeeFixed: number;
  currencyConversionSpread: number;
  topupFeePercent: number;
  topupFeeFixed: number;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
  internationalTransferFeePercent: number;
  escrowFeePercent: number;
}

export interface FlightRevenueConfig {
  bookingCommissionPercent: number;
  priceMarginPercent: number;
  serviceFeeFixed: number;
  cancellationFeePercent: number;
  changeFeeFixed: number;
  insuranceCommissionPercent: number;
  seatSelectionFee: number;
  baggageFeeCommission: number;
}

export interface HotelRevenueConfig {
  bookingCommissionPercent: number;
  serviceFeePercent: number;
  serviceFeeFixed: number;
  cancellationFeePercent: number;
  lastMinuteMarginPercent: number;
  loyaltyPointsValue: number;
}

export interface TaxiRevenueConfig {
  rideCommissionPercent: number;
  serviceFeeFixed: number;
  surgeRevenueSharePercent: number;
  cancellationFeeFixed: number;
  waitTimeFeePerMin: number;
  scheduledRidePremium: number;
  premiumVehicleCommissionPercent: number;
}

export interface DeliveryRevenueConfig {
  deliveryCommissionPercent: number;
  serviceFeeFixed: number;
  rushDeliveryPremiumPercent: number;
  merchantCommissionPercent: number;
  smallOrderFeeThreshold: number;
  smallOrderFee: number;
  longDistanceSurchargePerKm: number;
  peakHourSurchargePercent: number;
}

export interface MarketplaceRevenueConfig {
  saleCommissionPercent: number;
  serviceFeePercent: number;
  listingFeeFixed: number;
  premiumListingFee: number;
  promotedListingDailyFee: number;
  featuredCategoryFee: number;
  paymentProcessingPercent: number;
  refundHandlingFee: number;
}

export interface ModuleRevenueBreakdown {
  module: RevenueModule;
  totalRevenue: number;
  revenueByStream: Partial<Record<RevenueStream, number>>;
  transactionCount: number;
  avgRevenuePerTransaction: number;
  growthPercent: number;
  projectedMonthlyRevenue: number;
  currency: CurrencyCode;
}

export interface GlobalRevenueSnapshot {
  totalRevenue: number;
  totalTransactions: number;
  avgRevenuePerUser: number;
  currency: CurrencyCode;
  period: string;
  byModule: ModuleRevenueBreakdown[];
  byCountry: Array<{
    country: string;
    revenue: number;
    transactions: number;
    currency: CurrencyCode;
  }>;
  topStreams: Array<{
    stream: RevenueStream;
    revenue: number;
    share: number;
  }>;
  conversionRate: number;
  userLTV: number;
  roi: number;
}

export interface PricingDecision {
  module: RevenueModule;
  stream: RevenueStream;
  baseAmount: number;
  adjustedAmount: number;
  country: string;
  currency: CurrencyCode;
  marketTier: MarketTier;
  adjustmentFactors: {
    purchasingPower: number;
    competition: number;
    demand: number;
    loyalty: number;
  };
  breakdown: Record<string, number>;
}
