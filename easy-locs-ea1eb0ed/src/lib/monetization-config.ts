export type RevenueStream =
  | "transaction_fee"
  | "subscription"
  | "commission"
  | "boost"
  | "listing_fee"
  | "wallet_fee"
  | "delivery_fee"
  | "escrow_fee"
  | "booking_commission"
  | "price_margin"
  | "service_fee"
  | "ride_commission"
  | "delivery_commission"
  | "marketplace_commission"
  | "currency_conversion_fee"
  | "topup_fee"
  | "withdrawal_fee"
  | "premium_feature_fee"
  | "cancellation_fee"
  | "insurance_fee"
  | "promoted_listing_fee";

export const REVENUE_STREAMS: Array<{ stream: RevenueStream; label: string; description: string }> = [
  { stream: "transaction_fee", label: "Transaction Fees", description: "Marketplace, services, payments" },
  { stream: "subscription", label: "Subscriptions", description: "Starter / Pro / Business / Enterprise tiers" },
  { stream: "commission", label: "Commissions", description: "Per-order service fees" },
  { stream: "booking_commission", label: "Booking Commissions", description: "Flight, hotel, property bookings" },
  { stream: "ride_commission", label: "Ride Commissions", description: "Taxi ride commission (20%)" },
  { stream: "delivery_commission", label: "Delivery Commissions", description: "Delivery fee + merchant commission" },
  { stream: "marketplace_commission", label: "Marketplace Commission", description: "Sale commission (10%)" },
  { stream: "service_fee", label: "Service Fees", description: "Per-transaction fixed fees" },
  { stream: "price_margin", label: "Price Margins", description: "Markup on flight/hotel pricing" },
  { stream: "boost", label: "Boost Campaigns", description: "Featured listings & visibility" },
  { stream: "promoted_listing_fee", label: "Promoted Listings", description: "Sponsored shop placement" },
  { stream: "listing_fee", label: "Listing Fees", description: "Premium listing placement" },
  { stream: "wallet_fee", label: "Wallet Fees", description: "Transfer & conversion fees" },
  { stream: "currency_conversion_fee", label: "Currency Conversion", description: "FX spread on conversions (2.5%)" },
  { stream: "topup_fee", label: "Top-Up Fees", description: "Wallet top-up processing fee" },
  { stream: "withdrawal_fee", label: "Withdrawal Fees", description: "Wallet withdrawal processing fee" },
  { stream: "delivery_fee", label: "Delivery Fees", description: "Logistics & last-mile" },
  { stream: "escrow_fee", label: "Escrow Fees", description: "Secure payment holding" },
  { stream: "cancellation_fee", label: "Cancellation Fees", description: "Booking/ride cancellation charges" },
  { stream: "insurance_fee", label: "Insurance Fees", description: "Travel insurance commission" },
  { stream: "premium_feature_fee", label: "Premium Features", description: "Advanced tools & analytics" },
];

export const COMMISSION_RATES: Record<string, number> = {
  marketplace_order: 0.10,
  food_delivery: 0.25,
  grocery_delivery: 0.20,
  parcel_delivery: 0.25,
  service_booking: 0.10,
  property_rental: 0.05,
  property_sale: 0.03,
  flight_booking: 0.06,
  hotel_booking: 0.12,
  taxi_ride: 0.20,
  taxi_ride_premium: 0.25,
  wallet_transfer: 0.015,
  wallet_conversion: 0.025,
  wallet_topup: 0.02,
  wallet_withdrawal: 0.01,
  boost_campaign: 1.0,
  subscription: 1.0,
  merchant_order: 0.15,
};

export const COMMISSION_DISPLAY: Array<{ type: string; label: string; rate: string }> = [
  { type: "marketplace_order", label: "Marketplace Orders", rate: "10%" },
  { type: "food_delivery", label: "Food Delivery", rate: "25%" },
  { type: "grocery_delivery", label: "Grocery Delivery", rate: "20%" },
  { type: "service_booking", label: "Service Bookings", rate: "10%" },
  { type: "property_rental", label: "Property Rentals", rate: "5%" },
  { type: "flight_booking", label: "Flight Bookings", rate: "6%" },
  { type: "hotel_booking", label: "Hotel Bookings", rate: "12%" },
  { type: "taxi_ride", label: "Taxi Rides", rate: "20%" },
  { type: "taxi_ride_premium", label: "Premium Rides", rate: "25%" },
  { type: "wallet_transfer", label: "Wallet Transfers", rate: "1.5%" },
  { type: "wallet_conversion", label: "Currency Conversion", rate: "2.5%" },
  { type: "merchant_order", label: "Merchant Orders", rate: "15%" },
];

export function calculateCommission(orderType: string, amount: number): number {
  const safeAmount = Math.max(0, amount);
  const rate = COMMISSION_RATES[orderType] ?? 0.05;
  return Math.round(safeAmount * rate * 100) / 100;
}
