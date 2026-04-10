export type RevenueStream =
  | "transaction_fee"
  | "subscription"
  | "commission"
  | "boost"
  | "listing_fee"
  | "wallet_fee"
  | "delivery_fee"
  | "escrow_fee";

export const REVENUE_STREAMS: Array<{ stream: RevenueStream; label: string; description: string }> = [
  { stream: "transaction_fee", label: "Transaction Fees", description: "Marketplace, services, payments" },
  { stream: "subscription", label: "Subscriptions", description: "Solo / Team / Company tiers" },
  { stream: "commission", label: "Commissions", description: "Per-order service fees" },
  { stream: "boost", label: "Boost Campaigns", description: "Featured listings & visibility" },
  { stream: "listing_fee", label: "Listing Fees", description: "Premium listing placement" },
  { stream: "wallet_fee", label: "Wallet Fees", description: "Transfer & conversion fees" },
  { stream: "delivery_fee", label: "Delivery Fees", description: "Logistics & last-mile" },
  { stream: "escrow_fee", label: "Escrow Fees", description: "Secure payment holding" },
];

export const COMMISSION_RATES: Record<string, number> = {
  marketplace_order: 0.08,
  food_delivery: 0.15,
  service_booking: 0.10,
  property_rental: 0.05,
  wallet_transfer: 0.005,
  boost_campaign: 0.0,
  subscription: 0.0,
};

export const COMMISSION_DISPLAY: Array<{ type: string; label: string; rate: string }> = [
  { type: "marketplace_order", label: "Marketplace Orders", rate: "8%" },
  { type: "food_delivery", label: "Food Delivery", rate: "15%" },
  { type: "service_booking", label: "Service Bookings", rate: "10%" },
  { type: "property_rental", label: "Property Rentals", rate: "5%" },
  { type: "wallet_transfer", label: "Wallet Transfers", rate: "0.5%" },
];

export function calculateCommission(orderType: string, amount: number): number {
  const rate = COMMISSION_RATES[orderType] ?? 0.05;
  return Math.round(amount * rate * 100) / 100;
}
